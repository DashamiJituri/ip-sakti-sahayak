import { createHash } from "crypto";
import { appendFile, mkdir } from "fs/promises";
import path from "path";

const DIR = path.join(process.cwd(), "data");

export function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Append-only audit log. Stores hashes + metadata; question text only if AUDIT_STORE_TEXT=1 (already PII-redacted). */
export async function audit(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true });
    const row = { ts: new Date().toISOString(), event, ...data };
    await appendFile(path.join(DIR, "audit.jsonl"), JSON.stringify(row) + "\n");
  } catch {
    // read-only filesystem (some hosts): audit is best-effort and never blocks the user
  }
}

export async function saveEscalation(row: Record<string, unknown>): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true });
    await appendFile(path.join(DIR, "escalations.jsonl"), JSON.stringify(row) + "\n");
  } catch {
    /* best effort */
  }
}
