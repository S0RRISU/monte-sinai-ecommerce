-- Checkout visitante, status de pagamento e perfis administrativos.
-- Execute depois de schema-pedidos.sql e admin-acesso.sql.

begin;

create extension if not exists pgcrypto;

alter table public.profiles
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
  add column if not exists estoque_minimo integer not null default 3;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_admin_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_admin_role_check
      check (admin_role in ('developer', 'owner', 'staff', 'customer'));
  end if;
end;
$$;

alter table public.pedidos
  alter column user_id drop not null,
  add column if not exists cliente_tipo text not null default 'cliente',
  add column if not exists confirmado boolean not null default false,
  add column if not exists confirmado_em timestamptz,
  add column if not exists pagamento_status text not null default 'Pendente',
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
    select 1 from pg_constraint where conname = 'pedidos_cliente_tipo_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_cliente_tipo_check
      check (cliente_tipo in ('cliente', 'visitante'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_pagamento_status_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_pagamento_status_check
      check (pagamento_status in ('Pendente', 'Pago', 'Cancelado'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_status_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_status_check
      check (status in ('Recebido', 'Preparando', 'Saiu para entrega', 'Entregue'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_desconto_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_desconto_check
      check (desconto >= 0);
  end if;
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

create or replace function public.decrement_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.create_order(order_payload jsonb, items_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  new_order_id uuid;
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
