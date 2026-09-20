import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { PROFILE_FIELDS, type ProfileField } from "@/lib/domain";
import { extractFactsFromDump } from "@/lib/gemini/extract";
import { prepareWrite } from "@/lib/facts/persist";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  firm_id: z.uuid(),
  contact_id: z.uuid().nullable().optional(),
  happened_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "happened_on deve ser YYYY-MM-DD")
    .optional(),
  raw_dump: z.string().min(1, "raw_dump não pode ser vazio"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Corpo da requisição precisa ser JSON válido.");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Corpo da requisição inválido.", parsed.error.issues);
  }
  const { firm_id, contact_id, happened_on, raw_dump } = parsed.data;

  const supabase = getSupabaseServerClient();

  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .select("id, name")
    .eq("id", firm_id)
    .maybeSingle();

  if (firmError) return jsonError(500, "Erro ao buscar a firma.", firmError.message);
  if (!firm) return jsonError(404, `Firma ${firm_id} não encontrada.`);

  let contactName: string | null = null;
  if (contact_id) {
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("id", contact_id)
      .maybeSingle();

    if (contactError)
      return jsonError(500, "Erro ao buscar o contato.", contactError.message);
    if (!contact) return jsonError(404, `Contato ${contact_id} não encontrado.`);
    contactName = contact.name;
  }

  const { data: existingFacts, error: existingFactsError } = await supabase
    .from("facts")
    .select("field")
    .eq("firm_id", firm_id);

  if (existingFactsError)
    return jsonError(500, "Erro ao buscar fatos existentes.", existingFactsError.message);

  const knownFields = new Set(
    (existingFacts ?? []).map((row) => row.field as ProfileField)
  );
  const emptyFields = PROFILE_FIELDS.filter((field) => !knownFields.has(field));

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      firm_id,
      contact_id: contact_id ?? null,
      raw_dump,
      ...(happened_on ? { happened_on } : {}),
    })
    .select("id, firm_id, contact_id, happened_on, created_at")
    .single();

  if (conversationError || !conversation)
    return jsonError(
      500,
      "Erro ao gravar a conversa.",
      conversationError?.message
    );

  let extraction;
  try {
    extraction = await extractFactsFromDump({
      rawDump: raw_dump,
      firmName: firm.name,
      contactName,
      emptyFields,
    });
  } catch (err) {
    return jsonError(502, "Falha ao extrair fatos com o Gemini.", {
      conversation_id: conversation.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const { factsToInsert, openQuestionsToInsert } = prepareWrite(extraction);

  const factsRecorded = factsToInsert.length
    ? await supabase
        .from("facts")
        .insert(
          factsToInsert.map((fact) => ({
            firm_id,
            conversation_id: conversation.id,
            field: fact.field,
            statement: fact.statement,
            verbatim: fact.verbatim,
            confidence: fact.confidence,
          }))
        )
        .select("id, field, statement, verbatim, confidence")
    : { data: [], error: null };

  if (factsRecorded.error)
    return jsonError(500, "Erro ao gravar fatos.", factsRecorded.error.message);

  const openQuestionsRecorded = openQuestionsToInsert.length
    ? await supabase
        .from("open_questions")
        .insert(
          openQuestionsToInsert.map((q) => ({
            firm_id,
            field: q.field,
            question: q.question,
            status: "open",
          }))
        )
        .select("id, field, question, status")
    : { data: [], error: null };

  if (openQuestionsRecorded.error)
    return jsonError(
      500,
      "Erro ao gravar open_questions.",
      openQuestionsRecorded.error.message
    );

  return NextResponse.json(
    {
      conversation,
      facts_recorded: factsRecorded.data ?? [],
      open_questions_recorded: openQuestionsRecorded.data ?? [],
    },
    { status: 201 }
  );
}
