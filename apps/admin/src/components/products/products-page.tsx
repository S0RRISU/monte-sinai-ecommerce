'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eye,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
  type LucideIcon
} from 'lucide-react';
import { deleteProduct, fetchAdminProducts, saveProduct } from '@/lib/admin-services';
import { resolveAdminImageUrl } from '@/lib/assets';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductEditorDrawer } from './product-editor-drawer';

type ProductTab = 'catalogo' | 'estoque' | 'categorias' | 'resumo' | 'atualizacoes';
type StockFilter = 'todos' | 'baixo';
type SortMode = 'nome' | 'estoque' | 'preco';

export function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productParam = searchParams.get('produto');
  const viewParam = searchParams.get('ver');
  const newParam = searchParams.get('novo');
  const { products, setProducts, setLoading, setError, addNotification, loading, error } = useAdminStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [tab, setTab] = useState<ProductTab>('catalogo');
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos');
  const [sort, setSort] = useState<SortMode>('nome');
  const [editorOpen, setEditorOpen] = useState(() => newParam === '1');
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [savingId, setSavingId] = useState('');
  const [success, setSuccess] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setProducts(await fetchAdminProducts());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setProducts]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))], [products]);
  const routeProduct = useMemo(() => (productParam ? products.find((product) => product.id === productParam) || null : null), [productParam, products]);
  const routeViewProduct = useMemo(() => (viewParam ? products.find((product) => product.id === viewParam) || null : null), [products, viewParam]);
  const drawerProduct = editing || routeProduct || viewing || routeViewProduct;
  const drawerOpen = editorOpen || newParam === '1' || Boolean(routeProduct) || Boolean(routeViewProduct);
  const drawerMode = viewing || routeViewProduct ? 'view' : 'edit';
  const filtered = useMemo(() => {
    const clean = query.toLowerCase().trim();
    const list = products.filter((product) => {
      const lowStock = isLowStock(product);
      const matchCategory = category === 'Todas' || product.category === category;
      const matchStock = stockFilter === 'todos' || lowStock;
      const matchQuery = !clean || [product.name, product.category, product.description, product.id].join(' ').toLowerCase().includes(clean);
      return matchCategory && matchStock && matchQuery;
    });

    return [...list].sort((a, b) => {
      if (sort === 'estoque') return Number(a.stock || 0) - Number(b.stock || 0);
      if (sort === 'preco') return b.price - a.price;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [category, products, query, sort, stockFilter]);

  const summary = useMemo(() => {
    const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const stockValue = products.reduce((sum, product) => sum + Number(product.stock || 0) * product.price, 0);
    const low = products.filter(isLowStock);
    const critical = low.filter((product) => Number(product.stock || 0) <= Math.max(1, Math.floor(product.minStock / 2))).length;
    return {
      totalStock,
      stockValue,
      critical,
      reorder: low.length
    };
  }, [products]);

  const categorySummary = useMemo(() => {
    return categories
      .filter((item) => item !== 'Todas')
      .map((item) => ({
        name: item,
        count: products.filter((product) => product.category === item).length,
        stock: products.filter((product) => product.category === item).reduce((sum, product) => sum + Number(product.stock || 0), 0)
      }));
  }, [categories, products]);

  function openEditor(product: Product | null) {
    setViewing(null);
    setEditing(product);
    setEditorOpen(true);
    router.replace(product ? `/produtos?produto=${encodeURIComponent(product.id)}` : '/produtos?novo=1', { scroll: false });
  }

  function openViewer(product: Product) {
    setEditing(null);
    setViewing(product);
    setEditorOpen(true);
    router.replace(`/produtos?ver=${encodeURIComponent(product.id)}`, { scroll: false });
  }

  function closeEditor() {
    setEditing(null);
    setViewing(null);
    setEditorOpen(false);
    if (productParam || viewParam || newParam) router.replace('/produtos', { scroll: false });
  }

  function productUpdate(product: Product, overrides: Partial<Product>): Partial<Product> {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      image: product.image,
      price: product.price,
      promoPrice: product.promoPrice,
      stock: product.stock,
      minStock: product.minStock,
      active: product.active,
      storeVisible: product.storeVisible,
      catalogVisible: product.catalogVisible,
      featured: product.featured,
      offerActive: product.offerActive,
      ...overrides
    };
  }

  async function handleToggleActive(product: Product) {
    const active = !product.active;
    setSavingId(product.id);
    setSuccess('');
    try {
      await saveProduct(productUpdate(product, { active }));
      setSuccess(active ? `${product.name} ativado.` : `${product.name} desativado.`);
      addNotification({
        title: active ? 'Produto ativado' : 'Produto desativado',
        detail: product.name,
        tone: active ? 'success' : 'warning',
        href: `/produtos?ver=${encodeURIComponent(product.id)}`
      });
      await loadProducts();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Falha ao alterar status do produto.');
    } finally {
      setSavingId('');
    }
  }

  function handleDeleteProduct(product: Product) {
    setDeleteTarget(product);
  }

  async function confirmDeleteProduct() {
    const product = deleteTarget;
    if (!product) return;
    setSavingId(product.id);
    setSuccess('');
    try {
      await deleteProduct(product.id);
      setSuccess(`${product.name} excluido.`);
      addNotification({
        title: 'Produto excluido',
        detail: product.name,
        tone: 'danger',
        href: '/produtos'
      });
      if (productParam === product.id || viewParam === product.id) closeEditor();
      setDeleteTarget(null);
      await loadProducts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir produto.');
    } finally {
      setSavingId('');
    }
  }

  function selectTab(nextTab: ProductTab) {
    setTab(nextTab);
    if (nextTab === 'estoque') {
      setCategory('Todas');
      setStockFilter('todos');
      setSort('estoque');
      return;
    }
    if (nextTab === 'catalogo') {
      setSort('nome');
    }
  }

  return (
    <section className="admin-ops-page admin-products-page">
      <PageHeader
        eyebrow="InventÃ¡rio"
        title="Produtos"
        description="Gerencie catÃ¡logo, estoque, publicaÃ§Ã£o e preÃ§os reais da loja."
        action={
          <div className="grid gap-2 sm:flex">
            <button type="button" className="admin-button admin-button-soft" onClick={loadProducts} disabled={loading}>
              <RefreshCw className="size-4" />
              Atualizar
            </button>
            <button type="button" className="admin-button admin-button-primary" onClick={() => openEditor(null)}>
              <Plus className="size-4" />
              Novo produto
            </button>
          </div>
        }
      />

      {error ? <div className="ops-alert ops-alert-error">{error}</div> : null}
      {success ? (
        <div className="ops-alert ops-alert-success">
          <CheckCircle2 className="size-4" />
          {success}
        </div>
      ) : null}

      <section className="ops-page-tabs" aria-label="Abas de produtos">
        <button type="button" className={tab === 'catalogo' ? 'is-active' : ''} onClick={() => selectTab('catalogo')}>Catalogo</button>
        <button type="button" className={tab === 'estoque' ? 'is-active' : ''} onClick={() => selectTab('estoque')}>Estoque</button>
        <button type="button" className={tab === 'categorias' ? 'is-active' : ''} onClick={() => selectTab('categorias')}>Categorias</button>
        <button type="button" className={tab === 'resumo' ? 'is-active' : ''} onClick={() => selectTab('resumo')}>Resumo</button>
        <button type="button" className={tab === 'atualizacoes' ? 'is-active' : ''} onClick={() => selectTab('atualizacoes')}>Atualizacoes</button>
      </section>

      {tab === 'categorias' ? (
        <section className="ops-category-grid">
          {categorySummary.length ? (
            categorySummary.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setStockFilter('todos');
                  setCategory(item.name);
                  selectTab('catalogo');
                }}
              >
                <Tag className="size-5" />
                <span>{item.name}</span>
                <strong>{item.count} produtos</strong>
                <small>{item.stock} un. em estoque</small>
              </button>
            ))
          ) : (
            <EmptyState title="Nenhuma categoria encontrada" description="Cadastre produtos com categoria para organizar o catalogo." />
          )}
        </section>
      ) : null}

      {tab === 'resumo' ? (
        <section className="ops-product-footer is-single">
          <StockSummaryCard summary={summary} />
        </section>
      ) : null}

      {tab === 'atualizacoes' ? (
        <section className="ops-product-footer is-single">
          <StockUpdatesCard products={products} onRefresh={loadProducts} />
        </section>
      ) : null}

      {tab === 'catalogo' || tab === 'estoque' ? (
        <>
          <section className="ops-toolbar products-toolbar">
            <label className="ops-search">
              <Search className="size-5" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produtos, SKU, codigo de barras..." />
            </label>
            <label className="ops-filter-field">
              <span>Categorias</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <ChevronDown className="size-4" />
            </label>
            <button type="button" className="ops-filter-field ops-filter-button" onClick={() => setStockFilter(stockFilter === 'baixo' ? 'todos' : 'baixo')}>
              <Filter className="size-5" />
              <span>{stockFilter === 'baixo' ? 'Todos' : 'Filtros'}</span>
            </button>
            <label className="ops-filter-field">
              <SlidersHorizontal className="size-5" />
              <span>Ordenar:</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                <option value="nome">Nome (A-Z)</option>
                <option value="estoque">Menor estoque</option>
                <option value="preco">Maior preco</option>
              </select>
              <ChevronDown className="size-4" />
            </label>
          </section>

          <section className="ops-product-filter-cards" aria-label="Filtros rapidos de produtos">
            <button type="button" className={stockFilter === 'todos' && category === 'Todas' ? 'is-active' : ''} onClick={() => { setStockFilter('todos'); setCategory('Todas'); }}>
              <Boxes className="size-5" />
              <span>Todos</span>
              <strong>{products.length}</strong>
            </button>
            {categorySummary.slice(0, 4).map((item) => (
              <button key={item.name} type="button" className={category === item.name ? 'is-active' : ''} onClick={() => { setStockFilter('todos'); setCategory(item.name); }}>
                <Tag className="size-5" />
                <span>{item.name}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
            <button type="button" className={stockFilter === 'baixo' ? 'is-danger is-active' : 'is-danger'} onClick={() => setStockFilter(stockFilter === 'baixo' ? 'todos' : 'baixo')}>
              <AlertTriangle className="size-5" />
              <span>Baixo estoque</span>
              <strong>{summary.reorder}</strong>
            </button>
          </section>

          <div className="ops-list-header">
            <span>{filtered.length} produtos encontrados</span>
            <strong>Ordenar por: {sort === 'nome' ? 'Nome (A-Z)' : sort === 'estoque' ? 'Menor estoque' : 'Maior preco'}</strong>
            <button type="button" onClick={() => { setQuery(''); setCategory('Todas'); setStockFilter('todos'); }} aria-label="Limpar filtros">
              <RefreshCw className="size-4" />
            </button>
          </div>

          {!loading && !filtered.length ? (
            <EmptyState title="Nenhum produto encontrado" description="Ajuste os filtros ou cadastre um novo produto." />
          ) : (
            <section className="ops-product-list">
              {filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  saving={savingId === product.id}
                  onView={() => openViewer(product)}
                  onEdit={() => openEditor(product)}
                  onToggleActive={() => handleToggleActive(product)}
                  onDelete={() => handleDeleteProduct(product)}
                />
              ))}
            </section>
          )}
        </>
      ) : null}
      <button type="button" className="ops-floating-action" onClick={() => openEditor(null)}>
        <Plus className="size-7" />
        <span>Novo produto</span>
      </button>

      {deleteTarget ? (
        <DeleteProductDialog
          product={deleteTarget}
          pending={savingId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteProduct}
        />
      ) : null}

      <ProductEditorDrawer product={drawerProduct} open={drawerOpen} mode={drawerMode} onEdit={() => drawerProduct ? openEditor(drawerProduct) : undefined} onClose={closeEditor} onSaved={loadProducts} />
    </section>
  );
}

