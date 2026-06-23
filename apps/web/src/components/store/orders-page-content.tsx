'use client';

import type { User } from '@supabase/supabase-js';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  XCircle,
  type LucideIcon
} from 'lucide-react';
import { getLocalOrders, type SavedOrder } from '@/lib/checkout';
import { buildExternalAppUrl, isRunningAsInstalledApp } from '@/lib/pwa-navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { money } from '@/lib/store-data';

type TrackedOrder = {
  id: string;
  uuid?: string;
  createdAt?: string;
  status: string;
  confirmed?: boolean;
  payment: string;
  paymentStatus: string;
  total: number;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  items: Array<{ nome: string; variacao?: string; quantidade: number; total: number }>;
};

type CustomerOrder = SavedOrder | TrackedOrder;

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type CustomerStatusMeta = {
  label: string;
  step: number;
  className: string;
};

type InternalOrderFilter = 'today' | 'open' | 'all';

type QuickOrderAction = {
  label: string;
  nextStatus: string;
  databaseStatus: string;
  confirmed: boolean | null;
};

const internalStatusOptions = [
  { value: 'a_confirmar', label: 'A confirmar', nextStatus: 'A confirmar', confirmed: false },
  { value: 'recebido', label: 'Recebido', nextStatus: 'Recebido', confirmed: true },
  { value: 'em_separacao', label: 'Em separacao', nextStatus: 'Em separacao', confirmed: true },
  { value: 'saiu_para_entrega', label: 'Saiu para entrega', nextStatus: 'A caminho', confirmed: true },
  { value: 'entregue', label: 'Entregue', nextStatus: 'Entregue', confirmed: true },
  { value: 'cancelado', label: 'Cancelado', nextStatus: 'Cancelado', confirmed: true }
] as const;

type ProfileAccess = {
  email?: string | null;
  role?: string | null;
  admin_role?: string | null;
  is_admin?: boolean | null;
};

type ProfilesTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: ProfileAccess | null; error: { message: string } | null }>;
    };
  };
};

type PedidoItemRow = {
  id?: string | null;
  nome?: string | null;
  variacao?: string | null;
  quantidade?: number | string | null;
  total?: number | string | null;
};

type PedidoRow = {
  id?: string | null;
  codigo?: string | null;
  status?: string | null;
  confirmado?: boolean | null;
  pagamento?: string | null;
  pagamento_status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  endereco_entrega?: string | null;
  pedido_itens?: PedidoItemRow[] | null;
};

type TrackedOrderResponse = {
  id?: string | null;
  uuid?: string | null;
  createdAt?: string | null;
  status?: string | null;
  confirmed?: boolean | null;
  payment?: string | null;
  paymentStatus?: string | null;
  total?: number | string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  items?: Array<{
    nome?: string | null;
    variacao?: string | null;
    quantidade?: number | string | null;
    total?: number | string | null;
  }> | null;
};

type OrdersSelectQuery = {
  order: (
    column: string,
    options: { ascending: boolean }
  ) => {
    limit: (count: number) => Promise<{ data: PedidoRow[] | null; error: { message: string } | null }>;
  };
};

type OrdersTable = {
  select: (columns: string) => OrdersSelectQuery;
};

