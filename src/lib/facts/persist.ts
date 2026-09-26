import type { Extraction } from "@/lib/extraction/schema";
import type { ProfileField } from "@/lib/domain";
import { classifyExtractedFacts, type QuestionToRecord } from "./classify";
import { keepOnlyMarkedVerbatim } from "./verbatim";
import { FIELD_QUESTIONS, isUsableQuestion } from "./questions";

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
 * virar fato. Cada pergunta do modelo já vem amarrada ao seu campo. Pergunta do
 * modelo que não dá para fazer em voz alta (cita nome de campo, "o que falta
 * saber sobre X") é descartada; campo sem pergunta boa ganha a pergunta de
 * reserva do campo (FIELD_QUESTIONS).
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
  for (const item of extraction.next_questions) {
    if (isUsableQuestion(item.question)) push(item.field, item.question);
  }
  for (const field of extraction.still_empty) push(field, FIELD_QUESTIONS[field]);

  return result;
}

/**
 * Aplica as regras de negócio (classify) e monta as linhas prontas para
 * inserir em facts/open_questions. Antes, zera todo verbatim que o despejo não
 * marca como fala (aspas ou "ele disse que"...), para a regra 2 não aprovar
 * paráfrase como citação. Função pura — nenhuma chamada a rede ou
 * banco aqui. Nunca produz nada que escreva em firms.stage (regra 3): o
 * retorno não tem esse campo, estruturalmente.
 */
export function prepareWrite(
  extraction: Extraction,
  rawDump: string
): PreparedWrite {
  const { factsToRecord, fieldsRejectedAsQuestions, fieldsLeftEmpty } =
    classifyExtractedFacts(keepOnlyMarkedVerbatim(extraction.facts, rawDump));

  return {
    factsToInsert: factsToRecord,
    openQuestionsToInsert: buildOpenQuestions(
      {
        still_empty: [...extraction.still_empty, ...fieldsLeftEmpty],
        next_questions: extraction.next_questions,
      },
      fieldsRejectedAsQuestions,
      new Set(factsToRecord.map((fact) => fact.field))
    ),
  };
}
