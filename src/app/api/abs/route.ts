import { NextRequest, NextResponse } from "next/server";
import { assessABS, type AbsInput } from "@/lib/abs";
import { CHUNK_BY_ID, DOC_BY_ID } from "@/lib/retrieval";
import anchors from "../../../../data/anchors.json";

export const runtime = "nodejs";

type Anchors = Record<string, { docId: string; chunkId: string | null; page: number | null; verified: boolean }>;
const A = anchors as Anchors;

export async function POST(req: NextRequest) {
  let body: Partial<AbsInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.actorType || !body.activity) {
    return NextResponse.json({ error: "actorType and activity are required." }, { status: 400 });
  }
  const result = assessABS({
    actorType: body.actorType,
    activity: body.activity,
    usesCodifiedTK: Boolean(body.usesCodifiedTK),
    species: body.species,
  });
  const citations = result.anchors
    .map((k) => A[k])
    .filter((a): a is Anchors[string] => Boolean(a && a.verified && a.chunkId))
    .map((a) => {
      const chunk = CHUNK_BY_ID[a.chunkId!];
      const doc = DOC_BY_ID[a.docId];
      return chunk && doc ? { title: doc.short, page: chunk.page, section: chunk.section, excerpt: chunk.text.slice(0, 320) } : null;
    })
    .filter(Boolean);
  return NextResponse.json({ ...result, citations });
}