function DeleteProductDialog({
  product,
  pending,
  onCancel,
  onConfirm
}: {
  product: Product;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="ops-confirm-backdrop">
      <section className="ops-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-product-title">
        <button type="button" className="ops-confirm-close" onClick={onCancel} disabled={pending} aria-label="Fechar confirmacao">
          <X className="size-5" />
        </button>
        <span className="ops-confirm-icon is-danger">
          <Trash2 className="size-6" />
        </span>
        <p className="ops-confirm-kicker">Acao permanente</p>
        <h2 id="delete-product-title">Excluir produto?</h2>
        <p>
          Voce esta prestes a remover <strong>{product.name}</strong> do painel e da loja.
        </p>
        <div className="ops-confirm-warning">
          <AlertTriangle className="size-5" />
          <span>Essa exclusao tambem remove as variacoes vinculadas a este produto.</span>
        </div>
        <div className="ops-confirm-actions">
          <button type="button" className="admin-button admin-button-soft" onClick={onCancel} disabled={pending}>
            Cancelar
          </button>
          <button type="button" className="admin-button admin-button-danger" onClick={onConfirm} disabled={pending}>
            <Trash2 className="size-4" />
            {pending ? 'Excluindo...' : 'Excluir produto'}
          </button>
        </div>
      </section>
    </div>
  );
}

