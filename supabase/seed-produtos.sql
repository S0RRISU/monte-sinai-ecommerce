-- Popula a tabela de produtos da Monte Sinai.
-- Execute este arquivo no SQL Editor do Supabase.
-- Usa public.produtos e, se existir, public.produto_variacoes.
-- public.produto e legado e nao deve ser usado pelo site.
-- Nao apaga produtos existentes. Atualiza produtos com o mesmo nome e insere os ausentes.

begin;

create temp table seed_produtos (
  nome text not null,
  preco numeric(10, 2) not null,
  imagem text not null default '',
  categoria text not null,
  descricao text not null
) on commit drop;

insert into seed_produtos (nome, preco, imagem, categoria, descricao) values
  ('Água Mineral 20L', 15, 'assets/produtos/v2/agua-mineral-20l.png', 'Água', 'Galão de água mineral 20 litros para entrega rápida.'),
  ('Gás P13', 125, 'assets/produtos/v2/gas-p13.png', 'Gás', 'Botijão de gás P13 para uso doméstico. Escolha a marca antes de comprar.'),
  ('Álcool Perfumado 500ml', 5, 'assets/produtos/v2/alcool-perfumado.png', 'Limpeza', 'Álcool perfumado 500ml para limpeza diária.'),
  ('Amaciante 2L', 10, 'assets/produtos/v2/amaciante-2l.png', 'Lavanderia', 'Amaciante 2 litros para roupas macias e perfumadas.'),
  ('Cândida 2L Tradicional', 5, 'assets/produtos/v2/candida-2l.png', 'Limpeza', 'Cândida tradicional 2 litros para limpeza geral.'),
  ('Cândida Colorida 2L', 12, 'assets/produtos/v2/candida-colorida.png', 'Limpeza', 'Cândida colorida 2 litros para limpeza e cuidado com tecidos.'),
  ('Cloro 1L Tradicional', 7.50, 'assets/produtos/v2/cloro-1l.png', 'Limpeza', 'Cloro tradicional 1 litro para limpeza pesada.'),
  ('Cloro 2L Tradicional', 12, 'assets/produtos/v2/cloro-2l.png', 'Limpeza', 'Cloro tradicional 2 litros para limpeza pesada.'),
  ('Detergente 2L Neutro', 10, 'assets/produtos/v2/detergente-2l.png', 'Cozinha', 'Detergente neutro 2 litros para louças e limpeza da cozinha.'),
  ('Desinfetante 2L', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros com fragrâncias selecionáveis.'),
  ('Limpa Alumínio 500ml', 5, 'assets/produtos/v2/limpa-aluminio.png', 'Cozinha', 'Limpa alumínio 500ml para brilho e limpeza de utensílios.'),
  ('Limpa Pedra 2L Uso Pesado', 12, 'assets/produtos/v2/limpa-pedra-2l.png', 'Limpeza', 'Limpa pedra 2 litros para limpeza pesada.'),
  ('Limpa Pedra 500ml Uso Diário', 5, 'assets/produtos/v2/limpa-pedra-500ml.png', 'Limpeza', 'Limpa pedra 500ml para limpeza diária.'),
  ('Sabão de Coco 2L', 12, 'assets/produtos/v2/sabao-coco.png', 'Lavanderia', 'Sabão de coco 2 litros para lavagem de roupas.'),
  ('Sabão Omo 2L', 22, 'assets/produtos/v2/sabao-omo.png', 'Lavanderia', 'Sabão Omo 2 litros para lavagem de roupas.'),
  ('Sabonete Líquido Dove 500ml', 6, 'assets/produtos/v2/sabonete-liquido.png', 'Higiene', 'Sabonete líquido Dove 500ml para higiene diária.'),
  ('Escova de Roupa', 5, 'assets/produtos/v2/escova-roupa.png', 'Lavanderia', 'Escova de roupa para lavagem manual.'),
  ('Escova de Vaso com Pote', 8.50, 'assets/produtos/v2/escova-vaso.png', 'Utensílios', 'Escova de vaso com suporte para banheiro.'),
  ('Esponja de Aço', 4.90, 'assets/produtos/v2/esponja-aco.png', 'Cozinha', 'Esponja de aço para limpeza pesada de panelas e utensílios.'),
  ('Esponja de Louça', 2, 'assets/produtos/v2/esponja-louca.png', 'Cozinha', 'Esponja de louça para uso diário na cozinha.'),
  ('Esponjão', 9.90, 'assets/produtos/v2/esponjao.png', 'Utensílios', 'Esponjão para limpeza geral.'),
  ('Bombril', 3, 'assets/produtos/v2/bombril.png', 'Cozinha', 'Bombril para limpeza de panelas e utensílios.'),
  ('Pá', 7.50, 'assets/produtos/v2/pa.png', 'Utensílios', 'Pá para limpeza doméstica.'),
  ('Pasta de Brilho', 6, 'assets/produtos/v2/pasta-brilho.png', 'Cozinha', 'Pasta de brilho para limpeza e polimento.'),
  ('Pedra de Vaso Sanitário', 2.50, 'assets/produtos/v2/pedra-vaso.png', 'Utensílios', 'Pedra sanitária para vaso.'),
  ('Prendedor de Madeira', 3.20, 'assets/produtos/v2/prendedor-madeira.png', 'Organização', 'Prendedor de madeira para roupas.'),
  ('Prendedor Plástico', 3.60, 'assets/produtos/v2/prendedor-plastico.png', 'Organização', 'Prendedor plástico para roupas.'),
  ('Rodo Grande', 9.90, 'assets/produtos/v2/rodo-grande.png', 'Utensílios', 'Rodo grande para limpeza de pisos.'),
  ('Rodo Pequeno', 7.99, 'assets/produtos/v2/rodo-pequeno.png', 'Utensílios', 'Rodo pequeno para limpeza de pisos.'),
  ('Rodinho de Pia', 5, 'assets/produtos/v2/rodinho-pia.png', 'Cozinha', 'Rodinho de pia para organização e limpeza da cozinha.'),
  ('Saco de Lixo', 6, 'assets/produtos/v2/saco-lixo.png', 'Organização', 'Saco de lixo para descarte e organização.'),
  ('Vassoura', 12, 'assets/produtos/v2/vassoura.png', 'Utensílios', 'Vassoura para limpeza doméstica.');

do $$
declare
  target_table regclass;
begin
  target_table := to_regclass('public.produtos');

  if target_table is null then
    raise exception 'Nao encontrei public.produtos. Crie a tabela oficial antes de executar este seed.';
  end if;

  create unique index if not exists produtos_nome_unique
    on public.produtos (nome);

  insert into public.produtos (nome, preco, imagem, categoria, descricao)
  select nome, preco, imagem, categoria, descricao
  from seed_produtos
  on conflict (nome) do update
  set preco = excluded.preco,
      imagem = coalesce(nullif(excluded.imagem, ''), public.produtos.imagem),
      categoria = coalesce(nullif(excluded.categoria, ''), public.produtos.categoria),
      descricao = coalesce(nullif(excluded.descricao, ''), public.produtos.descricao);

  raise notice 'Produtos inseridos/atualizados em public.produtos sem apagar registros existentes.';
end $$;

do $$
declare
  gas_id uuid;
  desinfetante_id uuid;
begin
  if to_regclass('public.produto_variacoes') is null then
    raise notice 'public.produto_variacoes nao existe; opcoes de gas/desinfetante nao foram criadas.';
    return;
  end if;

  select id into gas_id
  from public.produtos
  where lower(nome) = lower('Gás P13')
  limit 1;

  if gas_id is not null then
    insert into public.produto_variacoes (produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem)
    values
      (gas_id, 'Supergas', 'supergas', 'gas-p13-supergas', 125, null, true, 'assets/produtos/v2/gas-p13.png', '{"tipo":"marca"}'::jsonb, 10),
      (gas_id, 'Ultragas', 'ultragas', 'gas-p13-ultragas', 135, null, true, 'assets/produtos/v2/gas-p13.png', '{"tipo":"marca"}'::jsonb, 20)
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
  end if;

  select id into desinfetante_id
  from public.produtos
  where lower(nome) = lower('Desinfetante 2L')
  limit 1;

  if desinfetante_id is not null then
    insert into public.produto_variacoes (produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem)
    values
      (desinfetante_id, 'Kaiake', 'kaiake', 'desinfetante-2l-kaiake', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 10),
      (desinfetante_id, 'Violeta', 'violeta', 'desinfetante-2l-violeta', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 20),
      (desinfetante_id, 'Eucalipto', 'eucalipto', 'desinfetante-2l-eucalipto', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 30),
      (desinfetante_id, 'Pinho', 'pinho', 'desinfetante-2l-pinho', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 40),
      (desinfetante_id, 'Jasmim', 'jasmim', 'desinfetante-2l-jasmim', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 50),
      (desinfetante_id, 'Talco', 'talco', 'desinfetante-2l-talco', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 60),
      (desinfetante_id, 'Dama da Noite', 'dama-da-noite', 'desinfetante-2l-dama-da-noite', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 70),
      (desinfetante_id, 'Palmolive', 'palmolive', 'desinfetante-2l-palmolive', 5, null, true, 'assets/produtos/v2/desinfetante-2l.png', '{"tipo":"fragrancia"}'::jsonb, 80)
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
  end if;
end $$;

commit;
