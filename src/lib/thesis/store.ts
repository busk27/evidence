import type { SupabaseClient } from "@supabase/supabase-js";

// A tese mora só no banco (tabela thesis, uma linha, id = 1). Nunca em código
// nem em arquivo do repositório.
export const THESIS_ROW_ID = 1;

export type Thesis = { text: string; updated_at: string };

export async function loadThesis(supabase: SupabaseClient): Promise<Thesis | null> {
  const { data, error } = await supabase
    .from("thesis")
    .select("text, updated_at")
    .eq("id", THESIS_ROW_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
