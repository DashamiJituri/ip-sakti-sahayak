// ABS-compliance helper: Biological Diversity (Amendment) Act 2023 + NBA ABS Regulations 2025.
// This is decision-support against the cited sections, not a filing tool.
export interface AbsInput {
  actorType: "indian_citizen_or_company" | "foreign_controlled_or_foreign_company" | "ayush_practitioner_registered" | "cultivator_grower" | "community_local";
  activity: "research_only" | "commercial_use" | "bioprospecting_transfer_abroad" | "patent_or_ip_application" | "cultivated_material_only" | "codified_tk_commercial_use";
  usesCodifiedTK: boolean;
  species?: string;
}

export interface AbsResult {
  requirement: "prior_approval_s6_1" | "registration_s6_1a" | "intimation_s7" | "exempt_s7" | "certificate_of_origin" | "not_covered";
  headline: string;
  detail: string[];
  anchors: string[];
  benefitSharingNote?: string;
}

const HIGH_VALUE = ["sandalwood", "chandan", "red sanders", "raktachandan", "agarwood", "agar", "oud"];

export function assessABS(input: AbsInput): AbsResult {
  const anchors: string[] = [];
  if (input.actorType === "ayush_practitioner_registered" && input.activity !== "bioprospecting_transfer_abroad" && input.activity !== "patent_or_ip_application") {
    anchors.push("BD_S7_EXEMPT");
    return {
      requirement: "exempt_s7",
      headline: "Likely exempt from prior intimation for local, traditional practice",
      detail: [
        "Vaids, hakims and registered AYUSH practitioners using local biological resources for their traditional practice, including collection or transport of a specimen for their own use, are exempted from the prior-intimation requirement under the amended Act.",
        "This exemption is narrow: it does not cover commercialisation, transfer abroad, or a patent/IP application built on that use (see the other categories below).",
      ],
      anchors,
    };
  }

  if (input.actorType === "cultivator_grower" || input.activity === "cultivated_material_only") {
    anchors.push("BD_S7_CULT");
    return {
      requirement: "certificate_of_origin",
      headline: "Cultivated biological resources: certificate of origin, not full prior approval",
      detail: [
        "Access to cultivated biological resources, or their trade, is treated separately: the requirement is generally a certificate of origin from the State Biodiversity Board, rather than the fuller prior-approval process for wild-collected material.",
        "Confirm current State Biodiversity Board procedure, since implementation detail sits in the Rules/Regulations, not the Act itself.",
      ],
      anchors,
    };
  }

  if (input.actorType === "foreign_controlled_or_foreign_company") {
    anchors.push("BD_S3_FOREIGN", "BD_S6_1");
    return {
      requirement: "prior_approval_s6_1",
      headline: "Prior approval of the National Biodiversity Authority is required before seeking IP",
      detail: [
        "A person who is not a citizen of India, a non-resident Indian, or a body corporate/association not registered in India or with non-Indian participation in capital or management, needs prior NBA approval before obtaining any IPR (in or outside India) based on research or information on a biological resource obtained from India.",
        "Apply to the NBA before filing the patent/IP application; approval is a precondition, not a formality to seek afterwards.",
      ],
      anchors,
      benefitSharingNote: benefitShareNote(input.species),
    };
  }

  if (input.activity === "patent_or_ip_application") {
    anchors.push("BD_S6_1A", "BD_S6_1B");
    return {
      requirement: "registration_s6_1a",
      headline: "Register with the NBA before grant of the IP right; benefit-sharing is fixed at commercialisation",
      detail: [
        "An Indian applicant seeking a patent or other IPR based on a biological resource obtained from India must register the fact with the National Biodiversity Authority before the IP right is granted.",
        "Benefit-sharing terms, where applicable, are determined by the NBA at the stage of commercialisation of the product, not at the filing stage.",
      ],
      anchors,
      benefitSharingNote: benefitShareNote(input.species),
    };
  }

  if (input.activity === "bioprospecting_transfer_abroad") {
    anchors.push("BD_S3_FOREIGN", "BD_S4");
    return {
      requirement: "prior_approval_s6_1",
      headline: "Prior NBA approval needed for transfer of research results/resources for monetary consideration",
      detail: [
        "Transferring the results of research relating to a biological resource obtained from India, or the resource itself, to a person who is not an Indian citizen or an India-registered body, for monetary or other consideration, needs prior NBA approval (subject to the specific exemptions the Act carves out).",
      ],
      anchors,
      benefitSharingNote: benefitShareNote(input.species),
    };
  }

  if (input.activity === "commercial_use" || input.usesCodifiedTK) {
    anchors.push("BD_S7", input.usesCodifiedTK ? "BD_CODIFIED" : "BD_S7");
    return {
      requirement: "intimation_s7",
      headline: "Prior intimation to the State Biodiversity Board",
      detail: [
        "An Indian citizen or India-registered entity obtaining a biological resource for commercial use (research use is generally lighter-touch) must give prior intimation to the concerned State Biodiversity Board, which may restrict it if it threatens conservation, sustainable use, or benefit-sharing.",
        input.usesCodifiedTK
          ? "Because this also draws on codified traditional knowledge (knowledge documented in a specified, publicly available format such as a recognised text or database), check the specific treatment the Amendment Act gives to codified TK alongside the resource itself."
          : "",
      ].filter(Boolean),
      anchors,
      benefitSharingNote: benefitShareNote(input.species),
    };
  }

  anchors.push("BD_S7");
  return {
    requirement: "intimation_s7",
    headline: "Prior intimation is the default starting point",
    detail: ["For research or use of a biological resource obtained from India that does not fall into a specific exemption above, prior intimation to the State Biodiversity Board is the general starting obligation; confirm against your exact activity."],
    anchors,
  };
}

function benefitShareNote(species?: string): string | undefined {
  if (!species) return undefined;
  const s = species.toLowerCase();
  if (HIGH_VALUE.some((h) => s.includes(h))) {
    return "This species is treated as high-value under the NBA ABS Regulations 2025 (e.g. red sanders, sandalwood, agarwood): expect a more stringent benefit-sharing and monitoring regime than the general slab table.";
  }
  return "Where monetary benefit-sharing applies, the NBA ABS Regulations 2025 set it on a slab basis tied to annual gross ex-factory revenue from the product that uses the biological resource; the exact slab and percentage must be read from the Regulations for the applicable revenue band, not assumed.";
}
