import { z } from "zod";
import { FACT_CONFIDENCE, PROFILE_FIELDS, THESIS_SIGNALS } from "@/lib/domain";

// Shape que o modelo deve devolver (OpenAI Structured Outputs, modo strict).
// Validado com zod antes de qualquer coisa tocar o banco — o que não bate com
// este schema é descartado, nunca gravado. "stage" não existe aqui:
// estruturalmente, nada que vem desta resposta consegue alterar firms.stage
// (regra de negócio 3).
//
// Strict mode exige todas as propriedades em "required" e opcionais como
// nullable — por isso verbatim é string | null e não optional.
const factShape = {
  field: z.enum(PROFILE_FIELDS),
  statement: z.string(),
  verbatim: z.string().nullable(),
  confidence: z.enum(FACT_CONFIDENCE),
};

const questionsShape = {
  still_empty: z.array(z.enum(PROFILE_FIELDS)),
  // Cada pergunta nasce amarrada ao campo vazio que ela preenche.
  next_questions: z.array(
    z.object({
      field: z.enum(PROFILE_FIELDS),
      question: z.string(),
    })
  ),
};

// Leitura pela lente da tese: sinal e razão, ou os dois nulos. A razão ainda
// passa por acceptThesisReading antes de gravar.
const thesisReadingShape = {
  thesis_signal: z.enum(THESIS_SIGNALS).nullable(),
  thesis_reason: z.string().nullable(),
};

// Contrato com o modelo: tudo obrigatório (strict).
export const modelExtractionSchema = z.object({
  facts: z.array(z.object({ ...factShape, ...thesisReadingShape })),
  ...questionsShape,
});

// Contrato interno: a leitura de tese é opcional (extração sem tese salva).
export const extractionSchema = z.object({
  facts: z.array(
    z.object({
      ...factShape,
      thesis_signal: thesisReadingShape.thesis_signal.optional(),
      thesis_reason: thesisReadingShape.thesis_reason.optional(),
    })
  ),
  ...questionsShape,
});

export type Extraction = z.infer<typeof extractionSchema>;

// Reclassificação de fatos já gravados (script): só a leitura, por id.
export const thesisReadingsSchema = z.object({
  readings: z.array(z.object({ id: z.string(), ...thesisReadingShape })),
});
