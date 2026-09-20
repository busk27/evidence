// Vocabulário controlado do domínio. Espelha supabase/migrations/0001_init.sql —
// qualquer mudança aqui exige a migration correspondente, e vice-versa.

export const FIRM_STAGES = [
  "nao-contatada",
  "conversa-marcada",
  "conversa-feita",
  "preco-testado",
  "piloto-proposto",
  "assinou",
  "descartada",
] as const;

export type FirmStage = (typeof FIRM_STAGES)[number];

export const PROFILE_FIELDS = [
  "interlocutor",
  "decisor_ou_operador",
  "quem_opera_dd",
  "origem_do_contato",
  "tamanho_praca_cliente",
  "volume_dd",
  "entregavel_final",
  "quem_faz_preparacao_hoje",
  "ia_em_uso",
  "gargalo_frase_literal",
  "horas_do_gargalo_por_projeto",
  "de_quem_sao_as_horas",
  "projetos_por_mes",
  "destino_da_hora_economizada",
  "preco_testado",
  "reacao_ao_preco",
  "objecao_principal",
  "shadowing",
  "acesso_data_room",
  "proximo_passo",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const FACT_CONFIDENCE = ["stated", "reported"] as const;

export type FactConfidence = (typeof FACT_CONFIDENCE)[number];

export const OPEN_QUESTION_STATUS = ["open", "answered", "dropped"] as const;

export type OpenQuestionStatus = (typeof OPEN_QUESTION_STATUS)[number];

// Regra de negócio 1: estes quatro campos são "de custo" — só aceitam fato com
// confidence "stated". Ver CLAUDE.md.
export const COST_FIELDS: ProfileField[] = [
  "horas_do_gargalo_por_projeto",
  "de_quem_sao_as_horas",
  "projetos_por_mes",
  "destino_da_hora_economizada",
];

// Regra de negócio 2: este campo só grava com verbatim preenchido.
export const VERBATIM_REQUIRED_FIELD: ProfileField = "gargalo_frase_literal";

export function isProfileField(value: string): value is ProfileField {
  return (PROFILE_FIELDS as readonly string[]).includes(value);
}
