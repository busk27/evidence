import type { PostgrestError } from "@supabase/supabase-js";
import { jsonError } from "@/lib/api/respond";

type FactRow = {
  id: string;
  firm_id: string;
  conversation_id: string;
  field: string;
  statement: string;
  verbatim: string | null;
  confidence: string;
  status: string;
  status_reason: string | null;
  status_changed_at: string | null;
  corrects_fact_id: string | null;
};

// O que as rotas devolvem de um fato: sem firm_id, com a origem.
export function publicFact(row: FactRow) {
  return {
    id: row.id,
    field: row.field,
    statement: row.statement,
    verbatim: row.verbatim,
    confidence: row.confidence,
    status: row.status,
    status_reason: row.status_reason,
    status_changed_at: row.status_changed_at,
    corrects_fact_id: row.corrects_fact_id,
    conversation_id: row.conversation_id,
  };
}

export type { FactRow };

// Erros levantados por retract_fact / correct_fact (migration 0002).
export function rpcError(error: PostgrestError) {
  if (error.code === "P0002") return jsonError(404, error.message);
  if (error.code === "P0001") return jsonError(409, error.message);
  return jsonError(500, "Erro ao gravar a revisão do fato.", error.message);
}
