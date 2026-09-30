"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Evidence
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Entre para continuar.</p>
        </header>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-black dark:text-zinc-50">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-black dark:text-zinc-50">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          {state?.error && (
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-12 rounded-full bg-black px-5 text-base font-medium text-white transition-colors disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
