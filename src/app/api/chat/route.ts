import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/compose";
import { redactPII } from "@/lib/guard";
import { audit, hash } from "@/lib/audit";
import type { ChatRequest, Jurisdiction, Lang } from "@/lib/types";

export const runtime = "nodejs";

const JURIS: Jurisdiction[] = ["india", "international", "both"];
const LANGS: Lang[] = ["en", "hi", "mr", "ta", "te", "kn", "ml"];

const buckets = new Map<string, { n: number; ts: number }>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.ts > 60_000) {
    buckets.set(key, { n: 1, ts: now });
    return false;
  }
  b.n++;
  return b.n > 20;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }
  let body: Partial<ChatRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question = (body.question || "").toString().trim();
  if (!question) return NextResponse.json({ error: "question is required." }, { status: 400 });
  if (question.length > 2000) return NextResponse.json({ error: "Question is too long (max 2000 characters)." }, { status: 400 });

  const jurisdiction: Jurisdiction = JURIS.includes(body.jurisdiction as Jurisdiction) ? (body.jurisdiction as Jurisdiction) : "india";
  const language: Lang = LANGS.includes(body.language as Lang) ? (body.language as Lang) : "en";
  const { text: cleanQuestion, redacted } = redactPII(question);

  try {
    const result = await answerQuestion({
      question: cleanQuestion,
      jurisdiction,
      language,
      category: body.category ?? null,
      sessionId: body.sessionId,
    });
    await audit("chat", {
      requestId: result.requestId,
      qHash: hash(cleanQuestion),
      qLen: cleanQuestion.length,
      jurisdiction,
      language,
      category: body.category ?? null,
      mode: result.mode,
      confidence: result.confidence.score,
      sourcesCount: Object.keys(result.sources).length,
      piiRedacted: redacted,
      text: process.env.AUDIT_STORE_TEXT === "1" ? cleanQuestion : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    await audit("chat_error", { error: e instanceof Error ? e.message : "unknown" });
    return NextResponse.json({ error: "Something went wrong answering this question. Please try again." }, { status: 500 });
  }
}
