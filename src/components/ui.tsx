"use client";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import type { Confidence } from "@/lib/types";

export function ConfidenceBadge({ c }: { c: Confidence }) {
  const cfg = {
    high: { icon: CheckCircle2, cls: "bg-neem-soft text-neem-ink border-neem/30" },
    medium: { icon: HelpCircle, cls: "bg-turmeric-soft text-turmeric-ink border-turmeric/30" },
    low: { icon: AlertTriangle, cls: "bg-sindoor-soft text-sindoor border-sindoor/30" },
  }[c.level];
  const Icon = cfg.icon;
  return (
    <div className={clsx("group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.cls)}>
      <Icon className="w-3.5 h-3.5" />
      {c.level === "high" ? "High confidence" : c.level === "medium" ? "Medium confidence" : "Low confidence"}
      <span className="opacity-70">· {Math.round(c.score * 100)}%</span>
      <div className="pointer-events-none absolute left-0 top-full mt-2 w-64 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="card p-3 text-xs text-muted space-y-1">
          {c.reasons.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "neem" | "turmeric" | "indigo" | "sindoor" }) {
  const map: Record<string, string> = {
    neutral: "bg-sunk text-muted border-line",
    neem: "bg-neem-soft text-neem-ink border-neem/30",
    turmeric: "bg-turmeric-soft text-turmeric-ink border-turmeric/30",
    indigo: "bg-indigo-soft text-indigo-ink border-indigo/30",
    sindoor: "bg-sindoor-soft text-sindoor border-sindoor/30",
  };
  return <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", map[tone])}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-lg", className)} />;
}
