import { Router } from "express";
import OpenAI from "openai";
import { LANG_NAMES } from "@workspace/languages";
import { calcRealtimeCost } from "../../lib/pricing.js";
import { upsertUser, upsertSession, logTurn } from "../../lib/usage.js";
import type { Request } from "express";

if (!process.env.OPENAI_REALTIME_API_KEY) {
  throw new Error("OPENAI_REALTIME_API_KEY must be set.");
}

const realtimeOpenai = new OpenAI({
  apiKey: process.env.OPENAI_REALTIME_API_KEY,
});

const router = Router();

function trackingHeaders(req: Request) {
  const deviceId = req.headers["x-device-id"] as string | undefined;
  const displayName = req.headers["x-display-name"] as string | undefined;
  const sessionId = req.headers["x-session-id"] as string | undefined;
  const tripCode = req.headers["x-trip-code"] as string | undefined;
  return { deviceId, displayName, sessionId, appSource: "xlango-tutor", tripCode };
}

/** AI tutor persona per target language (v1 — assigned). */
const TUTOR_PERSONAS: Record<string, { name: string; voice: string; style: string }> = {
  ja: { name: "Yuki",    voice: "shimmer", style: "warm and patient" },
  es: { name: "Elena",   voice: "coral",   style: "relaxed and conversational" },
  fr: { name: "Léa",     voice: "shimmer", style: "encouraging and precise" },
  hi: { name: "Arjun",   voice: "alloy",   style: "friendly and supportive" },
  zh: { name: "Wei",     voice: "echo",    style: "methodical and clear" },
  de: { name: "Lukas",   voice: "alloy",   style: "direct and precise" },
  ar: { name: "Layla",   voice: "shimmer", style: "patient and encouraging" },
  mr: { name: "Priya",   voice: "coral",   style: "warm and approachable" },
  ta: { name: "Kavya",   voice: "shimmer", style: "encouraging and clear" },
  te: { name: "Ravi",    voice: "echo",    style: "friendly and supportive" },
  pt: { name: "Beatriz", voice: "coral",   style: "upbeat and expressive" },
  ru: { name: "Natasha", voice: "shimmer", style: "measured and precise" },
  en: { name: "Alex",    voice: "alloy",   style: "clear and encouraging" },
};

const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  greetings:  "You are meeting the student for the first time as a friendly local. Help them practise greetings, self-introductions, and simple small talk.",
  restaurant: "You are a server at a local restaurant. The student is a customer trying to read the menu, order food and drinks, and pay the bill.",
  transport:  "You are a helpful local. The student needs to navigate public transport, buy tickets, or ask for directions to their destination.",
  shopping:   "You are a shopkeeper at a local market or store. The student wants to browse items, ask about prices, and make a purchase.",
  emergency:  "The student needs urgent help. You are a kind local assisting them with an unexpected situation — feeling unwell, getting lost, or losing something.",
};

/**
 * GET /api/tutor/realtime-token
 * Query params: nativeLang, targetLang, scenario
 * Returns ephemeral clientSecret for the Realtime API.
 * Uses server_vad so the AI responds automatically when the learner stops speaking.
 */
router.get("/realtime-token", async (req, res) => {
  try {
    const nativeLang  = (req.query.nativeLang  as string) || "en";
    const targetLang  = (req.query.targetLang  as string) || "ja";
    const scenario    = (req.query.scenario    as string) || "greetings";

    const nativeName  = LANG_NAMES[nativeLang]  ?? nativeLang;
    const targetName  = LANG_NAMES[targetLang]  ?? targetLang;
    const persona     = TUTOR_PERSONAS[targetLang] ?? { name: "Kai", voice: "alloy", style: "warm and patient" };
    const scenarioDesc = SCENARIO_DESCRIPTIONS[scenario] ?? SCENARIO_DESCRIPTIONS.greetings;

    const instructions = `You are ${persona.name}, a native ${targetName} speaker and a ${persona.style} language tutor.

SCENARIO: ${scenarioDesc}

RULES (follow all strictly):
1. Speak ONLY in ${targetName}. Use simple, clear sentences appropriate for a beginner traveller.
2. Stay fully in the scenario — you are a real person in this situation, not a classroom teacher.
3. Keep every response SHORT: 1 to 2 sentences maximum.
4. When the student makes a grammatical or vocabulary error, continue naturally but gently echo the correct form once — for example: "Ah, you mean [correct phrase]..." — then carry on.
5. If the student is completely stuck or speaks in ${nativeName}, offer a single short hint in ${nativeName} in parentheses, then encourage them to try again in ${targetName}.
6. Be warm, patient, and encouraging. Celebrate small wins.
7. BEGIN the session yourself: greet the student and set the scene in ${targetName}.`;

    const session = await (realtimeOpenai.beta.realtime.sessions as any).create({
      model: "gpt-4o-mini-realtime-preview",
      voice: persona.voice,
      instructions,
      modalities: ["text", "audio"],
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 800,
      },
      temperature: 0.8,
    });

    const { deviceId, displayName, sessionId, tripCode } = trackingHeaders(req);
    upsertUser(deviceId, displayName).catch(() => {});
    upsertSession({
      sessionId,
      deviceId,
      fromLang: nativeLang,
      toLang: targetLang,
      appSource: "xlango-tutor",
      tripCode,
    }).catch(() => {});

    res.json({ clientSecret: session.client_secret.value, tutorName: persona.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create tutor session";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/tutor/usage/realtime
 * Client reports usage after each response.done event.
 */
router.post("/usage/realtime", async (req, res) => {
  try {
    const {
      sessionId,
      audioInputTokens = 0,
      audioOutputTokens = 0,
      textInputTokens = 0,
      textOutputTokens = 0,
    } = req.body as {
      sessionId?: string;
      audioInputTokens?: number;
      audioOutputTokens?: number;
      textInputTokens?: number;
      textOutputTokens?: number;
    };

    const { deviceId, displayName } = trackingHeaders(req);
    const costUsd = calcRealtimeCost({ audioInputTokens, audioOutputTokens, textInputTokens, textOutputTokens });

    upsertUser(deviceId, displayName).catch(() => {});
    logTurn({
      sessionId,
      deviceId,
      model: "gpt-4o-mini-realtime-preview",
      endpoint: "realtime",
      audioInputTokens,
      audioOutputTokens,
      inputTokens: textInputTokens,
      outputTokens: textOutputTokens,
      costUsd,
    }).catch(() => {});

    res.json({ ok: true, costUsd });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record usage";
    res.status(500).json({ error: message });
  }
});

export default router;
