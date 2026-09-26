import { z } from "zod";
import { FACT_CONFIDENCE, VERBATIM_REQUIRED_FIELD, type ProfileField } from "@/lib/domain";
import { isAbsenceStatement } from "./absence";
import { classifyExtractedFacts, type FactToRecord } from "./classify";
import { isMarkedAsSpeech } from "./verbatim";

const reason = z.string().trim().min(1, "reason não pode ser vazio");

export const retractSchema = z.strictObject({ reason });

// O campo não entra: a correção fica no mesmo campo do fato original.
export const correctSchema = z.strictObject({
  reason,
  statement: z.string().trim().min(1, "statement não pode ser vazio"),
  verbatim: z.string().trim().min(1).nullable().optional(),
  confidence: z.enum(FACT_CONFIDENCE),
});

export type CorrectInput = z.infer<typeof correctSchema>;

export type CorrectionCheck =
  | { ok: true; fact: FactToRecord }
  | { ok: false; error: string };

/**
 * Passa a correção pelas mesmas regras que um fato extraído de conversa:
 * trava de verbatim contra o despejo original, regra 4, regra 2 e regra 1.
 * Sem isso, corrigir vira porta dos fundos para gravar paráfrase como citação
 * ou número de terceiro como stated.
 *
 * Diferença deliberada em relação à extração: aqui há uma pessoa do outro
 * lado, então nada é zerado ou rebaixado em silêncio. Violou regra, a
 * correção é recusada inteira com o motivo e o fato original fica como está.
 */
export function checkCorrection(
  field: ProfileField,
  input: CorrectInput,
  rawDump: string
): CorrectionCheck {
  const verbatim = input.verbatim ?? null;

  if (verbatim && !isMarkedAsSpeech(verbatim, rawDump)) {
    return {
      ok: false,
      error:
        "O verbatim não aparece no despejo como fala do interlocutor (entre aspas ou logo depois de \"ele disse que\", \"ele falou assim\", \"nas palavras dele\", \"com essas palavras\"). Mande verbatim null ou um trecho marcado como fala.",
    };
  }

  if (isAbsenceStatement(input.statement)) {
    return {
      ok: false,
      error:
        "Regra 4: ausência não é fato. Se o assunto não foi tratado, use POST /api/facts/{id}/retract. O campo fica vazio e vira pergunta.",
    };
  }

  const { factsToRecord, fieldsRejectedAsQuestions } = classifyExtractedFacts([
    { field, statement: input.statement, verbatim, confidence: input.confidence },
  ]);

  if (fieldsRejectedAsQuestions.length > 0 || factsToRecord.length !== 1) {
    return {
      ok: false,
      error:
        field === VERBATIM_REQUIRED_FIELD
          ? `Regra 2: ${field} exige verbatim, a frase literal do interlocutor.`
          : `Regra 1: ${field} é campo de custo e só aceita confidence "stated". Número que veio de terceiro não é evidência.`,
    };
  }

  return { ok: true, fact: factsToRecord[0] };
}
