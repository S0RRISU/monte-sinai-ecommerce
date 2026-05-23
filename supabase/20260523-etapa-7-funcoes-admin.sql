-- Etapa 7 - funcoes/RPC administrativas.
-- Ordem: executar depois de 20260523-etapa-7-base-correta.sql e antes do RLS/grants.
-- NAO EXECUTAR AUTOMATICAMENTE PELO FRONT-END.

begin;

do $$
declare
  missing_items text[];
begin
  select array_agg(item)
  into missing_items
  from (
    values
      ('public.profiles'),
      ('public.pedidos'),
      ('public.pedido_eventos'),
      ('public.vw_financeiro_pedidos'),
      ('public.vw_financeiro_produtos'),
      ('public.vw_financeiro_variacoes')
  ) as required(item)
  where to_regclass(item) is null;

  if coalesce(array_length(missing_items, 1), 0) > 0 then
    raise exception
      'Funcoes da etapa 7 bloqueadas: objetos obrigatorios ausentes: %. Execute primeiro 20260523-etapa-7-base-correta.sql.',
      array_to_string(missing_items, ', ');
  end if;
end $$;

create or replace function public.admin_can_write()
returns boolean
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  has_is_admin boolean := false;
  has_admin_role boolean := false;
  allowed boolean := false;
begin
  if auth.uid() is null or to_regclass('public.profiles') is null then
    return false;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'is_admin'
  )
  into has_is_admin;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'admin_role'
  )
  into has_admin_role;

  if has_is_admin and has_admin_role then
    execute
      'select coalesce(p.is_admin, false) or coalesce(p.admin_role, '''') in (''developer'', ''owner'', ''staff'')
         from public.profiles p
        where p.id = $1
        limit 1'
    using auth.uid()
    into allowed;
  elsif has_is_admin then
    execute
      'select coalesce(p.is_admin, false)
         from public.profiles p
        where p.id = $1
        limit 1'
    using auth.uid()
    into allowed;
  elsif has_admin_role then
    execute
      'select coalesce(p.admin_role, '''') in (''developer'', ''owner'', ''staff'')
         from public.profiles p
        where p.id = $1
        limit 1'
    using auth.uid()
    into allowed;
  else
    return false;
  end if;

  return coalesce(allowed, false);
end;
$$;

create or replace function public.archive_order(pedido_id uuid, reason text default null)
returns public.pedidos
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  updated_order public.pedidos%rowtype;
  archive_reason text := nullif(btrim(coalesce(reason, '')), '');
begin
  if not public.admin_can_write() then
    raise exception 'Acesso negado para arquivar pedido.';
  end if;

  update public.pedidos
     set archived_at = now(),
         archived_by = auth.uid(),
         archived_reason = coalesce(archive_reason, 'Arquivado no painel administrativo')
   where id = pedido_id
   returning * into updated_order;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  insert into public.pedido_eventos (
    pedido_id,
    tipo,
    status_anterior,
    status_novo,
    payload,
    created_by
  ) values (
    pedido_id,
    'pedido_arquivado',
    updated_order.status,
    updated_order.status,
    jsonb_build_object(
      'archived_at', updated_order.archived_at,
      'archived_reason', updated_order.archived_reason
    ),
    auth.uid()
  );

  return updated_order;
end;
$$;

create or replace function public.restore_order(pedido_id uuid)
returns public.pedidos
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  previous_archived_at timestamptz;
  previous_reason text;
  updated_order public.pedidos%rowtype;
begin
  if not public.admin_can_write() then
    raise exception 'Acesso negado para restaurar pedido.';
  end if;

  select archived_at, archived_reason
    into previous_archived_at, previous_reason
    from public.pedidos
   where id = pedido_id
   for update;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  update public.pedidos
     set archived_at = null,
         archived_by = null,
         archived_reason = null
   where id = pedido_id
   returning * into updated_order;

  insert into public.pedido_eventos (
    pedido_id,
    tipo,
    status_anterior,
    status_novo,
    payload,
    created_by
  ) values (
    pedido_id,
    'pedido_restaurado',
    updated_order.status,
    updated_order.status,
    jsonb_build_object(
      'archived_at_anterior', previous_archived_at,
      'archived_reason_anterior', previous_reason
    ),
    auth.uid()
  );

  return updated_order;
