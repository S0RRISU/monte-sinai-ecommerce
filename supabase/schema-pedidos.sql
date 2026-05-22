-- Schema real de pedidos da Monte Sinai.
-- Execute no SQL Editor do Supabase antes do seed-produtos.sql.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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
  tipo text not null default 'produto',
  destaque boolean not null default false,
  oferta_ativa boolean not null default false,
  preco_promocional numeric(10, 2),
  oferta_inicio timestamptz,
  oferta_fim timestamptz,
  kit_itens text not null default '',
  estoque integer,
  estoque_minimo integer not null default 3,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.produtos
  add column if not exists tipo text not null default 'produto',
  add column if not exists destaque boolean not null default false,
  add column if not exists oferta_ativa boolean not null default false,
  add column if not exists preco_promocional numeric(10, 2),
  add column if not exists oferta_inicio timestamptz,
  add column if not exists oferta_fim timestamptz,
  add column if not exists kit_itens text not null default '',
  add column if not exists estoque integer,
  add column if not exists estoque_minimo integer not null default 3;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_tipo_check'
  ) then
    alter table public.produtos
      add constraint produtos_tipo_check check (tipo in ('produto', 'kit'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produtos_preco_promocional_check'
  ) then
    alter table public.produtos
      add constraint produtos_preco_promocional_check check (preco_promocional is null or preco_promocional >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produtos_estoque_check'
  ) then
    alter table public.produtos
      add constraint produtos_estoque_check check (estoque is null or estoque >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produtos_estoque_minimo_check'
  ) then
    alter table public.produtos
      add constraint produtos_estoque_minimo_check check (estoque_minimo >= 0);
  end if;
end;
$$;

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
  user_id uuid references auth.users(id) on delete restrict,
  cliente_tipo text not null default 'cliente',
  cliente_nome text not null,
  cliente_email text,
  cliente_telefone text not null,
  endereco_entrega text not null,
  observacao text,
  pagamento text not null,
  status text not null default 'Recebido',
  pagamento_status text not null default 'Pendente',
  confirmado boolean not null default false,
  confirmado_em timestamptz,
  pagamento_confirmado_em timestamptz,
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  desconto numeric(10, 2) not null default 0 check (desconto >= 0),
  cupom_codigo text not null default '',
  entrega numeric(10, 2) not null default 0 check (entrega >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  brinde boolean not null default false,
  whatsapp_enviado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pedidos
  alter column user_id drop not null,
  alter column status set default 'Recebido',
  add column if not exists cliente_tipo text not null default 'cliente',
  add column if not exists pagamento_status text not null default 'Pendente',
  add column if not exists confirmado boolean not null default false,
  add column if not exists confirmado_em timestamptz,
  add column if not exists pagamento_confirmado_em timestamptz,
  add column if not exists desconto numeric(10, 2) not null default 0,
  add column if not exists cupom_codigo text not null default '';

update public.pedidos
set status = case
  when lower(status) in ('pedido enviado', 'recebido') then 'Recebido'
  when lower(status) in ('em preparo', 'preparando') then 'Preparando'
  when lower(status) = 'saiu para entrega' then 'Saiu para entrega'
  when lower(status) = 'entregue' then 'Entregue'
  else 'Recebido'
end;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_admin_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_admin_role_check
      check (admin_role in ('developer', 'owner', 'staff', 'customer'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_cliente_tipo_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_cliente_tipo_check
      check (cliente_tipo in ('cliente', 'visitante'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_status_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_status_check
      check (status in ('Recebido', 'Preparando', 'Saiu para entrega', 'Entregue'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_pagamento_status_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_pagamento_status_check
      check (pagamento_status in ('Pendente', 'Pago', 'Cancelado'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_desconto_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_desconto_check check (desconto >= 0);
  end if;
end;
$$;

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

create table if not exists public.site_configuracoes (
  id text primary key default 'site',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_produtos_ativo_nome on public.produtos (ativo, nome);
create index if not exists idx_enderecos_user_id on public.enderecos (user_id);
create index if not exists idx_pedidos_user_id_created_at on public.pedidos (user_id, created_at desc);
create index if not exists idx_pedidos_created_at on public.pedidos (created_at desc);
create index if not exists idx_pedidos_status_created_at on public.pedidos (status, created_at desc);
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

create or replace function public.decrement_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if current_setting('monte_sinai.skip_stock_trigger', true) = 'true' then
    return new;
  end if;

  if new.produto_id is not null and new.quantidade > 0 then
    update public.produtos
    set estoque = greatest(estoque - new.quantidade, 0)
    where id = new.produto_id
      and estoque is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists decrement_product_stock_after_item on public.pedido_itens;
create trigger decrement_product_stock_after_item
after insert on public.pedido_itens
for each row execute function public.decrement_product_stock();

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

create or replace function public.create_order(order_payload jsonb, items_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_id uuid := auth.uid();
  new_order_id uuid;
  existing_order public.pedidos%rowtype;
  existing_phone text;
  item jsonb;
  item_count integer;
  item_product_id uuid;
  product_row public.produtos%rowtype;
  item_name text;
  item_image text;
  item_variant text;
  item_qty integer;
  item_price numeric(10, 2);
  item_total numeric(10, 2);
  subtotal_calc numeric(10, 2) := 0;
  discount_amount numeric(10, 2) := greatest(coalesce(nullif(order_payload->>'desconto', '')::numeric, 0), 0);
  delivery_amount numeric(10, 2) := greatest(coalesce(nullif(order_payload->>'entrega', '')::numeric, 0), 0);
  final_total numeric(10, 2);
  order_code text := coalesce(
    nullif(btrim(order_payload->>'codigo'), ''),
    'MS-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6))
  );
  customer_name text := btrim(coalesce(order_payload->>'cliente_nome', ''));
  customer_email text := btrim(coalesce(order_payload->>'cliente_email', ''));
  customer_phone text := regexp_replace(coalesce(order_payload->>'cliente_telefone', ''), '\D', '', 'g');
  customer_address text := btrim(coalesce(order_payload->>'endereco_entrega', ''));
  payment_name text := coalesce(nullif(btrim(order_payload->>'pagamento'), ''), 'Pagar na entrega');
  requested_status text := coalesce(nullif(order_payload->>'status', ''), 'Recebido');
  requested_payment_status text := coalesce(nullif(order_payload->>'pagamento_status', ''), 'Pendente');
begin
  if customer_name = '' or customer_phone = '' or customer_address = '' then
    raise exception 'Dados obrigatorios do pedido ausentes.';
  end if;

  if length(customer_phone) < 10 or length(customer_phone) > 13 then
    raise exception 'Telefone do pedido invalido.';
  end if;

  if requested_status not in ('Recebido', 'Preparando', 'Saiu para entrega', 'Entregue') then
    requested_status := 'Recebido';
  end if;

  if requested_payment_status not in ('Pendente', 'Pago', 'Cancelado') then
    requested_payment_status := 'Pendente';
  end if;

  if jsonb_typeof(items_payload) <> 'array' then
    raise exception 'Itens do pedido invalidos.';
  end if;

  item_count := jsonb_array_length(items_payload);
  if item_count = 0 or item_count > 80 then
    raise exception 'Quantidade de itens do pedido invalida.';
  end if;

  select *
  into existing_order
  from public.pedidos
  where upper(codigo) = upper(order_code)
  for update;

  if found then
    existing_phone := regexp_replace(coalesce(existing_order.cliente_telefone, ''), '\D', '', 'g');
    if existing_phone <> customer_phone then
      raise exception 'Codigo de pedido ja existe para outro telefone.';
    end if;

    return jsonb_build_object(
      'order_id', existing_order.id,
      'codigo', existing_order.codigo,
      'subtotal', existing_order.subtotal,
      'desconto', existing_order.desconto,
      'entrega', existing_order.entrega,
      'total', existing_order.total,
      'cliente_tipo', existing_order.cliente_tipo,
      'idempotent', true
    );
  end if;

  perform set_config('monte_sinai.skip_stock_trigger', 'true', true);

  insert into public.pedidos (
    codigo,
    user_id,
    cliente_tipo,
    cliente_nome,
    cliente_email,
    cliente_telefone,
    endereco_entrega,
    observacao,
    pagamento,
    status,
    pagamento_status,
    confirmado,
    subtotal,
    desconto,
    cupom_codigo,
    entrega,
    total,
    brinde,
    whatsapp_enviado
  ) values (
    order_code,
    caller_id,
    case when caller_id is null then 'visitante' else 'cliente' end,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    coalesce(order_payload->>'observacao', ''),
    payment_name,
    requested_status,
    requested_payment_status,
    false,
    0,
    0,
    coalesce(order_payload->>'cupom_codigo', ''),
    0,
    0,
    coalesce(nullif(order_payload->>'brinde', '')::boolean, false),
    coalesce(nullif(order_payload->>'whatsapp_enviado', '')::boolean, true)
  )
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items_payload)
  loop
    item_product_id := case
      when coalesce(item->>'produto_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (item->>'produto_id')::uuid
      else null
    end;
    item_qty := greatest(coalesce(nullif(item->>'quantidade', '')::integer, 1), 1);
    item_variant := btrim(coalesce(item->>'variacao', ''));

    if item_product_id is not null then
      select *
      into product_row
      from public.produtos
      where id = item_product_id
        and ativo = true
      for update;

      if not found then
        raise exception 'Produto do pedido nao esta disponivel.';
      end if;

      if product_row.estoque is not null and product_row.estoque < item_qty then
        raise exception 'Estoque insuficiente para %.', product_row.nome;
      end if;

      if product_row.estoque is not null then
        update public.produtos
        set estoque = estoque - item_qty
        where id = product_row.id;
      end if;

      item_name := product_row.nome;
      item_image := product_row.imagem;
      item_price := case
        when product_row.oferta_ativa
          and product_row.preco_promocional is not null
          and product_row.preco_promocional > 0
          and (product_row.oferta_inicio is null or product_row.oferta_inicio <= now())
          and (product_row.oferta_fim is null or product_row.oferta_fim >= now())
        then product_row.preco_promocional
        else product_row.preco
      end;
    else
      item_name := btrim(coalesce(item->>'nome', ''));
      item_image := btrim(coalesce(item->>'imagem', ''));
      item_price := greatest(coalesce(nullif(item->>'preco_unitario', '')::numeric, 0), 0);

      if item_name = '' or item_price <= 0 then
        raise exception 'Item do pedido invalido.';
      end if;
    end if;

    item_total := round(item_price * item_qty, 2);
    subtotal_calc := subtotal_calc + item_total;

    insert into public.pedido_itens (
      pedido_id,
      produto_id,
      nome,
      variacao,
      quantidade,
      preco_unitario,
      total,
      imagem
    ) values (
      new_order_id,
      item_product_id,
      item_name,
      item_variant,
      item_qty,
      item_price,
      item_total,
      item_image
    );
  end loop;

  discount_amount := least(discount_amount, subtotal_calc);
  final_total := greatest(round(subtotal_calc - discount_amount + delivery_amount, 2), 0);

  update public.pedidos
  set subtotal = subtotal_calc,
      desconto = discount_amount,
      entrega = delivery_amount,
      total = final_total
  where id = new_order_id;

  if caller_id is not null then
    insert into public.enderecos (
      user_id,
      nome,
      telefone,
      endereco,
      observacao,
      principal
    ) values (
      caller_id,
      customer_name,
      customer_phone,
      customer_address,
      coalesce(order_payload->>'observacao', ''),
      true
    );
  end if;

  return jsonb_build_object(
    'order_id', new_order_id,
    'codigo', order_code,
    'subtotal', subtotal_calc,
    'desconto', discount_amount,
    'entrega', delivery_amount,
    'total', final_total,
    'cliente_tipo', case when caller_id is null then 'visitante' else 'cliente' end
  );
end;
$$;

revoke all on function public.create_order(jsonb, jsonb) from public;
grant execute on function public.create_order(jsonb, jsonb) to anon;
grant execute on function public.create_order(jsonb, jsonb) to authenticated;

create or replace function public.create_guest_order(order_payload jsonb, items_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  result := public.create_order(order_payload, items_payload);
  return (result->>'order_id')::uuid;
end;
$$;

revoke all on function public.create_guest_order(jsonb, jsonb) from public;
grant execute on function public.create_guest_order(jsonb, jsonb) to anon;
grant execute on function public.create_guest_order(jsonb, jsonb) to authenticated;

create or replace function public.track_order(
  p_codigo text,
  p_cliente_telefone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.pedidos%rowtype;
  clean_code text := upper(btrim(coalesce(p_codigo, '')));
  clean_phone text := regexp_replace(coalesce(p_cliente_telefone, ''), '\D', '', 'g');
  items jsonb;
begin
  if clean_code = '' or length(clean_phone) < 10 then
    raise exception 'Informe codigo do pedido e telefone.';
  end if;

  select *
  into order_row
  from public.pedidos
  where upper(codigo) = clean_code
    and regexp_replace(coalesce(cliente_telefone, ''), '\D', '', 'g') = clean_phone
  limit 1;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'produto_id', i.produto_id,
        'nome', i.nome,
        'variacao', coalesce(i.variacao, ''),
        'quantidade', i.quantidade,
        'preco_unitario', i.preco_unitario,
        'total', i.total,
        'imagem', coalesce(i.imagem, '')
      )
      order by i.created_at
    ),
    '[]'::jsonb
  )
  into items
  from public.pedido_itens i
  where i.pedido_id = order_row.id;

  return jsonb_build_object(
    'id', order_row.codigo,
    'uuid', order_row.id,
    'createdAt', order_row.created_at,
    'customer', jsonb_build_object(
      'name', order_row.cliente_nome,
      'email', coalesce(order_row.cliente_email, ''),
      'phone', order_row.cliente_telefone,
      'address', order_row.endereco_entrega,
      'note', coalesce(order_row.observacao, '')
    ),
    'items', items,
    'subtotal', order_row.subtotal,
    'discount', order_row.desconto,
    'coupon', case
      when coalesce(order_row.cupom_codigo, '') <> ''
      then jsonb_build_object('code', order_row.cupom_codigo)
      else null
    end,
    'delivery', order_row.entrega,
    'total', order_row.total,
    'gift', order_row.brinde,
    'payment', order_row.pagamento,
    'status', order_row.status,
    'paymentStatus', order_row.pagamento_status,
    'confirmed', order_row.confirmado,
    'customerType', order_row.cliente_tipo
  );
end;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon;
grant execute on function public.track_order(text, text) to authenticated;

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
alter table public.site_configuracoes enable row level security;

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
using ((user_id is not null and user_id = auth.uid()) or public.is_admin());

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
      and ((p.user_id is not null and p.user_id = auth.uid()) or public.is_admin())
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
