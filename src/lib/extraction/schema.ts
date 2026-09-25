import { z } from "zod";
import { FACT_CONFIDENCE, PROFILE_FIELDS } from "@/lib/domain";

// Shape que o modelo deve devolver (OpenAI Structured Outputs, modo strict).
// Validado com zod antes de qualquer coisa tocar o banco — o que não bate com
// este schema é descartado, nunca gravado. "stage" não existe aqui:
// estruturalmente, nada que vem desta resposta consegue alterar firms.stage
// (regra de negócio 3).
//
// Strict mode exige todas as propriedades em "required" e opcionais como
// nullable — por isso verbatim é string | null e não optional.
export const extractionSchema = z.object({
  facts: z.array(
    z.object({
      field: z.enum(PROFILE_FIELDS),
      statement: z.string(),
      verbatim: z.string().nullable(),
      confidence: z.enum(FACT_CONFIDENCE),
    })
  ),
  still_empty: z.array(z.enum(PROFILE_FIELDS)),
  // Cada pergunta nasce amarrada ao campo vazio que ela preenche.
  next_questions: z.array(
    z.object({
      field: z.enum(PROFILE_FIELDS),
      question: z.string(),
    })
  ),
});

export type Extraction = z.infer<typeof extractionSchema>;
