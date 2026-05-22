-- 2026-05-22: suporte real a variacoes/opcoes de produtos.
-- Idempotente: pode ser executado mais de uma vez no SQL Editor do Supabase.
-- Nao apaga dados existentes e nao usa a tabela legada singular de produto.

begin;

create extension if not exists pgcrypto;

create table if not exists public.produto_variacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete restrict,
  nome text not null,
  slug text not null,
  sku text,
  preco numeric(10, 2) not null check (preco >= 0),
  estoque integer,
  ativo boolean not null default true,
  imagem text not null default '',
  atributos jsonb not null default '{}'::jsonb,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.produto_variacoes
  add column if not exists produto_id uuid references public.produtos(id) on delete restrict,
  add column if not exists nome text,
  add column if not exists slug text,
  add column if not exists sku text,
  add column if not exists preco numeric(10, 2),
  add column if not exists estoque integer,
  add column if not exists ativo boolean not null default true,
  add column if not exists imagem text not null default '',
  add column if not exists atributos jsonb not null default '{}'::jsonb,
  add column if not exists ordem integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.produto_variacoes
  alter column id set default gen_random_uuid(),
  alter column ativo set default true,
  alter column imagem set default '',
  alter column atributos set default '{}'::jsonb,
  alter column ordem set default 0,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'produto_variacoes_produto_id_fkey'
      and n.nspname = 'public'
      and t.relname = 'produto_variacoes'
      and c.confdeltype = 'c'
  ) then
    alter table public.produto_variacoes
      drop constraint produto_variacoes_produto_id_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produto_variacoes_produto_id_fkey'
  ) then
    alter table public.produto_variacoes
      add constraint produto_variacoes_produto_id_fkey
      foreign key (produto_id) references public.produtos(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produto_variacoes_nome_not_blank'
  ) then
    alter table public.produto_variacoes
      add constraint produto_variacoes_nome_not_blank
      check (btrim(nome) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produto_variacoes_slug_not_blank'
  ) then
    alter table public.produto_variacoes
      add constraint produto_variacoes_slug_not_blank
      check (btrim(slug) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produto_variacoes_preco_check'
  ) then
    alter table public.produto_variacoes
      add constraint produto_variacoes_preco_check
      check (preco >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produto_variacoes_estoque_check'
  ) then
    alter table public.produto_variacoes
      add constraint produto_variacoes_estoque_check
      check (estoque is null or estoque >= 0);
  end if;
end $$;

create unique index if not exists produto_variacoes_produto_slug_unique
  on public.produto_variacoes (produto_id, lower(slug));

create index if not exists idx_produto_variacoes_produto_id
  on public.produto_variacoes (produto_id);

create index if not exists idx_produto_variacoes_produto_ativo_ordem
  on public.produto_variacoes (produto_id, ativo, ordem, nome);

create index if not exists idx_produto_variacoes_sku
  on public.produto_variacoes (sku)
  where sku is not null and btrim(sku) <> '';

create index if not exists idx_produto_variacoes_updated_at
  on public.produto_variacoes (updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_produto_variacoes_updated_at on public.produto_variacoes;
create trigger set_produto_variacoes_updated_at
before update on public.produto_variacoes
for each row execute function public.set_updated_at();

alter table public.produto_variacoes enable row level security;

drop policy if exists "produto_variacoes_public_read_active" on public.produto_variacoes;
create policy "produto_variacoes_public_read_active"
on public.produto_variacoes for select
to anon, authenticated
using (
  ativo = true
  and exists (
    select 1
    from public.produtos p
    where p.id = produto_variacoes.produto_id
      and p.ativo = true
  )
);

drop policy if exists "produto_variacoes_admin_all" on public.produto_variacoes;
create policy "produto_variacoes_admin_all"
on public.produto_variacoes for all
to authenticated
using (public.admin_can_write())
with check (public.admin_can_write());

grant select on public.produto_variacoes to anon;
grant select, insert, update, delete on public.produto_variacoes to authenticated;

commit;
