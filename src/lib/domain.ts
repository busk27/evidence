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

// Rótulo legível de cada estágio, para a tela.
export const FIRM_STAGE_LABELS: Record<FirmStage, string> = {
  "nao-contatada": "Não contatada",
  "conversa-marcada": "Conversa marcada",
  "conversa-feita": "Conversa feita",
  "preco-testado": "Preço testado",
  "piloto-proposto": "Piloto proposto",
  assinou: "Assinou",
  descartada: "Descartada",
};

export function stageLabel(stage: string): string {
  return (FIRM_STAGES as readonly string[]).includes(stage)
    ? FIRM_STAGE_LABELS[stage as FirmStage]
    : stage;
}

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

// Rótulo legível de cada campo, para a tela.
export const PROFILE_FIELD_LABELS: Record<ProfileField, string> = {
  interlocutor: "Interlocutor",
  decisor_ou_operador: "Decisor ou operador",
  quem_opera_dd: "Quem opera a DD",
  origem_do_contato: "Origem do contato",
  tamanho_praca_cliente: "Tamanho da praça do cliente",
  volume_dd: "Volume de DD",
  entregavel_final: "Entregável final",
  quem_faz_preparacao_hoje: "Quem faz a preparação hoje",
  ia_em_uso: "IA em uso",
  gargalo_frase_literal: "Gargalo (frase literal)",
  horas_do_gargalo_por_projeto: "Horas do gargalo por projeto",
  de_quem_sao_as_horas: "De quem são as horas",
  projetos_por_mes: "Projetos por mês",
  destino_da_hora_economizada: "Destino da hora economizada",
  preco_testado: "Preço testado",
  reacao_ao_preco: "Reação ao preço",
  objecao_principal: "Objeção principal",
  shadowing: "Shadowing",
  acesso_data_room: "Acesso ao data room",
  proximo_passo: "Próximo passo",
};

export function fieldLabel(field: string): string {
  return isProfileField(field) ? PROFILE_FIELD_LABELS[field] : field;
}

export const FACT_CONFIDENCE = ["stated", "reported"] as const;

export type FactConfidence = (typeof FACT_CONFIDENCE)[number];

export const FACT_CONFIDENCE_LABELS: Record<FactConfidence, string> = {
  stated: "Dito pelo interlocutor",
  reported: "Relatado por terceiro",
};

// Leitura de cada fato pela lente da tese do usuário. Nulo = sem relação com
// nenhuma hipótese (fica em "Contexto").
export const THESIS_SIGNALS = ["alinhado", "explorar", "atencao"] as const;

export type ThesisSignal = (typeof THESIS_SIGNALS)[number];

export const THESIS_SIGNAL_LABELS: Record<ThesisSignal, string> = {
  alinhado: "Alinhado à tese",
  explorar: "Explorar melhor",
  atencao: "Ponto de atenção",
};

export const OPEN_QUESTION_STATUS =["open", "answered", "dropped"] as const;

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
