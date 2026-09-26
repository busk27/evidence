import { describe, expect, it } from "vitest";
import { buildOpenQuestions, prepareWrite } from "./persist";
import { extractionSchema, type Extraction } from "@/lib/extraction/schema";

describe("buildOpenQuestions", () => {
  it("prioriza perguntas rejeitadas por regra de negócio sobre next_questions", () => {
    const result = buildOpenQuestions(
      {
        still_empty: ["projetos_por_mes", "preco_testado"],
        next_questions: [
          { field: "projetos_por_mes", question: "Quantos projetos por mês?" },
          { field: "preco_testado", question: "Qual preço foi testado?" },
        ],
      },
      [{ field: "projetos_por_mes", question: "pergunta específica de rejeição" }]
    );

    expect(result).toEqual([
      { field: "projetos_por_mes", question: "pergunta específica de rejeição" },
      { field: "preco_testado", question: "Qual preço foi testado?" },
    ]);
  });

  it("cada pergunta fica amarrada ao campo que ela declara, não à posição", () => {
    const result = buildOpenQuestions(
      {
        still_empty: ["shadowing", "proximo_passo"],
        next_questions: [
          { field: "proximo_passo", question: "Qual o próximo passo?" },
          { field: "shadowing", question: "Posso acompanhar um projeto?" },
        ],
      },
      []
    );

    expect(result).toEqual([
      { field: "proximo_passo", question: "Qual o próximo passo?" },
      { field: "shadowing", question: "Posso acompanhar um projeto?" },
    ]);
  });

  it("não duplica open_questions para o mesmo campo", () => {
    const result = buildOpenQuestions(
      {
        still_empty: ["preco_testado"],
        next_questions: [{ field: "preco_testado", question: "x" }],
      },
      [{ field: "preco_testado", question: "y" }]
    );

    expect(result).toHaveLength(1);
  });

  it("still_empty sem pergunta do modelo ganha pergunta genérica", () => {
    const result = buildOpenQuestions(
      { still_empty: ["acesso_data_room"], next_questions: [] },
      []
    );

    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("acesso_data_room");
  });

  it("não pergunta de campo que virou fato nesta conversa", () => {
    const result = buildOpenQuestions(
      {
        still_empty: [],
        next_questions: [{ field: "preco_testado", question: "Qual preço?" }],
      },
      [],
      new Set(["preco_testado"])
    );

    expect(result).toEqual([]);
  });
});

describe("prepareWrite — P1 e regra 4 juntos, no caso da Ática", () => {
  const dump = `o que mais dói pra ele é organizar os documentos e filtrar o que serve.
isso aqui eu tô escrevendo do que lembro, não peguei a frase exata dele.
preço eu nem cheguei a tocar.`;

  const result = prepareWrite(
    {
      facts: [
        {
          field: "gargalo_frase_literal",
          statement: "O gargalo é organizar documentos e filtrar o que serve.",
          verbatim: "organizar os documentos e filtrar o que serve",
          confidence: "stated",
        },
        {
          field: "preco_testado",
          statement: "O preço não foi abordado na reunião.",
          verbatim: null,
          confidence: "stated",
        },
      ],
      still_empty: [],
      next_questions: [
        { field: "preco_testado", question: "Quanto você pagaria por mês por isso?" },
      ],
    },
    dump
  );

  it("anotação do autor marcada como verbatim não passa pela regra 2", () => {
    expect(result.factsToInsert).toEqual([]);
    expect(result.openQuestionsToInsert.map((q) => q.field)).toContain(
      "gargalo_frase_literal"
    );
  });

  it("ausência vira pergunta, usando a pergunta do modelo para o campo", () => {
    expect(result.openQuestionsToInsert).toContainEqual({
      field: "preco_testado",
      question: "Quanto você pagaria por mês por isso?",
    });
  });
});

describe("prepareWrite — regra 3: nada aqui consegue alterar firms.stage", () => {
  const extraction: Extraction = {
    facts: [
      {
        field: "preco_testado",
        statement: "testou R$ 2.000/mês",
        verbatim: "R$ 2.000 por mês",
        confidence: "stated",
      },
    ],
    still_empty: ["objecao_principal"],
    next_questions: [
      { field: "objecao_principal", question: "Qual foi a objeção principal?" },
    ],
  };

  it("o retorno não tem propriedade stage em nenhum nível", () => {
    const result = prepareWrite(extraction, "despejo de teste");

    expect(JSON.stringify(result)).not.toMatch(/stage/i);
    expect(Object.keys(result)).toEqual([
      "factsToInsert",
      "openQuestionsToInsert",
    ]);
  });

  it("se o modelo injetar 'stage' na resposta, o schema descarta antes de chegar ao classificador", () => {
    const parsed = extractionSchema.parse({
      ...extraction,
      stage: "assinou",
      facts: [{ ...extraction.facts[0], stage: "assinou" }],
    });

    expect(JSON.stringify(parsed)).not.toMatch(/stage/i);
    expect(JSON.stringify(prepareWrite(parsed, "despejo de teste"))).not.toMatch(/stage/i);
  });

  it("fato de campo fora do vocabulário é rejeitado pelo schema", () => {
    const result = extractionSchema.safeParse({
      ...extraction,
      facts: [{ ...extraction.facts[0], field: "stage" }],
    });

    expect(result.success).toBe(false);
  });
});
