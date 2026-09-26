import type { ExtractedFact } from "./classify";

// Marcas que, no despejo, dizem explicitamente que o texto seguinte é fala do
// interlocutor. O verbatim tem que começar logo depois de uma delas (só espaço,
// dois-pontos, vírgula ou aspas no meio).
export const SPEECH_MARKERS = [
  "falou assim",
  "disse assim",
  "disse que",
  "nas palavras dele",
  "nas palavras dela",
  "com essas palavras",
  "com estas palavras",
];

const QUOTED_SPANS = /"([^"]+)"|“([^”]+)”|«([^»]+)»|‘([^’]+)’/g;

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

// Tira aspas e pontuação das bordas: o modelo às vezes devolve o trecho com as
// aspas ou o ponto final do despejo, às vezes sem.
function core(verbatim: string): string {
  return normalize(verbatim).replace(/^["“«‘\s]+|["”»’\s.,;:!?]+$/g, "");
}

/**
 * Regra 2 depende de verbatim ser fala de verdade. Só aceita o verbatim se ele
 * aparece no despejo (1) dentro de aspas ou (2) logo depois de uma marca de
 * fala. Anotação do autor, resumo e lembrança não passam, mesmo que descrevam
 * o que o interlocutor disse. Na dúvida, false.
 */
export function isMarkedAsSpeech(verbatim: string, rawDump: string): boolean {
  const target = core(verbatim);
  if (!target) return false;
  const dump = normalize(rawDump);

  for (const match of dump.matchAll(QUOTED_SPANS)) {
    const inside = match.slice(1).find((group) => group !== undefined) ?? "";
    if (inside.includes(target)) return true;
  }

  const markerRightBefore = new RegExp(
    `(?:${SPEECH_MARKERS.join("|")})[\\s:,"“«‘—-]*$`
  );
  for (let at = dump.indexOf(target); at !== -1; at = dump.indexOf(target, at + 1)) {
    if (markerRightBefore.test(dump.slice(0, at))) return true;
  }

  return false;
}

/** Zera o verbatim de todo fato cuja citação o despejo não marca como fala. */
export function keepOnlyMarkedVerbatim(
  facts: ExtractedFact[],
  rawDump: string
): ExtractedFact[] {
  return facts.map((fact) =>
    fact.verbatim && !isMarkedAsSpeech(fact.verbatim, rawDump)
      ? { ...fact, verbatim: null }
      : fact
  );
}
