"use client";
import { useState } from "react";
import { ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import Shell from "@/components/Shell";
import { Pill } from "@/components/ui";

const ACTORS = [
  { v: "indian_citizen_or_company", l: "Indian citizen / India-registered company" },
  { v: "foreign_controlled_or_foreign_company", l: "Foreign national / foreign-controlled or non-India-registered entity" },
  { v: "ayush_practitioner_registered", l: "Registered AYUSH practitioner (vaid/hakim) — local traditional practice" },
  { v: "cultivator_grower", l: "Cultivator/grower of the biological resource" },
  { v: "community_local", l: "Local community holding the traditional knowledge" },
];
const ACTIVITIES = [
  { v: "research_only", l: "Research only (no commercial use yet)" },
  { v: "commercial_use", l: "Commercial use of the biological resource" },
  { v: "bioprospecting_transfer_abroad", l: "Transfer of resource/research results abroad, for consideration" },
  { v: "patent_or_ip_application", l: "Filing a patent / other IP application based on it" },
  { v: "cultivated_material_only", l: "Only cultivated material (not wild-collected)" },
  { v: "codified_tk_commercial_use", l: "Commercial use of codified traditional knowledge" },
];

interface Result {
  requirement: string; headline: string; detail: string[]; benefitSharingNote?: string;
  citations: { title: string; page: number | null; section: string | null; excerpt: string }[];
}

export default function AbsPage() {
  const [actorType, setActorType] = useState(ACTORS[0].v);
  const [activity, setActivity] = useState(ACTIVITIES[0].v);
  const [usesCodifiedTK, setUsesCodifiedTK] = useState(false);
  const [species, setSpecies] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/abs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorType, activity, usesCodifiedTK, species: species || undefined }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center gap-2 text-neem mb-2">
          <ShieldCheck className="w-5 h-5" /> <span className="text-sm font-medium">Access & Benefit-Sharing helper</span>
        </div>
        <h1 className="font-display font-bold text-2xl mb-2">What do I owe the NBA / State Board?</h1>
        <p className="text-muted mb-6 text-sm">
          Based on the Biological Diversity Act as amended in 2023 and the NBA ABS Regulations 2025. This flags which obligation applies — it does not file
          anything for you.
        </p>

        <div className="card p-5 space-y-5">
          <div>
            <label className="text-sm font-medium block mb-2">Who are you?</label>
            <div className="grid gap-2">
              {ACTORS.map((a) => (
                <label key={a.v} className="flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-xl border border-line has-[:checked]:border-neem has-[:checked]:bg-neem-soft cursor-pointer">
                  <input type="radio" name="actor" value={a.v} checked={actorType === a.v} onChange={() => setActorType(a.v)} className="accent-current" />
                  {a.l}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">What are you doing with the biological resource?</label>
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm">
              {ACTIVITIES.map((a) => (
                <option key={a.v} value={a.v}>
                  {a.l}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={usesCodifiedTK} onChange={(e) => setUsesCodifiedTK(e.target.checked)} />
            This also draws on codified traditional knowledge (a documented formulation from a recognised text/database)
          </label>

          <div>
            <label className="text-sm font-medium block mb-2">Species / resource name (optional — e.g. sandalwood, neem)</label>
            <input value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="e.g. Santalum album / sandalwood" className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm" />
          </div>

          <button onClick={run} disabled={loading} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-neem text-white font-medium shadow-lift disabled:opacity-50">
            {loading ? "Checking…" : "Check requirement"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {result && (
          <div className="card p-5 mt-5 animate-rise">
            <Pill tone="turmeric">{result.requirement.replace(/_/g, " ")}</Pill>
            <h2 className="font-display font-semibold text-lg mt-2 mb-2">{result.headline}</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              {result.detail.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            {result.benefitSharingNote && <p className="text-sm bg-turmeric-soft text-turmeric-ink rounded-xl p-3 mt-3">{result.benefitSharingNote}</p>}

            {result.citations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-xs font-medium text-muted mb-2">Backed by:</p>
                <div className="space-y-2">
                  {result.citations.map((c, i) => (
                    <div key={i} className="text-xs bg-sunk rounded-lg p-2.5">
                      <span className="font-medium">
                        {c.title} {c.section ? `s.${c.section}` : ""} {c.page ? `p.${c.page}` : ""}
                      </span>
                      <p className="text-muted mt-1">{c.excerpt}…</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <a href="https://nbaindia.gov.in" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-neem hover:underline mt-4">
              National Biodiversity Authority <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
        <p className="text-[11px] text-muted mt-4">Information, not legal advice. Confirm procedure with the NBA / State Biodiversity Board before acting.</p>
      </div>
    </Shell>
  );
}
