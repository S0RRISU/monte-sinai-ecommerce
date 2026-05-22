-- Reparo rapido do painel administrativo Monte Sinai.
-- Execute no SQL Editor do Supabase se admins nao conseguem alterar pedidos/produtos
-- ou se campos de oferta/estoque nao aparecem/salvam.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists admin_role text not null default 'customer';

alter table public.produtos
  add column if not exists tipo text not null default 'produto',
  add column if not exists destaque boolean not null default false,
  add column if not exists oferta_ativa boolean not null default false,
  add column if not exists preco_promocional numeric(10, 2),
  add column if not exists oferta_inicio timestamptz,
  add column if not exists oferta_fim timestamptz,
  add column if not exists kit_itens text not null default '',
  add column if not exists estoque integer,
  add column if not exists estoque_minimo integer not null default 3,
  add column if not exists ativo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.pedidos
  alter column user_id drop not null,
  add column if not exists cliente_tipo text not null default 'cliente',
  add column if not exists confirmado boolean not null default false,
  add column if not exists confirmado_em timestamptz,
  add column if not exists pagamento_status text not null default 'Pendente',
  add column if not exists pagamento_confirmado_em timestamptz,
  add column if not exists desconto numeric(10, 2) not null default 0,
  add column if not exists cupom_codigo text not null default '';

grant select on public.produtos to anon;
grant select, insert, update, delete on public.produtos to authenticated;
grant select, update on public.pedidos to authenticated;
grant select on public.pedido_itens to authenticated;
grant select, insert, update on public.profiles to authenticated;

alter table public.profiles enable row level security;
alter table public.produtos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, extensions
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

revoke all on function public.admin_can_write() from public;
grant execute on function public.admin_can_write() to authenticated;

