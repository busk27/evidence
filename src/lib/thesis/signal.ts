import type { ThesisSignal } from "@/lib/domain";

export type ThesisReading = {
  thesis_signal: ThesisSignal | null;
  thesis_reason: string | null;
};

const NONE: ThesisReading = { thesis_signal: null, thesis_reason: null };

// "H2 — ..." no começo da razão. Aceita hífen ou meia-risca e normaliza para travessão.
const REASON_PREFIX = /^H(\d+)\s*[—–-]\s*(\S[\s\S]*)$/;

export const MAX_REASON_LENGTH = 280;

/** Hipóteses que a tese declara, no formato "H1 — ..." no começo de uma linha. */
export function thesisHypotheses(thesis: string): Set<string> {
  const ids = new Set<string>();
  for (const match of thesis.matchAll(/^\s*H(\d+)\s*[—–-]/gm)) ids.add(`H${match[1]}`);
  return ids;
}

/**
 * A classificação é leitura do modelo; esta função decide se ela é aceita.
 * Aceita só quando: há tese; o sinal é um dos três; a razão começa com uma
 * hipótese que a tese declara ("H2 — ..."); e a razão tem uma frase só.
 * Qualquer outra coisa vira sem classificação (Contexto): na dúvida, não
 * encaixa o fato na tese.
 */
export function acceptThesisReading(
  signal: ThesisSignal | null | undefined,
  reason: string | null | undefined,
  thesis: string | null
): ThesisReading {
  if (!thesis || !thesis.trim() || !signal) return NONE;

  const match = (reason ?? "").trim().match(REASON_PREFIX);
  if (!match) return NONE;

  const hypothesis = `H${match[1]}`;
  const declared = thesisHypotheses(thesis);
  if (declared.size > 0 && !declared.has(hypothesis)) return NONE;

  const body = match[2].replace(/\s+/g, " ").trim();
  // Uma frase: nenhum ponto final (ou ! ?) seguido de mais texto.
  if (/[.!?…]\s+\S/.test(body)) return NONE;

  const text = `${hypothesis} — ${body}`;
  if (text.length > MAX_REASON_LENGTH) return NONE;

  return { thesis_signal: signal, thesis_reason: text };
}
