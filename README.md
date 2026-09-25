# IP-SAKTI Sahayak

A multilingual, source-cited assistant for Intellectual Property and regulatory guidance in
Ayurveda, across national and international regimes. Built for **Smart India Hackathon,
problem statement SIH26045 (Ministry of Ayush)**.

Next.js 14 (App Router) + TypeScript + Tailwind. No vector database, no paid services required
to run: retrieval is a from-scratch BM25-style search over a corpus built from the PDFs you
provide, so the whole thing runs free, offline-capable except for the optional AI/translation calls.

## What's actually done

- **Real ingestion pipeline** (`scripts/ingest.py`): extracts text from the 19 PDFs in
  `dataset/`, OCRs the one scanned gazette, strips bilingual Hindi noise from gazette pages,
  chunks by paragraph with page + section metadata, and **corrects the mislabelled files** the
  original prototype had (e.g. one file named "PPV&FR Regulations" is actually the Trade Marks
  Act; another named for Patents Rules is actually the GI Act — both are now labelled correctly).
- **35/35 legal anchors verified**: every specific claim the app can make (a section number, a
  percentage, a date) is checked at build time against the literal cited text. If a claim can't
  be found, ingestion reports it as unverified rather than silently trusting it.
- **Citation-grounded answers**: the model only sees retrieved passages, must cite every
  sentence, and each drafted sentence is re-checked against its cited passage (numbers, section
  refs, dates, percentages) before being shown. Unsupported sentences are dropped, not shown.
- **Jurisdiction toggle** (India / International / Both) that keeps the two answer sets visibly
  separate, never blended — exactly as the problem statement asks.
- **Formulation-classification flow**: 5 questions -> one of 6 categories (classical,
  proprietary, new drug, phytopharmaceutical, nutraceutical/Ayurveda-Aahar, cosmetic), each with
  its own IP posture and regulatory route.
- **ABS-compliance helper**: encodes the actual decision logic of the Biological Diversity
  (Amendment) Act 2023 (sections 3, 4, 6, 7) and the NBA ABS Regulations 2025 — who needs prior
  approval vs registration vs intimation vs is exempt, with citations.
- **Real confidence indicator**: computed from term coverage, share of primary-vs-commentary
  sources, and how many drafted statements were dropped for lacking support — not a hardcoded
  number.
- **Genuine abstention**: low-confidence / out-of-corpus questions get an explicit "not clearly
  answered" response and an escalate-to-human button, instead of a guess.
- **Multilingual routing**: a herb/legal-term alias dictionary (Hindi + Hinglish + botanical
  names) plus optional Bhashini machine translation; works in "alias-only" mode with zero
  external services, degrades gracefully and says so if Bhashini isn't configured.
- **Escalation, audit log, PII redaction, rate limiting** on the API.
- **Knowledge graph** of how the source documents relate (amends / implements / supersedes),
  rendered client-side with d3-force — on the Corpus & Sources page.
- **37/37 automated checks pass**: `npm run eval` (retrieval accuracy, abstention correctness,
  citation groundedness, multilingual routing, classifier logic, ABS logic) — all against the
  real corpus and real logic, no mocks.
- Premium, accessible UI: warm "palm-leaf ledger" design system, dark mode, safe-area aware,
  keyboard accessible, works down to a narrow phone viewport.

## What's still a placeholder / needs your input to finish

1. **Trade Marks Act, Designs Act, GI Act, Copyright**: three of these four are indexed (TM,
   Designs, GI). **Copyright Act is not indexed** — no PDF for it was in the dataset you gave me;
   the app is honest about this (it won't fabricate a Copyright Act citation) but you should add
   the Act text if judges are likely to probe copyright questions.
2. **AI drafting requires a free Gemini key.** Without `GEMINI_API_KEY` in `.env.local`, the app
   runs in "retrieval mode": it shows you the exact statute passages instead of a generated
   summary. This is a deliberate, safe fallback — not a bug — but for the demo you'll want a key
   in so the assistant actually drafts prose. Get one free at https://aistudio.google.com/
3. **Bhashini isn't wired to real credentials.** The translation client
   (`src/lib/translate.ts`) is written and will work the moment you add
   `BHASHINI_UDYAT_KEY` / `BHASHINI_PIPELINE_ID` (free, register at bhashini.gov.in). Until then,
   non-English queries route through the built-in alias dictionary only (works for common
   patterns; won't handle arbitrary free-form Hindi sentences as well as real MT would).
4. **International corpus is curated summaries, not treaty text** (`data/curated_intl.json`), each
   with a `verifyUrl`. This was a deliberate scope decision given the time available — TRIPS,
   CBD, Nagoya, PCT etc. full texts were not in your dataset. The app labels these clearly as
   "curated summary" (lower tier than primary law) everywhere they're shown.
5. **The knowledge graph** covers document-to-document relationships (amends/implements/etc.),
   which is the "relational knowledge graph" the problem statement's Stage 2 asks for. Full
   **agentic multi-step reasoning** (Stage 2's other half) and **paid-source connectors**
   (Stage 3) are intentionally not built — the problem statement itself describes these as later
   stages after an MVP.
6. **Escalation just opens a `mailto:` link** — there's no ticketing backend. Fine for a
   hackathon demo; set `ESCALATION_EMAIL` in `.env.local`.
7. **Audit log is a local JSONL file** (`data/audit.jsonl`), not a production datastore — correct
   for a prototype, not for real deployment.

None of the above are bugs — they're the explicit boundary of what an MVP submission needs, and
the app is honest about each one in its own UI (About page, notices, disclaimers) rather than
pretending they're solved.

## Quick start

```bash
npm install
python3 scripts/ingest.py        # builds data/corpus.json from dataset/*.pdf (~20s, already done — data/ is pre-built and committed)
npm run smoke                    # sanity check the data files
npm run eval                     # full evaluation suite (37 checks)
cp .env.example .env.local       # add your free Gemini key to enable AI drafting
npm run dev                      # http://localhost:3000
```

To rebuild the corpus from scratch, put the 19 source PDFs in `dataset/` (see
`scripts/ingest.py` for the exact expected filenames) and re-run the ingest script. Requires
`poppler-utils` (pdftotext, pdftoppm) and `tesseract-ocr` (for the one scanned document).

## Deploying (free)

Any Node host works (Vercel free tier, Render free tier, Railway). Set the environment variables
from `.env.example`. No database needed — the corpus ships as static JSON in `data/`.

## Project structure

```
scripts/ingest.py       PDF -> corpus.json / docs.json / anchors.json
data/                   Pre-built corpus (2,024 chunks, 20 documents, 35 verified anchors)
src/lib/
  retrieval.ts          BM25-style search + keyword routing + coverage scoring
  classifier.ts         Formulation-classification decision tree
  abs.ts                Biological Diversity Act / ABS Regulations decision logic
  compose.ts            RAG orchestration: retrieve -> draft -> verify -> confidence
  guard.ts               Citation groundedness checker (numbers/sections/dates must match)
  gemini.ts / translate.ts   Free-tier AI + MT clients, both optional
src/app/api/            chat, classify, abs, escalate, health, source
src/app/(app)/          chat, classify, abs, sources, about pages
scripts/eval.ts         37-check evaluation harness (run with `npm run eval`)
```

## Security note

The uploaded prototype's `.env` files contained a live Gemini API key. **That key should be
considered compromised — rotate it in Google AI Studio before using this project.** This rebuild
never hardcodes any key; `.env.local` is gitignored.
