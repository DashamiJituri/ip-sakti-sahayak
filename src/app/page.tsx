"use client";
import Link from "next/link";
import { ArrowRight, MessageSquare, ListChecks, ShieldCheck, Library, Leaf, ScrollText } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export default function Home() {
  const { lang, setLang, t } = useLanguage();

  const CARDS = [
    { href: "/chat", title: t.home.cardAsk, desc: t.home.cardAskDesc, icon: MessageSquare },
    { href: "/classify", title: t.home.cardClassify, desc: t.home.cardClassifyDesc, icon: ListChecks },
    { href: "/abs", title: t.home.cardAbs, desc: t.home.cardAbsDesc, icon: ShieldCheck },
    { href: "/sources", title: t.home.cardSources, desc: t.home.cardSourcesDesc, icon: Library },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-2xl animate-rise">
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neem-soft text-neem-ink text-xs font-medium">
            <Leaf className="w-3.5 h-3.5" /> {t.home.badge}
          </div>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label="Language"
            className="px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-medium"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <h1 className="font-display font-bold text-4xl md:text-5xl leading-tight mb-4 text-neem">{t.home.title}</h1>
        <p className="text-muted text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto">{t.home.tagline}</p>

        <div className="grid sm:grid-cols-2 gap-3 text-left">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.href} href={c.href} className="card p-5 hover:border-neem transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-neem-soft text-neem flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-sm flex items-center gap-1.5">
                  {c.title} <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{c.desc}</p>
              </Link>
            );
          })}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted mt-10">
          <ScrollText className="w-3.5 h-3.5" /> {t.home.disclaimer}
        </p>
      </div>
    </main>
  );
}
