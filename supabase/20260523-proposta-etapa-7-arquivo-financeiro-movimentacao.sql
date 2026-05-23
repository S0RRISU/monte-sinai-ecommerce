-- PROPOSTA ETAPA 7 - NAO EXECUTAR AUTOMATICAMENTE
-- Este arquivo documenta os campos recomendados para arquivar pedidos e registrar
-- movimentacao de estoque. Revise no Supabase antes de aplicar em producao.

-- Pedidos: permite tirar da tela principal sem apagar historico.
alter table public.pedidos
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists restored_at timestamptz;

create index if not exists idx_pedidos_archived_at
  on public.pedidos (archived_at);

-- Movimentacao de produtos: base para entrada manual, ajuste e saida por venda.
create table if not exists public.produto_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references public.produtos(id) on delete set null,
  variacao_id uuid references public.produto_variacoes(id) on delete set null,
  pedido_id uuid references public.pedidos(id) on delete set null,
  tipo text not null check (tipo in ('saida_venda', 'entrada_reposicao', 'ajuste_estoque')),
  quantidade integer not null,
  estoque_anterior integer,
  estoque_novo integer,
  observacao text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_produto_movimentacoes_produto_data
  on public.produto_movimentacoes (produto_id, created_at desc);

create index if not exists idx_produto_movimentacoes_variacao_data
  on public.produto_movimentacoes (variacao_id, created_at desc);
