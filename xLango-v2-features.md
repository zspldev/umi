# xLango — v2 Feature Exploration

Exploratory discussions on future features, architecture, and product strategy.
Recorded: May 2026. No code changes — ideas and recommendations only.

---

## 1. Language Picker UX — Handling a Growing Language List

**Question:** When more languages are added, showing all of them in a dropdown will be a long list and not good UX. How about grouping by regions of the world? What else can you suggest?

### Regional Grouping (proposed idea)

Grouping by geography is intuitive for a global interpreter app:

| Region | Languages |
|---|---|
| East Asia | Japanese, Mandarin, Korean |
| South Asia | Hindi, Marathi, Bengali, Tamil, Urdu |
| Europe | English, French, German, Spanish, Portuguese, Italian, Russian |
| Middle East / North Africa | Arabic, Persian, Turkish |
| Southeast Asia | Indonesian, Thai, Vietnamese, Tagalog |

**Tradeoff:** A user who wants Spanish doesn't think "Europe first" — they think "Spanish". Region headers help scanning but add cognitive load for quick picks.

### Better Alternatives

**1. Searchable picker with fuzzy match**
A single search box where the user types "jap" and gets Japanese instantly. Much faster than scanning any list, no grouping needed. Works well on mobile. Used by Google Translate. Best choice at scale.

**2. Recents / Pinned at top**
Track the last 2–3 language pairs used and surface them above the full list. Most interpreters use the same pair repeatedly — makes the common case one tap.

**3. Flag + native script display**
Show the country flag emoji alongside the native script. `🇯🇵 日本語` is instantly recognizable even if you can't read the language name. Reduces scanning time significantly.

**4. Smart defaults based on device locale**
If the user's phone is set to Japanese, pre-select Japanese as one speaker's language on first launch. Reduces setup friction to near zero.

**5. Favorites / Star**
Let users star their commonly used languages. Starred ones always appear at top. More user-controlled than recents.

### Recommended Roadmap

| Phase | Change | Effort |
|---|---|---|
| Short-term | Add flag emojis + native script; Recents at top | Low |
| Medium-term | Replace dropdown with searchable modal | Medium |
| Long-term (30+ languages) | Searchable modal + regional grouping as secondary browse | Medium |

The searchable modal gives the best of all worlds — no need to maintain groupings, works at any scale, and matches the UX pattern users already know from every major language app.

---

## 2. NLP Router — Sarvam for Indic Languages

**Question:** As Sarvam is better for Indic languages, how about building a proposed NLP-Router that takes language code and text as input and routes to Sarvam or non-Sarvam LLM accordingly? Pros/cons? Will it affect efficiency?

### What the NLP Router Would Do

Look at the `toLang` code (target language of translation) and route:
- `hi`, `mr`, `bn`, `ta`, `te`, `kn`, `gu`, `pa`, `or`, `ml` → **Sarvam** (Indic-specialized)
- Everything else → **OpenAI** (current path)

Sits entirely inside the API server — apps call `/api/umi/translate` unchanged.

### Pros

- **Better quality for Indic output** — Sarvam's models are trained on Indic corpora; Hindi/Marathi/Tamil translations sound more natural, use correct script, and handle colloquial phrasing better than a general-purpose model
- **Potentially cheaper** — Sarvam's pricing for Indic languages is typically lower per token than GPT-5.1
- **Expandable** — same routing pattern can accommodate more specialists (Japanese-optimized model, medical-domain model, etc.)
- **Zero app changes** — routing lives entirely server-side; clients are unaffected

### Cons / Risks

- **Two APIs to maintain** — different auth, SDK, error formats, rate limits; Sarvam outage requires a fallback strategy
- **Prompt parity** — current translation prompt is carefully tuned for OpenAI (script rules, temperature, etc.); a separate, re-validated prompt is needed for Sarvam's API
- **Inconsistent latency** — if Sarvam's p99 latency is higher, Indic translations feel slower even if average is fine
- **New billing relationship** — separate API key, separate cost tracking

### Will It Be Slower?

**For the `translate` endpoint:** No meaningful impact. The routing decision itself is microseconds (a simple `if` on the language code). Actual latency depends on Sarvam's inference speed vs. GPT-5.1 for short prompts and network distance to Sarvam's servers.

