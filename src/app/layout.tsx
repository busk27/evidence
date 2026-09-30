import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Reserva: no Mac e no iPhone a pilha usa a fonte do sistema antes da Inter.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Evidence",
  description: "Registro de conversas de discovery B2B.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
