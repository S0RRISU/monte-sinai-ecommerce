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
  has_public_view boolean := false;
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

    if exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.estoque_movimentacoes'::regclass
        and c.conname = 'estoque_movimentacoes_quantidade_check'
        and pg_get_constraintdef(c.oid) not ilike '%quantidade > 0%'
    ) then
      raise exception 'Precheck falhou: estoque_movimentacoes_quantidade_check nao exige quantidade > 0.';
    end if;
  end if;

  if to_regclass('public.pedido_eventos') is not null then
    if exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.pedido_eventos'::regclass
        and c.confrelid = 'public.pedidos'::regclass
        and c.contype = 'f'
        and c.confdeltype = 'c'
    ) then
      raise exception 'Precheck falhou: pedido_eventos ainda tem FK para pedidos com ON DELETE CASCADE.';
    end if;

    if not exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.pedido_eventos'::regclass
        and c.confrelid = 'public.pedidos'::regclass
        and c.contype = 'f'
        and c.confdeltype = 'r'
    ) then
      raise notice 'pedido_eventos ainda nao tem FK ON DELETE RESTRICT. Isso deve ser corrigido por 20260523-etapa-7-base-correta.sql.';
    end if;
  end if;

  if to_regclass('public.vw_catalogo_publico') is not null
    and to_regclass('public.vw_catalogo_variacoes_publicas') is not null then
    has_public_view := true;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('vw_catalogo_publico', 'vw_catalogo_variacoes_publicas')
        and column_name in ('estoque', 'estoque_minimo', 'ativo', 'catalogo_visivel', 'loja_visivel')
    ) then
      raise exception 'Precheck falhou: view publica de catalogo expoe coluna tecnica ou estoque.';
    end if;

    if not has_table_privilege('anon', 'public.vw_catalogo_publico', 'select')
      or not has_table_privilege('anon', 'public.vw_catalogo_variacoes_publicas', 'select') then
      raise exception 'Precheck falhou: anon nao tem leitura nas views publicas de catalogo.';
    end if;

    if not has_table_privilege('authenticated', 'public.vw_catalogo_publico', 'select')
      or not has_table_privilege('authenticated', 'public.vw_catalogo_variacoes_publicas', 'select') then
      raise exception 'Precheck falhou: authenticated nao tem leitura nas views publicas de catalogo.';
    end if;
  end if;

  if has_public_view and (
    has_table_privilege('anon', 'public.produtos', 'select')
    or has_table_privilege('anon', 'public.produto_variacoes', 'select')
  ) then
    raise exception 'Precheck falhou: anon ainda tem select direto em produtos/produto_variacoes.';
  end if;

  if has_public_view and (not exists (
    select 1 from pg_class where oid = 'public.produtos'::regclass and relrowsecurity = true
  ) or not exists (
    select 1 from pg_class where oid = 'public.produto_variacoes'::regclass and relrowsecurity = true
  )) then
    raise exception 'Precheck falhou: RLS nao esta ativo em produtos/produto_variacoes.';
  elsif not exists (
    select 1 from pg_class where oid = 'public.produtos'::regclass and relrowsecurity = true
  ) or not exists (
    select 1 from pg_class where oid = 'public.produto_variacoes'::regclass and relrowsecurity = true
  ) then
    raise notice 'RLS ainda nao esta ativo em produtos/produto_variacoes. Isso deve ser corrigido por 20260523-etapa-7-rls-sugerido.sql.';
  end if;

  if has_public_view and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'produtos'
      and policyname = 'produtos_admin_all'
      and (qual ilike '%admin_can_write%' or with_check ilike '%admin_can_write%')
  ) then
    raise exception 'Precheck falhou: produtos nao tem policy admin_can_write para acesso administrativo.';
  end if;

  if has_public_view and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'produto_variacoes'
      and policyname = 'produto_variacoes_admin_all'
      and (qual ilike '%admin_can_write%' or with_check ilike '%admin_can_write%')
  ) then
    raise exception 'Precheck falhou: produto_variacoes nao tem policy admin_can_write para acesso administrativo.';
  end if;

  if to_regprocedure('public.admin_can_write()') is not null then
    execute 'select public.admin_can_write()' into admin_allowed;
    raise notice 'admin_can_write() retornou %. No SQL Editor, auth.uid() pode ser nulo; valide tambem logado no painel.', admin_allowed;
  else
    raise notice 'admin_can_write() ainda nao existe. Isso e esperado antes de 20260523-etapa-7-funcoes-admin.sql.';
  end if;

  if to_regclass('public.vw_financeiro_pedidos') is not null then
    if has_table_privilege('anon', 'public.vw_financeiro_pedidos', 'select')
      or has_table_privilege('authenticated', 'public.vw_financeiro_pedidos', 'select')
      or has_table_privilege('anon', 'public.vw_financeiro_produtos', 'select')
      or has_table_privilege('authenticated', 'public.vw_financeiro_produtos', 'select')
      or has_table_privilege('anon', 'public.vw_financeiro_variacoes', 'select')
      or has_table_privilege('authenticated', 'public.vw_financeiro_variacoes', 'select') then
      raise exception 'Precheck falhou: views financeiras ainda tem grant direto para anon/authenticated.';
    end if;
  end if;

  if to_regprocedure('public.financeiro_pedidos(timestamptz,timestamptz)') is not null
    and to_regprocedure('public.financeiro_produtos(timestamptz,timestamptz)') is not null
    and to_regprocedure('public.financeiro_variacoes(timestamptz,timestamptz)') is not null then
    raise notice 'RPCs financeiras existem. Confirme que chamadas sem admin retornam Acesso negado.';
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
-- select * from public.vw_catalogo_publico limit 5; -- nao deve ter estoque/estoque_minimo/ativo/catalogo_visivel/loja_visivel.
-- select * from public.vw_catalogo_variacoes_publicas limit 5; -- nao deve ter estoque/estoque_minimo/ativo/catalogo_visivel/loja_visivel.
-- select has_table_privilege('anon', 'public.produtos', 'select'); -- deve ser false.
-- select has_table_privilege('anon', 'public.produto_variacoes', 'select'); -- deve ser false.
-- select has_table_privilege('anon', 'public.vw_catalogo_publico', 'select'); -- deve ser true.
-- select has_table_privilege('anon', 'public.vw_financeiro_pedidos', 'select'); -- deve ser false.
-- select has_table_privilege('authenticated', 'public.vw_financeiro_pedidos', 'select'); -- deve ser false.
