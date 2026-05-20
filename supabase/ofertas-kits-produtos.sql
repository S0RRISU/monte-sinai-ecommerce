-- Campos extras para kits e ofertas com temporizador.
-- Execute no SQL Editor do Supabase se o schema-pedidos.sql ja foi executado antes.

begin;

alter table public.produtos
  add column if not exists tipo text not null default 'produto',
  add column if not exists destaque boolean not null default false,
  add column if not exists oferta_ativa boolean not null default false,
  add column if not exists preco_promocional numeric(10, 2),
  add column if not exists oferta_inicio timestamptz,
  add column if not exists oferta_fim timestamptz,
  add column if not exists kit_itens text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_tipo_check'
  ) then
    alter table public.produtos
      add constraint produtos_tipo_check check (tipo in ('produto', 'kit'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produtos_preco_promocional_check'
  ) then
    alter table public.produtos
      add constraint produtos_preco_promocional_check check (preco_promocional is null or preco_promocional >= 0);
  end if;
end;
$$;

commit;
