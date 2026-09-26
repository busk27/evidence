# Ideias futuras

Anotadas para depois. Nenhuma está implementada.

## PENDÊNCIA OBRIGATÓRIA: ligar RLS antes de qualquer outra pessoa usar o sistema

Não é ideia opcional. **Antes de qualquer pessoa além do grupo usar o sistema**,
isto tem que estar feito.

A migration `0001_init.sql` cria `firms`, `contacts`, `conversations`, `facts` e
`open_questions` no schema `public` sem `enable row level security`. No Supabase,
tabela do `public` sem RLS fica exposta pela API REST (PostgREST) para o papel
`anon`: quem tiver a URL do projeto e a anon key consegue ler, alterar e apagar
tudo direto, sem passar pelo backend.

Por que isso importa aqui além do vazamento: as regras de negócio (1, 2, 3 e 4,
a trava de verbatim, a correção que nunca apaga) moram no backend. Escrita
direta no banco pula todas elas. Qualquer um poderia gravar paráfrase como
citação, mudar `firms.stage` ou apagar evidência.

Por que não foi feito agora: o app nunca expõe a anon key (o backend usa só a
service role, que ignora RLS), e a funcionalidade foi congelada para a entrega
de 01/10/2026. As funções `retract_fact` e `correct_fact` (migration 0002) já
restringem `execute` à `service_role`.

O que fazer: migration nova com `alter table ... enable row level security` nas
cinco tabelas, sem nenhuma policy para `anon`/`authenticated`, já que só o backend
acessa o banco. Depois, testar que os endpoints continuam funcionando e que a
anon key não lê nada.

## Marcar como suspeito o registro que contém U+FFFD (em vez de recusar)

Hoje a API recusa com 400 corpo que não é UTF-8 válido (`src/lib/api/read-json.ts`).
Isso pega a causa: um cliente mandando outra codificação.

Continua passando texto UTF-8 válido que já chega com `�` (U+FFFD) dentro,
corrompido antes de sair do cliente. **Decisão: não recusar.** Esse caractere
aparece em despejo legítimo, colado de PDF, WhatsApp ou e-mail antigo, e recusar
a conversa inteira por um caractere faz perder o despejo todo logo depois da
call, que é quando menos dá para perder. A regra do UTF-8 pega a causa; recusar
por U+FFFD pegaria o sintoma.

Ideia: gravar normalmente e marcar o registro (conversa, fato, firma ou contato)
como suspeito de texto corrompido, para alguém revisar antes de confiar nele.
