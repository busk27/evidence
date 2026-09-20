import type { GeminiExtraction } from "@/lib/gemini/schema";
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
 * Junta os campos rejeitados pelas regras de negócio (classify.ts) com os
 * campos que o Gemini já marcou como still_empty, em uma única lista de
 * open_questions — sem duplicar campo.
 *
 * next_questions do Gemini é uma lista plana (até 3 perguntas) para
 * still_empty; associamos posicionalmente porque o contrato do prompt não
 * amarra pergunta a campo explicitamente. Ver nota na entrega desta sessão.
 */
export function buildOpenQuestions(
  extraction: Pick<GeminiExtraction, "still_empty" | "next_questions">,
  rejected: QuestionToRecord[]
): OpenQuestionRow[] {
  const seen = new Set<ProfileField>();
  const result: OpenQuestionRow[] = [];

  for (const item of rejected) {
    if (seen.has(item.field)) continue;
    seen.add(item.field);
    result.push({ field: item.field, question: item.question });
  }

  extraction.still_empty.forEach((field, index) => {
    if (seen.has(field)) return;
    seen.add(field);
    const question =
      extraction.next_questions[index] ??
      `O que ainda falta saber sobre ${field}?`;
    result.push({ field, question });
  });

  return result;
}

/**
 * Aplica as regras de negócio (classify) e monta as linhas prontas para
 * inserir em facts/open_questions. Função pura — nenhuma chamada a rede ou
 * banco aqui. Nunca produz nada que escreva em firms.stage (regra 3): o
 * retorno não tem esse campo, estruturalmente.
 */
export function prepareWrite(extraction: GeminiExtraction): PreparedWrite {
  const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts(
    extraction.facts
  );

  return {
    factsToInsert: factsToRecord,
    openQuestionsToInsert: buildOpenQuestions(
      extraction,
      fieldsRejectedAsQuestions
    ),
  };
}
