@AGENTS.md

# Evidence

Registro de conversas de discovery B2B. O usuário despeja o texto de uma conversa, o
sistema extrai fatos com origem rastreável, aponta os campos do perfil da firma que
continuam vazios, e escreve as perguntas da próxima conversa.

Projeto final da eletiva de Automation da Link (grupo de três). Datas:
- **2026-09-24** — checkpoint de MVP funcionando.
- **2026-10-01** — entrega final.

## Stack

- Next.js (App Router), deploy na Vercel.
- Supabase/PostgreSQL.
- Google Gemini como integração externa (extração de fatos).

## Princípio de arquitetura: API-first

Todo recurso é um endpoint com JSON estruturado. A interface web é um cliente fino
em cima da mesma API — **nenhuma regra de negócio dentro de componente de tela**.
Toda validação, toda decisão sobre o que grava ou não, mora nas rotas/lib do
backend, nunca no cliente.

Motivo: um segundo consumidor da API vai ser um agente, não uma pessoa. `/llms.txt`
e `/openapi.json` existem para que esse agente use a API sem ler código.

## Regras de negócio (não vivem no prompt do Gemini — vivem no backend, têm teste)

Estas três regras são o diferencial técnico do projeto. Não podem se perder numa
refatoração. Testes cobrindo cada uma ficam em `src/lib/facts/*.test.ts` (ou
equivalente) e devem continuar passando.

1. **Campos de custo exigem `confidence = "stated"`.** Os campos
   `horas_do_gargalo_por_projeto`, `de_quem_sao_as_horas`, `projetos_por_mes` e
   `destino_da_hora_economizada` só aceitam fato com `confidence = "stated"`. Um
   fato com `confidence = "reported"` nesses campos **não grava em `facts`**: vira
   uma linha em `open_questions` com a pergunta a fazer na próxima conversa.
   Razão: número que veio de terceiro não é evidência.
2. **`gargalo_frase_literal` exige `verbatim` preenchido.** Sem a frase literal, o
   campo fica vazio e vira `open_question`. Paráfrase é o que transforma conversa
   boa em falso positivo.
3. **Nada que o modelo extrair pode alterar `firms.stage`.** Mudança de estágio é
   ação explícita do usuário via endpoint dedicado, nunca inferência a partir do
   texto da conversa.

## Vocabulário controlado (enums)

`firms.stage`:
`nao-contatada | conversa-marcada | conversa-feita | preco-testado | piloto-proposto | assinou | descartada`

`facts.field` e `open_questions.field` (exatamente estes 20 valores):
`interlocutor, decisor_ou_operador, quem_opera_dd, origem_do_contato, tamanho_praca_cliente, volume_dd, entregavel_final, quem_faz_preparacao_hoje, ia_em_uso, gargalo_frase_literal, horas_do_gargalo_por_projeto, de_quem_sao_as_horas, projetos_por_mes, destino_da_hora_economizada, preco_testado, reacao_ao_preco, objecao_principal, shadowing, acesso_data_room, proximo_passo`

## Credenciais

A chave do Gemini e as credenciais do Supabase entram por variável de ambiente
(`.env.local`, nunca commitado). Nunca peça, gere ou escreva uma chave em arquivo.

## Restrições (valem para qualquer sessão neste projeto)

- Não apaga, move, renomeia nem sobrescreve arquivo nenhum fora do diretório de
  trabalho. Se a tarefa parecer exigir isso, para e pergunta.
- Não toca em `C:\Users\gabu_\My Drive\second-brain` nem em `C:\Users\gabu_\.gbrain`.
  Este projeto não tem relação com o second brain nem com o gbrain.
- Não roda comando de escrita fora do diretório de trabalho sem antes confirmar na
  documentação oficial o que ele faz de verdade.
- Não inventa sintaxe: lê a documentação do Supabase e do SDK do Gemini antes de
  usar.
- Decisão que o usuário não tomou, o agente não toma por ele: propõe e espera.
