'use client';

import type { ComponentType, FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Bell,
  Boxes,
  CalendarDays,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cloud,
  Coins,
  Download,
  Eye,
  FileBarChart,
  FileSpreadsheet,
  Gauge,
  KeyRound,
  Landmark,
  LockKeyhole,
  Paintbrush,
  PackageCheck,
  Plus,
  Plug,
  Receipt,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  UsersRound,
  WalletCards,
  X,
  Zap
} from 'lucide-react';
import { fetchAdminOrders, fetchStockMovements } from '@/lib/admin-services';
import { getStoreBusinessHourBuckets, storeScheduleSummary } from '@/lib/business-hours';
import { money, shortDate } from '@/lib/format';
import { getPdfLogoDataUrl } from '@/lib/pdf-logo';
import type { Order, OrderStatus, StockMovement } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';
import { ThemeToggle } from '@/components/admin/theme-toggle';

const financeRangeOptions = [
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

type FinancePresetRange = (typeof financeRangeOptions)[number]['value'];
type FinanceRange = FinancePresetRange | 'date';
type ExportKind = 'transacoes' | 'dre' | 'receber' | 'historico';
type ReportPreviewKind = 'dre' | 'cash-flow' | 'receivable' | 'history';
type FinanceAction = 'expense' | 'withdrawal' | 'cash-close' | 'compare';
type FinanceEntryType = 'expense' | 'withdrawal' | 'cash-close';

type ReportDocument = {
  filename: string;
  title: string;
  description: string;
  period: string;
  rows: string[][];
};

type FinanceEntry = {
  id: string;
  type: FinanceEntryType;
  title: string;
  amount: number;
  note: string;
  createdAt: string;
};

type FinanceMovement = {
  id: string;
  date: string;
  title: string;
  detail: string;
  amount: number;
  tone: string;
  type: 'order' | FinanceEntryType;
  direction: 'entrada' | 'saida' | 'conferencia';
};

type StockReportData = {
  movementCount: number;
  incomingUnits: number;
  outgoingUnits: number;
  lostUnits: number;
  replacementCost: number;
  topItems: Array<{ name: string; quantity: number }>;
};

const financeEntriesKey = 'monte-sinai-admin-finance-entries';
const chartColors = ['#4d7f9f', '#b7793f', '#4f9f68', '#3d827f', '#0f766e', '#8b5f3d'];
const reportPreviewRowLimit = 80;

const rangeLabels = Object.fromEntries(financeRangeOptions.map((option) => [option.value, option.label])) as Record<FinancePresetRange, string>;

const statusLabels: Record<OrderStatus, string> = {
  'A confirmar': 'A confirmar',
  Recebido: 'Recebido',
  'Em separação': 'Separacao',
  'A caminho': 'Em rota',
  Entregue: 'Entregue',
  Cancelado: 'Cancelado'
};

const settingsItems = [
  { title: 'Usuarios', detail: 'Gerencie equipe, papeis e novos acessos.', href: '/usuarios', icon: UsersRound, action: 'Abrir usuarios', tone: 'blue' },
  { title: 'Permissoes de acesso', detail: 'Defina modulos liberados por usuario e hierarquia.', href: '/usuarios', icon: KeyRound, action: 'Editar permissoes', tone: 'violet' },
  { title: 'Integracoes', detail: 'Conecte entregas, pagamentos, CEP e automacoes.', href: '/configuracoes#integracoes', icon: Plug, action: 'Configurar', tone: 'cyan' },
  { title: 'Automacoes', detail: 'Regras, etapas e acoes automaticas.', href: '/configuracoes#automacoes', icon: Zap, action: 'Gerenciar', tone: 'amber' },
  { title: 'Notificacoes', detail: 'Avisos do sino, painel e atualizacoes.', href: '/configuracoes#notificacoes', icon: Bell, action: 'Configurar', tone: 'pink' },
  { title: 'Seguranca', detail: 'Politicas, sessao, perfis protegidos e auditoria.', href: '/configuracoes#seguranca', icon: LockKeyhole, action: 'Revisar', tone: 'red' },
  { title: 'Backups', detail: 'Rotina de backup e recuperacao operacional.', href: '/configuracoes#backups', icon: Cloud, action: 'Agendar', tone: 'slate' },
  { title: 'Taxas de entrega', detail: 'Faixas, bairros e custos por regiao.', href: '/configuracoes#taxas', icon: WalletCards, action: 'Configurar', tone: 'orange' },
  { title: 'Logs do sistema', detail: 'Eventos, auditoria e historico tecnico.', href: '/logs', icon: FileBarChart, action: 'Ver logs', tone: 'blue' }
];

export function FinancePage() {
  const { range, setRange, selectedDate, setSelectedDate, loading, error, filteredOrders, loadOrders } = useFinanceData();
  const { addNotification } = useAdminStore();
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>(() => loadFinanceEntries());
  const [activeAction, setActiveAction] = useState<FinanceAction | null>(null);

  const entriesForRange = useMemo(() => financeEntries.filter((entry) => matchesEntryRange(entry, range, selectedDate)), [financeEntries, range, selectedDate]);
  const dashboard = useMemo(() => buildOperationalFinance(filteredOrders, entriesForRange, range, selectedDate), [entriesForRange, filteredOrders, range, selectedDate]);
  const periodLabel = getFinanceRangeLabel(range, selectedDate);

  function persistEntries(nextEntries: FinanceEntry[]) {
    setFinanceEntries(nextEntries);
    saveFinanceEntries(nextEntries);
  }

  function saveEntry(entry: FinanceEntry) {
    persistEntries([entry, ...financeEntries].slice(0, 160));
    addNotification({
      title: financeEntryNotificationTitle(entry.type),
      detail: `${entry.title} registrado em ${shortDate(entry.createdAt)}.`,
      tone: entry.type === 'expense' ? 'warning' : 'success',
      href: '/financeiro'
    });
    setActiveAction(null);
  }

  return (
    <section className="admin-finance-page">
      <FinanceHero
        eyebrow="Caixa e resultado"
        title="Financeiro"
        description={`Controle o caixa, despesas, retiradas e fechamento sem papel. Calculos de vendas: ${storeScheduleSummary}.`}
        actions={
          <FinanceActions loading={loading} onRefresh={loadOrders} />
        }
      />

      {error ? <div className="ops-alert ops-alert-error">{error}</div> : null}

      <FinanceDateFilter range={range} selectedDate={selectedDate} onRangeChange={setRange} onDateChange={setSelectedDate} />

      <section className="finance-action-grid">
        <button type="button" className="is-income" onClick={() => document.getElementById('finance-movements')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span><Eye className="size-5" /></span>
          <strong>Ver movimentacoes</strong>
        </button>
        <button type="button" className="is-expense" onClick={() => setActiveAction('expense')}>
          <span><Plus className="size-5" /></span>
          <strong>Registrar despesa</strong>
        </button>
        <button type="button" className="is-withdrawal" onClick={() => setActiveAction('withdrawal')}>
          <span><Coins className="size-5" /></span>
          <strong>Registrar retirada</strong>
        </button>
        <button type="button" className="is-cash" onClick={() => setActiveAction('cash-close')}>
          <span><Calculator className="size-5" /></span>
          <strong>Fechar caixa</strong>
        </button>
        <button type="button" className="is-compare" onClick={() => setActiveAction('compare')}>
          <span><TrendingUp className="size-5" /></span>
          <strong>Comparar periodo</strong>
        </button>
      </section>

      <section className="finance-kpi-grid">
        <FinanceDashboardMetric icon={ArrowUpRight} label="Receita do periodo" value={money(dashboard.revenue)} detail={`${dashboard.validOrders} pedidos validos`} tone="blue" />
        <FinanceDashboardMetric icon={CheckCircle2} label="Recebido" value={money(dashboard.received)} detail={`${dashboard.paidOrders} pedidos pagos`} tone="green" />
        <FinanceDashboardMetric icon={Clock3} label="A receber" value={money(dashboard.receivable)} detail={`${dashboard.pendingOrders} pendentes`} tone="amber" />
        <FinanceDashboardMetric icon={Receipt} label="Ticket medio" value={money(dashboard.averageTicket)} detail="Media por pedido" tone="violet" />
        <FinanceDashboardMetric icon={ArrowDownRight} label="Despesas" value={money(dashboard.expenses)} detail={`${dashboard.expenseCount} registros`} tone="red" />
        <FinanceDashboardMetric icon={Coins} label="Retiradas" value={money(dashboard.withdrawals)} detail={`${dashboard.withdrawalCount} registros`} tone="pink" />
        <FinanceDashboardMetric icon={Landmark} label="Saldo estimado" value={money(dashboard.cashBalance)} detail="Recebido - saidas" tone="cyan" />
        <FinanceDashboardMetric icon={Calculator} label="Ultimo fechamento" value={dashboard.lastCashClose ? money(dashboard.lastCashClose.amount) : 'Pendente'} detail={dashboard.lastCashClose ? shortDate(dashboard.lastCashClose.createdAt) : 'Nenhum registro'} tone="slate" />
      </section>

      <section className="finance-dashboard-grid">
        <FinancePanel title="Evolucao de vendas" action={`Periodo: ${periodLabel}`}>
          <SalesEvolutionChart data={dashboard.salesChart} />
        </FinancePanel>
        <FinancePanel title="Formas de pagamento" action={money(dashboard.revenue)}>
          <PaymentDonutChart payments={dashboard.payments} />
        </FinancePanel>
        <FinancePanel title="Desempenho por produto" action={`${dashboard.products.length} principais`}>
          <ProductPerformance products={dashboard.products} total={dashboard.revenue} />
        </FinancePanel>
        <FinancePanel title="Resumo de caixa" action={dashboard.cashBalance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}>
          <CashSummary dashboard={dashboard} />
        </FinancePanel>
      </section>

      <section className="finance-bottom-grid">
        <FinanceMovements movements={dashboard.movements} />
        <FinanceInsights dashboard={dashboard} periodLabel={periodLabel} />
      </section>

      {activeAction && activeAction !== 'compare' ? <FinanceEntryDialog action={activeAction} onClose={() => setActiveAction(null)} onSave={saveEntry} /> : null}
      {activeAction === 'compare' ? <FinanceCompareDialog dashboard={dashboard} onClose={() => setActiveAction(null)} /> : null}
    </section>
  );
}

export function ReportsPage() {
  const { range, setRange, selectedDate, setSelectedDate, loading, error, filteredOrders, metrics, loadOrders } = useFinanceData();
  const { addNotification } = useAdminStore();
  const [financeEntries] = useState<FinanceEntry[]>(() => loadFinanceEntries());
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockError, setStockError] = useState('');
  const [preview, setPreview] = useState<ReportPreviewKind | null>(null);
  const periodLabel = getFinanceRangeLabel(range, selectedDate);
  const entriesForRange = useMemo(() => financeEntries.filter((entry) => matchesEntryRange(entry, range, selectedDate)), [financeEntries, range, selectedDate]);
  const reportDashboard = useMemo(() => buildOperationalFinance(filteredOrders, entriesForRange, range, selectedDate), [entriesForRange, filteredOrders, range, selectedDate]);
  const reportMovements = useMemo(() => buildFinanceMovements(filteredOrders, entriesForRange), [entriesForRange, filteredOrders]);
  const stockMovementsForRange = useMemo(
    () => stockMovements.filter((movement) => matchesFinanceDateRange(movement.occurredAt, range, selectedDate)),
    [range, selectedDate, stockMovements]
  );
  const stockReport = useMemo(() => buildStockReport(stockMovementsForRange), [stockMovementsForRange]);
  const reportDocuments = useMemo(
    () =>
      buildReportDocuments({
        filteredOrders,
        metrics,
        dashboard: reportDashboard,
        movements: reportMovements,
        periodLabel
      }),
    [filteredOrders, metrics, periodLabel, reportDashboard, reportMovements]
  );

  useEffect(() => {
    const reportByHash: Record<string, ReportPreviewKind> = {
      'dre-operacional': 'dre',
      'fluxo-caixa': 'cash-flow',
      'contas-receber': 'receivable',
      'resumo-historico': 'history'
    };
    const nextPreview = reportByHash[window.location.hash.replace('#', '')];
    if (!nextPreview) return;
    const frame = window.requestAnimationFrame(() => setPreview(nextPreview));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const loadStockReport = useCallback(async () => {
    try {
      setStockMovements(await fetchStockMovements(2000));
      setStockError('');
    } catch (loadError) {
      setStockError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o relatorio de estoque.');
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialStockReportLoad() {
      try {
        const movements = await fetchStockMovements(2000);
        if (!active) return;
        setStockMovements(movements);
        setStockError('');
      } catch (loadError) {
        if (!active) return;
        setStockError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o relatorio de estoque.');
      }
    }

    void initialStockReportLoad();
    return () => {
      active = false;
    };
  }, []);

  function refreshReports() {
    void Promise.all([loadOrders(), loadStockReport()]);
  }

  function showReport(nextPreview: ReportPreviewKind) {
    setPreview(nextPreview);
    const hashByReport: Record<ReportPreviewKind, string> = {
      dre: 'dre-operacional',
      'cash-flow': 'fluxo-caixa',
      receivable: 'contas-receber',
      history: 'resumo-historico'
    };
    window.history.replaceState(null, '', `#${hashByReport[nextPreview]}`);
  }

  function closeReportPreview() {
    setPreview(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  async function exportReport(kind: ExportKind) {
    const document = reportDocuments[exportKindToPreview(kind)];
    try {
      await downloadReportPdf(document);
      addNotification({
        title: kind === 'dre' ? 'DRE exportado em PDF' : 'Relatorio exportado em PDF',
        detail: `${Math.max(document.rows.length - 1, 0)} registros incluidos no documento.`,
        tone: 'success',
        href: '/relatorios'
      });
    } catch (downloadError) {
      addNotification({
        title: 'Nao foi possivel baixar o PDF',
        detail: downloadError instanceof Error ? downloadError.message : 'Tente novamente em alguns instantes.',
        tone: 'warning',
        href: '/relatorios'
      });
    }
  }

  async function exportStockReport() {
    const document = buildStockReportDocument(stockMovementsForRange, periodLabel);
    try {
      await downloadReportPdf(document);
      addNotification({
        title: 'Relatorio de estoque exportado em PDF',
        detail: `${Math.max(document.rows.length - 1, 0)} movimentacoes incluidas no documento.`,
        tone: 'success',
        href: '/relatorios'
      });
    } catch (downloadError) {
      addNotification({
        title: 'Nao foi possivel baixar o PDF',
        detail: downloadError instanceof Error ? downloadError.message : 'Tente novamente em alguns instantes.',
        tone: 'warning',
        href: '/relatorios'
      });
    }
  }

  return (
    <section className="admin-finance-page">
      <FinanceHero
        eyebrow="Analise"
        title="Relatorios"
        description="Arquivos e visoes consolidadas para acompanhar resultado, caixa e pendencias."
        actions={
          <>
            <button type="button" onClick={refreshReports} disabled={loading}>
              <RefreshCw className="size-4" />
              Atualizar
            </button>
            <button type="button" className="is-primary" onClick={() => showReport('dre')}>
              <Eye className="size-4" />
              Visualizar DRE
            </button>
          </>
        }
      />

      {error ? <div className="ops-alert ops-alert-error">{error}</div> : null}
      {stockError ? <div className="ops-alert ops-alert-error">{stockError}</div> : null}

      <FinanceDateFilter range={range} selectedDate={selectedDate} onRangeChange={setRange} onDateChange={setSelectedDate} />
      <section className="finance-report-intro">
        <span><FileBarChart className="size-5" /></span>
        <div>
          <strong>Central de relatorios</strong>
          <p>Visualize, confira os dados e somente depois escolha baixar o documento.</p>
        </div>
        <small>{periodLabel}</small>
      </section>
      <ReportsView dashboard={reportDashboard} selected={preview} onSelect={showReport} />
      <StockReportSummary report={stockReport} periodLabel={periodLabel} onExport={exportStockReport} />
      <section className="finance-chart-grid finance-report-panels">
        <FinancePanel title="Pedidos por status" action={`${metrics.validOrders} validos`}>
          <StatusBreakdown metrics={metrics} />
        </FinancePanel>
        <FinancePanel title="Pagamentos consolidados" action={money(metrics.revenue)}>
          <PaymentBreakdown orders={metrics.orders} />
        </FinancePanel>
      </section>
      {preview ? (
        <ReportPreview
          preview={preview}
          document={reportDocuments[preview]}
          onExport={exportReport}
          onClose={closeReportPreview}
        />
      ) : null}
    </section>
  );
}

export function SettingsPage() {
  const { addNotification } = useAdminStore();

  function savePreferences() {
    addNotification({
      title: 'Preferencias registradas',
      detail: 'Configuracoes do painel revisadas.',
      tone: 'success',
      href: '/configuracoes'
    });
  }

  return (
    <section className="admin-finance-page admin-settings-page">
      <FinanceHero
        eyebrow="Sistema"
        title="Configuracoes"
        description="Controle de acesso, seguranca, notificacoes, tema e preferencias administrativas."
        actions={
          <button type="button" className="is-primary" onClick={savePreferences}>
            <ShieldCheck className="size-4" />
            Salvar preferencias
          </button>
        }
      />

      <SettingsView onSave={savePreferences} />
    </section>
  );
}

function useFinanceData() {
  const { orders, setOrders, setLoading, setError, loading, error } = useAdminStore();
  const [range, setRange] = useState<FinanceRange>('today');
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setOrders(await fetchAdminOrders());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setOrders]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => orders.filter((order) => matchesRange(order, range, selectedDate)), [orders, range, selectedDate]);
  const metrics = useMemo(() => buildFinanceMetrics(filteredOrders), [filteredOrders]);
  const allMetrics = useMemo(() => buildFinanceMetrics(orders), [orders]);

  return {
    range,
    setRange,
    selectedDate,
    setSelectedDate,
    loading,
    error,
    filteredOrders,
    metrics,
    allMetrics,
    loadOrders
  };
}

function FinanceHero({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="finance-hero">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="finance-hero-actions">{actions}</div> : null}
    </header>
  );
}

function FinanceActions({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <>
      <button type="button" onClick={onRefresh} disabled={loading}>
        <RefreshCw className="size-4" />
        Atualizar
      </button>
      <Link className="is-primary" href="/relatorios#dre-operacional">
        <Eye className="size-4" />
        Visualizar DRE
      </Link>
    </>
  );
}

function FinanceDateFilter({
  range,
  selectedDate,
  onRangeChange,
  onDateChange
}: {
  range: FinanceRange;
  selectedDate: string;
  onRangeChange: (range: FinanceRange) => void;
  onDateChange: (date: string) => void;
}) {
  function selectPreset(nextRange: FinancePresetRange) {
    const target = new Date();
    if (nextRange === 'yesterday') target.setDate(target.getDate() - 1);
    onDateChange(toDateInputValue(target));
    onRangeChange(nextRange);
  }

  return (
    <section className="finance-filter-card">
      <label className={`finance-calendar-card ${range === 'date' ? 'is-active' : ''}`}>
        <span>
          <CalendarDays className="size-5" />
        </span>
        <div>
          <small>Escolher uma data</small>
          <input
            type="date"
            value={selectedDate}
            onClick={(event) => event.currentTarget.showPicker()}
            onChange={(event) => {
              onDateChange(event.target.value);
              onRangeChange('date');
            }}
            aria-label="Escolher data do financeiro"
          />
        </div>
      </label>
      <label className="finance-period-select">
        <span>
          <Clock3 className="size-5" />
        </span>
        <div>
          <small>Periodo</small>
          <select
            value={range}
            onChange={(event) => {
              const nextRange = event.target.value as FinanceRange;
              if (nextRange === 'date') {
                onRangeChange(nextRange);
                return;
              }
              selectPreset(nextRange);
            }}
            aria-label="Selecionar periodo do financeiro"
          >
            <option value="date">Somente a data escolhida</option>
            {financeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <ChevronDown className="finance-period-select-chevron size-4" />
      </label>
    </section>
  );
}

function FinancePanel({ title, action, children }: { title: string; action: string; children: ReactNode }) {
  return (
    <section className="finance-panel">
      <header>
        <h2>{title}</h2>
        <span>{action}</span>
      </header>
      {children}
    </section>
  );
}

function FinanceDashboardMetric({ icon: Icon, label, value, detail, tone }: { icon: ComponentType<{ className?: string }>; label: string; value: string; detail: string; tone: string }) {
  return (
    <article className={`finance-dashboard-metric is-${tone}`}>
      <span>
        <Icon className="size-5" />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function SalesEvolutionChart({ data }: { data: Array<{ label: string; total: number }> }) {
  if (!data.length) {
    return <p className="finance-empty-copy">Sem vendas no periodo selecionado.</p>;
  }

  return (
    <div className="finance-chart-body">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="financeSalesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4f8cff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#4f8cff" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--finance-muted)', fontSize: 11, fontWeight: 800 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: 'var(--finance-muted)', fontSize: 11, fontWeight: 800 }} tickFormatter={(value) => money(Number(value)).replace('R$', '')} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => money(Number(value))}
            contentStyle={{ border: '1px solid rgba(148, 163, 184, .3)', borderRadius: 14, background: '#171226', color: '#fffaff', fontWeight: 800 }}
            labelStyle={{ color: '#c5b8d8', fontWeight: 900 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#4f8cff"
            strokeWidth={3}
            fill="url(#financeSalesGradient)"
            dot={{ r: 3, strokeWidth: 2, fill: '#171226', stroke: '#4f8cff' }}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#ffffff', stroke: '#0f766e' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaymentDonutChart({ payments }: { payments: Array<{ label: string; total: number; percent: number }> }) {
  if (!payments.length) {
    return <p className="finance-empty-copy">Nenhum pagamento encontrado.</p>;
  }

  return (
    <div className="finance-donut-layout">
      <div className="finance-donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={payments} dataKey="total" nameKey="label" innerRadius="58%" outerRadius="86%" paddingAngle={3}>
              {payments.map((item, index) => (
                <Cell key={item.label} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => money(Number(value))}
              contentStyle={{ border: '1px solid rgba(148, 163, 184, .3)', borderRadius: 14, background: '#171226', color: '#fffaff', fontWeight: 800 }}
              labelStyle={{ color: '#c5b8d8', fontWeight: 900 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <strong>{money(sum(payments.map((item) => item.total)))}</strong>
      </div>
      <div className="finance-donut-legend">
        {payments.map((item, index) => (
          <p key={item.label}>
            <i style={{ background: chartColors[index % chartColors.length] }} />
            <span>{item.label}</span>
            <strong>{item.percent}%</strong>
          </p>
        ))}
      </div>
    </div>
  );
}

function ProductPerformance({ products, total }: { products: Array<{ name: string; total: number; quantity: number }>; total: number }) {
  if (!products.length) {
    return <p className="finance-empty-copy">Ainda nao ha itens vendidos nesse periodo.</p>;
  }

  return (
    <div className="finance-product-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={products} layout="vertical" margin={{ top: 4, right: 10, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="financeProductGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#4f8cff" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={106}
            tick={{ fill: 'var(--finance-muted)', fontSize: 11, fontWeight: 800 }}
            tickFormatter={(value) => String(value).slice(0, 17)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [money(Number(value)), `${total ? Math.round((Number(value) / total) * 100) : 0}% da receita`]}
            contentStyle={{ border: '1px solid rgba(148, 163, 184, .3)', borderRadius: 14, background: '#171226', color: '#fffaff', fontWeight: 800 }}
            labelStyle={{ color: '#c5b8d8', fontWeight: 900 }}
          />
          <Bar dataKey="total" fill="url(#financeProductGradient)" radius={[0, 8, 8, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CashSummary({ dashboard }: { dashboard: ReturnType<typeof buildOperationalFinance> }) {
  const rows = [
    { label: 'Entradas recebidas', value: dashboard.received, tone: 'green' },
    { label: 'Despesas registradas', value: dashboard.expenses, tone: 'red' },
    { label: 'Retiradas', value: dashboard.withdrawals, tone: 'pink' },
    { label: 'Saldo de caixa estimado', value: dashboard.cashBalance, tone: dashboard.cashBalance >= 0 ? 'blue' : 'red' }
  ];

  return (
    <div className="finance-cash-summary">
      {rows.map((row) => (
        <p key={row.label} className={`is-${row.tone}`}>
          <span>{row.label}</span>
          <strong>{money(row.value)}</strong>
        </p>
      ))}
      <small>Os registros manuais ficam salvos neste navegador ate criarmos a tabela definitiva no Supabase.</small>
    </div>
  );
}

function FinanceMovements({ movements }: { movements: FinanceMovement[] }) {
  return (
    <section className="finance-table-card finance-movements-card" id="finance-movements">
      <header>
        <div>
          <h2>Ultimas movimentacoes</h2>
          <p>Pedidos, despesas, retiradas e fechamento de caixa em uma lista unica.</p>
        </div>
        <Link href="/relatorios#fluxo-caixa">
          <FileSpreadsheet className="size-4" />
          Ver relatorio
        </Link>
      </header>
      <div className="finance-movement-list">
        {movements.length ? (
          movements.map((movement) => (
            <article key={movement.id} className={`is-${movement.tone}`}>
              <span>{movement.tone === 'red' ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
              <div>
                <strong>{movement.title}</strong>
                <small>{movement.detail}</small>
              </div>
              <p>
                <strong>{money(movement.amount)}</strong>
                <small>{shortDate(movement.date)}</small>
              </p>
            </article>
          ))
        ) : (
          <p className="finance-empty-copy">Nenhuma movimentacao encontrada nesse periodo.</p>
        )}
      </div>
    </section>
  );
}

function FinanceInsights({ dashboard, periodLabel }: { dashboard: ReturnType<typeof buildOperationalFinance>; periodLabel: string }) {
  const topProduct = dashboard.products[0]?.name || 'Sem produto lider';
  const pendingText = dashboard.pendingOrders ? `${dashboard.pendingOrders} pedidos precisam de pagamento.` : 'Nenhum pagamento pendente.';
  const insights = [
    { title: 'Produto em destaque', detail: topProduct, icon: TrendingUp, tone: 'blue' },
    { title: 'Atencao ao caixa', detail: pendingText, icon: TriangleAlert, tone: dashboard.pendingOrders ? 'amber' : 'green' },
    { title: 'Saidas no periodo', detail: `${money(dashboard.expenses + dashboard.withdrawals)} entre despesas e retiradas.`, icon: ArrowDownRight, tone: 'pink' },
    { title: 'Proximo passo', detail: dashboard.lastCashClose ? 'Revise o fechamento antes de exportar.' : 'Feche o caixa ao terminar o turno.', icon: Calculator, tone: 'violet' }
  ];

  return (
    <section className="finance-insights-card">
      <header>
        <h2>Insights do negocio</h2>
        <span>{periodLabel}</span>
      </header>
      <div>
        {insights.map((insight) => (
          <article key={insight.title} className={`is-${insight.tone}`}>
            <span>
              <insight.icon className="size-5" />
            </span>
            <strong>{insight.title}</strong>
            <p>{insight.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinanceEntryDialog({ action, onClose, onSave }: { action: FinanceEntryType; onClose: () => void; onSave: (entry: FinanceEntry) => void }) {
  const copy = financeActionCopy(action);
  const [title, setTitle] = useState(copy.defaultTitle);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().slice(0, 10));

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount < 0) return;
    onSave({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: action,
      title: title.trim() || copy.defaultTitle,
      amount: numericAmount,
      note: note.trim(),
      createdAt: new Date(`${createdAt}T12:00:00`).toISOString()
    });
  }

  return (
    <div className="finance-modal-backdrop" role="presentation">
      <form className="finance-modal" onSubmit={submitEntry}>
        <button type="button" className="finance-modal-close" onClick={onClose} aria-label="Fechar">
          <X className="size-5" />
        </button>
        <span className={`finance-modal-icon is-${copy.tone}`}>
          <copy.icon className="size-5" />
        </span>
        <p className="finance-modal-kicker">{copy.kicker}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>

        <label>
          Descricao
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy.defaultTitle} />
        </label>
        <label>
          Valor
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" required />
        </label>
        <label>
          Data
          <input type="date" value={createdAt} onChange={(event) => setCreatedAt(event.target.value)} required />
        </label>
        <label>
          Observacao
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional" />
        </label>
        <div className="finance-modal-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="is-primary">
            Salvar registro
          </button>
        </div>
      </form>
    </div>
  );
}

function FinanceCompareDialog({ dashboard, onClose }: { dashboard: ReturnType<typeof buildOperationalFinance>; onClose: () => void }) {
  return (
    <div className="finance-modal-backdrop" role="presentation">
      <section className="finance-modal finance-compare-modal">
        <button type="button" className="finance-modal-close" onClick={onClose} aria-label="Fechar">
          <X className="size-5" />
        </button>
        <span className="finance-modal-icon is-blue">
          <TrendingUp className="size-5" />
        </span>
        <p className="finance-modal-kicker">Comparacao rapida</p>
        <h2>Leitura do periodo</h2>
        <p>Resumo gerado a partir dos pedidos e movimentacoes carregadas no painel.</p>
        <div className="finance-compare-grid">
          <p>
            <span>Receita</span>
            <strong>{money(dashboard.revenue)}</strong>
          </p>
          <p>
            <span>Ticket medio</span>
            <strong>{money(dashboard.averageTicket)}</strong>
          </p>
          <p>
            <span>Saidas</span>
            <strong>{money(dashboard.expenses + dashboard.withdrawals)}</strong>
          </p>
          <p>
            <span>Saldo</span>
            <strong>{money(dashboard.cashBalance)}</strong>
          </p>
        </div>
        <div className="finance-modal-actions">
          <button type="button" className="is-primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </section>
    </div>
  );
}

function StatusBreakdown({ metrics }: { metrics: ReturnType<typeof buildFinanceMetrics> }) {
  return (
    <div className="finance-breakdown">
      {Object.entries(metrics.byStatus).map(([status, count]) => (
        <p key={status}>
          <span>{statusLabels[status as OrderStatus] || status}</span>
          <strong>{count}</strong>
        </p>
      ))}
    </div>
  );
}

function PaymentBreakdown({ orders }: { orders: Order[] }) {
  const payments = buildPaymentBreakdown(orders);
  return (
    <div className="finance-breakdown">
      {payments.map((item) => (
        <p key={item.label}>
          <span>{item.label}</span>
          <strong>{money(item.total)}</strong>
        </p>
      ))}
    </div>
  );
}


function ReportsView({
  dashboard,
  selected,
  onSelect
}: {
  dashboard: ReturnType<typeof buildOperationalFinance>;
  selected: ReportPreviewKind | null;
  onSelect: (kind: ReportPreviewKind) => void;
}) {
  const reports = [
    { id: 'dre-operacional', title: 'DRE operacional', detail: 'Receitas, saidas e resultado estimado do periodo.', meta: money(dashboard.cashBalance), label: 'Resultado estimado', tone: 'violet', icon: FileBarChart, kind: 'dre' as const },
    { id: 'fluxo-caixa', title: 'Fluxo de caixa', detail: 'Pedidos, despesas, retiradas e fechamentos em ordem cronologica.', meta: `${dashboard.movementCount} movimentacoes`, label: 'Registros no periodo', tone: 'blue', icon: Banknote, kind: 'cash-flow' as const },
    { id: 'contas-receber', title: 'Contas a receber', detail: `${dashboard.pendingOrders} pedidos aguardando pagamento.`, meta: money(dashboard.receivable), label: 'Valor pendente', tone: 'amber', icon: ReceiptText, kind: 'receivable' as const },
    { id: 'resumo-historico', title: 'Resumo historico', detail: `${dashboard.validOrders} pedidos validos no periodo selecionado.`, meta: money(dashboard.revenue), label: 'Receita do periodo', tone: 'green', icon: Gauge, kind: 'history' as const }
  ];

  return (
    <section className="finance-report-grid">
      {reports.map((report) => (
        <article key={report.title} id={report.id} className={`is-${report.tone} ${selected === report.kind ? 'is-selected' : ''}`}>
          <span>
            <report.icon className="size-5" />
          </span>
          <div>
            <h2>{report.title}</h2>
            <p>{report.detail}</p>
          </div>
          <div className="finance-report-card-stat">
            <small>{report.label}</small>
            <strong>{report.meta}</strong>
          </div>
          <button type="button" onClick={() => onSelect(report.kind)}>
            <Eye className="size-4" />
            Abrir visualizacao
          </button>
        </article>
      ))}
    </section>
  );
}

function StockReportSummary({ report, periodLabel, onExport }: { report: StockReportData; periodLabel: string; onExport: () => void | Promise<void> }) {
  const metrics = [
    { label: 'Movimentacoes', value: String(report.movementCount), icon: Boxes, tone: 'blue' },
    { label: 'Entradas', value: `${report.incomingUnits} un.`, icon: PackageCheck, tone: 'green' },
    { label: 'Saidas', value: `${report.outgoingUnits} un.`, icon: ArrowDownRight, tone: 'amber' },
    { label: 'Perdas', value: `${report.lostUnits} un.`, icon: TriangleAlert, tone: 'red' }
  ];

  return (
    <section className="finance-stock-report">
      <header>
        <span><Boxes className="size-5" /></span>
        <div>
          <h2>Relatorio de estoque</h2>
          <p>Entradas, vendas, ajustes e perdas do periodo selecionado.</p>
        </div>
        <small>{periodLabel}</small>
        <div className="finance-stock-actions">
          <button type="button" onClick={() => void onExport()}>
            <Download className="size-4" />
            Baixar PDF
          </button>
          <Link href="/estoque">Abrir estoque</Link>
        </div>
      </header>

      <div className="finance-stock-metrics">
        {metrics.map((item) => (
          <article key={item.label} className={`is-${item.tone}`}>
            <item.icon className="size-4" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="finance-stock-detail">
        <article>
          <span>Custo conhecido de reposicao</span>
          <strong>{money(report.replacementCost)}</strong>
          <small>Calculado apenas nas entradas com custo unitario informado.</small>
        </article>
        <article>
          <span>Produtos mais movimentados</span>
          <div>
            {report.topItems.length ? (
              report.topItems.map((item) => (
                <p key={item.name}>
                  <strong>{item.name}</strong>
                  <small>{item.quantity} un.</small>
                </p>
              ))
            ) : (
              <small>Nenhuma movimentacao no periodo.</small>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function ReportPreview({
  preview,
  document,
  onExport,
  onClose
}: {
  preview: ReportPreviewKind;
  document: ReportDocument;
  onExport: (kind: ExportKind) => void | Promise<void>;
  onClose: () => void;
}) {
  const exportKind = previewToExportKind(preview);
  const columns = document.rows[0] || [];
  const bodyRows = document.rows.slice(1);
  const visibleRows = bodyRows.slice(0, reportPreviewRowLimit);
  const hiddenRows = Math.max(bodyRows.length - visibleRows.length, 0);

  return (
    <div className="finance-modal-backdrop finance-report-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="finance-modal finance-report-modal" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
        <button type="button" className="finance-modal-close" onClick={onClose} aria-label="Fechar visualizacao">
          <X className="size-5" />
        </button>
        <header>
          <div>
            <span>Previa para conferencia</span>
            <h2 id="report-preview-title">{document.title}</h2>
            <p>{document.description}</p>
            <small>A folha clara abaixo representa o conteudo do PDF. A visualizacao mostra ate {reportPreviewRowLimit} linhas para nao travar; o PDF baixado sai completo.</small>
          </div>
          <button type="button" onClick={() => void onExport(exportKind)}>
            <Download className="size-4" />
            Baixar PDF apos conferir
          </button>
        </header>

        <div className="finance-pdf-stage">
          <article className={`finance-pdf-sheet ${columns.length > 6 ? 'is-landscape' : ''}`}>
            <header>
              <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" />
              <div>
                <strong>Monte Sinai - App Administrador</strong>
                <h3>{document.title}</h3>
                <p>Periodo: {document.period}</p>
              </div>
            </header>
            <div className="finance-pdf-table-wrap">
              <table>
                <thead>
                  <tr>
                    {columns.map((column) => <th key={column}>{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, rowIndex) => (
                    <tr key={`${row.join('-')}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!bodyRows.length ? <p>Nenhum registro encontrado para este relatorio.</p> : null}
              {hiddenRows ? <p className="finance-preview-limit-note">Mais {hiddenRows} linhas serao incluidas no PDF completo.</p> : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function SettingsView({ onSave }: { onSave: () => void }) {
  return (
    <section className="finance-settings-grid">
      <article className="finance-theme-card" id="aparencia">
        <span>
          <Paintbrush className="size-5" />
        </span>
        <div>
          <h2>Aparencia do painel</h2>
          <p>Troque tema claro, escuro ou automatico por aqui. No mobile, o controle de tema fica somente nesta tela.</p>
        </div>
        <ThemeToggle />
      </article>

      {settingsItems.map((item) => (
        <Link key={item.title} href={item.href} className={`finance-setting-card is-${item.tone}`}>
          <span>
            <item.icon className="size-5" />
          </span>
          <div>
            <h2>{item.title}</h2>
            <p>{item.detail}</p>
          </div>
          <strong>{item.action}</strong>
        </Link>
      ))}
      <button type="button" className="finance-save-preferences" onClick={onSave}>
        <ShieldCheck className="size-5" />
        Salvar preferencias
      </button>
    </section>
  );
}

function buildReportDocuments({
  filteredOrders,
  metrics,
  dashboard,
  movements,
  periodLabel
}: {
  filteredOrders: Order[];
  metrics: ReturnType<typeof buildFinanceMetrics>;
  dashboard: ReturnType<typeof buildOperationalFinance>;
  movements: FinanceMovement[];
  periodLabel: string;
}): Record<ReportPreviewKind, ReportDocument> {
  const pendingOrders = filteredOrders.filter((order) => order.status !== 'Cancelado' && !isPaidOrder(order));
  const historicalOrders = filteredOrders.filter((order) => order.status !== 'Cancelado');

  return {
    dre: {
      filename: 'monte-sinai-dre.pdf',
      title: 'DRE operacional',
      description: 'Receitas, saidas e resultado estimado do periodo.',
      period: periodLabel,
      rows: [
        ['Indicador', 'Valor'],
        ['Receita total', money(dashboard.revenue)],
        ['Recebido', money(dashboard.received)],
        ['A receber', money(dashboard.receivable)],
        ['Despesas', money(dashboard.expenses)],
        ['Retiradas', money(dashboard.withdrawals)],
        ['Resultado estimado', money(dashboard.cashBalance)],
        ['Ticket medio', money(dashboard.averageTicket)],
        ['Pedidos validos', String(dashboard.validOrders)],
        ['Cancelados', String(metrics.cancelled)]
      ]
    },
    'cash-flow': {
      filename: 'monte-sinai-fluxo-caixa.pdf',
      title: 'Fluxo de caixa',
      description: 'Entradas, despesas, retiradas e fechamentos em ordem cronologica.',
      period: periodLabel,
      rows: [
        ['Data', 'Tipo', 'Movimentacao', 'Detalhe', 'Direcao', 'Valor'],
        ...movements.map((movement) => [
          shortDate(movement.date),
          financeMovementTypeLabel(movement.type),
          movement.title,
          movement.detail,
          financeMovementDirectionLabel(movement.direction),
          money(financeMovementSignedAmount(movement))
        ])
      ]
    },
    receivable: {
      filename: 'monte-sinai-contas-receber.pdf',
      title: 'Contas a receber',
      description: 'Pedidos que ainda aguardam pagamento.',
      period: periodLabel,
      rows: [
        ['Data', 'Pedido', 'Cliente', 'Status', 'Pagamento', 'Valor'],
        ...pendingOrders.map((order) => [
          shortDate(order.createdAt),
          order.code,
          order.customer.name || 'Cliente',
          order.status,
          order.payment || order.paymentStatus,
          money(order.total)
        ])
      ]
    },
    history: {
      filename: 'monte-sinai-resumo-historico.pdf',
      title: 'Resumo historico de vendas',
      description: 'Pedidos e itens vendidos no periodo selecionado.',
      period: periodLabel,
      rows: [
        ['Data', 'Pedido', 'Cliente', 'Produto', 'Variacao', 'Quantidade', 'Valor unitario', 'Subtotal', 'Status', 'Pagamento'],
        ...historicalOrders.flatMap((order) =>
          order.items.length
            ? order.items.map((item) => [
                shortDate(order.createdAt),
                order.code,
                order.customer.name || 'Cliente',
                item.name || 'Produto',
                item.variation || '',
                String(item.quantity),
                money(item.price),
                money(item.total || item.price * item.quantity),
                order.status,
                order.payment || order.paymentStatus
              ])
            : [[shortDate(order.createdAt), order.code, order.customer.name || 'Cliente', '', '', '0', money(0), money(0), order.status, order.payment || order.paymentStatus]]
        )
      ]
    }
  };
}

function buildStockReportDocument(movements: StockMovement[], periodLabel: string): ReportDocument {
  return {
    filename: 'monte-sinai-relatorio-estoque.pdf',
    title: 'Relatorio de estoque',
    description: 'Entradas, vendas, ajustes, perdas e saldos por produto.',
    period: periodLabel,
    rows: [
      ['Data', 'Tipo', 'Produto', 'Variacao', 'Qtd.', 'Saldo ant.', 'Saldo novo', 'Fornecedor', 'Documento', 'Custo un.', 'Responsavel'],
      ...movements.map((movement) => [
        shortDate(movement.occurredAt),
        stockMovementTypeLabel(movement.type),
        movement.productName || 'Produto',
        movement.variationName || '-',
        String(movement.quantity),
        movement.previousStock === null ? '-' : String(movement.previousStock),
        movement.newStock === null ? '-' : String(movement.newStock),
        movement.supplier || '-',
        movement.document || '-',
        movement.unitCost === null ? '-' : money(movement.unitCost),
        movement.responsibleName || movement.responsibleEmail || '-'
      ])
    ]
  };
}

function stockMovementTypeLabel(type: StockMovement['type']) {
  const labels: Record<StockMovement['type'], string> = {
    entrada: 'Entrada',
    saida_venda: 'Venda',
    ajuste: 'Ajuste',
    ajuste_entrada: 'Ajuste entrada',
    ajuste_saida: 'Ajuste saida',
    cancelamento: 'Cancelamento',
    devolucao: 'Devolucao',
    perda: 'Perda'
  };
  return labels[type] || type;
}

function exportKindToPreview(kind: ExportKind): ReportPreviewKind {
  if (kind === 'transacoes') return 'cash-flow';
  if (kind === 'receber') return 'receivable';
  if (kind === 'historico') return 'history';
  return 'dre';
}

function previewToExportKind(preview: ReportPreviewKind): ExportKind {
  if (preview === 'cash-flow') return 'transacoes';
  if (preview === 'receivable') return 'receber';
  if (preview === 'history') return 'historico';
  return 'dre';
}

function buildOperationalFinance(orders: Order[], entries: FinanceEntry[], range: FinanceRange, selectedDate: string) {
  const validOrders = orders.filter((order) => order.status !== 'Cancelado');
  const paidOrders = validOrders.filter(isPaidOrder);
  const pendingOrders = validOrders.filter((order) => !paidOrders.includes(order));
  const revenue = sum(validOrders.map((order) => order.total));
  const received = sum(paidOrders.map((order) => order.total));
  const receivable = sum(pendingOrders.map((order) => order.total));
  const expenses = sum(entries.filter((entry) => entry.type === 'expense').map((entry) => entry.amount));
  const withdrawals = sum(entries.filter((entry) => entry.type === 'withdrawal').map((entry) => entry.amount));
  const lastCashClose = entries
    .filter((entry) => entry.type === 'cash-close')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const payments = buildOperationalPaymentBreakdown(validOrders);
  const products = buildProductPerformance(validOrders);
  const movements = buildFinanceMovements(validOrders, entries);

  return {
    orders: validOrders,
    revenue,
    received,
    receivable,
    validOrders: validOrders.length,
    paidOrders: paidOrders.length,
    pendingOrders: pendingOrders.length,
    averageTicket: validOrders.length ? revenue / validOrders.length : 0,
    expenses,
    withdrawals,
    expenseCount: entries.filter((entry) => entry.type === 'expense').length,
    withdrawalCount: entries.filter((entry) => entry.type === 'withdrawal').length,
    cashBalance: received - expenses - withdrawals,
    lastCashClose,
    salesChart: buildSalesChart(validOrders, range, selectedDate),
    payments,
    products,
    movementCount: movements.length,
    movements: movements.slice(0, 12)
  };
}

function buildFinanceMovements(orders: Order[], entries: FinanceEntry[]): FinanceMovement[] {
  const orderMovements: FinanceMovement[] = orders
    .filter((order) => order.status !== 'Cancelado' && isPaidOrder(order))
    .map((order) => ({
      id: `order-${order.id}`,
      date: order.createdAt,
      title: `Pedido #${order.code}`,
      detail: `${order.customer.name || 'Cliente'} - ${order.payment || order.paymentStatus}`,
      amount: order.total,
      tone: isPaidOrder(order) ? 'green' : 'blue',
      type: 'order',
      direction: 'entrada'
    }));
  const entryMovements: FinanceMovement[] = entries.map((entry) => ({
    id: `entry-${entry.id}`,
    date: entry.createdAt,
    title: financeEntryMovementTitle(entry),
    detail: entry.note || entry.title,
    amount: entry.amount,
    tone: entry.type === 'expense' ? 'red' : entry.type === 'withdrawal' ? 'pink' : 'violet',
    type: entry.type,
    direction: entry.type === 'cash-close' ? 'conferencia' : 'saida'
  }));

  return [...orderMovements, ...entryMovements].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function financeMovementTypeLabel(type: FinanceMovement['type']) {
  if (type === 'order') return 'Pedido';
  if (type === 'expense') return 'Despesa';
  if (type === 'withdrawal') return 'Retirada';
  return 'Fechamento';
}

function financeMovementDirectionLabel(direction: FinanceMovement['direction']) {
  if (direction === 'entrada') return 'Entrada';
  if (direction === 'saida') return 'Saida';
  return 'Conferencia';
}

function financeMovementSignedAmount(movement: FinanceMovement) {
  return movement.direction === 'saida' ? -movement.amount : movement.amount;
}

function buildSalesChart(orders: Order[], range: FinanceRange, selectedDate: string) {
  const target = parseDateInput(selectedDate);
  if (isSingleDateRange(range)) {
    return getStoreBusinessHourBuckets(target).map((hour) => {
      const hourOrders = orders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt.toDateString() === target.toDateString() && createdAt.getHours() === hour;
      });
      return {
        label: `${String(hour).padStart(2, '0')}h`,
        total: sum(hourOrders.map((order) => order.total))
      };
    });
  }

  const historyStart = getOrderHistoryStart(orders, target);
  const days = range === 'all' ? daysBetween(historyStart, target) : getFinanceRangeDays(range);
  const start = range === 'all' ? historyStart : addDays(target, -(days - 1));

  if (days <= 31) {
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(start, index);
      const dayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === date.toDateString());
      return {
        label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date),
        total: sum(dayOrders.map((order) => order.total))
      };
    });
  }

  if (days <= 365) {
    const months = monthBucketsBetween(start, target);
    return months.map((monthDate) => ({
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(monthDate).replace('.', ''),
      total: sum(
        orders
          .filter((order) => {
            const createdAt = new Date(order.createdAt);
            return createdAt.getFullYear() === monthDate.getFullYear() && createdAt.getMonth() === monthDate.getMonth();
          })
          .map((order) => order.total)
      )
    }));
  }

  return Array.from({ length: target.getFullYear() - start.getFullYear() + 1 }, (_, index) => start.getFullYear() + index).map((year) => ({
    label: String(year),
    total: sum(
      orders
        .filter((order) => new Date(order.createdAt).getFullYear() === year)
        .map((order) => order.total)
    )
  }));
}

function buildOperationalPaymentBreakdown(orders: Order[]) {
  const rows = buildPaymentBreakdown(orders);
  const total = sum(rows.map((row) => row.total));
  return rows.map((row) => ({
    ...row,
    percent: total ? Math.round((row.total / total) * 100) : 0
  }));
}

function buildProductPerformance(orders: Order[]) {
  const products = new Map<string, { name: string; total: number; quantity: number }>();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.productId || item.name;
      const current = products.get(key) || { name: item.name || 'Produto', total: 0, quantity: 0 };
      current.total += item.total || item.price * item.quantity;
      current.quantity += item.quantity || 0;
      products.set(key, current);
    });
  });
  return [...products.values()].sort((left, right) => right.total - left.total).slice(0, 6);
}

function loadFinanceEntries() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(financeEntriesKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FinanceEntry[];
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.type === 'string' && typeof entry.amount === 'number')
      : [];
  } catch {
    return [];
  }
}

function saveFinanceEntries(entries: FinanceEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(financeEntriesKey, JSON.stringify(entries));
}

function buildStockReport(movements: StockMovement[]): StockReportData {
  const positiveTypes = new Set(['entrada', 'ajuste_entrada', 'cancelamento', 'devolucao']);
  const negativeTypes = new Set(['saida_venda', 'ajuste_saida', 'perda']);
  const itemTotals = new Map<string, number>();

  for (const movement of movements) {
    const itemName = movement.variationName ? `${movement.productName} - ${movement.variationName}` : movement.productName;
    itemTotals.set(itemName, (itemTotals.get(itemName) || 0) + movement.quantity);
  }

  return {
    movementCount: movements.length,
    incomingUnits: sum(movements.filter((movement) => positiveTypes.has(movement.type)).map((movement) => movement.quantity)),
    outgoingUnits: sum(movements.filter((movement) => negativeTypes.has(movement.type)).map((movement) => movement.quantity)),
    lostUnits: sum(movements.filter((movement) => movement.type === 'perda').map((movement) => movement.quantity)),
    replacementCost: sum(
      movements
        .filter((movement) => positiveTypes.has(movement.type) && movement.unitCost !== null)
        .map((movement) => movement.quantity * Number(movement.unitCost || 0))
    ),
    topItems: Array.from(itemTotals, ([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 5)
  };
}

function matchesEntryRange(entry: FinanceEntry, range: FinanceRange, selectedDate: string) {
  return matchesFinanceDateRange(entry.createdAt, range, selectedDate);
}

function financeEntryNotificationTitle(type: FinanceEntryType) {
  if (type === 'expense') return 'Despesa registrada';
  if (type === 'withdrawal') return 'Retirada registrada';
  return 'Caixa fechado';
}

function financeEntryMovementTitle(entry: FinanceEntry) {
  if (entry.type === 'expense') return `Despesa - ${entry.title}`;
  if (entry.type === 'withdrawal') return `Retirada - ${entry.title}`;
  return `Fechamento - ${entry.title}`;
}

function financeActionCopy(action: FinanceEntryType) {
  if (action === 'expense') {
    return {
      kicker: 'Saida de caixa',
      title: 'Registrar despesa',
      description: 'Anote pagamentos, compras pequenas, frete, manutencao ou qualquer saida que hoje iria para o papel.',
      defaultTitle: 'Despesa operacional',
      tone: 'red',
      icon: ArrowDownRight
    };
  }
  if (action === 'withdrawal') {
    return {
      kicker: 'Retirada',
      title: 'Registrar retirada',
      description: 'Use para retiradas da administracao, acerto com responsavel ou saidas fora de pedido.',
      defaultTitle: 'Retirada do caixa',
      tone: 'pink',
      icon: Coins
    };
  }
  return {
    kicker: 'Conferencia',
    title: 'Fechar caixa',
    description: 'Registre o valor conferido no fim do turno para comparar com o saldo estimado do painel.',
    defaultTitle: 'Fechamento do caixa',
    tone: 'blue',
    icon: Calculator
  };
}

function buildFinanceMetrics(orders: Order[]) {
  const validOrders = orders.filter((order) => order.status !== 'Cancelado');
  const paidOrders = validOrders.filter(isPaidOrder);
  const pendingOrders = validOrders.filter((order) => !isPaidOrder(order));
  const revenue = sum(validOrders.map((order) => order.total));
  const received = sum(paidOrders.map((order) => order.total));
  const receivable = sum(pendingOrders.map((order) => order.total));
  const byStatus: Record<OrderStatus, number> = { 'A confirmar': 0, Recebido: 0, 'Em separação': 0, 'A caminho': 0, Entregue: 0, Cancelado: 0 };
  orders.forEach((order) => {
    byStatus[order.status] += 1;
  });
  const dailyTotals = buildDailyTotals(validOrders);

  return {
    orders,
    revenue,
    received,
    receivable,
    validOrders: validOrders.length,
    paidOrders: paidOrders.length,
    pendingOrders: pendingOrders.length,
    cancelled: byStatus.Cancelado,
    averageTicket: validOrders.length ? revenue / validOrders.length : 0,
    byStatus,
    dailyTotals,
    sparkline: dailyTotals.slice(-10),
    paidSparkline: buildDailyTotals(paidOrders).slice(-10),
    pendingSparkline: buildDailyTotals(pendingOrders).slice(-10)
  };
}

function buildDailyTotals(orders: Order[]) {
  const buckets = new Map<string, number>();
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    if (!Number.isFinite(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) || 0) + order.total);
  });
  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, total]) => total)
    .slice(-14);
}

function buildPaymentBreakdown(orders: Order[]) {
  const map = new Map<string, number>();
  orders
    .filter((order) => order.status !== 'Cancelado')
    .forEach((order) => {
      const label = order.payment || order.paymentStatus || 'Nao informado';
      map.set(label, (map.get(label) || 0) + order.total);
    });
  return [...map.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total).slice(0, 5);
}

function isPaidOrder(order: Order) {
  return order.paymentStatus === 'Pago' || order.status === 'Entregue';
}

function matchesRange(order: Order, range: FinanceRange, selectedDate: string) {
  return matchesFinanceDateRange(order.createdAt, range, selectedDate);
}

function matchesFinanceDateRange(value: string, range: FinanceRange, selectedDate: string) {
  const createdAt = new Date(value);
  if (!Number.isFinite(createdAt.getTime())) return false;
  if (range === 'all') return true;

  const target = parseDateInput(selectedDate);
  const end = new Date(target);
  end.setHours(23, 59, 59, 999);

  if (isSingleDateRange(range)) {
    return createdAt >= target && createdAt <= end;
  }

  const start = addDays(target, -(getFinanceRangeDays(range) - 1));
  return createdAt >= start && createdAt <= end;
}

function getFinanceRangeDays(range: FinanceRange) {
  if (range === 'date') return 1;
  return financeRangeOptions.find((option) => option.value === range)?.days || 1;
}

function isSingleDateRange(range: FinanceRange) {
  return range === 'today' || range === 'yesterday' || range === 'date';
}

function getFinanceRangeLabel(range: FinanceRange, selectedDate: string) {
  if (range === 'all') return rangeLabels.all;
  const target = parseDateInput(selectedDate);
  if (range === 'date') return formatFinanceDate(selectedDate);
  if (range === 'today' || range === 'yesterday') return `${rangeLabels[range]} · ${formatFinanceDate(selectedDate)}`;

  const start = addDays(target, -(getFinanceRangeDays(range) - 1));
  const startLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(start);
  return `${rangeLabels[range]} · ${startLabel} a ${formatFinanceDate(selectedDate)}`;
}

function formatFinanceDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseDateInput(value));
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getOrderHistoryStart(orders: Order[], fallback: Date) {
  const timestamps = orders
    .map((order) => new Date(order.createdAt).getTime())
    .filter((timestamp) => Number.isFinite(timestamp));

  if (!timestamps.length) return new Date(fallback);

  const start = new Date(Math.min(...timestamps));
  start.setHours(0, 0, 0, 0);
  return start;
}

function daysBetween(start: Date, end: Date) {
  const dayMilliseconds = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMilliseconds) + 1);
}

function monthBucketsBetween(start: Date, end: Date) {
  const months: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

async function downloadReportPdf(report: ReportDocument) {
  const pdf = new jsPDF({
    orientation: report.rows[0]?.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const logo = await getPdfLogoDataUrl();
  const titleX = logo ? 52 : 14;

  if (logo) {
    pdf.addImage(logo, 'PNG', 14, 8, 30, 18);
  }

  pdf.setTextColor(16, 21, 43);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Monte Sinai - App Administrador', titleX, 14);
  pdf.setFontSize(13);
  pdf.text(report.title, titleX, 22);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(82, 96, 121);
  pdf.text(`Periodo: ${report.period}`, titleX, 29);
  pdf.setDrawColor(167, 99, 46);
  pdf.setLineWidth(0.5);
  pdf.line(14, 35, pageWidth - 14, 35);

  autoTable(pdf, {
    startY: 42,
    head: report.rows.length ? [report.rows[0]] : [],
    body: report.rows.slice(1),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: report.rows[0]?.length > 8 ? 7 : 8,
      cellPadding: 2.2,
      lineColor: [202, 212, 227],
      textColor: [16, 21, 43]
    },
    headStyles: {
      fillColor: [109, 53, 217],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [246, 242, 251]
    },
    margin: { left: 14, right: 14 }
  });

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = report.filename;
  link.style.display = 'none';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}
