'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronDown,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Headphones,
  Home,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  Truck,
  UserRound,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { readRecentAdminUsers, rememberAdminUser, type RecentAdminAccount } from '@/lib/admin-accounts';
import { fetchAdminOrders, signOut } from '@/lib/admin-services';
import { officialStoreUrl } from '@/lib/constants';
import { canAccessModule, type AdminModule } from '@/lib/module-access';
import { isDeveloper } from '@/lib/roles';
import { useAdminStore, type AdminNotification } from '@/store/admin-store';
import { PwaRoleManager } from './pwa-role-manager';
import { ThemeToggle } from './theme-toggle';

const adminNav = [
  { href: '/dashboard', module: 'dashboard' as AdminModule, label: 'Painel', helper: 'Resumo do dia', icon: LayoutDashboard },
  { href: '/pedidos', module: 'pedidos' as AdminModule, label: 'Pedidos', helper: 'Status e pagamento', icon: ClipboardList },
  { href: '/produtos', module: 'produtos' as AdminModule, label: 'Produtos', helper: 'Catálogo da loja', icon: Package },
  { href: '/estoque', module: 'estoque' as AdminModule, label: 'Estoque', helper: 'Reposição', icon: Boxes }
];

const developerNav = [
  ...adminNav,
  { href: '/clientes', module: 'clientes' as AdminModule, label: 'Clientes', helper: 'CRM', icon: Users },
  { href: '/entregas', module: 'entregas' as AdminModule, label: 'Entregas', helper: 'Rotas', icon: Truck },
  { href: '/financeiro', module: 'financeiro' as AdminModule, label: 'Financeiro', helper: 'Caixa', icon: CreditCard },
  { href: '/relatorios', module: 'relatorios' as AdminModule, label: 'Relatórios', helper: 'KPIs', icon: BarChart3 },
  { href: '/promocoes', module: 'promocoes' as AdminModule, label: 'Promoções', helper: 'Campanhas', icon: Tag },
  { href: '/atendimento', module: 'atendimento' as AdminModule, label: 'Atendimento', helper: 'Tickets', icon: Headphones },
  { href: '/usuarios', module: 'usuarios' as AdminModule, label: 'Usuários', helper: 'Permissões', icon: ShieldCheck },
  { href: '/configuracoes', module: 'configuracoes' as AdminModule, label: 'Config.', helper: 'Sistema', icon: Settings },
  { href: '/logs', module: 'logs' as AdminModule, label: 'Logs', helper: 'Auditoria', icon: MonitorCog }
];

const quickAdmin = [
  { href: '/pedidos?novo=1', module: 'pedidos' as AdminModule, label: 'Novo pedido', icon: ClipboardList, tone: 'quick-blue' },
  { href: '/produtos?novo=1', module: 'produtos' as AdminModule, label: 'Novo produto', icon: Package, tone: 'quick-green' },
  { href: '/estoque', module: 'estoque' as AdminModule, label: 'Estoque baixo', icon: Boxes, tone: 'quick-amber' }
];

const quickDeveloper = [
  { href: '/logs', module: 'logs' as AdminModule, label: 'Logs', icon: MonitorCog, tone: 'quick-cyan' },
  { href: '/usuarios', module: 'usuarios' as AdminModule, label: 'Usuários', icon: ShieldCheck, tone: 'quick-purple' },
  { href: '/configuracoes', module: 'configuracoes' as AdminModule, label: 'Config', icon: Settings, tone: 'quick-blue' }
];

const welcomeSessionStorageKey = 'monte-sinai-admin-welcome-open';

