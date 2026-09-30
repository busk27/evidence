"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { AppHeader } from "./app-header";

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
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <Link href="/firms" className="header-link">
          Ver firmas →
        </Link>
        <SignOutButton />
      </AppHeader>

      <main className="mx-auto flex w-full max-w-[692px] flex-1 flex-col gap-8 px-5 pt-14 pb-20">
        <header>
          <p className="type-block text-ink-2">
            Despeja a conversa. A gente extrai os fatos e diz o que ainda falta
            saber.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="firm_id" className="type-caption font-semibold text-ink-2">
              ID da firma
            </label>
            <input
              id="firm_id"
              required
              value={firmId}
              onChange={(e) => setFirmId(e.target.value)}
              placeholder="uuid da firma"
              className="field"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contact_id" className="type-caption font-semibold text-ink-2">
              ID do contato <span className="font-normal text-ink-3">(opcional)</span>
            </label>
            <input
              id="contact_id"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder="uuid do contato"
              className="field"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="raw_dump" className="type-caption font-semibold text-ink-2">
              Despejo da conversa
            </label>
            <textarea
              id="raw_dump"
              required
              value={rawDump}
              onChange={(e) => setRawDump(e.target.value)}
              placeholder="Cola ou dita aqui, logo depois da call."
              rows={10}
              className="field"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary self-start">
            {submitting ? "Extraindo…" : "Gravar conversa"}
          </button>
        </form>

        {error && <p className="card type-body text-ink">{error}</p>}

        {result && (
          <section className="card flex flex-col gap-4">
            <p className="type-block text-ink">
              Gravado: {result.facts_recorded.length} fato(s),{" "}
              {result.open_questions_recorded.length} pergunta(s) em aberto.
            </p>
            <ul className="flex flex-col gap-2">
              {result.facts_recorded.map((fact) => (
                <li key={fact.id} className="type-body text-ink">
                  <span className="font-semibold">{fact.field}:</span>{" "}
                  {fact.statement}
                </li>
              ))}
            </ul>
            <Link href={`/firms/${result.conversation.firm_id}`} className="btn-secondary self-start">
              Ver perfil da firma →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}