-- Promocoes, cupons, estoque e status operacional da Monte Sinai.
-- Execute depois de schema-pedidos.sql e 20260524-base-rbac-permissoes.sql.

begin;

alter table public.produtos
  add column if not exists estoque integer,
  add column if not exists estoque_minimo integer not null default 3;

alter table public.pedidos
  alter column status set default 'Recebido',
  add column if not exists desconto numeric(10, 2) not null default 0,
  add column if not exists cupom_codigo text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_estoque_check'
  ) then
    alter table public.produtos
      add constraint produtos_estoque_check check (estoque is null or estoque >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produtos_estoque_minimo_check'
  ) then
    alter table public.produtos
      add constraint produtos_estoque_minimo_check check (estoque_minimo >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_desconto_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_desconto_check check (desconto >= 0);
  end if;
end;
$$;

create index if not exists idx_pedidos_status_created_at
on public.pedidos (status, created_at desc);

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

drop trigger if exists decrement_product_stock_after_item on public.pedido_itens;
create trigger decrement_product_stock_after_item
after insert on public.pedido_itens
for each row execute function public.decrement_product_stock();

commit;
