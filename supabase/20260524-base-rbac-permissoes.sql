-- Base oficial de cargos/permissoes Monte Sinai.
-- Seguro para reexecutar. Nao apaga dados.

-- Nota: esta migração é idempotente — droppa constraints antigas,
-- normaliza valores legados e recria a constraint canônica.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  apelido text,
  telefone text,
  endereco text,
  foto text,
  is_admin boolean not null default false,
  admin_role text not null default 'customer',
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists nome text,
  add column if not exists apelido text,
  add column if not exists telefone text,
  add column if not exists endereco text,
  add column if not exists foto text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists admin_role text not null default 'customer',
  add column if not exists role text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  alter column is_admin set default false,
  alter column admin_role set default 'customer',
  alter column created_at set default now(),
  alter column updated_at set default now();

-- Drop old role constraints before attempting to normalize values.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_admin_role_check;

-- Backfill missing profile rows and missing email/name from Supabase Auth.
insert into public.profiles (id, email, nome, role, is_admin, admin_role)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    split_part(u.email, '@', 1)
  ),
  'cliente',
  false,
  'customer'
from auth.users u
on conflict (id) do nothing;

update public.profiles p
set email = coalesce(nullif(p.email, ''), u.email),
    nome = coalesce(
      nullif(p.nome, ''),
      nullif(u.raw_user_meta_data->>'name', ''),
      nullif(u.raw_user_meta_data->>'full_name', ''),
      split_part(u.email, '@', 1)
    ),
    updated_at = coalesce(p.updated_at, now())
from auth.users u
where p.id = u.id
  and (
    p.email is null
    or btrim(p.email) = ''
    or p.nome is null
    or btrim(p.nome) = ''
    or p.updated_at is null
  );

-- Normalize legacy or inconsistent role values into the canonical set:
-- cliente, equipe, motoboy, admin, developer
update public.profiles
set role = case
  when lower(coalesce(email, '')) = 'marcelol527319@gmail.com' then 'developer'
  when lower(coalesce(email, '')) in ('marcelo52731@gmail.com', 'patriciapaula01234@gmail.com') then 'admin'
  when lower(coalesce(email, '')) = 'marcelosorrisu527@gmail.com' then 'cliente'

  -- normalize explicit role text variants first
  when lower(btrim(coalesce(role, ''))) in ('developer', 'dev') then 'developer'
  when lower(btrim(coalesce(role, ''))) in ('owner', 'admin', 'administrator') then 'admin'
  when lower(btrim(coalesce(role, ''))) in ('staff', 'equipe') then 'equipe'
  when lower(btrim(coalesce(role, ''))) in ('customer', 'client', 'cliente') then 'cliente'
  when lower(btrim(coalesce(role, ''))) in ('delivery', 'courier', 'motoboy') then 'motoboy'

  -- fallback to legacy admin_role column if present
  when lower(btrim(coalesce(admin_role, ''))) in ('developer', 'dev') then 'developer'
  when lower(btrim(coalesce(admin_role, ''))) in ('owner', 'admin') then 'admin'
  when lower(btrim(coalesce(admin_role, ''))) in ('staff', 'equipe') then 'equipe'
  when lower(btrim(coalesce(admin_role, ''))) in ('delivery', 'courier', 'motoboy') then 'motoboy'
  when lower(btrim(coalesce(admin_role, ''))) in ('customer', 'client', 'cliente') then 'cliente'

  -- preserve existing canonical values
  when lower(btrim(coalesce(role, ''))) in ('cliente', 'equipe', 'motoboy', 'admin', 'developer') then lower(btrim(role))

  -- if the is_admin flag was true, prefer admin
  when coalesce(is_admin, false) then 'admin'
  else 'cliente'
end
where role is null
  or lower(btrim(role)) not in ('cliente', 'equipe', 'motoboy', 'admin', 'developer')
  or lower(coalesce(email, '')) in (
    'marcelol527319@gmail.com',
    'marcelo52731@gmail.com',
    'patriciapaula01234@gmail.com',
    'marcelosorrisu527@gmail.com'
  );

-- Synchronize is_admin according to canonical roles.
update public.profiles
set is_admin = role in ('admin', 'developer')
where is_admin is distinct from (role in ('admin', 'developer'));

update public.profiles
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now()),
    admin_role = coalesce(nullif(btrim(admin_role), ''), 'customer')
where created_at is null
  or updated_at is null
  or admin_role is null
  or btrim(admin_role) = '';

-- Keep the legacy admin_role column coherent for older scripts/pages.
update public.profiles
set admin_role = case role
  when 'developer' then 'developer'
  when 'admin' then 'owner'
  when 'equipe' then 'staff'
  when 'motoboy' then 'delivery'
  else 'customer'
end
where admin_role is distinct from case role
  when 'developer' then 'developer'
  when 'admin' then 'owner'
  when 'equipe' then 'staff'
  when 'motoboy' then 'delivery'
  else 'customer'
end;

