import { NextResponse } from "next/server";
import { corpusSize, allDocs } from "@/lib/retrieval";
import { hasGroq } from "@/lib/groq";
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
    aiConfigured: hasGroq(),
    time: new Date().toISOString(),
  });
}
