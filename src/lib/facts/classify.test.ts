import { describe, expect, it } from "vitest";
import { classifyExtractedFacts, type ExtractedFact } from "./classify";

function fact(overrides: Partial<ExtractedFact>): ExtractedFact {
  return {
    field: "interlocutor",
    statement: "default statement",
    verbatim: null,
    confidence: "stated",
    ...overrides,
  };
}

describe("regra 1: campos de custo exigem confidence stated", () => {
  const costFields = [
    "horas_do_gargalo_por_projeto",
    "de_quem_sao_as_horas",
    "projetos_por_mes",
    "destino_da_hora_economizada",
  ] as const;

  it.each(costFields)("%s com confidence reported vira open_question, não fact", (field) => {
    const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts([
      fact({ field, confidence: "reported", statement: "40 horas por projeto" }),
    ]);

    expect(factsToRecord).toHaveLength(0);
    expect(fieldsRejectedAsQuestions).toHaveLength(1);
    expect(fieldsRejectedAsQuestions[0].field).toBe(field);
  });

  it.each(costFields)("%s com confidence stated grava em facts", (field) => {
    const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts([
      fact({ field, confidence: "stated", statement: "40 horas por projeto" }),
    ]);

    expect(factsToRecord).toHaveLength(1);
    expect(fieldsRejectedAsQuestions).toHaveLength(0);
  });

  it("campo que não é de custo aceita confidence reported normalmente", () => {
    const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts([
      fact({ field: "objecao_principal", confidence: "reported" }),
    ]);

    expect(factsToRecord).toHaveLength(1);
    expect(fieldsRejectedAsQuestions).toHaveLength(0);
  });
});

describe("regra 2: gargalo_frase_literal exige verbatim", () => {
  it("sem verbatim vira open_question, não fact", () => {
    const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts([
      fact({ field: "gargalo_frase_literal", verbatim: null, confidence: "stated" }),
    ]);

    expect(factsToRecord).toHaveLength(0);
    expect(fieldsRejectedAsQuestions).toHaveLength(1);
  });

  it("verbatim vazio (string em branco) também vira open_question", () => {
    const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts([
      fact({ field: "gargalo_frase_literal", verbatim: "   ", confidence: "stated" }),
    ]);

    expect(factsToRecord).toHaveLength(0);
    expect(fieldsRejectedAsQuestions).toHaveLength(1);
  });

  it("com verbatim preenchido grava em facts", () => {
    const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts([
      fact({
        field: "gargalo_frase_literal",
        verbatim: "a gente perde um dia inteiro só conferindo endereço",
        confidence: "stated",
      }),
    ]);

    expect(factsToRecord).toHaveLength(1);
    expect(fieldsRejectedAsQuestions).toHaveLength(0);
  });
});

describe("fatos que passam nas duas regras", () => {
  it("gravam em facts preservando os campos originais", () => {
    const { factsToRecord } = classifyExtractedFacts([
      fact({
        field: "preco_testado",
        statement: "testou R$ 2.000/mês",
        verbatim: "R$ 2.000 por mês",
        confidence: "stated",
      }),
    ]);

    expect(factsToRecord[0]).toEqual({
      field: "preco_testado",
      statement: "testou R$ 2.000/mês",
      verbatim: "R$ 2.000 por mês",
      confidence: "stated",
    });
  });
});
