/**
 * Supported languages for xlango.
 *
 * To add a language: append one entry to LANGUAGES below.
 * That's the only file you need to touch — the web app, mobile app,
 * and API server all derive their lists and name maps from this source.
 *
 * Fields:
 *   code   — ISO 639-1 code sent to the API, or "auto" for auto-detect
 *   label  — English name used in AI translation instructions
 *   native — Native-script name shown in the UI picker
 */
export interface Language {
  code: string;
  label: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: "auto", label: "Auto Detect",      native: "Auto"       },
  { code: "en",   label: "English",          native: "English"    },
  { code: "zh",   label: "Mandarin Chinese", native: "中文"        },
  { code: "hi",   label: "Hindi",            native: "हिंदी"      },
  { code: "es",   label: "Spanish",          native: "Español"    },
  { code: "ar",   label: "Arabic",           native: "العربية"    },
  { code: "pt",   label: "Portuguese",       native: "Português"  },
  { code: "fr",   label: "French",           native: "Français"   },
  { code: "ru",   label: "Russian",          native: "Русский"    },
  { code: "ja",   label: "Japanese",         native: "日本語"      },
  { code: "de",   label: "German",           native: "Deutsch"    },
  { code: "mr",   label: "Marathi",          native: "मराठी"      },
  { code: "ta",   label: "Tamil",            native: "தமிழ்"      },
  { code: "te",   label: "Telugu",           native: "తెలుగు"      }, 
];

/**
 * Map of language code → English name, for use in AI prompts.
 * "auto" is excluded since the model detects the language itself.
 */
export const LANG_NAMES: Record<string, string> = Object.fromEntries(
  LANGUAGES.filter((l) => l.code !== "auto").map((l) => [l.code, l.label])
);
