-- Evidence: correção de fatos sem apagar evidência.
-- Um fato nunca é editado nem apagado: é marcado como 'wrong' (com motivo) e,
-- se houver versão certa, ela entra como fato novo apontando para o original,
-- com o mesmo conversation_id (a fonte continua sendo o mesmo despejo, só lido
-- direito). As regras de negócio 1, 2 e 4 e a trava de verbatim rodam no
-- backend antes de chamar correct_fact; estas funções só garantem a
-- atomicidade.

create type fact_status as enum ('valid', 'wrong');

alter table facts
  add column status fact_status not null default 'valid',
  add column status_reason text,
  add column status_changed_at timestamptz,
  add column corrects_fact_id uuid references facts (id) on delete set null;

alter table facts
  add constraint facts_wrong_needs_reason
  check (status = 'valid' or length(trim(coalesce(status_reason, ''))) > 0);

create index facts_corrects_fact_id_idx on facts (corrects_fact_id);
create index facts_firm_field_valid_idx on facts (firm_id, field) where status = 'valid';

-- Marca o fato como errado. Se o campo ficar sem nenhum fato válido e sem
-- pergunta aberta, cria a pergunta (regra 4: campo vazio vira pergunta). O
-- texto da pergunta vem do backend e nasce do campo, não do fato retratado.
create function retract_fact(p_fact_id uuid, p_reason text, p_question text)
returns jsonb
language plpgsql
as $$
declare
  v_fact facts;
  v_question open_questions;
begin
  update facts
     set status = 'wrong', status_reason = p_reason, status_changed_at = now()
   where id = p_fact_id and status = 'valid'
  returning * into v_fact;

  if not found then
    if exists (select 1 from facts where id = p_fact_id) then
      raise exception 'fato % já está marcado como errado', p_fact_id using errcode = 'P0001';
    end if;
    raise exception 'fato % não encontrado', p_fact_id using errcode = 'P0002';
  end if;

  if not exists (
       select 1 from facts
        where firm_id = v_fact.firm_id and field = v_fact.field and status = 'valid')
     and not exists (
       select 1 from open_questions
        where firm_id = v_fact.firm_id and field = v_fact.field and status = 'open')
  then
    insert into open_questions (firm_id, field, question)
    values (v_fact.firm_id, v_fact.field, p_question)
    returning * into v_question;
  end if;

  return jsonb_build_object(
    'fact', to_jsonb(v_fact),
    'open_question', to_jsonb(v_question)
  );
end;
$$;

-- Marca o original como errado e grava a versão certa no mesmo campo e na
-- mesma conversa, apontando para o original. Tudo ou nada.
create function correct_fact(
  p_fact_id uuid,
  p_reason text,
  p_statement text,
  p_verbatim text,
  p_confidence fact_confidence
)
returns jsonb
language plpgsql
as $$
declare
  v_original facts;
  v_new facts;
begin
  update facts
     set status = 'wrong', status_reason = p_reason, status_changed_at = now()
   where id = p_fact_id and status = 'valid'
  returning * into v_original;

  if not found then
    if exists (select 1 from facts where id = p_fact_id) then
      raise exception 'fato % já está marcado como errado', p_fact_id using errcode = 'P0001';
    end if;
    raise exception 'fato % não encontrado', p_fact_id using errcode = 'P0002';
  end if;

  insert into facts (firm_id, conversation_id, field, statement, verbatim, confidence, corrects_fact_id)
  values (v_original.firm_id, v_original.conversation_id, v_original.field,
          p_statement, p_verbatim, p_confidence, v_original.id)
  returning * into v_new;

  return jsonb_build_object('original', to_jsonb(v_original), 'fact', to_jsonb(v_new));
end;
$$;

-- Só o backend (service role) chama estas funções. Sem isto, qualquer um com a
-- anon key conseguiria retratar fato direto pelo PostgREST, pulando as regras.
revoke execute on function retract_fact(uuid, text, text) from public, anon, authenticated;
revoke execute on function correct_fact(uuid, text, text, text, fact_confidence) from public, anon, authenticated;
grant execute on function retract_fact(uuid, text, text) to service_role;
grant execute on function correct_fact(uuid, text, text, text, fact_confidence) to service_role;
