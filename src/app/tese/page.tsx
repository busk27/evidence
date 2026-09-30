"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "../sign-out-button";
import { AppHeader } from "../app-header";

type Thesis = { text: string; updated_at: string };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ThesisPage() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<Thesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/thesis");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Erro ao carregar a tese.");
        if (cancelled) return;
        setSaved(data.thesis ?? null);
        setText(data.thesis?.text ?? "");
      } catch (err) {
        if (!cancelled) setMessage(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/thesis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar a tese.");
      setSaved(data.thesis);
      setMessage("Tese salva.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
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
        <header className="flex flex-col gap-3">
          <h1 className="type-title text-ink">Tese</h1>
          <p className="type-block font-normal text-ink-2">
            Cada conversa nova é lida por esta tese. Escreva as hipóteses no formato
            &ldquo;H1 — …&rdquo;, uma por linha.
          </p>
        </header>

        {loading ? (
          <p className="type-body text-ink-2">Carregando…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label htmlFor="thesis" className="sr-only">
              Tese
            </label>
            <textarea
              id="thesis"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              rows={16}
              className="field"
            />
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Salvando…" : "Salvar"}
              </button>
              {saved && (
                <span className="type-callout text-ink-2">
                  Salva em {formatDateTime(saved.updated_at)}
                </span>
              )}
            </div>
            {message && (
              <p role="status" className="type-callout text-ink">
                {message}
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
