"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "../../sign-out-button";
import { AppHeader } from "../../app-header";
import {
  FACT_CONFIDENCE_LABELS,
  fieldLabel,
  stageLabel,
  type FactConfidence,
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

type WrongFact = {
  id: string;
  field: string;
  statement: string;
  verbatim: string | null;
  confidence: FactConfidence;
  status_reason: string | null;
  status_changed_at: string | null;
  source: Source;
};

type Fact = {
  id: string;
  field: string;
  statement: string;
  verbatim: string | null;
  confidence: FactConfidence;
  replaces: WrongFact[];
  source: Source;
};

type RetractedFact = WrongFact & { replaces: WrongFact[] };

type OpenQuestion = {
  id: string;
  field: string;
  question: string;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function FieldLabel({ field }: { field: string }) {
  return <span className="type-caption font-semibold text-ink-2">{fieldLabel(field)}</span>;
}

function ConfidenceBadge({ confidence }: { confidence: FactConfidence }) {
  return (
    <span
      className={`type-caption shrink-0 ${
        confidence === "stated" ? "text-ink-3" : "text-accent"
      }`}
    >
      {FACT_CONFIDENCE_LABELS[confidence] ?? confidence}
    </span>
  );
}

function Origin({ source }: { source: Source }) {
  if (!source.happened_on) return null;
  return (
    <p className="type-callout mt-3 text-ink-2">
      origem: conversa de {formatDate(source.happened_on)}
    </p>
  );
}

// Versão antiga de um fato: texto riscado e o motivo de ter saído.
function OldVersion({ fact, label }: { fact: WrongFact; label: string }) {
  return (
    <div className="rounded-xl bg-canvas p-4">
      <p className="type-caption font-semibold text-alert">
        {label}
        {fact.status_changed_at && ` em ${formatDate(fact.status_changed_at)}`}
      </p>
      <p className="type-body mt-1 text-ink-3 line-through">{fact.statement}</p>
      {fact.verbatim && (
        <p className="type-body mt-1 text-ink-3 line-through">&ldquo;{fact.verbatim}&rdquo;</p>
      )}
      {fact.status_reason && (
        <p className="type-callout mt-2 text-ink-2">Motivo: {fact.status_reason}</p>
      )}
    </div>
  );
}
export default function FirmPage() {
  const params = useParams<{ id: string }>();
  const firmId = params.id;

  const [firm, setFirm] = useState<Firm | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [retracted, setRetracted] = useState<RetractedFact[]>([]);
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
        setRetracted(firmData.retracted_facts ?? []);
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

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <Link href="/" className="header-link">
          ← Novo despejo
        </Link>
        <SignOutButton />
      </AppHeader>

      <main className="mx-auto flex w-full max-w-[692px] flex-1 flex-col gap-12 px-5 pt-14 pb-20">
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

            <section className="flex flex-col gap-4">
              <h2 className="type-block text-ink">O que se sabe</h2>
              {facts.length === 0 && (
                <p className="type-body text-ink-2">Nenhum fato gravado ainda.</p>
              )}
              <ul className="flex flex-col gap-3">
                {facts.map((fact) => (
                  <li key={fact.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <FieldLabel field={fact.field} />
                      <ConfidenceBadge confidence={fact.confidence} />
                    </div>
                    {fact.replaces.length > 0 && (
                      <p className="type-caption mt-2 font-semibold text-accent">
                        Versão corrigida
                      </p>
                    )}
                    <p className="type-body mt-1 text-ink">{fact.statement}</p>
                    {fact.verbatim && (
                      <p className="type-body mt-2 text-ink-2">&ldquo;{fact.verbatim}&rdquo;</p>
                    )}
                    <Origin source={fact.source} />
                    {fact.replaces.length > 0 && (
                      <div className="mt-4 flex flex-col gap-3">
                        {fact.replaces.map((old) => (
                          <OldVersion key={old.id} fact={old} label="Substituído" />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {retracted.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="type-block text-ink">Marcados como errados</h2>
                <ul className="flex flex-col gap-3">
                  {retracted.map((fact) => (
                    <li key={fact.id} className="card">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <FieldLabel field={fact.field} />
                        <ConfidenceBadge confidence={fact.confidence} />
                      </div>
                      <OldVersion fact={fact} label="Marcado como errado" />
                      <Origin source={fact.source} />
                      {fact.replaces.length > 0 && (
                        <div className="mt-4 flex flex-col gap-3">
                          {fact.replaces.map((old) => (
                            <OldVersion key={old.id} fact={old} label="Substituído" />
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-4">
              <h2 className="type-block text-ink">Perguntas da próxima conversa</h2>
              {openQuestions.length === 0 && (
                <p className="type-body text-ink-2">Nada em aberto.</p>
              )}
              <ol className="flex flex-col gap-3">
                {openQuestions.map((q) => (
                  <li key={q.id} className="card">
                    <FieldLabel field={q.field} />
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