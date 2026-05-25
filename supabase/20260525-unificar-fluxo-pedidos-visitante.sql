-- Unifica pedidos de visitantes e clientes logados.
-- Execute depois de schema-pedidos.sql, 20260524-base-rbac-permissoes.sql
-- e checkout-visitante-admin-roles.sql.

begin;

create or replace function public.normalize_pedido_status_value(p_status text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_status, '')) in ('recebido', 'pedido enviado', 'pendente') then 'recebido'
    when lower(coalesce(p_status, '')) in ('em_separacao', 'em separacao', 'em separação', 'preparando', 'em preparo') then 'em_separacao'
    when lower(coalesce(p_status, '')) in ('saiu_para_entrega', 'saiu para entrega') then 'saiu_para_entrega'
    when lower(coalesce(p_status, '')) in ('entregue') then 'entregue'
    when lower(coalesce(p_status, '')) in ('cancelado', 'cancelada') then 'cancelado'
    else 'recebido'
  end;
$$;

create or replace function public.normalize_phone_digits(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) in (12, 13)
      and left(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 2) = '55'
    then substr(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 3)
    else regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  end;
$$;

create or replace function public.normalize_pedido_status_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.status := public.normalize_pedido_status_value(new.status);
  return new;
end;
$$;

drop trigger if exists pedidos_normalize_status on public.pedidos;
create trigger pedidos_normalize_status
before insert or update of status on public.pedidos
for each row execute function public.normalize_pedido_status_trigger();

alter table public.pedidos
  drop constraint if exists pedidos_status_check;

update public.pedidos
set status = public.normalize_pedido_status_value(status);

alter table public.pedidos
  alter column user_id drop not null,
  alter column status set default 'recebido';

alter table public.pedidos
  add constraint pedidos_status_check
  check (status in ('recebido', 'em_separacao', 'saiu_para_entrega', 'entregue', 'cancelado'));

create index if not exists idx_pedidos_codigo_upper
  on public.pedidos (upper(codigo));

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
  clean_phone_local text := public.normalize_phone_digits(p_cliente_telefone);
  items jsonb;
begin
  if clean_code = '' or length(clean_phone) < 10 then
    raise exception 'Informe codigo do pedido e telefone.';
  end if;

  select *
  into order_row
  from public.pedidos
  where upper(codigo) = clean_code
    and (
      regexp_replace(coalesce(cliente_telefone, ''), '\D', '', 'g') = clean_phone
      or public.normalize_phone_digits(cliente_telefone) = clean_phone_local
    )
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

drop function if exists public.admin_update_order(uuid, text, text, boolean);

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
declare
  normalized_status text := case
    when p_status is null then null
    else public.normalize_pedido_status_value(p_status)
  end;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  if p_pagamento_status is not null and p_pagamento_status not in ('Pendente', 'Pago', 'Cancelado') then
    raise exception 'Status de pagamento invalido.';
  end if;

  return query
  update public.pedidos p
  set status = coalesce(normalized_status, p.status),
      pagamento_status = coalesce(p_pagamento_status, p.pagamento_status),
      confirmado = coalesce(p_confirmado, p.confirmado),
      confirmado_em = case
        when p_confirmado is true and p.confirmado is distinct from true then now()
        else p.confirmado_em
      end,
      pagamento_confirmado_em = case
        when p_pagamento_status = 'Pago' and p.pagamento_status is distinct from 'Pago' then now()
        else p.pagamento_confirmado_em
      end
  where p.id = p_id
  returning p.id, p.status, p.pagamento_status, p.confirmado;
end;
$$;

revoke all on function public.admin_update_order(uuid, text, text, boolean) from public;
grant execute on function public.admin_update_order(uuid, text, text, boolean) to authenticated;

alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

grant usage on schema public to anon, authenticated;
grant select, update, delete on public.pedidos to authenticated;
grant select on public.pedido_itens to authenticated;
grant execute on function public.create_order(jsonb, jsonb) to anon;
grant execute on function public.create_order(jsonb, jsonb) to authenticated;

commit;
