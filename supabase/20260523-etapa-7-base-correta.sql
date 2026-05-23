-- Etapa 7 - base correta para admin, financeiro, ofertas e historico.
-- NAO EXECUTAR AUTOMATICAMENTE PELO FRONT-END.
-- Revise e execute manualmente no Supabase SQL Editor.
--
-- Pre-requisitos:
-- - Execute antes as migracoes oficiais que criam public.produtos,
--   public.produto_variacoes, public.pedidos, public.pedido_itens e public.profiles.
-- - Este arquivo nao apaga dados.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  missing_tables text[];
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
      'Etapa 7 bloqueada: tabelas obrigatorias ausentes: %. Execute primeiro as migracoes base da loja/pedidos/admin.',
      array_to_string(missing_tables, ', ');
  end if;
end $$;

alter table public.produtos
  add column if not exists tipo text not null default 'produto',
  add column if not exists destaque boolean not null default false,
  add column if not exists oferta_ativa boolean not null default false,
  add column if not exists preco_promocional numeric(10, 2),
  add column if not exists oferta_inicio timestamptz,
  add column if not exists oferta_fim timestamptz,
  add column if not exists kit_itens text not null default '',
  add column if not exists estoque integer,
  add column if not exists estoque_minimo integer not null default 3,
  add column if not exists catalogo_visivel boolean not null default true,
  add column if not exists loja_visivel boolean not null default true,
  add column if not exists catalogo_ordem integer,
  add column if not exists descricao_detalhada text not null default '',
  add column if not exists catalogo_destaque boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- A) Produto variacoes com oferta formal.
alter table public.produto_variacoes
  add column if not exists preco_promocional numeric(10, 2),
  add column if not exists oferta_ativa boolean not null default false,
  add column if not exists oferta_inicio timestamptz,
  add column if not exists oferta_fim timestamptz,
  add column if not exists estoque_minimo integer not null default 0,
  add column if not exists ordem integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produto_variacoes_preco_promocional_check'
  ) then
    alter table public.produto_variacoes
      add constraint produto_variacoes_preco_promocional_check
      check (preco_promocional is null or preco_promocional >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'produto_variacoes_estoque_minimo_check'
  ) then
    alter table public.produto_variacoes
      add constraint produto_variacoes_estoque_minimo_check
      check (estoque_minimo >= 0);
  end if;
end $$;

create index if not exists idx_produto_variacoes_oferta_ativa
  on public.produto_variacoes (oferta_ativa, oferta_inicio, oferta_fim)
  where oferta_ativa = true;

create index if not exists idx_produto_variacoes_estoque_minimo
  on public.produto_variacoes (estoque_minimo);

create or replace function public.set_produto_variacoes_updated_at()
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
for each row execute function public.set_produto_variacoes_updated_at();

-- B) Pedidos arquivados.
alter table public.pedidos
  add column if not exists pagamento_status text not null default 'Pendente',
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists archived_reason text;

create index if not exists idx_pedidos_archived_at
  on public.pedidos (archived_at);

create index if not exists idx_pedidos_status_archived
  on public.pedidos (status, archived_at);

-- Item do pedido precisa guardar a variacao formal para financeiro sem parsing por nome.
alter table public.pedido_itens
  add column if not exists variacao_id uuid references public.produto_variacoes(id) on delete set null;

create index if not exists idx_pedido_itens_variacao_id
  on public.pedido_itens (variacao_id);

-- C) Historico/eventos do pedido.
create table if not exists public.pedido_eventos (
  id uuid primary key default extensions.gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete restrict,
  tipo text not null,
  status_anterior text,
  status_novo text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_pedido_eventos_pedido_data
  on public.pedido_eventos (pedido_id, created_at desc);

create index if not exists idx_pedido_eventos_tipo_data
  on public.pedido_eventos (tipo, created_at desc);

-- D) Movimentacao de estoque.
create table if not exists public.estoque_movimentacoes (
  id uuid primary key default extensions.gen_random_uuid(),
  produto_id uuid references public.produtos(id) on delete set null,
  variacao_id uuid references public.produto_variacoes(id) on delete set null,
  tipo text not null,
  quantidade integer not null,
  motivo text,
  pedido_id uuid references public.pedidos(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint estoque_movimentacoes_tipo_check
    check (tipo in ('entrada', 'saida_venda', 'ajuste', 'cancelamento', 'devolucao')),
  constraint estoque_movimentacoes_quantidade_check
    check (quantidade > 0)
);

create index if not exists idx_estoque_movimentacoes_produto_data
  on public.estoque_movimentacoes (produto_id, created_at desc);

create index if not exists idx_estoque_movimentacoes_variacao_data
  on public.estoque_movimentacoes (variacao_id, created_at desc);

create index if not exists idx_estoque_movimentacoes_pedido_data
  on public.estoque_movimentacoes (pedido_id, created_at desc);

-- E) Views para financeiro real.
create or replace view public.vw_financeiro_pedidos
with (security_invoker = true)
as
select
  p.id as pedido_id,
  p.codigo,
  p.cliente_nome,
  p.cliente_telefone,
  p.status,
  p.pagamento,
  p.pagamento_status,
  p.total,
  p.created_at,
  p.archived_at,
  date_trunc('day', p.created_at)::date as dia,
  date_trunc('week', p.created_at)::date as semana,
  date_trunc('month', p.created_at)::date as mes
