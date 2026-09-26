// Multilinguality, LegalEase-style: no separate translation API call (no Bhashini, no MT
// round-trip). The target language is named directly inside the drafting prompt and the
// model (Groq/Llama) writes the summary and points in that language in one pass — see
// languageName() + the SYSTEM prompt in compose.ts. This is faster (one LLM call instead of
// three), needs no extra service/key to configure, and avoids MT mistranslating legal terms
// that the drafting model is instructed to keep verbatim (section numbers, dates, %, etc).
import type { Lang } from "./types";

export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
};

export function languageName(lang: Lang): string {
  return LANGUAGE_NAMES[lang] || "English";
}
