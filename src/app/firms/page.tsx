"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "../sign-out-button";
import { AppHeader } from "../app-header";
import { stageLabel } from "@/lib/domain";

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
    <div className="flex flex-col items-center text-center">
      <span className={`type-hero tabular-nums ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </span>
      <span className="type-body mt-3 text-ink-2">{label}</span>
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
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <Link href="/" className="header-link">
          Novo despejo
        </Link>
        <SignOutButton />
      </AppHeader>

      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col px-5 pb-20">
        {loading && <p className="type-body pt-20 text-center text-ink-2">Carregando…</p>}

        {error && (
          <p className="card type-body mt-12 text-ink">{error}</p>
        )}

        {totals && (
          <section className="grid grid-cols-3 gap-4 py-20">
            <BigNumber value={totals.firms} label="firmas" />
            <BigNumber value={totals.facts} label="fatos gravados" />
            <BigNumber value={totals.open_questions} label="perguntas abertas" accent />
          </section>
        )}

        {!loading && !error && firms.length === 0 && (
          <p className="type-body text-center text-ink-2">Nenhuma firma cadastrada ainda.</p>
        )}

        {firms.length > 0 && (
          <section className="mx-auto w-full max-w-[692px]">
            <ul className="grouped-list">
              {firms.map((firm) => (
                <li key={firm.id}>
                  <Link href={`/firms/${firm.id}`} className="grouped-row">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="type-body font-semibold text-ink">{firm.name}</span>
                        <span className="pill">{stageLabel(firm.stage)}</span>
                      </div>
                      <div className="type-callout flex flex-wrap gap-x-3 text-ink-2">
                        <span>
                          <span className="tabular-nums">{firm.facts_count}</span>{" "}
                          {firm.facts_count === 1 ? "fato" : "fatos"}
                        </span>
                        <span className="text-accent">
                          <span className="tabular-nums">{firm.open_questions_count}</span>{" "}
                          {firm.open_questions_count === 1 ? "pergunta aberta" : "perguntas abertas"}
                        </span>
                        <span>
                          {firm.last_conversation_on
                            ? `última conversa ${formatDate(firm.last_conversation_on)}`
                            : "sem conversa"}
                        </span>
                      </div>
                    </div>
                    <span aria-hidden className="text-[22px] leading-none text-ink-3">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}