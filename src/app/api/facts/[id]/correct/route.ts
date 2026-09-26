import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { ProfileField } from "@/lib/domain";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";
import { readJsonBody } from "@/lib/api/read-json";
import { checkCorrection, correctSchema } from "@/lib/facts/revise";
import { publicFact, rpcError, type FactRow } from "@/lib/facts/revise-db";

export const dynamic = "force-dynamic";

// Marca o fato como errado e grava a versão certa no mesmo campo, apontando
// para o original. A versão certa passa pelas regras 1, 2 e 4 e pela trava de
// verbatim contra o despejo da conversa original; violou, 422 e nada muda.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/facts/[id]/correct">
) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return jsonError(400, "id do fato precisa ser um uuid.");

  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const parsed = correctSchema.safeParse(read.body);
  if (!parsed.success) {
    return jsonError(400, "Corpo da requisição inválido.", parsed.error.issues);
  }

  const supabase = getSupabaseServerClient();

  const { data: fact, error: factError } = await supabase
    .from("facts")
    .select("id, field, status, conversations(raw_dump)")
    .eq("id", id)
    .maybeSingle();

  if (factError) return jsonError(500, "Erro ao buscar o fato.", factError.message);
  if (!fact) return jsonError(404, `Fato ${id} não encontrado.`);
  if (fact.status !== "valid") return jsonError(409, `Fato ${id} já está marcado como errado.`);

  const rawDump =
    (fact.conversations as unknown as { raw_dump: string } | null)?.raw_dump ?? "";

  const check = checkCorrection(fact.field as ProfileField, parsed.data, rawDump);
  if (!check.ok) return jsonError(422, check.error);

  const { data, error } = await supabase.rpc("correct_fact", {
    p_fact_id: id,
    p_reason: parsed.data.reason,
    p_statement: check.fact.statement,
    p_verbatim: check.fact.verbatim,
    p_confidence: check.fact.confidence,
  });

  if (error) return rpcError(error);

  const result = data as { original: FactRow; fact: FactRow };
  return NextResponse.json(
    { original: publicFact(result.original), fact: publicFact(result.fact) },
    { status: 201 }
  );
}
