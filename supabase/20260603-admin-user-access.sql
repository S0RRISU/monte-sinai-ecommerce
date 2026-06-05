-- Acesso e permissoes por usuario do painel Monte Sinai.
-- Aditivo: lista usuarios reais, define papel/ativo e libera/bloqueia modulos por usuario.
-- Nao usa DELETE/TRUNCATE.

begin;

alter table public.profiles
  add column if not exists admin_active boolean not null default true,
  add column if not exists avatar_url text,
  add column if not exists photo_url text;

alter table public.profiles
  drop constraint if exists profiles_admin_role_check;

alter table public.profiles
  add constraint profiles_admin_role_check
  check (admin_role in ('developer', 'admin', 'owner', 'equipe', 'staff', 'motoboy', 'customer', 'client'));

create table if not exists public.admin_user_module_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (user_id, module)
);

alter table public.admin_user_module_permissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_user_module_permissions_module_check'
  ) then
    alter table public.admin_user_module_permissions
      add constraint admin_user_module_permissions_module_check
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

create or replace function public.app_normalize_admin_role(
  p_role text,
  p_admin_role text,
  p_is_admin boolean
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(p_admin_role, p_role, ''))) in ('developer', 'dev') then 'developer'
    when lower(btrim(coalesce(p_admin_role, p_role, ''))) in ('admin', 'owner', 'administrator', 'administrador', 'manager') then 'admin'
    when lower(btrim(coalesce(p_admin_role, p_role, ''))) in ('equipe', 'staff', 'atendente', 'operador') then 'equipe'
    when lower(btrim(coalesce(p_admin_role, p_role, ''))) in ('motoboy', 'entregador', 'delivery') then 'motoboy'
    when coalesce(p_is_admin, false) then 'admin'
    else 'cliente'
  end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select coalesce(p.admin_active, true)
        and public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin) in ('developer', 'admin', 'equipe', 'motoboy')
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.admin_can_write()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.is_admin()
    or exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(u.email) in (
          'marcelol527319@gmail.com',
          'patriciapaula01234@gmail.com',
          'marcelo52731@gmail.com'
        )
    ),
    false
  );
$$;

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
  actor_id uuid := auth.uid();
  actor_role text := 'cliente';
  actor_active boolean := false;
begin
  select
    public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin),
    coalesce(p.admin_active, true)
  into actor_role, actor_active
  from public.profiles p
  where p.id = actor_id;

  if actor_id is null or actor_role = 'cliente' or not actor_active then
    return;
  end if;

  return query
  with module_list(module) as (
    select unnest(array[
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
    ])
  )
  select
    actor_role,
    m.module,
    case
      when actor_role = 'developer' then true
      when up.user_id is not null then up.enabled
      when actor_role = 'admin' then coalesce(rp.enabled, false)
      else false
    end as enabled
  from module_list m
  left join public.admin_user_module_permissions up
    on up.user_id = actor_id
   and up.module = m.module
  left join public.admin_module_permissions rp
    on rp.role = 'admin'
   and rp.module = m.module;
end;
$$;

create or replace function public.app_can_access_module(p_module text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := 'cliente';
  actor_active boolean := false;
  clean_module text := lower(btrim(coalesce(p_module, '')));
  result boolean := false;
begin
  select
    public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin),
    coalesce(p.admin_active, true)
  into actor_role, actor_active
  from public.profiles p
  where p.id = actor_id;

  if actor_id is null or actor_role = 'cliente' or not actor_active or clean_module = '' then
    return false;
  end if;

  if actor_role = 'developer' then
    return true;
  end if;

  select
    case
      when up.user_id is not null then up.enabled
      when actor_role = 'admin' then coalesce(rp.enabled, false)
      else false
    end
  into result
  from (select clean_module as module) m
  left join public.admin_user_module_permissions up
    on up.user_id = actor_id
   and up.module = m.module
  left join public.admin_module_permissions rp
    on rp.role = 'admin'
   and rp.module = m.module;

  return coalesce(result, false);
end;
$$;