from public.pedidos p;

create or replace view public.vw_financeiro_produtos
with (security_invoker = true)
as
select
  pi.produto_id,
  pi.variacao_id,
  pr.nome as produto,
  pr.categoria,
  pv.nome as variacao,
  sum(coalesce(pi.quantidade, 1))::integer as quantidade_vendida,
  sum(coalesce(pi.total, coalesce(pi.preco_unitario, 0) * coalesce(pi.quantidade, 1)))::numeric(12, 2) as valor_total_vendido,
  count(distinct pi.pedido_id)::integer as quantidade_pedidos,
  max(p.created_at) as ultima_venda
from public.pedido_itens pi
join public.pedidos p on p.id = pi.pedido_id
left join public.produtos pr on pr.id = pi.produto_id
left join public.produto_variacoes pv on pv.id = pi.variacao_id
group by pi.produto_id, pi.variacao_id, pr.nome, pr.categoria, pv.nome;

create or replace view public.vw_financeiro_variacoes
with (security_invoker = true)
as
select
  pi.produto_id,
  pi.variacao_id,
  pr.nome as produto,
  pr.categoria,
  coalesce(pv.nome, nullif(pi.variacao, '')) as variacao,
  sum(coalesce(pi.quantidade, 1))::integer as quantidade_vendida,
  sum(coalesce(pi.total, coalesce(pi.preco_unitario, 0) * coalesce(pi.quantidade, 1)))::numeric(12, 2) as valor_total_vendido,
  count(distinct pi.pedido_id)::integer as quantidade_pedidos,
  max(p.created_at) as ultima_venda
from public.pedido_itens pi
join public.pedidos p on p.id = pi.pedido_id
left join public.produtos pr on pr.id = pi.produto_id
left join public.produto_variacoes pv on pv.id = pi.variacao_id
where pi.variacao_id is not null or nullif(pi.variacao, '') is not null
group by pi.produto_id, pi.variacao_id, pr.nome, pr.categoria, coalesce(pv.nome, nullif(pi.variacao, ''));

-- F) Catalogo publico seguro.
-- Estas views nao retornam estoque numerico. A loja publica usa apenas
-- pode_comprar/indisponivel; o painel admin continua lendo as tabelas reais.
create or replace view public.vw_catalogo_publico
as
select
  p.id,
  p.nome,
  case
    when p.oferta_ativa
      and p.preco_promocional is not null
      and p.preco_promocional > 0
      and (p.oferta_inicio is null or p.oferta_inicio <= now())
      and (p.oferta_fim is null or p.oferta_fim >= now())
    then p.preco_promocional
    else p.preco
  end as preco,
  p.preco as preco_original,
  p.imagem,
  p.categoria,
  p.descricao,
  p.ativo,
  p.tipo,
  p.destaque,
  p.oferta_ativa,
  p.preco_promocional,
  p.oferta_inicio,
  p.oferta_fim,
  p.kit_itens,
  p.catalogo_visivel,
  p.loja_visivel,
  p.catalogo_ordem,
  p.descricao_detalhada,
  p.catalogo_destaque,
  p.created_at,
  p.updated_at,
  case
    when exists (
      select 1
      from public.produto_variacoes pv
      where pv.produto_id = p.id
        and pv.ativo = true
    ) then exists (
      select 1
      from public.produto_variacoes pv
      where pv.produto_id = p.id
        and pv.ativo = true
        and (pv.estoque is null or pv.estoque > 0)
    )
    else p.estoque is null or p.estoque > 0
  end as pode_comprar,
  case
    when exists (
      select 1
      from public.produto_variacoes pv
      where pv.produto_id = p.id
        and pv.ativo = true
    ) then not exists (
      select 1
      from public.produto_variacoes pv
      where pv.produto_id = p.id
        and pv.ativo = true
        and (pv.estoque is null or pv.estoque > 0)
    )
    else p.estoque is not null and p.estoque <= 0
  end as indisponivel
from public.produtos p
where p.ativo = true
  and p.loja_visivel = true;

create or replace view public.vw_catalogo_variacoes_publicas
as
select
  pv.id,
  pv.produto_id,
  pv.nome,
  pv.slug,
  pv.sku,
  case
    when pv.oferta_ativa
      and pv.preco_promocional is not null
      and pv.preco_promocional > 0
      and (pv.oferta_inicio is null or pv.oferta_inicio <= now())
      and (pv.oferta_fim is null or pv.oferta_fim >= now())
    then pv.preco_promocional
    else pv.preco
  end as preco,
  pv.preco as preco_original,
  pv.ativo,
  pv.imagem,
  pv.atributos,
  pv.ordem,
  pv.preco_promocional,
  pv.oferta_ativa,
  pv.oferta_inicio,
  pv.oferta_fim,
  pv.created_at,
  pv.updated_at,
  (pv.estoque is null or pv.estoque > 0) as pode_comprar,
  (pv.estoque is not null and pv.estoque <= 0) as indisponivel
from public.produto_variacoes pv
join public.produtos p on p.id = pv.produto_id
where pv.ativo = true
  and p.ativo = true
  and p.loja_visivel = true;

commit;
