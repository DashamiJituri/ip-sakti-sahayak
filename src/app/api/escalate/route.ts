import { NextRequest, NextResponse } from "next/server";
import { saveEscalation, hash } from "@/lib/audit";
import { redactPII } from "@/lib/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { question?: string; context?: string; contact?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question = (body.question || "").toString().slice(0, 2000);
  if (!question.trim()) return NextResponse.json({ error: "question is required." }, { status: 400 });
  const { text: cleanQ } = redactPII(question);
  const { text: cleanContext } = redactPII((body.context || "").toString().slice(0, 4000));
  const id = hash(cleanQ + Date.now());
  await saveEscalation({ id, ts: new Date().toISOString(), question: cleanQ, context: cleanContext, contact: body.contact ? "[provided]" : "[none]" });

  const to = process.env.ESCALATION_EMAIL || "ipfacilitator@example.org";
  const subject = encodeURIComponent(`IP-SAKTI escalation ${id}`);
  const bodyText = encodeURIComponent(`Case ${id}\n\nQuestion:\n${cleanQ}\n\nContext:\n${cleanContext}\n`);
  const mailto = `mailto:${to}?subject=${subject}&body=${bodyText}`;
  return NextResponse.json({ id, mailto });
}
