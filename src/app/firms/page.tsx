"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "../sign-out-button";
import { AppHeader } from "../app-header";
import {
  THESIS_SIGNAL_LABELS,
  THESIS_SIGNALS,
  stageLabel,
  type ThesisSignal,
} from "@/lib/domain";

type FirmSummary = {
  id: string;
  name: string;
  stage: string;
  country: string | null;
  size: string | null;
  facts_count: number;
  open_questions_count: number;
  thesis_counts: Record<ThesisSignal, number>;
  last_conversation_on: string | null;
};

type Totals = Record<ThesisSignal, number>;

const SIGNAL_DOT: Record<ThesisSignal, string> = {
  alinhado: "#34c759",
  explorar: "#0071e3",
  atencao: "#ff9500",
};

function Dot({ signal }: { signal: ThesisSignal }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: SIGNAL_DOT[signal] }}
    />
  );
}

function formatDate(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function BigNumber({ value, signal }: { value: number; signal: ThesisSignal }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="type-hero tabular-nums text-ink">{value}</span>
      <span className="type-body mt-3 flex items-center gap-2 text-ink-2">
        <Dot signal={signal} />
        {THESIS_SIGNAL_LABELS[signal]}
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
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <Link href="/" className="header-link">
          Novo despejo
        </Link>
        <Link href="/tese" className="header-link">
          Tese
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
            {THESIS_SIGNALS.map((signal) => (
              <BigNumber key={signal} value={totals[signal] ?? 0} signal={signal} />
            ))}
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
                        {THESIS_SIGNALS.map((signal) => (
                          <span key={signal} className="flex items-center gap-1.5">
                            <Dot signal={signal} />
                            <span className="tabular-nums">{firm.thesis_counts?.[signal] ?? 0}</span>{" "}
                            {THESIS_SIGNAL_LABELS[signal].toLowerCase()}
                          </span>
                        ))}
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