alter table public.profiles
  alter column role set default 'cliente',
  alter column role set not null,
  alter column is_admin set not null,
  alter column admin_role set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

-- Recreate the canonical role check constraint.
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('cliente', 'equipe', 'motoboy', 'admin', 'developer'));

create or replace function public.sync_profile_role_admin_flag()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.role := lower(btrim(coalesce(new.role, 'cliente')));
  if new.role not in ('cliente', 'equipe', 'motoboy', 'admin', 'developer') then
    new.role := 'cliente';
  end if;
  new.is_admin := new.role in ('admin', 'developer');
  new.admin_role := case new.role
    when 'developer' then 'developer'
    when 'admin' then 'owner'
    when 'equipe' then 'staff'
    when 'motoboy' then 'delivery'
    else 'customer'
  end;
  new.updated_at := coalesce(new.updated_at, now());
  return new;
end;
$$;

drop trigger if exists sync_profile_role_admin_flag on public.profiles;
create trigger sync_profile_role_admin_flag
before insert or update of role, is_admin on public.profiles
for each row
execute function public.sync_profile_role_admin_flag();

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    'cliente'
  );
$$;

drop function if exists public.current_profile_for_app();

create or replace function public.current_profile_for_app()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  select jsonb_build_object(
    'id', au.id,
    'email', au.email,
    'nome', coalesce(
      nullif(p.nome, ''),
      nullif(au.raw_user_meta_data->>'nome', ''),
      nullif(au.raw_user_meta_data->>'name', ''),
      au.email
    ),
    'role', coalesce(
      nullif(p.role, ''),
      case
        when p.is_admin is true then 'admin'
        else 'cliente'
      end
    ),
    'is_admin', coalesce(p.is_admin, false)
  )
  from auth.users au
  left join public.profiles p on p.id = au.id
  where au.id = auth.uid()
  limit 1;
$$;

drop function if exists public.app_current_profile();

create or replace function public.app_current_profile()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  with current_profile as (
    select
      p.id,
      p.email::text as profile_email,
      p.nome::text as profile_nome,
      p.role::text as profile_role,
      coalesce(p.is_admin, false)::boolean as profile_is_admin
    from public.profiles p
    where p.id = auth.uid()
    limit 1
  )
  select
    case
      when auth.uid() is null then null
      when not exists (select 1 from current_profile) then jsonb_build_object(
        'id', auth.uid(),
        'email', auth.jwt() ->> 'email',
        'nome', coalesce(auth.jwt() ->> 'name', auth.jwt() ->> 'email'),
        'role', 'cliente',
        'is_admin', false
      )
      else (
        select jsonb_build_object(
          'id', cp.id,
          'email', coalesce(
            case when length(trim(coalesce(cp.profile_email, ''))) > 0 then cp.profile_email end,
            auth.jwt() ->> 'email'
          ),
          'nome', coalesce(
            case when length(trim(coalesce(cp.profile_nome, ''))) > 0 then cp.profile_nome end,
            auth.jwt() ->> 'name',
            auth.jwt() ->> 'email',
            cp.profile_email
          ),
          'role', coalesce(
            case when length(trim(coalesce(cp.profile_role, ''))) > 0 then cp.profile_role end,
            case when cp.profile_is_admin is true then 'admin' else 'cliente' end
          ),
          'is_admin', cp.profile_is_admin
        )
        from current_profile cp
      )
    end;
$$;

create or replace function public.is_developer()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'developer';
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'developer');
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('equipe', 'admin', 'developer');
$$;

create or replace function public.is_delivery()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('motoboy', 'admin', 'developer');
$$;

create or replace function public.can_access_admin_panel()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('equipe', 'admin', 'developer');
$$;

create or replace function public.can_access_delivery_panel()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('motoboy', 'admin', 'developer');
$$;

create or replace function public.admin_can_write()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'developer');
$$;

drop function if exists public.admin_set_user_role(uuid, text);
create function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
)
returns table (id uuid, email text, role text, is_admin boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := public.current_user_role();
  target_role text := lower(btrim(coalesce(p_role, '')));
  old_role text := 'cliente';
begin
  if actor_role not in ('admin', 'developer') then
    raise exception 'Sem permissao para gerenciar equipe.';
  end if;

  if target_role not in ('cliente', 'equipe', 'motoboy', 'admin', 'developer') then
    raise exception 'Cargo invalido: %', p_role;
  end if;

  if target_role = 'developer' and actor_role <> 'developer' then
    raise exception 'Apenas developer pode atribuir cargo developer.';
  end if;

  select coalesce(p.role, 'cliente')
    into old_role
  from public.profiles p
  where p.id = p_user_id;

  if old_role = 'developer' and actor_role <> 'developer' then
    raise exception 'Apenas developer pode alterar outro developer.';
  end if;

  update public.profiles p
  set role = target_role,
      is_admin = target_role in ('admin', 'developer'),
      admin_role = case target_role
        when 'developer' then 'developer'
        when 'admin' then 'owner'
        when 'equipe' then 'staff'
        when 'motoboy' then 'delivery'
        else 'customer'
      end,
      updated_at = now()
  where p.id = p_user_id;

  if not found then
    raise exception 'Perfil nao encontrado.';
  end if;

  return query
  select p.id, p.email, p.role, p.is_admin
  from public.profiles p
  where p.id = p_user_id;
end;
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_profile_for_app() from public;
revoke all on function public.app_current_profile() from public;
revoke all on function public.is_developer() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_delivery() from public;
revoke all on function public.can_access_admin_panel() from public;
revoke all on function public.can_access_delivery_panel() from public;
revoke all on function public.admin_can_write() from public;
revoke all on function public.admin_set_user_role(uuid, text) from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_profile_for_app() to authenticated;
grant execute on function public.app_current_profile() to authenticated;
grant execute on function public.is_developer() to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_delivery() to authenticated;
grant execute on function public.can_access_admin_panel() to authenticated;
grant execute on function public.can_access_delivery_panel() to authenticated;
grant execute on function public.admin_can_write() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'cliente');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

