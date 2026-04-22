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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

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
