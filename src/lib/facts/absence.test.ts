import { describe, expect, it } from "vitest";
import { isAbsenceStatement } from "./absence";
import { classifyExtractedFacts } from "./classify";

describe("regra 4: ausência não é fato", () => {
  it.each([
    // Os dois gravados como fato na conversa da Ática (25/09/2026).
    "O preço não foi abordado na reunião.",
    "O interlocutor não pediu para acompanhar uma DD.",
    "Preço eu nem cheguei a tocar.",
    "Não pedi shadowing.",
    "Não perguntei sobre data room.",
    "André não quis falar o volume.",
    "Custo da hora não conseguimos levantar.",
  ])("reconhece ausência: %s", (statement) => {
    expect(isAbsenceStatement(statement)).toBe(true);
  });

  it.each([
    "André não usa IA para organizar documentos.",
    "André disse que não conseguiria pegar mais projetos com a mesma equipe.",
    "André disse que o processo ainda não é automatizado.",
    "Testou R$ 2.000 por mês e achou caro.",
  ])("não confunde negativa sobre a firma com ausência: %s", (statement) => {
    expect(isAbsenceStatement(statement)).toBe(false);
  });

  it("fato de ausência não grava: o campo fica vazio para virar pergunta", () => {
    const result = classifyExtractedFacts([
      {
        field: "preco_testado",
        statement: "O preço não foi abordado na reunião.",
        verbatim: null,
        confidence: "stated",
      },
      {
        field: "proximo_passo",
        statement: "André se ofereceu para testar quando houver piloto.",
        verbatim: null,
        confidence: "stated",
      },
    ]);

    expect(result.factsToRecord.map((f) => f.field)).toEqual(["proximo_passo"]);
    expect(result.fieldsLeftEmpty).toEqual(["preco_testado"]);
    expect(result.fieldsRejectedAsQuestions).toEqual([]);
  });
});
