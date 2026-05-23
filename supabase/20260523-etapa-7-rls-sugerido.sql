-- Etapa 7 - RLS sugerido.
-- NAO EXECUTAR SEM REVISAO.
-- Este arquivo documenta politicas seguras para as novas tabelas/views.
-- Ajuste nomes de roles/funcoes conforme o seu projeto antes de aplicar.

-- Premissa usada pelo site hoje:
-- public.profiles.id = auth.uid()
-- public.profiles.is_admin = true ou admin_role em ('developer', 'owner', 'staff')

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.is_admin = true
        or p.admin_role in ('developer', 'owner', 'staff')
      )
  );
$$;

alter table public.pedido_eventos enable row level security;
alter table public.estoque_movimentacoes enable row level security;

drop policy if exists "pedido_eventos_admin_select" on public.pedido_eventos;
create policy "pedido_eventos_admin_select"
on public.pedido_eventos for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "pedido_eventos_admin_insert" on public.pedido_eventos;
create policy "pedido_eventos_admin_insert"
on public.pedido_eventos for insert
to authenticated
with check (public.is_current_user_admin());

drop policy if exists "estoque_movimentacoes_admin_select" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_select"
on public.estoque_movimentacoes for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "estoque_movimentacoes_admin_insert" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_insert"
on public.estoque_movimentacoes for insert
to authenticated
with check (public.is_current_user_admin());

drop policy if exists "estoque_movimentacoes_admin_update" on public.estoque_movimentacoes;
create policy "estoque_movimentacoes_admin_update"
on public.estoque_movimentacoes for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

grant select, insert on public.pedido_eventos to authenticated;
grant select, insert, update on public.estoque_movimentacoes to authenticated;

-- Views financeiras devem ser lidas apenas por admin.
-- Views nao aceitam RLS diretamente; por isso elas usam security_invoker=true no arquivo base.
-- Garanta tambem grants restritos:
revoke all on public.vw_financeiro_pedidos from anon;
revoke all on public.vw_financeiro_produtos from anon;
revoke all on public.vw_financeiro_variacoes from anon;

grant select on public.vw_financeiro_pedidos to authenticated;
grant select on public.vw_financeiro_produtos to authenticated;
grant select on public.vw_financeiro_variacoes to authenticated;
