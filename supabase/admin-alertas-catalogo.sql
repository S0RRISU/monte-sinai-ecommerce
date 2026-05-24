-- Alertas de pedidos, auditoria admin, roles e catalogo de consulta.
-- Execute depois de schema-pedidos.sql, 20260524-base-rbac-permissoes.sql e checkout-visitante-admin-roles.sql.

begin;

alter table public.produtos
  add column if not exists catalogo_visivel boolean not null default true,
  add column if not exists loja_visivel boolean not null default true,
  add column if not exists catalogo_ordem integer,
  add column if not exists descricao_detalhada text not null default '',
  add column if not exists catalogo_destaque boolean not null default false;

create table if not exists public.pedido_notificacoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references public.pedidos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  cliente_email text not null default '',
  cliente_telefone text not null default '',
  titulo text not null,
  mensagem text not null,
  tipo text not null default 'status',
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pedido_notificacoes_user_created
on public.pedido_notificacoes (user_id, created_at desc);

create index if not exists idx_pedido_notificacoes_email_created
on public.pedido_notificacoes (lower(cliente_email), created_at desc);

create index if not exists idx_pedido_notificacoes_pedido
on public.pedido_notificacoes (pedido_id, created_at desc);

create index if not exists idx_admin_audit_logs_created
on public.admin_audit_logs (created_at desc);

create index if not exists idx_produtos_catalogo
on public.produtos (catalogo_visivel, loja_visivel, catalogo_ordem, nome);

alter table public.pedido_notificacoes enable row level security;
alter table public.admin_audit_logs enable row level security;

create or replace function public.is_developer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.admin_role = 'developer'
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_developer() from public;
grant execute on function public.is_developer() to authenticated;

