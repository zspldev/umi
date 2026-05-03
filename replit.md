# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## GitHub Remote

- **Remote**: `https://github.com/zspldev/umi` (origin)
- **Auth**: HTTPS with `GITHUB_PERSONAL_ACCESS_TOKEN` secret (classic PAT, `ghp_` prefix, `repo` scope)
- **Push**: `git push origin main` — remote URL embeds the token as the password (`oauth2:<token>@github.com/...`)
- **Note**: Replit's built-in `replit-git-askpass` helper intercepts HTTPS git auth; override with `GIT_ASKPASS=/tmp/askpass.sh git -c credential.helper= push origin main` if needed from a script context
- **Security**: never print or log the remote URL — it contains the token. Use `git remote get-url origin | sed 's/oauth2:[^@]*/oauth2:REDACTED/g'` if you need to display it
- **Last pushed**: all commits up to `7766812` (Task #2) confirmed on GitHub

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## XLango Mobile (`artifacts/xlango-mobile`)

Real-time voice interpreter app for two speakers. Expo (React Native) mobile app tested on physical iOS device via Expo Go. Preview path: `/xlango-mobile/`.

**Brand identity:**
- Colors: golden-amber `#F59E0B` + deep navy `#0E1729` (dark mode bg)
- Fonts: Plus Jakarta Sans (400/500/600/700/800)
- Image assets: `assets/images/xlango-mark.png` (1024×1024 globe/chat icon, transparent PNG), `assets/images/xlango-wordmark.png` (480×144 "xlango" text, transparent PNG)
- Company logo: `assets/images/zapurzaa-logo.png` (Zapurzaa Systems, copper/bronze color)
- Both logo PNGs have large transparent padding baked in — use aggressive negative margins (e.g. `marginBottom: -52` on mark, `-44` on wordmark) to visually tighten them

**Color tokens (`constants/colors.ts`):**
- `light`: background `#F7F9FB`, navy `#0E1729`, amber `#F59E0B`, card `#FFFFFF`
- `dark`: background `#0E1729`, card `#111E36`, amber `#F59E0B`, muted `#182340`

**Screens (`app/(tabs)/`):**
- `index.tsx` — Session Setup: language selectors (Speaker 1 + 2), layout toggle, Start Session CTA
- `session.tsx` — Live Interpreter: two mic buttons (one rotated 180° for face-to-face), real-time transcript cards
- `history.tsx` — Session History list
- `[id].tsx` — Session Transcript detail

**Layout toggle:**
- Face-to-face mode: Speaker 2 panel rotated 180° so speakers sit opposite each other
- Side-by-side mode: both panels upright
- Stored in `AppContext` + `AsyncStorage` key `@xlango/layoutMode`

**Audio pipeline (native iOS + web):**
1. Tap mic → toggle recording state
2. Native: `expo-av` Audio (`InterruptionModeIOS.DoNotMix`, 150ms settle delay, 44100 Hz sample rate, prepareToRecordAsync + startAsync)
3. Web: `getUserMedia` → `MediaRecorder` → `blobToBase64`
4. Tap stop → read file via `expo-file-system/legacy` `readAsStringAsync(..., "base64")` → POST to `/api/umi/transcribe`
5. Server: Whisper transcription → GPT translation → TTS
6. Native playback: `expo-av` Sound with data URI; Web: `new window.Audio(dataUri).play()`

**API base URL:** `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`

**Splash screen:**
- Native (Expo Go loading): `app.json` → `splash.image: xlango-mark.png`, `splash.backgroundColor: #F2EBD9`
- Custom in-app (`components/SplashScreenView.tsx`): shown after fonts load, fades in over 600ms, displays for ~1.8s then fades out over 400ms before showing the tabs
  - Beige background `#F2EBD9`
  - XLango imagemark → wordmark → tagline "Live Global Voice Interpreter"
  - "Created by" label + Zapurzaa Systems logo
  - Three amber loading dots at bottom
- Wired in `app/_layout.tsx` via `showCustomSplash` state — renders `<SplashScreenView>` in place of `<RootLayoutNav>` until finished

**Key files:**
- `app/_layout.tsx` — root layout; font loading, native splash hide, custom splash gate
- `app/(tabs)/index.tsx` — setup screen with hero logo cluster and session config
- `app/(tabs)/session.tsx` — live interpreter with mic buttons and transcript
- `components/SplashScreenView.tsx` — animated custom splash component
- `components/MicButton.tsx` — tap-to-toggle mic (Pressable, single `onPress`)
- `context/AppContext.tsx` — shared state: languages, layout mode (AsyncStorage)
- `constants/colors.ts` — full light/dark color tokens
- `assets/images/xlango-mark.png` — imagemark (also used as `icon.png`)
- `assets/images/xlango-wordmark.png` — wordmark
- `assets/images/zapurzaa-logo.png` — Zapurzaa Systems company logo

**Key dependencies:**
- `expo-av` v16 (SDK 53/54, deprecated — use `InterruptionModeIOS` from `expo-av`)
- `expo-file-system/legacy` — `readAsStringAsync` (use string `"base64"` not `FileSystem.EncodingType.Base64`)
- `expo-splash-screen` — `preventAutoHideAsync` / `hideAsync`
- `expo-router` — file-based routing
- `react-native-gesture-handler`, `react-native-keyboard-controller`, `react-native-safe-area-context`

**Expo Go connection:**
- Dev domain: `$REPLIT_EXPO_DEV_DOMAIN` (format: `*.expo.worf.replit.dev`)
- QR code encodes: `https://<REPLIT_EXPO_DEV_DOMAIN>` — scan with Expo Go camera
- App only works while the Replit project is running (dev server required); standalone build requires EAS Build + Apple Developer account

---

## UMI App (`artifacts/umi-app`)

Mobile-first PWA voice interpreter. Preview path: `/umi-app/`.

**Features:**
- Live voice sessions between two speakers
- STT via OpenAI Whisper (gpt-4o-mini-transcribe), translation via GPT, TTS via gpt-audio
- 4 pages: Setup → Session → History → Session Detail
- Sessions stored in `localStorage` (key: `umi_sessions`) — no database
- Golden-amber (#F59E0B) + deep navy (#1E2D45) theme
- PWA manifest + service worker at `/umi-app/manifest.json` and `/umi-app/sw.js`
- Noto Sans Devanagari font loaded for Hindi/Marathi text

**Speaker languages:**
- Speaker 1: English, Hindi, Marathi
- Speaker 2: English, Hindi, Marathi, Spanish, Japanese, German

**Audio pipeline (session.tsx) — Realtime API:**
1. Tap mic → `GET /api/umi/realtime-token?fromLang=X&toLang=Y` (ephemeral OpenAI key, ~100ms)
2. Browser opens WebSocket to `wss://api.openai.com/v1/realtime` using ephemeral key
3. AudioWorklet (`public/audio-processor.js`) captures PCM16 at 24kHz, streams chunks via `input_audio_buffer.append`
4. Tap stop → `input_audio_buffer.commit` + `response.create`
5. Model streams back audio deltas → played in real-time via `AudioContext` (zero-gap scheduling)
6. `response.done` + `conversation.item.input_audio_transcription.completed` → turn saved to store
- Hook: `artifacts/umi-app/src/hooks/useRealtimeTranslation.ts`
- Total latency: ~300–500ms vs ~2.1s with the old 3-call pipeline

**Backend routes (`artifacts/api-server/src/routes/umi/index.ts`):**
- `GET /api/umi/realtime-token` — creates ephemeral OpenAI Realtime session (gpt-4o-mini-realtime-preview), returns client_secret
- `POST /api/umi/transcribe` — (legacy) audioBase64 + mimeType → text
- `POST /api/umi/translate` — (legacy) text + fromLang + toLang → translatedText
- `POST /api/umi/speak` — (legacy) text → audioBase64 (MP3)

**Key files:**
- `artifacts/umi-app/src/hooks/useRealtimeTranslation.ts` — WebSocket + AudioWorklet hook
- `artifacts/umi-app/public/audio-processor.js` — AudioWorklet processor (PCM16 capture)
- `@workspace/integrations-openai-ai-server/audio` — speechToText, textToSpeech (legacy)
