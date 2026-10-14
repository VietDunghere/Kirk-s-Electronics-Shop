// infrastructure.llm — speech to text with Groq's Whisper model (used when the browser's own speech recognition is unavailable).
const URL_TRANSCRIBE = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3";

/** The speech service is rate limited (free tier): the caller can tell the customer to wait a moment. */
export class SpeechBusyError extends Error {}

// Product words that a shop customer says; helps Whisper spell them right.
const HINT = "laptop, iPhone, Samsung Galaxy, DJI, drone, tai nghe, màn hình, bàn phím, chuột, card đồ họa, PC gaming, dưới 20 triệu";

/** Returns the spoken text, or null when there is no key or the call fails. */
export async function transcribeAudio(audio: Blob, filename: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", MODEL);
    // no language set: Whisper detects Vietnamese or English by itself
    form.append("temperature", "0");
    form.append("response_format", "json");
    form.append("prompt", HINT);
    const res = await fetch(URL_TRANSCRIBE, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(25000)
    });
    if (res.status === 429) throw new SpeechBusyError("rate limited");
    if (!res.ok) {
      console.error("Groq speech error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    return typeof data.text === "string" ? data.text.trim() : null;
  } catch (e) {
    if (e instanceof SpeechBusyError) throw e;
    console.error("Groq speech call failed", e);
    return null;
  }
}
