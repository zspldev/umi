# xLango Tutor — Product & Architecture Document

Companion feature to the xLango interpreter. Documents the design decisions, architecture, and roadmap for the Language Tutor mode.
Last updated: May 2026.

---

## Concept

xLango Tutor adds a second mode to the xLango app: instead of interpreting between two humans, the AI plays a native speaker persona and tutors the user in a target language through real conversation.

Both modes — Interpret and Learn — are cross-language interactions. The "x" in xLango applies equally to bridging two people and to one person crossing into a new language. They live in the same app, share the same infrastructure, and appear as a mode toggle on the setup screen.

---

## Product Decisions (Exploration Summary)

### Why not a separate app or fork?
The interpreter and tutor share everything at the infrastructure level: API server, database, cost tracking, Realtime API plumbing, and the languages library. A fork would duplicate all of that for no gain. A new artifact in the same monorepo gives a clean separation at the UI level while sharing everything underneath.

### Why keep the two-panel UI?
Initial thinking defaulted to a chat/transcript view for the tutor — a common convention but not a reasoned one. Both interpreter and tutor are two personas in conversation:
- Interpreter: Human ↔ Human (AI in the middle)
- Tutor: Human ↔ AI Tutor (playing a native speaker)

The two-panel layout maps naturally:
- **Top panel** → AI Tutor persona (name + target language)
- **Bottom panel** → Learner (name + native language)

The face-to-face metaphor — sitting across from your tutor — is actually more fitting for tutoring than for interpreting. The chat/transcript view has no spatial metaphor. The two-panel layout is reused as-is; tutor mode is a configuration, not a different screen.

### Why one name — xLango — for both modes?
"xLango" derives from "cross language." Crossing language barriers applies whether two people are bridging a gap between them (interpret) or one person is crossing into a new language (learn). One app, one install, one history, one brand.

---

## User Experience

### Mode Toggle
The existing setup screen gains a segmented control at the top:

```
[ Interpret ]  [ Learn ]
```

Switching modes reshapes the setup form below it. History remains shared — all sessions (interpret and tutor) appear in one list, tagged by type.

### Learn Mode — Setup Screen
- **I speak:** dropdown (native language) — defaults to the device locale
- **I want to learn:** dropdown (target language)
- **Scenario:** picker (see scenarios below)
- **Start Session** button

### Learn Mode — Session Screen (Two-Panel, Tutor Config)

| Element | Interpret Mode | Learn (Tutor) Mode |
|---|---|---|
| Top panel | Speaker 1 · [their language] | [Tutor name] · [target language] |
| Bottom panel | Speaker 2 · [their language] | You · [native language] |
| Mic button | Shared, switches speaker | Yours only (bottom panel) |
| Speaker-switch button | Present | Removed |
| Turn detection | Manual tap-to-stop | Auto — AI responds when you stop speaking |
| Top panel text | Original + translation | AI speech in target language + English gloss below |
| Bottom panel text | Original + translation | What you said + correction note if applicable |
| Face-to-face toggle | Available | Available (optional, same mechanic) |

### Correction Display
When the AI tutor detects an error, it continues the conversation naturally but shows a correction note below the learner's last utterance in the bottom panel:

```
[What you said]  → "Watashi wa resutoran ni ikimashita"
[Correction]     ✎ More natural: "Resutoran ni ikimashita" — the subject is implied
```

---

## Scenarios (v1)

Five scenarios chosen for travel relevance. Scenarios are language-agnostic — they work for any target language.

| # | Scenario | Context |
|---|---|---|
| 1 | Greetings & Introductions | Meeting locals, introducing yourself |
| 2 | Restaurant & Ordering | Entering, reading menu, ordering, paying |
| 3 | Transport | Taxi, train, asking for directions |
| 4 | Shopping | Asking prices, sizes, making purchases |
| 5 | Emergency & Help | Feeling unwell, lost, need assistance |

---

## AI Tutor Personas (v1 — Assigned)

In v1, the tutor persona is assigned based on the target language. The AI adopts the name, personality, and cultural style of a native speaker from a country where that language is spoken.

| Target Language | Tutor Name | Personality |
|---|---|---|
| Japanese | Yuki | Warm, patient, uses simple keigo (polite form) |
| Spanish | Elena | Relaxed, conversational, Castilian Spanish |
| French | Léa | Encouraging, corrects gently, Parisian French |
| Hindi | Arjun | Friendly, uses common Hinglish bridges |
| Mandarin | Wei | Methodical, clear, Mandarin Chinese |
| German | Lukas | Direct, precise, standard Hochdeutsch |
| Arabic | Layla | Patient, Modern Standard Arabic with context notes |
| Marathi | Priya | Warm, uses common everyday register |
| Tamil | Kavya | Encouraging, Chennai Tamil register |
| Telugu | Ravi | Friendly, Hyderabad Telugu register |
| Portuguese | Beatriz | Upbeat, Brazilian Portuguese |
| Russian | Natasha | Measured, clear pronunciation emphasis |

