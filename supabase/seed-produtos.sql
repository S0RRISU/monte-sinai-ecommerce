-- Popula a tabela de produtos da Monte Sinai.
-- Execute este arquivo no SQL Editor do Supabase.
-- Usa somente public.produtos. public.produto e legado e nao deve ser usado pelo site.
-- Para evitar duplicados, substitui somente produtos com os mesmos nomes desta lista.

begin;

create temp table seed_produtos (
  nome text not null,
  preco numeric(10, 2) not null,
  imagem text not null default '',
  categoria text not null,
  descricao text not null
) on commit drop;

insert into seed_produtos (nome, preco, imagem, categoria, descricao) values
  ('Água mineral 20L', 15, 'assets/produtos/v2/agua-mineral-20l.png', 'Água', 'Galão de água mineral 20 litros para entrega rápida.'),
  ('Gás de cozinha P13 Supergas', 125, 'assets/produtos/v2/gas-p13.png', 'Gás', 'Botijão de gás P13 Supergas para uso doméstico.'),
  ('Gás de cozinha P13 Ultragas', 135, 'assets/produtos/v2/gas-p13.png', 'Gás', 'Botijão de gás P13 Ultragas para uso doméstico.'),
  ('Álcool Perfumado 500ml', 5, 'assets/produtos/v2/alcool-perfumado.png', 'Limpeza', 'Álcool perfumado 500ml para limpeza diária.'),
  ('Amaciante 2L', 10, 'assets/produtos/v2/amaciante-2l.png', 'Lavanderia', 'Amaciante 2 litros para roupas macias e perfumadas.'),
  ('Cândida 2L Tradicional', 5, 'assets/produtos/v2/candida-2l.png', 'Limpeza', 'Cândida tradicional 2 litros para limpeza geral.'),
  ('Cândida Colorida 2L', 12, 'assets/produtos/v2/candida-colorida.png', 'Limpeza', 'Cândida colorida 2 litros para limpeza e cuidado com tecidos.'),
  ('Cloro 1L Tradicional', 7.50, 'assets/produtos/v2/cloro-1l.png', 'Limpeza', 'Cloro tradicional 1 litro para limpeza pesada.'),
  ('Cloro 2L Tradicional', 12, 'assets/produtos/v2/cloro-2l.png', 'Limpeza', 'Cloro tradicional 2 litros para limpeza pesada.'),
  ('Detergente 2L Neutro', 10, 'assets/produtos/v2/detergente-2l.png', 'Cozinha', 'Detergente neutro 2 litros para louças e limpeza da cozinha.'),
  ('Desinfetante 2L Kaialque', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Kaialque.'),
  ('Desinfetante 2L Violeta', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Violeta.'),
  ('Desinfetante 2L Eucalipto', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Eucalipto.'),
  ('Desinfetante 2L Pinho', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Pinho.'),
  ('Desinfetante 2L Jasmim', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Jasmim.'),
  ('Desinfetante 2L Talco', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Talco.'),
  ('Desinfetante 2L Dama da Noite', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Dama da Noite.'),
  ('Desinfetante 2L Palmolive', 5, 'assets/produtos/v2/desinfetante-2l.png', 'Limpeza', 'Desinfetante 2 litros fragrância Palmolive.'),
  ('Limpa Alumínio 500ml', 5, 'assets/produtos/v2/limpa-aluminio.png', 'Cozinha', 'Limpa alumínio 500ml para brilho e limpeza de utensílios.'),
  ('Limpa Pedra 2L Uso Pesado', 12, 'assets/produtos/v2/limpa-pedra-2l.png', 'Limpeza', 'Limpa pedra 2 litros para limpeza pesada.'),
  ('Limpa Pedra 500ml Uso Diário', 5, 'assets/produtos/v2/limpa-pedra-500ml.png', 'Limpeza', 'Limpa pedra 500ml para limpeza diária.'),
  ('Sabão de Coco 2L', 12, 'assets/produtos/v2/sabao-coco.png', 'Lavanderia', 'Sabão de coco 2 litros para lavagem de roupas.'),
  ('Sabão Omo 2L', 22, 'assets/produtos/v2/sabao-omo.png', 'Lavanderia', 'Sabão Omo 2 litros para lavagem de roupas.'),
  ('Sabonete Líquido 500ml Dove', 6, 'assets/produtos/v2/sabonete-liquido.png', 'Higiene', 'Sabonete líquido 500ml Dove para higiene diária.'),
  ('Escova de Roupa', 5, 'assets/produtos/v2/escova-roupa.png', 'Lavanderia', 'Escova de roupa para lavagem manual.'),
  ('Escova de Vaso Sanitário com Pote', 8.50, 'assets/produtos/v2/escova-vaso.png', 'Banheiro', 'Escova de vaso sanitário com suporte para banheiro.'),
  ('Esponja de Aço', 4.90, 'assets/produtos/v2/esponja-aco.png', 'Cozinha', 'Esponja de aço para limpeza pesada de panelas e utensílios.'),
  ('Esponja de Louça', 2, 'assets/produtos/v2/esponja-louca.png', 'Cozinha', 'Esponja de louça para uso diário na cozinha.'),
  ('Esponjão', 9.90, 'assets/produtos/v2/esponjao.png', 'Utensílios', 'Esponjão para limpeza geral.'),
  ('Bombril', 3, 'assets/produtos/v2/bombril.png', 'Cozinha', 'Bombril para limpeza de panelas e utensílios.'),
  ('Pá', 7.50, 'assets/produtos/v2/pa.png', 'Utensílios', 'Pá para limpeza doméstica.'),
  ('Pasta de Brilho', 6, 'assets/produtos/v2/pasta-brilho.png', 'Cozinha', 'Pasta de brilho para limpeza e polimento.'),
  ('Pedra de Vaso', 2.50, 'assets/produtos/v2/pedra-vaso.png', 'Banheiro', 'Pedra sanitária para vaso.'),
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

  execute format(
    'delete from %s where nome in (select nome from seed_produtos)',
    target_table
  );

  execute format(
    'insert into %s (nome, preco, imagem, categoria, descricao)
     select nome, preco, imagem, categoria, descricao
     from seed_produtos',
    target_table
  );

  raise notice 'Produtos inseridos/atualizados em %.', target_table;
end $$;

commit;
