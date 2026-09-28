"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Globe2, Landmark, Layers, AlertTriangle, Mail, Loader2, Sparkles, Copy, Check, X } from "lucide-react";
import clsx from "clsx";
import Shell from "@/components/Shell";
import { ConfidenceBadge, Pill } from "@/components/ui";
import SourceDrawer from "@/components/SourceDrawer";
import { CitationText, InlineSourceChips } from "@/components/CitationText";
import { useLanguage } from "@/components/LanguageProvider";
import { MACHINE_TRANSLATION_CAPTION } from "@/lib/translate";
import type { ChatResponse, Jurisdiction, SourceRef } from "@/lib/types";

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
  const { lang, t } = useLanguage();
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("india");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [drawer, setDrawer] = useState<SourceRef | null>(null);
  const [escalation, setEscalation] = useState<{ id: string; mailto: string; to: string; subject: string; body: string } | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question) return;
    setInput("");
    setTurns((t2) => [...t2, { question, loading: true }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, jurisdiction, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setTurns((t2) => t2.map((x, i) => (i === t2.length - 1 ? { ...x, response: data, loading: false } : x)));
    } catch (e) {
      setTurns((t2) => t2.map((x, i) => (i === t2.length - 1 ? { ...x, error: e instanceof Error ? e.message : "Something went wrong.", loading: false } : x)));
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
                <h1 className="font-display font-bold text-xl">{t.chat.title}</h1>
                <p className="text-xs text-muted mt-0.5">{t.chat.subtitle}</p>
              </div>
            </div>

            <div role="radiogroup" aria-label="Jurisdiction" className="inline-flex p-1 rounded-2xl bg-sunk border border-line self-start">
              {(
                [
                  { v: "india", label: t.chat.india, icon: Landmark },
                  { v: "international", label: t.chat.intl, icon: Globe2 },
                  { v: "both", label: t.chat.both, icon: Layers },
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
                    <span className="text-sm font-semibold">{t.chat.tryQuestion}</span>
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
                  {t.chat.tip}{" "}
                  <a href="/classify" className="text-neem underline">
                    {t.chat.tipLink}
                  </a>{" "}
                  — the category changes which rules apply.
                </p>
              </div>
            )}

            {turns.map((tn, i) => (
              <div key={i} className="space-y-3 animate-rise">
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-neem text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-lift">{tn.question}</div>
                </div>

                {tn.loading && (
                  <div className="flex items-center gap-2 text-muted text-sm pl-1">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t.chat.searching}
                  </div>
                )}

                {tn.error && (
                  <div className="flex items-start gap-2 text-sm text-sindoor bg-sindoor-soft rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {tn.error}
                  </div>
                )}

                {tn.response && (
                  <AnswerBlock
                    response={tn.response}
                    onOpen={(sources, id) => openSource(sources, id)}
                    onEscalate={(q) => escalate(q)}
                    escalating={escalating}
                    t={t}
                    lang={lang}
                  />
                )}
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
              placeholder={t.chat.placeholder}
              className="flex-1 resize-none max-h-36 rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neem/40"
            />
            <button type="submit" className="p-3 rounded-2xl bg-neem text-white shadow-lift hover:opacity-90 disabled:opacity-40" disabled={!input.trim()}>
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="max-w-3xl mx-auto text-[11px] text-muted mt-2">{t.chat.footer}</p>
        </footer>
      </div>

      <SourceDrawer source={drawer} onClose={() => setDrawer(null)} />
      {escalateError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 text-sm bg-sindoor-soft text-sindoor rounded-xl px-4 py-2.5 shadow-lift">
          {escalateError}
        </div>
      )}
      {escalation && <EscalationPanel escalation={escalation} onClose={() => setEscalation(null)} />}
    </Shell>
  );

  async function escalate(question: string) {
    setEscalating(true);
    setEscalateError(null);
    try {
      const res = await fetch("/api/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: `jurisdiction=${jurisdiction} language=${lang}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not log the escalation.");
      // Show a panel with the drafted message instead of only firing a
      // mailto: redirect — on a machine with no default mail app configured
      // (common on Windows), window.location.href = "mailto:..." does
      // nothing visible at all, which looks like the button is broken. The
      // panel below always gives the user something they can act on: a real
      // link to try, and a copy button as a guaranteed fallback.
      setEscalation({ id: data.id, mailto: data.mailto, to: data.to, subject: data.subject, body: data.body });
    } catch (e) {
      setEscalateError(e instanceof Error ? e.message : "Could not log the escalation. Please try again.");
    } finally {
      setEscalating(false);
    }
  }
}

function EscalationPanel({ escalation, onClose }: { escalation: { id: string; mailto: string; to: string; subject: string; body: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`To: ${escalation.to}\nSubject: ${escalation.subject}\n\n${escalation.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; the text is still visible below to select manually */
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Escalation logged — case {escalation.id}</p>
            <p className="text-xs text-muted mt-1">
              If your email app didn&apos;t open automatically, copy this message and send it yourself to{" "}
              <span className="font-medium">{escalation.to}</span>.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre className="text-xs bg-sunk rounded-xl p-3 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans">
          {`To: ${escalation.to}\nSubject: ${escalation.subject}\n\n${escalation.body}`}
        </pre>
        <div className="flex gap-2">
          <button onClick={copy} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-neem text-white hover:opacity-90">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy message"}
          </button>
          <a href={escalation.mailto} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-line hover:bg-sunk">
            <Mail className="w-3.5 h-3.5" /> Open email app
          </a>
        </div>
      </div>
    </div>
  );
}

function AnswerBlock({
  response,
  onOpen,
  onEscalate,
  escalating,
  t,
  lang,
}: {
  response: ChatResponse;
  onOpen: (sources: Record<string, SourceRef>, id: string) => void;
  onEscalate: (q: string) => void;
  escalating: boolean;
  t: ReturnType<typeof useLanguage>["t"];
  lang: ReturnType<typeof useLanguage>["lang"];
}) {
  if (response.mode === "abstain") {
    return (
      <div className="card p-4 border-sindoor/30">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-sindoor shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t.chat.abstainTitle}</p>
            <p className="text-sm text-muted mt-1">
              {t.chat.abstainBody}{" "}
              <a href="/sources" className="text-neem underline">
                {t.chat.abstainLink}
              </a>
              .
            </p>
            <button
              onClick={() => onEscalate(response.englishQuery || "")}
              disabled={escalating}
              className="mt-3 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-sindoor text-white disabled:opacity-60"
            >
              {escalating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} {t.chat.escalate}
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
              {a.withheld > 0 && (
                <span className="text-[11px] text-muted">
                  {a.withheld} {t.chat.withheld}
                </span>
              )}
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
                  const preview = s.excerptTranslated || s.excerpt;
                  return (
                    <li key={id}>
                      <button onClick={() => onOpen(response.sources, id)} className="w-full text-left text-sm bg-sunk hover:bg-neem-soft rounded-xl p-3 transition-colors">
                        <span className="cite mr-2">{id}</span>
                        {preview.slice(0, 180)}…
                      </button>
                      {s.excerptTranslated && <p className="text-[10px] text-muted mt-1 pl-1">{MACHINE_TRANSLATION_CAPTION[lang]}</p>}
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
          <button
            onClick={() => onEscalate(response.englishQuery || "")}
            disabled={escalating}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-line hover:bg-sunk disabled:opacity-60"
          >
            {escalating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} {t.chat.escalate}
          </button>
        )}
      </div>
    </div>
  );
}
