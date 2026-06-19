-- Permissoes de modulos do painel Monte Sinai.
-- Aditivo: cria uma tabela de permissoes e RPCs para o App Desenvolvedor liberar/bloquear modulos do App Administrador.
-- ATENCAO: este arquivo nao lista usuarios reais.
-- Para a tela /usuarios funcionar, rode tambem supabase/20260603-admin-user-access.sql.

begin;

create table if not exists public.admin_module_permissions (
  role text not null,
  module text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (role, module)
);

alter table public.admin_module_permissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_module_permissions_role_check'
  ) then
    alter table public.admin_module_permissions
      add constraint admin_module_permissions_role_check
      check (role in ('admin', 'developer'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'admin_module_permissions_module_check'
  ) then
    alter table public.admin_module_permissions
      add constraint admin_module_permissions_module_check
      check (module in (
        'dashboard',
        'pedidos',
        'produtos',
        'estoque',
        'clientes',
        'entregas',
        'financeiro',
        'relatorios',
        'promocoes',
        'atendimento',
        'usuarios',
        'configuracoes',
        'logs'
      ));
  end if;
end $$;

insert into public.admin_module_permissions (role, module, enabled)
values
  ('admin', 'dashboard', true),
  ('admin', 'pedidos', true),
  ('admin', 'produtos', true),
  ('admin', 'estoque', true),
  ('admin', 'clientes', false),
  ('admin', 'entregas', false),
  ('admin', 'financeiro', false),
  ('admin', 'relatorios', false),
  ('admin', 'promocoes', false),
  ('admin', 'atendimento', false),
  ('admin', 'usuarios', false),
  ('admin', 'configuracoes', false),
  ('admin', 'logs', false)
on conflict (role, module) do nothing;

create or replace function public.app_current_module_access()
returns table (
  role text,
  module text,
  enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := 'cliente';
begin
  select coalesce(p.role, 'cliente')
    into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role = 'developer' then
    return query
    select actor_role, x.module, true
    from unnest(array[
      'dashboard',
      'pedidos',
      'produtos',
      'estoque',
      'clientes',
      'entregas',
      'financeiro',
      'relatorios',
      'promocoes',
      'atendimento',
      'usuarios',
      'configuracoes',
      'logs'
    ]) as x(module);
    return;
  end if;

  return query
  select p.role, p.module, p.enabled
  from public.admin_module_permissions p
  where p.role = actor_role;
end;
$$;

create or replace function public.developer_module_permissions()
returns table (
  role text,
  module text,
  enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := 'cliente';
begin
  select coalesce(p.role, 'cliente')
    into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role <> 'developer' then
    raise exception 'Apenas developer pode gerenciar permissoes de modulo.';
  end if;

  return query
  select p.role, p.module, p.enabled
  from public.admin_module_permissions p
  order by p.role, p.module;
end;
$$;

create or replace function public.developer_set_module_permission(
  p_role text,
  p_module text,
  p_enabled boolean
)
returns table (
  role text,
  module text,
  enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := 'cliente';
  clean_role text := lower(btrim(coalesce(p_role, '')));
  clean_module text := lower(btrim(coalesce(p_module, '')));
begin
  select coalesce(p.role, 'cliente')
    into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role <> 'developer' then
    raise exception 'Apenas developer pode alterar permissoes.';
  end if;

  if clean_role <> 'admin' then
    raise exception 'Nesta etapa apenas permissoes do admin podem ser alteradas.';
  end if;

  if clean_module in ('usuarios', 'configuracoes', 'logs') then
    raise exception 'Modulo exclusivo do developer.';
  end if;

  insert into public.admin_module_permissions (role, module, enabled, updated_at, updated_by)
  values (clean_role, clean_module, coalesce(p_enabled, false), now(), auth.uid())
  on conflict (role, module)
  do update set
    enabled = excluded.enabled,
    updated_at = now(),
    updated_by = auth.uid();

  return query
  select p.role, p.module, p.enabled
  from public.admin_module_permissions p
  where p.role = clean_role
    and p.module = clean_module;
end;
$$;

revoke all on function public.app_current_module_access() from public;
revoke all on function public.developer_module_permissions() from public;
revoke all on function public.developer_set_module_permission(text, text, boolean) from public;

grant execute on function public.app_current_module_access() to authenticated;
grant execute on function public.developer_module_permissions() to authenticated;
grant execute on function public.developer_set_module_permission(text, text, boolean) to authenticated;

commit;
