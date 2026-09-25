// Privacy + verification guardrails.
export interface Redaction {
  text: string;
  redacted: string[];
}

const PATTERNS: [string, RegExp, string][] = [
  ["email address", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  ["Aadhaar number", /\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[id-number]"],
  ["PAN", /\b[A-Z]{5}\d{4}[A-Z]\b/g, "[pan]"],
  ["phone number", /(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/g, "[phone]"],
];

export function redactPII(input: string): Redaction {
  let text = input;
  const found: string[] = [];
  for (const [label, rx, rep] of PATTERNS) {
    if (rx.test(text)) {
      found.push(label);
      text = text.replace(rx, rep);
    }
    rx.lastIndex = 0;
  }
  return { text, redacted: found };
}

const NUMWORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  fifteen: "15", twenty: "20", thirty: "30", "twenty-five": "25", "twenty five": "25", ninety: "90", sixty: "60",
};

export function normForCheck(s: string): string {
  let t = s.toLowerCase().replace(/[“”"']/g, "").replace(/\s+/g, " ");
  t = t.replace(/\b(twenty[- ]five|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|sixty|ninety)\b/g, (m) => NUMWORDS[m] || m);
  t = t.replace(/per\s?cent\.?/g, "%").replace(/percent\.?/g, "%").replace(/\s%/g, "%");
  t = t.replace(/\b(\d+[a-z]?)\s*\(\s*([a-z0-9]{1,3})\s*\)/g, "$1($2)");
  return t;
}

// Legal tokens that must appear in the cited text: section refs, percentages, years, amounts, day/year spans.
export function legalTokens(s: string): string[] {
  const t = normForCheck(s);
  const out = new Set<string>();
  for (const m of t.matchAll(/\b\d{1,3}[a-z]?\([a-z0-9]{1,3}\)/g)) out.add(m[0]);
  for (const m of t.matchAll(/\b\d+(?:\.\d+)?%/g)) out.add(m[0]);
  for (const m of t.matchAll(/\b(?:19|20)\d{2}\b/g)) out.add(m[0]);
  for (const m of t.matchAll(/\b\d+\s?(?:crore|lakh|days|years|months)\b/g)) out.add(m[0].replace(/\s+/g, " "));
  return [...out];
}

export function pointIsSupported(pointText: string, citedTexts: string[]): boolean {
  const toks = legalTokens(pointText);
  if (toks.length === 0) return true;
  const hay = normForCheck(citedTexts.join(" "));
  return toks.every((tk) => hay.includes(tk) || hay.includes(tk.replace(/\s/g, "")));
}