export function OrdersPageContent() {
  const router = useRouter();
  const localStorageReady = useSyncExternalStore(subscribeToBrowserHydration, getBrowserSnapshot, getServerSnapshot);
  const orders = useMemo(() => localStorageReady ? getLocalOrders() : [], [localStorageReady]);
  const [remoteOrders, setRemoteOrders] = useState<TrackedOrder[]>([]);
  const [trackedLocalOrders, setTrackedLocalOrders] = useState<TrackedOrder[]>([]);
  const [remoteOrdersLoading, setRemoteOrdersLoading] = useState(false);
  const [remoteOrdersError, setRemoteOrdersError] = useState('');
  const [internalOrderFilter, setInternalOrderFilter] = useState<InternalOrderFilter>('today');
  const [savingOrderId, setSavingOrderId] = useState('');
  const [expandedOrderKey, setExpandedOrderKey] = useState('');
  const [expandedDetailsKey, setExpandedDetailsKey] = useState('');
  const initializedLatestOrder = useRef(false);
  const authenticatedUserRef = useRef(false);
  const orderCardRefs = useRef(new Map<string, HTMLElement>());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileAccess | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [, setPanelOpening] = useState(false);
  const [panelMessage, setPanelMessage] = useState('');
  const [panelError, setPanelError] = useState('');
  const allCustomerOrders = useMemo(
    () => mergeCustomerOrders([...remoteOrders, ...trackedLocalOrders], orders),
    [orders, remoteOrders, trackedLocalOrders]
  );
  const summary = useMemo(() => buildOrderSummary(allCustomerOrders), [allCustomerOrders]);
  const internalAccess = getInternalAccess(profile, user);
  const panelBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://127.0.0.1:3001';
  const opsSummary = useMemo(() => buildOpsSummary(remoteOrders), [remoteOrders]);
  const visibleOpsOrders = useMemo(
    () => filterOpsOrders(remoteOrders, internalOrderFilter).slice(0, 10),
    [internalOrderFilter, remoteOrders]
  );

  const centerOrderTimeline = useCallback((key: string, behavior: ScrollBehavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const card = orderCardRefs.current.get(key);
        const timeline = card?.querySelector('.orders-timeline-wrap');
        (timeline || card)?.scrollIntoView({ behavior, block: 'center' });
      });
    });
  }, []);

  useEffect(() => {
    if (initializedLatestOrder.current || checkingAccess || remoteOrdersLoading || !allCustomerOrders.length) return;
    initializedLatestOrder.current = true;
    const latestKey = orderKey(allCustomerOrders[0]);
    setExpandedOrderKey(latestKey);
    centerOrderTimeline(latestKey, 'auto');
  }, [allCustomerOrders, centerOrderTimeline, checkingAccess, remoteOrdersLoading]);

  const refreshRemoteOrders = useCallback(async (silent = false) => {
    const supabase = getSupabaseBrowserClient();
    if (!silent) setRemoteOrdersLoading(true);
    setRemoteOrdersError('');

    try {
      const ordersTable = supabase.from('pedidos') as unknown as OrdersTable;
      const { data: orderRows, error: orderError } = await ordersTable
        .select(
          'id,codigo,status,confirmado,pagamento,pagamento_status,total,created_at,cliente_nome,cliente_telefone,endereco_entrega,pedido_itens(id,nome,variacao,quantidade,total)'
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (orderError) {
        setRemoteOrders([]);
        setRemoteOrdersError(orderError.message || 'Nao foi possivel carregar pedidos da sua conta.');
        return;
      }

      setRemoteOrders((orderRows || []).map(mapPedidoRow));
    } finally {
      if (!silent) setRemoteOrdersLoading(false);
    }
  }, []);

  const refreshTrackedLocalOrders = useCallback(async (silent = false) => {
    if (!orders.length) {
      setTrackedLocalOrders([]);
      return;
    }

    if (!silent) setRemoteOrdersLoading(true);

    try {
      const supabase = getSupabaseBrowserClient() as unknown as RpcClient;
      const results = await Promise.all(
        orders.map(async (order) => {
          const { data, error } = await supabase.rpc('track_order', {
            p_codigo: order.code,
            p_cliente_telefone: order.customerPhone
          });

          if (error) return null;
          return mapTrackedOrderResponse(data);
        })
      );

      setTrackedLocalOrders(results.filter((order): order is TrackedOrder => order !== null));
    } finally {
      if (!silent) setRemoteOrdersLoading(false);
    }
  }, [orders]);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function loadAccess() {
      setCheckingAccess(true);
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;

        const nextUser = data.user || null;
        authenticatedUserRef.current = Boolean(nextUser);
        setUser(nextUser);

        if (!nextUser) {
          setProfile(null);
          setRemoteOrders([]);
          setRemoteOrdersError('');
          await refreshTrackedLocalOrders();
          return;
        }

        const profiles = supabase.from('profiles') as unknown as ProfilesTable;
        const { data: profileData } = await profiles
          .select('email, role, admin_role, is_admin')
          .eq('id', nextUser.id)
          .maybeSingle();

        if (!active) return;

        setProfile(profileData || null);
        await refreshRemoteOrders();
        await refreshTrackedLocalOrders(true);
      } finally {
        if (active) {
          setCheckingAccess(false);
        }
      }
    }

    void loadAccess();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void loadAccess();
    });
    const ordersChannel = supabase
      .channel('store-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        if (authenticatedUserRef.current) void refreshRemoteOrders(true);
        void refreshTrackedLocalOrders(true);
      })
      .subscribe();
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (authenticatedUserRef.current) void refreshRemoteOrders(true);
      void refreshTrackedLocalOrders(true);
    };
    const guestTrackingInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshTrackedLocalOrders(true);
    }, 12_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      subscription.unsubscribe();
      void supabase.removeChannel(ordersChannel);
      window.clearInterval(guestTrackingInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshRemoteOrders, refreshTrackedLocalOrders]);

  async function handleOpenInternalShortcut(nextPath: string) {
    setPanelError('');
    setPanelMessage('');

    if (!user || !internalAccess) {
      router.push(`/login?next=${encodeURIComponent('/pedidos')}`);
      return;
    }

    if (isRunningAsInstalledApp()) {
      setPanelOpening(true);
      window.location.assign(buildExternalAppUrl(panelBaseUrl, nextPath));
      return;
    }

    const panelOrigin = getUrlOrigin(panelBaseUrl);
    const panelUrl = buildPanelEntryUrl(panelBaseUrl, nextPath, profile?.email || user?.email || '');
    const panelWindow = window.open(panelUrl, 'monte-sinai-admin');

    if (!panelWindow) {
      setPanelError('O navegador bloqueou a abertura da area interna. Libere pop-ups para a loja Monte Sinai.');
      return;
    }

    if (!panelOrigin) {
      panelWindow.focus();
      return;
    }

    setPanelOpening(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Sua sessao da loja expirou. Entre novamente.');

      const { data, error: sessionError } = await supabase.auth.getSession();
      const session = data.session;
      if (sessionError || !session?.access_token || !session.refresh_token) {
        throw new Error('Nao foi possivel preparar a sessao para o painel.');
      }

      const payload = {
        type: 'monte-sinai-admin-session',
        email: session.user.email || profile?.email || user.email || '',
        accessToken: session.access_token,
        refreshToken: session.refresh_token
      };

      let attempts = 0;
      let intervalId: number | null = null;

      const cleanup = () => {
        if (intervalId !== null) window.clearInterval(intervalId);
        window.removeEventListener('message', handlePanelResponse);
        setPanelOpening(false);
      };

      const sendSession = () => {
        if (panelWindow.closed) {
          cleanup();
          return;
        }

        panelWindow.postMessage(payload, panelOrigin);
        attempts += 1;

        if (attempts >= 40) {
          cleanup();
          setPanelMessage('Area interna aberta. Se ela nao entrar automaticamente, confirme a senha uma vez neste navegador.');
        }
      };

      const handlePanelResponse = (event: MessageEvent) => {
        if (event.origin !== panelOrigin || !event.data || typeof event.data !== 'object') return;
        const response = event.data as { type?: string; message?: string };

        if (response.type === 'monte-sinai-admin-ready') {
          sendSession();
          return;
        }

        if (response.type === 'monte-sinai-admin-session-accepted') {
          cleanup();
          setPanelMessage('Atalho aberto com a mesma conta.');
        }

        if (response.type === 'monte-sinai-admin-session-rejected') {
          cleanup();
          setPanelError(response.message || 'A area interna recusou a sessao enviada pela loja.');
        }
      };

      window.addEventListener('message', handlePanelResponse);
      intervalId = window.setInterval(sendSession, 300);
      sendSession();
      panelWindow.focus();
    } catch (openError) {
      setPanelOpening(false);
      panelWindow.focus();
      setPanelError(openError instanceof Error ? openError.message : 'Nao foi possivel abrir a area interna automaticamente.');
    }
  }

  async function handleQuickStatus(order: TrackedOrder, action: QuickOrderAction) {
    const orderId = order.uuid || order.id;
    setPanelError('');
    setPanelMessage('');
    setSavingOrderId(orderId);

    try {
      const supabase = getSupabaseBrowserClient() as unknown as RpcClient;
      const { error } = await supabase.rpc('admin_update_order', {
        p_id: orderId,
        p_status: action.databaseStatus,
        p_pagamento_status: null,
        p_confirmado: action.confirmed
      });

      if (error) throw new Error(error.message);
      await refreshRemoteOrders(true);
      setPanelMessage(`Pedido #${order.id} atualizado para ${getCustomerStatusMeta(action.nextStatus, action.confirmed ?? true).label}.`);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Nao foi possivel atualizar o pedido por aqui.');
    } finally {
      setSavingOrderId('');
    }
  }

  async function handleStatusSelection(order: TrackedOrder, databaseStatus: string) {
    const statusOption = internalStatusOptions.find((option) => option.value === databaseStatus);
    if (!statusOption) return;
    await handleQuickStatus(order, {
      label: statusOption.label,
      nextStatus: statusOption.nextStatus,
      databaseStatus: statusOption.value,
      confirmed: statusOption.confirmed
    });
  }

  async function handleDeleteOrder(order: TrackedOrder) {
    const orderId = order.uuid || order.id;
    if (!window.confirm(`Excluir definitivamente o pedido #${order.id}? Esta acao nao pode ser desfeita.`)) return;

    setPanelError('');
    setPanelMessage('');
    setSavingOrderId(orderId);
    try {
      const supabase = getSupabaseBrowserClient() as unknown as RpcClient;
      const { error } = await supabase.rpc('admin_delete_order', { p_id: orderId });
      if (error) throw new Error(error.message);
      await refreshRemoteOrders(true);
      setPanelMessage(`Pedido #${order.id} excluido.`);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Nao foi possivel excluir o pedido.');
    } finally {
      setSavingOrderId('');
    }
  }

  return (
    <>
      {!checkingAccess && internalAccess ? (
        <section className="orders-quick-access">
          <header>
            <span>
              <ShieldCheck className="size-4" />
              Acesso {formatInternalAccess(internalAccess)}
            </span>
            <h1>Operacao de pedidos</h1>
            <p>Atualize cada etapa sem sair da loja. As mudancas sao salvas no Supabase e refletidas no painel administrativo.</p>
            <button type="button" className="orders-sync-button" onClick={() => void refreshRemoteOrders()} disabled={remoteOrdersLoading}>
              <RefreshCw className="size-4" />
              {remoteOrdersLoading ? 'Atualizando...' : 'Atualizar pedidos'}
            </button>
            {panelMessage ? <small className="is-success">{panelMessage}</small> : null}
            {panelError ? <small className="is-error">{panelError}</small> : null}
          </header>
          <div className="orders-ops-panel">
            <div className="orders-ops-stats" aria-label="Resumo operacional">
              <button type="button" className={internalOrderFilter === 'today' ? 'is-active' : undefined} onClick={() => setInternalOrderFilter('today')}>
                <span>Hoje</span>
                <strong>{opsSummary.today}</strong>
              </button>
              <button type="button" className={internalOrderFilter === 'open' ? 'is-active' : undefined} onClick={() => setInternalOrderFilter('open')}>
                <span>Abertos</span>
                <strong>{opsSummary.open}</strong>
              </button>
              <button type="button" className={internalOrderFilter === 'all' ? 'is-active' : undefined} onClick={() => setInternalOrderFilter('all')}>
                <span>Todos</span>
                <strong>{opsSummary.total}</strong>
              </button>
            </div>

            <div className="orders-ops-list" aria-label="Pedidos para resolver">
              {remoteOrdersLoading ? <p className="orders-loading-line">Carregando pedidos...</p> : null}
              {!remoteOrdersLoading && visibleOpsOrders.length ? (
                visibleOpsOrders.map((order) => {
                  const action = getQuickOrderAction(order);
                  const rowId = order.uuid || order.id;
                  const saving = savingOrderId === rowId;
                  return (
                    <article key={rowId} className="orders-ops-row">
                      <div>
                        <strong>#{order.id}</strong>
                        <span>{formatDate(order.createdAt || '')}</span>
                      </div>
                      <div>
                        <b>{order.customerName || 'Cliente sem nome'}</b>
                        <span>{order.customerPhone || order.address || 'Sem contato informado'}</span>
                      </div>
                      <OrderStatusBadge status={order.status} confirmed={order.confirmed} />
                      <strong>{money(order.total)}</strong>
                      <div className="orders-ops-row-actions">
                        <label>
                          <span>Status</span>
                          <select
                            value={getDatabaseStatusValue(order)}
                            onChange={(event) => void handleStatusSelection(order, event.target.value)}
                            disabled={saving}
                            aria-label={`Alterar status do pedido ${order.id}`}
                          >
                            {internalStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        {action ? <small>Proxima acao: {action.label}</small> : null}
                        <button type="button" onClick={() => handleOpenInternalShortcut(`/pedidos?pedido=${encodeURIComponent(rowId)}`)}>
                          Detalhes
                        </button>
                        <button type="button" className="is-danger" onClick={() => void handleDeleteOrder(order)} disabled={saving}>
                          <Trash2 className="size-4" />
                          Excluir
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : null}
              {!remoteOrdersLoading && !visibleOpsOrders.length ? (
                <article className="orders-ops-empty">
                  <CheckCircle2 className="size-5" />
                  <div>
                    <strong>Nada nesta fila</strong>
                    <span>Troque o filtro para ver outros pedidos.</span>
                  </div>
                </article>
              ) : null}
            </div>

            <div className="orders-ops-footer">
              <button type="button" onClick={() => handleOpenInternalShortcut('/pedidos?novo=1')}>
                <ShoppingBag className="size-4" />
                Venda presencial
              </button>
              <button type="button" onClick={() => handleOpenInternalShortcut('/pedidos?periodo=all')}>
                <Search className="size-4" />
                Lista completa
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!checkingAccess && internalAccess ? null : (
        <section className="orders-customer-hero">
          <div>
            <span className="orders-eyebrow">Area do cliente</span>
            <h1>Acompanhe seu pedido em tempo real.</h1>
            <p>
              Veja confirmacao, separacao, saida para entrega e conclusao em uma linha do tempo simples e atualizada.
            </p>
            <div className="orders-hero-actions">
              <Link href="/produtos">
                Comprar de novo
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/conta">Minha conta</Link>
            </div>
          </div>

          <div className="orders-hero-card" aria-label="Resumo de pedidos">
            <span>Resumo neste aparelho</span>
            <strong>{summary.count}</strong>
            <small>{summary.count === 1 ? 'pedido salvo' : 'pedidos salvos'}</small>
            <div>
              <p>Total recente</p>
              <b>{money(summary.total)}</b>
            </div>
            {remoteOrdersLoading ? <em>Atualizando pedidos...</em> : null}
          </div>
        </section>
      )}

      {!checkingAccess && !internalAccess ? <>
      <section className="orders-account-notice">
        <div>
          <ShieldCheck className="size-6" />
          <span>Seus pedidos aparecem automaticamente</span>
          <h2>Nenhum codigo precisa ser digitado.</h2>
          <p>Abra qualquer pedido abaixo para ver os produtos, o pagamento e cada etapa da entrega.</p>
        </div>
        {!user ? <Link href="/login?next=%2Fpedidos">Entrar para sincronizar pedidos</Link> : null}
      </section>

      <section className="order-history-list orders-client-history" aria-label="Pedidos recentes">
        <div className="section-header">
          <div>
            <span>Historico do cliente</span>
            <h2>Recentes neste aparelho</h2>
          </div>
          <Link href="/produtos">Comprar novamente</Link>
        </div>

        {remoteOrdersError ? <p className="checkout-message">{remoteOrdersError}</p> : null}
        {remoteOrdersLoading ? <p className="orders-loading-line">Carregando pedidos da sua conta...</p> : null}

        {allCustomerOrders.length ? (
          <div className="orders-card-grid">
            {allCustomerOrders.map((order, index) => {
              const key = orderKey(order);
              return (
                <CustomerOrderCard
                  key={key}
                  order={order}
                  recent={index === 0}
                  expanded={expandedOrderKey === key}
                  detailsExpanded={expandedDetailsKey === key}
                  registerCard={(node) => {
                    if (node) orderCardRefs.current.set(key, node);
                    else orderCardRefs.current.delete(key);
                  }}
                  onToggle={() => {
                    const opening = expandedOrderKey !== key;
                    setExpandedOrderKey(opening ? key : '');
                    setExpandedDetailsKey('');
                    if (opening) centerOrderTimeline(key);
                  }}
                  onToggleDetails={() => setExpandedDetailsKey((current) => current === key ? '' : key)}
                />
              );
            })}
          </div>
        ) : !remoteOrdersLoading ? (
          <article className="orders-empty-card">
            <ClipboardList className="size-8" />
            <div>
              <h2>Nenhum pedido encontrado</h2>
              <p>Pedidos confirmados pela loja aparecem aqui automaticamente quando a conta tem acesso.</p>
              <Link href="/produtos">Comprar agora</Link>
            </div>
          </article>
        ) : null}
      </section>
      </> : null}
    </>
  );
}

function subscribeToBrowserHydration() {
  return () => undefined;
}

function getBrowserSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function CustomerOrderCard({
  order,
  recent,
  expanded,
  detailsExpanded,
  registerCard,
  onToggle,
  onToggleDetails
}: {
  order: CustomerOrder;
  recent: boolean;
  expanded: boolean;
  detailsExpanded: boolean;
  registerCard: (node: HTMLElement | null) => void;
  onToggle: () => void;
  onToggleDetails: () => void;
}) {
  const code = orderCode(order);
  const items = isTrackedOrder(order)
    ? order.items.map((item, index) => ({
        id: `${item.nome}-${index}`,
        quantity: item.quantidade,
        name: item.nome,
        variation: item.variacao
      }))
    : order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        name: item.productShortName,
        variation: item.variationLabel
      }));

  return (
    <article ref={registerCard} className={`order-history-card order-customer-card ${recent ? 'is-recent' : ''} ${expanded ? 'is-expanded' : ''}`}>
      <button type="button" className="order-customer-card-trigger" onClick={onToggle} aria-expanded={expanded}>
        <div>
          {recent ? <span className="order-recent-badge">Pedido mais recente</span> : null}
          <OrderStatusBadge status={order.status} confirmed={orderConfirmed(order)} />
          <h3>Pedido #{code}</h3>
          <p>{formatDate(order.createdAt || '')}</p>
        </div>
        <div className="order-card-preview">
          <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
          <strong>{money(Number(order.total || 0))}</strong>
        </div>
        <span className="order-card-open-label">
          {expanded ? 'Fechar detalhes' : 'Ver detalhes'}
          <ChevronDown className="size-5" />
        </span>
      </button>
      {expanded ? (
        <div className="order-customer-details">
          <OrderTimeline status={order.status} confirmed={orderConfirmed(order)} />
          <button type="button" className="order-extra-details-toggle" onClick={onToggleDetails} aria-expanded={detailsExpanded}>
            <span>{detailsExpanded ? 'Ocultar pagamento e itens' : 'Ver pagamento, entrega e itens'}</span>
            <ChevronDown className="size-5" />
          </button>
          {detailsExpanded ? (
            <div className="order-extra-details">
              <div className="orders-live-meta">
                <InfoChip icon={CreditCard} label="Pagamento" value={orderPaymentStatus(order)} />
                <InfoChip icon={ShoppingBag} label="Total" value={money(Number(order.total || 0))} />
                <InfoChip icon={MapPin} label="Entrega" value={orderAddress(order)} />
              </div>
              <div className="order-customer-items">
                <strong>Itens do pedido</strong>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <span>{item.quantity}x {item.name}{item.variation ? ` - ${item.variation}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function OrderStatusBadge({ status, confirmed }: { status: string; confirmed?: boolean }) {
  const meta = getCustomerStatusMeta(status, confirmed);

  return (
    <span className={`order-status-pill ${meta.className}`}>
      {renderCustomerStatusIcon(meta.className)}
      {meta.label}
    </span>
  );
}

function OrderTimeline({ status, confirmed }: { status: string; confirmed?: boolean }) {
  const meta = getCustomerStatusMeta(status, confirmed);
  const current = meta.step;
  const steps = [
    { label: 'A confirmar', text: 'Loja revisa o pedido.' },
    { label: 'Recebido', text: 'Pedido aceito pela loja.' },
    { label: 'Separacao', text: 'Produtos em preparo.' },
    { label: 'Em rota', text: 'Saiu para entrega.' },
    { label: 'Entregue', text: 'Compra finalizada.' }
  ];
  const isCanceled = meta.className === 'is-canceled';
  const progress = isCanceled ? 0 : Math.max(0, Math.min(100, (current / (steps.length - 1)) * 100));
  const isDelivered = meta.className === 'is-delivered';
  const progressStyle = {
    '--order-progress': `${progress}%`,
    '--order-duration': `${Math.max(0.1, current * 0.62)}s`
  } as CSSProperties;

  return (
    <div className={`orders-timeline-wrap ${isDelivered ? 'is-delivered' : ''} ${isCanceled ? 'is-canceled' : ''}`} style={progressStyle}>
      <div className="orders-progress-head">
        <span>{isCanceled ? 'Pedido cancelado' : isDelivered ? 'Pedido entregue' : 'Trajetoria do pedido'}</span>
        <strong>{Math.round(progress)}%</strong>
      </div>
      {isCanceled ? (
        <article className="orders-current-status-card is-canceled">
          <span><XCircle className="size-6" /></span>
          <div><small>Status atual</small><strong>Cancelado</strong><p>Este pedido foi cancelado.</p></div>
        </article>
      ) : (
        <div className="orders-journey">
          <div className="orders-progress-bar" aria-hidden="true"><span /></div>
          <ol className="orders-journey-steps">
            {steps.map((step, index) => (
              <li
                key={step.label}
                className={index < current ? 'is-complete' : index === current ? 'is-current' : 'is-pending'}
                style={{ '--step-delay': `${index * 620}ms` } as CSSProperties}
              >
                <span>{renderOrderStepIcon(index)}</span>
                <div><strong>{step.label}</strong><small>{step.text}</small></div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {isDelivered ? <DeliveredConfetti /> : null}
    </div>
  );
}

function DeliveredConfetti() {
  const celebrationRef = useRef<HTMLDivElement>(null);
  const colors = ['#ffd32a', '#006cff', '#20c997', '#ff6f59', '#8b5cf6'];

  useEffect(() => {
    const celebration = celebrationRef.current;
    const deliveredIcon = celebration
      ?.closest('.orders-timeline-wrap')
      ?.querySelector('.orders-journey-steps li.is-current > span');
    if (!celebration || !deliveredIcon) return;

    let frame = 0;
    const updateOrigin = () => {
      const rect = deliveredIcon.getBoundingClientRect();
      celebration.style.setProperty('--confetti-origin-x', `${rect.left + rect.width / 2}px`);
      celebration.style.setProperty('--confetti-origin-y', `${rect.top + rect.height / 2}px`);
    };
    const scheduleOriginUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateOrigin);
    };
    const stopTracking = () => {
      updateOrigin();
      window.removeEventListener('scroll', scheduleOriginUpdate);
      window.removeEventListener('resize', scheduleOriginUpdate);
    };

    scheduleOriginUpdate();
    window.addEventListener('scroll', scheduleOriginUpdate, { passive: true });
    window.addEventListener('resize', scheduleOriginUpdate);
    const lockTimer = window.setTimeout(stopTracking, 2860);

    return () => {
      window.clearTimeout(lockTimer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleOriginUpdate);
      window.removeEventListener('resize', scheduleOriginUpdate);
    };
  }, []);

  return (
    <div
      ref={celebrationRef}
      className="orders-delivered-celebration"
      aria-hidden="true"
    >
      {Array.from({ length: 32 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 32 + ((index * 17) % 11) * 0.025;
        const distance = 20 + ((index * 23) % 39);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        return (
          <i
            key={index}
            style={{
              '--confetti-delay': `${2880 + (index % 6) * 18}ms`,
              '--confetti-color': colors[index % colors.length],
              '--confetti-mid-x': `${x * 0.7}vmax`,
              '--confetti-mid-y': `${y * 0.7 - 5}vmax`,
              '--confetti-x': `${x}vmax`,
              '--confetti-y': `${y + 12}vmax`,
              '--confetti-size': `${6 + (index % 4) * 2}px`,
              '--confetti-mid-turn': `${280 + (index % 5) * 100}deg`,
              '--confetti-turn': `${420 + (index % 5) * 150}deg`
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

function renderOrderStepIcon(step: number) {
  if (step >= 4) return <CheckCircle2 className="size-6" />;
  if (step === 3) return <Truck className="size-6" />;
  if (step === 2) return <PackageCheck className="size-6" />;
  if (step === 1) return <ClipboardList className="size-6" />;
  return <Clock3 className="size-6" />;
}

function renderCustomerStatusIcon(className: string) {
  if (className === 'is-delivered') return <CheckCircle2 className="size-4" />;
  if (className === 'is-route') return <Truck className="size-4" />;
  if (className === 'is-progress') return <PackageCheck className="size-4" />;
  if (className === 'is-received') return <ClipboardList className="size-4" />;
  if (className === 'is-canceled') return <XCircle className="size-4" />;
  return <Clock3 className="size-4" />;
}

function InfoChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="orders-info-chip">
      <Icon className="size-5" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isTrackedOrder(order: CustomerOrder): order is TrackedOrder {
  return 'id' in order && !('code' in order);
}

function orderCode(order: CustomerOrder) {
  return isTrackedOrder(order) ? order.id : order.code;
}

function orderConfirmed(order: CustomerOrder) {
  return isTrackedOrder(order) ? order.confirmed : true;
}

function orderPaymentStatus(order: CustomerOrder) {
  return isTrackedOrder(order) ? order.paymentStatus : order.paymentStatus;
}

function orderAddress(order: CustomerOrder) {
  return order.address || 'Endereco informado no pedido';
}

function orderKey(order: CustomerOrder) {
  return isTrackedOrder(order) ? order.uuid || order.id : order.code;
}

function buildOrderSummary(orders: CustomerOrder[]) {
  return {
    count: orders.length,
    total: orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  };
}

function buildOpsSummary(orders: TrackedOrder[]) {
  return {
    today: orders.filter(isTodayOrder).length,
    open: orders.filter(isOpenOrder).length,
    total: orders.length
  };
}

function filterOpsOrders(orders: TrackedOrder[], filter: InternalOrderFilter) {
  if (filter === 'today') return orders.filter(isTodayOrder);
  if (filter === 'open') return orders.filter(isOpenOrder);
  return orders;
}

function isTodayOrder(order: TrackedOrder) {
  if (!order.createdAt) return false;
  const date = new Date(order.createdAt);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isOpenOrder(order: TrackedOrder) {
  const clean = normalizeStatus(order.status);
  return !['entregue', 'cancelado'].includes(clean);
}

function getQuickOrderAction(order: TrackedOrder): QuickOrderAction | null {
  const clean = normalizeStatus(order.status);
  if (clean === 'cancelado' || clean === 'entregue') return null;
  if (!order.confirmed || clean === 'a confirmar') {
    return { label: 'Aceitar', nextStatus: 'Recebido', databaseStatus: 'recebido', confirmed: true };
  }
  if (clean === 'recebido') {
    return { label: 'Separar', nextStatus: 'Em separacao', databaseStatus: 'em_separacao', confirmed: true };
  }
  if (['em separacao', 'preparando', 'em preparo', 'pronto para entrega'].includes(clean)) {
    return { label: 'Despachar', nextStatus: 'A caminho', databaseStatus: 'saiu_para_entrega', confirmed: true };
  }
  if (['saiu para entrega', 'a caminho', 'em rota', 'rota'].includes(clean)) {
    return { label: 'Concluir', nextStatus: 'Entregue', databaseStatus: 'entregue', confirmed: true };
  }
  return null;
}

function getDatabaseStatusValue(order: TrackedOrder) {
  const clean = normalizeStatus(order.status);
  if (!order.confirmed || clean === 'a confirmar') return 'a_confirmar';
  if (clean === 'cancelado') return 'cancelado';
  if (clean === 'entregue') return 'entregue';
  if (['saiu para entrega', 'a caminho', 'em rota', 'rota'].includes(clean)) return 'saiu_para_entrega';
  if (['em separacao', 'preparando', 'em preparo', 'pronto para entrega'].includes(clean)) return 'em_separacao';
  return 'recebido';
}

function mergeCustomerOrders(remoteOrders: TrackedOrder[], localOrders: SavedOrder[]): CustomerOrder[] {
  const uniqueRemoteOrders = Array.from(
    new Map(remoteOrders.map((order) => [normalizeCode(order.id), order])).values()
  );
  const remoteCodes = new Set(uniqueRemoteOrders.map((order) => normalizeCode(order.id)));
  const localOnly = localOrders.filter((order) => !remoteCodes.has(normalizeCode(order.code)));
  return [...uniqueRemoteOrders, ...localOnly].sort((left, right) => {
    const leftDate = isTrackedOrder(left) ? left.createdAt : left.createdAt;
    const rightDate = isTrackedOrder(right) ? right.createdAt : right.createdAt;
    return new Date(rightDate || 0).getTime() - new Date(leftDate || 0).getTime();
  });
}

function mapPedidoRow(row: PedidoRow): TrackedOrder {
  return {
    id: row.codigo || row.id || 'pedido',
    uuid: row.id || undefined,
    createdAt: row.created_at || undefined,
    status: row.status || 'Recebido',
    confirmed: row.confirmado ?? true,
    payment: row.pagamento || 'Pagamento',
    paymentStatus: row.pagamento_status || 'Pendente',
    total: toNumber(row.total),
    customerName: row.cliente_nome || '',
    customerPhone: row.cliente_telefone || '',
    address: row.endereco_entrega || '',
    items: (row.pedido_itens || []).map((item) => ({
      nome: item.nome || 'Item',
      variacao: item.variacao || '',
      quantidade: toNumber(item.quantidade, 1),
      total: toNumber(item.total)
    }))
  };
}

function mapTrackedOrderResponse(data: unknown): TrackedOrder | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as TrackedOrderResponse;
  if (!row.id) return null;

  return {
    id: row.id,
    uuid: row.uuid || undefined,
    createdAt: row.createdAt || undefined,
    status: row.status || 'Recebido',
    confirmed: row.confirmed ?? true,
    payment: row.payment || 'Pagamento',
    paymentStatus: row.paymentStatus || 'Pendente',
    total: toNumber(row.total),
    customerName: row.customer?.name || '',
    customerPhone: row.customer?.phone || '',
    address: row.customer?.address || '',
    items: (row.items || []).map((item) => ({
      nome: item.nome || 'Item',
      variacao: item.variacao || '',
      quantidade: toNumber(item.quantidade, 1),
      total: toNumber(item.total)
    }))
  };
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function formatDate(value: string) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getCustomerStatusMeta(status: string, confirmed = false): CustomerStatusMeta {
  const clean = normalizeStatus(status);
  if (clean === 'cancelado') return { label: 'Cancelado', step: 0, className: 'is-canceled' };
  if (clean === 'entregue') return { label: 'Entregue', step: 4, className: 'is-delivered' };
  if (['saiu para entrega', 'a caminho', 'em rota', 'rota'].includes(clean)) return { label: 'A caminho', step: 3, className: 'is-route' };
  if (['em separacao', 'preparando', 'em preparo', 'pronto para entrega'].includes(clean)) {
    return { label: 'Em preparo', step: 2, className: 'is-progress' };
  }
  if (['recebido', 'pedido enviado', 'pendente'].includes(clean)) {
    return confirmed
      ? { label: 'Pedido recebido', step: 1, className: 'is-received' }
      : { label: 'Aguardando confirmacao', step: 0, className: 'is-waiting' };
  }
  if (clean === 'a confirmar') return { label: 'Aguardando confirmacao', step: 0, className: 'is-waiting' };
  return { label: status || 'Pedido recebido', step: 1, className: 'is-received' };
}

function normalizeStatus(status: string) {
  return status
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
}

function getInternalAccess(profile: ProfileAccess | null, user: User | null) {
  const adminRole = (profile?.admin_role || '').toLowerCase();
  const role = (profile?.role || '').toLowerCase();
  if (profile?.is_admin || ['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(adminRole)) return adminRole || 'admin';
  if (['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(role)) return role;

  const appMetadata = user?.app_metadata || {};
  const appAdminRole = typeof appMetadata.admin_role === 'string' ? appMetadata.admin_role.toLowerCase() : '';
  const appRole = typeof appMetadata.role === 'string' ? appMetadata.role.toLowerCase() : '';
  if (appMetadata.is_admin === true || ['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(appAdminRole)) return appAdminRole || 'admin';
  if (['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(appRole)) return appRole;

  return '';
}

function buildPanelEntryUrl(baseUrl: string, nextPath: string, email: string) {
  try {
    const url = new URL('/login', baseUrl);
    url.searchParams.set('next', nextPath);
    url.searchParams.set('handoff', '1');
    if (email.trim()) url.searchParams.set('account', email.trim().toLowerCase());
    return url.toString();
  } catch {
    const params = new URLSearchParams({ next: nextPath, handoff: '1' });
    if (email.trim()) params.set('account', email.trim().toLowerCase());
    return `${baseUrl.replace(/\/$/, '')}/login?${params.toString()}`;
  }
}

function getUrlOrigin(value: string) {
  try {
    return new URL(value, window.location.origin).origin;
  } catch {
    return '';
  }
}

function formatInternalAccess(value: string) {
  const labels: Record<string, string> = {
    developer: 'Developer',
    owner: 'Administrador',
    admin: 'Administrador',
    staff: 'Equipe',
    equipe: 'Equipe',
    motoboy: 'Entregador'
  };
  return labels[value] || 'interno';
}
