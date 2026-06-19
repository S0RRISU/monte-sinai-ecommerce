-- Venda presencial administrativa Monte Sinai.
-- Cria RPC propria para o painel registrar venda presencial sem depender do checkout publico.
-- Registra origem presencial, itens, variacoes, baixa estoque e movimentacao.
-- Nao usa DELETE/TRUNCATE.

begin;

do $$
begin
  if to_regclass('public.pedidos') is null
    or to_regclass('public.pedido_itens') is null
    or to_regclass('public.produtos') is null
    or to_regclass('public.produto_variacoes') is null
    or to_regprocedure('public.admin_can_write()') is null
  then
    raise exception 'Base administrativa incompleta. Revise schema-pedidos, variacoes e acesso administrativo.';
  end if;
end $$;

alter table public.pedidos
  add column if not exists origem text not null default 'site';

alter table public.pedido_itens
  add column if not exists variacao_id uuid references public.produto_variacoes(id) on delete set null;

create index if not exists idx_pedido_itens_variacao_id
  on public.pedido_itens (variacao_id);

alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

grant select, insert, update on public.pedidos to authenticated;
grant select, insert on public.pedido_itens to authenticated;

drop policy if exists "pedidos_insert_admin_manual_sale" on public.pedidos;
create policy "pedidos_insert_admin_manual_sale"
on public.pedidos
for insert
to authenticated
with check ((select public.admin_can_write()));

drop policy if exists "pedido_itens_insert_admin_manual_sale" on public.pedido_itens;
create policy "pedido_itens_insert_admin_manual_sale"
on public.pedido_itens
for insert
to authenticated
with check ((select public.admin_can_write()));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pedidos_origem_check'
      and conrelid = 'public.pedidos'::regclass
  ) then
    alter table public.pedidos
      add constraint pedidos_origem_check
      check (origem in ('site', 'presencial', 'telefone', 'whatsapp'));
  end if;
end $$;

