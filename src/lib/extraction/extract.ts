import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PROFILE_FIELDS, type ProfileField } from "@/lib/domain";
import { extractionSchema, type Extraction } from "./schema";

// Identificador confirmado em developers.openai.com/api/docs/models/gpt-6-luna
export const EXTRACTION_MODEL = "gpt-6-luna";

const SYSTEM_PROMPT = `You are extracting evidence from a raw dump of a B2B discovery conversation.

You will receive:
- the raw dump, written or dictated right after the call
- the name of the firm and the contact
- the list of profile fields, and which of them are currently empty

Rules:
1. Extract only what was said. Never infer, never complete, never round a number.
2. One fact per statement. Any caveat the speaker attached to a statement travels
   inside that statement: "he doesn't know exactly", "more or less", "roughly",
   "I think". A number without its caveat is a different, stronger claim. Never
   drop the caveat.
3. "verbatim" is ONLY for words the dump explicitly marks as the interlocutor's
   own speech: text inside quotation marks, or text right after "ele falou assim",
   "ele disse assim", "ele disse que", "nas palavras dele/dela", "com essas
   palavras". Copy it exactly as written in the dump. The author's own notes,
   summaries and recollections are NOT verbatim, even when they describe what the
   interlocutor said. When in doubt, verbatim is null.
4. If a statement is second-hand ("he said the partner thinks..."), mark confidence
   as "reported", not "stated".
5. The absence of a topic is not a fact. If the dump says something was NOT
   covered ("preço eu nem toquei", "não pedi shadowing", "ele não quis falar do
   volume"), create NO fact for that field: leave it empty and list it in
   "still_empty".
6. If the dump does not touch a field, leave that field empty. An empty field is a
   result, not a failure.
7. "still_empty" lists the profile fields that remain empty after this conversation.
8. "next_questions" has one question per still-empty field, each tied to that field
   in "field". Write only questions that would fill that exact field. Prefer the
   fields most useful for the next conversation; at most 5 questions.
9. Write statements and questions in the language of the dump.

Field notes:
- horas_do_gargalo_por_projeto: the time the bottleneck takes per project, in
  whatever unit the speaker gave it: hours, days, or a share of the project time
  ("30 a 40% do tempo do projeto"). Record it as said, with its caveat. Never
  convert units.`;

export type ExtractionInput = {
  rawDump: string;
  firmName: string;
  contactName: string | null;
  emptyFields: ProfileField[];
};

function buildUserPrompt(input: ExtractionInput): string {
  return [
    `Firm: ${input.firmName}`,
    `Contact: ${input.contactName ?? "unknown"}`,
    `Profile fields: ${PROFILE_FIELDS.join(", ")}`,
    `Currently empty fields: ${input.emptyFields.join(", ") || "none"}`,
    "",
    "Raw dump:",
    input.rawDump,
  ].join("\n");
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não está definida no ambiente.");
  }
  client = new OpenAI({ apiKey });
  return client;
}

/**
 * Chama o modelo e valida a resposta contra extractionSchema. Qualquer campo
 * fora do vocabulário controlado, ou fora deste shape (ex: uma tentativa de
 * incluir "stage"), é rejeitado aqui — nunca chega ao classificador.
 */
export async function extractFactsFromDump(
  input: ExtractionInput
): Promise<Extraction> {
  const response = await getClient().responses.parse({
    model: EXTRACTION_MODEL,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
    text: { format: zodTextFormat(extractionSchema, "extraction") },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error("O modelo não devolveu uma extração estruturada.");
  }

  // Revalida com o zod completo: o SDK já parseou, mas a regra é nunca confiar
  // no que veio do modelo sem passar pelo nosso schema.
  const result = extractionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Resposta do modelo não bate com o schema esperado: ${result.error.message}`
    );
  }
  return result.data;
}
