# UMI Improvements

---

## Global Language Expansion

### Recommended Language Set (15 Languages)

The current set (English, Hindi, Marathi, Spanish, Japanese, German + Auto) covers roughly 2.4 billion people — good for South Asia but thin globally. Expanding to the set below brings coverage to approximately 80% of the world's population.

**Tier 1 — Must-Have (covers ~5.5 billion speakers)**

| Language | Notes |
|---|---|
| English | Global lingua franca — already in app |
| Mandarin Chinese | 1B+ native speakers; biggest current gap |
| Hindi | 600M speakers — already in app |
| Spanish | 500M speakers, 20+ countries — already in app |
| Arabic (MSA) | 310M native; Modern Standard Arabic works across dialects |
| Portuguese | 220M speakers; Brazil alone is a major market |
| French | Global diplomatic language + Francophone Africa |
| Russian | 150M native + CIS region |
| Japanese | 125M speakers — already in app |
| German | 100M speakers — already in app |

**Tier 2 — Strong Additional Coverage**

Bengali, Korean, Turkish, Vietnamese, Indonesian, Italian, Tagalog, Swahili (East Africa lingua franca)

**Structural change recommended alongside expansion:** Both speakers should see the same full language list. The current asymmetry (Speaker 1 has fewer options than Speaker 2) is arbitrary and should be removed for a global product.

### Reliability Assessment (gpt-4o-mini-realtime-preview)

The Realtime API does speech recognition and translation in a single pass, so reliability depends on *speech recognition quality*, not just translation.

- **Tier 1 languages**: All reliable. Minor caveats — Arabic works for MSA but regional dialects are inconsistent; Cantonese is not reliable (Mandarin is fine).
- **Bengali, Korean**: Can be added with confidence.
- **Swahili, Tagalog**: Translation quality is good but ASR is more variable.
- **Vietnamese, Indonesian**: Solid but not on par with European languages.

For formal or conversational interpretation contexts, Tier 1 languages are dependable. Tier 2 performance varies.

---

## Edge LLM Feasibility (e.g. Gemma)

### Concept
Replace the cloud-based OpenAI Realtime API with an on-device model such as Gemma running in the browser via WebGPU/WASM.

### Assessment

Technically possible on desktop browsers with WebGPU, but not viable for this specific use case due to four hard problems:

**1. Gemma is text-only.**
The current app uses OpenAI Realtime which handles speech-in → translation → speech-out in a single WebSocket stream. With Gemma, three separate on-device components would be needed: multilingual ASR + translation model + TTS. No mature on-device multilingual ASR exists in browsers today (Whisper.js works but is too slow for real-time use).

**2. Mobile WebGPU is immature.**
Gemma 2B requires ~1.5 GB of memory and reasonable GPU compute. Most Android and iOS browsers either don't support WebGPU or are too slow for real-time inference.

**3. First-load latency.**
Gemma 2B takes 30–90 seconds to load on first visit via WASM/WebGPU. Gemma 7B takes several minutes. This is not acceptable for a live interpreter app.

**4. Quality drop for Indian languages.**
Gemma's multilingual quality, especially for Hindi, Marathi, and regional Indian languages, is noticeably worse than GPT-4o-mini. For interpretation in medical, legal, or official contexts this is a meaningful concern.

### Verdict
The only compelling reason to go edge would be offline use or strong privacy requirements. For a live interpreter requiring low latency and high accuracy across diverse languages, the tradeoffs do not work with current hardware and models. **Revisit in approximately 18 months** as WebGPU matures and smaller multilingual models improve.

---

## NLP Router — Specialised Routing for Indian Languages

### Concept
A separate API-style service (the "NLP Router") that sits between UMI and the LLM backends. When a request arrives with an Indian language, the router forwards it to Sarvam AI (Saarika STT + Mayura translation + Bulbul TTS). For all other languages it forwards to OpenAI. UMI speaks only to the router and is unaware of which engine ran.

### Why the instinct is right
Sarvam AI is purpose-built for Indian languages and supports 10 of them: Hindi, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu. Its Bulbul TTS in particular produces noticeably more natural audio for Indian languages than OpenAI's voices. For regional languages (Tamil, Telugu, Kannada) that GPT-4o-mini handles less well, a specialised model could meaningfully improve quality.

### Critical Blocker — Protocol Mismatch
OpenAI Realtime is a **WebSocket streaming API** — audio goes in as PCM chunks and translated audio streams back, with ~300–500ms end-to-end latency. Sarvam's current API is **REST-based**: three separate HTTP calls (STT → translate → TTS) with intermediate text. Routing a live turn through Sarvam would add 800–1,500ms of additional latency per turn. The real-time conversational feel breaks.

### Other Concerns
- **Routing logic is complex**: If Speaker 1 speaks Hindi and Speaker 2 speaks Spanish, is the session "Indian"? A decision matrix per language pair is needed, not just per language.
- **Two API relationships**: Two keys, two billing systems, two failure modes to handle independently.
- **Voice inconsistency**: Sarvam TTS voices differ from OpenAI's — audio character could change mid-session if the router switches engines.

### Recommendations

1. **Hold the router for now; build it when Sarvam releases a streaming/realtime API.** Once Sarvam has a WebSocket-based streaming interface, the router's API to UMI can mirror the current OpenAI Realtime interface exactly — UMI needs no changes.

2. **For now, expand the Indian language list on OpenAI.** Add Tamil, Telugu, Kannada, Gujarati, Bengali, Punjabi. GPT-4o handles these well enough for interpretation (translation quality is solid; TTS accent is passable).

3. **TTS-swap as a practical middle ground.** Use OpenAI Realtime for the full live pipeline (no latency impact), but for Indian-language *output audio*, optionally re-route the translated text through Sarvam Bulbul TTS as a post-turn call. The existing replay button is the natural home for this — replay could use the higher-quality Sarvam voice even when the live turn used OpenAI.

4. **Build the NLP Router as a standalone service** once the streaming API gap is resolved. At that point the interface to UMI can be identical to the current OpenAI Realtime WebSocket, making the router a transparent drop-in.

### Summary Verdict
Right instinct, wrong timing. The Sarvam Realtime API gap is the current blocker. The TTS-swap workaround is actionable now; the full router is a future milestone once the protocol mismatch is resolved.
