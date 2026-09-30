-- Evidence: fecha o acesso direto às tabelas.
-- A chave publicável do Supabase é pública por desenho. Sem RLS, quem a tiver
-- lê e escreve nas tabelas direto pelo PostgREST, pulando a API e as regras.
-- Com RLS ligado e nenhuma policy, anon e authenticated não veem nada; só o
-- backend (service role, que ignora RLS) acessa os dados, depois de checar a
-- sessão em cada rota.

alter table firms enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table facts enable row level security;
alter table open_questions enable row level security;
