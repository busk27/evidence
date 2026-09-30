"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "../../sign-out-button";
import {
  FACT_CONFIDENCE_LABELS,
  fieldLabel,
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
  return (
    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
      {fieldLabel(field)}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: FactConfidence }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        confidence === "stated"
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {FACT_CONFIDENCE_LABELS[confidence] ?? confidence}
    </span>
  );
}

function Origin({ source }: { source: Source }) {
  if (!source.happened_on) return null;
  return (
    <p className="mt-3 text-base font-medium text-zinc-800 dark:text-zinc-200">
      origem: conversa de {formatDate(source.happened_on)}
    </p>
  );
}

// Versão antiga de um fato: texto riscado e o motivo de ter saído.
function OldVersion({ fact, label }: { fact: WrongFact; label: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
        {label}
        {fact.status_changed_at && ` em ${formatDate(fact.status_changed_at)}`}
      </p>
      <p className="mt-1 text-sm text-zinc-600 line-through decoration-red-500 dark:text-zinc-400">
        {fact.statement}
      </p>
      {fact.verbatim && (
        <p className="mt-1 text-sm italic text-zinc-500 line-through decoration-red-500">
          &ldquo;{fact.verbatim}&rdquo;
        </p>
      )}
      {fact.status_reason && (
        <p className="mt-1 text-sm text-red-800 dark:text-red-200">
          <span className="font-semibold">Motivo:</span> {fact.status_reason}
        </p>
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
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-zinc-50"
          >
            ← Novo despejo
          </Link>
          <SignOutButton />
        </div>

        {loading && <p className="text-sm text-zinc-500">Carregando...</p>}

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}

        {firm && (
          <>
            <header>
              <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
                {firm.name}
              </h1>
              <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 dark:bg-zinc-800">
                  {firm.stage}
                </span>
                {firm.country && <span>{firm.country}</span>}
                {firm.size && <span>{firm.size}</span>}
              </p>
            </header>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                O que se sabe
              </h2>
              {facts.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum fato gravado ainda.</p>
              )}
              <ul className="flex flex-col gap-3">
                {facts.map((fact) => (
                  <li
                    key={fact.id}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <FieldLabel field={fact.field} />
                      <ConfidenceBadge confidence={fact.confidence} />
                    </div>
                    {fact.replaces.length > 0 && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                        Versão corrigida
                      </p>
                    )}
                    <p className="mt-1 text-sm text-black dark:text-zinc-50">
                      {fact.statement}
                    </p>
                    {fact.verbatim && (
                      <p className="mt-1 text-sm italic text-zinc-500">
                        &ldquo;{fact.verbatim}&rdquo;
                      </p>
                    )}
                    <Origin source={fact.source} />
                    {fact.replaces.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
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
              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                  Marcados como errados
                </h2>
                <ul className="flex flex-col gap-3">
                  {retracted.map((fact) => (
                    <li
                      key={fact.id}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <FieldLabel field={fact.field} />
                        <ConfidenceBadge confidence={fact.confidence} />
                      </div>
                      <OldVersion fact={fact} label="Marcado como errado" />
                      <Origin source={fact.source} />
                      {fact.replaces.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
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

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                Perguntas da próxima conversa
              </h2>
              {openQuestions.length === 0 && (
                <p className="text-sm text-zinc-500">Nada em aberto.</p>
              )}
              <ol className="flex flex-col gap-2">
                {openQuestions.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <FieldLabel field={q.field} />
                    <p className="mt-1 text-black dark:text-zinc-50">
                      {q.question}
                    </p>
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