function ProductRow({
  product,
  saving,
  onView,
  onEdit,
  onToggleActive,
  onDelete
}: {
  product: Product;
  saving: boolean;
  onView: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const low = isLowStock(product);
  const stock = Number(product.stock || 0);
  const visiblePrice = product.promoPrice && product.promoPrice > 0 ? product.promoPrice : product.price;

  return (
    <article className={`ops-product-row ${low ? 'is-low' : ''}`}>
      <div className="ops-product-image">
        {product.image ? <img src={resolveAdminImageUrl(product.image)} alt={product.name} /> : <Package className="size-9" />}
      </div>

      <div className="ops-product-info">
        <div>
          <h2>{product.name}</h2>
          <span className={product.active ? 'is-active' : 'is-hidden'}>{product.active ? 'Ativo' : 'Inativo'}</span>
          {!(product.storeVisible && product.catalogVisible) ? <span className="is-hidden">Fora da loja</span> : null}
          {product.featured ? <span className="is-featured">Destaque</span> : null}
          {low ? <span className="is-low">Baixo estoque</span> : null}
        </div>
        <p>SKU: {displayNumericSku(product.variations[0]?.sku || product.id)}</p>
        <p>Categoria: {product.category}</p>
        <strong>{money(visiblePrice)}</strong>
        {product.promoPrice ? <small>{money(product.price)} promocional ativo</small> : null}
      </div>

      <div className="ops-product-stock">
        <span>Estoque atual</span>
        <strong className={low ? 'is-low' : ''}>{stock} un.</strong>
        <small>Estoque mÃ­nimo: {product.minStock || 0} un.</small>
        <em className={low ? 'is-low' : 'is-ok'}>{low ? 'Estoque baixo' : 'Estoque normal'}</em>
      </div>

      <div className="ops-product-publish">
        <span>{product.active ? 'Ativo' : 'Inativo'}</span>
        <button type="button" className={`ops-switch ${product.active ? 'is-on' : ''}`} aria-pressed={product.active} aria-label={product.active ? 'Desativar produto' : 'Ativar produto'} onClick={onToggleActive} disabled={saving}>
          <span />
        </button>
      </div>

      <div className="ops-product-actions">
        <button type="button" onClick={onView}>
          <Eye className="size-4" />
          Ver produto
        </button>
        <button type="button" onClick={onEdit}>
          <Edit3 className="size-4" />
          Editar
        </button>
        <button type="button" onClick={onToggleActive} disabled={saving}>
          <CheckCircle2 className="size-4" />
          {product.active ? 'Desativar' : 'Ativar'}
        </button>
        <button type="button" className="is-danger" onClick={onDelete} disabled={saving}>
          <Trash2 className="size-4" />
          Excluir
        </button>
      </div>
    </article>
  );
}

function StockSummaryCard({
  summary
}: {
  summary: {
    totalStock: number;
    stockValue: number;
    critical: number;
    reorder: number;
  };
}) {
  return (
    <article className="ops-stock-summary">
      <header>
        <h2>Resumo de estoque</h2>
      </header>
      <div>
        <Metric icon={Boxes} label="Estoque total" value={`${summary.totalStock} unidades`} tone="blue" />
        <Metric icon={Tag} label="Valor total em estoque" value={money(summary.stockValue)} tone="green" />
        <Metric icon={AlertTriangle} label="Itens criticos" value={`${summary.critical} produtos`} tone="red" />
        <Metric icon={Package} label="Reposicao sugerida" value={`${summary.reorder} produtos`} tone="amber" />
      </div>
    </article>
  );
}

function StockUpdatesCard({ products, onRefresh }: { products: Product[]; onRefresh: () => Promise<void> }) {
  const updates = products
    .slice()
    .sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)) || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 12);

  return (
    <article className="ops-stock-summary">
      <header>
        <h2>Ultimas atualizacoes</h2>
        <button type="button" onClick={() => void onRefresh()}>
          Ver todas
        </button>
      </header>
      <div className="ops-movement-list">
        {updates.length ? (
          updates.map((product) => {
            const low = isLowStock(product);
            const stock = Number(product.stock || 0);
            return (
              <p key={product.id}>
                <span className={low ? 'is-down' : 'is-up'}>{low ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}</span>
                <strong>{low ? 'Estoque baixo' : 'Estoque atualizado'}</strong>
                <small>{product.name}</small>
                <em>{low ? `${stock} un.` : `+${stock} un.`}</em>
              </p>
            );
          })
        ) : (
          <EmptyState title="Nenhuma atualizacao encontrada" description="Os movimentos de estoque aparecem aqui quando houver produtos cadastrados." />
        )}
      </div>
    </article>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'blue' | 'green' | 'red' | 'amber' }) {
  return (
    <p className={`ops-stock-metric ${tone}`}>
      <Icon className="size-5" />
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

function isLowStock(product: Product) {
  if (product.stock === null || product.stock === undefined) return false;
  return Number(product.stock) <= Number(product.minStock || 0);
}

function displayNumericSku(seed: string) {
  const digits = seed.replace(/\D/g, '');
  if (digits.length >= 8) return digits.slice(-8);
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000000;
  }
  return String(hash || 0).padStart(8, '0');
}
