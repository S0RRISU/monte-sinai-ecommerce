-- 2026-05-22: hardening de permissoes administrativas e equipe
-- Idempotente: pode ser executado mais de uma vez no SQL Editor do Supabase.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists admin_role text not null default 'customer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_admin_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_admin_role_check
      check (admin_role in ('developer', 'owner', 'staff', 'customer'));
  end if;
end $$;

create table if not exists public.perfis_usuarios (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.perfis_usuarios
  add column if not exists id uuid default extensions.gen_random_uuid(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists role text not null default 'customer',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_perfis_usuarios_user_id
  on public.perfis_usuarios (user_id);

create table if not exists public.admin_audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid,
  actor_email text not null default '',
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs (created_at desc);

alter table public.profiles enable row level security;
alter table public.perfis_usuarios enable row level security;
alter table public.admin_audit_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_admin or p.admin_role in ('developer', 'owner', 'staff')
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.admin_can_write()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_admin or p.admin_role in ('developer', 'owner', 'staff')
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.admin_can_write() from public;
grant execute on function public.admin_can_write() to authenticated;

drop function if exists public.admin_set_user_role(uuid, text);

create function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
)
returns table (id uuid, email text, admin_role text, is_admin boolean, legacy_role text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  actor_email text := '';
  target_role text := lower(btrim(coalesce(p_role, '')));
  old_role text := '';
  target_email text := '';
  legacy_value text := '';
begin
  if actor is null then
    raise exception 'Autenticacao obrigatoria para operacao administrativa';
  end if;

  select p.admin_role, coalesce(p.email, u.email, '')
    into actor_role, actor_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = actor;

  actor_role := lower(btrim(coalesce(actor_role, 'customer')));

  if actor_role not in ('developer', 'owner') then
    raise exception 'Apenas developer ou owner podem gerenciar equipe';
  end if;

  if target_role not in ('developer', 'owner', 'staff', 'customer') then
    raise exception 'Role invalida';
  end if;

  select coalesce(p.email, u.email, ''), lower(btrim(coalesce(p.admin_role, 'customer')))
    into target_email, old_role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if target_email is null then
    raise exception 'Usuario alvo nao encontrado';
  end if;

  if old_role = 'developer' and actor_role <> 'developer' then
    raise exception 'Somente developer pode alterar um usuario developer';
  end if;

  if target_role = 'developer' and actor_role <> 'developer' then
    raise exception 'Somente developer pode atribuir o papel developer';
  end if;

  insert into public.profiles (id, email, nome, is_admin, admin_role)
  values (
    p_user_id,
    target_email,
    coalesce(nullif(split_part(target_email, '@', 1), ''), 'Usuario'),
    target_role in ('developer', 'owner', 'staff'),
    target_role
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      is_admin = excluded.is_admin,
      admin_role = excluded.admin_role,
      updated_at = now();

  update public.perfis_usuarios
  set role = target_role,
      updated_at = now()
  where user_id = p_user_id;

  if not found then
    insert into public.perfis_usuarios (user_id, role)
    values (p_user_id, target_role);
  end if;

  select role
    into legacy_value
  from public.perfis_usuarios
  where user_id = p_user_id
  order by updated_at desc nulls last
  limit 1;

  insert into public.admin_audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    actor,
    actor_email,
    'admin_set_user_role',
    'profiles',
    p_user_id::text,
    jsonb_build_object(
      'old_role', old_role,
      'new_role', target_role,
      'target_email', target_email,
      'legacy_table_synced', true
    )
  );

  return query
  select p.id, p.email, p.admin_role, p.is_admin, legacy_value
  from public.profiles p
  where p.id = p_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "admin_audit_logs_select_admin" on public.admin_audit_logs;
create policy "admin_audit_logs_select_admin"
on public.admin_audit_logs for select
to authenticated
using (public.is_admin());

drop policy if exists "admin_audit_logs_insert_admin" on public.admin_audit_logs;
create policy "admin_audit_logs_insert_admin"
on public.admin_audit_logs for insert
to authenticated
with check (public.is_admin());

drop policy if exists perfis_select_for_admins on public.perfis_usuarios;
create policy perfis_select_for_admins
on public.perfis_usuarios for select
to authenticated
using (public.is_admin() or auth.uid() = user_id);

drop policy if exists perfis_no_client_write on public.perfis_usuarios;
create policy perfis_no_client_write
on public.perfis_usuarios for all
to authenticated
using (false)
with check (false);

revoke insert, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, nome, apelido, telefone, endereco, foto) on public.profiles to authenticated;
grant update (id, email, nome, apelido, telefone, endereco, foto, updated_at) on public.profiles to authenticated;

grant select on public.perfis_usuarios to authenticated;
grant select, insert on public.admin_audit_logs to authenticated;

insert into public.profiles (id, email, nome, is_admin, admin_role)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    split_part(u.email, '@', 1)
  ),
  true,
  case
    when lower(u.email) = 'marcelol527319@gmail.com' then 'developer'
    else 'owner'
  end
from auth.users u
where lower(u.email) in (
  'marcelol527319@gmail.com',
  'marcelo52731@gmail.com',
  'patriciapaula01234@gmail.com'
)
on conflict (id) do update
set email = excluded.email,
    is_admin = true,
    admin_role = excluded.admin_role,
    updated_at = now();

update public.perfis_usuarios pu
set role = p.admin_role,
    updated_at = now()
from public.profiles p
where pu.user_id = p.id
  and lower(p.email) in (
    'marcelol527319@gmail.com',
    'marcelo52731@gmail.com',
    'patriciapaula01234@gmail.com'
  );

insert into public.perfis_usuarios (user_id, role)
select p.id, p.admin_role
from public.profiles p
where lower(p.email) in (
  'marcelol527319@gmail.com',
  'marcelo52731@gmail.com',
  'patriciapaula01234@gmail.com'
)
  and not exists (
    select 1
    from public.perfis_usuarios pu
    where pu.user_id = p.id
  );

commit;
