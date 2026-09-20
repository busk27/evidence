-- Dado de teste local. Não é feature: não existe (ainda) endpoint para criar
-- firms/contacts pela API — ver decisão em aberto no README/handoff.
insert into firms (id, name, country, size, stage)
values (
  '11111111-1111-1111-1111-111111111111',
  'Firma de Teste Ltda',
  'BR',
  '11-50',
  'conversa-marcada'
)
on conflict (id) do nothing;

insert into contacts (id, firm_id, name, role, email)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Fulano de Tal',
  'Sócio',
  'fulano@firmadeteste.com'
)
on conflict (id) do nothing;
