import { randomUUID } from "crypto";
import type { AnswerPoint, ChatRequest, ChatResponse, Confidence, JurisdictionAnswer, SourceRef } from "./types";
import { search, jurisdictionsFor, unionMatchedTerms, STRONG_DOMAIN_TERMS, type Hit } from "./retrieval";
import { geminiJSON, hasGemini, GeminiError } from "./gemini";
import { pointIsSupported } from "./guard";
import { CATEGORIES } from "./classifier";
import { translateToEnglish, translateFromEnglish } from "./translate";
import { needsTranslation } from "./aliases";

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

const SYSTEM = `You are the drafting layer behind IP-SAKTI Sahayak, an Indian government (Ministry of Ayush) assistant for Ayurveda IP and regulatory questions.
Rules, no exceptions:
1. Use ONLY the numbered passages given to you. Do not use outside knowledge, do not guess section numbers, dates, percentages or figures that are not literally present in a passage.
2. Every point you write must carry the ids of the passages (e.g. ["S1","S3"]) that fully support it. If no passage supports a point, do not write it.
3. If the passages do not answer the question, set insufficientEvidence=true and keep points minimal or empty. Do not pad with generic statements.
4. Write for a founder/practitioner, not a lawyer: plain language, no legalese, but keep any section number, percentage, date or amount EXACTLY as it appears in the passage.
5. Never say a statement is "the law" if the passage is itself labelled as a curated summary, a note, or a reference list - say "generally" or attribute it, and prefer citing a primary passage when both exist.
6. Output strict JSON only, matching the schema you were given. No markdown, no commentary.`;

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

async function draftForJurisdiction(question: string, hits: Hit[]): Promise<{ ans: JurisdictionAnswer; refs: SourceRef[] } | null> {
  if (hits.length === 0) return null;
  const idOf = new Map<string, string>();
  hits.forEach((h, i) => idOf.set(h.chunk.id, `S${i + 1}`));
  const refs = hits.map((h) => mkSourceRef(idOf.get(h.chunk.id)!, h));
  const jurisdiction = hits[0].doc.jurisdiction;

  if (!hasGemini()) {
    // Retrieval-only mode: show the passages themselves as the "answer".
    return {
      ans: {
        jurisdiction,
        summary: "AI summarisation is off (no API key configured). Showing the most relevant passages directly.",
        points: [],
        withheld: 0,
        passages: refs.map((r) => r.id),
      },
      refs,
    };
  }

  let raw: AiOut;
  try {
    raw = await geminiJSON<AiOut>(SYSTEM, buildPrompt(question, hits, idOf, jurisdiction), { temperature: 0.1 });
  } catch (e) {
    const msg = e instanceof GeminiError ? e.message : "unknown error";
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

function scoreConfidence(hits: Hit[], answers: JurisdictionAnswer[], geminiOk: boolean): Confidence {
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
  if (!geminiOk) score = Math.min(score, 0.55);
  if (totalWithheld > 0 && totalPoints === 0) score = Math.min(score, 0.3);
  else if (totalWithheld > 0) score -= 0.08 * totalWithheld;
  score = Math.max(0.02, Math.min(0.97, score));

  reasons.push(`${Math.round(avgCoverage * 100)}% of your query's key terms were matched in the cited passages.`);
  reasons.push(`${Math.round(primaryShare * 100)}% of the cited passages are primary legal text (Act/Rules/Regulations/Gazette), not commentary.`);
  if (totalWithheld > 0) reasons.push(`${totalWithheld} drafted statement(s) were dropped because they were not literally supported by the cited passages.`);
  if (!geminiOk) reasons.push("AI summarisation was unavailable, so this reflects retrieval only.");

  const level: Confidence["level"] = score >= 0.66 ? "high" : score >= 0.4 ? "medium" : "low";
  return { score: Math.round(score * 100) / 100, level, reasons };
}

export async function answerQuestion(req: ChatRequest): Promise<ChatResponse> {
  const requestId = randomUUID();
  const notices: string[] = [];

  let englishQuery = req.question;
  let usedMT = false;
  if (req.language !== "en" || needsTranslation(req.question)) {
    const r = await translateToEnglish(req.question, req.language);
    englishQuery = r.text;
    usedMT = r.usedMT;
    if (req.language !== "en" && !usedMT) notices.push("Automatic translation is not configured (Bhashini keys missing); matched using bilingual term mapping instead of full machine translation.");
  }

  const jurisdictions = jurisdictionsFor(req.jurisdiction);
  const category = req.category ? CATEGORIES.find((c) => c.id === req.category) : undefined;
  const augmented = category ? `${englishQuery}\n\nProduct category context: ${category.label} — ${category.gist}` : englishQuery;

  const answers: JurisdictionAnswer[] = [];
  const sources: Record<string, SourceRef> = {};
  let allHits: Hit[] = [];
  let geminiOk = hasGemini();

  for (const j of jurisdictions) {
    const hits = search(augmented, { jurisdiction: j, k: 7, category: req.category || null });
    allHits = allHits.concat(hits);
    const d = await draftForJurisdiction(englishQuery, hits);
    if (d) {
      answers.push(d.ans);
      for (const r of d.refs) sources[r.id] = r;
      if (d.ans.summary.startsWith("AI summarisation failed")) geminiOk = false;
    }
  }

  const confidence = scoreConfidence(allHits, answers, geminiOk);
  const totalContent = answers.reduce((a, x) => a + x.points.length + (x.passages?.length || 0), 0);
  let mode: ChatResponse["mode"] = hasGemini() ? "ai" : "retrieval";
  if (totalContent === 0 || confidence.level === "low") mode = "abstain";

  if (req.language !== "en") {
    for (const a of answers) {
      const t = await translateFromEnglish(a.summary, req.language);
      a.summary = t.text;
      for (const p of a.points) p.text = (await translateFromEnglish(p.text, req.language)).text;
    }
  }

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
