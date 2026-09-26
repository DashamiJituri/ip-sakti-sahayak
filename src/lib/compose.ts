import { randomUUID } from "crypto";
import type { AnswerPoint, ChatRequest, ChatResponse, Confidence, JurisdictionAnswer, SourceRef } from "./types";
import { search, jurisdictionsFor, unionMatchedTerms, STRONG_DOMAIN_TERMS, type Hit } from "./retrieval";
import { groqJSON, hasGroq, GroqError } from "./groq";
import { pointIsSupported } from "./guard";
import { CATEGORIES } from "./classifier";
import { languageName } from "./translate";
import type { Lang } from "./types";

const DISCLAIMER =
  "This is general information to help you navigate Ayurveda IP and regulatory questions, not legal advice. Verify anything material with a registered patent/IP agent or lawyer before acting, especially before a filing or a commercial launch.";

const OFFICIAL_LINKS = [
  { label: "TKDL (Traditional Knowledge Digital Library)", url: "https://www.tkdl.res.in" },
  { label: "IP India - Patents (InPASS)", url: "https://ipindia.gov.in/patents.htm" },
  { label: "IP India - Trade Marks", url: "https://ipindia.gov.in/trade-marks.htm" },
  { label: "IP India - Geographical Indications", url: "https://ipindia.gov.in/gi.htm" },
  { label: "India Code (statutes)", url: "https://www.indiacode.nic.in" },
  { label: "National Biodiversity Authority", url: "https://nbaindia.gov.in" },
  { label: "WIPO PCT", url: "https://www.wipo.int/pct/en/" },
];

function mkSourceRef(id: string, h: Hit): SourceRef {
  return {
    id,
    chunkId: h.chunk.id,
    docId: h.doc.id,
    title: h.doc.title,
    short: h.doc.short,
    page: h.chunk.page,
    section: h.chunk.section,
    status: h.doc.status,
    tier: h.doc.tier,
    jurisdiction: h.doc.jurisdiction,
    excerpt: h.chunk.text.length > 480 ? h.chunk.text.slice(0, 480) + "…" : h.chunk.text,
    verifyUrl: h.chunk.verifyUrl,
    note: h.doc.note || undefined,
  };
}

interface AiPoint {
  text: string;
  sourceIds: string[];
}
interface AiOut {
  summary: string;
  points: AiPoint[];
  insufficientEvidence: boolean;
}

function systemFor(language: Lang): string {
  const lang = languageName(language);
  const langRule =
    language === "en"
      ? ""
      : `\n7. Write the "summary" field and every point's "text" field in ${lang} (not English). Keep section numbers, act/rule names, dates, percentages, amounts and passage ids (e.g. "S1") exactly as they appear — do not translate or transliterate those, only the surrounding sentence.`;
  return `You are the drafting layer behind IP-SAKTI Sahayak, an Indian government (Ministry of Ayush) assistant for Ayurveda IP and regulatory questions.
Rules, no exceptions:
1. Use ONLY the numbered passages given to you. Do not use outside knowledge, do not guess section numbers, dates, percentages or figures that are not literally present in a passage.
2. Every point you write must carry the ids of the passages (e.g. ["S1","S3"]) that fully support it. If no passage supports a point, do not write it.
3. If the passages do not answer the question, set insufficientEvidence=true and keep points minimal or empty. Do not pad with generic statements.
4. Write for a founder/practitioner, not a lawyer: plain language, no legalese, but keep any section number, percentage, date or amount EXACTLY as it appears in the passage.
5. Never say a statement is "the law" if the passage is itself labelled as a curated summary, a note, or a reference list - say "generally" or attribute it, and prefer citing a primary passage when both exist.
6. Output strict JSON only, matching the schema you were given. No markdown, no commentary.${langRule}`;
}

function buildPrompt(question: string, hits: Hit[], idOf: Map<string, string>, jurisdiction: string): string {
  const passages = hits
    .map((h) => `[${idOf.get(h.chunk.id)}] (${h.doc.short}${h.chunk.section ? ", s." + h.chunk.section : ""}${h.chunk.page ? ", p." + h.chunk.page : ""}, tier=${h.doc.tier}, status=${h.doc.status})\n${h.chunk.text}`)
    .join("\n\n---\n\n");
  return `Jurisdiction: ${jurisdiction}
Question: ${question}

Passages:
${passages || "(none retrieved)"}

Return JSON: {"summary": string, "points": [{"text": string, "sourceIds": string[]}], "insufficientEvidence": boolean}`;
}

