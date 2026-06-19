'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  Filter,
  Globe2,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Truck,
  UserRound,
  X,
  type LucideIcon
} from 'lucide-react';
import { createManualOrder, deleteAdminOrder, fetchAdminOrders, fetchAdminProducts, updateOrderStatus } from '@/lib/admin-services';
import { getSupabaseClient } from '@/lib/supabase';
import { resolveAdminImageUrl } from '@/lib/assets';
import { money, shortDate } from '@/lib/format';
import { orderStatuses, paymentStatuses } from '@/lib/constants';
import type { ManualOrderInput, Order, OrderOrigin, OrderStatus, PaymentStatus, Product } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { OrderDetailDrawer } from './order-detail-drawer';

type StatusFilter = 'Todos' | 'Abertos' | OrderStatus;
type PeriodFilter = 'date' | 'range' | '3d' | '7d' | '15d' | '30d' | '2m' | '3m' | '6m' | '1y' | '2y' | '3y' | '4y' | '5y' | 'all';
type PaymentFilter = 'Todos' | PaymentStatus;
type OriginFilter = 'Todos' | OrderOrigin;
type SortFilter = 'recentes' | 'valor' | 'antigos';
type FilterStateOverrides = Partial<{
  query: string;
  status: StatusFilter;
  payment: PaymentFilter;
  origin: OriginFilter;
  selectedDate: string;
  period: PeriodFilter;
  sort: SortFilter;
  advancedOpen: boolean;
  pedido: string | null;
}>;

const periodOptions: Array<{ label: string; value: PeriodFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Hoje', value: 'date' },
  { label: '3 dias', value: '3d' },
  { label: '7 dias', value: '7d' },
  { label: '15 dias', value: '15d' },
  { label: '30 dias', value: '30d' },
  { label: '2 meses', value: '2m' },
  { label: '3 meses', value: '3m' },
  { label: '6 meses', value: '6m' },
  { label: '1 ano', value: '1y' },
  { label: '2 anos', value: '2y' },
  { label: '3 anos', value: '3y' },
  { label: '4 anos', value: '4y' },
  { label: '5 anos', value: '5y' }
];

const originOptions: Array<{ label: string; value: OriginFilter }> = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Site', value: 'site' },
  { label: 'Presencial', value: 'presencial' },
  { label: 'Telefone', value: 'telefone' },
  { label: 'WhatsApp', value: 'whatsapp' }
];

const originLabels: Record<OrderOrigin, string> = {
  site: 'Site',
  presencial: 'Presencial',
  telefone: 'Telefone',
  whatsapp: 'WhatsApp'
};

const originMeta: Record<OrderOrigin, { tone: string }> = {
  site: { tone: 'var(--admin-accent)' },
  presencial: { tone: 'var(--admin-accent)' },
  telefone: { tone: 'var(--admin-accent)' },
  whatsapp: { tone: 'var(--admin-accent)' }
};

const orderTone = {
  primary: 'var(--admin-accent)',
  warning: 'var(--admin-gold)',
  complete: 'color-mix(in srgb, var(--admin-accent) 72%, var(--admin-text))',
  muted: 'var(--admin-muted)'
};

const statusMeta: Record<OrderStatus, { label: string; short: string; icon: LucideIcon; tone: string; action?: { label: string; next: OrderStatus; icon: LucideIcon; className: string } }> = {
  'A confirmar': {
    label: 'Recebidos',
    short: 'Recebido',
    icon: PackageCheck,
    tone: orderTone.primary,
    action: { label: 'Aceitar', next: 'Recebido', icon: CheckCircle2, className: 'ops-action-blue' }
  },
  Recebido: {
    label: 'Recebidos',
    short: 'Recebido',
    icon: PackageCheck,
    tone: orderTone.primary,
    action: { label: 'Separar', next: 'Em separação', icon: PackageCheck, className: 'ops-action-amber' }
  },
  'Em separação': {
    label: 'Em separação',
    short: 'Separação',
    icon: PackageCheck,
    tone: orderTone.warning,
    action: { label: 'Despachar', next: 'A caminho', icon: Truck, className: 'ops-action-blue' }
  },
  'A caminho': {
    label: 'Em rota',
    short: 'Em rota',
    icon: Truck,
    tone: orderTone.primary,
    action: { label: 'Concluir', next: 'Entregue', icon: CheckCircle2, className: 'ops-action-green' }
  },
  Entregue: {
    label: 'Entregues',
    short: 'Entregue',
    icon: CheckCircle2,
    tone: orderTone.complete
  },
  Cancelado: {
    label: 'Cancelados',
    short: 'Cancelado',
    icon: Ban,
    tone: orderTone.muted
  }
};

