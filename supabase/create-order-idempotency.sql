-- Idempotencia do checkout Monte Sinai.
-- Execute no SQL Editor do Supabase para atualizar somente a RPC public.create_order.
-- A funcao usa pedidos.id como UUID real e pedidos.codigo como chave idempotente publica.
-- Se o mesmo codigo voltar com o mesmo telefone, retorna o pedido existente sem inserir itens nem baixar estoque de novo.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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
  item_variation_key text;
  item_variation_id uuid;
  product_row public.produtos%rowtype;
  variation_row public.produto_variacoes%rowtype;
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
    item_variation_key := coalesce(
      item->>'variacao_id',
      item->>'variationId',
      item->>'variation_id',
      item->>'variacaoId',
      ''
    );
    item_variation_id := case
      when item_variation_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then item_variation_key::uuid
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

      item_name := product_row.nome;
      item_image := product_row.imagem;

      if item_variation_id is not null then
        select *
        into variation_row
        from public.produto_variacoes
        where id = item_variation_id
          and produto_id = product_row.id
          and ativo = true
        for update;

        if not found then
          raise exception 'Opcao do produto nao esta disponivel.';
        end if;

        if variation_row.estoque is not null and variation_row.estoque < item_qty then
          raise exception 'Estoque insuficiente para % - %.', product_row.nome, variation_row.nome;
        end if;

        if variation_row.estoque is not null then
          update public.produto_variacoes
          set estoque = estoque - item_qty
          where id = variation_row.id;
        end if;

        item_variant := variation_row.nome;
        item_image := coalesce(nullif(variation_row.imagem, ''), product_row.imagem);
        item_price := case
          when variation_row.oferta_ativa
            and variation_row.preco_promocional is not null
            and variation_row.preco_promocional > 0
            and (variation_row.oferta_inicio is null or variation_row.oferta_inicio <= now())
            and (variation_row.oferta_fim is null or variation_row.oferta_fim >= now())
          then variation_row.preco_promocional
          else variation_row.preco
        end;
      else
        if product_row.estoque is not null and product_row.estoque < item_qty then
          raise exception 'Estoque insuficiente para %.', product_row.nome;
        end if;

        if product_row.estoque is not null then
          update public.produtos
          set estoque = estoque - item_qty
          where id = product_row.id;
        end if;

        item_price := case
          when product_row.oferta_ativa
            and product_row.preco_promocional is not null
            and product_row.preco_promocional > 0
            and (product_row.oferta_inicio is null or product_row.oferta_inicio <= now())
            and (product_row.oferta_fim is null or product_row.oferta_fim >= now())
          then product_row.preco_promocional
          else product_row.preco
        end;
      end if;
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
      variacao_id,
      nome,
      variacao,
      quantidade,
      preco_unitario,
      total,
      imagem
    ) values (
      new_order_id,
      item_product_id,
      item_variation_id,
      item_name,
      item_variant,
      item_qty,
      item_price,
      item_total,
      item_image
    );

    if item_product_id is not null and to_regclass('public.estoque_movimentacoes') is not null then
      execute
        'insert into public.estoque_movimentacoes
          (produto_id, variacao_id, tipo, quantidade, motivo, pedido_id, created_by)
         values ($1, $2, ''saida_venda'', $3, ''Venda'', $4, $5)'
      using item_product_id, item_variation_id, item_qty, new_order_id, caller_id;
    end if;
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

  if to_regclass('public.pedido_eventos') is not null then
    execute
      'insert into public.pedido_eventos
        (pedido_id, tipo, status_anterior, status_novo, payload, created_by)
       values ($1, ''pedido_criado'', null, $2, $3, $4)'
    using new_order_id,
      requested_status,
      jsonb_build_object(
        'codigo', order_code,
        'total', final_total,
        'subtotal', subtotal_calc,
        'quantidade_itens', item_count,
        'cliente_tipo', case when caller_id is null then 'visitante' else 'cliente' end
      ),
      caller_id;
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
commit;
