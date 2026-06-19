-- Origem dos pedidos Monte Sinai.
-- Aditivo: identifica pedidos criados pelo site, venda presencial, telefone ou WhatsApp.
-- Nao usa DELETE/TRUNCATE.

begin;

alter table public.pedidos
  add column if not exists origem text not null default 'site';

comment on column public.pedidos.origem is 'Canal de origem do pedido: site, presencial, telefone ou whatsapp.';

update public.pedidos
set origem = case
  when coalesce(observacao, '') ilike '%venda presencial registrada pelo painel%' then 'presencial'
  when origem in ('site', 'presencial', 'telefone', 'whatsapp') then origem
  else 'site'
end;

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

create index if not exists idx_pedidos_origem_created_at
  on public.pedidos (origem, created_at desc);

create or replace function public.app_detect_order_origin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.origem := lower(btrim(coalesce(new.origem, 'site')));

  if new.origem not in ('site', 'presencial', 'telefone', 'whatsapp') then
    new.origem := 'site';
  end if;

  if coalesce(new.observacao, '') ilike '%venda presencial registrada pelo painel%' then
    new.origem := 'presencial';
  end if;

  return new;
end;
$$;

drop trigger if exists pedidos_detect_order_origin on public.pedidos;

create trigger pedidos_detect_order_origin
before insert or update of origem, observacao
on public.pedidos
for each row
execute function public.app_detect_order_origin();

notify pgrst, 'reload schema';

commit;
