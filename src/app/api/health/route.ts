import { NextResponse } from "next/server";
import { corpusSize, allDocs } from "@/lib/retrieval";
import { hasGemini } from "@/lib/gemini";
import anchors from "../../../../data/anchors.json";

export const runtime = "nodejs";

export async function GET() {
  const docs = allDocs();
  const anchorVals = Object.values(anchors as Record<string, { verified: boolean }>);
  return NextResponse.json({
    ok: true,
    corpusChunks: corpusSize(),
    documents: docs.length,
    primaryDocuments: docs.filter((d) => d.tier === "primary").length,
    anchorsTotal: anchorVals.length,
    anchorsVerified: anchorVals.filter((a) => a.verified).length,
    geminiConfigured: hasGemini(),
    bhashiniConfigured: Boolean(process.env.BHASHINI_UDYAT_KEY && process.env.BHASHINI_PIPELINE_ID),
    time: new Date().toISOString(),
  });
}
