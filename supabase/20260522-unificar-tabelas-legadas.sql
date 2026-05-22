-- 2026-05-22: unificar dados de tabelas legadas nas tabelas oficiais.
-- Idempotente e seguro para repetir. Nao apaga tabelas nem dados.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists nome text,
  add column if not exists role text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists admin_role text not null default 'customer',
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  alter column admin_role set default 'customer',
  alter column is_admin set default false,
  alter column updated_at set default now();

do $$
declare
  source_table regclass := to_regclass('public.produto');
  target_table regclass := to_regclass('public.produtos');
  has_source_nome boolean;
  has_source_preco boolean;
  insert_cols text[] := array[]::text[];
  select_exprs text[] := array[]::text[];
  duplicate_guard text;
  sql text;
begin
  if source_table is null then
    raise notice 'Tabela legada public.produto nao existe. Nada para migrar.';
    return;
  end if;

  if target_table is null then
    raise notice 'Tabela oficial public.produtos nao existe. Execute o schema oficial antes desta migracao.';
    return;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produto' and column_name = 'nome'
  ) into has_source_nome;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produto' and column_name = 'preco'
  ) into has_source_preco;

  if not has_source_nome then
    raise notice 'public.produto nao tem coluna nome. Migracao de produtos legados ignorada.';
    return;
  end if;

  insert_cols := insert_cols || 'nome';
  select_exprs := select_exprs || 'nullif(btrim(s.nome::text), '''')';

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produtos' and column_name = 'preco'
  ) then
    insert_cols := insert_cols || 'preco';
    select_exprs := select_exprs || case when has_source_preco then 'coalesce(s.preco::numeric, 0)' else '0::numeric' end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produtos' and column_name = 'imagem'
  ) then
    insert_cols := insert_cols || 'imagem';
    select_exprs := select_exprs || case
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'produto' and column_name = 'imagem'
      ) then 'coalesce(s.imagem::text, '''')'
      else ''''''
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produtos' and column_name = 'categoria'
  ) then
    insert_cols := insert_cols || 'categoria';
    select_exprs := select_exprs || case
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'produto' and column_name = 'categoria'
      ) then 'coalesce(nullif(btrim(s.categoria::text), ''''), ''Produtos'')'
      else '''Produtos'''
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produtos' and column_name = 'descricao'
  ) then
    insert_cols := insert_cols || 'descricao';
    select_exprs := select_exprs || case
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'produto' and column_name = 'descricao'
      ) then 'coalesce(s.descricao::text, '''')'
      else ''''''
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produtos' and column_name = 'tipo'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produto' and column_name = 'tipo'
  ) then
    insert_cols := insert_cols || 'tipo';
    select_exprs := select_exprs || 'case when lower(btrim(s.tipo::text)) in (''produto'', ''kit'') then lower(btrim(s.tipo::text)) else ''produto'' end';
  end if;

  foreach sql in array array[
    'destaque',
    'oferta_ativa',
    'preco_promocional',
    'oferta_inicio',
    'oferta_fim',
    'kit_itens',
    'estoque',
    'estoque_minimo',
    'catalogo_visivel',
    'loja_visivel',
    'catalogo_ordem',
    'descricao_detalhada',
    'catalogo_destaque',
    'created_at',
    'updated_at'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'produtos' and column_name = sql
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'produto' and column_name = sql
    ) then
      insert_cols := insert_cols || sql;
      select_exprs := select_exprs || format('s.%I', sql);
    end if;
  end loop;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produtos' and column_name = 'ativo'
  ) then
    insert_cols := insert_cols || 'ativo';
    select_exprs := select_exprs || case
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'produto' and column_name = 'ativo'
      ) then 'coalesce(s.ativo, true)'
      else 'true'
    end;
  end if;

  duplicate_guard := 'lower(btrim(t.nome::text)) = lower(btrim(s.nome::text))';

  sql := format(
    'insert into public.produtos (%s)
     select %s
     from public.produto s
     where nullif(btrim(s.nome::text), '''') is not null
       and not exists (
         select 1 from public.produtos t where %s
       )',
    array_to_string(ARRAY(select format('%I', c) from unnest(insert_cols) c), ', '),
    array_to_string(select_exprs, ', '),
    duplicate_guard
  );

  execute sql;
exception
  when others then
    raise notice 'Migracao best-effort de public.produto para public.produtos ignorada: %', sqlerrm;
end $$;

do $$
declare
  has_legacy boolean := to_regclass('public.perfis_usuarios') is not null;
  id_expr text;
  email_expr text;
  role_expr text;
  sql text;
begin
  if not has_legacy then
    raise notice 'Tabela legada public.perfis_usuarios nao existe. Nada para migrar.';
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfis_usuarios' and column_name = 'user_id'
  ) then
    id_expr := 'pu.user_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfis_usuarios' and column_name = 'id'
  ) then
    id_expr := 'pu.id';
  else
    raise notice 'public.perfis_usuarios nao tem id nem user_id. Migracao de perfis legados ignorada.';
    return;
  end if;

  email_expr := case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'perfis_usuarios' and column_name = 'email'
    ) then 'pu.email::text'
    else 'null::text'
  end;

  role_expr := case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'perfis_usuarios' and column_name = 'role'
    ) then 'lower(btrim(coalesce(pu.role::text, ''customer'')))'
    else '''customer'''
  end;

  sql := format(
    'insert into public.profiles (id, email, nome, is_admin, admin_role, role)
     select
       legacy.id,
       legacy.email,
       coalesce(nullif(split_part(legacy.email, ''@'', 1), ''''), ''Usuario''),
       legacy.role in (''developer'', ''owner'', ''staff''),
       legacy.role,
       legacy.role
     from (
       select
         %1$s as id,
         %2$s as email,
         case
           when %3$s in (''developer'', ''owner'', ''staff'', ''customer'', ''client'') then %3$s
           when %3$s in (''admin'', ''manager'') then ''staff''
           else ''customer''
         end as role
       from public.perfis_usuarios pu
     ) legacy
     where legacy.id is not null
       and exists (select 1 from auth.users u where u.id = legacy.id)
     on conflict (id) do update
     set email = coalesce(public.profiles.email, excluded.email),
         is_admin = case
           when public.profiles.admin_role in (''developer'', ''owner'') then true
           when excluded.admin_role in (''developer'', ''owner'', ''staff'') then true
           else public.profiles.is_admin
         end,
         admin_role = case
           when public.profiles.admin_role = ''developer'' then public.profiles.admin_role
           when public.profiles.admin_role = ''owner'' and excluded.admin_role <> ''developer'' then public.profiles.admin_role
           when public.profiles.admin_role = ''staff'' and excluded.admin_role in (''customer'', ''client'') then public.profiles.admin_role
           else excluded.admin_role
         end,
         role = case
           when public.profiles.admin_role = ''developer'' then public.profiles.admin_role
           when public.profiles.admin_role = ''owner'' and excluded.admin_role <> ''developer'' then public.profiles.admin_role
           when public.profiles.admin_role = ''staff'' and excluded.admin_role in (''customer'', ''client'') then public.profiles.admin_role
           else excluded.admin_role
         end,
         updated_at = now()',
    id_expr,
    email_expr,
    role_expr
  );

  execute sql;
exception
  when others then
    raise notice 'Migracao best-effort de public.perfis_usuarios para public.profiles ignorada: %', sqlerrm;
end $$;

update public.profiles
set is_admin = true,
    admin_role = case
      when lower(email) = 'marcelol527319@gmail.com' then 'developer'
      when lower(email) in ('marcelo52731@gmail.com', 'patriciapaula01234@gmail.com') then 'owner'
      else admin_role
    end,
    role = case
      when lower(email) = 'marcelol527319@gmail.com' then 'developer'
      when lower(email) in ('marcelo52731@gmail.com', 'patriciapaula01234@gmail.com') then 'owner'
      else role
    end,
    updated_at = now()
where lower(email) in (
  'marcelol527319@gmail.com',
  'marcelo52731@gmail.com',
  'patriciapaula01234@gmail.com'
);

commit;
