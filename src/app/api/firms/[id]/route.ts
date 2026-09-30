import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type FactRecord = {
  id: string;
  field: string;
  statement: string;
  verbatim: string | null;
  confidence: string;
  status: string;
  status_reason: string | null;
  status_changed_at: string | null;
  corrects_fact_id: string | null;
  conversation_id: string;
  conversations: unknown;
};

function source(fact: FactRecord) {
  return {
    conversation_id: fact.conversation_id,
    happened_on:
      (fact.conversations as { happened_on: string } | null)?.happened_on ?? null,
  };
}

// Versão substituída ou retratada: o texto antigo continua visível, com o motivo.
function wrongFact(fact: FactRecord) {
  return {
    id: fact.id,
    field: fact.field,
    statement: fact.statement,
    verbatim: fact.verbatim,
    confidence: fact.confidence,
    status_reason: fact.status_reason,
    status_changed_at: fact.status_changed_at,
    source: source(fact),
  };
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/firms/[id]">
) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  const supabase = getSupabaseServerClient();

  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .select("id, name, country, size, stage, created_at")
    .eq("id", id)
    .maybeSingle();

  if (firmError) return jsonError(500, "Erro ao buscar a firma.", firmError.message);
  if (!firm) return jsonError(404, `Firma ${id} não encontrada.`);

  // Traz também os fatos marcados como errados: nunca somem, aparecem como
  // histórico da correção (replaces) ou como retratados (retracted_facts).
  const { data, error: factsError } = await supabase
    .from("facts")
    .select(
      "id, field, statement, verbatim, confidence, status, status_reason, status_changed_at, created_at, conversation_id, corrects_fact_id, conversations(happened_on)"
    )
    .eq("firm_id", id)
    .order("created_at", { ascending: true });

  if (factsError) return jsonError(500, "Erro ao buscar fatos.", factsError.message);

  const all = (data ?? []) as FactRecord[];
  const byId = new Map(all.map((fact) => [fact.id, fact]));
  const replaced = new Set(
    all.map((fact) => fact.corrects_fact_id).filter((v): v is string => v !== null)
  );

  // Cadeia de versões anteriores, da mais recente para a mais antiga.
  function chain(fact: FactRecord) {
    const previous: ReturnType<typeof wrongFact>[] = [];
    const seen = new Set<string>([fact.id]);
    let next = fact.corrects_fact_id ? byId.get(fact.corrects_fact_id) : undefined;
    while (next && !seen.has(next.id)) {
      seen.add(next.id);
      previous.push(wrongFact(next));
      next = next.corrects_fact_id ? byId.get(next.corrects_fact_id) : undefined;
    }
    return previous;
  }

  const valid = all.filter((fact) => fact.status === "valid");

  // Retratado sem versão certa: errado e ninguém o corrige.
  const retracted = all.filter(
    (fact) => fact.status !== "valid" && !replaced.has(fact.id)
  );

  return NextResponse.json({
    firm,
    facts: valid.map((fact) => ({
      id: fact.id,
      field: fact.field,
      statement: fact.statement,
      verbatim: fact.verbatim,
      confidence: fact.confidence,
      corrects_fact_id: fact.corrects_fact_id,
      replaces: chain(fact),
      source: source(fact),
    })),
    retracted_facts: retracted.map((fact) => ({
      ...wrongFact(fact),
      replaces: chain(fact),
    })),
  });
}
