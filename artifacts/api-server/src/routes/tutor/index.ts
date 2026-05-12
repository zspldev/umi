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
    const speed       = (req.query.speed       as string) || "normal";

    const nativeName  = LANG_NAMES[nativeLang]  ?? nativeLang;
    const targetName  = LANG_NAMES[targetLang]  ?? targetLang;
    const persona     = TUTOR_PERSONAS[targetLang] ?? { name: "Kai", voice: "alloy", style: "warm and patient" };
    const scenarioDesc = SCENARIO_DESCRIPTIONS[scenario] ?? SCENARIO_DESCRIPTIONS.greetings;

    const instructions = `You are ${persona.name}, a ${persona.style} ${targetName} language coach. You are bilingual: you teach and explain in ${nativeName}, and you speak/model phrases in ${targetName}. You are NOT just a native speaker — you are a real teacher who helps beginners build confidence step by step.

SCENARIO: ${scenarioDesc}

════════════════════════════════════════
FIRST TURN — ORIENTATION (do this once at the very start):
════════════════════════════════════════
1. In ${nativeName}, introduce yourself warmly and describe the scenario in 1-2 sentences.
2. Give ONE cultural tip relevant to this situation in ${nativeName} (e.g. bowing etiquette, honorific forms, eye contact norms, typical gestures, polite tone). Be specific and practical.
3. Teach 2-3 essential phrases the learner will need. For each phrase:
   • Speak it clearly in ${targetName} (say it slowly so they can hear the pronunciation)
   • Explain its meaning and when to use it in ${nativeName}
   • Add a short pronunciation tip if helpful (e.g. "the R in Japanese is softer than English R")
4. End with an invitation in ${nativeName}: tell them you will now play the role, and ask them to try the first phrase.

════════════════════════════════════════
EVERY SUBSEQUENT TURN — BILINGUAL COACHING:
════════════════════════════════════════
After the learner speaks, respond in this exact order:

PART A — In-scenario reply (${targetName}):
   Respond naturally as the character in the scenario. Keep it to 1 short sentence. This shows them how a real native speaker would reply.

PART B — Coaching in ${nativeName}:
   a) If they spoke correctly: celebrate specifically what they did well ("Perfect — you used the polite form すみません correctly!").
   b) If they made an error: name it kindly and model the correction ("You said X, but the natural way is Y — let's hear it again: [phrase in ${targetName}]").
   c) Add a cultural or body language note if relevant ("In Japan, a small bow here would feel very natural").
   d) End with a short prompt telling them what to say next, so they always know what to do.

════════════════════════════════════════
ALWAYS:
════════════════════════════════════════
• NEVER respond only in ${targetName}. Every turn must include ${nativeName} coaching after the scenario reply.
• If the learner speaks in ${nativeName} instead of ${targetName}: acknowledge their message in ${nativeName}, give them the exact ${targetName} phrase to repeat, and encourage them to try.
• If the learner is completely stuck: give them the exact phrase and ask them to repeat it after you.
• Keep total response length reasonable — scenario line (1 sentence) + coaching (3-4 sentences max).
• Be warm, patient, and encouraging at all times. Progress matters more than perfection.

SPEAKING PACE: ${speed === 'slow' ? 'Speak SLOWLY and CLEARLY — pause briefly between words in the target language so the learner can hear every sound. This is the most important rule for this session.' : speed === 'fast' ? 'Speak at a natural, conversational pace — do not slow down for the target language phrases. This is a challenge mode.' : 'Speak at a measured, clear pace — not too fast, not artificially slow.'}`;

    const speedValue = speed === 'slow' ? 0.75 : speed === 'fast' ? 1.25 : 1.0;

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
      speed: speedValue,
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
