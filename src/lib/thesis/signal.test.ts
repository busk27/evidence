import { describe, expect, it } from "vitest";
import { acceptThesisReading, thesisHypotheses } from "./signal";

// Tese de teste, inventada. A tese real fica só no banco.
const THESIS = `Uma tese qualquer de teste.

H1 — Primeira hipótese de teste.
H2 — Segunda hipótese de teste.`;

describe("thesisHypotheses", () => {
  it("lê as hipóteses declaradas no começo de linha", () => {
    expect([...thesisHypotheses(THESIS)]).toEqual(["H1", "H2"]);
  });
});

describe("acceptThesisReading", () => {
  it("aceita sinal com razão no formato H<n> — uma frase", () => {
    expect(acceptThesisReading("alinhado", "H1 — o sócio confirmou o ponto.", THESIS)).toEqual({
      thesis_signal: "alinhado",
      thesis_reason: "H1 — o sócio confirmou o ponto.",
    });
  });

  it("normaliza hífen para travessão", () => {
    expect(acceptThesisReading("explorar", "H2 - falta o número", THESIS).thesis_reason).toBe(
      "H2 — falta o número"
    );
  });

  it("sem sinal, fica sem classificação (não força encaixe)", () => {
    expect(acceptThesisReading(null, "H1 — algo", THESIS)).toEqual({
      thesis_signal: null,
      thesis_reason: null,
    });
  });

  it("sem tese salva, nada é classificado", () => {
    expect(acceptThesisReading("alinhado", "H1 — algo", null).thesis_signal).toBeNull();
    expect(acceptThesisReading("alinhado", "H1 — algo", "   ").thesis_signal).toBeNull();
  });

  it("razão que não começa pela hipótese é recusada", () => {
    expect(acceptThesisReading("atencao", "Porque o sócio disse isso.", THESIS).thesis_signal).toBeNull();
  });

  it("hipótese que a tese não declara é recusada", () => {
    expect(acceptThesisReading("alinhado", "H9 — hipótese inventada.", THESIS).thesis_signal).toBeNull();
  });

  it("mais de uma frase é recusada", () => {
    expect(
      acceptThesisReading("alinhado", "H1 — primeira frase. Segunda frase.", THESIS).thesis_signal
    ).toBeNull();
  });

  it("razão longa demais é recusada", () => {
    expect(acceptThesisReading("alinhado", `H1 — ${"a".repeat(400)}`, THESIS).thesis_signal).toBeNull();
  });
});