const RETRIEVAL_MODE_SUMMARY: Record<Lang, string> = {
  en: "AI summarisation is off (no API key configured). Showing the most relevant passages directly.",
  hi: "एआई सारांश बंद है (कोई एपीआई की कॉन्फ़िगर नहीं है)। सबसे प्रासंगिक अंश सीधे दिखाए जा रहे हैं।",
  mr: "एआय सारांश बंद आहे (एपीआय की कॉन्फिगर केलेली नाही). सर्वात समर्पक उतारे थेट दाखवले जात आहेत.",
  ta: "AI சுருக்கம் முடக்கப்பட்டுள்ளது (API விசை உள்ளமைக்கப்படவில்லை). மிகவும் பொருத்தமான பத்திகள் நேரடியாகக் காட்டப்படுகின்றன.",
  te: "AI సారాంశం ఆఫ్‌లో ఉంది (API కీ కాన్ఫిగర్ చేయలేదు). అత్యంత సంబంధిత భాగాలు నేరుగా చూపబడుతున్నాయి.",
  kn: "AI ಸಾರಾಂಶ ಆಫ್ ಆಗಿದೆ (API ಕೀ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ). ಅತ್ಯಂತ ಸಂಬಂಧಿತ ಭಾಗಗಳನ್ನು ನೇರವಾಗಿ ತೋರಿಸಲಾಗುತ್ತಿದೆ.",
  ml: "AI സംഗ്രഹം ഓഫാണ് (API കീ കോൺഫിഗർ ചെയ്തിട്ടില്ല). ഏറ്റവും പ്രസക്തമായ ഭാഗങ്ങൾ നേരിട്ട് കാണിക്കുന്നു.",
};

async function draftForJurisdiction(question: string, hits: Hit[], language: Lang): Promise<{ ans: JurisdictionAnswer; refs: SourceRef[] } | null> {
  if (hits.length === 0) return null;
  const idOf = new Map<string, string>();
  hits.forEach((h, i) => idOf.set(h.chunk.id, `S${i + 1}`));
  const refs = hits.map((h) => mkSourceRef(idOf.get(h.chunk.id)!, h));
  const jurisdiction = hits[0].doc.jurisdiction;

  if (!hasGroq()) {
    // Retrieval-only mode: show the passages themselves as the "answer".
    return {
      ans: {
        jurisdiction,
        summary: RETRIEVAL_MODE_SUMMARY[language] || RETRIEVAL_MODE_SUMMARY.en,
        points: [],
        withheld: 0,
        passages: refs.map((r) => r.id),
      },
      refs,
    };
  }

  let raw: AiOut;
  try {
    raw = await groqJSON<AiOut>(systemFor(language), buildPrompt(question, hits, idOf, jurisdiction), { temperature: 0.1 });
  } catch (e) {
    const msg = e instanceof GroqError ? e.message : "unknown error";
    return {
      ans: {
        jurisdiction,
        summary: `AI summarisation failed (${msg}). Showing the most relevant passages directly instead of a generated summary.`,
        points: [],
        withheld: 0,
        passages: refs.map((r) => r.id),
      },
      refs,
    };
  }

  const validSourceIds = new Set(idOf.values());
  let withheld = 0;
  const points: AnswerPoint[] = [];
  for (const p of raw.points || []) {
    const cited = (p.sourceIds || []).filter((id) => validSourceIds.has(id));
    const citedTexts = cited.map((sid) => hits.find((h) => idOf.get(h.chunk.id) === sid)?.chunk.text || "").filter(Boolean);
    if (citedTexts.length === 0) {
      withheld++;
      continue;
    }
    if (!pointIsSupported(p.text, citedTexts)) {
      withheld++;
      continue;
    }
    points.push({ text: p.text, sources: cited });
  }

  // The model may honestly decline to draft a fully-cited summary (it set
  // insufficientEvidence, or every drafted statement failed the citation
  // check above) even though retrieval already found relevant passages
  // (hits.length > 0, checked at the top of this function). Previously that
  // produced an answer with zero points and nothing else, which downstream
  // gets treated as "no content" and replaces the whole response with a
  // blanket "not answered in the indexed documents" card - hiding passages
  // that were, in fact, found. Fall back to showing those passages directly,
  // the same way the no-API-key retrieval mode does, so the user always sees
  // what was actually retrieved instead of a wall that looks identical to a
  // genuine no-match case.
  if (points.length === 0) {
    return {
      ans: {
        jurisdiction,
        summary:
          raw.summary && raw.summary.trim()
            ? raw.summary
            : "The assistant couldn't draft a fully-cited summary for this exact question. Showing the closest matching passages instead.",
        points: [],
        withheld,
        passages: refs.map((r) => r.id),
      },
      refs,
    };
  }

  return {
    ans: {
      jurisdiction,
      summary: raw.summary || "",
      points,
      withheld,
    },
    refs,
  };
}

