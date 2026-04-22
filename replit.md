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

**Audio pipeline (session.tsx):**
1. `useVoiceRecorder()` captures microphone audio as Blob
2. Blob → base64 → `POST /api/umi/transcribe` (Whisper STT)
3. Text → `POST /api/umi/translate` (GPT translation)
4. Translated text → `POST /api/umi/speak` (TTS → base64 MP3)
5. Play MP3 via `new Audio('data:audio/mpeg;base64,...')`

**Backend routes (`artifacts/api-server/src/routes/umi/index.ts`):**
- `POST /api/umi/transcribe` — audioBase64 + mimeType → text
- `POST /api/umi/translate` — text + fromLang + toLang → translatedText
- `POST /api/umi/speak` — text → audioBase64 (MP3)
- Express body limit bumped to 50MB for audio payloads

**Key libs:**
- `@workspace/integrations-openai-ai-server/audio` — speechToText, textToSpeech, ensureCompatibleFormat
- `@workspace/integrations-openai-ai-react/audio` — useVoiceRecorder
- `@workspace/api-client-react` — useTranscribeAudio, useTranslateText, useSpeakText hooks
