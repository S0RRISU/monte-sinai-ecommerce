-- Etapa 7 - RLS e grants sugeridos.
-- Ordem: executar depois de 20260523-etapa-7-base-correta.sql e
-- 20260523-etapa-7-funcoes-admin.sql.
-- NAO EXECUTAR SEM REVISAO.

begin;

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
      and column_name = 'admin_role'
  )
  into has_admin_role;

  if has_admin_role then
    execute
      'select coalesce(p.is_admin, false) or coalesce(p.admin_role, '''') in (''developer'', ''owner'', ''staff'')
         from public.profiles p
        where p.id = $1
        limit 1'
    using auth.uid()
    into allowed;
  else
    execute
      'select coalesce(p.is_admin, false)
         from public.profiles p
        where p.id = $1
        limit 1'
    using auth.uid()
    into allowed;
  end if;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.admin_can_write() from public;
grant execute on function public.admin_can_write() to authenticated;

alter table public.pedido_eventos enable row level security;
alter table public.estoque_movimentacoes enable row level security;
alter table public.pedidos enable row level security;

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
