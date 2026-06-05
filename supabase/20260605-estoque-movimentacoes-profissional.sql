-- Historico profissional de estoque Monte Sinai.
-- Registra entradas, perdas, devolucoes e ajustes com saldo anterior/novo.
-- Atualiza produto ou variacao e grava a movimentacao na mesma transacao.
-- Nao usa DELETE/TRUNCATE.

begin;

do $$
begin
  if to_regclass('public.produtos') is null
    or to_regclass('public.produto_variacoes') is null
    or to_regclass('public.estoque_movimentacoes') is null
    or to_regclass('public.profiles') is null
    or to_regprocedure('public.admin_can_write()') is null
  then
    raise exception
      'Base de estoque incompleta. Revise 20260523-etapa-7-base-correta.sql e 20260603-admin-user-access.sql.';
  end if;
end $$;

alter table public.estoque_movimentacoes
  add column if not exists estoque_anterior integer,
  add column if not exists estoque_novo integer,
  add column if not exists fornecedor text,
  add column if not exists documento text,
  add column if not exists custo_unitario numeric(12, 2),
  add column if not exists ocorrido_em timestamptz,
  add column if not exists responsavel_nome text,
  add column if not exists responsavel_email text,
  add column if not exists grupo_id uuid;

update public.estoque_movimentacoes
set ocorrido_em = coalesce(created_at, now())
where ocorrido_em is null;

alter table public.estoque_movimentacoes
  alter column ocorrido_em set default now(),
  alter column ocorrido_em set not null;

comment on table public.estoque_movimentacoes is
  'Historico imutavel das entradas, saidas e ajustes de estoque.';

comment on column public.estoque_movimentacoes.ocorrido_em is
  'Data e hora em que a movimentacao ocorreu; created_at registra quando foi cadastrada.';

comment on column public.estoque_movimentacoes.grupo_id is
  'Agrupa varios produtos recebidos na mesma reposicao ou documento.';

alter table public.estoque_movimentacoes
  drop constraint if exists estoque_movimentacoes_tipo_check;

