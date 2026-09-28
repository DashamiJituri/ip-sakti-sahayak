import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES, QUESTIONS, classify, type ClassifyAnswer } from "@/lib/classifier";
import { ALL_LANGS, TRANSLATION_UNAVAILABLE_NOTICE, translateFields } from "@/lib/translate";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ questions: QUESTIONS, categories: CATEGORIES });
}

export async function POST(req: NextRequest) {
  let body: { answers?: ClassifyAnswer[]; language?: Lang };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const answers = body.answers || [];
  if (answers.length < QUESTIONS.length) {
    return NextResponse.json({ error: `Please answer all ${QUESTIONS.length} questions.` }, { status: 400 });
  }
  const language: Lang = ALL_LANGS.includes(body.language as Lang) ? (body.language as Lang) : "en";

  const result = classify(answers);
  const category = CATEGORIES.find((c) => c.id === result.categoryId)!;

  // BUG FIX: this used to always return `category`/`reasoning` in English, even
  // when the user had switched the UI to Hindi/Marathi/etc. — the selected
  // language never reached this route at all. Now the same language the page
  // chrome is showing is used to translate the actual classification result too.
  const { translated, ok } = await translateFields(language, {
    label: category.label,
    gist: category.gist,
    ipPosture: category.ipPosture,
    regulatory: category.regulatory,
    reasoning: result.reasoning,
  });

  return NextResponse.json({
    ...result,
    reasoning: translated.reasoning,
    category: { ...category, label: translated.label, gist: translated.gist, ipPosture: translated.ipPosture, regulatory: translated.regulatory },
    language,
    notice: language !== "en" && !ok ? TRANSLATION_UNAVAILABLE_NOTICE[language] : undefined,
  });
}
