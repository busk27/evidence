"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Firm = {
  id: string;
  name: string;
  country: string | null;
  size: string | null;
  stage: string;
  created_at: string;
};

type Fact = {
  id: string;
  field: string;
  statement: string;
  verbatim: string | null;
  confidence: "stated" | "reported";
  source: { conversation_id: string; happened_on: string | null };
};

type OpenQuestion = {
  id: string;
  field: string;
  question: string;
  status: string;
};

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

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-zinc-50"
        >
          ← Novo despejo
        </Link>

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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {fact.field}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          fact.confidence === "stated"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {fact.confidence}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-black dark:text-zinc-50">
                      {fact.statement}
                    </p>
                    {fact.verbatim && (
                      <p className="mt-1 text-sm italic text-zinc-500">
                        &ldquo;{fact.verbatim}&rdquo;
                      </p>
                    )}
                    {fact.source.happened_on && (
                      <p className="mt-2 text-xs text-zinc-400">
                        origem: conversa de {fact.source.happened_on}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                Perguntas da próxima conversa
              </h2>
              {openQuestions.length === 0 && (
                <p className="text-sm text-zinc-500">Nada em aberto.</p>
              )}
              <ol className="flex flex-col gap-2">
                {openQuestions.slice(0, 3).map((q) => (
                  <li
                    key={q.id}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {q.field}
                    </span>
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