type NavItem = (typeof developerNav)[number];

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pickBottomItems(items: NavItem[], modules: AdminModule[]) {
  const preferred = modules
    .map((module) => items.find((item) => item.module === module))
    .filter(Boolean) as NavItem[];
  const remaining = items.filter((item) => !preferred.some((picked) => picked.module === item.module));
  return [...preferred, ...remaining].slice(0, 4);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, orders, notifications, setOrders, setError, dismissNotification, clearNotifications } = useAdminStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<RecentAdminAccount[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedToastId, setDismissedToastId] = useState('');
  const welcomeMarker = profile?.id || '';
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    if (typeof window === 'undefined' || !welcomeMarker) return false;
    return window.sessionStorage.getItem(welcomeSessionStorageKey) !== welcomeMarker;
  });
  const [welcomeLeaving, setWelcomeLeaving] = useState(false);
  const developer = isDeveloper(profile?.role || 'cliente');
  const role = profile?.role || 'cliente';
  const moduleAccess = profile?.moduleAccess;
  const navItems = developerNav.filter((item) => canAccessModule(role, moduleAccess, item.module));
  const quickItems = (developer ? quickDeveloper : quickAdmin).filter((item) => canAccessModule(role, moduleAccess, item.module));
  const canSeeOrders = canAccessModule(role, moduleAccess, 'pedidos');
  const openOrderCount = orders.filter(isPendingOrder).length;
  const appLabel = developer ? 'App desenvolvedor' : 'App administrador';
  const activeItem = navItems.find((item) => matchesPath(pathname, item.href));
  const mobileTitle = activeItem?.label || 'Painel';
  const dashboardMobile = matchesPath(pathname, '/dashboard');
  const latestNotification = notifications[0] || null;
  const toastNotification = latestNotification && latestNotification.id !== dismissedToastId ? latestNotification : null;

  useEffect(() => {
    if (!profile?.email) return;
    rememberAdminUser({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl
    });
  }, [profile?.avatarUrl, profile?.email, profile?.name]);

  const bottomItems = developer
    ? pickBottomItems(navItems, ['dashboard', 'produtos', 'pedidos', 'configuracoes'])
    : pickBottomItems(navItems, ['dashboard', 'produtos', 'pedidos', 'configuracoes']);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  async function handleSwitchAccount(nextEmail?: string) {
    await signOut();
    const params = new URLSearchParams();
    params.set('next', pathname || '/dashboard');
    if (nextEmail) {
      params.set('account', nextEmail);
      params.set('auto', '1');
    }
    router.replace(`/login?${params.toString()}`);
  }

  function handleToggleAccountMenu() {
    setNotificationsOpen(false);
    const nextOpen = !accountMenuOpen;
    if (nextOpen) setRecentAccounts(readRecentAdminUsers());
    setAccountMenuOpen(nextOpen);
  }

  function handleOpenNotification(notification: AdminNotification) {
    dismissNotification(notification.id);
    setNotificationsOpen(false);
    if (notification.href) {
      router.push(notification.href);
    }
  }

  function closeWelcome() {
    if (welcomeLeaving) return;
    setWelcomeLeaving(true);
  }

  useEffect(() => {
    const latest = notifications[0];
    if (!latest) return;
    const timer = window.setTimeout(() => {
      setDismissedToastId(latest.id);
    }, 4400);

    return () => window.clearTimeout(timer);
  }, [notifications]);

  useEffect(() => {
    if (!welcomeOpen) return;
    const timer = window.setTimeout(() => {
      setWelcomeLeaving(true);
    }, 3400);

    return () => window.clearTimeout(timer);
  }, [welcomeOpen, welcomeMarker]);

  useEffect(() => {
    if (!welcomeLeaving) return;
    const timer = window.setTimeout(() => {
      if (welcomeMarker) window.sessionStorage.setItem(welcomeSessionStorageKey, welcomeMarker);
      setWelcomeOpen(false);
      setWelcomeLeaving(false);
    }, 620);

    return () => window.clearTimeout(timer);
  }, [welcomeLeaving, welcomeMarker]);

  useEffect(() => {
    if (!canSeeOrders || orders.length) return;

    let active = true;
    async function loadOrderBadges() {
      try {
        const nextOrders = await fetchAdminOrders();
        if (active) setOrders(nextOrders);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar contador de pedidos.');
      }
    }

    void loadOrderBadges();
    return () => {
      active = false;
    };
  }, [canSeeOrders, orders.length, setError, setOrders]);

  return (
    <div className={`admin-app-frame min-h-screen bg-admin text-[color:var(--admin-text)] ${welcomeLeaving ? 'is-revealing' : ''}`}>
      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-40 w-[284px] border-r p-4 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent items={navItems} pathname={pathname} appLabel={appLabel} orderBadgeCount={openOrderCount} onClose={() => setMenuOpen(false)} />
      </aside>

      {menuOpen ? <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/50 lg:hidden" type="button" onClick={() => setMenuOpen(false)} /> : null}

      <div className="lg:pl-[284px]">
        <header className="admin-topbar sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <button className="admin-icon-button lg:hidden" type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
              <Menu className="size-5" />
            </button>

            {dashboardMobile ? (
              <Link href="/dashboard" className="admin-mobile-logo min-w-0 lg:hidden">
                <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" />
              </Link>
            ) : (
              <div className="admin-mobile-title min-w-0 lg:hidden">
                <ChevronLeft className="size-5" />
                <span>{mobileTitle}</span>
              </div>
            )}

            <Link href="/dashboard" className="admin-topbar-brand hidden min-w-0 items-center gap-3 lg:flex">
              <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" className="h-10 w-auto object-contain" />
              <span className="hidden min-w-0 md:block">
                <span className="block truncate text-sm font-black uppercase text-[color:var(--admin-text)]">Monte Sinai</span>
                <span className="block truncate text-xs font-bold text-[color:var(--admin-muted)]">{appLabel}</span>
              </span>
            </Link>

            <label className="relative ml-auto hidden min-w-[260px] max-w-xl flex-1 xl:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[color:var(--admin-muted)]" />
              <input className="admin-input h-11 pl-11" placeholder="Buscar pedidos, clientes e produtos..." />
            </label>

            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            <div className="ml-auto lg:hidden">
              <ThemeToggle variant="compact" />
            </div>

            <div className="relative">
              <button className={`admin-icon-button admin-bell-button ${notifications.length ? 'has-notifications' : ''}`} type="button" aria-label="Notificações" onClick={() => setNotificationsOpen((value) => !value)}>
                <Bell className="size-5" />
                {notifications.length ? (
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#ffd447] px-1 text-[0.62rem] font-black text-slate-950">
                    {notifications.length}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? <NotificationsPanel items={notifications} onClear={clearNotifications} onOpen={handleOpenNotification} /> : null}
            </div>

            <div className="relative">
              <button className="admin-profile-chip" type="button" onClick={handleToggleAccountMenu} aria-expanded={accountMenuOpen} aria-haspopup="menu">
                <ProfileAvatar name={profile?.name || 'Monte Sinai'} avatarUrl={profile?.avatarUrl} />
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block truncate text-sm font-black text-[color:var(--admin-text)]">{profile?.name || 'Administrador'}</span>
                  <span className="block truncate text-xs text-[color:var(--admin-muted)]">{profile?.email || 'Sessao ativa'}</span>
                </span>
                <ChevronDown className="hidden size-4 text-[color:var(--admin-muted)] md:block" />
              </button>
              {accountMenuOpen ? (
                <AccountMenu
                  profileName={profile?.name || 'Administrador'}
                  profileEmail={profile?.email || ''}
                  avatarUrl={profile?.avatarUrl}
                  recentAccounts={recentAccounts}
                  onSwitch={handleSwitchAccount}
                  onSignOut={handleSignOut}
                  onClose={() => setAccountMenuOpen(false)}
                />
              ) : null}
            </div>
          </div>

          {!dashboardMobile ? (
            <div className="admin-quick-strip mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {quickItems.map((item) => (
                <Link key={item.href} href={item.href} className={`admin-quick-pill ${item.tone}`}>
                  <item.icon className="size-4" />
                  {item.label}
                  {item.module === 'pedidos' && openOrderCount ? <OrderBadge count={openOrderCount} /> : null}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-[1540px] px-4 pb-28 pt-5 md:px-6 lg:pb-10 lg:pt-7">
          <PwaRoleManager role={profile?.role} />

          <div key={pathname} className="admin-page-transition">
            {children}
          </div>
        </main>
      </div>

      <nav
        className="admin-bottom-nav fixed inset-x-3 bottom-3 z-30 grid gap-1 rounded-[28px] border border-[color:var(--admin-border)] bg-[color:var(--admin-bg-soft)] p-2 shadow-2xl backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.max(bottomItems.length, 1)}, minmax(0, 1fr))` }}
      >
        {bottomItems.map((item) => {
          const active = matchesPath(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`admin-bottom-item ${active ? 'is-active' : ''}`}>
              <item.icon className="size-5" />
              <span>{item.label}</span>
              {item.module === 'pedidos' && openOrderCount ? <OrderBadge count={openOrderCount} /> : null}
            </Link>
          );
        })}
      </nav>

      {toastNotification ? <AdminNotificationToast item={toastNotification} onClose={() => setDismissedToastId(toastNotification.id)} /> : null}
      {welcomeOpen && profile ? (
        <WelcomeGreeting
          profileName={profile.name || profile.email || 'Administrador'}
          leaving={welcomeLeaving}
          onClose={closeWelcome}
        />
      ) : null}
    </div>
  );
}

function isPendingOrder(order: { status: string }) {
  return order.status !== 'Entregue' && order.status !== 'Cancelado';
}

function OrderBadge({ count }: { count: number }) {
  return <span className="admin-order-badge">{count > 99 ? '99+' : count}</span>;
}

function ProfileAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'MS';

  return (
    <span className="admin-avatar">
      {avatarUrl && failedUrl !== avatarUrl ? <img src={avatarUrl} alt={name} onError={() => setFailedUrl(avatarUrl)} /> : <strong>{initials}</strong>}
      <i />
    </span>
  );
}

function SidebarContent({
  items,
  pathname,
  appLabel,
  orderBadgeCount,
  onClose
}: {
  items: NavItem[];
  pathname: string;
  appLabel: string;
  orderBadgeCount: number;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-start justify-between gap-3 rounded-[24px] border border-[color:var(--admin-border)] bg-[color:var(--admin-card)] p-4">
        <div>
          <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" className="h-16 w-auto object-contain" />
          <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--admin-muted)]">{appLabel}</p>
        </div>
        <button className="admin-icon-button lg:hidden" type="button" aria-label="Fechar menu" onClick={onClose}>
          <X className="size-5" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {items.map((item) => {
          const active = matchesPath(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`admin-nav-link ${active ? 'is-active' : ''}`} onClick={onClose}>
              <item.icon className="size-5" />
              <span>
                <span>{item.label}</span>
                <small>{item.helper}</small>
              </span>
              {item.module === 'pedidos' && orderBadgeCount ? <OrderBadge count={orderBadgeCount} /> : null}
            </Link>
          );
        })}
      </nav>

      <a className="admin-store-card mt-4 rounded-[22px] border border-[color:var(--admin-border)] bg-[color:var(--admin-card)] p-4" href={officialStoreUrl}>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white">
            <Home className="size-5" />
          </span>
          <div>
            <p className="font-black text-[color:var(--admin-text)]">Loja oficial</p>
            <p className="text-xs text-[color:var(--admin-muted)]">PWA separado do painel</p>
          </div>
          <ArrowUpRight className="ml-auto size-4 text-[color:var(--admin-muted)]" />
        </div>
      </a>
    </div>
  );
}

