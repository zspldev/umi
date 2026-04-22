# UMI App — Universal Mobile Interpreter
## Complete Build Prompt for a New Replit Project

---

## Project Identity

**Project name:** UMI App (Universal Mobile Interpreter)
**Type:** React + Vite web app (PWA-ready, mobile-first)
**Purpose:** A live voice/text interpreter between two speakers, using OpenAI APIs for transcription, translation, and text-to-speech audio playback.

---

## What to Build

A real-time interpreter web app where two people take turns speaking. The app records each speaker's audio, transcribes it, translates it into the other speaker's language, displays both the original and translated text on screen, and plays back the translated audio — all in one session.

---

## Tech Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** Express (Node.js, TypeScript) — for securely calling OpenAI APIs (never expose the API key to the frontend)
- **Storage:** Browser localStorage only (no database needed for V1)
- **AI APIs (all via OpenAI):**
  - `whisper-1` — audio transcription (Speech-to-Text)
  - `gpt-4o` — translation between languages
  - `tts-1` — text-to-speech audio synthesis
- **PWA:** Add a web app manifest and service worker so the app is installable on mobile as a PWA

---

## Replit Integration Note

Use Replit's built-in OpenAI integration — do NOT ask the user for an API key. Replit provides OpenAI access via its AI Integrations proxy. Read the `ai-integrations-openai` skill before starting backend work.

---

## User Flow

### Screen 1: Session Setup
- User 1 (always the app owner) selects their language: **English, Marathi, or Hindi**
- User 1 sets a display name for themselves (default: "Speaker 1")
- User 1 selects User 2's language: **English, Marathi, Hindi, Spanish, Japanese, or German**
- User 1 sets a display name for User 2 (default: "Speaker 2")
- A "Start Session" button begins the interpreter session

### Screen 2: Live Interpreter Session

**Layout (stacked, mobile-first):**
- Top half: User 1's panel — shows their original transcribed text (in their language/script)
- Bottom half: User 2's panel — shows the translated text (in User 2's language/script)
- When it is User 2's turn to speak, the layout mirrors: User 2's original appears in their panel; User 1's translation appears in User 1's panel

**Recording flow (per turn):**
1. The active speaker presses a **Record** button (large, prominent)
2. The browser captures microphone audio
3. When the speaker presses **Stop** (same button, toggled), the audio is sent to the backend
4. The backend calls OpenAI Whisper to transcribe the audio in the speaker's language
5. The transcribed text is displayed in the speaker's panel
6. The backend calls OpenAI GPT-4o to translate the text into the other speaker's language
7. The translated text is displayed in the other speaker's panel
8. The backend calls OpenAI TTS to synthesize the translated text as audio in the target language
9. The translated audio plays automatically through the device speaker
10. Speakers alternate turns

**Turn indicator:**
- Clearly show whose turn it is to speak

**End Session:**
- A "End Session" button is always visible
- Pressing it stops the session and navigates to the Session Log screen

### Screen 3: Session Log / History

- List of all past sessions stored in localStorage
- Each session shows:
  - Date and time
  - Language pair (e.g., "English → Spanish")
  - Speaker names
- Tapping/clicking a session opens its full transcript
- Full transcript shows the dialog as alternating turns:
  - Speaker name
  - Original text (in their language)
  - Translated text (in the other language)
- Option to delete a session
- Option to export the session log as a plain text file (downloadable)

---

## Languages and Scripts

The app must correctly handle scripts for all supported languages. The UI must render the correct Unicode script for each language:

| Language | Script | OpenAI TTS voice suggestion |
|---|---|---|
| English | Latin | `alloy` |
| Hindi | Devanagari (हिन्दी) | `alloy` |
| Marathi | Devanagari (मराठी) | `alloy` |
| Spanish | Latin | `nova` |
| Japanese | Hiragana/Katakana/Kanji (日本語) | `shimmer` |
| German | Latin | `echo` |

When prompting GPT-4o for translation, instruct it explicitly to respond in the correct script for the target language. Example system prompt pattern:
```
Translate the following text from {sourceLang} to {targetLang}. 
Respond only with the translated text in {targetLang} using the correct script. 
Do not include any explanation or original text.
```

For OpenAI TTS, use the `tts-1` model with `mp3` format. Pass the target language in the request description so pronunciation is appropriate.

---

## Backend API Routes

The backend Express server must expose these routes (keep OpenAI calls server-side only):

### `POST /api/transcribe`
- **Body:** `multipart/form-data` with audio file (`audio`) and `language` (BCP-47 language code)
- **Action:** Calls OpenAI Whisper (`whisper-1`) with the audio and language hint
- **Returns:** `{ transcript: string }`

Language codes to pass to Whisper:
- English → `en`
- Hindi → `hi`
- Marathi → `mr`
- Spanish → `es`
- Japanese → `ja`
- German → `de`

### `POST /api/translate`
- **Body:** `{ text: string, sourceLang: string, targetLang: string }`
- **Action:** Calls GPT-4o with a translation prompt (see prompt pattern above)
- **Returns:** `{ translation: string }`

### `POST /api/speak`
- **Body:** `{ text: string, language: string }`
- **Action:** Calls OpenAI TTS (`tts-1`) and streams audio back as MP3
- **Returns:** Audio file (content-type: `audio/mpeg`)

---

## Frontend Architecture