Persona name and personality are embedded in the system prompt sent to the Realtime API.

### System Prompt Structure (v1)

```
You are [Name], a native [language] speaker and patient language tutor.
The student is a native [native language] speaker preparing for a trip to [country/region].
Speak only in [target language] at a [beginner/intermediate] level.
When the student makes an error, continue the conversation naturally, then correct
them by repeating the correct form: "You could also say: [correct form]."
Do not switch to [native language] unless the student is completely stuck.
Focus on the [scenario] scenario. Keep responses to 1-3 sentences.
Be warm, encouraging, and culturally authentic.
```

---

## Roadmap

### v1 — MVP (current plan)
- Mode toggle on setup screen (Interpret / Learn)
- Learn mode setup: native language, target language, scenario
- Two-panel session screen in tutor configuration
- AI persona assigned by target language (see table above)
- Auto turn detection (AI responds when learner stops speaking)
- Correction display in bottom panel
- Usage and cost tracked in existing DB (`app_source: "xlango-tutor"`)
- No new DB schema required
- Supports all languages in `@workspace/languages` automatically

### v2 — User-Defined Tutor Persona
The tutor name and gender are user-defined rather than assigned:
- **Tutor name:** free text input (e.g. "Yuki", "Kenji", "Aiko")
- **Gender:** Male / Female / Neutral — affects voice selection in the Realtime API
  - Female → Realtime API voice: `shimmer` (warm) or `coral`
  - Male → Realtime API voice: `echo` or `alloy`
  - Neutral → `sage`
- Persona is saved per language pair so the same tutor greets you each session

### v3 — Adaptive Learning
- Track vocabulary and grammar errors per session in DB
- Surface a "Your weak spots" panel after each session
- AI naturally increases exposure to error patterns in subsequent sessions
- Weekly summary: sentences you nailed, patterns to work on

### v4 — Trip Prep Mode
- User sets a trip destination and departure date
- App calculates days remaining and suggests a daily practice schedule
- Countdown visible on setup screen: "12 days until Tokyo"
- Sessions automatically tagged to the trip for a focused history view

### v5 — Thinking-in-the-Language Mode
- Advanced mode: AI refuses to accept the learner's native language
- If learner speaks in English during a Japanese session, AI responds only in Japanese
- Immersion pressure — the constraint that actually builds fluency

---

## Technical Architecture

### API Changes
New endpoint: `POST /api/tutor/realtime-token`

Accepts:
```json
{
  "nativeLang": "en",
  "targetLang": "ja",
  "scenario": "restaurant",
  "tutorName": "Yuki",
  "level": "beginner"
}
```

Returns: same ephemeral `clientSecret` structure as the interpreter endpoint.
Internally: builds the tutor system prompt, selects the appropriate Realtime API voice, and creates the session.

### DB Tracking
No schema changes needed. Tutor sessions tracked in existing tables:
- `xlango_sessions.app_source` = `"xlango-tutor"`
- `xlango_turns` records each exchange as usual
- Cost tracked identically (Realtime API dominates, same pricing)

### Realtime API Configuration (Tutor vs Interpreter)

| Config | Interpreter | Tutor |
|---|---|---|
| `turn_detection` | `null` (manual push-to-talk) | `server_vad` (auto-detect silence) |
| `voice` | shimmer | Varies by persona gender |
| `system prompt` | Interpret between X and Y | Tutor persona + scenario |
| `input_audio_transcription` | Enabled | Enabled (show learner's words) |
| `temperature` | 0.6 | 0.8 (more natural, less robotic) |

### Shared Infrastructure (Unchanged)
- `@workspace/languages` — language list and names
- `lib/db` — all tables reused as-is
- `artifacts/api-server` — new route added, everything else unchanged
- `useRealtimeTranslation` hook — adapted for single-speaker + auto turn detection
- Cost tracking helpers (`upsertUser`, `upsertSession`, `logTurn`) — unchanged

---

## Out of Scope for v1
- Pronunciation scoring (comparing phonemes to native samples)
- Spaced repetition vocabulary system
- User accounts / Clerk auth (tracked by device ID as in xLango)
- Multiple simultaneous sessions
- Offline mode

---

*Maintained alongside `replit.md` and `xLango-v2-features.md` in the project root.*
*Last updated: May 2026*
