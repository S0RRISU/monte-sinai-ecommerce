-- Corrige disponibilidade do Alcool Perfumado 1L na vitrine.
-- Causa: a variacao foi criada ativa, mas com estoque 0. No checkout, estoque 0 bloqueia compra.
-- Ajuste: estoque null significa sem controle de estoque por variacao, mantendo o produto ativo na loja.
-- Nao usa DELETE/TRUNCATE.

begin;

update public.produto_variacoes pv
set estoque = null,
    updated_at = now()
from public.produtos p
where p.id = pv.produto_id
  and p.nome ilike '%lcool Perfumado 1L%'
  and pv.nome ilike '%lcool Perfumado 1L%'
  and pv.ativo = true
  and pv.estoque = 0;

notify pgrst, 'reload schema';

commit;

-- Conferencia depois de rodar:
-- select id, nome, pode_comprar, indisponivel
-- from public.vw_catalogo_publico
-- where nome ilike '%Álcool Perfumado%';
--
-- select produto_id, nome, pode_comprar, indisponivel
-- from public.vw_catalogo_variacoes_publicas
-- where nome ilike '%Álcool Perfumado%';
