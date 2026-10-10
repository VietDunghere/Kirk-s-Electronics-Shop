// infrastructure.llm — one place that talks to the Groq chat API (used by the AI advisors).
// Returns null when there is no API key or the call fails, so every caller keeps a rule-based fallback.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export async function askLLM(system: string, user: string, maxTokens = 500, temperature = 0.2): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature,
        reasoning_effort: "low",
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(25000)
    });
    if (!res.ok) {
      console.error("Groq error", res.status);
      return null;
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim() || null;
  } catch (e) {
    console.error("Groq call failed", e);
    return null;
  }
}
