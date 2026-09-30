"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "../sign-out-button";

type FirmSummary = {
  id: string;
  name: string;
  stage: string;
  country: string | null;
  size: string | null;
  facts_count: number;
  open_questions_count: number;
  last_conversation_on: string | null;
};

type Totals = { firms: number; facts: number; open_questions: number };

function formatDate(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function BigNumber({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span
        className={`text-6xl font-semibold tabular-nums leading-none sm:text-7xl ${
          accent ? "text-amber-600 dark:text-amber-400" : "text-black dark:text-zinc-50"
        }`}
      >
        {value}
      </span>
      <span
        className={`text-sm font-medium sm:text-base ${
          accent ? "text-amber-700 dark:text-amber-300" : "text-zinc-600 dark:text-zinc-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function FirmsPage() {
  const [firms, setFirms] = useState<FirmSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/firms");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Erro ao listar as firmas.");
        if (cancelled) return;
        setFirms(data.firms ?? []);
        setTotals(data.totals ?? null);
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
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Evidence
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            >
              + Novo despejo
            </Link>
            <SignOutButton />
          </div>
        </header>

        {loading && <p className="text-sm text-zinc-500">Carregando...</p>}

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}

        {totals && (
          <section className="grid grid-cols-3 gap-4 py-4">
            <BigNumber value={totals.firms} label="firmas" />
            <BigNumber value={totals.facts} label="fatos gravados" />
            <BigNumber value={totals.open_questions} label="perguntas abertas" accent />
          </section>
        )}

        {!loading && !error && firms.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhuma firma cadastrada ainda.</p>
        )}

        {firms.length > 0 && (
          <ul className="flex flex-col gap-4">
            {firms.map((firm) => (
              <li key={firm.id}>
                <Link
                  href={`/firms/${firm.id}`}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white px-5 py-4 transition-colors hover:border-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-semibold text-black dark:text-zinc-50">
                      {firm.name}
                    </span>
                    <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {firm.stage}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-zinc-700 dark:text-zinc-300">
                    <span>
                      <span className="font-semibold tabular-nums">{firm.facts_count}</span>{" "}
                      {firm.facts_count === 1 ? "fato" : "fatos"}
                    </span>
                    <span className="text-amber-700 dark:text-amber-300">
                      <span className="font-semibold tabular-nums">
                        {firm.open_questions_count}
                      </span>{" "}
                      {firm.open_questions_count === 1 ? "pergunta aberta" : "perguntas abertas"}
                    </span>
                    <span className="text-zinc-500">
                      {firm.last_conversation_on
                        ? `última conversa ${formatDate(firm.last_conversation_on)}`
                        : "sem conversa"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
