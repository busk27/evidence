import { describe, expect, it } from "vitest";
import { checkCorrection, correctSchema, retractSchema } from "./revise";

const DUMP = `cheguei nele pela rede do meu pai, ele passou
pela KPMG e depois trabalhou com ele.
mas sobre isso ele falou com essas palavras: "ainda não é automatizado".`;

describe("correção passa pelas mesmas regras que a extração", () => {
  it("correção limpa é aceita (caso KPMG da Ática)", () => {
    const result = checkCorrection(
      "origem_do_contato",
      {
        reason: "Quem passou pela KPMG foi o André, não o pai.",
        statement: "Contato veio pela rede do pai do autor; André passou pela KPMG e depois trabalhou com o pai.",
        verbatim: null,
        confidence: "stated",
      },
      DUMP
    );

    expect(result).toEqual({
      ok: true,
      fact: {
        field: "origem_do_contato",
        statement: "Contato veio pela rede do pai do autor; André passou pela KPMG e depois trabalhou com o pai.",
        verbatim: null,
        confidence: "stated",
      },
    });
  });

  it("trava de verbatim: anotação do autor como verbatim é recusada", () => {
    const result = checkCorrection(
      "origem_do_contato",
      { reason: "x", statement: "André passou pela KPMG.", verbatim: "ele passou pela KPMG", confidence: "stated" },
      DUMP
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/verbatim/);
  });

  it("trava de verbatim: trecho entre aspas é aceito", () => {
    const result = checkCorrection(
      "ia_em_uso",
      { reason: "x", statement: "André diz que ainda não é automatizado.", verbatim: "ainda não é automatizado", confidence: "stated" },
      DUMP
    );
    expect(result.ok).toBe(true);
  });

  it("regra 2: corrigir gargalo_frase_literal sem verbatim é recusado", () => {
    const result = checkCorrection(
      "gargalo_frase_literal",
      { reason: "x", statement: "Organizar documentos.", verbatim: null, confidence: "stated" },
      DUMP
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Regra 2/);
  });

  it("regra 1: corrigir campo de custo com confidence reported é recusado", () => {
    const result = checkCorrection(
      "projetos_por_mes",
      { reason: "x", statement: "1 a 2 projetos por mês, segundo o Paulo.", verbatim: null, confidence: "reported" },
      DUMP
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Regra 1/);
  });

  it("regra 4: corrigir para uma ausência é recusado e aponta para retract", () => {
    const result = checkCorrection(
      "preco_testado",
      { reason: "x", statement: "O preço não foi abordado.", verbatim: null, confidence: "stated" },
      DUMP
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/retract/);
  });
});

describe("corpo dos endpoints", () => {
  it("retract exige reason", () => {
    expect(retractSchema.safeParse({}).success).toBe(false);
    expect(retractSchema.safeParse({ reason: "  " }).success).toBe(false);
    expect(retractSchema.safeParse({ reason: "leitura errada" }).success).toBe(true);
  });

  it("correct não aceita trocar o campo nem mexer em stage", () => {
    const base = { reason: "x", statement: "y", confidence: "stated" };
    expect(correctSchema.safeParse(base).success).toBe(true);
    expect(correctSchema.safeParse({ ...base, field: "ia_em_uso" }).success).toBe(false);
    expect(correctSchema.safeParse({ ...base, stage: "assinou" }).success).toBe(false);
  });
});