### State Management
Use React Context or `useState`/`useReducer` at the App level. No external state library needed.

### Session Data Structure (localStorage)
```typescript
interface Turn {
  id: string;
  speakerIndex: 0 | 1; // 0 = User 1, 1 = User 2
  speakerName: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  speaker1Name: string;
  speaker1Lang: string;
  speaker2Name: string;
  speaker2Lang: string;
  turns: Turn[];
}
```

Store sessions as an array in localStorage under the key `umi_sessions`.

### Audio Recording
Use the browser's native `MediaRecorder` API:
1. `navigator.mediaDevices.getUserMedia({ audio: true })` to request microphone
2. `MediaRecorder` to record in `audio/webm` or `audio/mp4` (check browser support)
3. Collect recorded chunks into a `Blob`
4. Create a `FormData` object and append the blob as a file
5. POST to `/api/transcribe`

Show a visual recording indicator (pulsing animation) while recording is active.

### Audio Playback
Receive the MP3 audio from `/api/speak` as a Blob URL and play it with the HTML `Audio` API:
```typescript
const url = URL.createObjectURL(audioBlob);
const audio = new Audio(url);
audio.play();
```

### PWA Setup
Add to the project:
1. `public/manifest.json`:
```json
{
  "name": "UMI App - Universal Mobile Interpreter",
  "short_name": "UMI App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
2. Link the manifest in `index.html`: `<link rel="manifest" href="/manifest.json">`
3. Add a simple service worker (`public/sw.js`) that caches the app shell for offline availability
4. Register the service worker in `main.tsx`
5. Generate or use placeholder PNG icons at 192×192 and 512×512

---

## Design Direction

This is a personal utility app used in real conversations — it must feel calm, focused, and reliable. The user will be holding their phone while talking to someone. The UI must be:

- **Mobile-first** — large tap targets, no tiny text, everything reachable with one thumb
- **High contrast** — text must be readable in various lighting conditions
- **Two-panel layout** — the two speakers have visually distinct panels with different background tones (not just text color)
- **Clear recording state** — the Record button must obviously show when it is active vs. idle
- **Stacked on mobile** — User 1's panel on top, User 2's panel on bottom (panels can be visually flipped when it is User 2's turn)
- No emojis anywhere in the UI
- Support right-to-left text rendering correctly (note: none of the current languages are RTL, but Devanagari script should render cleanly)

---

## Error Handling

- If microphone permission is denied: show a clear message explaining how to grant it
- If transcription fails: show an error in the speaker's panel with a "Try again" option
- If translation fails: show an error with a retry option
- If TTS fails: show the translated text but skip audio playback (do not block the conversation)
- Network errors: show a brief toast/notification

---

## Loading States

Show loading indicators for:
- Transcribing (after Stop is pressed)
- Translating
- Generating audio

Each stage should be visually distinct so the user knows what step the app is on.

---

## V1 Scope Boundaries (do not build these in V1)

- No user authentication or accounts
- No cloud database or sync
- No sharing of sessions between devices
- No real-time streaming transcription (batch only: record → stop → process)
- No multiple simultaneous sessions
- No language auto-detection

---

## Implementation Notes for the Agent

1. **Start with the OpenAI integration** — read the `ai-integrations-openai` skill to set up the proxy correctly before writing any API route
2. **Build backend routes first** — verify each endpoint works with a test before building the frontend
3. **Wire up one full turn end-to-end** before building session management
4. **Test on mobile** — use the browser's responsive mode to verify layout at 375px width (iPhone SE)
5. **localStorage persistence** — test that sessions survive a page refresh
6. **Audio format compatibility** — `audio/webm` works in Chrome/Firefox; `audio/mp4` works in Safari. Use `MediaRecorder.isTypeSupported()` to pick the right format at runtime
7. **Whisper file size limit** — OpenAI Whisper accepts up to 25MB. At typical browser audio quality, 1-3 minutes of audio is well within this limit
8. **PWA icons** — generate simple colored PNG icons (192×192 and 512×512) programmatically if no assets are provided

---

## File Structure (suggested)

```
artifacts/
  umi-app/                    ← React + Vite frontend
    public/
      manifest.json
      sw.js
      icon-192.png
      icon-512.png
    src/
      App.tsx
      main.tsx
      index.css
      pages/
        SetupPage.tsx         ← Session setup screen
        InterpreterPage.tsx   ← Live interpreter screen
        HistoryPage.tsx       ← Session log/history screen
        SessionDetailPage.tsx ← Individual session transcript
      components/
        RecordButton.tsx
        SpeakerPanel.tsx
        TurnIndicator.tsx
        LoadingOverlay.tsx
      hooks/
        useAudioRecorder.ts
        useSessions.ts
      lib/
        api.ts                ← API call helpers (to backend)
        storage.ts            ← localStorage read/write
        types.ts              ← Shared TypeScript types

  api-server/                 ← Express backend (may already exist)
    src/
      routes/
        transcribe.ts
        translate.ts
        speak.ts
```

---

## Summary

Build a mobile-first PWA interpreter app called "UMI App". It uses OpenAI Whisper for transcription, GPT-4o for translation, and OpenAI TTS for audio playback. Two speakers take turns: each records audio, the app transcribes it, translates it, and plays the translation aloud. Sessions are stored in localStorage with full dialog transcripts. The app must work well on mobile browsers and be installable as a PWA.
