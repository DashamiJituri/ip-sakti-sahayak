// Multilinguality, LegalEase-style: no separate translation API call (no Bhashini, no MT
// round-trip). The target language is named directly inside the drafting prompt and the
// model (Groq/Llama) writes the summary and points in that language in one pass — see
// languageName() + the SYSTEM prompt in compose.ts. This is faster (one LLM call instead of
// three), needs no extra service/key to configure, and avoids MT mistranslating legal terms
// that the drafting model is instructed to keep verbatim (section numbers, dates, %, etc).
import type { Lang } from "./types";
import { hasGroq, groqJSON } from "./groq";

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

// Single source of truth for the supported language codes, used to validate the
// `language` field on every API route (chat, classify, abs) so all three accept
// and honour the same set.
export const ALL_LANGS: Lang[] = ["en", "hi", "mr", "ta", "te", "kn", "ml"];

// Shown when a non-English language was requested but there was no way to
// translate the fixed classify/ABS guidance text (no Groq key configured, or the
// translation call itself failed) — the response falls back to English rather
// than showing nothing, and the UI can display this so the user knows why.
export const TRANSLATION_UNAVAILABLE_NOTICE: Record<Lang, string> = {
  en: "",
  hi: "अनुवाद अभी पूरा नहीं हो सका, इसलिए मूल अंग्रेज़ी पाठ दिखाया जा रहा है।",
  mr: "भाषांतर आत्ता पूर्ण होऊ शकले नाही, म्हणून मूळ इंग्रजी मजकूर दाखवला आहे.",
  ta: "மொழிபெயர்ப்பு இப்போது முடியவில்லை, எனவே அசல் ஆங்கிலம் காட்டப்படுகிறது.",
  te: "అనువాదం ఇప్పుడు పూర్తి కాలేదు, కాబట్టి అసలు ఆంగ్లం చూపబడుతోంది.",
  kn: "ಅನುವಾದ ಈಗ ಪೂರ್ಣಗೊಳ್ಳಲಿಲ್ಲ, ಆದ್ದರಿಂದ ಮೂಲ ಇಂಗ್ಲಿಷ್ ತೋರಿಸಲಾಗಿದೆ.",
  ml: "വിവർത്തനം ഇപ്പോൾ പൂർത്തിയാക്കാനായില്ല, അതിനാൽ യഥാർത്ഥ ഇംഗ്ലീഷ് കാണിക്കുന്നു.",
};

// Caption shown under a machine-translated passage excerpt, in the target language itself,
// so it reads naturally rather than switching back to English mid-answer. Kept short since
// it renders inline under every citation card.
export const MACHINE_TRANSLATION_CAPTION: Record<Lang, string> = {
  en: "",
  hi: "मशीन अनुवाद — मूल पाठ के लिए टैप करें",
  mr: "यंत्र भाषांतर — मूळ मजकुरासाठी टॅप करा",
  ta: "இயந்திர மொழிபெயர்ப்பு — மூலப் பனுவலுக்கு தட்டவும்",
  te: "యంత్ర అనువాదం — అసలు వచనం కోసం నొక్కండి",
  kn: "ಯಂತ್ರ ಅನುವಾದ — ಮೂಲ ಪಠ್ಯಕ್ಕಾಗಿ ಟ್ಯಾಪ್ ಮಾಡಿ",
  ml: "യന്ത്ര വിവർത്തനം — യഥാർത്ഥ വാചകത്തിനായി ടാപ്പ് ചെയ്യുക",
};

// Translates a fixed set of already-drafted English strings (classifier category
// text, ABS decision text) into the requested UI language in one model call — the
// same prompt-based approach compose.ts uses for chat answers, so no separate MT
// service/key is introduced. Keeps the exact key/array shape it was given so the
// caller can drop the result straight back into the response object.
//
// This exists because BEFORE this fix, /api/classify and /api/abs never received
// or used the selected language at all: the page chrome (labels, buttons) switched
// language via i18n.ts, but the actual classification/ABS guidance text they
// returned was always the hardcoded English from classifier.ts/abs.ts, regardless
// of what the user had selected. That mismatch was the bug being fixed.
export async function translateFields<T extends Record<string, unknown>>(
  language: Lang,
  fields: T
): Promise<{ translated: T; ok: boolean }> {
  if (language === "en") return { translated: fields, ok: true };
  if (!hasGroq()) return { translated: fields, ok: false };

  const lang = languageName(language);
  const system = `You translate fixed legal/regulatory guidance strings for an Indian government (Ministry of Ayush) assistant into ${lang}.
Rules, no exceptions:
1. Translate every string value into ${lang}.
2. Keep section numbers, Act/Rule names, dates, percentages and amounts EXACTLY as written - do not translate or transliterate those tokens, only the surrounding sentence.
3. Preserve the exact JSON key names and array lengths/order you were given - do not add, remove, merge, reorder or skip any key or array item. If a value is missing/undefined, leave it out of your output the same way.
4. Output strict JSON only, matching the input's shape. No markdown, no commentary.`;
  const prompt = `Translate this JSON object's string values into ${lang}, following the rules exactly:\n${JSON.stringify(fields)}`;

  try {
    const out = await groqJSON<T>(system, prompt, { temperature: 0 });
    return { translated: out, ok: true };
  } catch (e) {
    console.error("[translateFields] translation failed:", e instanceof Error ? e.message : e);
    // Fall back to the original English fields rather than failing the whole
    // request - the caller attaches TRANSLATION_UNAVAILABLE_NOTICE so the user
    // knows why it's in English instead of silently mismatching their selection.
    return { translated: fields, ok: false };
  }
}
