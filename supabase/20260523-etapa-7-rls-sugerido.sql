-- Etapa 7 - RLS e grants sugeridos.
-- Ordem: executar depois de 20260523-etapa-7-base-correta.sql e
-- 20260523-etapa-7-funcoes-admin.sql.
-- NAO EXECUTAR SEM REVISAO.

begin;

do $$
declare
  missing_items text[];
begin
  select array_agg(item)
  into missing_items
  from (
    values
      ('public.produtos'),
      ('public.produto_variacoes'),
      ('public.pedidos'),
      ('public.pedido_eventos'),
      ('public.estoque_movimentacoes'),
      ('public.vw_catalogo_publico'),
      ('public.vw_catalogo_variacoes_publicas'),
      ('public.vw_financeiro_pedidos'),
      ('public.vw_financeiro_produtos'),
      ('public.vw_financeiro_variacoes')
  ) as required(item)
  where to_regclass(item) is null;

  if coalesce(array_length(missing_items, 1), 0) > 0 then
    raise exception
      'RLS da etapa 7 bloqueado: objetos obrigatorios ausentes: %. Execute primeiro 20260523-etapa-7-base-correta.sql e funcoes-admin.',
      array_to_string(missing_items, ', ');
  end if;
end $$;

-- Recria admin_can_write de forma compativel: usa admin_role quando existir,
-- mas nao quebra em bancos onde a coluna ainda nao foi aplicada.
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

revoke all on function public.admin_can_write() from public;
grant execute on function public.admin_can_write() to authenticated;

alter table public.pedido_eventos enable row level security;
alter table public.estoque_movimentacoes enable row level security;
alter table public.pedidos enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_variacoes enable row level security;

-- A loja publica deve consumir as views seguras de catalogo. As tabelas reais
-- ficam sem policy publica para nao expor estoque numerico por Data API.
drop policy if exists "produtos_public_read_active" on public.produtos;
drop policy if exists "produto_variacoes_public_read_active" on public.produto_variacoes;

drop policy if exists "produtos_admin_all" on public.produtos;
create policy "produtos_admin_all"
on public.produtos for all
to authenticated
using (public.admin_can_write())
with check (public.admin_can_write());

drop policy if exists "produto_variacoes_admin_all" on public.produto_variacoes;
create policy "produto_variacoes_admin_all"
on public.produto_variacoes for all
to authenticated
using (public.admin_can_write())
with check (public.admin_can_write());

drop policy if exists "pedidos_admin_select_all" on public.pedidos;
create policy "pedidos_admin_select_all"
on public.pedidos for select
to authenticated
using (public.admin_can_write());

drop policy if exists "pedidos_archive_admin_update" on public.pedidos;
create policy "pedidos_archive_admin_update"
on public.pedidos for update
to authenticated
using (public.admin_can_write())
with check (public.admin_can_write());

drop policy if exists "pedido_eventos_admin_select" on public.pedido_eventos;
create policy "pedido_eventos_admin_select"
on public.pedido_eventos for select
to authenticated
using (public.admin_can_write());

drop policy if exists "pedido_eventos_admin_insert" on public.pedido_eventos;
create policy "pedido_eventos_admin_insert"
on public.pedido_eventos for insert
to authenticated
with check (public.admin_can_write());

drop policy if exists "estoque_movimentacoes_admin_select" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_select"
on public.estoque_movimentacoes for select
to authenticated
using (public.admin_can_write());

drop policy if exists "estoque_movimentacoes_admin_insert" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_insert"
on public.estoque_movimentacoes for insert
to authenticated
with check (public.admin_can_write());

drop policy if exists "estoque_movimentacoes_admin_update" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_update"
on public.estoque_movimentacoes for update
to authenticated
using (public.admin_can_write())
with check (public.admin_can_write());

grant select, insert on public.pedido_eventos to authenticated;
grant select, insert, update on public.estoque_movimentacoes to authenticated;
grant update (archived_at, archived_by, archived_reason) on public.pedidos to authenticated;

grant select on public.vw_catalogo_publico to anon, authenticated;
grant select on public.vw_catalogo_variacoes_publicas to anon, authenticated;

-- Financeiro nao fica aberto para authenticated. As views permanecem sem grant
-- direto; o acesso deve passar pelas RPCs que checam public.admin_can_write().
revoke all on public.vw_financeiro_pedidos from public, anon, authenticated;
revoke all on public.vw_financeiro_produtos from public, anon, authenticated;
revoke all on public.vw_financeiro_variacoes from public, anon, authenticated;

revoke all on function public.archive_order(uuid, text) from public;
revoke all on function public.restore_order(uuid) from public;
revoke all on function public.financeiro_pedidos(timestamptz, timestamptz) from public;
revoke all on function public.financeiro_produtos(timestamptz, timestamptz) from public;
revoke all on function public.financeiro_variacoes(timestamptz, timestamptz) from public;

grant execute on function public.archive_order(uuid, text) to authenticated;
grant execute on function public.restore_order(uuid) to authenticated;
grant execute on function public.financeiro_pedidos(timestamptz, timestamptz) to authenticated;
grant execute on function public.financeiro_produtos(timestamptz, timestamptz) to authenticated;
grant execute on function public.financeiro_variacoes(timestamptz, timestamptz) to authenticated;

commit;
