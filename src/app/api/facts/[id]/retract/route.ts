import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { ProfileField } from "@/lib/domain";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";
import { readJsonBody } from "@/lib/api/read-json";
import { retractSchema } from "@/lib/facts/revise";
import { FIELD_QUESTIONS } from "@/lib/facts/questions";
import { publicFact, rpcError, type FactRow } from "@/lib/facts/revise-db";

export const dynamic = "force-dynamic";

// Marca um fato como errado, sem apagar. Se o campo ficar sem fato válido,
// vira pergunta aberta (regra 4), com a pergunta do campo.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/facts/[id]/retract">
) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return jsonError(400, "id do fato precisa ser um uuid.");

  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const parsed = retractSchema.safeParse(read.body);
  if (!parsed.success) {
    return jsonError(400, "Corpo da requisição inválido.", parsed.error.issues);
  }

  const supabase = getSupabaseServerClient();

  const { data: fact, error: factError } = await supabase
    .from("facts")
    .select("id, field")
    .eq("id", id)
    .maybeSingle();

  if (factError) return jsonError(500, "Erro ao buscar o fato.", factError.message);
  if (!fact) return jsonError(404, `Fato ${id} não encontrado.`);

  const { data, error } = await supabase.rpc("retract_fact", {
    p_fact_id: id,
    p_reason: parsed.data.reason,
    p_question: FIELD_QUESTIONS[fact.field as ProfileField],
  });

  if (error) return rpcError(error);

  const result = data as { fact: FactRow; open_question: Record<string, unknown> | null };
  const q = result.open_question;
  return NextResponse.json({
    fact: publicFact(result.fact),
    open_question: q
      ? { id: q.id, field: q.field, question: q.question, status: q.status }
      : null,
  });
}
