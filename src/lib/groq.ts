// Minimal Groq REST client (no SDK). The key is read from the environment on the server only.
// Swapped in for Gemini: same JSON-in/JSON-out contract (see compose.ts), so nothing upstream
// of this file needed to change shape — only the transport and model name did.
// NOTE (Sep 2026): llama-3.3-70b-versatile and llama-3.1-8b-instant were decommissioned by
// Groq on 16 Aug 2026 for free/developer-tier usage. Using their official replacements.
const MODELS = () => [process.env.GROQ_MODEL || "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

export const hasGroq = () => Boolean(process.env.GROQ_API_KEY);

export class GroqError extends Error {
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

export async function groqJSON<T>(system: string, prompt: string, opts?: { temperature?: number; timeoutMs?: number }): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new GroqError("GROQ_API_KEY is not set", 0);
  let lastErr: GroqError | null = null;
  for (const model of MODELS()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 40000);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          temperature: opts?.temperature ?? 0.1,
          response_format: { type: "json_object" },
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.text();
        lastErr = new GroqError(`Groq ${res.status} (${model}): ${body.slice(0, 200).replace(key, "***")}`, res.status);
        if (res.status === 400 || res.status === 401 || res.status === 403) throw lastErr; // key/config problem: do not retry other models
        continue; // 404/429/5xx: try next model
      }
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = j.choices?.[0]?.message?.content || "";
      if (!text) {
        lastErr = new GroqError(`Groq returned no text (${model})`, 502);
        continue;
      }
      return extractJson(text) as T;
    } catch (e) {
      if (e instanceof GroqError) {
        lastErr = e;
        if ([400, 401, 403].includes(e.status)) throw e;
      } else {
        lastErr = new GroqError(e instanceof Error ? e.message : "network error", 599);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new GroqError("Groq unavailable", 599);
}