export function OrdersPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { orders, setOrders, setLoading, setError, addNotification, loading, error } = useAdminStore();
  const statusParam = searchParams.get('status');
  const orderParam = searchParams.get('pedido') || params.id || '';
  const queryParam = searchParams.get('q') || '';
  const paymentParam = normalizePayment(searchParams.get('pagamento'));
  const originParam = normalizeOrigin(searchParams.get('origem'));
  const sortParam = normalizeSort(searchParams.get('ordem'));
  const advancedParam = searchParams.get('filtros') === '1';
  const dateSearchParam = searchParams.get('data');
  const startSearchParam = searchParams.get('inicio');
  const endSearchParam = searchParams.get('fim');
  const periodParam = normalizePeriod(searchParams.get('periodo'), statusParam, dateSearchParam, startSearchParam, endSearchParam);
  const dateParam = endSearchParam || dateSearchParam || toDateInputValue(new Date());
  const [query, setQuery] = useState(queryParam);
  const [status, setStatus] = useState<StatusFilter>(() => normalizeStatus(statusParam));
  const [payment, setPayment] = useState<PaymentFilter>(paymentParam);
  const [origin, setOrigin] = useState<OriginFilter>(originParam);
  const [selectedDate, setSelectedDate] = useState(dateParam);
  const [period, setPeriod] = useState<PeriodFilter>(periodParam);
  const [sort, setSort] = useState<SortFilter>(sortParam);
  const [advancedOpen, setAdvancedOpen] = useState(advancedParam);
  const [savingId, setSavingId] = useState('');
  const [success, setSuccess] = useState('');
  const [manualSaleOpen, setManualSaleOpen] = useState(() => searchParams.get('novo') === '1');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setOrders(await fetchAdminOrders());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setOrders]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const client = getSupabaseClient();
    const ordersChannel = client
      .channel('admin-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        void loadOrders();
      })
      .subscribe();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadOrders();
    };

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      void client.removeChannel(ordersChannel);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadOrders]);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setProducts(await fetchAdminProducts());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar produtos para venda presencial.');
    } finally {
      setLoadingProducts(false);
    }
  }, [setError]);

  const filteredBase = useMemo(() => {
    const clean = query.toLowerCase().trim();
    return orders.filter((order) => {
      const matchDate = matchesPeriod(order, selectedDate, period);
      const matchPayment = payment === 'Todos' || order.paymentStatus === payment;
      const matchOrigin = origin === 'Todos' || order.origin === origin;
      const matchQuery =
        !clean ||
        [order.code, order.customer.name, order.customer.phone, order.customer.address, order.payment, order.paymentStatus, order.status, originLabel(order.origin)]
          .join(' ')
          .toLowerCase()
          .includes(clean);
      return matchDate && matchPayment && matchOrigin && matchQuery;
    });
  }, [orders, origin, payment, period, query, selectedDate]);

  const filtered = useMemo(() => {
    const list = filteredBase.filter((order) => matchesStatus(order, status));
    return [...list].sort((a, b) => {
      if (sort === 'valor') return b.total - a.total;
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sort === 'antigos' ? left - right : right - left;
    });
  }, [filteredBase, sort, status]);

  const tabs = useMemo(
    () => [
      { label: 'Todos', value: 'Todos' as StatusFilter, count: filteredBase.length, icon: PackageCheck, tone: orderTone.primary },
      { label: 'Recebidos', value: 'Recebido' as StatusFilter, count: filteredBase.filter((order) => order.status === 'Recebido' || order.status === 'A confirmar').length, icon: PackageCheck, tone: orderTone.primary },
      { label: 'Em separação', value: 'Em separação' as StatusFilter, count: filteredBase.filter((order) => order.status === 'Em separação').length, icon: PackageCheck, tone: orderTone.warning },
      { label: 'Em rota', value: 'A caminho' as StatusFilter, count: filteredBase.filter((order) => order.status === 'A caminho').length, icon: Truck, tone: orderTone.primary },
      { label: 'Entregues', value: 'Entregue' as StatusFilter, count: filteredBase.filter((order) => order.status === 'Entregue').length, icon: CheckCircle2, tone: orderTone.complete },
      { label: 'Cancelados', value: 'Cancelado' as StatusFilter, count: filteredBase.filter((order) => order.status === 'Cancelado').length, icon: Ban, tone: orderTone.muted }
    ],
    [filteredBase]
  );

  const selectedOrder = useMemo(() => {
    if (!orderParam || !orders.length) return null;
    return orders.find((order) => order.id === orderParam || order.code === orderParam || `#${order.code}` === orderParam) || null;
  }, [orderParam, orders]);

  const unresolvedOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'Entregue' && order.status !== 'Cancelado')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders]
  );
  const recentOrder = useMemo(
    () => [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null,
    [orders]
  );

  async function handleUpdate(order: Order, nextStatus: OrderStatus, nextPayment = order.paymentStatus) {
    setSavingId(order.id);
    setSuccess('');
    try {
      await updateOrderStatus(order.id, { status: nextStatus, paymentStatus: nextPayment });
      setSuccess(`Pedido #${order.code} atualizado.`);
      addNotification({
        title: `Pedido #${order.code} atualizado`,
        detail: `Status alterado para ${nextStatus}.`,
        tone: nextStatus === 'Cancelado' ? 'danger' : 'success',
        href: `/pedidos?pedido=${encodeURIComponent(order.id)}`
      });
      await loadOrders();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Falha ao atualizar pedido.');
    } finally {
      setSavingId('');
    }
  }

  async function handleCreateManualOrder(input: ManualOrderInput) {
    try {
      const result = await createManualOrder(input);
      const code = result?.codigo || 'nova venda';
      setSuccess(`Venda presencial #${code} registrada.`);
      addNotification({
        title: `Venda presencial #${code}`,
        detail: `${input.items.length} item(ns) registrados no pedido e no financeiro.`,
        tone: 'success',
        href: '/pedidos'
      });
      setManualSaleOpen(false);
      await loadOrders();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Falha ao registrar venda presencial.');
    }
  }

  async function handleDeleteOrder(order: Order) {
    const confirmed = window.confirm(`Excluir definitivamente o pedido #${order.code}? Essa acao nao pode ser desfeita e nao altera o estoque.`);
    if (!confirmed) return;

    setSavingId(order.id);
    setSuccess('');
    try {
      await deleteAdminOrder(order.id);
      setSuccess(`Pedido #${order.code} excluido.`);
      addNotification({
        title: `Pedido #${order.code} excluido`,
        detail: 'O pedido foi removido do painel.',
        tone: 'danger',
        href: '/pedidos'
      });
      router.replace(`/pedidos${currentQueryString({ pedido: null })}`, { scroll: false });
      await loadOrders();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir pedido.');
    } finally {
      setSavingId('');
    }
  }

  function currentQueryString(overrides: FilterStateOverrides = {}) {
    const nextQuery = overrides.query ?? query;
    const nextStatus = overrides.status ?? status;
    const nextPayment = overrides.payment ?? payment;
    const nextOrigin = overrides.origin ?? origin;
    const nextPeriod = overrides.period ?? period;
    const nextDate = overrides.selectedDate ?? selectedDate;
    const nextSort = overrides.sort ?? sort;
    const nextAdvancedOpen = overrides.advancedOpen ?? advancedOpen;
    const nextPedido = Object.prototype.hasOwnProperty.call(overrides, 'pedido') ? overrides.pedido : orderParam || null;
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (nextStatus !== 'Todos') params.set('status', nextStatus);
    if (nextPayment !== 'Todos') params.set('pagamento', nextPayment);
    if (nextOrigin !== 'Todos') params.set('origem', nextOrigin);
    if (nextSort !== 'recentes') params.set('ordem', nextSort);
    if (nextAdvancedOpen) params.set('filtros', '1');
    if (nextPeriod !== 'all') params.set('periodo', nextPeriod);
    if (nextPeriod === 'date' && nextDate) params.set('data', nextDate);
    if (nextPedido) params.set('pedido', nextPedido);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  function replaceFilters(overrides: FilterStateOverrides = {}) {
    router.replace(`/pedidos${currentQueryString(overrides)}`, { scroll: false });
  }

  function openDetails(order: Order) {
    router.push(`/pedidos${currentQueryString({ pedido: order.id })}`, { scroll: false });
  }

  function closeDetails() {
    if (params.id || orderParam) router.replace(`/pedidos${currentQueryString({ pedido: null })}`, { scroll: false });
  }

  function selectPeriod(nextPeriod: PeriodFilter) {
    let nextDate = selectedDate;
    if (nextPeriod === 'date') {
      nextDate = toDateInputValue(new Date());
      setSelectedDate(nextDate);
    }
    setPeriod(nextPeriod);
    replaceFilters({ period: nextPeriod, selectedDate: nextDate });
  }

  function updateStatus(nextStatus: StatusFilter) {
    setStatus(nextStatus);
    replaceFilters({ status: nextStatus });
  }

  function updatePayment(nextPayment: PaymentFilter) {
    setPayment(nextPayment);
    replaceFilters({ payment: nextPayment });
  }

  function updateOrigin(nextOrigin: OriginFilter) {
    setOrigin(nextOrigin);
    replaceFilters({ origin: nextOrigin });
  }

  function updateSort(nextSort: SortFilter) {
    setSort(nextSort);
    replaceFilters({ sort: nextSort });
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    input.showPicker?.();
    input.focus();
  }

  function openManualSale() {
    setManualSaleOpen(true);
    if (!products.length) void loadProducts();
  }

  useEffect(() => {
    if (searchParams.get('novo') !== '1') return;

    const timer = window.setTimeout(() => {
      setManualSaleOpen(true);
      if (!products.length) void loadProducts();

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete('novo');
      const queryString = nextParams.toString();
      router.replace(`/pedidos${queryString ? `?${queryString}` : ''}`, { scroll: false });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProducts, products.length, router, searchParams]);

  return (
    <section className="admin-ops-page admin-orders-page">
      <PageHeader
        eyebrow="Operação"
        title="Pedidos"
        description="Gerencie todos os pedidos, status, pagamentos e entregas do painel."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-button admin-button-primary" onClick={openManualSale}>
              <Store className="size-4" />
              Venda presencial
            </button>
            <button type="button" className="admin-button admin-button-soft" onClick={loadOrders} disabled={loading}>
              <RefreshCw className="size-4" />
              Atualizar
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

      <section className="ops-status-strip" aria-label="Resumo por status">
        {tabs.map((item) => {
          const active = status === item.value;
          return (
            <button key={item.value} type="button" className={active ? 'is-active' : ''} style={{ '--ops-tone': item.tone } as CSSProperties} onClick={() => updateStatus(item.value)}>
              <item.icon className="size-5" />
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          );
        })}
      </section>

      <RecentOrderSummary order={recentOrder} onDetails={recentOrder ? () => openDetails(recentOrder) : undefined} />

      <UnresolvedOrdersSection
        orders={unresolvedOrders}
        savingId={savingId}
        onDetails={openDetails}
        onStatusChange={(order, next) => handleUpdate(order, next)}
        onShowAll={() => {
          setStatus('Abertos');
          setPeriod('all');
          replaceFilters({ status: 'Abertos', period: 'all' });
        }}
      />

      <section className={`ops-toolbar ${advancedOpen ? 'is-expanded' : ''}`}>
        <label className="ops-search">
          <Search className="size-5" />
          <input
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              replaceFilters({ query: nextQuery });
            }}
            placeholder="Buscar pedidos, clientes ou endereço..."
          />
        </label>
        <button
          type="button"
          className="ops-icon-button"
          aria-label="Mostrar filtros"
          aria-expanded={advancedOpen}
          onClick={() => {
            const nextOpen = !advancedOpen;
            setAdvancedOpen(nextOpen);
            replaceFilters({ advancedOpen: nextOpen });
          }}
        >
          <Filter className="size-5" />
        </button>
        <label className="ops-filter-field ops-date-field" onClick={openDatePicker}>
          <CalendarDays className="size-5" />
          <span>Data:</span>
          <strong>{period === 'all' ? 'Todas' : dateLabel(selectedDate)}</strong>
          <input
            ref={dateInputRef}
            aria-label="Data dos pedidos"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setSelectedDate(nextDate);
              setPeriod('date');
              replaceFilters({ selectedDate: nextDate, period: 'date' });
            }}
          />
        </label>
        <label className="ops-filter-field ops-payment-field">
          <CreditCard className="size-5" />
          <span>Pagamento:</span>
          <select value={payment} onChange={(event) => updatePayment(event.target.value as PaymentFilter)}>
            <option>Todos</option>
            {paymentStatuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown className="size-4" />
        </label>
        <label className="ops-filter-field ops-origin-field">
          <Globe2 className="size-5" />
          <span>Canal:</span>
          <select value={origin} onChange={(event) => updateOrigin(event.target.value as OriginFilter)}>
            {originOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown className="size-4" />
        </label>
        <label className="ops-filter-field ops-sort-field">
          <SlidersHorizontal className="size-5" />
          <span>Ordenar:</span>
          <select value={sort} onChange={(event) => updateSort(event.target.value as SortFilter)}>
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
            <option value="valor">Maior valor</option>
          </select>
          <ChevronDown className="size-4" />
        </label>

      </section>

      {advancedOpen ? (
        <section className="ops-period-strip" aria-label="Filtro de período">
          {periodOptions.map((item) => (
            <button key={item.value} type="button" className={period === item.value ? 'is-active' : ''} onClick={() => selectPeriod(item.value)}>
              {item.label}
            </button>
          ))}
        </section>
      ) : null}

      <div className="ops-list-header">
        <span>Ordenar por: <strong>{sortLabel(sort)}</strong> · Canal: <strong>{origin === 'Todos' ? 'Todos' : originLabel(origin)}</strong></span>
        <strong>{filtered.length} pedidos encontrados</strong>
        <button type="button" onClick={loadOrders} aria-label="Atualizar pedidos" disabled={loading}>
          <RefreshCw className="size-4" />
        </button>
      </div>

      {!loading && !filtered.length ? (
        <EmptyState title="Nenhum pedido encontrado" description="Ajuste a busca ou filtros para encontrar outros pedidos." />
      ) : (
        <section className="ops-order-list">
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} saving={savingId === order.id} onDetails={() => openDetails(order)} onStatusChange={(next) => handleUpdate(order, next)} />
          ))}
        </section>
      )}

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={closeDetails}
        onStatusChange={(order, nextStatus, nextPayment) => handleUpdate(order, nextStatus, nextPayment)}
        onDelete={handleDeleteOrder}
        saving={savingId === selectedOrder?.id}
      />
      <button type="button" className="ops-floating-action ops-order-floating-action" onClick={openManualSale}>
        <Plus className="size-7" />
        <span>Novo pedido</span>
      </button>
      {manualSaleOpen ? (
        <ManualSaleDialog
          products={products}
          loading={loadingProducts}
          onRefreshProducts={loadProducts}
          onClose={() => setManualSaleOpen(false)}
          onSubmit={handleCreateManualOrder}
        />
      ) : null}
    </section>
  );
}

