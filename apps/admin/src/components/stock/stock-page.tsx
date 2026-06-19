'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { fetchAdminProducts, fetchStockMovements, registerStockMovements } from '@/lib/admin-services';
import { fullDate, money } from '@/lib/format';
import type { Product, StockMovement, StockMovementInput, StockMovementType } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';

type StockTab = 'overview' | 'register' | 'history';
type StockFilter = 'Todos' | 'Critico' | 'Baixo' | 'Ok';
type StockState = StockFilter | 'Sem controle';
type HistoryPeriod = 'all' | 'today' | '7days' | '30days';
type EntryMovementType = StockMovementInput['type'];

type StockItem = {
  key: string;
  productId: string;
  variationId: string | null;
  name: string;
  variationName: string;
  category: string;
  sku: string;
  stock: number | null;
  minStock: number;
  image: string;
};

type EntryLine = {
  id: string;
  itemKey: string;
  quantity: number;
  cost: string;
};

const movementOptions: Array<{ value: EntryMovementType; label: string; helper: string }> = [
  { value: 'entrada', label: 'Entrada de mercadoria', helper: 'Reposicao recebida de fornecedor' },
  { value: 'devolucao', label: 'Devolucao ao estoque', helper: 'Produto devolvido em boas condicoes' },
  { value: 'ajuste_entrada', label: 'Ajuste de entrada', helper: 'Correcao positiva de contagem' },
  { value: 'ajuste_saida', label: 'Ajuste de saida', helper: 'Correcao negativa de contagem' },
  { value: 'perda', label: 'Perda ou avaria', helper: 'Quebra, vencimento ou produto danificado' },
  { value: 'cancelamento', label: 'Cancelamento', helper: 'Item retornado por pedido cancelado' }
];

const historyTypeOptions: Array<{ value: 'all' | StockMovementType; label: string }> = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'entrada', label: 'Entradas' },
  { value: 'saida_venda', label: 'Vendas' },
  { value: 'devolucao', label: 'Devolucoes' },
  { value: 'perda', label: 'Perdas' },
  { value: 'ajuste_entrada', label: 'Ajustes de entrada' },
  { value: 'ajuste_saida', label: 'Ajustes de saida' },
  { value: 'cancelamento', label: 'Cancelamentos' }
];

