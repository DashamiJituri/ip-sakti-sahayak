// Minimal Gemini REST client (no SDK). The key is read from the environment on the server only.
const MODELS = () => [process.env.GEMINI_MODEL || "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"];

export const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);

export class GeminiError extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.status = status;
  }
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("Model did not return JSON");
  }
}

export async function geminiJSON<T>(system: string, prompt: string, opts?: { temperature?: number; timeoutMs?: number }): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set", 0);
  let lastErr: GeminiError | null = null;
  for (const model of MODELS()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 40000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: opts?.temperature ?? 0.1, responseMimeType: "application/json", maxOutputTokens: 8192 },
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.text();
        lastErr = new GeminiError(`Gemini ${res.status} (${model}): ${body.slice(0, 200).replace(key, "***")}`, res.status);
        if (res.status === 400 || res.status === 401 || res.status === 403) throw lastErr; // key/config problem: do not retry other models
        continue; // 404/429/5xx: try next model
      }
      const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      if (!text) {
        lastErr = new GeminiError(`Gemini returned no text (${model})`, 502);
        continue;
      }
      return extractJson(text) as T;
    } catch (e) {
      if (e instanceof GeminiError) {
        lastErr = e;
        if ([400, 401, 403].includes(e.status)) throw e;
      } else {
        lastErr = new GeminiError(e instanceof Error ? e.message : "network error", 599);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new GeminiError("Gemini unavailable", 599);
}
