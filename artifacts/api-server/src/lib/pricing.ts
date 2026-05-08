/**
 * OpenAI API pricing constants — approximate as of May 2025.
 * Update these when OpenAI changes rates.
 */

/** gpt-4o-mini-transcribe: $0.003 per audio minute */
export const TRANSCRIBE_COST_PER_MINUTE = 0.003;

/** gpt-5.1 chat completions (used for translation) */
export const TRANSLATE_COST_PER_INPUT_TOKEN = 2 / 1_000_000;
export const TRANSLATE_COST_PER_OUTPUT_TOKEN = 8 / 1_000_000;

/** gpt-audio TTS: approximately $15 per 1M characters */
export const TTS_COST_PER_CHAR = 15 / 1_000_000;

/** gpt-4o-mini-realtime-preview audio tokens */
export const REALTIME_AUDIO_INPUT_COST_PER_TOKEN = 10 / 1_000_000;
export const REALTIME_AUDIO_OUTPUT_COST_PER_TOKEN = 20 / 1_000_000;
export const REALTIME_TEXT_INPUT_COST_PER_TOKEN = 0.60 / 1_000_000;
export const REALTIME_TEXT_OUTPUT_COST_PER_TOKEN = 2.40 / 1_000_000;

export function calcTranscribeCost(audioSeconds: number): number {
  return (audioSeconds / 60) * TRANSCRIBE_COST_PER_MINUTE;
}

export function calcTranslateCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * TRANSLATE_COST_PER_INPUT_TOKEN + outputTokens * TRANSLATE_COST_PER_OUTPUT_TOKEN;
}

export function calcTtsCost(charCount: number): number {
  return charCount * TTS_COST_PER_CHAR;
}

export function calcRealtimeCost(opts: {
  audioInputTokens: number;
  audioOutputTokens: number;
  textInputTokens: number;
  textOutputTokens: number;
}): number {
  return (
    opts.audioInputTokens * REALTIME_AUDIO_INPUT_COST_PER_TOKEN +
    opts.audioOutputTokens * REALTIME_AUDIO_OUTPUT_COST_PER_TOKEN +
    opts.textInputTokens * REALTIME_TEXT_INPUT_COST_PER_TOKEN +
    opts.textOutputTokens * REALTIME_TEXT_OUTPUT_COST_PER_TOKEN
  );
}
