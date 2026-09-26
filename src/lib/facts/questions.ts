import { PROFILE_FIELDS, type ProfileField } from "@/lib/domain";

// Pergunta de reserva de cada campo, para quando o modelo não escreveu uma
// boa. Tem que dar para falar em voz alta na call, direto para o contato
// ("vocês"), sem vocabulário interno. Também é a pergunta que nasce quando um
// fato é retratado sem substituto: ela vem do campo, não do fato errado.
export const FIELD_QUESTIONS: Record<ProfileField, string> = {
  interlocutor: "Qual é exatamente o seu papel no escritório?",
  decisor_ou_operador:
    "Quem decide contratar uma ferramenta como essa, e quem vai usar no dia a dia?",
  quem_opera_dd: "Quem põe a mão na massa numa DD, do começo ao fim?",
  origem_do_contato: "Como você ficou sabendo da gente, quem fez a ponte?",
  tamanho_praca_cliente: "Qual é o porte típico das empresas que vocês analisam numa DD?",
  volume_dd: "Quantas DDs vocês fazem por mês, e quantos documentos costuma ter cada uma?",
  entregavel_final: "O que vocês entregam no fim de uma DD: relatório, planilha, apresentação?",
  quem_faz_preparacao_hoje:
    "Hoje, quem organiza e confere os documentos antes de a análise começar?",
  ia_em_uso: "Que ferramentas de IA vocês usam hoje na DD, e em que etapa?",
  gargalo_frase_literal:
    "Qual é a parte da DD que mais trava o trabalho de vocês? Me conta com as suas palavras.",
  horas_do_gargalo_por_projeto:
    "Numa DD típica, quanto tempo vai só nessa parte que mais trava?",
  de_quem_sao_as_horas: "Esse tempo é de quem: sócio, sênior, júnior?",
  projetos_por_mes: "Quantos projetos vocês tocam por mês, em média?",
  destino_da_hora_economizada:
    "Se essa parte levasse metade do tempo, o que vocês fariam com as horas que sobram?",
  preco_testado: "Se isso resolvesse essa parte da DD, quanto faria sentido pagar por mês?",
  reacao_ao_preco: "Olhando esse valor, o que você acha: caro, justo ou barato? Por quê?",
  objecao_principal: "O que te faria não usar uma ferramenta como essa?",
  shadowing: "Eu poderia acompanhar uma DD de vocês, só observando, do começo ao fim?",
  acesso_data_room:
    "Para um piloto, a gente conseguiria acesso a um data room de uma DD real ou já encerrada?",
  proximo_passo: "Qual é o próximo passo que faz sentido para vocês depois desta conversa?",
};

const FIELD_NAME = new RegExp(`\\b(?:${PROFILE_FIELDS.join("|")})\\b`);
const SNAKE_CASE = /\b[a-z]+_[a-z_]+\b/;
const GENERIC = /o que (?:ainda )?falta saber/i;

/**
 * Pergunta do modelo que não dá para fazer em voz alta: vazia, citando nome
 * de campo ou identificador interno, ou no molde "O que falta saber sobre X".
 * Essas são trocadas pela pergunta de reserva do campo.
 */
export function isUsableQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  return !FIELD_NAME.test(q) && !SNAKE_CASE.test(q) && !GENERIC.test(q);
}
