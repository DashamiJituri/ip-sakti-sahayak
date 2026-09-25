// Formulation-classification flow: minimum clarifying questions -> one of 6 categories,
// each with a different IP / ABS posture (per the PS description).
export interface Category {
  id: string;
  label: string;
  gist: string;
  ipPosture: string[];
  regulatory: string[];
  anchors: string[]; // anchor keys from data/anchors.json backing the posture claims
}

export const CATEGORIES: Category[] = [
  {
    id: "classical",
    label: "Classical / generic formulation",
    gist: "Formulation and method are drawn from a First-Schedule authoritative text of Ayurveda (e.g. a named Samhita or approved formulary), unchanged in composition.",
    ipPosture: [
      "Largely traditional knowledge already in the public domain: it normally fails novelty and squarely meets the Patents Act bar on TK-based inventions.",
      "TKDL exists to help patent offices recognise this prior art; it defends against others patenting it, it is not a right you hold.",
      "Trade mark protection is still available for your brand name/logo (not the formulation itself); GI may apply if tied to a specific region and community.",
    ],
    regulatory: [
      "Manufactured and sold under the classical-medicine route of the Drugs and Cosmetics Act (Chapter IVA) using an authoritative book reference; needs a manufacturing licence from the State Licensing Authority.",
    ],
    anchors: ["PA_3P", "DC_AUTH_BOOKS", "DC_CH4A"],
  },
  {
    id: "proprietary",
    label: "Patent / proprietary Ayurvedic medicine",
    gist: "A named, branded formulation not exactly matching a First-Schedule text, but based on recognised Ayurvedic principles (ingredients, ratios, or process are your own combination).",
    ipPosture: [
      "The exact combination, ratio or process may be patentable if it is genuinely new, involves an inventive step, and is not merely a discovery of a known substance's new form or a known admixture of known properties.",
      "A brand name is protectable as a trade mark; distinctive packaging/bottle shape may be protectable as a design.",
      "If biological material or associated traditional knowledge from India is used, the disclosure and Biological Diversity Act obligations below apply regardless of patentability.",
    ],
    regulatory: [
      "Licensed as a 'patent or proprietary medicine' under the Drugs and Cosmetics Act; needs approval of the formula/label by the licensing authority even without an authoritative-text reference.",
    ],
    anchors: ["PA_3D", "PA_3E", "DC_PROPRIETARY"],
  },
  {
    id: "new_drug",
    label: "New / non-classical Ayurvedic drug",
    gist: "A new formulation, extract, isolate or delivery form not recognised by any authoritative text, requiring fresh proof of safety and effectiveness.",
    ipPosture: [
      "Genuine patent potential: novelty and inventive step are more plausible here than for classical formulations, but you must still clear the exclusions (discovery of known substance, known admixture, plants/animals as such, TK-based claims).",
      "Clinical/pre-clinical data generated for regulatory approval can double as evidence of inventive step and industrial applicability in a patent specification.",
    ],
    regulatory: [
      "Treated as a new drug: needs permission and safety/effectiveness data under the Drugs and Cosmetics Act framework for new Ayurvedic drugs before marketing.",
    ],
    anchors: ["PA_3D", "PA_INVENTIVE", "DC_AUTH_BOOKS"],
  },
  {
    id: "phytopharmaceutical",
    label: "Phytopharmaceutical",
    gist: "A purified, standardised fraction/extract from a medicinal plant, defined chemically/biologically, presented with modern-style evidence (a distinct regulatory category, not a classical or proprietary Ayurvedic medicine).",
    ipPosture: [
      "Often the strongest patent case in this list: a standardised extract/fraction with a defined marker profile and demonstrated effect can clear novelty and inventive step more readily, provided the exclusions for plants/known substances are cleared.",
      "Still subject to the same TK and biological-material disclosure duties if traditional use informed the discovery.",
    ],
    regulatory: [
      "Approved under the phytopharmaceutical drug provisions of the Drugs and Cosmetics Rules, which sit alongside (not inside) the classical/proprietary Ayurveda route.",
    ],
    anchors: ["PA_3D", "PA_INVENTIVE"],
  },
  {
    id: "nutraceutical",
    label: "Ayurveda-Aahar / nutraceutical (food)",
    gist: "A food, dietary or nutraceutical product built on Ayurvedic ingredients/principles, not claiming to cure or treat disease.",
    ipPosture: [
      "No drug patent route for the food product itself as a medicine; process patents (extraction, formulation, stabilisation methods) remain possible if genuinely inventive.",
      "Trade mark and design protection apply normally to branding and packaging; GI may apply for region-linked ingredients.",
    ],
    regulatory: [
      "Falls under FSSAI's food regulations, including the Ayurveda-Aahar category, not the Drugs and Cosmetics Act; disease-treatment claims are not permitted on a food label.",
    ],
    anchors: [],
  },
  {
    id: "cosmetic",
    label: "Cosmetic",
    gist: "A product intended to be applied to the body for cleansing, beautifying or altering appearance, without a therapeutic claim.",
    ipPosture: [
      "No drug patent route as a medicine; formulation/process patents remain possible if inventive. Trade mark, design (container/packaging) and copyright (label artwork) apply normally.",
    ],
    regulatory: [
      "Regulated as a 'cosmetic' under the Drugs and Cosmetics Act's cosmetic provisions, a materially lighter regime than the drug provisions; therapeutic claims would reclassify it as a drug.",
    ],
    anchors: ["DC_COSMETIC"],
  },
];