create or replace function public.developer_users_overview()
returns table (
  id uuid,
  email text,
  name text,
  role text,
  role_label text,
  active boolean,
  avatar_url text,
  last_access timestamptz,
  module_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_role text := 'cliente';
begin
  select public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
    into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role <> 'developer' and not public.app_can_access_module('usuarios') then
    raise exception 'Voce nao tem permissao para consultar usuarios e permissoes.';
  end if;

  return query
  select
    u.id,
    coalesce(p.email, u.email, '') as email,
    coalesce(nullif(p.nome, ''), nullif(u.raw_user_meta_data->>'name', ''), nullif(u.raw_user_meta_data->>'full_name', ''), split_part(coalesce(u.email, ''), '@', 1), 'Usuario') as name,
    public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin) as role,
    case public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
      when 'developer' then 'Desenvolvedor'
      when 'admin' then 'Administrador'
      when 'equipe' then 'Equipe'
      when 'motoboy' then 'Entregador'
      else 'Cliente'
    end as role_label,
    coalesce(p.admin_active, true) as active,
    coalesce(nullif(p.avatar_url, ''), nullif(p.foto, ''), nullif(u.raw_user_meta_data->>'avatar_url', ''), nullif(u.raw_user_meta_data->>'photo', ''), '') as avatar_url,
    u.last_sign_in_at as last_access,
    coalesce((
      select count(*)::integer
      from public.admin_user_module_permissions perm
      where perm.user_id = u.id
        and perm.enabled = true
    ), 0) as module_count,
    p.updated_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by
    case public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
      when 'developer' then 1
      when 'admin' then 2
      when 'equipe' then 3
      when 'motoboy' then 4
      else 5
    end,
    coalesce(u.last_sign_in_at, p.updated_at, u.created_at) desc nulls last;
end;
$$;

create or replace function public.developer_user_module_permissions(p_user_id uuid)
returns table (
  user_id uuid,
  module text,
  enabled boolean,
  locked boolean,
  source text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_role text := 'cliente';
  target_role text := 'cliente';
  target_active boolean := false;
begin
  select public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
    into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role <> 'developer' and not public.app_can_access_module('usuarios') then
    raise exception 'Voce nao tem permissao para consultar permissoes por usuario.';
  end if;

  select
    public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin),
    coalesce(p.admin_active, true)
  into target_role, target_active
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if target_role is null then
    raise exception 'Usuario alvo nao encontrado.';
  end if;

  return query
  with module_list(module) as (
    select unnest(array[
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
    ])
  )
  select
    p_user_id,
    m.module,
    case
      when target_role = 'developer' and target_active then true
      when not target_active then false
      when up.user_id is not null then up.enabled
      when target_role = 'admin' then coalesce(rp.enabled, false)
      else false
    end as enabled,
    target_role = 'developer' as locked,
    case
      when target_role = 'developer' then 'developer'
      when up.user_id is not null then 'usuario'
      when target_role = 'admin' then 'admin'
      else 'sem acesso'
    end as source
  from module_list m
  left join public.admin_user_module_permissions up
    on up.user_id = p_user_id
   and up.module = m.module
  left join public.admin_module_permissions rp
    on rp.role = 'admin'
   and rp.module = m.module;
end;
$$;

