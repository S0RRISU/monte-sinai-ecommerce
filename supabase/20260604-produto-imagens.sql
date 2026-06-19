-- Galeria de imagens dos produtos Monte Sinai.
-- Aditivo: permite varias fotos por produto sem substituir a imagem principal.
-- Nao usa DELETE/TRUNCATE.

begin;

create table if not exists public.produto_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  url text not null,
  alt_text text not null default '',
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produto_imagens_url_not_blank'
  ) then
    alter table public.produto_imagens
      add constraint produto_imagens_url_not_blank
      check (length(btrim(url)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produto_imagens_ordem_check'
  ) then
    alter table public.produto_imagens
      add constraint produto_imagens_ordem_check
      check (ordem >= 0);
  end if;
end $$;

create index if not exists idx_produto_imagens_produto_ordem
  on public.produto_imagens (produto_id, ordem, created_at);

create or replace function public.set_produto_imagens_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_produto_imagens_updated_at on public.produto_imagens;
create trigger set_produto_imagens_updated_at
before update on public.produto_imagens
for each row execute function public.set_produto_imagens_updated_at();

alter table public.produto_imagens enable row level security;

drop policy if exists "produto_imagens_public_read_active" on public.produto_imagens;
create policy "produto_imagens_public_read_active"
on public.produto_imagens for select
to anon, authenticated
using (
  exists (
    select 1
    from public.produtos p
    where p.id = produto_imagens.produto_id
      and (p.ativo = true or public.is_admin())
  )
);

drop policy if exists "produto_imagens_admin_all" on public.produto_imagens;
create policy "produto_imagens_admin_all"
on public.produto_imagens for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.produto_imagens to anon;
grant select, insert, update, delete on public.produto_imagens to authenticated;

notify pgrst, 'reload schema';

commit;
