import { NextRequest, NextResponse } from "next/server";
import { CHUNK_BY_ID, DOC_BY_ID } from "@/lib/retrieval";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("chunkId") || "";
  const chunk = CHUNK_BY_ID[id];
  if (!chunk) return NextResponse.json({ error: "not found" }, { status: 404 });
  const doc = DOC_BY_ID[chunk.docId];
  return NextResponse.json({ chunk, doc });
}