export function StockPage() {
  const searchParams = useSearchParams();
  const { products, setProducts, setLoading, setError, addNotification, loading, error } = useAdminStore();
  const selectedProductId = searchParams.get('produto') || '';
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<StockTab>('overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('Todos');
  const [historyType, setHistoryType] = useState<'all' | StockMovementType>('all');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('30days');
  const [movementType, setMovementType] = useState<EntryMovementType>('entrada');
  const [supplier, setSupplier] = useState('');
  const [document, setDocument] = useState('');
  const [reason, setReason] = useState('');
  const [occurredAt, setOccurredAt] = useState(toLocalDateTimeValue());
  const [lines, setLines] = useState<EntryLine[]>([createEntryLine()]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      const [nextProducts, nextMovements] = await Promise.all([fetchAdminProducts(), fetchStockMovements()]);
      setProducts(nextProducts);
      setMovements(nextMovements);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar estoque.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const [nextProducts, nextMovements] = await Promise.all([fetchAdminProducts(), fetchStockMovements()]);
        if (!active) return;
        setProducts(nextProducts);
        setMovements(nextMovements);
        setError('');
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar estoque.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialLoad();
    return () => {
      active = false;
    };
  }, [setError, setLoading, setProducts]);

  const stockItems = useMemo(() => buildStockItems(products), [products]);

  const overviewRows = useMemo(
    () =>
      stockItems
        .map((item) => {
          const state = getStockState(item);
          const stock = item.stock ?? 0;
          const missing = item.stock === null ? 0 : Math.max(item.minStock - stock, 0);
          return { item, state, stock, missing };
        })
        .filter((row) => {
          const clean = normalizeText(query);
          const matchesQuery =
            !clean ||
            normalizeText([row.item.name, row.item.variationName, row.item.category, row.item.sku].join(' ')).includes(clean);
          return matchesQuery && (filter === 'Todos' || row.state === filter);
        })
        .sort((a, b) => {
          if (selectedProductId) {
            if (a.item.productId === selectedProductId) return -1;
            if (b.item.productId === selectedProductId) return 1;
          }
          return stockStateWeight(a.state) - stockStateWeight(b.state) || b.missing - a.missing || a.item.name.localeCompare(b.item.name, 'pt-BR');
        }),
    [filter, query, selectedProductId, stockItems]
  );

  const filteredMovements = useMemo(() => {
    const clean = normalizeText(query);
    const cutoff = movementCutoff(historyPeriod);
    return movements.filter((movement) => {
      const matchesType = historyType === 'all' || movement.type === historyType;
      const matchesPeriod = !cutoff || new Date(movement.occurredAt).getTime() >= cutoff.getTime();
      const matchesQuery =
        !clean ||
        normalizeText(
          [
            movement.productName,
            movement.variationName,
            movement.sku,
            movement.supplier,
            movement.document,
            movement.reason,
            movement.responsibleName,
            movement.responsibleEmail
          ].join(' ')
        ).includes(clean);
      return matchesType && matchesPeriod && matchesQuery;
    });
  }, [historyPeriod, historyType, movements, query]);

  const totals = useMemo(() => {
    const controlled = stockItems.filter((item) => item.stock !== null);
    const today = new Date().toDateString();
    return {
      items: stockItems.length,
      critical: controlled.filter((item) => getStockState(item) === 'Critico').length,
      needRestock: controlled.reduce((sum, item) => sum + Math.max(item.minStock - Number(item.stock || 0), 0), 0),
      receivedToday: movements
        .filter((movement) => isPositiveMovement(movement.type) && new Date(movement.occurredAt).toDateString() === today)
        .reduce((sum, movement) => sum + movement.quantity, 0)
    };
  }, [movements, stockItems]);

  function beginMovement(itemKey?: string, type: EntryMovementType = 'entrada') {
    setMovementType(type);
    setLines([createEntryLine(itemKey)]);
    setActiveTab('register');
    setSuccess('');
  }

  function showItemHistory(item: StockItem) {
    setQuery(item.variationName ? `${item.name} ${item.variationName}` : item.name);
    setHistoryType('all');
    setActiveTab('history');
  }

  function updateLine(id: string, patch: Partial<EntryLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  }

  async function submitMovement() {
    setError('');
    setSuccess('');

    const selected = lines.map((line) => ({ line, item: stockItems.find((item) => item.key === line.itemKey) }));
    if (selected.some(({ item }) => !item)) {
      setError('Escolha um produto em todas as linhas.');
      return;
    }
    if (selected.some(({ line }) => !Number.isInteger(line.quantity) || line.quantity <= 0)) {
      setError('Informe quantidades inteiras maiores que zero.');
      return;
    }
    if (new Set(lines.map((line) => line.itemKey)).size !== lines.length) {
      setError('O mesmo produto ou variacao foi adicionado mais de uma vez.');
      return;
    }

    const occurredDate = new Date(occurredAt);
    if (Number.isNaN(occurredDate.getTime())) {
      setError('Informe uma data e hora validas.');
      return;
    }

    setSaving(true);
    try {
      await registerStockMovements(
        selected.map(({ line, item }) => ({
          productId: item!.productId,
          variationId: item!.variationId,
          type: movementType,
          quantity: line.quantity,
          reason,
          supplier,
          document,
          unitCost: parseOptionalMoney(line.cost),
          occurredAt: occurredDate.toISOString()
        }))
      );

      const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
      setSuccess(`${lines.length} item(ns) e ${totalUnits} unidade(s) registrados com historico.`);
      addNotification({
        title: movementType === 'entrada' ? 'Entrada de estoque registrada' : 'Movimentacao registrada',
        detail: `${lines.length} item(ns), ${totalUnits} unidade(s).`,
        tone: 'success',
        href: '/estoque'
      });
      resetEntryForm();
      await loadData();
      setActiveTab('history');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao registrar movimentacao.');
    } finally {
      setSaving(false);
    }
  }

  function resetEntryForm() {
    setMovementType('entrada');
    setSupplier('');
    setDocument('');
    setReason('');
    setOccurredAt(toLocalDateTimeValue());
    setLines([createEntryLine()]);
  }

  return (
    <section className="stock-workspace">
      <PageHeader
        eyebrow="Estoque"
        title="Estoque e reposicao"
        description="Acompanhe saldos, registre recebimentos e consulte cada movimentacao."
        action={
          <button type="button" className="admin-button admin-button-primary" onClick={() => beginMovement()}>
            <Plus className="size-4" />
            Registrar entrada
          </button>
        }
      />

      {error ? <div className="stock-feedback is-error">{error}</div> : null}
      {success ? (
        <div className="stock-feedback is-success">
          <CheckCircle2 className="size-4" />
          {success}
        </div>
      ) : null}

      <nav className="stock-tabs" aria-label="Areas do estoque">
        <button type="button" className={activeTab === 'overview' ? 'is-active' : ''} onClick={() => setActiveTab('overview')}>
          <Boxes className="size-4" />
          Visao geral
        </button>
        <button type="button" className={activeTab === 'register' ? 'is-active' : ''} onClick={() => beginMovement()}>
          <ClipboardList className="size-4" />
          Registrar
        </button>
        <button type="button" className={activeTab === 'history' ? 'is-active' : ''} onClick={() => setActiveTab('history')}>
          <History className="size-4" />
          Historico
          <span>{movements.length}</span>
        </button>
      </nav>

      <section className="admin-stock-summary">
        <StockSummaryCard icon={Boxes} label="Itens controlados" value={totals.items} tone="blue" />
        <StockSummaryCard icon={AlertTriangle} label="Itens criticos" value={totals.critical} tone="red" />
        <StockSummaryCard icon={TrendingDown} label="Reposicao sugerida" value={totals.needRestock} tone="amber" suffix="un." />
        <StockSummaryCard icon={PackageCheck} label="Recebido hoje" value={totals.receivedToday} tone="green" suffix="un." />
      </section>

      {activeTab === 'overview' ? (
        <>
          <section className="admin-stock-toolbar">
            <SearchField value={query} onChange={setQuery} placeholder="Buscar produto, variacao, categoria ou SKU..." />
            <div className="admin-stock-filter-row">
              {(['Todos', 'Critico', 'Baixo', 'Ok'] as StockFilter[]).map((item) => (
                <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
            <button type="button" className="admin-button admin-button-soft" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className="size-4" />
              Atualizar
            </button>
          </section>

          {!loading && !overviewRows.length ? (
            <EmptyState title="Nenhum item encontrado" description="Ajuste a busca ou o filtro de estoque." />
          ) : (
            <section className="admin-stock-list">
              {overviewRows.map(({ item, state, stock, missing }) => (
                <article
                  key={item.key}
                  className={`admin-stock-row state-${stockStateClass(state)} ${item.productId === selectedProductId ? 'is-selected' : ''}`}
                >
                  <div className="admin-stock-row-main">
                    <span className="admin-stock-state">{state}</span>
                    <div className="min-w-0">
                      <h2>{item.name}</h2>
                      <p>
                        {[item.variationName, item.category, item.sku ? `SKU ${item.sku}` : ''].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="admin-stock-numbers">
                    <div>
                      <span>Atual</span>
                      <strong>{item.stock === null ? 'Livre' : stock}</strong>
                    </div>
                    <div>
                      <span>Minimo</span>
                      <strong>{item.minStock}</strong>
                    </div>
                    <div>
                      <span>Repor</span>
                      <strong>{missing}</strong>
                    </div>
                  </div>

                  <div className="admin-stock-actions">
                    <button type="button" className="admin-button admin-button-primary" onClick={() => beginMovement(item.key)}>
                      <Plus className="size-4" />
                      Registrar entrada
                    </button>
                    <button type="button" className="admin-button admin-button-soft" onClick={() => showItemHistory(item)}>
                      <History className="size-4" />
                      Historico
                    </button>
                    <Link href={`/produtos?produto=${encodeURIComponent(item.productId)}`} className="stock-edit-link">
                      Editar cadastro
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      ) : null}

      {activeTab === 'register' ? (
        <section className="stock-register-layout">
          <article className="stock-form-panel">
            <header>
              <span><ClipboardList className="size-5" /></span>
              <div>
                <h2>Dados da movimentacao</h2>
                <p>Informacoes compartilhadas por todos os itens deste lancamento.</p>
              </div>
            </header>

            <div className="stock-form-grid">
              <label className="stock-field is-wide">
                <span>Tipo de movimentacao</span>
                <select value={movementType} onChange={(event) => setMovementType(event.target.value as EntryMovementType)}>
                  {movementOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label} - {option.helper}</option>
                  ))}
                </select>
              </label>
              <label className="stock-field">
                <span>Fornecedor</span>
                <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Nome do fornecedor" />
              </label>
              <label className="stock-field">
                <span>Nota fiscal ou documento</span>
                <input value={document} onChange={(event) => setDocument(event.target.value)} placeholder="Numero opcional" />
              </label>
              <label className="stock-field">
                <span>Data e hora da movimentacao</span>
                <input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
              </label>
              <label className="stock-field">
                <span>Motivo ou observacao</span>
                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: reposicao semanal" />
              </label>
            </div>
          </article>

          <article className="stock-form-panel">
            <header>
              <span><Boxes className="size-5" /></span>
              <div>
                <h2>Produtos recebidos</h2>
                <p>Adicione um ou varios produtos no mesmo lancamento.</p>
              </div>
              <button type="button" className="stock-add-line" onClick={() => setLines((current) => [...current, createEntryLine()])}>
                <Plus className="size-4" />
                Adicionar item
              </button>
            </header>

            <div className="stock-entry-lines">
              {lines.map((line, index) => {
                const selectedItem = stockItems.find((item) => item.key === line.itemKey);
                return (
                  <div className="stock-entry-line" key={line.id}>
                    <span className="stock-entry-index">{index + 1}</span>
                    <label className="stock-field">
                      <span>Produto ou variacao</span>
                      <select value={line.itemKey} onChange={(event) => updateLine(line.id, { itemKey: event.target.value })}>
                        <option value="">Selecione...</option>
                        {stockItems.map((item) => (
                          <option key={item.key} value={item.key}>
                            {stockItemLabel(item)} · atual {item.stock ?? 0}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="stock-field">
                      <span>Quantidade</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: Math.max(0, Number(event.target.value || 0)) })}
                      />
                    </label>
                    <label className="stock-field">
                      <span>Custo unitario</span>
                      <input
                        inputMode="decimal"
                        value={line.cost}
                        onChange={(event) => updateLine(line.id, { cost: event.target.value })}
                        placeholder="0,00"
                      />
                    </label>
                    <div className="stock-entry-preview">
                      <span>Saldo previsto</span>
                      <strong>{selectedItem ? projectedStock(selectedItem.stock, movementType, line.quantity) : '-'}</strong>
                    </div>
                    <button type="button" className="stock-remove-line" aria-label={`Remover item ${index + 1}`} onClick={() => removeLine(line.id)} disabled={lines.length === 1}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <footer className="stock-form-actions">
              <button type="button" className="admin-button admin-button-soft" onClick={resetEntryForm} disabled={saving}>
                <RotateCcw className="size-4" />
                Limpar
              </button>
              <button type="button" className="admin-button admin-button-primary" onClick={() => void submitMovement()} disabled={saving}>
                <Save className="size-4" />
                {saving ? 'Registrando...' : `Registrar ${lines.length} item(ns)`}
              </button>
            </footer>
          </article>
        </section>
      ) : null}

      {activeTab === 'history' ? (
        <>
          <section className="stock-history-toolbar">
            <SearchField value={query} onChange={setQuery} placeholder="Buscar produto, fornecedor, documento ou responsavel..." />
            <label>
              <span>Tipo</span>
              <select value={historyType} onChange={(event) => setHistoryType(event.target.value as 'all' | StockMovementType)}>
                {historyTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Periodo</span>
              <select value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value as HistoryPeriod)}>
                <option value="today">Hoje</option>
                <option value="7days">Ultimos 7 dias</option>
                <option value="30days">Ultimos 30 dias</option>
                <option value="all">Todo o historico</option>
              </select>
            </label>
            <button type="button" className="admin-button admin-button-soft" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className="size-4" />
              Atualizar
            </button>
          </section>

          {!loading && !filteredMovements.length ? (
            <EmptyState title="Nenhuma movimentacao encontrada" description="Registre uma entrada ou ajuste os filtros do historico." />
          ) : (
            <section className="stock-history-list">
              {filteredMovements.map((movement) => (
                <MovementRow key={movement.id} movement={movement} />
              ))}
            </section>
          )}
        </>
      ) : null}
    </section>
  );
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const positive = isPositiveMovement(movement.type);
  const Icon = movement.type === 'saida_venda' ? ShoppingCart : positive ? ArrowUp : ArrowDown;
  return (
    <article className={`stock-history-row ${positive ? 'is-positive' : 'is-negative'}`}>
      <span className="stock-history-icon"><Icon className="size-4" /></span>
      <div className="stock-history-product">
        <strong>{movement.productName}</strong>
        <small>{[movement.variationName, movement.sku ? `SKU ${movement.sku}` : ''].filter(Boolean).join(' · ') || 'Produto principal'}</small>
      </div>
      <div className="stock-history-type">
        <strong>{movementLabel(movement.type)}</strong>
        <small>{movement.reason || movement.supplier || 'Sem observacao'}</small>
      </div>
      <div className="stock-history-balance">
        <strong>{positive ? '+' : '-'}{movement.quantity} un.</strong>
        <small>
          {movement.previousStock === null || movement.newStock === null
            ? 'Movimento anterior ao novo historico'
            : `${movement.previousStock} -> ${movement.newStock}`}
        </small>
      </div>
      <div className="stock-history-meta">
        <span><CalendarDays className="size-3.5" /> {fullDate(movement.occurredAt)}</span>
        <span>{movement.responsibleName || 'Sistema'}</span>
      </div>
      <div className="stock-history-document">
        {movement.supplier ? <span>{movement.supplier}</span> : null}
        {movement.document ? <small><FileText className="size-3.5" /> {movement.document}</small> : null}
        {movement.unitCost !== null ? <small>{money(movement.unitCost)} / un.</small> : null}
      </div>
    </article>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="stock-search">
      <Search className="size-4" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function StockSummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  suffix = ''
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: string;
  suffix?: string;
}) {
  return (
    <article className={`admin-stock-summary-card tone-${tone}`}>
      <span><Icon className="size-5" /></span>
      <p>{label}</p>
      <strong>{value}{suffix ? ` ${suffix}` : ''}</strong>
    </article>
  );
}

function buildStockItems(products: Product[]): StockItem[] {
  return products.flatMap<StockItem>((product) => {
    const activeVariations = product.variations.filter((variation) => variation.active);
    if (activeVariations.length) {
      return activeVariations.map((variation) => ({
        key: `variation:${variation.id}`,
        productId: product.id,
        variationId: variation.id,
        name: product.name,
        variationName: variation.name,
        category: product.category,
        sku: variation.sku,
        stock: variation.stock,
        minStock: variation.minStock,
        image: variation.image || product.image
      }));
    }

    return [{
      key: `product:${product.id}`,
      productId: product.id,
      variationId: null,
      name: product.name,
      variationName: '',
      category: product.category,
      sku: '',
      stock: product.stock,
      minStock: product.minStock,
      image: product.image
    }];
  });
}

function getStockState(item: StockItem): StockState {
  if (item.stock === null) return 'Sem controle';
  if (item.stock <= Math.max(2, Math.floor(item.minStock * 0.5))) return 'Critico';
  if (item.stock <= item.minStock) return 'Baixo';
  return 'Ok';
}

function stockStateWeight(state: StockState) {
  return { Critico: 0, Baixo: 1, 'Sem controle': 2, Ok: 3, Todos: 4 }[state];
}

function stockStateClass(state: StockState) {
  return normalizeText(state).replace(/\s+/g, '-');
}

function stockItemLabel(item: StockItem) {
  return item.variationName ? `${item.name} - ${item.variationName}` : item.name;
}

function createEntryLine(itemKey = ''): EntryLine {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemKey,
    quantity: 1,
    cost: ''
  };
}

function toLocalDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function parseOptionalMoney(value: string) {
  const clean = value.trim().replace(/\./g, '').replace(',', '.');
  if (!clean) return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function projectedStock(stock: number | null, type: EntryMovementType, quantity: number) {
  const current = stock ?? 0;
  const next = isPositiveMovement(type) ? current + quantity : current - quantity;
  return Math.max(next, 0);
}

function movementCutoff(period: HistoryPeriod) {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'today') {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  now.setDate(now.getDate() - (period === '7days' ? 7 : 30));
  return now;
}

function isPositiveMovement(type: StockMovementType | EntryMovementType) {
  return ['entrada', 'ajuste_entrada', 'cancelamento', 'devolucao'].includes(type);
}

function movementLabel(type: StockMovementType) {
  const labels: Record<StockMovementType, string> = {
    entrada: 'Entrada',
    saida_venda: 'Saida por venda',
    ajuste: 'Ajuste antigo',
    ajuste_entrada: 'Ajuste de entrada',
    ajuste_saida: 'Ajuste de saida',
    cancelamento: 'Cancelamento',
    devolucao: 'Devolucao',
    perda: 'Perda ou avaria'
  };
  return labels[type];
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
