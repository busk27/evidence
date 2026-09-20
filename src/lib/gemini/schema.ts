import { z } from "zod";
import { FACT_CONFIDENCE, PROFILE_FIELDS } from "@/lib/domain";

// Shape que o Gemini deve devolver. Validado com zod antes de qualquer coisa
// tocar o banco — o que não bate com este schema é descartado, nunca gravado.
// Note que "stage" não existe aqui: estruturalmente, nada que vem desta
// resposta consegue alterar firms.stage (regra de negócio 3).
export const geminiExtractionSchema = z.object({
  facts: z.array(
    z.object({
      field: z.enum(PROFILE_FIELDS),
      statement: z.string().min(1),
      verbatim: z.string().nullable(),
      confidence: z.enum(FACT_CONFIDENCE),
    })
  ),
  still_empty: z.array(z.enum(PROFILE_FIELDS)),
  next_questions: z.array(z.string().min(1)).max(3),
});

export type GeminiExtraction = z.infer<typeof geminiExtractionSchema>;

// JSON Schema equivalente, enviado ao Gemini via responseJsonSchema para
// forçar o formato de saída (ver src/lib/gemini/extract.ts).
export const geminiResponseJsonSchema = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: PROFILE_FIELDS },
          statement: { type: "string" },
          verbatim: { type: ["string", "null"] },
          confidence: { type: "string", enum: FACT_CONFIDENCE },
        },
        required: ["field", "statement", "verbatim", "confidence"],
      },
    },
    still_empty: {
      type: "array",
      items: { type: "string", enum: PROFILE_FIELDS },
    },
    next_questions: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
  },
  required: ["facts", "still_empty", "next_questions"],
} as const;
