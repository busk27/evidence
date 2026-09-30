"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "../../sign-out-button";
import { AppHeader } from "../../app-header";
import {
  FACT_CONFIDENCE_LABELS,
  THESIS_SIGNAL_LABELS,
  THESIS_SIGNALS,
  fieldLabel,
  stageLabel,
  type FactConfidence,
  type ThesisSignal,
} from "@/lib/domain";

type Firm = {
  id: string;
  name: string;
  country: string | null;
  size: string | null;
  stage: string;
  created_at: string;
};

type Source = { conversation_id: string; happened_on: string | null };

// Só a versão vigente de cada fato. A cadeia de correção continua no banco e
// na API (replaces, retracted_facts), mas não aparece nesta tela.
type Fact = {
  id: string;
  field: string;
  statement: string;
  verbatim: string | null;
  confidence: FactConfidence;
  thesis_signal: ThesisSignal | null;
  thesis_reason: string | null;
  source: Source;
};

type OpenQuestion = {
  id: string;
  field: string;
  question: string;
  status: string;
};

const SIGNAL_DOT: Record<ThesisSignal, string> = {
  alinhado: "#34c759",
  explorar: "#0071e3",
  atencao: "#ff9500",
};

function formatDate(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function FactCard({ fact }: { fact: Fact }) {
  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <span className="type-caption font-semibold text-ink-2">{fieldLabel(fact.field)}</span>
        {/* Só a exceção ganha selo: o normal é o próprio interlocutor ter dito. */}
        {fact.confidence === "reported" && (
          <span className="type-caption shrink-0 text-accent">
            {FACT_CONFIDENCE_LABELS.reported}
          </span>
        )}
      </div>
      <p className="type-body mt-1 text-ink">{fact.statement}</p>
      {fact.verbatim && (
        <p className="type-body mt-2 text-ink-2">&ldquo;{fact.verbatim}&rdquo;</p>
      )}
      {fact.source.happened_on && (
        <p className="type-callout mt-3 text-ink-2">
          origem: conversa de {formatDate(fact.source.happened_on)}
        </p>
      )}
      {fact.thesis_reason && (
        <p className="type-callout mt-2 text-ink-2">Por quê: {fact.thesis_reason}</p>
      )}
    </li>
  );
}

function SectionTitle({ label, count, dot }: { label: string; count: number; dot?: string }) {
  return (
    <h2 className="type-headline flex items-center gap-3 text-ink">
      {dot && (
        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      )}
      <span>{label}</span>
      <span className="text-ink-3 tabular-nums">{count}</span>
    </h2>
  );
}

export default function FirmPage() {
  const params = useParams<{ id: string }>();
  const firmId = params.id;

  const [firm, setFirm] = useState<Firm | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firmId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [firmRes, questionsRes] = await Promise.all([
          fetch(`/api/firms/${firmId}`),
          fetch(`/api/firms/${firmId}/open-questions`),
        ]);

        if (!firmRes.ok) {
          const body = await firmRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Firma não encontrada.");
        }
        const firmData = await firmRes.json();
        const questionsData = questionsRes.ok
          ? await questionsRes.json()
          : { open_questions: [] };

        if (cancelled) return;
        setFirm(firmData.firm);
        setFacts(firmData.facts ?? []);
        setOpenQuestions(questionsData.open_questions ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [firmId]);

  const context = facts.filter((fact) => !fact.thesis_signal);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <Link href="/" className="header-link">
          ← Novo despejo
        </Link>
        <Link href="/tese" className="header-link">
          Tese
        </Link>
        <SignOutButton />
      </AppHeader>

      <main className="mx-auto flex w-full max-w-[692px] flex-1 flex-col gap-14 px-5 pt-14 pb-20">
        {loading && <p className="type-body text-ink-2">Carregando…</p>}

        {error && <p className="card type-body text-ink">{error}</p>}

        {firm && (
          <>
            <header className="flex flex-col gap-3">
              <h1 className="type-title text-ink">{firm.name}</h1>
              <p className="type-body flex flex-wrap items-center gap-x-3 gap-y-2 text-ink-2">
                <span className="pill">{stageLabel(firm.stage)}</span>
                {firm.country && <span>{firm.country}</span>}
                {firm.size && <span>{firm.size}</span>}
              </p>
            </header>

            {facts.length === 0 && (
              <p className="type-body text-ink-2">Nenhum fato gravado ainda.</p>
            )}

            {THESIS_SIGNALS.map((signal) => {
              const inSection = facts.filter((fact) => fact.thesis_signal === signal);
              return (
                <section key={signal} className="flex flex-col gap-4">
                  <SectionTitle
                    label={THESIS_SIGNAL_LABELS[signal]}
                    count={inSection.length}
                    dot={SIGNAL_DOT[signal]}
                  />
                  {inSection.length === 0 ? (
                    <p className="type-callout text-ink-3">Nenhum fato nesta leitura.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {inSection.map((fact) => (
                        <FactCard key={fact.id} fact={fact} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}

            {context.length > 0 && (
              <details className="group flex flex-col gap-4">
                <summary className="type-headline flex cursor-pointer list-none items-center gap-3 text-ink [&::-webkit-details-marker]:hidden">
                  <span>Contexto</span>
                  <span className="text-ink-3 tabular-nums">{context.length}</span>
                  <span aria-hidden className="type-body text-ink-3 transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <ul className="mt-4 flex flex-col gap-3">
                  {context.map((fact) => (
                    <FactCard key={fact.id} fact={fact} />
                  ))}
                </ul>
              </details>
            )}

            <section className="flex flex-col gap-4">
              <h2 className="type-headline text-ink">Perguntas da próxima conversa</h2>
              {openQuestions.length === 0 && (
                <p className="type-body text-ink-2">Nada em aberto.</p>
              )}
              <ol className="flex flex-col gap-3">
                {openQuestions.map((q) => (
                  <li key={q.id} className="card">
                    <span className="type-caption font-semibold text-ink-2">
                      {fieldLabel(q.field)}
                    </span>
                    <p className="type-body mt-1 text-ink">{q.question}</p>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