**For the `realtime` endpoint:** The router **cannot help here**. The Realtime API is a direct WebSocket from the browser to OpenAI — no server-side text to intercept. The router only benefits the XLango Mobile pipeline (`transcribe → translate → speak`).

### Implementation Scope

The implementation itself is small (20–30 lines in `artifacts/api-server/src/routes/umi/index.ts`). The real effort is:
1. Validating Sarvam's output quality against a test set of real sentences
2. Re-tuning the translation prompt for Sarvam's API behavior

### Recommendation

1. Add more Indic languages first (Tamil, Telugu, Bengali)
2. Run a side-by-side quality comparison on a few dozen sample sentences
3. Build the router only if Sarvam wins clearly on the test cases

---

## 3. Shared Platform Blocks — Architecture for Multiple Apps

**Question:** Building multiple web and mobile apps — how to avoid redeveloping (1) user management, (2) user feedback (5-star), (3) burger menu with static + dynamic release info? Can we design an API that saves redevelopment?

### Overall Architecture Options

| Option | Description | Verdict |
|---|---|---|
| A — Shared Platform API | One central backend, all apps call it | Overkill before scale justifies it |
| B — Shared Library (monorepo) | Shared code in `lib/` packages, each app mounts it | Best fit for current stage |
| C — Third-party per concern | Clerk, Stripe, custom for feedback, UI-only menu | Right for auth + billing |

**Recommendation: Hybrid of B + C** — use third-party services where they already exist (Clerk for auth, Stripe for billing) and build thin shared libs for custom concerns (feedback, burger menu).

---

### Block 1 — User Management

Do not build from scratch. Each sub-concern has a best-of-breed solution:

| Sub-concern | Solution |
|---|---|
| Register / Login / Reset password | **Clerk** — already a Replit integration; handles email, Google, Apple Sign-In, magic links, MFA |
| Plan assignment / gating | **Stripe** — subscriptions, trial periods, plan tiers |
| Usage / cost tracking | Already built in xLango's DB (`xlango_users`, `xlango_sessions`, `xlango_turns`) — generalize to `@workspace/usage-tracker` |

**Key design note:** Device-ID-based tracking (current) and Clerk user accounts are two separate identity systems. Link the `device_id` to a Clerk `userId` at first login to reconcile them.

---

### Block 2 — User Feedback (5-Star)

Small enough to own entirely. Design:

**Backend** — one table, two endpoints:
```
POST /api/platform/feedback
  { appId, userId/deviceId, rating: 1–5, comment?, appVersion, screen? }

GET  /api/platform/feedback   (admin only, aggregated)
```

**Frontend trigger logic** (pure client, stored in localStorage / AsyncStorage):
- Show after Nth completed session (e.g. 5th)
- Never more than once per 14 days
- Never during an active session
- Non-blocking bottom sheet, not a modal

**Shared component:** `@workspace/feedback-widget` — React version + React Native version. Each app passes its `appId`; the widget handles the rest via a `useFeedbackPrompt` hook.

---

### Block 3 — Burger Menu

Mostly a UI concern — correct home is a shared component library.

**Static content** (per app, changes rarely): About text, credits, support email, Privacy Policy URL, T&C URL, EULA URL — passed as props or a typed config object.

**Dynamic content** (changes per release): version number, release date, key features.

| Dynamic content approach | Pros | Cons |
|---|---|---|
| Bundled `release.json` in each app | Zero latency, works offline, no API | Must rebuild to update |
| Central `GET /api/platform/apps/:id/release` | Update without releasing, A/B testable | Needs network, adds latency |

For mobile (App Store gated anyway) → bundle `release.json`.
For web PWA → central endpoint preferred (instant updates).

**Shared component:** `@workspace/burger-menu` — renders from a typed config; handles layout, animations, static/dynamic split.

---

### Proposed Monorepo Structure

```
lib/
  usage-tracker/     ← generalized from xLango's current tracking
  feedback-widget/   ← 5-star component + useFeedbackPrompt hook
  burger-menu/       ← menu component + ReleaseInfo type
  platform-types/    ← shared TypeScript interfaces (AppConfig, User, Plan)

artifacts/
  api-server/        ← add /api/platform/feedback route
                        add /api/platform/apps/:id/release route (optional)
```

