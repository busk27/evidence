-- Evidence: firma escondida da lista e dos totais do painel.
-- Uma firma hidden continua no banco e abre por link direto
-- (GET /api/firms/{id}); só sai de GET /api/firms e dos totais.

alter table firms add column hidden boolean not null default false;

-- Avisa o PostgREST da coluna nova.
notify pgrst, 'reload schema';
