'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock3,
  DollarSign,
  MonitorCog,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Wallet,
  type LucideIcon
} from 'lucide-react';
import { fetchAdminOrders, fetchAdminProducts } from '@/lib/admin-services';
import { getStoreBusinessHourBuckets, getStoreBusinessHours } from '@/lib/business-hours';
import { money, shortDate } from '@/lib/format';
import { canAccessModule } from '@/lib/module-access';
import type { DashboardMetrics, Order, OrderStatus, Product } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonPanel } from '@/components/ui/skeleton';

const dashboardRangeOptions = [
  { value: 'all', label: 'Todos os pedidos', days: 0 },
  { value: 'today', label: 'Hoje', days: 1 },
  { value: 'yesterday', label: 'Ontem', days: 1 },
  { value: '2d', label: '2 dias', days: 2 },
  { value: '3d', label: '3 dias', days: 3 },
  { value: '5d', label: '5 dias', days: 5 },
  { value: '7d', label: '7 dias', days: 7 },
  { value: '15d', label: '15 dias', days: 15 },
  { value: '30d', label: '30 dias', days: 30 },
  { value: '2m', label: '2 meses', days: 60 },
  { value: '3m', label: '3 meses', days: 90 },
  { value: '6m', label: '6 meses', days: 180 },
  { value: '1y', label: '1 ano', days: 365 },
  { value: '2y', label: '2 anos', days: 730 },
  { value: '3y', label: '3 anos', days: 1095 },
  { value: '4y', label: '4 anos', days: 1460 },
  { value: '5y', label: '5 anos', days: 1825 }
] as const;

type DashboardPresetRange = (typeof dashboardRangeOptions)[number]['value'];
type DashboardRange = DashboardPresetRange | 'date';
const separationStatus: OrderStatus = 'Em separação';
const dashboardOrderStatuses: OrderStatus[] = ['Recebido', 'A confirmar', separationStatus, 'A caminho', 'Entregue', 'Cancelado'];
const dashboardRangeLabels = Object.fromEntries(dashboardRangeOptions.map((option) => [option.value, option.label])) as Record<DashboardPresetRange, string>;

function calculateMetrics(orders: Order[], products: Product[]): DashboardMetrics {
  const validOrders = orders.filter(isValidRevenueOrder);
  const revenue = validOrders.reduce((sum, order) => sum + order.total, 0);

  return {
    totalOrders: orders.length,
    todayOrders: orders.length,
    revenue,
    averageTicket: validOrders.length ? revenue / validOrders.length : 0,
    activeProducts: products.filter((product) => product.active && product.storeVisible).length,
    lowStock: products.filter((product) => product.stock !== null && product.stock <= product.minStock).length,
    deliveredOrders: orders.filter((order) => order.status === 'Entregue').length,
    openOrders: orders.filter(isOpenOrder).length
  };
}