function AccountMenu({
  profileName,
  profileEmail,
  avatarUrl,
  recentAccounts,
  onSwitch,
  onSignOut,
  onClose
}: {
  profileName: string;
  profileEmail: string;
  avatarUrl?: string;
  recentAccounts: RecentAdminAccount[];
  onSwitch: (email?: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}) {
  const otherAccounts = recentAccounts.filter((account) => account.email.toLowerCase() !== profileEmail.toLowerCase());

  return (
    <>
      <button className="admin-account-scrim" type="button" aria-label="Fechar menu da conta" onClick={onClose} />
      <section className="admin-account-menu" role="menu">
        <header>
          <ProfileAvatar name={profileName} avatarUrl={avatarUrl} />
          <div>
            <strong>{profileName}</strong>
            <small>{profileEmail || 'Sessao ativa'}</small>
          </div>
        </header>

        <button type="button" className="admin-account-action" onClick={() => onSwitch()}>
          <UserRound className="size-4" />
          <span>
            <strong>Trocar de conta</strong>
            <small>Ir para a tela de login com outra conta.</small>
          </span>
        </button>

        {otherAccounts.length ? (
          <div className="admin-account-recent">
            <p>Contas salvas</p>
            {otherAccounts.map((account) => (
              <button key={account.email} type="button" onClick={() => onSwitch(account.email)}>
                <span>
                  {account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : account.name.slice(0, 2).toUpperCase()}
                </span>
                <strong>{account.name}</strong>
              </button>
            ))}
          </div>
        ) : null}

        <button type="button" className="admin-account-action is-danger" onClick={onSignOut}>
          <LogOut className="size-4" />
          <span>
            <strong>Sair da conta</strong>
            <small>Encerrar esta sessao do painel.</small>
          </span>
        </button>
      </section>
    </>
  );
}

function NotificationsPanel({ items, onClear, onOpen }: { items: AdminNotification[]; onClear: () => void; onOpen: (item: AdminNotification) => void }) {
  return (
    <section className="admin-notifications absolute right-0 top-12 w-[min(360px,calc(100vw-2rem))] rounded-[22px] border border-[color:var(--admin-border)] bg-[color:var(--admin-bg-soft)] p-3 shadow-2xl">
      <div className="admin-notifications-header">
        <h2 className="text-sm font-black text-[color:var(--admin-text)]">Notificações</h2>
        {items.length ? (
          <button type="button" onClick={onClear}>
            Limpar
          </button>
        ) : null}
      </div>
      <div className="admin-notification-list">
        {items.length ? (
          items.map((item) => (
            <button key={item.id} type="button" className={`admin-notification-item is-${item.tone} rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-card)] p-3`} onClick={() => onOpen(item)}>
              <span className="admin-notification-icon">
                <NotificationIcon tone={item.tone} />
              </span>
              <span className="admin-notification-copy">
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className="admin-notification-route">
                {item.href ? 'Abrir' : 'Lida'}
                <ArrowUpRight className="size-3.5" />
              </span>
            </button>
          ))
        ) : (
          <article className="admin-notification-empty rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-card)] p-3">
            <p className="text-sm font-black text-[color:var(--admin-text)]">Nenhuma notificação nova</p>
            <p className="mt-1 text-xs leading-5 text-[color:var(--admin-muted)]">Ações como salvar, atualizar, alterar status e excluir aparecem aqui.</p>
          </article>
        )}
      </div>
    </section>
  );
}

function NotificationIcon({ tone }: { tone: AdminNotification['tone'] }) {
  const iconMap = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
    info: Info
  } satisfies Record<AdminNotification['tone'], typeof CheckCircle2>;
  const Icon = iconMap[tone];
  return <Icon className="size-4" />;
}

