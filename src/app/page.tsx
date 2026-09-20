"use client";

import { useState } from "react";
import Link from "next/link";

type FactRecorded = {
  id: string;
  field: string;
  statement: string;
  verbatim: string | null;
  confidence: "stated" | "reported";
};

type OpenQuestionRecorded = {
  id: string;
  field: string;
  question: string;
  status: string;
};

type ConversationResponse = {
  conversation: { id: string; firm_id: string };
  facts_recorded: FactRecorded[];
  open_questions_recorded: OpenQuestionRecorded[];
};

type ApiError = { error: string; details?: unknown };

export default function Home() {
  const [firmId, setFirmId] = useState("");
  const [contactId, setContactId] = useState("");
  const [rawDump, setRawDump] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ConversationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firm_id: firmId.trim(),
          contact_id: contactId.trim() || null,
          raw_dump: rawDump,
        }),
      });

      const data = (await res.json()) as ConversationResponse | ApiError;

      if (!res.ok) {
        const err = data as ApiError;
        setError(err.error ?? "Erro ao gravar a conversa.");
        return;
      }

      setResult(data as ConversationResponse);
      setRawDump("");
    } catch {
      setError("Não consegui falar com a API. Tenta de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Evidence
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Despeja a conversa. A gente extrai os fatos e diz o que ainda falta
            saber.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="firm_id" className="text-sm font-medium text-black dark:text-zinc-50">
              ID da firma
            </label>
            <input
              id="firm_id"
              required
              value={firmId}
              onChange={(e) => setFirmId(e.target.value)}
              placeholder="uuid da firma"
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact_id" className="text-sm font-medium text-black dark:text-zinc-50">
              ID do contato <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              id="contact_id"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder="uuid do contato"
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="raw_dump" className="text-sm font-medium text-black dark:text-zinc-50">
              Despejo da conversa
            </label>
            <textarea
              id="raw_dump"
              required
              value={rawDump}
              onChange={(e) => setRawDump(e.target.value)}
              placeholder="Cola ou dita aqui, logo depois da call."
              rows={10}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-full bg-black px-5 text-base font-medium text-white transition-colors disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Extraindo..." : "Gravar conversa"}
          </button>
        </form>

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}

        {result && (
          <section className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950">
            <p className="text-sm font-medium text-black dark:text-zinc-50">
              Gravado: {result.facts_recorded.length} fato(s),{" "}
              {result.open_questions_recorded.length} pergunta(s) em aberto.
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {result.facts_recorded.map((fact) => (
                <li key={fact.id} className="text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">{fact.field}:</span>{" "}
                  {fact.statement}
                </li>
              ))}
            </ul>
            <Link
              href={`/firms/${result.conversation.firm_id}`}
              className="text-sm font-medium underline text-black dark:text-zinc-50"
            >
              Ver perfil da firma →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
