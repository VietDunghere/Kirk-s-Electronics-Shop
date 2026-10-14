// infrastructure.llm — asks a Groq vision model what product is in a photo (used by "search by image").
// Returns null when there is no API key or the call fails. The shop never trusts the answer blindly:
// the keywords are only used to search the real catalog.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

export type ImageGuess = {
  /** Short name of what is in the photo, e.g. "gaming laptop". */
  label: string;
  /** Search words (English and Vietnamese) that the product name or description may contain. */
  keywords: string[];
  /** One of the shop categories, when the model is sure. */
  category: string | null;
};

const CATEGORIES = ["Electronics", "Phones", "Laptops", "Accessories", "Gaming", "PC", "Drones"];

/** The vision model is rate limited (free tier): the caller can tell the customer to wait a moment. */
export class VisionBusyError extends Error {}

/** Pulls the JSON object out of the model's reply (it may wrap it in text or a code fence). */
export function parseImageGuess(text: string): ImageGuess | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as { label?: unknown; keywords?: unknown; category?: unknown };
    const keywords = (Array.isArray(data.keywords) ? data.keywords : [])
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length >= 2 && k.length <= 40)
      .filter((k, i, all) => all.indexOf(k) === i)
      .slice(0, 12);
    const label = typeof data.label === "string" ? data.label.trim().slice(0, 80) : "";
    const category = typeof data.category === "string" && CATEGORIES.includes(data.category) ? data.category : null;
    if (!keywords.length && !label) return null;
    return { label: label || keywords[0], keywords, category };
  } catch {
    return null;
  }
}

export async function describeProductImage(dataUrl: string): Promise<ImageGuess | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "You help an electronics shop. Look at the photo and identify the product the customer wants to buy. " +
                  `Answer with ONLY one JSON object: {"label":"short product name in English","category":"one of ${CATEGORIES.join(" | ")} or null",` +
                  '"keywords":["6 to 10 lowercase words a product name or description could contain, English first then Vietnamese"]}. ' +
                  "Include the brand and model if it is clearly visible. If the photo has no product, return keywords: []."
              },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    });
    if (res.status === 429) throw new VisionBusyError("rate limited");
    if (!res.ok) {
      console.error("Groq vision error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    return parseImageGuess(data.choices?.[0]?.message?.content || "");
  } catch (e) {
    if (e instanceof VisionBusyError) throw e;
    console.error("Groq vision call failed", e);
    return null;
  }
}
