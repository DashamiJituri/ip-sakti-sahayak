import Link from "next/link";
import { ArrowRight, MessageSquare, ListChecks, ShieldCheck, Library, Leaf, ScrollText } from "lucide-react";

const CARDS = [
  { href: "/chat", title: "Ask a question", desc: "Get a cited, jurisdiction-separated answer on patents, GI, trade marks, designs, ABS and drug regulation.", icon: MessageSquare },
  { href: "/classify", title: "Classify my product", desc: "5 quick questions place your formulation in the right IP + regulatory category.", icon: ListChecks },
  { href: "/abs", title: "ABS helper", desc: "Check your Biological Diversity Act obligation before you file or commercialise.", icon: ShieldCheck },
  { href: "/sources", title: "Corpus & sources", desc: "See exactly which statutes, rules and gazettes back every answer — with a live relationship graph.", icon: Library },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-2xl animate-rise">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-neem-soft text-neem-ink text-xs font-medium">
          <Leaf className="w-3.5 h-3.5" /> Ministry of Ayush · SIH26045
        </div>
        <h1 className="font-display font-bold text-4xl md:text-5xl leading-tight mb-4">
          IP-SAKTI <span className="text-neem">Sahayak</span>
        </h1>
        <p className="text-muted text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          A source-cited assistant for Intellectual Property and regulatory guidance in Ayurveda — India and international, always kept separate, never
          guessed.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 text-left">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.href} href={c.href} className="card p-5 hover:border-neem transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-neem-soft text-neem flex items-center justify-center mb-3">
                  <Icon className="w-4.5 h-4.5" />
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
          <ScrollText className="w-3.5 h-3.5" /> Information, not legal advice.
        </p>
      </div>
    </main>
  );
}
