-- Evidence: tese do usuário e leitura de cada fato pela lente dela.
-- A tese mora só aqui (o repositório é público): uma linha, id = 1.

create table thesis (
  id smallint primary key default 1 check (id = 1),
  text text not null,
  updated_at timestamptz not null default now()
);

-- Mesma trava das outras tabelas: só o backend (service role) lê e escreve.
alter table thesis enable row level security;

create type thesis_signal as enum ('alinhado', 'explorar', 'atencao');

-- Leitura do modelo, separada do fato: o texto do fato continua sendo só o que
-- foi dito. Sem relação com nenhuma hipótese = os dois nulos ("Contexto").
alter table facts
  add column thesis_signal thesis_signal,
  add column thesis_reason text;

alter table facts
  add constraint facts_thesis_reading_complete
  check ((thesis_signal is null) = (thesis_reason is null));

notify pgrst, 'reload schema';
