/* Evaluation harness: retrieval accuracy, citation groundedness (structural), abstention, multilingual routing.
   Runs against the corpus + guard logic directly (no server/API key needed), so it always runs in CI/free tiers.
   Usage: npm run eval
*/
import { search, unionMatchedTerms, STRONG_DOMAIN_TERMS } from "../src/lib/retrieval";
import { legalTokens, pointIsSupported } from "../src/lib/guard";
import { needsTranslation, expandQuery } from "../src/lib/aliases";
import { classify } from "../src/lib/classifier";
import { assessABS } from "../src/lib/abs";

interface Case {
  id: string;
  q: string;
  jurisdiction: "india" | "international";
  expectDocIds: string[]; // pass if at least one hit's docId is in this list, within top N
  topN?: number;
  note: string;
}

const CASES: Case[] = [
  { id: "E1", q: "Can a traditional Ayurvedic formulation based on known traditional knowledge be patented?", jurisdiction: "india", expectDocIds: ["patents_act_current"], note: "Section 3(p) TK bar" },
  { id: "E2", q: "Is mere discovery of a new form of a known substance patentable?", jurisdiction: "india", expectDocIds: ["patents_act_current"], note: "Section 3(d)" },
  { id: "E3", q: "What is a patent or proprietary medicine under the Drugs and Cosmetics Act?", jurisdiction: "india", expectDocIds: ["dc_act_1940"], note: "proprietary medicine definition" },
  { id: "E4", q: "What is the definition of cosmetic under Indian law?", jurisdiction: "india", expectDocIds: ["dc_act_1940"], note: "cosmetic definition" },
  { id: "E5", q: "What is codified traditional knowledge under the Biological Diversity Act?", jurisdiction: "india", expectDocIds: ["bd_amend_act_2023"], note: "codified TK definition" },
  { id: "E6", q: "Do vaids and registered AYUSH practitioners need prior intimation to use local biological resources?", jurisdiction: "india", expectDocIds: ["bd_amend_act_2023"], note: "s.7 exemption" },
  { id: "E7", q: "Does a foreign company need NBA approval before filing a patent based on an Indian biological resource?", jurisdiction: "india", expectDocIds: ["bd_amend_act_2023", "bd_act_2002"], note: "s.6 prior approval" },
  { id: "E8", q: "When was the Biological Diversity Amendment Act 2023 brought into force?", jurisdiction: "india", expectDocIds: ["bd_amend_commencement"], note: "commencement notification" },
  { id: "E9", q: "How is benefit-sharing calculated under the NBA ABS Regulations 2025?", jurisdiction: "india", expectDocIds: ["nba_abs_regs_2025"], note: "revenue slab table" },
  { id: "E10", q: "What is the term of a trade mark registration in India?", jurisdiction: "india", expectDocIds: ["tm_act_1999", "tm_amend_2010"], note: "10 year TM term (base Act or 2010 amendment, both are primary text)" },
  { id: "E11", q: "What is the term of a design registration in India?", jurisdiction: "india", expectDocIds: ["designs_act_2000"], note: "10 year design term" },
  { id: "E12", q: "What is a geographical indication under Indian law?", jurisdiction: "india", expectDocIds: ["gi_act_1999"], note: "GI definition" },
  {
    id: "E13",
    q: "haldi patent kyun nahi milta prior knowledge ki wajah se",
    jurisdiction: "india",
    expectDocIds: ["patents_act_current", "bd_amend_act_2023", "bd_act_2002"],
    note: "Hinglish turmeric/TK query (patent bar + BD Act prior-approval both legitimately relevant)",
  },
  {
    id: "E14",
    q: "नीम पर पेटेंट क्यों नहीं मिल सकता पारंपरिक ज्ञान के कारण",
    jurisdiction: "india",
    expectDocIds: ["patents_act_current", "bd_amend_act_2023", "bd_act_2002"],
    note: "Hindi neem/TK query (patent bar + BD Act prior-approval both legitimately relevant)",
  },
  { id: "E15", q: "What does the Nagoya Protocol require for benefit-sharing?", jurisdiction: "international", expectDocIds: ["curated_intl"], note: "Nagoya Protocol summary" },
  { id: "E16", q: "Has the WIPO GRATK treaty on genetic resources and traditional knowledge entered into force?", jurisdiction: "international", expectDocIds: ["curated_intl"], note: "GRATK status" },
  { id: "E17", q: "What did the TKDL access agreements with EPO and USPTO allow?", jurisdiction: "international", expectDocIds: ["curated_intl"], note: "TKDL access agreements" },
  { id: "E18", q: "How does the Madrid System help register a trade mark internationally?", jurisdiction: "international", expectDocIds: ["curated_intl"], note: "Madrid system" },
];

