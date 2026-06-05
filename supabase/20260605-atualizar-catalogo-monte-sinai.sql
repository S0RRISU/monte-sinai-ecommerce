-- Atualiza catalogo oficial Monte Sinai.
-- Gas e desinfetante permanecem como produtos com opcoes selecionaveis.
-- Corrige nomes/precos, reativa itens oficiais e esconde duplicidades antigas.
-- Nao usa DELETE/TRUNCATE.

begin;

do $$
begin
  if to_regclass('public.produtos') is null then
    raise exception 'Tabela public.produtos nao encontrada.';
  end if;
end $$;

create temp table catalogo_monte_sinai (
  nome text primary key,
  preco numeric(10, 2) not null,
  imagem text not null,
  categoria text not null,
  descricao text not null,
  ordem integer not null
) on commit drop;

create temp table catalogo_monte_sinai_aliases (
  nome text not null references catalogo_monte_sinai(nome),
  alias text not null
) on commit drop;

-- 32 cards de produto. Gas e desinfetante carregam as opcoes em produto_variacoes.
insert into catalogo_monte_sinai (nome, preco, imagem, categoria, descricao, ordem) values
  ('Água Mineral 20L', 15.00, 'assets/produtos/v2/agua-mineral-20l.png', 'Água', 'Galão de água mineral 20 litros para entrega rápida.', 10),
  ('Gás P13', 125.00, 'assets/produtos/v2/gas-p13.png', 'Gás', 'Botijão de gás P13 para uso doméstico. Escolha a marca antes de comprar.', 20),
  ('Álcool Perfumado 500ml', 5.00, 'assets/produtos/v2/alcool-perfumado.png', 'Limpeza', 'Álcool perfumado 500ml para limpeza diária.', 30),
  ('Amaciante 2L', 10.00, 'assets/produtos/v2/amaciante-2l.png', 'Lavanderia', 'Amaciante 2 litros para roupas macias e perfumadas.', 40),
  ('Cândida 2L Tradicional', 5.00, 'assets/produtos/v2/candida-2l.png', 'Limpeza', 'Cândida tradicional 2 litros para limpeza geral.', 50),
  ('Cândida Colorida 2L', 12.00, 'assets/produtos/v2/candida-colorida.png', 'Limpeza', 'Cândida colorida 2 litros para limpeza e cuidado com tecidos.', 60),
  ('Cloro 1L Tradicional', 7.50, 'assets/produtos/v2/cloro-1l.png', 'Limpeza', 'Cloro tradicional 1 litro para limpeza pesada.', 70),
  ('Cloro 2L Tradicional', 12.00, 'assets/produtos/v2/cloro-2l.png', 'Limpeza', 'Cloro tradicional 2 litros para limpeza pesada.', 80),
  ('Detergente 2L Neutro', 10.00, 'assets/produtos/v2/detergente-2l.png', 'Cozinha', 'Detergente neutro 2 litros para louças e limpeza da cozinha.', 90),
  ('Desinfetante 2L', 5.00, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros com fragrâncias selecionáveis.', 100),
  ('Limpa Alumínio 500ml', 5.00, 'assets/produtos/v2/limpa-aluminio.png', 'Cozinha', 'Limpa alumínio 500ml para brilho e limpeza de utensílios.', 110),
  ('Limpa Pedra 2L Uso Pesado', 12.00, 'assets/produtos/v2/limpa-pedra-2l.png', 'Limpeza', 'Limpa pedra 2 litros para limpeza pesada.', 120),
  ('Limpa Pedra 500ml Uso Diário', 5.00, 'assets/produtos/v2/limpa-pedra-500ml.png', 'Limpeza', 'Limpa pedra 500ml para limpeza diária.', 130),
  ('Sabão de Coco 2L', 12.00, 'assets/produtos/v2/sabao-coco.png', 'Lavanderia', 'Sabão de coco 2 litros para lavagem de roupas.', 140),
  ('Sabão Omo 2L', 22.00, 'assets/produtos/v2/sabao-omo.png', 'Lavanderia', 'Sabão Omo 2 litros para lavagem de roupas.', 150),
  ('Sabonete Líquido Dove 500ml', 6.00, 'assets/produtos/v2/sabonete-liquido.png', 'Higiene', 'Sabonete líquido Dove 500ml para higiene diária.', 160),
  ('Escova de Roupa', 5.00, 'assets/produtos/v2/escova-roupa.png', 'Utensílios', 'Escova de roupa para lavagem manual.', 170),
  ('Escova de Vaso com Pote', 8.50, 'assets/produtos/v2/escova-vaso.png', 'Utensílios', 'Escova de vaso com suporte para banheiro.', 180),
  ('Esponja de Aço', 4.90, 'assets/produtos/v2/esponja-aco.png', 'Utensílios', 'Esponja de aço para limpeza pesada de panelas e utensílios.', 190),
  ('Esponja de Louça', 2.00, 'assets/produtos/v2/esponja-louca.png', 'Utensílios', 'Esponja de louça para uso diário na cozinha.', 200),
  ('Esponjão', 9.90, 'assets/produtos/v2/esponjao.png', 'Utensílios', 'Esponjão para limpeza geral.', 210),
  ('Bombril', 3.00, 'assets/produtos/v2/bombril.png', 'Utensílios', 'Bombril para limpeza de panelas e utensílios.', 220),
  ('Pá', 7.50, 'assets/produtos/v2/pa.png', 'Utensílios', 'Pá para limpeza doméstica.', 230),
  ('Pasta de Brilho', 6.00, 'assets/produtos/v2/pasta-brilho.png', 'Utensílios', 'Pasta de brilho para limpeza e polimento.', 240),
  ('Pedra de Vaso Sanitário', 2.50, 'assets/produtos/v2/pedra-vaso.png', 'Utensílios', 'Pedra sanitária para vaso.', 250),
  ('Prendedor de Madeira', 3.20, 'assets/produtos/v2/prendedor-madeira.png', 'Utensílios', 'Prendedor de madeira para roupas.', 260),
  ('Prendedor Plástico', 3.60, 'assets/produtos/v2/prendedor-plastico.png', 'Utensílios', 'Prendedor plástico para roupas.', 270),
  ('Rodo Grande', 9.90, 'assets/produtos/v2/rodo-grande.png', 'Utensílios', 'Rodo grande para limpeza de pisos.', 280),
  ('Rodo Pequeno', 7.99, 'assets/produtos/v2/rodo-pequeno.png', 'Utensílios', 'Rodo pequeno para limpeza de pisos.', 290),
  ('Rodinho de Pia', 5.00, 'assets/produtos/v2/rodinho-pia.png', 'Utensílios', 'Rodinho de pia para organização e limpeza da cozinha.', 300),
  ('Saco de Lixo', 6.00, 'assets/produtos/v2/saco-lixo.png', 'Utensílios', 'Saco de lixo para descarte e organização.', 310),
  ('Vassoura', 12.00, 'assets/produtos/v2/vassoura.png', 'Utensílios', 'Vassoura para limpeza doméstica.', 320);

insert into catalogo_monte_sinai_aliases (nome, alias) values
  ('Água Mineral 20L', 'Água mineral 20L'),
  ('Água Mineral 20L', 'Galão de água mineral 20L'),
  ('Água Mineral 20L', 'Agua Mineral 20L'),
  ('Gás P13', 'Gás de cozinha'),
  ('Gás P13', 'Gas de cozinha'),
  ('Gás P13', 'Gás de cozinha P13'),
  ('Gás P13', 'Gas de cozinha P13'),
  ('Cândida 2L Tradicional', 'Candida 2L'),
  ('Cândida 2L Tradicional', 'Cândida 2L'),
  ('Cândida Colorida 2L', 'Candida Colorida'),
  ('Cloro 1L Tradicional', 'Cloro 1L'),
  ('Cloro 2L Tradicional', 'Cloro 2L'),
  ('Detergente 2L Neutro', 'Detergente 2L'),
  ('Limpa Pedra 2L Uso Pesado', 'Limpa Pedra 2L'),
  ('Limpa Pedra 500ml Uso Diário', 'Limpa Pedra 500ml'),
  ('Sabão Omo 2L', 'Sabão Líquido Omo 2L'),
  ('Sabonete Líquido Dove 500ml', 'Sabonete Líquido 500ml Dove'),
  ('Sabonete Líquido Dove 500ml', 'Sabonete Líquido'),
  ('Escova de Vaso com Pote', 'Escova de Vaso Sanitário com Pote'),
  ('Escova de Vaso com Pote', 'Escova de Vaso'),
  ('Pá', 'Pá de Lixo'),
  ('Pasta de Brilho', 'Pasta Brilho'),
  ('Pedra de Vaso Sanitário', 'Pedra de Vaso'),
  ('Pedra de Vaso Sanitário', 'Pedra Sanitaria'),
  ('Prendedor Plástico', 'Prendedor de Plástico'),
  ('Esponjão', 'Esponjao');

update public.produtos p
set preco = c.preco,
    imagem = c.imagem,
    categoria = c.categoria,
    descricao = c.descricao,
    ativo = true,
    loja_visivel = true,
    catalogo_visivel = true,
    catalogo_ordem = c.ordem,
    oferta_ativa = false,
    preco_promocional = null,
    oferta_inicio = null,
    oferta_fim = null,
    updated_at = now()
from catalogo_monte_sinai c
where lower(p.nome) = lower(c.nome);

with alias_match as (
  select distinct on (c.nome)
    c.nome,
    p.id
  from catalogo_monte_sinai c
  join catalogo_monte_sinai_aliases a on a.nome = c.nome
  join public.produtos p on lower(p.nome) = lower(a.alias)
  where not exists (
    select 1
    from public.produtos existing
    where existing.id <> p.id
      and lower(existing.nome) = lower(c.nome)
  )
  order by c.nome, p.updated_at desc nulls last
)
update public.produtos p
set nome = c.nome,
    preco = c.preco,
    imagem = c.imagem,
    categoria = c.categoria,
    descricao = c.descricao,
    ativo = true,
    loja_visivel = true,
    catalogo_visivel = true,
    catalogo_ordem = c.ordem,
    oferta_ativa = false,
    preco_promocional = null,
    oferta_inicio = null,
    oferta_fim = null,
    updated_at = now()
from alias_match am
join catalogo_monte_sinai c on c.nome = am.nome
where p.id = am.id;

insert into public.produtos (
  nome,
  preco,
  imagem,
  categoria,
  descricao,
  ativo,
  loja_visivel,
  catalogo_visivel,
  catalogo_ordem,
  oferta_ativa
)
select
  c.nome,
  c.preco,
  c.imagem,
  c.categoria,
  c.descricao,
  true,
  true,
  true,
  c.ordem,
  false
from catalogo_monte_sinai c
where not exists (
  select 1
  from public.produtos p
  where lower(p.nome) = lower(c.nome)
     or exists (
       select 1
       from catalogo_monte_sinai_aliases a
       where a.nome = c.nome
         and lower(p.nome) = lower(a.alias)
     )
);

-- Esconde duplicidades antigas. As opcoes ficam nas variacoes dos produtos principais.
update public.produtos p
set ativo = false,
    loja_visivel = false,
    catalogo_visivel = false,
    updated_at = now()
where lower(p.nome) in (
    lower('Gás de cozinha P13 Supergas'),
    lower('Gas de cozinha P13 Supergas'),
    lower('Gás de cozinha P13 Ultragas'),
    lower('Gas de cozinha P13 Ultragas'),
    lower('Desinfetante 2L Kaiake'),
    lower('Desinfetante 2L Kaiak'),
    lower('Desinfetante 2L Kaialque'),
    lower('Desinfetante 2L Violeta'),
    lower('Desinfetante 2L Eucalipto'),
    lower('Desinfetante 2L Pinho'),
    lower('Desinfetante 2L Jasmim'),
    lower('Desinfetante 2L Jasmin'),
    lower('Desinfetante 2L Talco'),
    lower('Desinfetante 2L Dama da Noite'),
    lower('Desinfetante 2L Palmolive')
  );

update public.produtos p
set ativo = false,
    loja_visivel = false,
    catalogo_visivel = false,
    updated_at = now()
from catalogo_monte_sinai_aliases a
where lower(p.nome) = lower(a.alias)
  and exists (
    select 1
    from public.produtos official
    where official.id <> p.id
      and lower(official.nome) = lower(a.nome)
  );

do $$
declare
  gas_id uuid;
  desinfetante_id uuid;
  gas_image text := 'assets/produtos/v2/gas-p13.png';
  desinfetante_image text := 'assets/produtos/v2/desinfetante-2l.png';
begin
  if to_regclass('public.produto_variacoes') is null then
    raise notice 'Tabela public.produto_variacoes nao existe. Produtos principais foram atualizados, mas opcoes nao foram criadas.';
    return;
  end if;

  select id into gas_id
  from public.produtos
  where lower(nome) = lower('Gás P13')
  order by updated_at desc nulls last
  limit 1;

  select id into desinfetante_id
  from public.produtos
  where lower(nome) = lower('Desinfetante 2L')
  order by updated_at desc nulls last
  limit 1;

  if gas_id is not null then
    update public.produto_variacoes
    set slug = 'ultragas',
        nome = 'Ultragas',
        sku = coalesce(nullif(sku, ''), 'gas-p13-ultragas'),
        preco = 135.00,
        imagem = gas_image,
        estoque = null,
        ativo = true,
        ordem = 20,
        updated_at = now()
    where produto_id = gas_id
      and lower(nome) in (lower('Ultragaz'), lower('Ultragas'))
      and not exists (
        select 1
        from public.produto_variacoes existing
        where existing.produto_id = gas_id
          and lower(existing.slug) = lower('ultragas')
          and existing.id <> public.produto_variacoes.id
      );

    insert into public.produto_variacoes (produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem)
    values
      (gas_id, 'Supergas', 'supergas', 'gas-p13-supergas', 125.00, null, true, gas_image, '{"tipo":"marca"}'::jsonb, 10),
      (gas_id, 'Ultragas', 'ultragas', 'gas-p13-ultragas', 135.00, null, true, gas_image, '{"tipo":"marca"}'::jsonb, 20)
    on conflict (produto_id, lower(slug)) do update
    set nome = excluded.nome,
        sku = excluded.sku,
        preco = excluded.preco,
        estoque = null,
        ativo = true,
        imagem = excluded.imagem,
        atributos = public.produto_variacoes.atributos || excluded.atributos,
        ordem = excluded.ordem,
        updated_at = now();

    update public.produto_variacoes pv
    set ativo = false,
        updated_at = now()
    where pv.produto_id = gas_id
      and lower(pv.slug) = lower('ultragaz');
  end if;

  if desinfetante_id is not null then
    update public.produto_variacoes
    set slug = 'kaiake',
        nome = 'Kaiake',
        sku = 'desinfetante-2l-kaiake',
        preco = 5.00,
        imagem = desinfetante_image,
        estoque = null,
        ativo = true,
        ordem = 10,
        updated_at = now()
    where produto_id = desinfetante_id
      and lower(nome) in (lower('Kaialque'), lower('Kaiak'), lower('Kaiake'))
      and not exists (
        select 1
        from public.produto_variacoes existing
        where existing.produto_id = desinfetante_id
          and lower(existing.slug) = lower('kaiake')
          and existing.id <> public.produto_variacoes.id
      );

    update public.produto_variacoes
    set slug = 'jasmim',
        nome = 'Jasmim',
        sku = 'desinfetante-2l-jasmim',
        preco = 5.00,
        imagem = desinfetante_image,
        estoque = null,
        ativo = true,
        ordem = 50,
        updated_at = now()
    where produto_id = desinfetante_id
      and lower(nome) in (lower('Jasmin'), lower('Jasmim'))
      and not exists (
        select 1
        from public.produto_variacoes existing
        where existing.produto_id = desinfetante_id
          and lower(existing.slug) = lower('jasmim')
          and existing.id <> public.produto_variacoes.id
      );

    insert into public.produto_variacoes (produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem)
    values
      (desinfetante_id, 'Kaiake', 'kaiake', 'desinfetante-2l-kaiake', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 10),
      (desinfetante_id, 'Violeta', 'violeta', 'desinfetante-2l-violeta', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 20),
      (desinfetante_id, 'Eucalipto', 'eucalipto', 'desinfetante-2l-eucalipto', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 30),
      (desinfetante_id, 'Pinho', 'pinho', 'desinfetante-2l-pinho', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 40),
      (desinfetante_id, 'Jasmim', 'jasmim', 'desinfetante-2l-jasmim', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 50),
      (desinfetante_id, 'Talco', 'talco', 'desinfetante-2l-talco', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 60),
      (desinfetante_id, 'Dama da Noite', 'dama-da-noite', 'desinfetante-2l-dama-da-noite', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 70),
      (desinfetante_id, 'Palmolive', 'palmolive', 'desinfetante-2l-palmolive', 5.00, null, true, desinfetante_image, '{"tipo":"fragrancia"}'::jsonb, 80)
    on conflict (produto_id, lower(slug)) do update
    set nome = excluded.nome,
        sku = excluded.sku,
        preco = excluded.preco,
        estoque = null,
        ativo = true,
        imagem = excluded.imagem,
        atributos = public.produto_variacoes.atributos || excluded.atributos,
        ordem = excluded.ordem,
        updated_at = now();

    update public.produto_variacoes pv
    set ativo = false,
        updated_at = now()
    where pv.produto_id = desinfetante_id
      and lower(pv.slug) in (lower('kaialque'), lower('kaiak'), lower('jasmin'))
      and lower(pv.slug) not in (lower('kaiake'), lower('jasmim'));
  end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- Conferencia depois de rodar:
-- select nome, preco, categoria, pode_comprar, indisponivel
-- from public.vw_catalogo_publico
-- order by catalogo_ordem nulls last, nome;
--
-- select p.nome as produto, pv.nome as opcao, pv.preco
-- from public.vw_catalogo_variacoes_publicas pv
-- join public.produtos p on p.id = pv.produto_id
-- where p.nome in ('Gás P13', 'Desinfetante 2L')
-- order by p.nome, pv.ordem, pv.nome;
