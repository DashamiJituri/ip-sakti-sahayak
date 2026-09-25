"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Globe2, Landmark, Layers, Languages, AlertTriangle, Mail, Loader2, Sparkles } from "lucide-react";
import clsx from "clsx";
import Shell from "@/components/Shell";
import { ConfidenceBadge, Pill } from "@/components/ui";
import SourceDrawer from "@/components/SourceDrawer";
import { CitationText, InlineSourceChips } from "@/components/CitationText";
import type { ChatResponse, Jurisdiction, Lang, SourceRef } from "@/lib/types";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
];

const SUGGESTIONS = [
  "Can I patent an Ayurvedic churna that exactly matches a formula in the Sharangdhara Samhita?",
  "We use neem extract sourced from Karnataka in a new cosmetic — what BD Act approvals do we need before applying for a patent?",
  "What is the difference between GI and a trade mark for an Ayurvedic product from a specific region?",
  "Does the TKDL automatically stop someone else from patenting a known Ayurvedic formulation abroad?",
  "Hindi: हल्दी के फॉर्मूलेशन पर पेटेंट क्यों नहीं मिलता?",
];

interface Turn {
  question: string;
  response?: ChatResponse;
  loading?: boolean;
  error?: string;
}

export default function ChatPage() {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("india");
  const [language, setLanguage] = useState<Lang>("en");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [drawer, setDrawer] = useState<SourceRef | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question) return;
    setInput("");
    setTurns((t) => [...t, { question, loading: true }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, jurisdiction, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, response: data, loading: false } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: e instanceof Error ? e.message : "Something went wrong.", loading: false } : x)));
    }
  }

  function openSource(sources: Record<string, SourceRef>, id: string) {
    setDrawer(sources[id] || null);
  }

  return (
    <Shell>
      <div className="flex flex-col h-screen">
        <header className="no-print sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line px-4 md:px-8 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display font-bold text-xl">Ask IP-SAKTI</h1>
                <p className="text-xs text-muted mt-0.5">Every legal statement is traceable to a cited passage. This is information, not legal advice.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Languages className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Lang)}
                    className="appearance-none pl-8 pr-3 py-2 rounded-xl border border-line bg-surface text-sm font-medium"
                    aria-label="Answer language"
                  >
                    {LANGS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div role="radiogroup" aria-label="Jurisdiction" className="inline-flex p-1 rounded-2xl bg-sunk border border-line self-start">
              {(
                [
                  { v: "india", label: "India", icon: Landmark },
                  { v: "international", label: "International", icon: Globe2 },
                  { v: "both", label: "Both (kept separate)", icon: Layers },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = jurisdiction === opt.v;
                return (
                  <button
                    key={opt.v}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setJurisdiction(opt.v)}
                    className={clsx(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all",
                      active ? "bg-neem text-white shadow-lift" : "text-muted hover:text-ink"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {turns.length === 0 && (
              <div className="animate-rise">
                <div className="card p-6 mb-6">
                  <div className="flex items-center gap-2 text-neem mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">Try a question</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="text-left text-sm px-3 py-2 rounded-xl bg-sunk hover:bg-neem-soft hover:text-neem-ink transition-colors border border-line">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted">
                  Tip: for a full patentability read on a specific product, first use{" "}
                  <a href="/classify" className="text-neem underline">
                    Classify my product
                  </a>{" "}
                  — the category changes which rules apply.
                </p>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className="space-y-3 animate-rise">
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-neem text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-lift">{t.question}</div>
                </div>

                {t.loading && (
                  <div className="flex items-center gap-2 text-muted text-sm pl-1">
                    <Loader2 className="w-4 h-4 animate-spin" /> Searching the statute corpus and drafting a cited answer…
                  </div>
                )}

                {t.error && (
                  <div className="flex items-start gap-2 text-sm text-sindoor bg-sindoor-soft rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {t.error}
                  </div>
                )}

                {t.response && <AnswerBlock response={t.response} onOpen={(sources, id) => openSource(sources, id)} onEscalate={(q) => escalate(q)} />}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <footer className="no-print border-t border-line bg-paper/90 backdrop-blur px-4 md:px-8 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="max-w-3xl mx-auto flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={1}
              placeholder="Ask about patents, GI, trade marks, ABS, licensing… (Shift+Enter for a new line)"
              className="flex-1 resize-none max-h-36 rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neem/40"
            />
            <button type="submit" className="p-3 rounded-2xl bg-neem text-white shadow-lift hover:opacity-90 disabled:opacity-40" disabled={!input.trim()}>
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="max-w-3xl mx-auto text-[11px] text-muted mt-2">Information, not legal advice. Verify anything material before filing or launch.</p>
        </footer>
      </div>

      <SourceDrawer source={drawer} onClose={() => setDrawer(null)} />
    </Shell>
  );

  async function escalate(question: string) {
    try {
      const res = await fetch("/api/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: `jurisdiction=${jurisdiction} language=${language}` }),
      });
      const data = await res.json();
      if (data.mailto) window.location.href = data.mailto;
    } catch {
      /* best effort */
    }
  }
}

function AnswerBlock({ response, onOpen, onEscalate }: { response: ChatResponse; onOpen: (sources: Record<string, SourceRef>, id: string) => void; onEscalate: (q: string) => void }) {
  if (response.mode === "abstain") {
    return (
      <div className="card p-4 border-sindoor/30">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-sindoor shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">This isn&apos;t clearly answered in the indexed documents.</p>
            <p className="text-sm text-muted mt-1">
              To avoid guessing, I&apos;m not generating an answer here. Try rephrasing, check{" "}
              <a href="/sources" className="text-neem underline">
                the corpus
              </a>{" "}
              to see what is indexed, or escalate to a human IP facilitator.
            </p>
            <button onClick={() => onEscalate(response.englishQuery || "")} className="mt-3 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-sindoor text-white">
              <Mail className="w-3.5 h-3.5" /> Escalate to a human IP facilitator
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {response.notices.map((n, i) => (
        <p key={i} className="text-xs text-turmeric-ink bg-turmeric-soft rounded-lg px-3 py-2">
          {n}
        </p>
      ))}

      <div className={clsx("grid gap-4", response.answers.length === 2 ? "md:grid-cols-2" : "grid-cols-1")}>
        {response.answers.map((a, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <Pill tone={a.jurisdiction === "india" ? "neem" : "indigo"}>{a.jurisdiction === "india" ? "🇮🇳 India" : "🌐 International"}</Pill>
              {a.withheld > 0 && <span className="text-[11px] text-muted">{a.withheld} unverified statement(s) omitted</span>}
            </div>

            {a.summary && <p className="text-sm text-muted mb-3 italic">{a.summary}</p>}

            {a.points.length > 0 && (
              <ul className="space-y-2.5">
                {a.points.map((p, pi) => (
                  <li key={pi} className="text-sm">
                    <CitationText text={p.text} sources={response.sources} onOpen={(id) => onOpen(response.sources, id)} />
                    <InlineSourceChips ids={p.sources} sources={response.sources} onOpen={(id) => onOpen(response.sources, id)} />
                  </li>
                ))}
              </ul>
            )}

            {a.passages && a.passages.length > 0 && (
              <ul className="space-y-2">
                {a.passages.map((id) => {
                  const s = response.sources[id];
                  if (!s) return null;
                  return (
                    <li key={id}>
                      <button onClick={() => onOpen(response.sources, id)} className="w-full text-left text-sm bg-sunk hover:bg-neem-soft rounded-xl p-3 transition-colors">
                        <span className="cite mr-2">{id}</span>
                        {s.excerpt.slice(0, 180)}…
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <ConfidenceBadge c={response.confidence} />
        {response.escalate && (
          <button onClick={() => onEscalate(response.englishQuery || "")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-line hover:bg-sunk">
            <Mail className="w-3.5 h-3.5" /> Ask a human IP facilitator
          </button>
        )}
      </div>
    </div>
  );
}
