-- Schema real de pedidos da Monte Sinai.
-- Execute no SQL Editor do Supabase antes do seed-produtos.sql.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  apelido text,
  telefone text,
  endereco text,
  foto text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10, 2) not null check (preco >= 0),
  imagem text not null default '',
  categoria text not null default 'Produtos',
  descricao text not null default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enderecos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text not null,
  endereco text not null,
  observacao text,
  principal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  cliente_nome text not null,
  cliente_email text,
  cliente_telefone text not null,
  endereco_entrega text not null,
  observacao text,
  pagamento text not null,
  status text not null default 'Pedido enviado',
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  entrega numeric(10, 2) not null default 0 check (entrega >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  brinde boolean not null default false,
  whatsapp_enviado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome text not null,
  variacao text,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  total numeric(10, 2) not null check (total >= 0),
  imagem text,
  created_at timestamptz not null default now()
);

create index if not exists idx_produtos_ativo_nome on public.produtos (ativo, nome);
create index if not exists idx_enderecos_user_id on public.enderecos (user_id);
create index if not exists idx_pedidos_user_id_created_at on public.pedidos (user_id, created_at desc);
create index if not exists idx_pedidos_created_at on public.pedidos (created_at desc);
create index if not exists idx_pedido_itens_pedido_id on public.pedido_itens (pedido_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_produtos_updated_at on public.produtos;
create trigger set_produtos_updated_at
before update on public.produtos
for each row execute function public.set_updated_at();

drop trigger if exists set_enderecos_updated_at on public.enderecos;
create trigger set_enderecos_updated_at
before update on public.enderecos
for each row execute function public.set_updated_at();

drop trigger if exists set_pedidos_updated_at on public.pedidos;
create trigger set_pedidos_updated_at
before update on public.pedidos
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, apelido, telefone, endereco, foto)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'nick', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'photo', new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    nome = excluded.nome,
    apelido = excluded.apelido,
    telefone = excluded.telefone,
    endereco = excluded.endereco,
    foto = excluded.foto;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, nome, apelido, telefone, endereco, foto)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', ''),
  coalesce(u.raw_user_meta_data->>'nick', ''),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  coalesce(u.raw_user_meta_data->>'address', ''),
  coalesce(u.raw_user_meta_data->>'photo', u.raw_user_meta_data->>'avatar_url', '')
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.produtos enable row level security;
alter table public.enderecos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

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

drop policy if exists "produtos_public_read_active" on public.produtos;
create policy "produtos_public_read_active"
on public.produtos for select
to anon, authenticated
using (ativo = true or public.is_admin());

drop policy if exists "produtos_admin_all" on public.produtos;
create policy "produtos_admin_all"
on public.produtos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "enderecos_select_own_or_admin" on public.enderecos;
create policy "enderecos_select_own_or_admin"
on public.enderecos for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enderecos_insert_own" on public.enderecos;
create policy "enderecos_insert_own"
on public.enderecos for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "enderecos_update_own" on public.enderecos;
create policy "enderecos_update_own"
on public.enderecos for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "enderecos_delete_own" on public.enderecos;
create policy "enderecos_delete_own"
on public.enderecos for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "pedidos_select_own_or_admin" on public.pedidos;
create policy "pedidos_select_own_or_admin"
on public.pedidos for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "pedidos_insert_own" on public.pedidos;
create policy "pedidos_insert_own"
on public.pedidos for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pedidos_update_admin" on public.pedidos;
create policy "pedidos_update_admin"
on public.pedidos for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pedido_itens_select_by_order_access" on public.pedido_itens;
create policy "pedido_itens_select_by_order_access"
on public.pedido_itens for select
to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_itens.pedido_id
      and (p.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "pedido_itens_insert_own_order" on public.pedido_itens;
create policy "pedido_itens_insert_own_order"
on public.pedido_itens for insert
to authenticated
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_itens.pedido_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "pedido_itens_admin_all" on public.pedido_itens;
create policy "pedido_itens_admin_all"
on public.pedido_itens for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;