create or replace function public.admin_update_order(
  p_id uuid,
  p_status text default null,
  p_pagamento_status text default null,
  p_confirmado boolean default null
)
returns table (
  id uuid,
  status text,
  pagamento_status text,
  confirmado boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_can_write() then
    raise exception 'Acesso administrativo negado';
  end if;

  if p_status is not null and p_status not in ('Recebido', 'Preparando', 'Saiu para entrega', 'Entregue') then
    raise exception 'Status de pedido invalido';
  end if;

  if p_pagamento_status is not null and p_pagamento_status not in ('Pendente', 'Pago', 'Cancelado') then
    raise exception 'Status de pagamento invalido';
  end if;

  return query
  update public.pedidos p
  set status = coalesce(p_status, p.status),
      pagamento_status = coalesce(p_pagamento_status, p.pagamento_status),
      pagamento_confirmado_em = case
        when p_pagamento_status = 'Pago' then now()
        when p_pagamento_status in ('Pendente', 'Cancelado') then null
        else p.pagamento_confirmado_em
      end,
      confirmado = coalesce(p_confirmado, p.confirmado),
      confirmado_em = case
        when p_confirmado is true then coalesce(p.confirmado_em, now())
        when p_confirmado is false then null
        else p.confirmado_em
      end
  where p.id = p_id
  returning p.id, p.status, p.pagamento_status, p.confirmado;
end;
$$;

revoke all on function public.admin_update_order(uuid, text, text, boolean) from public;
grant execute on function public.admin_update_order(uuid, text, text, boolean) to authenticated;

create or replace function public.admin_update_product(
  p_id uuid,
  p_payload jsonb
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_can_write() then
    raise exception 'Acesso administrativo negado';
  end if;

  return query
  update public.produtos p
  set nome = coalesce(p_payload->>'nome', p.nome),
      preco = case when p_payload ? 'preco' then nullif(p_payload->>'preco', '')::numeric else p.preco end,
      categoria = coalesce(p_payload->>'categoria', p.categoria),
      descricao = coalesce(p_payload->>'descricao', p.descricao),
      imagem = coalesce(p_payload->>'imagem', p.imagem),
      tipo = coalesce(p_payload->>'tipo', p.tipo),
      destaque = case when p_payload ? 'destaque' then (p_payload->>'destaque')::boolean else p.destaque end,
      oferta_ativa = case when p_payload ? 'oferta_ativa' then (p_payload->>'oferta_ativa')::boolean else p.oferta_ativa end,
      preco_promocional = case when p_payload ? 'preco_promocional' and p_payload->>'preco_promocional' <> '' then (p_payload->>'preco_promocional')::numeric when p_payload ? 'preco_promocional' then null else p.preco_promocional end,
      oferta_inicio = case when p_payload ? 'oferta_inicio' and p_payload->>'oferta_inicio' <> '' then (p_payload->>'oferta_inicio')::timestamptz when p_payload ? 'oferta_inicio' then null else p.oferta_inicio end,
      oferta_fim = case when p_payload ? 'oferta_fim' and p_payload->>'oferta_fim' <> '' then (p_payload->>'oferta_fim')::timestamptz when p_payload ? 'oferta_fim' then null else p.oferta_fim end,
      kit_itens = coalesce(p_payload->>'kit_itens', p.kit_itens),
      estoque = case when p_payload ? 'estoque' and p_payload->>'estoque' <> '' then (p_payload->>'estoque')::integer when p_payload ? 'estoque' then null else p.estoque end,
      estoque_minimo = case when p_payload ? 'estoque_minimo' then (p_payload->>'estoque_minimo')::integer else p.estoque_minimo end,
      ativo = case when p_payload ? 'ativo' then (p_payload->>'ativo')::boolean else p.ativo end,
      updated_at = now()
  where p.id = p_id
  returning p.id;
end;
$$;

revoke all on function public.admin_update_product(uuid, jsonb) from public;
grant execute on function public.admin_update_product(uuid, jsonb) to authenticated;

create or replace function public.create_order(order_payload jsonb, items_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_id uuid := auth.uid();
  new_order_id uuid;
  item jsonb;
  subtotal_calc numeric(10, 2) := 0;
  item_qty integer;
  item_price numeric(10, 2);
  item_total numeric(10, 2);
  discount_amount numeric(10, 2) := greatest(coalesce(nullif(order_payload->>'desconto', '')::numeric, 0), 0);
  delivery_amount numeric(10, 2) := greatest(coalesce(nullif(order_payload->>'entrega', '')::numeric, 0), 0);
  final_total numeric(10, 2);
  order_code text := coalesce(nullif(btrim(order_payload->>'codigo'), ''), 'MS-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6)));
  customer_name text := btrim(coalesce(order_payload->>'cliente_nome', ''));
  customer_phone text := regexp_replace(coalesce(order_payload->>'cliente_telefone', ''), '\D', '', 'g');
  customer_address text := btrim(coalesce(order_payload->>'endereco_entrega', ''));
begin
  if customer_name = '' or customer_phone = '' or customer_address = '' then
    raise exception 'Dados obrigatorios do pedido ausentes.';
  end if;

  if jsonb_typeof(items_payload) <> 'array' or jsonb_array_length(items_payload) = 0 then
    raise exception 'Itens do pedido invalidos.';
  end if;

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
    btrim(coalesce(order_payload->>'cliente_email', '')),
    customer_phone,
    customer_address,
    coalesce(order_payload->>'observacao', ''),
    coalesce(nullif(btrim(order_payload->>'pagamento'), ''), 'Pagar na entrega'),
    coalesce(nullif(order_payload->>'status', ''), 'Recebido'),
    coalesce(nullif(order_payload->>'pagamento_status', ''), 'Pendente'),
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
    item_qty := greatest(coalesce(nullif(item->>'quantidade', '')::integer, 1), 1);
    item_price := greatest(coalesce(nullif(item->>'preco_unitario', '')::numeric, 0), 0);
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
      case
        when coalesce(item->>'produto_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (item->>'produto_id')::uuid
        else null
      end,
      btrim(coalesce(item->>'nome', 'Produto')),
      btrim(coalesce(item->>'variacao', '')),
      item_qty,
      item_price,
      item_total,
      btrim(coalesce(item->>'imagem', ''))
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

drop policy if exists "pedidos_select_own_or_admin" on public.pedidos;
create policy "pedidos_select_own_or_admin"
on public.pedidos for select
to authenticated
using ((user_id is not null and user_id = auth.uid()) or public.is_admin());

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

insert into public.profiles (id, email, nome, is_admin, admin_role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  true,
  case
    when lower(u.email) = 'marcelol527319@gmail.com' then 'developer'
    else 'owner'
  end
from auth.users u
where lower(u.email) in (
  'marcelol527319@gmail.com',
  'patriciapaula01234@gmail.com',
  'marcelo52731@gmail.com'
)
on conflict (id) do update
set email = excluded.email,
    is_admin = true,
    admin_role = excluded.admin_role;

update public.profiles
set is_admin = true,
    admin_role = case
      when lower(email) = 'marcelol527319@gmail.com' then 'developer'
      else 'owner'
    end
where lower(email) in (
  'marcelol527319@gmail.com',
  'patriciapaula01234@gmail.com',
  'marcelo52731@gmail.com'
);

commit;
