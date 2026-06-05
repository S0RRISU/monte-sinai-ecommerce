import { Filter, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { CategoryIcon } from '@/components/store/category-icon';
import { StoreShell } from '@/components/store/store-shell';
import { ProductCard } from '@/components/store/product-card';
import { visibleStoreCategories } from '@/lib/site-config';
import { getStorefrontConfig, storefrontProductsByCategory } from '@/lib/storefront-data';

type ProductsPageProps = {
  searchParams: Promise<{ categoria?: string }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const activeCategory = params.categoria || 'todos';
  const [products, config] = await Promise.all([storefrontProductsByCategory(activeCategory), getStorefrontConfig()]);
  const categories = visibleStoreCategories(config);
  const activeLabel = categories.find((category) => category.id === activeCategory)?.label || 'Todos os produtos';

  return (
    <StoreShell>
      <main className="store-main products-page">
        <section className="products-heading">
          <div>
            <span>Produtos Monte Sinai</span>
            <h1>{activeLabel}</h1>
            <p>Escolha o produto, confira os detalhes e finalize com a loja.</p>
          </div>
          <div className="products-controls">
            <button type="button">
              <Filter className="size-4" />
              Filtros
            </button>
            <button type="button">
              <SlidersHorizontal className="size-4" />
              Relevância
            </button>
          </div>
        </section>

        <section className="products-toolbar" aria-label="Categorias de produtos">
          <Link className={activeCategory === 'todos' ? 'is-active' : undefined} href="/produtos">
            Todos
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              className={activeCategory === category.id ? 'is-active' : undefined}
              href={`/produtos?categoria=${category.id}`}
            >
              <CategoryIcon category={category.id} />
              {category.label}
            </Link>
          ))}
        </section>

        <section className="products-grid" aria-label="Produtos da loja">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </section>
      </main>
    </StoreShell>
  );
}