// Out-of-corpus: retrieval should return low coverage (used for abstention), not a confident match.
const OOC_CASES: { id: string; q: string; jurisdiction: "india" | "international" }[] = [
  { id: "OOC1", q: "What is the capital of France?", jurisdiction: "india" },
  { id: "OOC2", q: "How do I train a neural network to classify cats and dogs?", jurisdiction: "india" },
  { id: "OOC3", q: "What is the offside rule in football?", jurisdiction: "international" },
];

// Should NOT abstain even though only one English term survives alias-mapping — it's a strong legal term.
const SHOULD_ANSWER_CASES: { id: string; q: string; jurisdiction: "india" | "international" }[] = [
  { id: "SA1", q: "नीम पर पेटेंट क्यों नहीं मिल सकता", jurisdiction: "india" },
  { id: "SA2", q: "haldi ka patent kyun reject hota hai", jurisdiction: "india" },
];

function run() {
  let pass = 0;
  const fails: string[] = [];
  console.log("== Retrieval accuracy ==");
  for (const c of CASES) {
    const hits = search(c.q, { jurisdiction: c.jurisdiction, k: c.topN ?? 6 });
    const ok = hits.some((h) => c.expectDocIds.includes(h.doc.id));
    console.log(`${ok ? "PASS" : "FAIL"} ${c.id.padEnd(5)} ${c.note.padEnd(38)} top-doc=${hits[0]?.doc.id ?? "none"}`);
    if (ok) pass++;
    else fails.push(c.id);
  }
  const retrievalScore = pass / CASES.length;
  console.log(`\nRetrieval: ${pass}/${CASES.length} (${(retrievalScore * 100).toFixed(0)}%)\n`);

  console.log("== Abstention (out-of-corpus) — mirrors compose.ts scoreConfidence ==");
  let abstainOk = 0;
  for (const c of OOC_CASES) {
    const hits = search(c.q, { jurisdiction: c.jurisdiction, k: 6 });
    const matched = unionMatchedTerms(hits);
    const hasStrong = matched.some((t) => STRONG_DOMAIN_TERMS.has(t));
    const avgCoverage = hits.length ? hits.reduce((a, h) => a + h.coverage, 0) / hits.length : 0;
    const wouldAbstain = hits.length === 0 || matched.length === 0 || (!hasStrong && (matched.length === 1 || avgCoverage < 0.5));
    console.log(`${wouldAbstain ? "PASS" : "FAIL"} ${c.id} matchedTerms=${JSON.stringify(matched)} hasStrong=${hasStrong} avgCoverage=${avgCoverage.toFixed(2)}`);
    if (wouldAbstain) abstainOk++;
  }
  console.log(`\nAbstention: ${abstainOk}/${OOC_CASES.length}\n`);

  console.log("== Should NOT abstain (single strong term via alias mapping, e.g. Hindi 'patent') ==");
  let shouldAnswerOk = 0;
  for (const c of SHOULD_ANSWER_CASES) {
    const hits = search(c.q, { jurisdiction: c.jurisdiction, k: 6 });
    const matched = unionMatchedTerms(hits);
    const hasStrong = matched.some((t) => STRONG_DOMAIN_TERMS.has(t));
    const avgCoverage = hits.length ? hits.reduce((a, h) => a + h.coverage, 0) / hits.length : 0;
    const wouldAbstain = hits.length === 0 || matched.length === 0 || (!hasStrong && (matched.length === 1 || avgCoverage < 0.5));
    console.log(`${!wouldAbstain ? "PASS" : "FAIL"} ${c.id} matchedTerms=${JSON.stringify(matched)} hasStrong=${hasStrong} topDoc=${hits[0]?.doc.id}`);
    if (!wouldAbstain) shouldAnswerOk++;
  }
  console.log(`\nShould-answer: ${shouldAnswerOk}/${SHOULD_ANSWER_CASES.length}\n`);

  console.log("== Citation groundedness (guard.pointIsSupported) ==");
  const groundCases: { text: string; cited: string; expect: boolean }[] = [
    { text: "The patent term is 20 years from the filing date.", cited: "The term of every patent granted, shall be twenty years from the date of filing.", expect: true },
    { text: "The patent term is 14 years from the filing date.", cited: "The term of every patent granted, shall be twenty years from the date of filing.", expect: false },
    { text: "Section 3(d) excludes mere discovery of a new form of a known substance.", cited: "the mere discovery of a new form of a known substance which does not result in the enhancement of the known efficacy of that substance... 3(d)", expect: true },
  ];
  let groundPass = 0;
  for (const g of groundCases) {
    const ok = pointIsSupported(g.text, [g.cited]) === g.expect;
    console.log(`${ok ? "PASS" : "FAIL"} tokens=${JSON.stringify(legalTokens(g.text))}`);
    if (ok) groundPass++;
  }
  console.log(`\nGroundedness: ${groundPass}/${groundCases.length}\n`);

  console.log("== Multilingual routing (needsTranslation / expandQuery) ==");
  const mlCases = [
    { q: "haldi patent kyun nahi milta", expect: true },
    { q: "नीम पर पेटेंट", expect: true },
    { q: "Can I patent turmeric?", expect: false },
  ];
  let mlPass = 0;
  for (const m of mlCases) {
    const ok = needsTranslation(m.q) === m.expect;
    const { herbs } = expandQuery(m.q);
    console.log(`${ok ? "PASS" : "FAIL"} "${m.q}" needsTranslation=${needsTranslation(m.q)} herbs=${herbs.map((h) => h.botanical).join(",")}`);
    if (ok) mlPass++;
  }
  console.log(`\nMultilingual routing: ${mlPass}/${mlCases.length}\n`);

  console.log("== Formulation classifier sanity ==");
  const classifyCases: { answers: { questionId: string; value: string }[]; expect: string }[] = [
    {
      expect: "cosmetic",
      answers: [
        { questionId: "text_match", value: "no_modified" },
        { questionId: "intent", value: "cleanse_beautify_appearance" },
        { questionId: "form", value: "no_whole_herb_or_mix" },
        { questionId: "evidence", value: "not_sure" },
        { questionId: "tk_bio", value: "no" },
      ],
    },
    {
      expect: "classical",
      answers: [
        { questionId: "text_match", value: "yes_exact" },
        { questionId: "intent", value: "treat_disease" },
        { questionId: "form", value: "no_whole_herb_or_mix" },
        { questionId: "evidence", value: "relying_on_classical_text_only" },
        { questionId: "tk_bio", value: "yes" },
      ],
    },
    {
      expect: "phytopharmaceutical",
      answers: [
        { questionId: "text_match", value: "no_modified" },
        { questionId: "intent", value: "treat_disease" },
        { questionId: "form", value: "yes_standardised_extract" },
        { questionId: "evidence", value: "yes_new_data" },
        { questionId: "tk_bio", value: "yes" },
      ],
    },
  ];
  let classPass = 0;
  for (const c of classifyCases) {
    const r = classify(c.answers);
    const ok = r.categoryId === c.expect;
    console.log(`${ok ? "PASS" : "FAIL"} expected=${c.expect} got=${r.categoryId}`);
    if (ok) classPass++;
  }
  console.log(`\nClassifier: ${classPass}/${classifyCases.length}\n`);

  console.log("== ABS helper sanity ==");
  const absCases: { input: Parameters<typeof assessABS>[0]; expect: string }[] = [
    { input: { actorType: "foreign_controlled_or_foreign_company", activity: "patent_or_ip_application", usesCodifiedTK: false }, expect: "prior_approval_s6_1" },
    { input: { actorType: "indian_citizen_or_company", activity: "patent_or_ip_application", usesCodifiedTK: false }, expect: "registration_s6_1a" },
    { input: { actorType: "ayush_practitioner_registered", activity: "research_only", usesCodifiedTK: false }, expect: "exempt_s7" },
    { input: { actorType: "cultivator_grower", activity: "cultivated_material_only", usesCodifiedTK: false }, expect: "certificate_of_origin" },
  ];
  let absPass = 0;
  for (const a of absCases) {
    const r = assessABS(a.input);
    const ok = r.requirement === a.expect;
    console.log(`${ok ? "PASS" : "FAIL"} expected=${a.expect} got=${r.requirement}`);
    if (ok) absPass++;
  }
  console.log(`\nABS helper: ${absPass}/${absCases.length}\n`);

  const overall = {
    retrieval: `${pass}/${CASES.length}`,
    abstention: `${abstainOk}/${OOC_CASES.length}`,
    shouldAnswer: `${shouldAnswerOk}/${SHOULD_ANSWER_CASES.length}`,
    groundedness: `${groundPass}/${groundCases.length}`,
    multilingual: `${mlPass}/${mlCases.length}`,
    classifier: `${classPass}/${classifyCases.length}`,
    abs: `${absPass}/${absCases.length}`,
  };
  console.log("== SUMMARY ==");
  console.log(JSON.stringify(overall, null, 2));
  if (fails.length) console.log("Failed retrieval cases:", fails.join(", "));

  const failed = pass < CASES.length * 0.7 || abstainOk < OOC_CASES.length || shouldAnswerOk < SHOULD_ANSWER_CASES.length || groundPass < groundCases.length;
  process.exit(failed ? 1 : 0);
}

run();
