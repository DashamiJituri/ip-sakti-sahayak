export type Jurisdiction = "india" | "international" | "both";
export type Lang = "en" | "hi" | "mr" | "ta" | "te" | "kn" | "ml";

export interface Chunk {
  id: string;
  docId: string;
  page: number | null;
  section: string | null;
  text: string;
  verifyUrl?: string;
}

export interface DocMeta {
  id: string;
  title: string;
  short: string;
  kind: string;
  status: "current" | "amended" | "superseded" | "reference" | "curated";
  tier: "primary" | "note" | "reference" | "curated";
  note: string;
  jurisdiction: "india" | "international";
  pages: number;
  chunks: number;
}

export interface SourceRef {
  id: string; // S1, S2 ...
  chunkId: string;
  docId: string;
  title: string;
  short: string;
  page: number | null;
  section: string | null;
  status: DocMeta["status"];
  tier: DocMeta["tier"];
  jurisdiction: "india" | "international";
  excerpt: string;
  verifyUrl?: string;
  note?: string;
}

export interface AnswerPoint {
  text: string;
  sources: string[];
}

export interface JurisdictionAnswer {
  jurisdiction: "india" | "international";
  summary: string;
  points: AnswerPoint[];
  withheld: number; // statements dropped because they could not be verified against the cited text
  passages?: string[]; // retrieval-mode: chunk source ids shown instead of an AI summary
}

export interface Confidence {
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
}

export interface ChatRequest {
  question: string;
  jurisdiction: Jurisdiction;
  language: Lang;
  category?: string | null; // formulation category from the classifier
  skipClarify?: boolean;
  sessionId?: string;
}

export interface ChatResponse {
  requestId: string;
  mode: "ai" | "retrieval" | "abstain" | "clarify";
  answers: JurisdictionAnswer[];
  sources: Record<string, SourceRef>;
  confidence: Confidence;
  clarifyingQuestion?: string;
  notices: string[];
  escalate: boolean;
  language: Lang;
  englishQuery?: string;
  officialLinks: { label: string; url: string }[];
  disclaimer: string;
}
