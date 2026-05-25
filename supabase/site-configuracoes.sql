-- Configuracoes globais do site controladas pelo painel administrativo.
-- Execute depois de schema-pedidos.sql e 20260524-base-rbac-permissoes.sql.

begin;

create table if not exists public.site_configuracoes (
  id text primary key default 'site',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_configuracoes enable row level security;

grant select on public.site_configuracoes to anon, authenticated;
grant insert, update, delete on public.site_configuracoes to authenticated;

drop policy if exists "site_configuracoes_public_read" on public.site_configuracoes;
create policy "site_configuracoes_public_read"
on public.site_configuracoes for select
to anon, authenticated
using (true);

drop policy if exists "site_configuracoes_admin_write" on public.site_configuracoes;
create policy "site_configuracoes_admin_write"
on public.site_configuracoes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.site_configuracoes (id, config)
values ('site', '{}'::jsonb)
on conflict (id) do nothing;

commit;
