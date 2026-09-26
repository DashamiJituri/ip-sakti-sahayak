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
  const subject = `IP-SAKTI escalation ${id}`;
  const bodyText = `Case ${id}\n\nQuestion:\n${cleanQ}\n\nContext:\n${cleanContext}\n`;
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  // Plain (non-encoded) fields are returned too so the UI can show/copy the
  // message even on a machine with no default email client registered -
  // a bare mailto: link silently does nothing in that case, so the frontend
  // needs the raw text to fall back to a "copy this" panel.
  return NextResponse.json({ id, mailto, to, subject, body: bodyText });
}