function scoreConfidence(hits: Hit[], answers: JurisdictionAnswer[], aiOk: boolean): Confidence {
  if (hits.length === 0) {
    return { score: 0.05, level: "low", reasons: ["No matching passages were found in the indexed corpus for this question."] };
  }
  const reasons: string[] = [];
  const matched = unionMatchedTerms(hits);
  const hasStrongTerm = matched.some((t) => STRONG_DOMAIN_TERMS.has(t));
  const avgCoverage = hits.reduce((a, h) => a + h.coverage, 0) / hits.length;
  const primaryShare = hits.filter((h) => h.doc.tier === "primary").length / hits.length;

  // Abstain unless there is either (a) at least one strong, unambiguous legal-domain term matched
  // (covers short Hindi/Hinglish queries where only 1-2 English terms survive alias mapping), or
  // (b) enough general term overlap to be confident this is actually about the indexed corpus.
  if (matched.length === 0 || (!hasStrongTerm && (matched.length === 1 || avgCoverage < 0.5))) {
    return {
      score: matched.length === 0 ? 0.05 : 0.15,
      level: "low",
      reasons: [
        matched.length === 0
          ? "No query terms overlapped with the indexed documents."
          : "The overlap with the indexed documents was limited to generic words, none specific to Ayurveda IP or regulation — this question does not appear to be covered by this corpus.",
      ],
    };
  }

  const totalPoints = answers.reduce((a, x) => a + x.points.length, 0);
  const totalWithheld = answers.reduce((a, x) => a + x.withheld, 0);
  let score = 0.25 + 0.4 * avgCoverage + 0.2 * primaryShare;
  if (!aiOk) score = Math.min(score, 0.55);
  // Some or all drafted statements failed the literal-citation check: real
  // reason to distrust the AI's synthesis, so the score is capped below
  // "high" - but retrieval itself (avgCoverage, primaryShare) already found
  // genuinely relevant material, which is now shown to the user as raw
  // passages (see the fallback in draftForJurisdiction). Capping all the way
  // to 0.3 forced "low" confidence, which in turn forced a full "nothing
  // found" abstain screen that hid those passages - so this only caps into
  // "medium", not "low".
  if (totalWithheld > 0 && totalPoints === 0) score = Math.min(score, 0.45);
  else if (totalWithheld > 0) score -= 0.08 * totalWithheld;
  score = Math.max(0.02, Math.min(0.97, score));

  reasons.push(`${Math.round(avgCoverage * 100)}% of your query's key terms were matched in the cited passages.`);
  reasons.push(`${Math.round(primaryShare * 100)}% of the cited passages are primary legal text (Act/Rules/Regulations/Gazette), not commentary.`);
  if (totalWithheld > 0) reasons.push(`${totalWithheld} drafted statement(s) were dropped because they were not literally supported by the cited passages.`);
  if (!aiOk) reasons.push("AI summarisation was unavailable, so this reflects retrieval only.");

  const level: Confidence["level"] = score >= 0.66 ? "high" : score >= 0.4 ? "medium" : "low";
  return { score: Math.round(score * 100) / 100, level, reasons };
}

export async function answerQuestion(req: ChatRequest): Promise<ChatResponse> {
  const requestId = randomUUID();
  const notices: string[] = [];

  // Retrieval matches on English/bilingual terms via alias expansion (src/lib/aliases.ts) no
  // matter what language the question or the answer is in, so the raw question is used for
  // search as-is; only the drafting step (below) is language-aware.
  const englishQuery = req.question;

  const jurisdictions = jurisdictionsFor(req.jurisdiction);
  const category = req.category ? CATEGORIES.find((c) => c.id === req.category) : undefined;
  const augmented = category ? `${englishQuery}\n\nProduct category context: ${category.label} — ${category.gist}` : englishQuery;

  const answers: JurisdictionAnswer[] = [];
  const sources: Record<string, SourceRef> = {};
  let allHits: Hit[] = [];
  let aiOk = hasGroq();

  for (const j of jurisdictions) {
    const hits = search(augmented, { jurisdiction: j, k: 7, category: req.category || null });
    allHits = allHits.concat(hits);
    const d = await draftForJurisdiction(englishQuery, hits, req.language);
    if (d) {
      answers.push(d.ans);
      for (const r of d.refs) sources[r.id] = r;
      if (d.ans.summary.startsWith("AI summarisation failed")) aiOk = false;
    }
  }

  const confidence = scoreConfidence(allHits, answers, aiOk);
  const totalContent = answers.reduce((a, x) => a + x.points.length + (x.passages?.length || 0), 0);
  let mode: ChatResponse["mode"] = hasGroq() ? "ai" : "retrieval";
  if (totalContent === 0 || confidence.level === "low") mode = "abstain";

  return {
    requestId,
    mode,
    answers,
    sources,
    confidence,
    notices,
    escalate: confidence.level === "low" || mode === "abstain",
    language: req.language,
    englishQuery: englishQuery !== req.question ? englishQuery : undefined,
    officialLinks: OFFICIAL_LINKS,
    disclaimer: DISCLAIMER,
  };
}