end;
$$;

-- As views financeiras ficam sem grant direto para authenticated.
-- Estas RPCs sao SECURITY DEFINER somente para permitir leitura controlada
-- depois de confirmar public.admin_can_write().
create or replace function public.financeiro_pedidos(data_inicio timestamptz default null, data_fim timestamptz default null)
returns setof public.vw_financeiro_pedidos
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.admin_can_write() then
    raise exception 'Acesso negado ao financeiro.';
  end if;

  return query
  select *
    from public.vw_financeiro_pedidos v
   where (data_inicio is null or v.created_at >= data_inicio)
     and (data_fim is null or v.created_at < data_fim)
   order by v.created_at desc;
end;
$$;

create or replace function public.financeiro_produtos(data_inicio timestamptz default null, data_fim timestamptz default null)
returns setof public.vw_financeiro_produtos
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.admin_can_write() then
    raise exception 'Acesso negado ao financeiro.';
  end if;

  return query
  select
    pi.produto_id,
    pi.variacao_id,
    pr.nome as produto,
    pr.categoria,
    pv.nome as variacao,
    sum(coalesce(pi.quantidade, 1))::integer as quantidade_vendida,
    sum(coalesce(pi.total, coalesce(pi.preco_unitario, 0) * coalesce(pi.quantidade, 1)))::numeric(12, 2) as valor_total_vendido,
    count(distinct pi.pedido_id)::integer as quantidade_pedidos,
    max(p.created_at) as ultima_venda
  from public.pedido_itens pi
  join public.pedidos p on p.id = pi.pedido_id
  left join public.produtos pr on pr.id = pi.produto_id
  left join public.produto_variacoes pv on pv.id = pi.variacao_id
  where (data_inicio is null or p.created_at >= data_inicio)
    and (data_fim is null or p.created_at < data_fim)
  group by pi.produto_id, pi.variacao_id, pr.nome, pr.categoria, pv.nome
  order by quantidade_vendida desc, valor_total_vendido desc;
end;
$$;

create or replace function public.financeiro_variacoes(data_inicio timestamptz default null, data_fim timestamptz default null)
returns setof public.vw_financeiro_variacoes
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.admin_can_write() then
    raise exception 'Acesso negado ao financeiro.';
  end if;

  return query
  select
    pi.produto_id,
    pi.variacao_id,
    pr.nome as produto,
    pr.categoria,
    coalesce(pv.nome, nullif(pi.variacao, '')) as variacao,
    sum(coalesce(pi.quantidade, 1))::integer as quantidade_vendida,
    sum(coalesce(pi.total, coalesce(pi.preco_unitario, 0) * coalesce(pi.quantidade, 1)))::numeric(12, 2) as valor_total_vendido,
    count(distinct pi.pedido_id)::integer as quantidade_pedidos,
    max(p.created_at) as ultima_venda
  from public.pedido_itens pi
  join public.pedidos p on p.id = pi.pedido_id
  left join public.produtos pr on pr.id = pi.produto_id
  left join public.produto_variacoes pv on pv.id = pi.variacao_id
  where (pi.variacao_id is not null or nullif(pi.variacao, '') is not null)
    and (data_inicio is null or p.created_at >= data_inicio)
    and (data_fim is null or p.created_at < data_fim)
  group by pi.produto_id, pi.variacao_id, pr.nome, pr.categoria, coalesce(pv.nome, nullif(pi.variacao, ''))
  order by quantidade_vendida desc, valor_total_vendido desc;
end;
$$;

commit;
