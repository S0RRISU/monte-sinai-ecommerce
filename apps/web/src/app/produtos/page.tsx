import { ChevronDown, Filter, Heart, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { CategoryIcon } from '@/components/store/category-icon';
import { ProductCard } from '@/components/store/product-card';
import { ProductsFavoritesFilter } from '@/components/store/products-favorites-filter';
import { ProductsMenuController } from '@/components/store/products-menu-controller';
import { StoreShell } from '@/components/store/store-shell';
import { visibleStoreCategories } from '@/lib/site-config';
import type { Product } from '@/lib/store-data';
import { getStorefrontConfig, searchStorefrontProducts, storefrontProductsByCategory } from '@/lib/storefront-data';

type ProductSort = 'relevance' | 'price-asc' | 'price-desc' | 'name' | 'offers';

type ProductsPageProps = {
  searchParams: Promise<{ categoria?: string; q?: string; ordenar?: string }>;
};

const sortOptions: Array<{ label: string; value: ProductSort; helper: string }> = [
  { label: 'Relevância', value: 'relevance', helper: 'Melhores resultados primeiro' },
  { label: 'Menor preço', value: 'price-asc', helper: 'Do menor para o maior' },
  { label: 'Maior preço', value: 'price-desc', helper: 'Do maior para o menor' },
  { label: 'Nome A-Z', value: 'name', helper: 'Organização alfabética' },
  { label: 'Ofertas', value: 'offers', helper: 'Promoções e descontos primeiro' }
];

function isProductSort(value?: string): value is ProductSort {
  return Boolean(value && sortOptions.some((option) => option.value === value));
}

function sortProducts(products: Product[], sort: ProductSort) {
  const sorted = [...products];
  if (sort === 'price-asc') return sorted.sort((first, second) => first.price - second.price);
  if (sort === 'price-desc') return sorted.sort((first, second) => second.price - first.price);
  if (sort === 'name') return sorted.sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));
  if (sort === 'offers') {
    return sorted.sort((first, second) => {
      const secondOffer = Number(Boolean(second.offer || second.oldPrice));
      const firstOffer = Number(Boolean(first.offer || first.oldPrice));
      return secondOffer - firstOffer || first.price - second.price;
    });
  }
  return sorted;
}

function productsUrl(params: { categoria?: string; q?: string; ordenar?: ProductSort }) {
  const search = new URLSearchParams();
  if (params.categoria && params.categoria !== 'todos') search.set('categoria', params.categoria);
  if (params.q) search.set('q', params.q);
  if (params.ordenar && params.ordenar !== 'relevance') search.set('ordenar', params.ordenar);
  const query = search.toString();
  return query ? `/produtos?${query}` : '/produtos';
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const activeCategory = params.categoria || 'todos';
  const query = (params.q || '').trim();
  const activeSort = isProductSort(params.ordenar) ? params.ordenar : 'relevance';
  const [products, config] = await Promise.all([storefrontProductsByCategory(activeCategory), getStorefrontConfig()]);
  const searchResults = searchStorefrontProducts(products, query);
  const filteredProducts = sortProducts(searchResults, activeSort);
  const categories = visibleStoreCategories(config);
  const activeLabel = categories.find((category) => category.id === activeCategory)?.label || 'Todos os produtos';
  const activeSortLabel = sortOptions.find((option) => option.value === activeSort)?.label || 'Relevância';
  const title = query ? `Busca por "${query}"` : activeLabel;

  return (
    <StoreShell>
      <main className="store-main products-page">
        <section className="products-heading">
          <div>
            <span>Produtos Monte Sinai</span>
            <h1>{title}</h1>
            <p>
              {query
                ? `${filteredProducts.length} resultado(s). A busca tenta entender erros de digitação e nomes parecidos.`
                : 'Escolha o produto, confira os detalhes e finalize com a loja.'}
            </p>
          </div>
          <div className="products-controls">
            <ProductsMenuController />
            <details className="products-menu">
              <summary>
                <Filter className="size-4" />
                Categorias
                <ChevronDown className="size-4 products-menu-chevron" />
              </summary>
              <div className="products-menu-panel">
                <Link className={activeCategory === 'todos' ? 'is-active' : undefined} href={productsUrl({ q: query, ordenar: activeSort })}>
                  Todos
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    className={activeCategory === category.id ? 'is-active' : undefined}
                    href={productsUrl({ categoria: category.id, q: query, ordenar: activeSort })}
                  >
                    <CategoryIcon category={category.id} />
                    {category.label}
                  </Link>
                ))}
              </div>
            </details>

            <details className="products-menu">
              <summary>
                <SlidersHorizontal className="size-4" />
                Organizar: {activeSortLabel}
                <ChevronDown className="size-4 products-menu-chevron" />
              </summary>
              <div className="products-menu-panel products-sort-panel">
                {sortOptions.map((option) => (
                  <Link
                    key={option.value}
                    className={activeSort === option.value ? 'is-active' : undefined}
                    href={productsUrl({ categoria: activeCategory, q: query, ordenar: option.value })}
                  >
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.helper}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </details>

            <ProductsFavoritesFilter />
          </div>
        </section>

        <section className="products-active-row" aria-label="Filtros ativos">
          <span>{activeLabel}</span>
          <span>{activeSortLabel}</span>
          {query ? <span>Busca inteligente: {query}</span> : null}
          <span className="products-favorite-hint">
            <Heart className="size-3" />
            Favoritos ficam salvos neste aparelho
          </span>
        </section>

        <section className="products-grid" aria-label="Produtos da loja">
          {filteredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
          {!filteredProducts.length ? (
            <article className="empty-panel products-empty-panel">
              <strong>Nenhum produto encontrado</strong>
              <p>Revise a busca ou veja todos os produtos da loja.</p>
              <Link href="/produtos">Ver todos os produtos</Link>
            </article>
          ) : null}
          <article className="empty-panel products-favorites-empty">
            <strong>Nenhum favorito marcado</strong>
            <p>Toque no coração dos produtos para montar sua lista rápida neste aparelho.</p>
          </article>
        </section>
      </main>
    </StoreShell>
  );
}