export interface ClassifyAnswer {
  questionId: string;
  value: string;
}

export const QUESTIONS = [
  { id: "text_match", text: "Does the formulation (ingredients, proportions and method) exactly match a named authoritative Ayurvedic text or approved formulary, with no change?", options: ["yes_exact", "no_modified", "not_sure"] },
  { id: "intent", text: "What is the product mainly intended to do?", options: ["treat_disease", "improve_wellness_no_disease_claim", "cleanse_beautify_appearance"] },
  { id: "form", text: "Is it a purified/standardised plant extract or fraction with a defined marker/active profile (not a whole-herb classical preparation)?", options: ["yes_standardised_extract", "no_whole_herb_or_mix"] },
  { id: "evidence", text: "Do you have (or plan) fresh safety/effectiveness data specific to this exact formulation, beyond what the classical texts already say?", options: ["yes_new_data", "relying_on_classical_text_only", "not_sure"] },
  { id: "tk_bio", text: "Is the formulation based on traditional knowledge and/or Indian biological material (plants, microbes, etc.), including material sourced through a local community or cultivator?", options: ["yes", "no", "not_sure"] },
] as const;

export function classify(answers: ClassifyAnswer[]): { categoryId: string; confidence: "high" | "medium"; reasoning: string[] } {
  const a = Object.fromEntries(answers.map((x) => [x.questionId, x.value]));
  const reasoning: string[] = [];
  if (a.intent === "cleanse_beautify_appearance") {
    reasoning.push("Intended use is appearance/cosmetic, not disease treatment -> Cosmetic category, regardless of other answers.");
    return { categoryId: "cosmetic", confidence: "high", reasoning };
  }
  if (a.intent === "improve_wellness_no_disease_claim" && a.form !== "yes_standardised_extract") {
    reasoning.push("Wellness/food positioning without a disease claim and not a standardised extract -> Ayurveda-Aahar / nutraceutical (food) category.");
    return { categoryId: "nutraceutical", confidence: "high", reasoning };
  }
  if (a.form === "yes_standardised_extract") {
    reasoning.push("A purified, standardised extract/fraction with a defined profile matches the phytopharmaceutical category, whatever the exact-text answer.");
    return { categoryId: "phytopharmaceutical", confidence: "high", reasoning };
  }
  if (a.text_match === "yes_exact") {
    reasoning.push("Exact match to a First-Schedule/authoritative text -> Classical / generic formulation.");
    return { categoryId: "classical", confidence: "high", reasoning };
  }
  if (a.evidence === "yes_new_data" && a.text_match === "no_modified") {
    reasoning.push("Modified from any classical text and backed by fresh safety/effectiveness data -> New / non-classical Ayurvedic drug.");
    return { categoryId: "new_drug", confidence: "high", reasoning };
  }
  reasoning.push("Recognised Ayurvedic principles but not an exact classical-text match and not yet backed by fresh data -> Patent/proprietary Ayurvedic medicine (the default branded-formulation category); re-check once safety/effectiveness data is available.");
  return { categoryId: "proprietary", confidence: "medium", reasoning };
}