function AdminNotificationToast({ item, onClose }: { item: AdminNotification; onClose: () => void }) {
  const iconMap = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
    info: Info
  } satisfies Record<AdminNotification['tone'], typeof CheckCircle2>;
  const Icon = iconMap[item.tone];

  return (
    <section className={`admin-notification-toast is-${item.tone}`} role="status" aria-live="polite">
      <span className="admin-notification-toast-icon">
        <Icon className="size-5" />
      </span>
      <div>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Fechar notificacao">
        <X className="size-4" />
      </button>
    </section>
  );
}

function WelcomeGreeting({ profileName, leaving, onClose }: { profileName: string; leaving: boolean; onClose: () => void }) {
  const firstName = profileName.split(/\s+/).filter(Boolean)[0] || 'Administrador';
  const suffix = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().endsWith('a') ? 'bem-vinda' : 'bem-vindo';

  return (
    <section
      className={`admin-welcome-screen ${leaving ? 'is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Ola, ${firstName}. Seja ${suffix}.`}
    >
      <div className="admin-welcome-screen-glow" aria-hidden="true" />
      <div className="admin-welcome-screen-content">
        <div className="admin-welcome-mark">
          <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" />
        </div>
        <span>Ola, {firstName}</span>
        <h2>Seja {suffix}</h2>
        <p>Seu painel Monte Sinai esta pronto para comecar.</p>
        <div className="admin-welcome-progress" aria-hidden="true">
          <i />
        </div>
        <button type="button" onClick={onClose}>
          Entrar no painel
          <ArrowUpRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