drop policy if exists "pedido_notificacoes_select_own_or_admin" on public.pedido_notificacoes;
create policy "pedido_notificacoes_select_own_or_admin"
on public.pedido_notificacoes for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or lower(cliente_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "pedido_notificacoes_update_own_read" on public.pedido_notificacoes;
create policy "pedido_notificacoes_update_own_read"
on public.pedido_notificacoes for update
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or lower(cliente_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_admin()
  or user_id = auth.uid()
  or lower(cliente_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "pedido_notificacoes_admin_insert" on public.pedido_notificacoes;
create policy "pedido_notificacoes_admin_insert"
on public.pedido_notificacoes for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admin_audit_logs_select_developer" on public.admin_audit_logs;
create policy "admin_audit_logs_select_developer"
on public.admin_audit_logs for select
to authenticated
using (public.is_developer());

drop policy if exists "admin_audit_logs_insert_admin" on public.admin_audit_logs;
create policy "admin_audit_logs_insert_admin"
on public.admin_audit_logs for insert
to authenticated
with check (public.is_admin());

create or replace function public.admin_record_action(
  p_action text,
  p_entity_type text default '',
  p_entity_id text default '',
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  insert into public.admin_audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    payload
  ) values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    coalesce(nullif(btrim(p_action), ''), 'acao_admin'),
    coalesce(nullif(btrim(p_entity_type), ''), ''),
    coalesce(nullif(btrim(p_entity_id), ''), ''),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.admin_record_action(text, text, text, jsonb) from public;
grant execute on function public.admin_record_action(text, text, text, jsonb) to authenticated;

create or replace function public.admin_set_role(p_email text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text := lower(btrim(coalesce(p_role, '')));
  affected integer := 0;
begin
  if not public.is_developer() then
    raise exception 'Apenas developer pode alterar roles.';
  end if;

  if target_role not in ('developer', 'owner', 'staff', 'customer') then
    raise exception 'Role invalida.';
  end if;

  update public.profiles
  set admin_role = target_role,
      is_admin = target_role in ('developer', 'owner', 'staff'),
      updated_at = now()
  where lower(email) = lower(btrim(coalesce(p_email, '')));

  get diagnostics affected = row_count;

  perform public.admin_record_action(
    'admin_set_role',
    'profiles',
    lower(btrim(coalesce(p_email, ''))),
    jsonb_build_object('role', target_role, 'affected', affected)
  );

  return jsonb_build_object('email', lower(btrim(coalesce(p_email, ''))), 'role', target_role, 'affected', affected);
end;
$$;

revoke all on function public.admin_set_role(text, text) from public;
grant execute on function public.admin_set_role(text, text) to authenticated;

create or replace function public.admin_get_diagnostics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  product_count integer := 0;
  order_count integer := 0;
  notification_count integer := 0;
  audit_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  select count(*) into product_count from public.produtos;
  select count(*) into order_count from public.pedidos;
  select count(*) into notification_count from public.pedido_notificacoes;
  select count(*) into audit_count from public.admin_audit_logs;

  return jsonb_build_object(
    'checked_at', now(),
    'role', (
      select admin_role from public.profiles where id = auth.uid()
    ),
    'produtos', product_count,
    'pedidos', order_count,
    'pedido_notificacoes', notification_count,
    'admin_audit_logs', audit_count,
    'catalogo_fields', true,
    'realtime_hint', 'Ative Realtime para public.pedidos no painel do Supabase.'
  );
end;
$$;

revoke all on function public.admin_get_diagnostics() from public;
grant execute on function public.admin_get_diagnostics() to authenticated;

create or replace function public.create_order_notification(
  p_order_id uuid,
  p_title text,
  p_message text,
  p_type text default 'status'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.pedidos%rowtype;
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  select * into order_row
  from public.pedidos
  where id = p_order_id;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  insert into public.pedido_notificacoes (
    pedido_id,
    user_id,
    cliente_email,
    cliente_telefone,
    titulo,
    mensagem,
    tipo
  ) values (
    order_row.id,
    order_row.user_id,
    coalesce(order_row.cliente_email, ''),
    coalesce(order_row.cliente_telefone, ''),
    coalesce(nullif(btrim(p_title), ''), 'Atualizacao do pedido'),
    coalesce(nullif(btrim(p_message), ''), 'Seu pedido foi atualizado pela Monte Sinai.'),
    coalesce(nullif(btrim(p_type), ''), 'status')
  )
  returning id into new_id;

  perform public.admin_record_action(
    'cliente_notificado',
    'pedidos',
    order_row.id::text,
    jsonb_build_object('notification_id', new_id, 'tipo', p_type)
  );

  return new_id;
end;
$$;

revoke all on function public.create_order_notification(uuid, text, text, text) from public;
grant execute on function public.create_order_notification(uuid, text, text, text) to authenticated;

create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  title text;
  message text;
  kind text := 'status';
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is distinct from old.status then
    title := 'Pedido ' || coalesce(new.codigo, new.id::text) || ' atualizado';
    message := 'Status do pedido: ' || new.status || '.';
    kind := 'status';
  elsif new.pagamento_status is distinct from old.pagamento_status then
    title := 'Pagamento do pedido atualizado';
    message := 'Status de pagamento: ' || new.pagamento_status || '.';
    kind := 'pagamento';
  elsif new.confirmado is distinct from old.confirmado and new.confirmado = true then
    title := 'Pedido confirmado';
    message := 'A Monte Sinai confirmou o recebimento do seu pedido.';
    kind := 'confirmacao';
  else
    return new;
  end if;

  insert into public.pedido_notificacoes (
    pedido_id,
    user_id,
    cliente_email,
    cliente_telefone,
    titulo,
    mensagem,
    tipo
  ) values (
    new.id,
    new.user_id,
    coalesce(new.cliente_email, ''),
    coalesce(new.cliente_telefone, ''),
    title,
    message,
    kind
  );

  insert into public.admin_audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    payload
  ) values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'pedido_atualizado',
    'pedidos',
    new.id::text,
    jsonb_build_object(
      'codigo', new.codigo,
      'status_anterior', old.status,
      'status_atual', new.status,
      'pagamento_anterior', old.pagamento_status,
      'pagamento_atual', new.pagamento_status,
      'confirmado', new.confirmado
    )
  );

  return new;
end;
$$;

drop trigger if exists pedidos_notify_status_change on public.pedidos;
create trigger pedidos_notify_status_change
after update of status, pagamento_status, confirmado on public.pedidos
for each row execute function public.notify_order_status_change();

insert into public.profiles (id, email, nome, apelido, telefone, endereco, foto)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', ''),
  coalesce(u.raw_user_meta_data->>'nick', ''),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  coalesce(u.raw_user_meta_data->>'address', ''),
  coalesce(u.raw_user_meta_data->>'photo', u.raw_user_meta_data->>'avatar_url', '')
from auth.users u
where lower(u.email) in (
  'marcelol527319@gmail.com',
  'marcelol527319@gmail.co',
  'patriciapaula01234@gmail.com',
  'marcelo52731@gmail.com'
)
on conflict (id) do update
set email = excluded.email;

update public.profiles
set is_admin = true,
    admin_role = 'developer'
where lower(email) in ('marcelol527319@gmail.com', 'marcelol527319@gmail.co');

update public.profiles
set is_admin = true,
    admin_role = 'owner'
where lower(email) in ('patriciapaula01234@gmail.com', 'marcelo52731@gmail.com');

commit;
