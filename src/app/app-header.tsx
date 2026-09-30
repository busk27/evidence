import type { ReactNode } from "react";

// Barra do topo: "Evidence" à esquerda, links à direita.
export function AppHeader({ children }: { children: ReactNode }) {
  return (
    <header className="app-header">
      <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-between gap-6 px-5">
        <span className="type-block text-ink">Evidence</span>
        <nav className="flex items-center gap-6">{children}</nav>
      </div>
    </header>
  );
}
