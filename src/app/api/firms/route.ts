import { NextResponse, type NextRequest } from "next/server";
import { createFirmSchema } from "@/lib/firms/create";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";
import { readJsonBody } from "@/lib/api/read-json";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Lista de firmas com a contagem de fatos válidos, de perguntas abertas e a
// data da conversa mais recente. Os totais vêm prontos para a tela não somar.
export async function GET(request: Request) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const supabase = getSupabaseServerClient();

  const [firmsRes, factsRes, questionsRes, conversationsRes] = await Promise.all([
    // Firma hidden sai da lista e dos totais; continua abrindo por link direto.
    supabase.from("firms").select("id, name, stage, country, size").eq("hidden", false),
    supabase.from("facts").select("firm_id").eq("status", "valid"),
    supabase.from("open_questions").select("firm_id").eq("status", "open"),
    supabase.from("conversations").select("firm_id, happened_on"),
  ]);

  const failed = [firmsRes, factsRes, questionsRes, conversationsRes].find((r) => r.error);
  if (failed?.error) return jsonError(500, "Erro ao listar as firmas.", failed.error.message);

  const count = (rows: { firm_id: string }[]) => {
    const byFirm = new Map<string, number>();
    for (const row of rows) byFirm.set(row.firm_id, (byFirm.get(row.firm_id) ?? 0) + 1);
    return byFirm;
  };
  const facts = count(factsRes.data ?? []);
  const questions = count(questionsRes.data ?? []);

  const lastConversation = new Map<string, string>();
  for (const { firm_id, happened_on } of conversationsRes.data ?? []) {
    const current = lastConversation.get(firm_id);
    if (!current || happened_on > current) lastConversation.set(firm_id, happened_on);
  }

  const firms = (firmsRes.data ?? [])
    .map((firm) => ({
      id: firm.id,
      name: firm.name,
      stage: firm.stage,
      country: firm.country,
      size: firm.size,
      facts_count: facts.get(firm.id) ?? 0,
      open_questions_count: questions.get(firm.id) ?? 0,
      last_conversation_on: lastConversation.get(firm.id) ?? null,
    }))
    // Conversa mais recente primeiro; firma sem conversa vai para o fim.
    .sort(
      (a, b) =>
        (b.last_conversation_on ?? "").localeCompare(a.last_conversation_on ?? "") ||
        a.name.localeCompare(b.name, "pt-BR")
    );

  return NextResponse.json({
    totals: {
      firms: firms.length,
      facts: firms.reduce((sum, firm) => sum + firm.facts_count, 0),
      open_questions: firms.reduce((sum, firm) => sum + firm.open_questions_count, 0),
    },
    firms,
  });
}

export async function POST(request: NextRequest) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const body = read.body;

  const parsed = createFirmSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Corpo da requisição inválido.", parsed.error.issues);
  }
  const { name, country, size, contact } = parsed.data;

  const supabase = getSupabaseServerClient();

  // stage fica de fora de propósito: o banco aplica o default "nao-contatada".
  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .insert({ name, country: country ?? null, size: size ?? null })
    .select("id, name, country, size, stage, created_at")
    .single();

  if (firmError || !firm)
    return jsonError(500, "Erro ao gravar a firma.", firmError?.message);

  let createdContact = null;
  if (contact) {
    const { data, error: contactError } = await supabase
      .from("contacts")
      .insert({
        firm_id: firm.id,
        name: contact.name,
        role: contact.role ?? null,
        email: contact.email ?? null,
      })
      .select("id, firm_id, name, role, email")
      .single();

    if (contactError || !data)
      return jsonError(500, "Erro ao gravar o contato. A firma já foi gravada.", {
        firm_id: firm.id,
        message: contactError?.message,
      });
    createdContact = data;
  }

  return NextResponse.json({ firm, contact: createdContact }, { status: 201 });
}
