import { GoogleGenAI } from "@google/genai";
import { PROFILE_FIELDS, type ProfileField } from "@/lib/domain";
import {
  geminiExtractionSchema,
  geminiResponseJsonSchema,
  type GeminiExtraction,
} from "./schema";

const SYSTEM_PROMPT = `You are extracting evidence from a raw dump of a B2B discovery conversation.

You will receive:
- the raw dump, written or dictated right after the call
- the name of the firm and the contact
- the list of profile fields, and which of them are currently empty

Rules:
1. Extract only what was said. Never infer, never complete, never round a number.
2. One fact per statement. Keep the speaker's own words in "verbatim".
3. If a statement is second-hand ("he said the partner thinks..."), mark confidence
   as "reported", not "stated".
4. If the dump does not touch a field, leave that field empty. An empty field is a
   result, not a failure.
5. Write the next questions only for fields that are still empty after this
   conversation.

Return strictly this JSON:

{
  "facts": [
    {
      "field": "<one of the profile fields>",
      "statement": "<the fact, in one line>",
      "verbatim": "<the words used, or null>",
      "confidence": "stated" | "reported"
    }
  ],
  "still_empty": ["<field>", "..."],
  "next_questions": ["<question>", "<question>", "<question>"]
}`;

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

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está definida no ambiente.");
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Chama o Gemini e valida a resposta contra geminiExtractionSchema. Qualquer
 * campo fora do vocabulário controlado, ou fora deste shape (ex: uma tentativa
 * de incluir "stage"), é rejeitado aqui — nunca chega ao classificador.
 */
export async function extractFactsFromDump(
  input: ExtractionInput
): Promise<GeminiExtraction> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: buildUserPrompt(input),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: geminiResponseJsonSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini não devolveu texto na resposta.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new Error("Gemini devolveu um JSON inválido.");
  }

  const result = geminiExtractionSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `Resposta do Gemini não bate com o schema esperado: ${result.error.message}`
    );
  }

  return result.data;
}