create or replace function public.admin_create_manual_order(
  order_payload jsonb,
  items_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions, auth, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  new_order_id uuid;
  item jsonb;
  item_count integer;
  item_product_id uuid;
  item_variation_id uuid;
  product_row public.produtos%rowtype;
  variation_row public.produto_variacoes%rowtype;
  item_name text;
  item_variant text;
  item_image text;
  item_qty integer;
  item_price numeric(10, 2);
  item_total numeric(10, 2);
  previous_stock integer;
  next_stock integer;
  subtotal_calc numeric(10, 2) := 0;
  discount_amount numeric(10, 2) := greatest(coalesce(nullif(order_payload->>'desconto', '')::numeric, 0), 0);
  final_total numeric(10, 2);
  order_code text := 'MS-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));
  customer_name text := nullif(btrim(coalesce(order_payload->>'cliente_nome', '')), '');
  customer_email text := btrim(coalesce(order_payload->>'cliente_email', ''));
  customer_phone text := regexp_replace(coalesce(order_payload->>'cliente_telefone', ''), '\D', '', 'g');
  customer_address text := nullif(btrim(coalesce(order_payload->>'endereco_entrega', '')), '');
  payment_name text := coalesce(nullif(btrim(order_payload->>'pagamento'), ''), 'Dinheiro');
  requested_status text := coalesce(nullif(btrim(order_payload->>'status'), ''), 'Entregue');
  clean_status text;
  database_status text;
  payment_status text := coalesce(nullif(btrim(order_payload->>'pagamento_status'), ''), 'Pago');
  confirmed_value boolean;
begin
  if actor_id is null or not public.admin_can_write() then
    raise exception 'Acesso administrativo negado para registrar venda presencial.';
  end if;

  if jsonb_typeof(items_payload) <> 'array' then
    raise exception 'Itens da venda presencial invalidos.';
  end if;

  item_count := jsonb_array_length(items_payload);
  if item_count = 0 or item_count > 80 then
    raise exception 'Quantidade de itens da venda presencial invalida.';
  end if;

  customer_name := coalesce(customer_name, 'Cliente presencial');
  customer_phone := case
    when length(customer_phone) between 10 and 13 then customer_phone
    else '11900000000'
  end;
  customer_address := coalesce(customer_address, 'Venda presencial na loja');

  clean_status := lower(requested_status);
  clean_status := replace(replace(clean_status, '_', ' '), '-', ' ');

  if to_regprocedure('public.normalize_pedido_status_value(text)') is not null then
    execute 'select public.normalize_pedido_status_value($1)' into database_status using requested_status;
  else
    database_status := case
      when clean_status like 'a confirmar%' then 'Recebido'
      when clean_status like 'em separa%' or clean_status like 'prepar%' then 'Preparando'
      when clean_status like 'a caminho%' or clean_status like 'saiu%' or clean_status like 'em rota%' then 'Saiu para entrega'
      when clean_status like 'entreg%' then 'Entregue'
      when clean_status like 'cancel%' then 'Cancelado'
      else 'Recebido'
    end;
  end if;

  payment_status := case
    when lower(payment_status) in ('pago', 'paga') then 'Pago'
    when lower(payment_status) in ('cancelado', 'cancelada') then 'Cancelado'
    else 'Pendente'
  end;

  confirmed_value := clean_status not like 'a confirmar%' and clean_status not like 'cancel%';

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
    whatsapp_enviado,
    origem
  ) values (
    order_code,
    null,
    'visitante',
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    array_to_string(
      array_remove(array['Venda presencial registrada pelo painel.', nullif(btrim(coalesce(order_payload->>'observacao', '')), '')], null),
      ' '
    ),
    payment_name,
    database_status,
    payment_status,
    confirmed_value,
    0,
    0,
    '',
    0,
    0,
    false,
    false,
    'presencial'
  )
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items_payload)
  loop
    item_product_id := case
      when coalesce(item->>'produto_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (item->>'produto_id')::uuid
      else null
    end;

    item_variation_id := case
      when coalesce(item->>'variacao_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (item->>'variacao_id')::uuid
      else null
    end;

    if item_product_id is null then
      raise exception 'Produto obrigatorio na venda presencial.';
    end if;

    item_qty := greatest(coalesce(nullif(item->>'quantidade', '')::integer, 1), 1);

    select *
      into product_row
    from public.produtos
    where id = item_product_id
      and ativo = true
    for update;

    if not found then
      raise exception 'Produto da venda presencial nao esta ativo.';
    end if;

    item_name := product_row.nome;
    item_variant := btrim(coalesce(item->>'variacao', ''));
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
        raise exception 'Opcao do produto nao esta ativa.';
      end if;

      previous_stock := variation_row.estoque;
      if previous_stock is not null and previous_stock < item_qty then
        raise exception 'Estoque insuficiente para % - %.', product_row.nome, variation_row.nome;
      end if;

      if previous_stock is not null then
        next_stock := previous_stock - item_qty;
        update public.produto_variacoes
        set estoque = next_stock,
            updated_at = now()
        where id = variation_row.id;
      else
        next_stock := null;
      end if;

      item_variant := variation_row.nome;
      item_image := coalesce(nullif(variation_row.imagem, ''), product_row.imagem);
      item_price := greatest(
        coalesce(
          nullif(item->>'preco_unitario', '')::numeric,
          nullif(variation_row.preco_promocional, 0),
          variation_row.preco,
          product_row.preco
        ),
        0
      );
    else
      previous_stock := product_row.estoque;
      if previous_stock is not null and previous_stock < item_qty then
        raise exception 'Estoque insuficiente para %.', product_row.nome;
      end if;

      if previous_stock is not null then
        next_stock := previous_stock - item_qty;
        update public.produtos
        set estoque = next_stock,
            updated_at = now()
        where id = product_row.id;
      else
        next_stock := null;
      end if;

      item_price := greatest(
        coalesce(
          nullif(item->>'preco_unitario', '')::numeric,
          nullif(product_row.preco_promocional, 0),
          product_row.preco
        ),
        0
      );
    end if;

    if item_price <= 0 then
      raise exception 'Preco invalido para %.', item_name;
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

    if to_regclass('public.estoque_movimentacoes') is not null then
      insert into public.estoque_movimentacoes (
        produto_id,
        variacao_id,
        tipo,
        quantidade,
        motivo,
        pedido_id,
        created_by,
        estoque_anterior,
        estoque_novo,
        ocorrido_em,
        responsavel_nome,
        responsavel_email
      ) values (
        item_product_id,
        item_variation_id,
        'saida_venda',
        item_qty,
        'Venda presencial',
        new_order_id,
        actor_id,
        previous_stock,
        next_stock,
        now(),
        coalesce((select p.nome from public.profiles p where p.id = actor_id), 'Administrador'),
        coalesce((select p.email from public.profiles p where p.id = actor_id), '')
      );
    end if;
  end loop;

  discount_amount := least(discount_amount, subtotal_calc);
  final_total := greatest(round(subtotal_calc - discount_amount, 2), 0);

  update public.pedidos
  set subtotal = subtotal_calc,
      desconto = discount_amount,
      entrega = 0,
      total = final_total,
      updated_at = now()
  where id = new_order_id;

  if to_regprocedure('public.admin_log_action(text,text,text,jsonb)') is not null then
    perform public.admin_log_action(
      'venda_presencial_criada',
      'pedido',
      new_order_id::text,
      jsonb_build_object('codigo', order_code, 'total', final_total, 'itens', item_count)
    );
  end if;

  return jsonb_build_object(
    'order_id', new_order_id,
    'codigo', order_code,
    'subtotal', subtotal_calc,
    'desconto', discount_amount,
    'entrega', 0,
    'total', final_total,
    'origem', 'presencial'
  );
end;
$$;

revoke all on function public.admin_create_manual_order(jsonb, jsonb) from public, anon;
grant execute on function public.admin_create_manual_order(jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Conferencia depois de rodar:
-- select proname
-- from pg_proc
-- where oid = 'public.admin_create_manual_order(jsonb,jsonb)'::regprocedure;
