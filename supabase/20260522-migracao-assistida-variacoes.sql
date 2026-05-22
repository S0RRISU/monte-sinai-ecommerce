-- 2026-05-22: migracao assistida para P13 e Desinfetante 2L.
-- Nao executar automaticamente. Leia o checklist e rode manualmente no SQL Editor depois de
-- executar supabase/20260522-produto-variacoes.sql.
--
-- Checklist manual:
-- 1. Confirme que public.produto_variacoes existe.
-- 2. Confirme que os produtos antigos abaixo existem em public.produtos, se eles forem a origem dos dados.
-- 3. Execute este SQL em uma janela de manutencao curta.
-- 4. Revise o catalogo publico e o painel admin.
-- 5. Se estiver tudo correto, mantenha os produtos antigos desativados. Este SQL nao apaga registros.

begin;

do $$
begin
  if to_regclass('public.produto_variacoes') is null then
    raise exception 'Execute supabase/20260522-produto-variacoes.sql antes desta migracao assistida.';
  end if;
end $$;

do $$
declare
  gas_id uuid;
  gas_image text := 'assets/produtos/v2/gas-p13.png';
  gas_category text := 'Gas';
  gas_description text := 'Botijao de gas P13 para uso domestico.';
begin
  select id, coalesce(nullif(imagem, ''), gas_image), coalesce(nullif(categoria, ''), gas_category)
    into gas_id, gas_image, gas_category
  from public.produtos
  where lower(nome) in (lower('Gas de cozinha P13'), lower('Gás de cozinha P13'))
  order by updated_at desc nulls last
  limit 1;

  if gas_id is null then
    select coalesce(nullif(imagem, ''), gas_image), coalesce(nullif(categoria, ''), gas_category), coalesce(nullif(descricao, ''), gas_description)
      into gas_image, gas_category, gas_description
    from public.produtos
    where lower(nome) in (lower('Gas de cozinha P13 Supergas'), lower('Gás de cozinha P13 Supergas'), lower('Gas de cozinha P13 - Supergas'), lower('Gás de cozinha P13 - Supergas'))
       or lower(nome) in (lower('Gas de cozinha P13 Ultragas'), lower('Gás de cozinha P13 Ultragas'), lower('Gas de cozinha P13 - Ultragas'), lower('Gás de cozinha P13 - Ultragas'))
    order by updated_at desc nulls last
    limit 1;

    insert into public.produtos (nome, preco, imagem, categoria, descricao, ativo)
    values ('Gas de cozinha P13', 125, gas_image, gas_category, gas_description, true)
    returning id into gas_id;
  end if;

  insert into public.produto_variacoes (produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem)
  values
    (gas_id, 'Supergas', 'supergas', 'gas-p13-supergas', 125, null, true, gas_image, '{"tipo":"marca"}'::jsonb, 10),
    (gas_id, 'Ultragas', 'ultragas', 'gas-p13-ultragas', 135, null, true, gas_image, '{"tipo":"marca"}'::jsonb, 20)
  on conflict (produto_id, lower(slug)) do update
  set nome = excluded.nome,
      sku = excluded.sku,
      preco = excluded.preco,
      imagem = coalesce(nullif(excluded.imagem, ''), public.produto_variacoes.imagem),
      atributos = public.produto_variacoes.atributos || excluded.atributos,
      ordem = excluded.ordem,
      ativo = true,
      updated_at = now();

  update public.produtos
  set ativo = false,
      updated_at = now()
  where id <> gas_id
    and lower(nome) in (
      lower('Gas de cozinha P13 Supergas'),
      lower('Gás de cozinha P13 Supergas'),
      lower('Gas de cozinha P13 - Supergas'),
      lower('Gás de cozinha P13 - Supergas'),
      lower('Gas de cozinha P13 Ultragas'),
      lower('Gás de cozinha P13 Ultragas'),
      lower('Gas de cozinha P13 - Ultragas'),
      lower('Gás de cozinha P13 - Ultragas')
    );
end $$;

do $$
declare
  desinfetante_id uuid;
  desinfetante_image text := 'assets/produtos/v2/desinfetante-2l.png';
  desinfetante_category text := 'Limpeza';
  desinfetante_description text := 'Desinfetante 2 litros com fragrancias para limpeza diaria.';