create or replace function public.developer_set_user_module_permission(
  p_user_id uuid,
  p_module text,
  p_enabled boolean
)
returns table (
  user_id uuid,
  module text,
  enabled boolean,
  locked boolean,
  source text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_role text := 'cliente';
  target_role text := 'cliente';
  clean_module text := lower(btrim(coalesce(p_module, '')));
begin
  select public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
    into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role <> 'developer' and not public.app_can_access_module('usuarios') then
    raise exception 'Voce nao tem permissao para alterar permissoes por usuario.';
  end if;

  select public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
    into target_role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if target_role is null then
    raise exception 'Usuario alvo nao encontrado.';
  end if;

  if target_role = 'developer' then
    raise exception 'Usuario developer sempre tem acesso total.';
  end if;

  if actor_role <> 'developer' and clean_module in ('usuarios', 'configuracoes', 'logs') then
    raise exception 'Apenas developer pode liberar modulos tecnicos.';
  end if;

  insert into public.admin_user_module_permissions (user_id, module, enabled, updated_at, updated_by)
  values (p_user_id, clean_module, coalesce(p_enabled, false), now(), auth.uid())
  on conflict on constraint admin_user_module_permissions_pkey
  do update set
    enabled = excluded.enabled,
    updated_at = now(),
    updated_by = auth.uid();

  return query
  select perms.user_id, perms.module, perms.enabled, perms.locked, perms.source
  from public.developer_user_module_permissions(p_user_id) as perms
  where perms.module = clean_module;
end;
$$;

create or replace function public.developer_set_user_access(
  p_user_id uuid,
  p_role text,
  p_active boolean
)
returns table (
  id uuid,
  email text,
  name text,
  role text,
  role_label text,
  active boolean,
  avatar_url text,
  last_access timestamptz,
  module_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_role text := 'cliente';
  clean_role text := lower(btrim(coalesce(p_role, 'cliente')));
  target_role text := 'cliente';
  target_email text := '';
begin
  select public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
    into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role <> 'developer' and not public.app_can_access_module('usuarios') then
    raise exception 'Voce nao tem permissao para alterar acesso de usuarios.';
  end if;

  clean_role := case
    when clean_role in ('developer', 'dev') then 'developer'
    when clean_role in ('admin', 'owner', 'administrador', 'manager') then 'admin'
    when clean_role in ('equipe', 'staff', 'atendente', 'operador') then 'equipe'
    when clean_role in ('motoboy', 'entregador', 'delivery') then 'motoboy'
    else 'cliente'
  end;

  select coalesce(u.email, ''), public.app_normalize_admin_role(p.role, p.admin_role, p.is_admin)
    into target_email, target_role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if target_email is null then
    raise exception 'Usuario alvo nao encontrado.';
  end if;

  if actor_role <> 'developer' and (target_role = 'developer' or clean_role = 'developer') then
    raise exception 'Apenas developer pode alterar contas developer.';
  end if;

  if p_user_id = auth.uid() and (clean_role <> 'developer' or coalesce(p_active, true) = false) then
    raise exception 'Voce nao pode remover seu proprio acesso developer.';
  end if;

  insert into public.profiles (id, email, nome, is_admin, admin_role, role, admin_active, updated_at)
  values (
    p_user_id,
    target_email,
    coalesce(nullif(split_part(target_email, '@', 1), ''), 'Usuario'),
    clean_role in ('developer', 'admin', 'equipe', 'motoboy'),
    clean_role,
    clean_role,
    coalesce(p_active, true),
    now()
  )
  on conflict on constraint profiles_pkey
  do update
  set email = coalesce(public.profiles.email, excluded.email),
      is_admin = excluded.is_admin,
      admin_role = excluded.admin_role,
      role = excluded.role,
      admin_active = excluded.admin_active,
      updated_at = now();

  if to_regclass('public.admin_audit_logs') is not null then
    insert into public.admin_audit_logs (
      actor_id,
      actor_email,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      auth.uid(),
      coalesce((select actor_user.email from auth.users as actor_user where actor_user.id = auth.uid()), ''),
      'developer_set_user_access',
      'profiles',
      p_user_id::text,
      jsonb_build_object('old_role', target_role, 'new_role', clean_role, 'active', coalesce(p_active, true))
    );
  end if;

  return query
  select overview.id,
         overview.email,
         overview.name,
         overview.role,
         overview.role_label,
         overview.active,
         overview.avatar_url,
         overview.last_access,
         overview.module_count,
         overview.updated_at
  from public.developer_users_overview() as overview
  where overview.id = p_user_id;
end;
$$;

revoke all on function public.app_normalize_admin_role(text, text, boolean) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.admin_can_write() from public;
revoke all on function public.app_current_module_access() from public;
revoke all on function public.app_can_access_module(text) from public;
revoke all on function public.developer_users_overview() from public;
revoke all on function public.developer_user_module_permissions(uuid) from public;
revoke all on function public.developer_set_user_module_permission(uuid, text, boolean) from public;
revoke all on function public.developer_set_user_access(uuid, text, boolean) from public;

grant execute on function public.app_normalize_admin_role(text, text, boolean) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_can_write() to authenticated;
grant execute on function public.app_current_module_access() to authenticated;
grant execute on function public.app_can_access_module(text) to authenticated;
grant execute on function public.developer_users_overview() to authenticated;
grant execute on function public.developer_user_module_permissions(uuid) to authenticated;
grant execute on function public.developer_set_user_module_permission(uuid, text, boolean) to authenticated;
grant execute on function public.developer_set_user_access(uuid, text, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
