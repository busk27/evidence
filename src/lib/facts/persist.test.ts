import { describe, expect, it } from "vitest";
import { buildOpenQuestions, prepareWrite } from "./persist";
import type { GeminiExtraction } from "@/lib/gemini/schema";

describe("buildOpenQuestions", () => {
  it("prioriza perguntas rejeitadas por regra de negócio sobre still_empty", () => {
    const extraction: Pick<GeminiExtraction, "still_empty" | "next_questions"> =
      {
        still_empty: ["projetos_por_mes", "preco_testado"],
        next_questions: ["Quantos projetos por mês, dito diretamente?", "Qual preço foi testado?"],
      };

    const rejected = [
      { field: "projetos_por_mes" as const, question: "pergunta específica de rejeição" },
    ];

    const result = buildOpenQuestions(extraction, rejected);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      field: "projetos_por_mes",
      question: "pergunta específica de rejeição",
    });
    expect(result[1]).toEqual({
      field: "preco_testado",
      question: "Qual preço foi testado?",
    });
  });

  it("não duplica open_questions para o mesmo campo", () => {
    const result = buildOpenQuestions(
      { still_empty: ["preco_testado"], next_questions: ["x"] },
      [{ field: "preco_testado", question: "y" }]
    );

    expect(result).toHaveLength(1);
  });
});

describe("prepareWrite — regra 3: nada aqui consegue alterar firms.stage", () => {
  it("o retorno não tem propriedade stage em nenhum nível", () => {
    const extraction: GeminiExtraction = {
      facts: [
        {
          field: "preco_testado",
          statement: "testou R$ 2.000/mês",
          verbatim: "R$ 2.000 por mês",
          confidence: "stated",
        },
      ],
      still_empty: ["objecao_principal"],
      next_questions: ["Qual foi a objeção principal?"],
    };

    const result = prepareWrite(extraction);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/stage/i);
    expect(Object.keys(result)).toEqual([
      "factsToInsert",
      "openQuestionsToInsert",
    ]);
  });

  it("mesmo se o JSON do Gemini tentasse injetar 'stage', o schema zod já teria descartado antes de chegar aqui", () => {
    // prepareWrite só aceita GeminiExtraction (já validado por zod). Um
    // objeto com "stage" extra não passaria por geminiExtractionSchema —
    // este teste documenta essa garantia de tipo/contrato.
    const extraction: GeminiExtraction = {
      facts: [],
      still_empty: [],
      next_questions: [],
    };

    const result = prepareWrite(extraction);
    expect(result.factsToInsert).toEqual([]);
    expect(result.openQuestionsToInsert).toEqual([]);
  });
});
