import {
  COST_FIELDS,
  VERBATIM_REQUIRED_FIELD,
  type FactConfidence,
  type ProfileField,
} from "@/lib/domain";
import { isAbsenceStatement } from "./absence";

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
  // Regra 4: campos cujo "fato" era só a ausência do assunto na conversa.
  // Ficam vazios e entram na lista de campos a perguntar.
  fieldsLeftEmpty: ProfileField[];
};

const REJECTION_QUESTION: Record<string, string> = {
  cost_needs_stated:
    "Qual é o número exato, dito diretamente por quem vive esse número (não repassado por terceiros)?",
  verbatim_missing:
    "Qual foi a frase exata usada para descrever o gargalo? Peça a citação literal.",
};

/**
 * Aplica as regras de negócio do CLAUDE.md sobre os fatos que o modelo
 * extraiu. Fatos rejeitados por essas regras não são descartados — viram
 * pergunta para a próxima conversa (open_questions), nunca linha em facts.
 */
export function classifyExtractedFacts(
  facts: ExtractedFact[]
): ClassifyResult {
  const factsToRecord: FactToRecord[] = [];
  const fieldsRejectedAsQuestions: QuestionToRecord[] = [];
  const fieldsLeftEmpty: ProfileField[] = [];

  for (const fact of facts) {
    // Regra 4: ausência não é fato. "Não foi falado de preço" deixa o campo
    // vazio, para ele continuar aparecendo como pergunta.
    if (isAbsenceStatement(fact.statement)) {
      if (!fieldsLeftEmpty.includes(fact.field)) fieldsLeftEmpty.push(fact.field);
      continue;
    }

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

  return { factsToRecord, fieldsRejectedAsQuestions, fieldsLeftEmpty };
}
