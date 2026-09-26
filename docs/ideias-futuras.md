# Ideias futuras

Anotadas para depois. Nenhuma está implementada.

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