begin
  select id, coalesce(nullif(imagem, ''), desinfetante_image), coalesce(nullif(categoria, ''), desinfetante_category)
    into desinfetante_id, desinfetante_image, desinfetante_category
  from public.produtos
  where lower(nome) = lower('Desinfetante 2L')
  order by updated_at desc nulls last
  limit 1;

  if desinfetante_id is null then
    select coalesce(nullif(imagem, ''), desinfetante_image), coalesce(nullif(categoria, ''), desinfetante_category), coalesce(nullif(descricao, ''), desinfetante_description)
      into desinfetante_image, desinfetante_category, desinfetante_description
    from public.produtos
    where lower(nome) in (
      lower('Desinfetante 2L Eucalipto'),
      lower('Desinfetante 2L Pinho'),
      lower('Desinfetante 2L Talco'),
      lower('Desinfetante 2L Violeta'),
      lower('Desinfetante 2L Dama da Noite'),
      lower('Desinfetante 2L Kaialque'),
      lower('Desinfetante 2L Palmolive'),
      lower('Desinfetante 2L Jasmin'),
      lower('Desinfetante 2L Jasmim')
    )
    order by updated_at desc nulls last
    limit 1;

    insert into public.produtos (nome, preco, imagem, categoria, descricao, ativo)
    values ('Desinfetante 2L', 5, desinfetante_image, desinfetante_category, desinfetante_description, true)
    returning id into desinfetante_id;
  end if;

  insert into public.produto_variacoes (produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem)
  values
    (desinfetante_id, 'Eucalipto', 'eucalipto', 'desinfetante-2l-eucalipto', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 10),
    (desinfetante_id, 'Pinho', 'pinho', 'desinfetante-2l-pinho', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 20),
    (desinfetante_id, 'Talco', 'talco', 'desinfetante-2l-talco', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 30),
    (desinfetante_id, 'Violeta', 'violeta', 'desinfetante-2l-violeta', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 40),
    (desinfetante_id, 'Dama da Noite', 'dama-da-noite', 'desinfetante-2l-dama-da-noite', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 50),
    (desinfetante_id, 'Kaialque', 'kaialque', 'desinfetante-2l-kaialque', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 60),
    (desinfetante_id, 'Palmolive', 'palmolive', 'desinfetante-2l-palmolive', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 70),
    (desinfetante_id, 'Jasmin', 'jasmin', 'desinfetante-2l-jasmin', 5, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 80)
  on conflict (produto_id, lower(slug)) do update
  set nome = excluded.nome,
      sku = excluded.sku,
      preco = excluded.preco,
      imagem = coalesce(nullif(excluded.imagem, ''), public.produto_variacoes.imagem),
      atributos = public.produto_variacoes.atributos || excluded.atributos,
      ordem = excluded.ordem,
      ativo = true,
      updated_at = now();

  update public.produtos
  set ativo = false,
      updated_at = now()
  where id <> desinfetante_id
    and lower(nome) in (
      lower('Desinfetante 2L Eucalipto'),
      lower('Desinfetante 2L Pinho'),
      lower('Desinfetante 2L Talco'),
      lower('Desinfetante 2L Violeta'),
      lower('Desinfetante 2L Dama da Noite'),
      lower('Desinfetante 2L Kaialque'),
      lower('Desinfetante 2L Palmolive'),
      lower('Desinfetante 2L Jasmin'),
      lower('Desinfetante 2L Jasmim')
    );
end $$;

-- Reativa somente os produtos principais quando ja houver variacoes ativas.
-- Mantem os produtos antigos com marca/fragrancia no nome desativados.
update public.produtos p
set ativo = true,
    updated_at = now()
where lower(p.nome) in (
    lower('Gas de cozinha P13'),
    lower('Gás de cozinha P13'),
    lower('Desinfetante 2L')
  )
  and p.ativo is distinct from true
  and exists (
    select 1
    from public.produto_variacoes pv
    where pv.produto_id = p.id
      and pv.ativo = true
  );

commit;
