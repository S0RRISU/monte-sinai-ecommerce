-- Permite exclusao administrativa de pedidos pelo painel.
-- A exclusao remove o pedido e os itens vinculados por cascade.
-- Use somente pelo botao de exclusao do painel administrativo.

begin;

do $$
begin
  if to_regclass('public.pedidos') is null
    or to_regclass('public.pedido_itens') is null
    or to_regprocedure('public.admin_can_write()') is null
  then
    raise exception 'Base de pedidos incompleta. Revise schema-pedidos.sql e os SQLs de acesso administrativo.';
  end if;
end $$;

create or replace function public.admin_delete_order(p_id uuid)
returns table (id uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  order_code text;
  customer_name text;
  deleted_id uuid;
begin
  if actor_id is null or not public.admin_can_write() then
    raise exception 'Acesso administrativo negado.';
  end if;

  if p_id is null then
    raise exception 'Pedido obrigatorio.';
  end if;

  select p.codigo, p.cliente_nome
    into order_code, customer_name
  from public.pedidos p
  where p.id = p_id;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  delete from public.pedidos p
  where p.id = p_id
  returning p.id into deleted_id;

  if deleted_id is null then
    raise exception 'Pedido nao foi excluido.';
  end if;

  if to_regprocedure('public.admin_log_action(text, text, text, jsonb)') is not null then
    perform public.admin_log_action(
      'pedido_excluido',
      'pedido',
      p_id::text,
      jsonb_build_object('codigo', coalesce(order_code, ''), 'cliente', coalesce(customer_name, ''))
    );
  end if;

  return query select deleted_id;
end;
$$;

alter table public.pedidos enable row level security;

grant select, delete on public.pedidos to authenticated;

drop policy if exists "pedidos_admin_select_all" on public.pedidos;
create policy "pedidos_admin_select_all"
on public.pedidos
for select
to authenticated
using ((select public.admin_can_write()));

drop policy if exists "pedidos_delete_admin" on public.pedidos;
create policy "pedidos_delete_admin"
on public.pedidos
for delete
to authenticated
using ((select public.admin_can_write()));

revoke all on function public.admin_delete_order(uuid) from public, anon;
grant execute on function public.admin_delete_order(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Conferencia depois de rodar:
-- select proname
-- from pg_proc
-- where oid = 'public.admin_delete_order(uuid)'::regprocedure;
