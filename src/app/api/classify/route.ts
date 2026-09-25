import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES, QUESTIONS, classify, type ClassifyAnswer } from "@/lib/classifier";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ questions: QUESTIONS, categories: CATEGORIES });
}

export async function POST(req: NextRequest) {
  let body: { answers?: ClassifyAnswer[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const answers = body.answers || [];
  if (answers.length < QUESTIONS.length) {
    return NextResponse.json({ error: `Please answer all ${QUESTIONS.length} questions.` }, { status: 400 });
  }
  const result = classify(answers);
  const category = CATEGORIES.find((c) => c.id === result.categoryId)!;
  return NextResponse.json({ ...result, category });
}
