"use client";
import { useEffect, useState } from "react";
import { Library, ExternalLink, FileText } from "lucide-react";
import Shell from "@/components/Shell";
import { Pill } from "@/components/ui";
import DocGraph from "@/components/DocGraph";
import type { DocMeta } from "@/lib/types";
import docsJson from "../../../../data/docs.json";

const DOCS = docsJson as unknown as DocMeta[];

export default function SourcesPage() {
  const [docs] = useState<DocMeta[]>(DOCS);
  const [selected, setSelected] = useState<DocMeta | null>(null);
  const [health, setHealth] = useState<{ corpusChunks: number; anchorsVerified: number; anchorsTotal: number; geminiConfigured: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth);
  }, []);

  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center gap-2 text-neem mb-2">
          <Library className="w-5 h-5" /> <span className="text-sm font-medium">Corpus & sources</span>
        </div>
        <h1 className="font-display font-bold text-2xl mb-2">What this assistant has actually read</h1>
        <p className="text-muted text-sm mb-6">
          Every answer is grounded only in the documents below. Click any document to see its status; click a node in the graph to see how documents relate
          (amends, implements, supersedes).
        </p>

        {health && (
          <div className="flex flex-wrap gap-3 mb-6">
            <Stat label="Indexed passages" value={health.corpusChunks} />
            <Stat label="Documents" value={docs.length} />
            <Stat label="Verified legal anchors" value={`${health.anchorsVerified}/${health.anchorsTotal}`} />
            <Stat label="AI drafting" value={health.geminiConfigured ? "on" : "retrieval-only"} />
          </div>
        )}

        <div className="card p-2 mb-6">
          <DocGraph docs={docs} onSelect={(id) => setSelected(docs.find((d) => d.id === id) || null)} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {docs.map((d) => (
            <button key={d.id} onClick={() => setSelected(d)} className="text-left card p-4 hover:border-neem transition-colors">
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-snug">{d.title}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Pill tone={d.status === "current" ? "neem" : d.status === "superseded" ? "sindoor" : "turmeric"}>{d.status}</Pill>
                    <Pill tone={d.tier === "primary" ? "neem" : "neutral"}>{d.tier}</Pill>
                    <Pill>{d.jurisdiction}</Pill>
                    <Pill>{d.chunks} passages</Pill>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md h-full bg-surface border-l border-line p-5 overflow-y-auto animate-rise">
            <h3 className="font-display font-semibold text-lg mb-2">{selected.title}</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Pill tone={selected.status === "current" ? "neem" : selected.status === "superseded" ? "sindoor" : "turmeric"}>{selected.status}</Pill>
              <Pill tone={selected.tier === "primary" ? "neem" : "neutral"}>{selected.tier}</Pill>
              <Pill>{selected.jurisdiction}</Pill>
            </div>
            {selected.note && <p className="text-sm bg-sunk rounded-xl p-3 mb-3">{selected.note}</p>}
            <p className="text-xs text-muted">{selected.pages} pages · {selected.chunks} indexed passages</p>
            <button onClick={() => setSelected(null)} className="mt-6 text-sm text-neem underline">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-10">
        <h2 className="font-semibold text-sm mb-2 mt-8">Live official registries (not indexed — always check directly)</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            ["TKDL", "https://www.tkdl.res.in"],
            ["IP India — Patents (InPASS)", "https://ipindia.gov.in/patents.htm"],
            ["IP India — Trade Marks", "https://ipindia.gov.in/trade-marks.htm"],
            ["IP India — GI Registry", "https://ipindia.gov.in/gi.htm"],
            ["India Code", "https://www.indiacode.nic.in"],
            ["National Biodiversity Authority", "https://nbaindia.gov.in"],
          ].map(([label, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl border border-line hover:bg-sunk">
              {label} <ExternalLink className="w-3.5 h-3.5 text-muted" />
            </a>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card px-4 py-2.5">
      <p className="text-lg font-display font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted mt-1">{label}</p>
    </div>
  );
}
