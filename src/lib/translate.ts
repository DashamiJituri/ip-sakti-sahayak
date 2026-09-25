// Bhashini-first translation with a graceful fallback. If BHASHINI_* env vars are absent,
// the app runs in "English-normalised query" mode: non-English input is still routed correctly
// via alias expansion (src/lib/aliases.ts), and the app says so via a notice.
export async function translateToEnglish(text: string, sourceLang: string): Promise<{ text: string; usedMT: boolean }> {
  if (sourceLang === "en") return { text, usedMT: false };
  const udyat = process.env.BHASHINI_UDYAT_KEY;
  const pipelineId = process.env.BHASHINI_PIPELINE_ID;
  if (!udyat || !pipelineId) return { text, usedMT: false };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: udyat },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: "translation", config: { language: { sourceLanguage: sourceLang, targetLanguage: "en" } } }],
        inputData: { input: [{ source: text }] },
        pipelineRequestConfig: { pipelineId },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { text, usedMT: false };
    const j = (await res.json()) as { pipelineResponse?: { output?: { target?: string }[] }[] };
    const out = j.pipelineResponse?.[0]?.output?.[0]?.target;
    return out ? { text: out, usedMT: true } : { text, usedMT: false };
  } catch {
    return { text, usedMT: false };
  }
}

export async function translateFromEnglish(text: string, targetLang: string): Promise<{ text: string; usedMT: boolean }> {
  if (targetLang === "en") return { text, usedMT: false };
  const udyat = process.env.BHASHINI_UDYAT_KEY;
  const pipelineId = process.env.BHASHINI_PIPELINE_ID;
  if (!udyat || !pipelineId) return { text, usedMT: false };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: udyat },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: "translation", config: { language: { sourceLanguage: "en", targetLanguage: targetLang } } }],
        inputData: { input: [{ source: text }] },
        pipelineRequestConfig: { pipelineId },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { text, usedMT: false };
    const j = (await res.json()) as { pipelineResponse?: { output?: { target?: string }[] }[] };
    const out = j.pipelineResponse?.[0]?.output?.[0]?.target;
    return out ? { text: out, usedMT: true } : { text, usedMT: false };
  } catch {
    return { text, usedMT: false };
  }
}
