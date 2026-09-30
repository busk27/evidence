import { describe, expect, it } from "vitest";
import { prepareWrite } from "@/lib/facts/persist";

// Tese de teste, inventada. A tese real fica só no banco.
const THESIS = `Tese de teste.
H1 — Hipótese um.
H2 — Hipótese dois.`;

const DUMP = `ele disse que "leva uns 30% do tempo".
anotação minha: acho que ele pagaria.`;

const extraction = {
  facts: [
    {
      field: "horas_do_gargalo_por_projeto" as const,
      statement: "Leva uns 30% do tempo do projeto.",
      verbatim: "leva uns 30% do tempo",
      confidence: "stated" as const,
      thesis_signal: "alinhado" as const,
      thesis_reason: "H1 — ele estimou 30% do tempo nessa etapa.",
    },
    {
      field: "reacao_ao_preco" as const,
      statement: "Pagaria pela preparação.",
      verbatim: "acho que ele pagaria",
      confidence: "stated" as const,
      thesis_signal: "alinhado" as const,
      thesis_reason: "Porque parece disposto a pagar.",
    },
  ],
  still_empty: [],
  next_questions: [],
};

describe("prepareWrite com tese", () => {
  const { factsToInsert } = prepareWrite(extraction, DUMP, THESIS);

  it("leitura no formato H<n> — uma frase é gravada junto com o fato", () => {
    expect(factsToInsert[0]).toMatchObject({
      thesis_signal: "alinhado",
      thesis_reason: "H1 — ele estimou 30% do tempo nessa etapa.",
    });
  });

  it("leitura fora do formato fica sem classificação, mas o fato grava", () => {
    expect(factsToInsert[1]).toMatchObject({
      field: "reacao_ao_preco",
      thesis_signal: null,
      thesis_reason: null,
    });
  });

  it("a trava de verbatim continua valendo: anotação do autor não vira citação", () => {
    expect(factsToInsert[0].verbatim).toBe("leva uns 30% do tempo");
    expect(factsToInsert[1].verbatim).toBeNull();
  });

  it("sem tese salva, nenhum fato é classificado", () => {
    const withoutThesis = prepareWrite(extraction, DUMP, null).factsToInsert;
    expect(withoutThesis.every((f) => f.thesis_signal === null && f.thesis_reason === null)).toBe(true);
  });
});