revoke insert, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, nome, apelido, telefone, endereco, foto) on public.profiles to authenticated;
grant update (email, nome, apelido, telefone, endereco, foto, updated_at) on public.profiles to authenticated;

-- Official admin/developer bootstrap. Re-runnable and tied to auth.users.
insert into public.profiles (id, email, nome, role, is_admin, admin_role)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    split_part(u.email, '@', 1)
  ),
  case
    when lower(u.email) = 'marcelol527319@gmail.com' then 'developer'
    when lower(u.email) in ('marcelo52731@gmail.com', 'patriciapaula01234@gmail.com') then 'admin'
    else 'cliente'
  end,
  lower(u.email) in ('marcelol527319@gmail.com', 'marcelo52731@gmail.com', 'patriciapaula01234@gmail.com'),
  case
    when lower(u.email) = 'marcelol527319@gmail.com' then 'developer'
    when lower(u.email) in ('marcelo52731@gmail.com', 'patriciapaula01234@gmail.com') then 'owner'
    else 'customer'
  end
from auth.users u
where lower(u.email) in (
  'marcelol527319@gmail.com',
  'marcelo52731@gmail.com',
  'patriciapaula01234@gmail.com',
  'marcelosorrisu527@gmail.com'
)
on conflict (id) do update
set email = excluded.email,
    nome = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
    role = excluded.role,
    is_admin = excluded.is_admin,
    admin_role = excluded.admin_role,
    updated_at = now();

do $$
begin
  if to_regclass('public.pedidos') is not null then
    grant select, update on public.pedidos to authenticated;

    drop policy if exists "pedidos_select_own_or_admin" on public.pedidos;
    create policy "pedidos_select_own_or_admin"
    on public.pedidos for select
    to authenticated
    using (
      (user_id is not null and user_id = auth.uid())
      or public.is_staff()
      or public.is_delivery()
    );

    drop policy if exists "pedidos_update_admin" on public.pedidos;
    create policy "pedidos_update_admin"
    on public.pedidos for update
    to authenticated
    using (public.is_staff() or public.is_delivery())
    with check (public.is_staff() or public.is_delivery());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.pedido_itens') is not null then
    grant select on public.pedido_itens to authenticated;

    drop policy if exists "pedido_itens_select_by_order_access" on public.pedido_itens;
    create policy "pedido_itens_select_by_order_access"
    on public.pedido_itens for select
    to authenticated
    using (
      exists (
        select 1
        from public.pedidos p
        where p.id = pedido_itens.pedido_id
          and (
            (p.user_id is not null and p.user_id = auth.uid())
            or public.is_staff()
            or public.is_delivery()
          )
      )
    );
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.produtos') is not null then
    grant select on public.produtos to anon, authenticated;
    grant insert, update, delete on public.produtos to authenticated;

    drop policy if exists "produtos_admin_all" on public.produtos;
    create policy "produtos_admin_all"
    on public.produtos for all
    to authenticated
    using (public.admin_can_write())
    with check (public.admin_can_write());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.site_configuracoes') is not null then
    grant select on public.site_configuracoes to anon, authenticated;
    grant insert, update, delete on public.site_configuracoes to authenticated;

    drop policy if exists "site_configuracoes_admin_write" on public.site_configuracoes;
    create policy "site_configuracoes_admin_write"
    on public.site_configuracoes for all
    to authenticated
    using (public.admin_can_write())
    with check (public.admin_can_write());
  end if;
end;
$$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "product_images_admin_insert" on storage.objects;
    create policy "product_images_admin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'produtos' and public.admin_can_write());

    drop policy if exists "product_images_admin_update" on storage.objects;
    create policy "product_images_admin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'produtos' and public.admin_can_write())
    with check (bucket_id = 'produtos' and public.admin_can_write());

    drop policy if exists "product_images_admin_delete" on storage.objects;
    create policy "product_images_admin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'produtos' and public.admin_can_write());
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
