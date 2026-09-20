import {
  COST_FIELDS,
  VERBATIM_REQUIRED_FIELD,
  type FactConfidence,
  type ProfileField,
} from "@/lib/domain";

export type ExtractedFact = {
  field: ProfileField;
  statement: string;
  verbatim: string | null;
  confidence: FactConfidence;
};

export type FactToRecord = {
  field: ProfileField;
  statement: string;
  verbatim: string | null;
  confidence: FactConfidence;
};

export type QuestionToRecord = {
  field: ProfileField;
  question: string;
};

export type ClassifyResult = {
  factsToRecord: FactToRecord[];
  fieldsRejectedAsQuestions: QuestionToRecord[];
};

const REJECTION_QUESTION: Record<string, string> = {
  cost_needs_stated:
    "Qual é o número exato, dito diretamente por quem vive esse número (não repassado por terceiros)?",
  verbatim_missing:
    "Qual foi a frase exata usada para descrever o gargalo? Peça a citação literal.",
};

/**
 * Aplica as três regras de negócio do CLAUDE.md sobre os fatos que o Gemini
 * extraiu. Fatos rejeitados por essas regras não são descartados — viram
 * pergunta para a próxima conversa (open_questions), nunca linha em facts.
 */
export function classifyExtractedFacts(
  facts: ExtractedFact[]
): ClassifyResult {
  const factsToRecord: FactToRecord[] = [];
  const fieldsRejectedAsQuestions: QuestionToRecord[] = [];

  for (const fact of facts) {
    // Regra 2: gargalo_frase_literal exige verbatim preenchido.
    if (
      fact.field === VERBATIM_REQUIRED_FIELD &&
      (!fact.verbatim || fact.verbatim.trim() === "")
    ) {
      fieldsRejectedAsQuestions.push({
        field: fact.field,
        question: REJECTION_QUESTION.verbatim_missing,
      });
      continue;
    }

    // Regra 1: campos de custo só aceitam confidence "stated".
    if (COST_FIELDS.includes(fact.field) && fact.confidence !== "stated") {
      fieldsRejectedAsQuestions.push({
        field: fact.field,
        question: REJECTION_QUESTION.cost_needs_stated,
      });
      continue;
    }

    factsToRecord.push({
      field: fact.field,
      statement: fact.statement,
      verbatim: fact.verbatim,
      confidence: fact.confidence,
    });
  }

  return { factsToRecord, fieldsRejectedAsQuestions };
}