alter table public.estoque_movimentacoes
  add constraint estoque_movimentacoes_tipo_check
  check (
    tipo in (
      'entrada',
      'saida_venda',
      'ajuste',
      'ajuste_entrada',
      'ajuste_saida',
      'cancelamento',
      'devolucao',
      'perda'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estoque_movimentacoes_saldos_check'
      and conrelid = 'public.estoque_movimentacoes'::regclass
  ) then
    alter table public.estoque_movimentacoes
      add constraint estoque_movimentacoes_saldos_check
      check (
        (estoque_anterior is null and estoque_novo is null)
        or (
          estoque_anterior is not null
          and estoque_novo is not null
          and estoque_anterior >= 0
          and estoque_novo >= 0
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estoque_movimentacoes_custo_check'
      and conrelid = 'public.estoque_movimentacoes'::regclass
  ) then
    alter table public.estoque_movimentacoes
      add constraint estoque_movimentacoes_custo_check
      check (custo_unitario is null or custo_unitario >= 0);
  end if;
end $$;

create index if not exists idx_estoque_movimentacoes_ocorrido_em
  on public.estoque_movimentacoes (ocorrido_em desc);

create index if not exists idx_estoque_movimentacoes_tipo_ocorrido
  on public.estoque_movimentacoes (tipo, ocorrido_em desc);

create index if not exists idx_estoque_movimentacoes_grupo
  on public.estoque_movimentacoes (grupo_id, ocorrido_em desc)
  where grupo_id is not null;

create index if not exists idx_estoque_movimentacoes_fornecedor
  on public.estoque_movimentacoes (lower(fornecedor))
  where fornecedor is not null and btrim(fornecedor) <> '';

create or replace function public.admin_registrar_movimentacao_estoque(
  p_produto_id uuid,
  p_variacao_id uuid default null,
  p_tipo text default 'entrada',
  p_quantidade integer default 1,
  p_motivo text default null,
  p_fornecedor text default null,
  p_documento text default null,
  p_custo_unitario numeric default null,
  p_ocorrido_em timestamptz default now(),
  p_grupo_id uuid default null
)
returns table (
  movimentacao_id uuid,
  estoque_anterior integer,
  estoque_novo integer,
  grupo_id uuid
)
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text := '';
  actor_email text := '';
  clean_type text := lower(btrim(coalesce(p_tipo, '')));
  clean_reason text := nullif(btrim(coalesce(p_motivo, '')), '');
  clean_supplier text := nullif(btrim(coalesce(p_fornecedor, '')), '');
  clean_document text := nullif(btrim(coalesce(p_documento, '')), '');
  previous_stock integer;
  next_stock integer;
  movement_id uuid;
  movement_group_id uuid := coalesce(p_grupo_id, extensions.gen_random_uuid());
  variation_product_id uuid;
begin
  if actor_id is null or not public.admin_can_write() then
    raise exception 'Voce nao tem permissao para movimentar o estoque.';
  end if;

  if p_produto_id is null then
    raise exception 'Produto obrigatorio.';
  end if;

  if coalesce(p_quantidade, 0) <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  if clean_type not in (
    'entrada',
    'ajuste_entrada',
    'ajuste_saida',
    'cancelamento',
    'devolucao',
    'perda'
  ) then
    raise exception 'Tipo de movimentacao invalido: %.', clean_type;
  end if;

  if p_custo_unitario is not null and p_custo_unitario < 0 then
    raise exception 'O custo unitario nao pode ser negativo.';
  end if;

  select
    coalesce(nullif(btrim(p.nome), ''), 'Administrador'),
    coalesce(nullif(btrim(p.email), ''), '')
  into actor_name, actor_email
  from public.profiles p
  where p.id = actor_id;

  if p_variacao_id is not null then
    select pv.produto_id, coalesce(pv.estoque, 0)
      into variation_product_id, previous_stock
    from public.produto_variacoes pv
    where pv.id = p_variacao_id
    for update;

    if not found then
      raise exception 'Variacao nao encontrada.';
    end if;

    if variation_product_id <> p_produto_id then
      raise exception 'A variacao informada nao pertence ao produto.';
    end if;
  else
    if exists (
      select 1
      from public.produto_variacoes pv
      where pv.produto_id = p_produto_id
        and pv.ativo = true
    ) then
      raise exception 'Escolha uma variacao para movimentar o estoque deste produto.';
    end if;

    select coalesce(p.estoque, 0)
      into previous_stock
    from public.produtos p
    where p.id = p_produto_id
    for update;

    if not found then
      raise exception 'Produto nao encontrado.';
    end if;
  end if;

  next_stock := case
    when clean_type in ('entrada', 'ajuste_entrada', 'cancelamento', 'devolucao')
      then previous_stock + p_quantidade
    when clean_type in ('ajuste_saida', 'perda')
      then previous_stock - p_quantidade
    else previous_stock
  end;

  if next_stock < 0 then
    raise exception
      'Estoque insuficiente. Saldo atual: %, saida solicitada: %.',
      previous_stock,
      p_quantidade;
  end if;

  if p_variacao_id is not null then
    update public.produto_variacoes
    set estoque = next_stock,
        updated_at = now()
    where id = p_variacao_id;
  else
    update public.produtos
    set estoque = next_stock,
        updated_at = now()
    where id = p_produto_id;
  end if;

  insert into public.estoque_movimentacoes (
    produto_id,
    variacao_id,
    tipo,
    quantidade,
    motivo,
    created_by,
    created_at,
    estoque_anterior,
    estoque_novo,
    fornecedor,
    documento,
    custo_unitario,
    ocorrido_em,
    responsavel_nome,
    responsavel_email,
    grupo_id
  ) values (
    p_produto_id,
    p_variacao_id,
    clean_type,
    p_quantidade,
    clean_reason,
    actor_id,
    now(),
    previous_stock,
    next_stock,
    clean_supplier,
    clean_document,
    p_custo_unitario,
    coalesce(p_ocorrido_em, now()),
    coalesce(actor_name, 'Administrador'),
    coalesce(actor_email, ''),
    movement_group_id
  )
  returning id into movement_id;

  return query
  select movement_id, previous_stock, next_stock, movement_group_id;
end;
$$;

revoke all on function public.admin_registrar_movimentacao_estoque(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  numeric,
  timestamptz,
  uuid
) from public, anon;

grant execute on function public.admin_registrar_movimentacao_estoque(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  numeric,
  timestamptz,
  uuid
) to authenticated;

alter table public.estoque_movimentacoes enable row level security;

drop policy if exists "estoque_movimentacoes_admin_select" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_select"
on public.estoque_movimentacoes
for select
to authenticated
using ((select public.admin_can_write()));

drop policy if exists "estoque_movimentacoes_admin_insert" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_insert"
on public.estoque_movimentacoes
for insert
to authenticated
with check (
  (select public.admin_can_write())
  and created_by = (select auth.uid())
);

drop policy if exists "estoque_movimentacoes_admin_update" on public.estoque_movimentacoes;

revoke update, delete on public.estoque_movimentacoes from authenticated;
grant select, insert on public.estoque_movimentacoes to authenticated;

notify pgrst, 'reload schema';

commit;

-- Conferencia depois de rodar:
-- select
--   em.tipo,
--   p.nome as produto,
--   pv.nome as variacao,
--   em.quantidade,
--   em.estoque_anterior,
--   em.estoque_novo,
--   em.fornecedor,
--   em.documento,
--   em.responsavel_nome,
--   em.ocorrido_em
-- from public.estoque_movimentacoes em
-- left join public.produtos p on p.id = em.produto_id
-- left join public.produto_variacoes pv on pv.id = em.variacao_id
-- order by em.ocorrido_em desc
-- limit 50;
