// application.service — SpeechService: "search by voice" when the browser cannot recognise speech itself.
// The recorded audio is turned into text; the text is then searched like any typed keyword.
import { transcribeAudio, SpeechBusyError } from "../../infrastructure/llm/groqWhisper";
import { askLLM } from "../../infrastructure/llm/groqClient";
import { productRepository } from "../../infrastructure/repository/productRepository";
import { AppError } from "./appError";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // ~ several minutes of speech; a search phrase is a few seconds

/**
 * Speech recognition spells English brand names the way they sound in Vietnamese ("AirPods" -> "ẻ tuột", "DJI Mini" -> "giờ ZE mini").
 * The shop's own product names are given to the LLM so it can put the right brand back. Any failure keeps the original text.
 */
async function fixBrandNames(text: string): Promise<string> {
  try {
    const products = await productRepository.search({}, undefined, 200);
    const vocabulary = products.map((p) => p.name.replace(/\s*\(.*?\)/g, "")).join("; ");
    const fixed = await askLLM(
      "You fix speech-to-text mistakes in a shopping search typed by voice (Vietnamese, sometimes mixed with English). " +
        "Words may be wrong because an English brand or model name was heard in Vietnamese sounds. Typical mistakes: " +
        "'ẻ tuột' / 'ê pót' = AirPods, 'giờ ZE' / 'dở gì' / 'đi giây ai' / 'đê gi ai' = DJI, 'ai phôn' = iPhone, 'sam sung' = Samsung, " +
        "'gà lắc xi' = Galaxy, 'lép tóp' = laptop, 'ghê minh' = gaming. " +
        "Use ONLY this shop vocabulary to repair such words: " + vocabulary + ". " +
        "Change a word only when it clearly sounds like a vocabulary item; keep every other word, number and the Vietnamese wording unchanged (never delete words). " +
        "Reply with the corrected search text only, no quotes, no explanation.",
      text,
      80,
      0
    );
    const clean = fixed?.split("\n")[0].replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!clean || clean.length > text.length * 2 + 20) return text;
    return clean;
  } catch {
    return text;
  }
}

export const speechService = {
  async transcribe(
    audio: Blob | null,
    filename = "voice.webm",
    transcribe: (a: Blob, name: string) => Promise<string | null> = transcribeAudio
  ): Promise<string> {
    if (!audio || audio.size === 0) throw new AppError(400, "No audio received.");
    if (audio.size > MAX_AUDIO_BYTES) throw new AppError(400, "The recording is too long. Please say a short phrase.");
    if (!/^audio\//.test(audio.type) && !/^video\/(webm|mp4)/.test(audio.type)) throw new AppError(400, "Unsupported audio format.");
    if (!process.env.GROQ_API_KEY && transcribe === transcribeAudio) {
      throw new AppError(503, "Voice search needs the AI service. Set GROQ_API_KEY in web/.env and restart the server.");
    }

    let text: string | null;
    try {
      text = await transcribe(audio, filename);
    } catch (e) {
      if (e instanceof SpeechBusyError) throw new AppError(429, "The AI service is busy. Please wait a few seconds and try again.");
      throw e;
    }
    if (text === null) throw new AppError(502, "The AI service could not understand the recording. Please try again.");
    if (!text) throw new AppError(422, "I did not hear anything. Please try again.");
    return transcribe === transcribeAudio ? fixBrandNames(text) : text;
  }
};
