-- Acesso administrativo da Monte Sinai.
-- Execute depois de criar as tabelas do schema-pedidos.sql.

begin;

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists admin_role text not null default 'customer';

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

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and is_admin = false);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and is_admin = false);

drop policy if exists "produtos_admin_all" on public.produtos;
create policy "produtos_admin_all"
on public.produtos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pedidos_update_admin" on public.pedidos;
create policy "pedidos_update_admin"
on public.pedidos for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pedidos_select_own_or_admin" on public.pedidos;
create policy "pedidos_select_own_or_admin"
on public.pedidos for select
to authenticated
using ((user_id is not null and user_id = auth.uid()) or public.is_admin());

drop policy if exists "pedido_itens_select_by_order_access" on public.pedido_itens;
create policy "pedido_itens_select_by_order_access"
on public.pedido_itens for select
to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_itens.pedido_id
      and ((p.user_id is not null and p.user_id = auth.uid()) or public.is_admin())
  )
);

-- Troque o email abaixo pelo email de login do lojista.
-- Depois de executar, esse usuario passa a ver todos os pedidos e gerenciar produtos.
update public.profiles
set is_admin = true,
    admin_role = 'developer'
where lower(email) = 'marcelol527319@gmail.com';

-- Troque pelo email real da Patricia quando ela criar a conta.
-- update public.profiles
-- set is_admin = true,
--     admin_role = 'owner'
-- where lower(email) = 'email-da-patricia@exemplo.com';

commit;
