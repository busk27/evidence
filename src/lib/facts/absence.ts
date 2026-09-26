// Regra 4: ausência não é fato. Frases que dizem que um assunto não foi
// tratado na conversa ("o preço não foi abordado", "não pediu para acompanhar
// uma DD", "não quis falar do volume"). Um fato assim faria o campo contar como
// preenchido e sumir da lista de perguntas da próxima conversa.
//
// Os verbos são os de "tratar um assunto" (abordar, tocar, perguntar, pedir,
// falar...), em primeira e terceira pessoa, porque o statement do modelo
// costuma vir em terceira ("o interlocutor não pediu"). Negativa sobre a firma
// ("André não usa IA") não casa com nada daqui.
export const ABSENCE_PATTERNS: RegExp[] = [
  /\bnão (?:foi|foram) (?:abordad|tratad|discutid|falad|mencionad|perguntad|tocad|levantad)\w*/i,
  /\b(?:não|nem) (?:cheguei|chegou|chegamos|chegaram) a (?:tocar|falar|perguntar|abordar|pedir|discutir|tratar|mencionar)\b/i,
  /\b(?:não|nem) (?:toquei|tocou|tocamos|abordei|abordou|abordamos|perguntei|perguntou|perguntamos|pedi|pediu|pedimos)\b/i,
  /\bnão (?:consegui|conseguiu|conseguimos) (?:falar|perguntar|abordar|tocar|obter|levantar)\b/i,
  /\bnão quis (?:falar|dizer|responder|informar|abrir|compartilhar)\b/i,
];

export function isAbsenceStatement(statement: string): boolean {
  return ABSENCE_PATTERNS.some((pattern) => pattern.test(statement));
}
