import type { Extraction } from "@/lib/extraction/schema";
import type { ProfileField } from "@/lib/domain";
import { classifyExtractedFacts, type QuestionToRecord } from "./classify";

export type FactRow = {
  field: ProfileField;
  statement: string;
  verbatim: string | null;
  confidence: "stated" | "reported";
};

export type OpenQuestionRow = {
  field: ProfileField;
  question: string;
};

export type PreparedWrite = {
  factsToInsert: FactRow[];
  openQuestionsToInsert: OpenQuestionRow[];
};

/**
 * Junta os campos rejeitados pelas regras de negócio (classify.ts) com as
 * next_questions do modelo e os campos still_empty, em uma única lista de
 * open_questions — sem duplicar campo, e sem perguntar de campo que acabou de
 * virar fato. Cada pergunta do modelo já vem amarrada ao seu campo; still_empty
 * sem pergunta ganha uma pergunta genérica.
 */
export function buildOpenQuestions(
  extraction: Pick<Extraction, "still_empty" | "next_questions">,
  rejected: QuestionToRecord[],
  recordedFields: ReadonlySet<ProfileField> = new Set()
): OpenQuestionRow[] {
  const seen = new Set<ProfileField>();
  const result: OpenQuestionRow[] = [];

  const push = (field: ProfileField, question: string) => {
    if (seen.has(field) || recordedFields.has(field)) return;
    const trimmed = question.trim();
    if (!trimmed) return;
    seen.add(field);
    result.push({ field, question: trimmed });
  };

  for (const item of rejected) push(item.field, item.question);
  for (const item of extraction.next_questions) push(item.field, item.question);
  for (const field of extraction.still_empty) {
    push(field, `O que ainda falta saber sobre ${field}?`);
  }

  return result;
}

/**
 * Aplica as regras de negócio (classify) e monta as linhas prontas para
 * inserir em facts/open_questions. Função pura — nenhuma chamada a rede ou
 * banco aqui. Nunca produz nada que escreva em firms.stage (regra 3): o
 * retorno não tem esse campo, estruturalmente.
 */
export function prepareWrite(extraction: Extraction): PreparedWrite {
  const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts(
    extraction.facts
  );

  return {
    factsToInsert: factsToRecord,
    openQuestionsToInsert: buildOpenQuestions(
      extraction,
      fieldsRejectedAsQuestions,
      new Set(factsToRecord.map((fact) => fact.field))
    ),
  };
}
