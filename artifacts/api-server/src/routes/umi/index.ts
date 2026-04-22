import { Router } from "express";
import { Buffer } from "node:buffer";
import {
  speechToText,
  textToSpeech,
  ensureCompatibleFormat,
} from "@workspace/integrations-openai-ai-server/audio";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  TranscribeAudioBody,
  TranslateTextBody,
  SpeakTextBody,
} from "@workspace/api-zod";

const router = Router();

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  es: "Spanish",
  ja: "Japanese",
  de: "German",
};

router.post("/transcribe", async (req, res) => {
  try {
    const parse = TranscribeAudioBody.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid request body", details: parse.error.errors });
      return;
    }

    const { audioBase64, mimeType, language } = parse.data;
    const audioBuffer = Buffer.from(audioBase64, "base64");

    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);
    const text = await speechToText(buffer, format, language);

    res.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    res.status(500).json({ error: message });
  }
});

router.post("/translate", async (req, res) => {
  try {
    const parse = TranslateTextBody.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid request body", details: parse.error.errors });
      return;
    }

    const { text, fromLang, toLang } = parse.data;
    const fromName = LANG_NAMES[fromLang] ?? fromLang;
    const toName = LANG_NAMES[toLang] ?? toLang;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a professional human interpreter providing real-time spoken translation.

Translate the message from ${fromName} into natural, fluent ${toName} as a native speaker would actually say it.

MANDATORY SCRIPT RULES — violating any of these is an error:
- Hindi → MUST use Devanagari script (नमस्ते, आप कैसे हैं?). NEVER use Urdu/Arabic/Nastaliq script. Hindi and Urdu are different written languages.
- Marathi → MUST use Devanagari script (नमस्कार, तुम्ही कसे आहात?). NEVER use Arabic script.
- English → Latin alphabet only.
- Spanish → Latin alphabet only.
- German → Latin alphabet only.
- Japanese → Japanese script (Hiragana/Katakana/Kanji as appropriate).

TRANSLATION RULES:
- Use real ${toName} vocabulary — NOT phonetic transliteration of the source words
- Never spell out foreign words phonetically in the target script
- Convey the same meaning, intent and tone as the original
- Return ONLY the final translated sentence — nothing else

Examples:
"Hello, how are you?" (English → Hindi) = "नमस्ते, आप कैसे हैं?"  ✓
"Hello, how are you?" (English → Hindi) = "ہیلو، آپ کیسے ہیں؟"   ✗ WRONG SCRIPT
"Hello, how are you?" (English → Hindi) = "हेलो, हाउ आर यू?"      ✗ TRANSLITERATION`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const translatedText = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ translatedText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    res.status(500).json({ error: message });
  }
});

router.post("/speak", async (req, res) => {
  try {
    const parse = SpeakTextBody.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid request body", details: parse.error.errors });
      return;
    }

    const { text } = parse.data;
    const audioBuffer = await textToSpeech(text, "nova", "mp3");
    const audioBase64 = audioBuffer.toString("base64");

    res.json({ audioBase64, mimeType: "audio/mpeg" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Text-to-speech failed";
    res.status(500).json({ error: message });
  }
});

export default router;