### Performance Impact

- **Burger menu** — zero runtime cost; static UI + one JSON fetch on open
- **Feedback widget** — one POST per rating event, negligible
- **User management** — Clerk adds ~50–100ms to first auth check (cached after); Stripe only called at checkout
- **Usage tracking** — fire-and-forget, never blocks a response

### Build Order Recommendation

| Priority | Block | Trigger |
|---|---|---|
| Now | Burger menu lib | Pure UI, low risk, immediately useful |
| Soon | Feedback widget | Simple, high value for product decisions |
| When paying users exist | Clerk + Stripe + usage-tracker generalization | Complexity justified once plan tiers needed |

---

## 4. Monetization Strategy — xLango Credit Model

**Question:** xLango is situational (used during travel, not daily). Offering credit packs in 15/30/45/60 minute bundles with 5–10 free minutes for first-time users — review and react.

### Why a Credit Pack Model Fits

Subscription models assume habitual, regular use. xLango's use case is the opposite — **high-intensity but infrequent**. A $4.99/month subscription feels wasteful if used only once every few months for a trip. Credit packs align cost with value received.

Analogy: prepaid SIM cards for international travel — nobody buys a monthly plan for a 10-day visit.

### Reacting to the Specific Proposal

**Free credits (5–10 min) ✓ Recommended: 10 minutes**
- Strong acquisition tool — enough for 2–3 real interpreted conversations
- Gate on verified account creation (Clerk), not just app install, to prevent abuse via reinstalls

**Minute packs — Define "minutes" clearly**
Define as **interpreted audio time** (mic-on time), not wall clock. A 30-minute pack should not drain while the user is browsing a menu silently.

### Suggested Pricing

| Pack | Minutes | Suggested Price |
|---|---|---|
| Starter | 30 min | $2.99 |
| Explorer | 90 min | $5.99 |
| Traveler | 3 hours | $9.99 |
| Frequent | 10 hours | $24.99 |

### Additional Recommendations

**1. Day Pass / Trip Pass**
A flat "unlimited for 7 days" at $6.99–$9.99 removes minute-tracking anxiety entirely. Maps naturally to how people think about travel. Likely converts better than minute packs for longer trips.

**2. Credit Expiry Policy**
- Credits that expire create hesitation to buy (fear of waste)
- Credits that never expire are a liability but build loyalty
- **Recommendation: no expiry** for the first 1–2 years

**3. Top-up Friction**
- Low-balance warning at 5 minutes remaining
- One-tap top-up via Apple Pay / Google Pay (in-app purchase)
- A small "emergency 15-min" instant buy at a slight premium for mid-trip bailout

**4. B2B Angle (longer term)**
Travel companies, hospitals, international schools, courts — they need interpreters regularly. Bulk credit purchase at a discounted rate (e.g. 100 hours for $X, org-level account). Worth designing credit architecture to support org accounts from the start.

### Technical Considerations

**Tracking minutes:**
`audio_seconds` and `audio_input_tokens` per turn already tracked in DB (`xlango_turns`). Need to:
- Sum against a credit balance
- Gate requests when balance is exhausted

**Realtime API caveat:**
The WebSocket goes browser → OpenAI directly. Cannot gate mid-session. Gate at session start (token fetch) and reconcile after `response.done`.

**Perceived fairness:**
Round down to nearest 10 seconds per turn so users don't feel nickel-and-dimed by slow speech or background noise.

**Free tier abuse:**
Require verified email via Clerk before free credits activate. Optional: add phone number verification as a soft gate.

### Implementation Stack

| Concern | Tool |
|---|---|
| In-app purchases (iOS + Android) | **RevenueCat** — already a Replit integration; handles Apple/Google billing rules |
| Web payments | **Stripe** |
| Credit balance storage | New column on `xlango_users` + transaction log table |
| Gating | Check balance at `/api/umi/realtime-token`; reject if zero |

### Build Order

1. Clerk (auth + verified accounts)
2. RevenueCat / Stripe (purchase flow)
3. Credit balance table in DB
4. Gating at the `realtime-token` endpoint
5. Usage dashboard for users to see remaining credits

---

*Document maintained alongside `replit.md` in the project root.*
*Last updated: May 2026*
