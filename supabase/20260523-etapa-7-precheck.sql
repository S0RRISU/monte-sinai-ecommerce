-- Etapa 7 - precheck e pos-check seguro.
-- NAO ALTERA DADOS. Use antes e depois das migracoes para diagnostico.
--
-- Ordem sugerida:
-- 1. Rode este arquivo antes da etapa 7 para validar pre-requisitos.
-- 2. Rode os SQLs da etapa 7 na ordem indicada nos arquivos.
-- 3. Rode este arquivo de novo para confirmar views/RPCs/grants.

do $$
declare
  missing_tables text[];
  invalid_count integer := 0;
  admin_allowed boolean := false;
begin
  select array_agg(required_table)
  into missing_tables
  from (
    values
      ('public.produtos'),
      ('public.produto_variacoes'),
      ('public.pedidos'),
      ('public.pedido_itens'),
      ('public.profiles')
  ) as required(required_table)
  where to_regclass(required_table) is null;

  if coalesce(array_length(missing_tables, 1), 0) > 0 then
    raise exception
      'Precheck falhou: tabelas obrigatorias ausentes: %. Execute primeiro schema-pedidos/admin/produto_variacoes.',
      array_to_string(missing_tables, ', ');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'produtos'
      and column_name = 'preco_promocional'
  ) then
    execute 'select count(*) from public.produtos where preco_promocional is not null and preco_promocional < 0'
      into invalid_count;
    if invalid_count > 0 then
      raise exception 'Precheck falhou: existem % produtos com preco_promocional negativo.', invalid_count;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'produto_variacoes'
      and column_name = 'preco_promocional'
  ) then
    execute 'select count(*) from public.produto_variacoes where preco_promocional is not null and preco_promocional < 0'
      into invalid_count;
    if invalid_count > 0 then
      raise exception 'Precheck falhou: existem % opcoes com preco_promocional negativo.', invalid_count;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'produto_variacoes'
      and column_name = 'estoque_minimo'
  ) then
    execute 'select count(*) from public.produto_variacoes where estoque_minimo < 0'
      into invalid_count;
    if invalid_count > 0 then
      raise exception 'Precheck falhou: existem % opcoes com estoque_minimo negativo.', invalid_count;
    end if;
  end if;

  if to_regclass('public.estoque_movimentacoes') is not null then
    execute 'select count(*) from public.estoque_movimentacoes where quantidade <= 0'
      into invalid_count;
    if invalid_count > 0 then
      raise exception 'Precheck falhou: existem % movimentacoes com quantidade invalida.', invalid_count;
    end if;
  end if;

  if to_regprocedure('public.admin_can_write()') is not null then
    execute 'select public.admin_can_write()' into admin_allowed;
    raise notice 'admin_can_write() retornou %. No SQL Editor, auth.uid() pode ser nulo; valide tambem logado no painel.', admin_allowed;
  else
    raise notice 'admin_can_write() ainda nao existe. Isso e esperado antes de 20260523-etapa-7-funcoes-admin.sql.';
  end if;
end $$;

select
  'tabela' as tipo,
  item as nome,
  case when to_regclass(item) is null then 'ausente' else 'ok' end as status
from (
  values
    ('public.produtos'),
    ('public.produto_variacoes'),
    ('public.pedidos'),
    ('public.pedido_itens'),
    ('public.profiles'),
    ('public.pedido_eventos'),
    ('public.estoque_movimentacoes'),
    ('public.vw_catalogo_publico'),
    ('public.vw_catalogo_variacoes_publicas'),
    ('public.vw_financeiro_pedidos'),
    ('public.vw_financeiro_produtos'),
    ('public.vw_financeiro_variacoes')
) as checks(item)
union all
select
  'funcao' as tipo,
  item as nome,
  case when to_regprocedure(item) is null then 'ausente' else 'ok' end as status
from (
  values
    ('public.admin_can_write()'),
    ('public.archive_order(uuid,text)'),
    ('public.restore_order(uuid)'),
    ('public.financeiro_pedidos(timestamptz,timestamptz)'),
    ('public.financeiro_produtos(timestamptz,timestamptz)'),
    ('public.financeiro_variacoes(timestamptz,timestamptz)'),
    ('public.create_order(jsonb,jsonb)')
) as checks(item)
order by tipo, nome;

-- Verificacoes manuais recomendadas apos a migracao:
-- select public.admin_can_write(); -- deve ser true quando chamado por um admin autenticado.
-- select * from public.vw_catalogo_publico limit 5; -- nao deve ter estoque/estoque_minimo.
-- select * from public.vw_catalogo_variacoes_publicas limit 5; -- nao deve ter estoque/estoque_minimo.
-- select has_table_privilege('anon', 'public.vw_financeiro_pedidos', 'select'); -- deve ser false.
-- select has_table_privilege('authenticated', 'public.vw_financeiro_pedidos', 'select'); -- deve ser false.
