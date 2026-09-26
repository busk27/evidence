import { describe, expect, it } from "vitest";
import { isMarkedAsSpeech, keepOnlyMarkedVerbatim } from "./verbatim";
import type { ExtractedFact } from "./classify";

// Trechos do despejo real da Ática (25/09/2026), com as quebras de linha dele.
const DUMP = `acabei de sair da reunião com o André Lima, da Ática, firma dele de financial
due diligence. foi presencial, não gravei. ele é dono e faz a DD ele mesmo com
um sênior que ajuda em alguns projetos, é o primeiro do pipeline que põe a mão
na massa, os outros só decidem. cheguei nele pela rede do meu pai, ele passou
pela KPMG e depois trabalhou com ele.

o que mais dói pra ele é organizar os documentos e filtrar o que serve antes de
conseguir começar a análise, e o cliente manda documento errado e ele tem que
conferir tudo na mão. isso aqui eu tô escrevendo do que lembro, não peguei a
frase exata dele.

ele já usa IA, Claude pra gerar parte do documento final e pra cruzar
informação no meio da análise, e Taxcel pro tax. mas sobre isso ele falou com
essas palavras: "ainda não é automatizado".

perguntei se ele conseguiria pegar mais projetos com a mesma equipe do jeito
que trabalha hoje e ele disse que não, ficaria sobrecarregado.`;

describe("P1: verbatim só vale quando o despejo marca como fala", () => {
  // Os "verbatims" que o modelo gravou na Ática e que eram anotação do autor.
  it.each([
    "é dono e faz a DD ele mesmo com um sênior que ajuda em alguns projetos",
    "cheguei nele pela rede do meu pai, ele passou pela KPMG e depois trabalhou com ele.",
    "o cliente manda documento errado e ele tem que conferir tudo na mão.",
    "Claude pra gerar parte do documento final e pra cruzar informação no meio da análise",
    "Taxcel pro tax.",
  ])("anotação do autor não é verbatim: %s", (verbatim) => {
    expect(isMarkedAsSpeech(verbatim, DUMP)).toBe(false);
  });

  it("aceita texto entre aspas, com ou sem as aspas no verbatim", () => {
    expect(isMarkedAsSpeech("ainda não é automatizado", DUMP)).toBe(true);
    expect(isMarkedAsSpeech('"ainda não é automatizado".', DUMP)).toBe(true);
  });

  it("aceita texto logo depois de uma marca de fala", () => {
    expect(isMarkedAsSpeech("não, ficaria sobrecarregado", DUMP)).toBe(true);
  });

  it("recusa texto que vem depois da marca mas não colado nela", () => {
    expect(isMarkedAsSpeech("ficaria sobrecarregado", DUMP)).toBe(false);
  });

  it("recusa verbatim que não aparece no despejo", () => {
    expect(isMarkedAsSpeech("a gente perde um dia inteiro conferindo", DUMP)).toBe(false);
  });

  it("recusa verbatim vazio", () => {
    expect(isMarkedAsSpeech("  ", DUMP)).toBe(false);
  });

  it("keepOnlyMarkedVerbatim zera só o verbatim sem marca, mantendo o fato", () => {
    const facts: ExtractedFact[] = [
      {
        field: "quem_opera_dd",
        statement: "André faz a DD com um sênior.",
        verbatim: "ele é dono e faz a DD ele mesmo",
        confidence: "stated",
      },
      {
        field: "ia_em_uso",
        statement: "André diz que ainda não é automatizado.",
        verbatim: "ainda não é automatizado",
        confidence: "stated",
      },
    ];

    expect(keepOnlyMarkedVerbatim(facts, DUMP)).toEqual([
      { ...facts[0], verbatim: null },
      facts[1],
    ]);
  });
});
