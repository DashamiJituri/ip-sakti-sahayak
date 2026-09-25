"use client";
import type { SourceRef } from "@/lib/types";

/** Renders text with [S1] [S2] markers turned into clickable citation chips. */
export function CitationText({ text, sources, onOpen }: { text: string; sources: Record<string, SourceRef>; onOpen: (id: string) => void }) {
  const parts = text.split(/(\[S\d+\])/g);
  return (
    <p className="leading-relaxed">
      {parts.map((part, i) => {
        const m = part.match(/^\[(S\d+)\]$/);
        if (m && sources[m[1]]) {
          const s = sources[m[1]];
          return (
            <button key={i} onClick={() => onOpen(m[1])} className="cite mx-0.5 align-middle" title={s.short}>
              {m[1]}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function InlineSourceChips({ ids, sources, onOpen }: { ids: string[]; sources: Record<string, SourceRef>; onOpen: (id: string) => void }) {
  if (!ids.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 ml-1 align-middle">
      {ids.map((id) => {
        const s = sources[id];
        if (!s) return null;
        return (
          <button key={id} onClick={() => onOpen(id)} className="cite" title={s.short}>
            {id}
          </button>
        );
      })}
    </span>
  );
}
