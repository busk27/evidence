import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/respond";
import { readJsonBody } from "@/lib/api/read-json";
import { requireUser } from "@/lib/auth/session";
import { loadThesis, THESIS_ROW_ID } from "@/lib/thesis/store";

export const dynamic = "force-dynamic";

const putSchema = z.strictObject({
  text: z.string().trim().min(1, "A tese não pode ficar vazia.").max(20000),
});

// A tese do usuário: uma só, lida pela extração para classificar os fatos.
export async function GET(request: Request) {
  const denied = await requireUser(request);
  if (denied) return denied;

  try {
    const thesis = await loadThesis(getSupabaseServerClient());
    return NextResponse.json({ thesis });
  } catch (err) {
    return jsonError(500, "Erro ao buscar a tese.", err instanceof Error ? err.message : err);
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const read = await readJsonBody(request);
  if (!read.ok) return read.response;
  const parsed = putSchema.safeParse(read.body);
  if (!parsed.success) {
    return jsonError(400, "Corpo da requisição inválido.", parsed.error.issues);
  }

  const { data, error } = await getSupabaseServerClient()
    .from("thesis")
    .upsert({ id: THESIS_ROW_ID, text: parsed.data.text, updated_at: new Date().toISOString() })
    .select("text, updated_at")
    .single();

  if (error) return jsonError(500, "Erro ao salvar a tese.", error.message);
  return NextResponse.json({ thesis: data });
}
