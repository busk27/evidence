import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

// Barra do topo: logo à esquerda (leva para /firms), links à direita.
export function AppHeader({ children }: { children: ReactNode }) {
  return (
    <header className="app-header">
      <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-between gap-6 px-5">
        <Link href="/firms" className="flex items-center">
          <Image
            src="/brand/evidence-logo.svg"
            alt="Evidence"
            width={147}
            height={22}
            priority
            className="h-[22px] w-auto"
          />
        </Link>
        <nav className="flex items-center gap-6">{children}</nav>
      </div>
    </header>
  );
}
