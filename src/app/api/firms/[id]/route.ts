import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/firms/[id]">
) {
  const { id } = await ctx.params;
  const supabase = getSupabaseServerClient();

  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .select("id, name, country, size, stage, created_at")
    .eq("id", id)
    .maybeSingle();

  if (firmError) return jsonError(500, "Erro ao buscar a firma.", firmError.message);
  if (!firm) return jsonError(404, `Firma ${id} não encontrada.`);

  const { data: facts, error: factsError } = await supabase
    .from("facts")
    .select(
      "id, field, statement, verbatim, confidence, created_at, conversation_id, conversations(happened_on)"
    )
    .eq("firm_id", id)
    .order("created_at", { ascending: true });

  if (factsError) return jsonError(500, "Erro ao buscar fatos.", factsError.message);

  return NextResponse.json({
    firm,
    facts: (facts ?? []).map((fact) => ({
      id: fact.id,
      field: fact.field,
      statement: fact.statement,
      verbatim: fact.verbatim,
      confidence: fact.confidence,
      source: {
        conversation_id: fact.conversation_id,
        happened_on:
          (fact.conversations as unknown as { happened_on: string } | null)
            ?.happened_on ?? null,
      },
    })),
  });
}
