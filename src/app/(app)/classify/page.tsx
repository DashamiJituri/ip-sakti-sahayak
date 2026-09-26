"use client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";
import Shell from "@/components/Shell";
import { Pill } from "@/components/ui";
import { useLanguage } from "@/components/LanguageProvider";

interface Q { id: string; text: string; options: string[] }
interface Category {
  id: string; label: string; gist: string; ipPosture: string[]; regulatory: string[];
}
const LABELS: Record<string, string> = {
  yes_exact: "Yes, exact match", no_modified: "No, it's modified", not_sure: "Not sure",
  treat_disease: "Treat / manage a disease", improve_wellness_no_disease_claim: "General wellness (no disease claim)", cleanse_beautify_appearance: "Cleanse / beautify appearance",
  yes_standardised_extract: "Yes, standardised extract", no_whole_herb_or_mix: "No, whole herb / classical mix",
  yes_new_data: "Yes, new data", relying_on_classical_text_only: "Relying on classical text only",
  yes: "Yes", no: "No",
};

export default function ClassifyPage() {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ category: Category; reasoning: string[]; confidence: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    const res = await fetch("/api/classify");
    const data = await res.json();
    setQuestions(data.questions);
    setStep(0);
    setAnswers({});
    setResult(null);
  }

  async function choose(qid: string, value: string) {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    if (questions && step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setLoading(true);
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: Object.entries(next).map(([questionId, value]) => ({ questionId, value })) }),
      });
      const data = await res.json();
      setResult(data);
      setLoading(false);
    }
  }

  if (!questions) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 text-center animate-rise">
          <h1 className="font-display font-bold text-2xl md:text-3xl mb-3">{t.classify.title}</h1>
          <p className="text-muted mb-8">{t.classify.desc}</p>
          <button onClick={start} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-neem text-white font-medium shadow-lift hover:opacity-90">
            {t.classify.start} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Shell>
    );
  }

  if (result) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 animate-rise">
          <div className="flex items-center gap-2 text-neem mb-2">
            <CheckCircle2 className="w-5 h-5" /> <span className="text-sm font-medium">{t.classify.done}</span>
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">{result.category.label}</h1>
          <p className="text-muted mb-4">{result.category.gist}</p>
          <Pill tone={result.confidence === "high" ? "neem" : "turmeric"}>{result.confidence} confidence</Pill>

          <div className="card p-4 mt-5">
            <h2 className="font-semibold text-sm mb-2">{t.classify.why}</h2>
            <ul className="list-disc pl-5 text-sm text-muted space-y-1">
              {result.reasoning.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="card p-4 mt-4">
            <h2 className="font-semibold text-sm mb-2">{t.classify.ipPosture}</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              {result.category.ipPosture.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="card p-4 mt-4">
            <h2 className="font-semibold text-sm mb-2">{t.classify.regulatory}</h2>
            <ul className="list-disc pl-5 text-sm space-y-1.5">
              {result.category.regulatory.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={start} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-line text-sm hover:bg-sunk">
              <RotateCcw className="w-4 h-4" /> {t.common.startOver}
            </button>
            <a href="/chat" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neem text-white text-sm shadow-lift">
              {t.classify.followUp} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <p className="text-[11px] text-muted mt-4">{t.home.disclaimer}</p>
        </div>
      </Shell>
    );
  }

  const q = questions[step];
  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center gap-1.5 mb-6">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-neem" : "bg-line"}`} />
          ))}
        </div>
        <p className="text-xs text-muted mb-2">
          {t.classify.question} {step + 1} {t.classify.of} {questions.length}
        </p>
        <h1 className="font-display font-semibold text-xl md:text-2xl mb-6 leading-snug">{q.text}</h1>
        <div className="flex flex-col gap-2.5">
          {q.options.map((opt) => (
            <button
              key={opt}
              disabled={loading}
              onClick={() => choose(q.id, opt)}
              className="text-left px-4 py-3.5 rounded-2xl border border-line bg-surface hover:border-neem hover:bg-neem-soft transition-colors disabled:opacity-50"
            >
              {LABELS[opt] || opt}
            </button>
          ))}
        </div>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="w-4 h-4" /> {t.common.back}
          </button>
        )}
      </div>
    </Shell>
  );
}
