"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center gap-10 px-5 py-16">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="type-title text-ink">Evidence</h1>
          <p className="type-block font-normal text-ink-2">Entre para continuar.</p>
        </header>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="type-caption font-semibold text-ink-2">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="type-caption font-semibold text-ink-2">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="field"
            />
          </div>

          {state?.error && (
            <p role="alert" className="type-callout text-center text-ink">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary mt-2 w-full">
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