function RecentOrderSummary({ order, onDetails }: { order: Order | null; onDetails?: () => void }) {
  return (
    <section className="ops-recent-order" aria-label="Ultimo movimento de pedido">
      <div>
        <span className="ops-overview-kicker">Ultimo movimento</span>
        {order ? (
          <>
            <strong>#{order.code}</strong>
            <p>{order.customer.name || 'Cliente'} - {money(order.total)} - {shortDate(order.createdAt)}</p>
          </>
        ) : (
          <>
            <strong>Sem pedidos cadastrados</strong>
            <p>O ultimo pedido aparecera aqui assim que for registrado.</p>
          </>
        )}
      </div>
      {order ? (
        <div className="ops-recent-order-meta">
          <span><OriginIcon origin={order.origin} /> {originLabel(order.origin)}</span>
          <span><CreditCard className="size-4" /> {order.paymentStatus}</span>
          <span><PackageCheck className="size-4" /> {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
        </div>
      ) : null}
      {onDetails ? <button type="button" onClick={onDetails}>Ver detalhes</button> : null}
    </section>
  );
}

function UnresolvedOrdersSection({
  orders,
  savingId,
  onDetails,
  onStatusChange,
  onShowAll
}: {
  orders: Order[];
  savingId: string;
  onDetails: (order: Order) => void;
  onStatusChange: (order: Order, next: OrderStatus) => void;
  onShowAll: () => void;
}) {
  const visible = orders.slice(0, 4);

  return (
    <section className="ops-unresolved-section">
      <header>
        <span><PackageCheck className="size-5" /></span>
        <div>
          <h2>Pedidos para resolver</h2>
          <p>{orders.length ? `${orders.length} pedido(s) aberto(s), mesmo fora da data atual.` : 'Nenhum pedido pendente fora do fluxo.'}</p>
        </div>
        <button type="button" onClick={onShowAll}>Ver abertos</button>
      </header>
      {visible.length ? (
        <div className="ops-unresolved-list">
          {visible.map((order) => {
            const meta = statusMeta[order.status];
            const next = meta.action?.next;
            return (
              <article key={order.id} style={{ '--ops-tone': meta.tone } as CSSProperties}>
                <button type="button" onClick={() => onDetails(order)}>#{order.code}</button>
                <span>{meta.short}</span>
                <strong>{order.customer.name || 'Cliente'}</strong>
                <small>{shortDate(order.createdAt)} · {money(order.total)}</small>
                <div>
                  <button type="button" onClick={() => onDetails(order)}>Detalhes</button>
                  {next ? (
                    <button type="button" disabled={savingId === order.id} onClick={() => onStatusChange(order, next)}>
                      {meta.action?.label}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

type SaleCartItem = {
  key: string;
  productId: string;
  variationId?: string | null;
  name: string;
  variationName?: string;
  price: number;
  stock: number | null;
  image?: string;
  quantity: number;
};

type SaleChoice = Omit<SaleCartItem, 'quantity'> & {
  sku: string;
  category: string;
};

function ManualSaleDialog({
  products,
  loading,
  onRefreshProducts,
  onClose,
  onSubmit
}: {
  products: Product[];
  loading: boolean;
  onRefreshProducts: () => Promise<void>;
  onClose: () => void;
  onSubmit: (input: ManualOrderInput) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<SaleCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [payment, setPayment] = useState('Dinheiro');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pago');
  const [status, setStatus] = useState<OrderStatus>('Entregue');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(subtotal - Number(discount || 0), 0);
  const choices = useMemo<SaleChoice[]>(() => buildSaleChoices(products), [products]);
  const filteredChoices = useMemo(() => {
    const clean = query.toLowerCase().trim();
    return choices
      .filter((choice) => {
        if (!clean) return true;
        return [choice.name, choice.variationName, choice.sku, choice.category].join(' ').toLowerCase().includes(clean);
      })
      .slice(0, 18);
  }, [choices, query]);

  function addToCart(choice: SaleChoice) {
    setCart((current) => {
      const existing = current.find((item) => item.key === choice.key);
      if (existing) {
        return current.map((item) => (item.key === choice.key ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...choice, quantity: 1 }];
    });
  }

  function changeQuantity(key: string, quantity: number) {
    setCart((current) => current.map((item) => (item.key === key ? { ...item, quantity: Math.max(1, quantity) } : item)));
  }

  async function submitSale() {
    if (!cart.length) return;
    setSaving(true);
    try {
      await onSubmit({
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: 'Venda presencial na loja'
        },
        payment,
        paymentStatus,
        status,
        discount: Number(discount || 0),
        notes,
        items: cart.map((item) => ({
          productId: item.productId,
          variationId: item.variationId,
          name: item.name,
          variationName: item.variationName,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        }))
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ops-sale-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="ops-sale-modal" role="dialog" aria-modal="true" aria-labelledby="manual-sale-title">
        <header>
          <div>
            <span>Loja fisica</span>
            <h2 id="manual-sale-title">Venda presencial</h2>
            <p>Registre compras feitas fora do site. O pedido entra no financeiro, historico e baixa o estoque.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar venda presencial">
            <X className="size-5" />
          </button>
        </header>

        <div className="ops-sale-grid">
          <section className="ops-sale-products">
            <div className="ops-sale-search">
              <Search className="size-5" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto, SKU ou categoria..." />
              <button type="button" onClick={onRefreshProducts} disabled={loading}>
                <RefreshCw className="size-4" />
              </button>
            </div>
            <div className="ops-sale-choice-list">
              {filteredChoices.map((choice) => (
                <button key={choice.key} type="button" onClick={() => addToCart(choice)}>
                  {choice.image ? <img src={resolveAdminImageUrl(choice.image)} alt="" /> : <PackageCheck className="size-5" />}
                  <span>
                    <strong>{choice.name}</strong>
                    <small>{choice.variationName || choice.category} · SKU {choice.sku || 'sem SKU'}</small>
                  </span>
                  <em>{money(choice.price)}</em>
                </button>
              ))}
              {!filteredChoices.length ? <p>Nenhum produto encontrado.</p> : null}
            </div>
          </section>

          <section className="ops-sale-cart">
            <h3><ShoppingCart className="size-5" /> Carrinho presencial</h3>
            <div className="ops-sale-cart-list">
              {cart.map((item) => (
                <article key={item.key}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.variationName || 'Produto principal'} · {money(item.price)}</small>
                  </div>
                  <div className="ops-sale-qty">
                    <button type="button" onClick={() => changeQuantity(item.key, item.quantity - 1)}><Minus className="size-4" /></button>
                    <input type="number" min={1} value={item.quantity} onChange={(event) => changeQuantity(item.key, Number(event.target.value || 1))} />
                    <button type="button" onClick={() => changeQuantity(item.key, item.quantity + 1)}><Plus className="size-4" /></button>
                  </div>
                  <button type="button" className="ops-sale-remove" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.key !== item.key))}>
                    <X className="size-4" />
                  </button>
                </article>
              ))}
              {!cart.length ? <p>Adicione produtos para registrar a venda.</p> : null}
            </div>

            <div className="ops-sale-form">
              <label>
                Cliente
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Cliente presencial" />
              </label>
              <label>
                Telefone
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Opcional" />
              </label>
              <label>
                E-mail
                <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Opcional" />
              </label>
              <label>
                Pagamento
                <select value={payment} onChange={(event) => setPayment(event.target.value)}>
                  <option>Dinheiro</option>
                  <option>PIX</option>
                  <option>Cartao de debito</option>
                  <option>Cartao de credito</option>
                  <option>Pagar depois</option>
                </select>
              </label>
              <label>
                Status pagamento
                <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}>
                  {paymentStatuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Status pedido
                <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>
                  <option>Entregue</option>
                  <option>Recebido</option>
                  <option>Em separaÃ§Ã£o</option>
                </select>
              </label>
              <label>
                Desconto
                <input type="number" min={0} step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value || 0))} />
              </label>
              <label className="is-wide">
                Observacao
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: venda no balcão, cliente sem cadastro..." />
              </label>
            </div>

            <footer>
              <p><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
              <p><span>Desconto</span><strong>-{money(discount)}</strong></p>
              <p><span>Total</span><strong>{money(total)}</strong></p>
              <button type="button" onClick={submitSale} disabled={saving || !cart.length}>
                <CheckCircle2 className="size-5" />
                Registrar venda presencial
              </button>
            </footer>
          </section>
        </div>
      </section>
    </div>
  );
}

function buildSaleChoices(products: Product[]): SaleChoice[] {
  const choices: SaleChoice[] = [];
  products
    .filter((product) => product.active)
    .forEach((product) => {
      if (!product.variations.length) {
        choices.push({
          key: product.id,
          productId: product.id,
          variationId: null,
          name: product.name,
          variationName: '',
          sku: product.id.replace(/\D/g, '').slice(-8),
          category: product.category,
          price: Number(product.promoPrice || product.price || 0),
          stock: product.stock,
          image: product.image
        });
        return;
      }

      product.variations
        .filter((variation) => variation.active)
        .forEach((variation) => {
          choices.push({
            key: `${product.id}:${variation.id}`,
            productId: product.id,
            variationId: variation.id,
            name: product.name,
            variationName: variation.name,
            sku: variation.sku,
            category: product.category,
            price: Number(variation.promoPrice || variation.price || product.promoPrice || product.price || 0),
            stock: variation.stock,
            image: variation.image || product.image
          });
        });
    });

  return choices.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

function OrderRow({ order, saving, onDetails, onStatusChange }: { order: Order; saving: boolean; onDetails: () => void; onStatusChange: (next: OrderStatus) => void }) {
  const meta = statusMeta[order.status];
  const action = meta.action;
  const canCancel = order.status !== 'Entregue' && order.status !== 'Cancelado';
  const actionCount = 1 + (action ? 1 : 0) + (canCancel ? 1 : 0);

  return (
    <article className="ops-order-card" style={{ '--ops-tone': meta.tone } as CSSProperties}>
      <div className="ops-order-main">
        <div className="ops-order-title-row">
          <button type="button" onClick={onDetails}>#{order.code}</button>
          <span>{meta.short}</span>
          <OriginPill origin={order.origin} />
        </div>
        <p>
          <UserRound className="size-4" />
          {order.customer.name || 'Cliente'}
        </p>
        <p>
          <MapPin className="size-4" />
          {order.customer.address || 'Endereço não informado'}
        </p>
      </div>

      <div className="ops-order-facts">
        <p><PackageCheck className="size-4" /> {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</p>
        <p><CreditCard className="size-4" /> {money(order.total)}</p>
        <p><CreditCard className="size-4" /> {order.payment || order.paymentStatus || 'Pagamento'}</p>
        <p><OriginIcon origin={order.origin} /> {originLabel(order.origin)}</p>
        <p><CalendarDays className="size-4" /> {shortDate(order.createdAt)}</p>
      </div>

      <div className="ops-order-actions" data-actions={actionCount}>
        <button type="button" className="ops-action ops-action-outline" onClick={onDetails}>
          <Eye className="size-4" />
          Ver detalhes
        </button>
        {action ? (
          <button type="button" className={`ops-action ${action.className}`} onClick={() => onStatusChange(action.next)} disabled={saving}>
            <action.icon className="size-4" />
            {action.label}
          </button>
        ) : null}
        {canCancel ? (
          <button type="button" className="ops-action ops-action-danger" onClick={() => onStatusChange('Cancelado')} disabled={saving}>
            <Ban className="size-4" />
            Cancelar
          </button>
        ) : null}
      </div>
    </article>
  );
}

function OriginPill({ origin }: { origin: OrderOrigin }) {
  const meta = originMeta[origin];
  return (
    <span className="ops-origin-pill" style={{ '--origin-tone': meta.tone } as CSSProperties}>
      {originLabel(origin)}
    </span>
  );
}

function OriginIcon({ origin }: { origin: OrderOrigin }) {
  if (origin === 'presencial') return <Store className="size-4" />;
  if (origin === 'telefone') return <Phone className="size-4" />;
  if (origin === 'whatsapp') return <MessageCircle className="size-4" />;
  return <Globe2 className="size-4" />;
}

function normalizeStatus(value: string | null): StatusFilter {
  if (!value || value === 'Todos') return 'Todos';
  if (value === 'Abertos') return 'Abertos';
  return orderStatuses.some((item) => item.value === value) ? (value as OrderStatus) : 'Todos';
}

function normalizePayment(value: string | null): PaymentFilter {
  if (!value || value === 'Todos') return 'Todos';
  return paymentStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : 'Todos';
}

function normalizeOrigin(value: string | null): OriginFilter {
  if (!value || value === 'Todos') return 'Todos';
  return originOptions.some((item) => item.value === value) ? (value as OrderOrigin) : 'Todos';
}

function normalizeSort(value: string | null): SortFilter {
  if (value === 'antigos' || value === 'valor') return value;
  return 'recentes';
}

function normalizePeriod(value: string | null, statusValue: string | null, dateValue: string | null, startValue: string | null, endValue: string | null): PeriodFilter {
  if (startValue && endValue) return 'range';
  if (periodOptions.some((item) => item.value === value)) return value as PeriodFilter;
  if (value === 'all' || statusValue === 'Abertos') return 'all';
  if (dateValue) return 'date';
  return 'date';
}

function matchesStatus(order: Order, status: StatusFilter) {
  if (status === 'Todos') return true;
  if (status === 'Abertos') return order.status !== 'Entregue' && order.status !== 'Cancelado';
  if (status === 'Recebido') return order.status === 'Recebido' || order.status === 'A confirmar';
  return order.status === status;
}

function matchesPeriod(order: Order, dateValue: string, period: PeriodFilter) {
  if (period === 'all') return true;
  if (period !== 'date' && period !== 'range') return isOrderWithinPeriod(order, period);
  return isOrderOnDate(order, dateValue);
}

function isOrderWithinPeriod(order: Order, period: Exclude<PeriodFilter, 'date' | 'range' | 'all'>) {
  const createdAt = new Date(order.createdAt);
  if (!Number.isFinite(createdAt.getTime())) return false;

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);

  const match = /^(\d+)([dmy])$/.exec(period);
  if (!match) return false;

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit === 'd') {
    start.setDate(start.getDate() - (amount - 1));
  } else if (unit === 'm') {
    start.setMonth(start.getMonth() - amount);
  } else {
    start.setFullYear(start.getFullYear() - amount);
  }

  return createdAt >= start && createdAt <= end;
}

function isOrderOnDate(order: Order, dateValue: string) {
  const selected = parseDateInput(dateValue);
  const createdAt = new Date(order.createdAt);
  return Number.isFinite(createdAt.getTime()) && createdAt.toDateString() === selected.toDateString();
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateLabel(value: string) {
  const selected = parseDateInput(value);
  const day = String(selected.getDate()).padStart(2, '0');
  const month = String(selected.getMonth() + 1).padStart(2, '0');
  const year = String(selected.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function parseDateInput(value: string) {
  const fallback = toDateInputValue(new Date());
  const [year, month, day] = (value || fallback).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function sortLabel(sort: SortFilter) {
  if (sort === 'valor') return 'Maior valor';
  if (sort === 'antigos') return 'Mais antigos';
  return 'Mais recentes';
}

function originLabel(origin: OrderOrigin) {
  return originLabels[origin] || 'Site';
}
