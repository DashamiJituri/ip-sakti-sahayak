"use client";
import { X, ExternalLink, FileText } from "lucide-react";
import type { SourceRef } from "@/lib/types";
import { Pill } from "./ui";
import { useLanguage } from "./LanguageProvider";
import { MACHINE_TRANSLATION_CAPTION } from "@/lib/translate";

const STATUS_TONE: Record<string, "neem" | "turmeric" | "sindoor" | "neutral"> = {
  current: "neem",
  amended: "turmeric",
  superseded: "sindoor",
  reference: "neutral",
  curated: "indigo" as never,
};

export default function SourceDrawer({ source, onClose }: { source: SourceRef | null; onClose: () => void }) {
  const { lang } = useLanguage();
  if (!source) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-surface border-l border-line shadow-pop p-5 overflow-y-auto scrollbar-thin animate-rise">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-neem">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-mono uppercase tracking-wide">{source.id}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sunk" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="font-display font-semibold text-lg leading-snug">{source.title}</h3>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Pill tone={STATUS_TONE[source.status] || "neutral"}>{source.status}</Pill>
          <Pill tone={source.tier === "primary" ? "neem" : source.tier === "curated" ? "indigo" : "neutral"}>
            {source.tier === "primary" ? "primary legal text" : source.tier === "curated" ? "curated summary" : source.tier}
          </Pill>
          <Pill>{source.jurisdiction === "india" ? "India" : "International"}</Pill>
          {source.section && <Pill tone="turmeric">Section {source.section}</Pill>}
          {source.page && <Pill>page {source.page}</Pill>}
        </div>

        {source.note && <p className="mt-3 text-xs text-muted bg-sunk rounded-lg p-2.5">{source.note}</p>}

        <div className="mt-4 p-4 rounded-xl bg-sunk border border-line font-legal text-[13px] leading-relaxed whitespace-pre-wrap">
          {source.excerpt}
        </div>

        {source.excerptTranslated && (
          <div className="mt-2 p-3 rounded-xl border border-dashed border-line text-[12px] leading-relaxed whitespace-pre-wrap">
            <p className="text-[10px] text-muted mb-1">{MACHINE_TRANSLATION_CAPTION[lang]}</p>
            {source.excerptTranslated}
          </div>
        )}

        {source.verifyUrl && (
          <a href={source.verifyUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-neem hover:underline">
            Verify against the official source <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
