import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PROFILE_FIELDS, type ProfileField } from "@/lib/domain";
import {
  extractionSchema,
  modelExtractionSchema,
  thesisReadingsSchema,
  type Extraction,
} from "./schema";

// Identificador confirmado em developers.openai.com/api/docs/models/gpt-6-luna
export const EXTRACTION_MODEL = "gpt-6-luna";

// Mesmas regras de leitura para a extração e para a reclassificação.
const THESIS_RULES = `Thesis reading (thesis_signal, thesis_reason):
You may also receive the user's thesis: a short description followed by
hypotheses written as "H1 — ...", "H2 — ...". For each fact, read it against
the thesis. This reading is separate from the fact: never change the statement
or the verbatim to fit the thesis.
- thesis_signal is one of:
  "alinhado"  — the fact supports a hypothesis;
  "explorar"  — the fact touches a hypothesis but is incomplete, vague, or needs
                a follow-up to count as evidence;
  "atencao"   — the fact contradicts or weakens a hypothesis, or is a risk to it.
- Only classify a fact that relates to a specific hypothesis. If it does not,
  thesis_signal and thesis_reason are both null. Do not force a fit.
- thesis_reason starts with the hypothesis it refers to, exactly as
  "H<n> — ", followed by ONE short sentence saying why, in the language of the
  dump. Example: "H1 — o sócio estimou 30 a 40% do tempo do projeto nessa etapa."
- The author's own notes are not the interlocutor's words. A fact that only the
  author wrote down cannot, by itself, confirm a hypothesis as "alinhado" on the
  strength of a quote.
- If no thesis is given, thesis_signal and thesis_reason are null for every fact.`;

const SYSTEM_PROMPT = `You are extracting evidence from a raw dump of a B2B discovery conversation.

You will receive:
- the raw dump, written or dictated right after the call
- the name of the firm and the contact
- the list of profile fields, and which of them are currently empty
- the user's thesis, if one is saved

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
8. "next_questions" has one question for EVERY still-empty field, each tied to
   that field in "field", and only questions that would fill that exact field.
   Each question is what you would say out loud to the contact in the next call:
   direct, addressed to them ("você", "vocês"), concrete, one thing at a time,
   built on what this conversation already told you. Never mention field names
   or any internal vocabulary.
   Bad: "O que ainda falta saber sobre volume_dd?"
   Good: "Quantas DDs vocês fazem por mês?"
9. Write statements and questions in the language of the dump.

Field notes:
- horas_do_gargalo_por_projeto: the time the bottleneck takes per project, in
  whatever unit the speaker gave it: hours, days, or a share of the project time
  ("30 a 40% do tempo do projeto"). Record it as said, with its caveat. Never
  convert units.

${THESIS_RULES}`;

const RECLASSIFY_PROMPT = `You receive facts already extracted from a B2B discovery conversation,
the raw dump they came from, and the user's thesis. Do not change the facts.
Return one reading per fact id.

${THESIS_RULES}`;

export type ExtractionInput = {
  rawDump: string;
  firmName: string;
  contactName: string | null;
  emptyFields: ProfileField[];
  thesis: string | null;
};

function thesisBlock(thesis: string | null): string[] {
  return thesis && thesis.trim()
    ? ["Thesis:", thesis.trim()]
    : ["Thesis: none saved. thesis_signal and thesis_reason are null for every fact."];
}

function buildUserPrompt(input: ExtractionInput): string {
  return [
    `Firm: ${input.firmName}`,
    `Contact: ${input.contactName ?? "unknown"}`,
    `Profile fields: ${PROFILE_FIELDS.join(", ")}`,
    `Currently empty fields: ${input.emptyFields.join(", ") || "none"}`,
    "",
    ...thesisBlock(input.thesis),
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
    text: { format: zodTextFormat(modelExtractionSchema, "extraction") },
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

export type FactToRead = {
  id: string;
  field: ProfileField;
  statement: string;
  verbatim: string | null;
  confidence: string;
};

/**
 * Lê fatos já gravados pela lente da tese. Devolve a leitura crua do modelo;
 * quem chama passa cada uma por acceptThesisReading antes de gravar.
 */
export async function readFactsAgainstThesis(input: {
  facts: FactToRead[];
  rawDump: string;
  thesis: string;
}) {
  const response = await getClient().responses.parse({
    model: EXTRACTION_MODEL,
    input: [
      { role: "system", content: RECLASSIFY_PROMPT },
      {
        role: "user",
        content: [
          ...thesisBlock(input.thesis),
          "",
          "Facts (JSON):",
          JSON.stringify(input.facts),
          "",
          "Raw dump:",
          input.rawDump,
        ].join("\n"),
      },
    ],
    text: { format: zodTextFormat(thesisReadingsSchema, "thesis_readings") },
  });

  const result = thesisReadingsSchema.safeParse(response.output_parsed);
  if (!result.success) {
    throw new Error(`Leitura de tese fora do schema: ${result.error.message}`);
  }
  return result.data.readings;
}
