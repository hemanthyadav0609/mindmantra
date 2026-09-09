import { ENV } from "./_core/env";

export const SARVAM_LANGUAGES = ["en-IN", "hi-IN", "te-IN"] as const;
export type SarvamLanguage = (typeof SARVAM_LANGUAGES)[number];

export class SarvamTtsError extends Error {
  constructor(message: string, public readonly statusCode = 502) {
    super(message);
    this.name = "SarvamTtsError";
  }
}

export async function synthesizeSarvamSpeech({
  text,
  languageCode,
  pace = 0.9,
}: {
  text: string;
  languageCode: SarvamLanguage;
  pace?: number;
}) {
  if (!ENV.sarvamApiKey) {
    throw new SarvamTtsError("Sarvam TTS is not configured on the server.", 503);
  }

  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new SarvamTtsError("Text is required for speech synthesis.", 400);
  }
  if (normalizedText.length > 2500) {
    throw new SarvamTtsError("Text is too long for Sarvam TTS. Keep it under 2500 characters.", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": ENV.sarvamApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: normalizedText,
        language_code: languageCode,
        model: "bulbul:v3",
        speaker: "shubh",
        pace: Math.min(2, Math.max(0.5, pace)),
        speech_sample_rate: 24000,
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null) as { audios?: string[]; request_id?: string; error?: { message?: string } } | null;
    if (!response.ok) {
      const message = payload?.error?.message || `Sarvam TTS request failed (${response.status}).`;
      throw new SarvamTtsError(message, response.status === 429 ? 429 : 502);
    }

    const audioBase64 = payload?.audios?.filter(Boolean).join("");
    if (!audioBase64) {
      throw new SarvamTtsError("Sarvam returned no audio.", 502);
    }

    return {
      audioDataUrl: `data:audio/wav;base64,${audioBase64}`,
      requestId: payload?.request_id || null,
      languageCode,
    };
  } catch (error) {
    if (error instanceof SarvamTtsError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SarvamTtsError("Sarvam TTS timed out. Please try again.", 504);
    }
    throw new SarvamTtsError("Sarvam TTS is temporarily unavailable. Please try again.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