export function DashboardPage() {
  const { profile, orders, products, loading, error, setOrders, setProducts, setLoading, setError } = useAdminStore();
  const [dashboardQuery, setDashboardQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('today');
  const dateInputRef = useRef<HTMLInputElement>(null);

  function selectDashboardPreset(nextRange: DashboardPresetRange) {
    const target = new Date();
    if (nextRange === 'yesterday') target.setDate(target.getDate() - 1);
    setSelectedDate(toDateInputValue(target));
    setDashboardRange(nextRange);
  }

  async function reloadDashboard() {
    try {
      setLoading(true);
      const [nextOrders, nextProducts] = await Promise.all([fetchAdminOrders(), fetchAdminProducts()]);
      setOrders(nextOrders);
      setProducts(nextProducts);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao atualizar dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [nextOrders, nextProducts] = await Promise.all([fetchAdminOrders(), fetchAdminProducts()]);
        if (!active) return;
        setOrders(nextOrders);
        setProducts(nextProducts);
        setError('');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [setError, setLoading, setOrders, setProducts]);

  const filteredOrders = useMemo(() => orders.filter((order) => matchesDashboardRange(order.createdAt, dashboardRange, selectedDate)), [dashboardRange, orders, selectedDate]);
  const dateBounds = useMemo(() => getDashboardDateBounds(orders, dashboardRange, selectedDate), [dashboardRange, orders, selectedDate]);
  const previousOrders = useMemo(
    () => orders.filter((order) => matchesPreviousDashboardRange(order.createdAt, dashboardRange, dateBounds)),
    [dashboardRange, dateBounds, orders]
  );
  const chartOrders = useMemo(() => filteredOrders.filter(isValidRevenueOrder), [filteredOrders]);
  const previousChartOrders = useMemo(() => previousOrders.filter(isValidRevenueOrder), [previousOrders]);
  const chartRevenue = useMemo(() => chartOrders.reduce((sum, order) => sum + order.total, 0), [chartOrders]);
  const chartDelta = useMemo(
    () => (dashboardRange === 'all' ? 0 : calculatePercentChange(chartRevenue, previousChartOrders.reduce((sum, order) => sum + order.total, 0))),
    [chartRevenue, dashboardRange, previousChartOrders]
  );
  const metrics = useMemo(() => calculateMetrics(filteredOrders, products), [filteredOrders, products]);
  const previousMetrics = useMemo(() => calculateMetrics(previousOrders, products), [previousOrders, products]);
  const periodCustomers = useMemo(() => countUniqueCustomers(filteredOrders), [filteredOrders]);
  const previousCustomers = useMemo(() => countUniqueCustomers(previousOrders), [previousOrders]);
  const metricDeltas = useMemo(
    () => dashboardRange === 'all' ? ({
      orders: 0,
      revenue: 0,
      ticket: 0,
      customers: 0
    }) : ({
      orders: calculatePercentChange(metrics.totalOrders, previousMetrics.totalOrders),
      revenue: calculatePercentChange(metrics.revenue, previousMetrics.revenue),
      ticket: calculatePercentChange(metrics.averageTicket, previousMetrics.averageTicket),
      customers: calculatePercentChange(periodCustomers, previousCustomers)
    }),
    [dashboardRange, metrics.averageTicket, metrics.revenue, metrics.totalOrders, periodCustomers, previousCustomers, previousMetrics.averageTicket, previousMetrics.revenue, previousMetrics.totalOrders]
  );
  const openOrders = orders.filter(isOpenOrder).slice(0, 8);
  const lowStock = products.filter((product) => product.stock !== null && product.stock <= product.minStock).slice(0, 6);
  const recentOrders = filteredOrders.slice(0, 5);
  const statusCounts = useMemo(() => getStatusCounts(filteredOrders), [filteredOrders]);
  const periodLabel = useMemo(() => getDashboardRangeLabel(dashboardRange, selectedDate, dateBounds), [dashboardRange, dateBounds, selectedDate]);
  const heroTitle = useMemo(() => getDashboardHeroTitle(dashboardRange, selectedDate), [dashboardRange, selectedDate]);
  const heroDescription = useMemo(() => getDashboardHeroDescription(dashboardRange, selectedDate), [dashboardRange, selectedDate]);
  const selectedBusinessHoursLabel = useMemo(() => getStoreBusinessHours(parseDateInput(selectedDate)).label, [selectedDate]);
  const searchResults = useMemo(() => {
    const clean = dashboardQuery.toLowerCase().trim();
    if (!clean) return { orders: [] as Order[], products: [] as Product[] };
    return {
      orders: orders
        .filter((order) => [order.code, order.customer.name, order.customer.phone, order.customer.address].join(' ').toLowerCase().includes(clean))
        .slice(0, 4),
      products: products
        .filter((product) => [product.name, product.category, product.description].join(' ').toLowerCase().includes(clean))
        .slice(0, 4)
    };
  }, [dashboardQuery, orders, products]);
  const developer = profile?.role === 'developer';
  const role = profile?.role || 'cliente';
  const moduleAccess = profile?.moduleAccess;
  const canSeeFinance = canAccessModule(role, moduleAccess, 'financeiro');
  const canSeeClients = canAccessModule(role, moduleAccess, 'clientes');
  const financeHref = canSeeFinance ? '/financeiro' : '/pedidos';
  const financeLabel = canSeeFinance ? 'Ver financeiro' : 'Ver pedidos';
  const comparisonLabel = dashboardRange === 'all' ? 'historico carregado' : 'vs periodo anterior';
  const metricCards = [
    { href: dashboardOrdersHref(dashboardRange, selectedDate, dateBounds), icon: ShoppingBag, label: 'Pedidos', value: String(metrics.totalOrders), trend: metrics.openOrders ? `${metrics.openOrders} em aberto` : 'tudo resolvido', delta: metricDeltas.orders, tone: 'purple' as const },
    ...(canSeeFinance ? [{ href: financeDashboardHref(dashboardRange, selectedDate), icon: DollarSign, label: 'Faturamento', value: money(metrics.revenue), trend: comparisonLabel, delta: metricDeltas.revenue, tone: 'blue' as const }] : []),
    { href: dashboardOrdersHref(dashboardRange, selectedDate, dateBounds, 'Entregue'), icon: Wallet, label: 'Ticket medio', value: money(metrics.averageTicket), trend: `${metrics.deliveredOrders} entregues`, delta: metricDeltas.ticket, tone: 'teal' as const },
    ...(canSeeClients ? [{ href: '/clientes', icon: Package, label: 'Clientes', value: String(periodCustomers), trend: comparisonLabel, delta: metricDeltas.customers, tone: 'orange' as const }] : [])
  ];
  const quickActions = developer
    ? [
        { href: '/logs', icon: MonitorCog, label: 'Logs', tone: 'blue' as const },
        { href: '/usuarios', icon: ShieldCheck, label: 'Usuarios', tone: 'teal' as const },
        { href: '/configuracoes', icon: BarChart3, label: 'Config', tone: 'purple' as const },
        { href: '/produtos', icon: Package, label: 'Produtos', tone: 'orange' as const },
        { href: '/pedidos', icon: ClipboardList, label: 'Pedidos', tone: 'red' as const },
        { href: '/relatorios', icon: BarChart3, label: 'Relatorios', tone: 'pink' as const }
      ]
    : [
        { href: '/pedidos', icon: ClipboardList, label: 'Pedidos', tone: 'purple' as const },
        { href: '/produtos?novo=1', icon: Package, label: 'Novo produto', tone: 'teal' as const },
        { href: '/produtos', icon: ShoppingBag, label: 'Produtos', tone: 'blue' as const },
        { href: '/estoque', icon: Truck, label: 'Estoque', tone: 'orange' as const }
      ];

  return (
    <>
      <PageHeader
        className="admin-dashboard-header"
        eyebrow="Operacao"
        title={heroTitle}
        description={developer ? `${heroDescription} Auditoria e operacao completa permanecem disponiveis.` : heroDescription}
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="admin-button admin-button-primary" href="/pedidos?novo=1">
              <ClipboardList className="size-4" />
              Novo pedido
            </Link>
            <Link className="admin-button admin-button-gold" href="/produtos?novo=1">
              <Package className="size-4" />
              Cadastrar produto
            </Link>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/15 p-4 text-sm font-semibold text-red-100">{error}</div> : null}
      {loading && !orders.length ? (
        <SkeletonPanel />
      ) : (
        <div className="admin-dashboard space-y-4">
          <section className="admin-dashboard-tools">
            <label className="admin-dashboard-search">
              <Search className="size-4" />
              <input placeholder="Buscar..." value={dashboardQuery} onChange={(event) => setDashboardQuery(event.target.value)} />
            </label>
            <label className={`admin-dashboard-filter-card admin-dashboard-date-card ${dashboardRange === 'date' ? 'is-active' : ''}`}>
              <span><CalendarDays className="size-5" /></span>
              <div>
                <small>Escolher uma data</small>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onClick={(event) => openDatePicker(event.currentTarget)}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setDashboardRange('date');
                  }}
                  aria-label="Escolher data do dashboard"
                />
              </div>
            </label>
            <label className="admin-dashboard-filter-card admin-dashboard-range-card">
              <span><Clock3 className="size-5" /></span>
              <div>
                <small>Periodo</small>
                <select
                  value={dashboardRange}
                  onChange={(event) => {
                    const nextRange = event.target.value as DashboardRange;
                    if (nextRange === 'date') {
                      setDashboardRange(nextRange);
                      return;
                    }
                    selectDashboardPreset(nextRange);
                  }}
                  aria-label="Selecionar periodo do dashboard"
                >
                  <option value="date">Somente a data escolhida</option>
                  {dashboardRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <ChevronDown className="admin-dashboard-filter-chevron size-4" />
            </label>
            <button className="admin-dashboard-refresh" type="button" aria-label="Atualizar dashboard" onClick={reloadDashboard} disabled={loading}>
              <RefreshCw className="size-4" />
            </button>
          </section>

          {dashboardQuery.trim() ? (
            <section className="admin-dashboard-panel admin-dashboard-search-results">
              <div className="admin-panel-heading">
                <h2>Resultado da busca</h2>
                <button type="button" onClick={() => setDashboardQuery('')}>Limpar</button>
              </div>
              <div className="admin-search-result-grid">
                <div>
                  <strong>Pedidos</strong>
                  {searchResults.orders.length ? (
                    searchResults.orders.map((order) => <RecentOrderRow key={order.id} order={order} />)
                  ) : (
                    <p className="admin-empty-line">Nenhum pedido.</p>
                  )}
                </div>
                <div>
                  <strong>Produtos</strong>
                  {searchResults.products.length ? (
                    searchResults.products.map((product) => <LowStockRow key={product.id} product={product} />)
                  ) : (
                    <p className="admin-empty-line">Nenhum produto.</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <section className="admin-dashboard-metrics">
            {metricCards.map((card) => (
              <DashboardMetric key={card.label} {...card} />
            ))}
          </section>

          <p className="admin-dashboard-day-note">
            Indicadores de <strong>{periodLabel}</strong>. No grafico por hora, a escala segue o funcionamento da loja: <strong>{selectedBusinessHoursLabel}</strong>.
          </p>

          <section className="admin-dashboard-charts">
            <article className="admin-dashboard-panel">
              <div className="admin-panel-heading admin-chart-heading">
                <div>
                  <h2>{isSingleDateDashboardRange(dashboardRange) ? 'Faturamento por hora' : 'Faturamento do periodo'}</h2>
                  <span>{periodLabel}</span>
                </div>
              </div>
              <div className="admin-panel-total">
                <strong>{money(chartRevenue)}</strong>
                <TrendBadge value={chartDelta} label={comparisonLabel} />
              </div>
              <WeeklyRevenueChart orders={chartOrders} startDate={dateBounds.startDate} endDate={dateBounds.endDate} range={dashboardRange} trend={chartDelta} />
            </article>

            <article className="admin-dashboard-panel">
              <div className="admin-panel-heading">
                <h2>Status dos pedidos</h2>
              </div>
              <OrderStatusDonut
                total={filteredOrders.length}
                counts={statusCounts}
                periodLabel={periodLabel}
                startDate={dateBounds.startDate}
                endDate={dateBounds.endDate}
              />
            </article>
          </section>

          <section className="admin-dashboard-panel">
            <div className="admin-panel-heading">
              <h2>Acoes rapidas</h2>
            </div>
            <div className="admin-quick-action-grid">
              {quickActions.map((action) => (
                <QuickAction key={action.href} href={action.href} icon={action.icon} label={action.label} tone={action.tone} />
              ))}
            </div>
          </section>

          <section className="admin-dashboard-lists admin-dashboard-main-list">
            <article className="admin-dashboard-panel">
              <div className="admin-panel-heading">
                <h2>Pedidos recentes</h2>
                <Link href={dashboardOrdersHref(dashboardRange, selectedDate, dateBounds)}>Ver todos</Link>
              </div>
              <div className="admin-compact-list">
                {recentOrders.length ? recentOrders.map((order) => <RecentOrderRow key={order.id} order={order} />) : <p className="admin-empty-line">Nenhum pedido no periodo selecionado.</p>}
              </div>
            </article>

            <article className="admin-dashboard-panel">
              <div className="admin-panel-heading">
                <h2>Estoque baixo</h2>
                <Link href="/estoque">Ver todos</Link>
              </div>
              <div className="admin-compact-list">
                {lowStock.length ? lowStock.map((product) => <LowStockRow key={product.id} product={product} hrefBase="/estoque" />) : <p className="admin-empty-line">Sem produto critico.</p>}
              </div>
            </article>
          </section>

          <section className="admin-dashboard-lists">
            <article className="admin-dashboard-panel">
              <div className="admin-panel-heading">
                <h2>Pedidos para resolver</h2>
                <Link href="/pedidos?status=Abertos">Abrir</Link>
              </div>
              <div className="admin-compact-list">
                {openOrders.length ? openOrders.slice(0, 4).map((order) => <RecentOrderRow key={order.id} order={order} />) : <p className="admin-empty-line">Nenhum pedido em aberto.</p>}
              </div>
            </article>

            <article className="admin-dashboard-panel">
              <div className="admin-panel-heading">
                <h2>Resumo financeiro</h2>
                <Link href={financeHref}>{financeLabel}</Link>
              </div>
              <div className="admin-finance-summary">
                <p><span>Recebimentos</span><strong>{money(metrics.revenue)}</strong></p>
                <p><span>Produtos ativos</span><strong>{metrics.activeProducts}</strong></p>
                <p className="is-total"><span>Ticket medio</span><strong>{money(metrics.averageTicket)}</strong></p>
              </div>
            </article>
          </section>
        </div>
      )}
    </>
  );
}

type DashboardTone = 'purple' | 'blue' | 'teal' | 'orange' | 'red' | 'pink';

function DashboardMetric({
  href,
  icon: Icon,
  label,
  value,
  trend,
  delta,
  tone
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  trend: string;
  delta: number;
  tone: DashboardTone;
}) {
  const negative = delta < 0;
  const content = (
    <>
      <span><Icon className="size-5" /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      <TrendBadge value={delta} label={trend} />
    </>
  );

  return (
    <Link href={href} className={`admin-dashboard-metric tone-${tone} ${negative ? 'is-negative' : ''}`}>
      {content}
    </Link>
  );
}

function TrendBadge({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;

  return (
    <small className={`admin-trend-badge ${positive ? 'is-positive' : 'is-negative'}`}>
      <Icon className="size-3" />
      <span>{formatAbsolutePercent(value)}</span>
      <em>{label}</em>
    </small>
  );
}

function QuickAction({ href, icon: Icon, label, tone }: { href: string; icon: LucideIcon; label: string; tone: DashboardTone }) {
  return (
    <Link href={href} className={`admin-quick-action tone-${tone}`}>
      <Icon className="size-6" />
      <span>{label}</span>
    </Link>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  return (
    <Link href={`/pedidos?pedido=${encodeURIComponent(order.id)}`} className="admin-compact-row">
      <span className="admin-row-icon"><ShoppingBag className="size-4" /></span>
      <span className="min-w-0">
        <strong>#{order.code}</strong>
        <small>{order.customer.name || 'Cliente'} - {shortDate(order.createdAt)}</small>
      </span>
      <StatusBadge value={order.status} />
      <em>{money(order.total)}</em>
    </Link>
  );
}

function LowStockRow({ product, hrefBase = '/produtos' }: { product: Product; hrefBase?: '/produtos' | '/estoque' }) {
  const critical = (product.stock ?? 0) <= Math.max(2, product.minStock);
  return (
    <Link href={`${hrefBase}?produto=${encodeURIComponent(product.id)}`} className="admin-compact-row">
      <span className="admin-row-icon"><AlertTriangle className="size-4" /></span>
      <span className="min-w-0">
        <strong>{product.name}</strong>
        <small>Estoque: {product.stock ?? 0} un.</small>
      </span>
      <b className={critical ? 'is-critical' : ''}>{critical ? 'Critico' : 'Baixo'}</b>
    </Link>
  );
}

function getStatusCounts(orders: Order[]) {
  const initial = dashboardOrderStatuses.reduce(
    (counts, status) => ({ ...counts, [status]: 0 }),
    {} as Record<OrderStatus, number>
  );
  return orders.reduce((counts, order) => ({ ...counts, [order.status]: counts[order.status] + 1 }), initial);
}

function isOpenOrder(order: Order) {
  return !['Entregue', 'Cancelado'].includes(order.status);
}

function countUniqueCustomers(orders: Order[]) {
  const keys = new Set<string>();
  orders.forEach((order) => {
    const key = order.customer.email || order.customer.phone || order.customer.name || order.id;
    keys.add(key.trim().toLowerCase());
  });
  return keys.size;
}

function calculatePercentChange(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatAbsolutePercent(value: number) {
  return `${Math.abs(value).toFixed(1).replace('.', ',')}%`;
}

function formatDateShort(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(parseDateInput(value));
}

function formatDateLong(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseDateInput(value));
}

function formatDateDayMonth(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(parseDateInput(value));
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch {
      // Chrome can reject showPicker when the input is visually hidden.
    }
  }
  input.focus();
  input.click();
}

function ordersRangeHref(startDate: string, endDate: string, status?: OrderStatus) {
  const params = new URLSearchParams({ inicio: startDate, fim: endDate });
  if (status) params.set('status', status);
  return `/pedidos?${params.toString()}`;
}

function dashboardOrdersHref(range: DashboardRange, selectedDate: string, bounds: { startDate: string; endDate: string }, status?: OrderStatus) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (range === 'all') return params.size ? `/pedidos?${params.toString()}` : '/pedidos';
  if (isSingleDateDashboardRange(range)) {
    params.set('periodo', 'date');
    params.set('data', selectedDate);
  } else {
    params.set('inicio', bounds.startDate);
    params.set('fim', bounds.endDate);
  }
  return `/pedidos?${params.toString()}`;
}

function financeDashboardHref(range: DashboardRange, selectedDate: string) {
  const params = new URLSearchParams();
  params.set('periodo', range);
  params.set('data', selectedDate);
  return `/financeiro?${params.toString()}`;
}

function matchesDashboardRange(value: string, range: DashboardRange, selectedDate: string) {
  if (range === 'all') return true;
  const createdAt = new Date(value);
  if (!Number.isFinite(createdAt.getTime())) return false;
  const target = parseDateInput(selectedDate);
  const end = parseDateInput(selectedDate, true);
  if (isSingleDateDashboardRange(range)) return createdAt >= target && createdAt <= end;
  const start = addDays(target, -(getDashboardRangeDays(range) - 1));
  return createdAt >= start && createdAt <= end;
}

function matchesPreviousDashboardRange(value: string, range: DashboardRange, bounds: { startDate: string; endDate: string }) {
  if (range === 'all') return false;
  const createdAt = new Date(value);
  if (!Number.isFinite(createdAt.getTime())) return false;
  const days = countRangeDays(bounds.startDate, bounds.endDate);
  const previousEnd = addDays(parseDateInput(bounds.startDate), -1);
  previousEnd.setHours(23, 59, 59, 999);
  const previousStart = addDays(parseDateInput(bounds.startDate), -days);
  return createdAt >= previousStart && createdAt <= previousEnd;
}

function getDashboardDateBounds(orders: Order[], range: DashboardRange, selectedDate: string) {
  if (range === 'all') {
    const validDates = orders
      .map((order) => new Date(order.createdAt))
      .filter((date) => Number.isFinite(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const first = validDates[0] || parseDateInput(selectedDate);
    const last = validDates.at(-1) || parseDateInput(selectedDate);
    const end = last > parseDateInput(selectedDate, true) ? last : parseDateInput(selectedDate);
    return { startDate: toDateInputValue(first), endDate: toDateInputValue(end) };
  }
  if (isSingleDateDashboardRange(range)) return { startDate: selectedDate, endDate: selectedDate };
  return {
    startDate: toDateInputValue(addDays(parseDateInput(selectedDate), -(getDashboardRangeDays(range) - 1))),
    endDate: selectedDate
  };
}

function getDashboardRangeDays(range: DashboardRange) {
  if (range === 'date') return 1;
  return dashboardRangeOptions.find((option) => option.value === range)?.days || 1;
}

function isSingleDateDashboardRange(range: DashboardRange) {
  return range === 'today' || range === 'yesterday' || range === 'date';
}

function getDashboardRangeLabel(range: DashboardRange, selectedDate: string, bounds: { startDate: string; endDate: string }) {
  if (range === 'all') return dashboardRangeLabels.all;
  const formattedDate = formatDateLong(selectedDate);
  if (range === 'date') return formattedDate;
  if (range === 'today' || range === 'yesterday') return `${dashboardRangeLabels[range]} · ${formattedDate}`;
  return `${dashboardRangeLabels[range]} · ${formatDateLong(bounds.startDate)} a ${formatDateLong(bounds.endDate)}`;
}

function getDashboardHeroTitle(range: DashboardRange, selectedDate: string) {
  if (range === 'all') return 'Visao geral da loja';
  if (range === 'today') return 'Hoje na loja';
  if (range === 'yesterday') return 'Ontem na loja';
  if (range === 'date') return `${formatDateDayMonth(selectedDate)} na loja`;
  return 'Periodo da loja';
}

function getDashboardHeroDescription(range: DashboardRange, selectedDate: string) {
  if (range === 'all') return 'Historico completo para acompanhar pedidos, faturamento e produtos.';
  if (isSingleDateDashboardRange(range)) return `Operacao de ${formatDateLong(selectedDate)} com pedidos e indicadores reais.`;
  return 'Indicadores consolidados para comparar a operacao e tomar decisoes.';
}

function isValidRevenueOrder(order: Order) {
  return order.status !== 'Cancelado' && order.paymentStatus !== 'Cancelado';
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string, endOfDay = false) {
  const fallback = toDateInputValue(new Date());
  const [year, month, day] = (value || fallback).split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

function WeeklyRevenueChart({
  orders,
  startDate,
  endDate,
  range,
  trend
}: {
  orders: Order[];
  startDate: string;
  endDate: string;
  range: DashboardRange;
  trend: number;
}) {
  const data = buildChartData(orders, startDate, endDate, range);
  const positive = trend >= 0;
  const strokeColor = positive ? '#4d7f9f' : '#b84d42';
  const fillId = positive ? 'adminRevenueFillPositive' : 'adminRevenueFillNegative';

  return (
    <div className="admin-line-chart" aria-label="Grafico animado de faturamento">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="adminRevenueFillPositive" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4d7f9f" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#4d7f9f" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="adminRevenueFillNegative" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#b84d42" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#b84d42" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(132,159,193,.16)" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--admin-muted)', fontSize: 10, fontWeight: 700 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--admin-muted)', fontSize: 10 }} width={34} />
          <Tooltip content={<DashboardTooltip />} cursor={{ stroke: 'rgba(77,127,159,.32)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={strokeColor}
            strokeWidth={3}
            fill={`url(#${fillId})`}
            dot={{ r: 3, strokeWidth: 2, fill: '#fff', stroke: strokeColor }}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: strokeColor }}
            isAnimationActive
            animationBegin={80}
            animationDuration={1100}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildChartData(orders: Order[], startDate: string, endDate: string, range: DashboardRange) {
  if (isSingleDateDashboardRange(range)) {
    const target = parseDateInput(endDate);
    return getStoreBusinessHourBuckets(target).map((hour) => {
      const hourOrders = orders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt.toDateString() === target.toDateString() && createdAt.getHours() === hour;
      });
      return {
        label: `${String(hour).padStart(2, '0')}h`,
        total: hourOrders.reduce((sum, order) => sum + order.total, 0),
        orders: hourOrders.length
      };
    });
  }

  const days = countRangeDays(startDate, endDate);
  if (days <= 31) {
    const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(parseDateInput(startDate), index);
      const dayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === date.toDateString());
      return {
        label: formatter.format(date),
        total: dayOrders.reduce((sum, order) => sum + order.total, 0),
        orders: dayOrders.length
      };
    });
  }

  const buckets = new Map<string, { label: string; total: number; orders: number }>();
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: '2-digit' });
  orders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    const current = buckets.get(key) || { label: formatter.format(createdAt), total: 0, orders: 0 };
    buckets.set(key, { ...current, total: current.total + order.total, orders: current.orders + 1 });
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);
}

function countRangeDays(startValue: string, endValue: string) {
  const start = parseDateInput(startValue);
  const end = parseDateInput(endValue);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

function OrderStatusDonut({ total, counts, periodLabel, startDate, endDate }: { total: number; counts: Record<OrderStatus, number>; periodLabel: string; startDate: string; endDate: string }) {
  const data = [
    { name: 'Recebido', status: 'Recebido' as OrderStatus, value: counts.Recebido, color: '#4d7f9f', className: 'blue' },
    { name: 'Novo pedido', status: 'A confirmar' as OrderStatus, value: counts['A confirmar'], color: '#f59e0b', className: 'orange' },
    { name: 'Em separação', status: separationStatus, value: counts[separationStatus], color: '#3d827f', className: 'purple' },
    { name: 'A caminho', status: 'A caminho' as OrderStatus, value: counts['A caminho'], color: '#fb923c', className: 'orange' },
    { name: 'Entregue', status: 'Entregue' as OrderStatus, value: counts.Entregue, color: '#4f9f68', className: 'green' },
    { name: 'Cancelado', status: 'Cancelado' as OrderStatus, value: counts.Cancelado, color: '#b84d42', className: 'red' }
  ].filter((item) => item.value > 0);

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut-chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <PieChart>
            <Pie
              data={data.length ? data : [{ name: 'Sem pedidos', value: 1, color: '#334155' }]}
              dataKey="value"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="transparent"
              isAnimationActive
              animationBegin={120}
              animationDuration={950}
              animationEasing="ease-out"
            >
              {(data.length ? data : [{ color: '#334155' }]).map((item, index) => (
                <Cell key={`${item.color}-${index}`} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="admin-donut-center">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>
      <div className="admin-donut-legend">
        <small className="admin-donut-period">{periodLabel}: {formatDateShort(startDate)} - {formatDateShort(endDate)}</small>
        {data.length ? (
          data.map((item) => (
            <Link key={item.status} href={ordersRangeHref(startDate, endDate, item.status)}>
              <i className={item.className} /> {item.name}
              <strong>{item.value} ({formatPercent(item.value, total)})</strong>
            </Link>
          ))
        ) : (
          <span className="admin-empty-line">Sem pedidos nesse período.</span>
        )}
      </div>
    </div>
  );
}

function formatPercent(value: number, total: number) {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1).replace('.', ',')}%`;
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; payload?: { orders?: number } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const orders = payload[0]?.payload?.orders || 0;
  return (
    <div className="admin-chart-tooltip">
      <span>{label}</span>
      <strong>{money(Number(payload[0]?.value || 0))}</strong>
      <small>{orders} {orders === 1 ? 'pedido' : 'pedidos'}</small>
    </div>
  );
}
