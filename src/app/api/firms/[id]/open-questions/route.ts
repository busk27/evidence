import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/firms/[id]/open-questions">
) {
  const { id } = await ctx.params;
  const supabase = getSupabaseServerClient();

  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (firmError) return jsonError(500, "Erro ao buscar a firma.", firmError.message);
  if (!firm) return jsonError(404, `Firma ${id} não encontrada.`);

  const { data: openQuestions, error } = await supabase
    .from("open_questions")
    .select("id, field, question, status, created_at")
    .eq("firm_id", id)
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (error) return jsonError(500, "Erro ao buscar open_questions.", error.message);

  return NextResponse.json({
    firm_id: id,
    open_questions: openQuestions ?? [],
  });
}
