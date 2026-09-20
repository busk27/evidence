-- Evidence: schema inicial.
-- firms -> contacts -> conversations -> facts / open_questions

create extension if not exists "pgcrypto";

create type firm_stage as enum (
  'nao-contatada',
  'conversa-marcada',
  'conversa-feita',
  'preco-testado',
  'piloto-proposto',
  'assinou',
  'descartada'
);

create type profile_field as enum (
  'interlocutor',
  'decisor_ou_operador',
  'quem_opera_dd',
  'origem_do_contato',
  'tamanho_praca_cliente',
  'volume_dd',
  'entregavel_final',
  'quem_faz_preparacao_hoje',
  'ia_em_uso',
  'gargalo_frase_literal',
  'horas_do_gargalo_por_projeto',
  'de_quem_sao_as_horas',
  'projetos_por_mes',
  'destino_da_hora_economizada',
  'preco_testado',
  'reacao_ao_preco',
  'objecao_principal',
  'shadowing',
  'acesso_data_room',
  'proximo_passo'
);

create type fact_confidence as enum ('stated', 'reported');

create type open_question_status as enum ('open', 'answered', 'dropped');

create table firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  size text,
  stage firm_stage not null default 'nao-contatada',
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  name text not null,
  role text,
  email text
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  happened_on date not null default current_date,
  raw_dump text not null,
  created_at timestamptz not null default now()
);

create table facts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  conversation_id uuid not null references conversations (id) on delete cascade,
  field profile_field not null,
  statement text not null,
  verbatim text,
  confidence fact_confidence not null,
  created_at timestamptz not null default now()
);

create table open_questions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  field profile_field not null,
  question text not null,
  status open_question_status not null default 'open',
  created_at timestamptz not null default now()
);

create index facts_firm_id_idx on facts (firm_id);
create index facts_conversation_id_idx on facts (conversation_id);
create index open_questions_firm_id_idx on open_questions (firm_id);
create index contacts_firm_id_idx on contacts (firm_id);
create index conversations_firm_id_idx on conversations (firm_id);
