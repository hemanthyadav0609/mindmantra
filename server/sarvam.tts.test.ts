import { describe, expect, it } from "vitest";

describe("Sarvam TTS credentials", () => {
  it("accepts the configured SARVAM_API_KEY for a minimal English synthesis request", async () => {
    const apiKey = process.env.SARVAM_API_KEY;
    expect(apiKey, "SARVAM_API_KEY must be configured for this integration test").toBeTruthy();

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Hi",
        target_language_code: "en-IN",
        language_code: "en-IN",
        model: "bulbul:v3",
        speaker: "shubh",
      }),
    });

    const body = await response.json().catch(() => null);
    expect(response.ok, `Sarvam returned ${response.status}: ${JSON.stringify(body)}`).toBe(true);
    expect(body?.audios?.[0]).toEqual(expect.any(String));
  }, 30_000);
});
