-- Corrige endereco oficial da loja Monte Sinai nas configuracoes publicas.
-- Nao altera schema e nao usa DELETE/TRUNCATE.

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
on public.site_configuracoes
for select
to anon, authenticated
using (true);

drop policy if exists "site_configuracoes_admin_write" on public.site_configuracoes;
create policy "site_configuracoes_admin_write"
on public.site_configuracoes
for all
to authenticated
using ((select public.admin_can_write()))
with check ((select public.admin_can_write()));

insert into public.site_configuracoes (id, config)
values ('site', '{}'::jsonb)
on conflict (id) do nothing;

update public.site_configuracoes
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
      'address', 'Rua Frederico Consolo, 31 F - Pirajussara, Sao Paulo - SP',
      'deliveryAreas', 'Pirajussara e bairros proximos'
    ),
    updated_at = now()
where id = 'site';

notify pgrst, 'reload schema';

commit;

-- Conferencia depois de rodar:
-- select config->>'address' as endereco,
--        config->>'deliveryAreas' as areas_atendidas
-- from public.site_configuracoes
-- where id = 'site';
