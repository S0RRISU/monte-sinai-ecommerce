-- 2026-05-22: Harden admin roles, add secure RPC admin_set_user_role and audit
-- Idempotent: safe to run multiple times

begin;

-- Ensure pgcrypto exists for UUID helper
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Ensure admin_audit_logs exists (may already exist)
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

-- Replace admin_can_write to rely on profiles.admin_role / is_admin only
create or replace function public.admin_can_write()
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (
      select p.is_admin or p.admin_role in ('developer', 'owner', 'staff', 'admin', 'manager')
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.admin_can_write() from public;
grant execute on function public.admin_can_write() to authenticated;

-- Create secure RPC to set user role with server-side validation and audit
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
)
returns table (id uuid, user_id uuid, role text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  actor_is_admin boolean := false;
  old_role text := null;
  v_id uuid;
  v_user uuid;
  v_role text;
begin
  if actor is null then
    raise exception 'Autenticacao obrigatoria para operacao administrativa';
  end if;

  select admin_role, is_admin into actor_role, actor_is_admin
  from public.profiles where id = actor;

  if not coalesce(actor_is_admin, false) and actor_role is null then
    raise exception 'Acesso administrativo negado';
  end if;

  -- normalize role
  if p_role is null then
    raise exception 'Role invalido';
  end if;
  p_role := lower(btrim(p_role));

  -- Only a developer can assign the developer role
  if p_role = 'developer' and actor_role <> 'developer' then
    raise exception 'Apenas usuarios com papel developer podem atribuir developer';
  end if;

  -- read existing role for target
  select role into old_role from public.perfis_usuarios where user_id = p_user_id limit 1;
  if old_role is null then
    -- if no explicit perfis_usuarios row, try profiles.admin_role
    select admin_role into old_role from public.profiles where id = p_user_id limit 1;
  end if;

  -- Do not allow non-developers to change an existing developer
  if coalesce(old_role, '') = 'developer' and actor_role <> 'developer' then
    raise exception 'Somente developer pode alterar um usuario com papel developer';
  end if;

  -- perform update or insert
  update public.perfis_usuarios set role = p_role where user_id = p_user_id returning id, user_id, role into v_id, v_user, v_role;
  if not found then
    insert into public.perfis_usuarios (user_id, role) values (p_user_id, p_role) returning id, user_id, role into v_id, v_user, v_role;
  end if;

  -- write audit log
  insert into public.admin_audit_logs (
    actor_id, actor_email, action, entity_type, entity_id, metadata
  ) values (
    actor,
    coalesce((select u.email from auth.users u where u.id = actor), ''),
    'set_user_role',
    'user',
    p_user_id::text,
    jsonb_build_object('old_role', coalesce(old_role, ''), 'new_role', p_role)
  );

  return query select id, user_id, role from public.perfis_usuarios where id = v_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- Harden perfis_usuarios: enable RLS and prevent client-side writes
-- This requires that role changes go through the RPC above.

alter table public.perfis_usuarios enable row level security;

-- Drop policies that allow client updates if they exist, then create safe policies
-- Allow select to owners and admins or the user themselves

-- remove generic update/insert policies if present
-- (unable to drop by name universally; create safe policies that restrict writes)

-- Create/select policies (drop if existing to be idempotent)
drop policy if exists perfis_select_for_admins on public.perfis_usuarios;
create policy perfis_select_for_admins on public.perfis_usuarios for select using (
  public.is_admin() or auth.uid() = user_id
);

drop policy if exists perfis_no_client_write on public.perfis_usuarios;
create policy perfis_no_client_write on public.perfis_usuarios for all using (false) with check (false);

commit;

-- End of hardening
