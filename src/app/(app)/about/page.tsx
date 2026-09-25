"use client";
import { Info, ShieldCheck, GitBranch, Layers3 } from "lucide-react";
import Shell from "@/components/Shell";
import { Pill } from "@/components/ui";

export default function AboutPage() {
  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-2 text-neem mb-2">
            <Info className="w-5 h-5" /> <span className="text-sm font-medium">About</span>
          </div>
          <h1 className="font-display font-bold text-2xl mb-3">IP-SAKTI Sahayak</h1>
          <p className="text-muted text-sm leading-relaxed">
            A multilingual, retrieval-augmented assistant for Intellectual Property and regulatory guidance in Ayurveda, across national and international
            regimes. Built for Smart India Hackathon, problem statement <strong>SIH26045</strong>, Ministry of Ayush.
          </p>
        </div>

        <Section icon={ShieldCheck} title="Guardrails">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Every legal statement is checked against the exact cited passage before it is shown; statements that can&apos;t be verified are dropped, not softened.</li>
            <li>The India and international answer sets are always kept visibly separate — never blended into one paragraph.</li>
            <li>Low-confidence or out-of-corpus questions get an explicit &quot;not clearly answered&quot; response with an escalation path, not a guess.</li>
            <li>This is information, not legal advice, on every screen.</li>
            <li>Personal identifiers (email, phone, ID numbers) typed into the chat are redacted before logging.</li>
          </ul>
        </Section>

        <Section icon={Layers3} title="How an answer is built">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Your question is expanded with Ayurveda-specific synonyms (vernacular ↔ botanical ↔ legal terms) and, if needed, machine-translated to English.</li>
            <li>A search ranks passages from the statute/rules/regulations corpus by relevance, recency and legal status (current vs superseded).</li>
            <li>The top passages, and only those passages, are given to the model with instructions to cite every sentence or say nothing.</li>
            <li>Each drafted sentence is re-checked against its cited passage for numbers, section references and dates before being shown.</li>
            <li>A confidence score is computed from term coverage, how much of the answer rests on primary law vs commentary, and how many statements were dropped.</li>
          </ol>
        </Section>

        <Section icon={GitBranch} title="Roadmap (staged build, per the problem statement)">
          <div className="space-y-2">
            <Stage label="Stage 1 — this build" done items={["Citation-grounded retrieval + generation MVP", "Jurisdiction toggle, formulation classifier, ABS helper", "Confidence indicator, abstention, escalation, audit log"]} />
            <Stage label="Stage 2" items={["Relational knowledge graph across statutes (started: see Corpus & sources)", "Agentic multi-step reasoning for compound questions"]} />
            <Stage label="Stage 3" items={["Paid-source connectors with explicit, logged user permission", "Full Bhashini voice experience across more Indian languages"]} />
          </div>
        </Section>

        <p className="text-[11px] text-muted pt-4 border-t border-line">
          Corpus current as of the documents indexed at build time — see Corpus &amp; sources for exact status of each document. Always verify against
          India Code, IP India and the National Biodiversity Authority before relying on any answer for a filing or commercial decision.
        </p>
      </div>
    </Shell>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-neem" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="text-sm text-muted leading-relaxed">{children}</div>
    </div>
  );
}

function Stage({ label, items, done }: { label: string; items: string[]; done?: boolean }) {
  return (
    <div>
      <Pill tone={done ? "neem" : "neutral"}>{label}</Pill>
      <ul className="list-disc pl-5 mt-1.5 space-y-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
