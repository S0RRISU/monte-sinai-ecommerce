'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  Camera,
  CircleCheck,
  ChevronRight,
  ExternalLink,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  PencilLine,
  PackageCheck,
  PanelTopOpen,
  Phone,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
} from 'lucide-react';
import { fetchStoreProfile, type StoreProfile } from '@/lib/profile-access';
import { buildExternalAppUrl, isRunningAsInstalledApp } from '@/lib/pwa-navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type ProfileAccess = StoreProfile;

type ProfileMenuCard = {
  label: string;
  text: string;
  href: string;
  icon: typeof PackageCheck;
  tone: string;
  external?: boolean;
};

const shoppingCards: ProfileMenuCard[] = [
  { label: 'Pedidos', text: 'Acompanhar status, pagamento e entrega.', href: '/pedidos', icon: PackageCheck, tone: 'blue' },
  { label: 'Carrinho', text: 'Revisar os produtos antes do checkout.', href: '/carrinho', icon: ShoppingCart, tone: 'gold' },
  { label: 'Produtos', text: 'Voltar para a vitrine da loja.', href: '/produtos', icon: Store, tone: 'slate' },
  { label: 'Ofertas', text: 'Ver promocoes ativas na loja.', href: '/produtos?categoria=ofertas', icon: Tags, tone: 'rose' }
];

export function CustomerAccountContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileAccess | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [panelOpening, setPanelOpening] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      setChecking(true);

      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 4500);
        const sessionUser = data.session?.user || null;
        if (!mounted) return;
        setUser(sessionUser);
        await loadProfile(sessionUser);
      } catch {
        if (!mounted) return;
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    async function loadProfile(currentUser: User | null) {
      if (!currentUser) {
        setProfile(null);
        return;
      }

      try {
        const data = await withTimeout(fetchStoreProfile(supabase, currentUser.id), 4500);

        if (mounted) {
          const nextProfile = data || null;
          setProfile(nextProfile);
        }
      } catch {
        if (mounted) setProfile(null);
      }
    }

    void hydrateSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      void loadProfile(nextUser).finally(() => {
        if (mounted) setChecking(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const displayName = getCustomerName(user, profile);
  const initials = getInitials(displayName || user?.email || 'MS');
  const avatarUrl = normalizeAvatar(profile?.avatar_url || profile?.foto || getMetadataAvatar(user));
  const accountEmail = profile?.email || user?.email || '';
  const accountPhone = profile?.telefone || '';
  const accountAddress = profile?.endereco || '';
  const profileCompletion = user
    ? Math.round(
        ([displayName, accountEmail, accountPhone, accountAddress, avatarUrl].filter((value) => Boolean(value)).length / 5) * 100
      )
    : 0;
  const internalAccess = getInternalAccess(profile, user);
  const panelBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://127.0.0.1:3001';
  const panelUrl = buildPanelEntryUrl(panelBaseUrl, accountEmail);
  const { primaryMenuCards, shoppingMenuCards } = useMemo(() => {
    const accountCards: ProfileMenuCard[] = [
      shoppingCards[0],
      {
        label: 'Dados e entrega',
        text: 'Atualizar nome, telefone, foto e endereco.',
        href: '/conta/editar',
        icon: PencilLine,
        tone: 'teal'
      },
      {
        label: 'Seguranca da conta',
        text: 'Conferir acesso, e-mail e sessoes da conta.',
        href: '/conta/detalhes',
        icon: ShieldCheck,
        tone: 'slate'
      },
      {
        label: 'Configuracoes',
        text: 'Tema, privacidade, contato e preferencias.',
        href: '/configuracoes',
        icon: Settings,
        tone: 'rose'
      }
    ];

    const panelCard: ProfileMenuCard | null = internalAccess
      ? {
          label: 'Painel Monte Sinai',
          text: 'Abrir o painel interno autorizado.',
          href: panelUrl,
          icon: PanelTopOpen,
          tone: 'blue',
          external: true
        }
      : null;

    return {
      primaryMenuCards: [...accountCards, ...(panelCard ? [panelCard] : [])],
      shoppingMenuCards: shoppingCards.slice(1)
    };
  }, [internalAccess, panelUrl]);

  function handleSwitchAccount() {
    setError('');
    setMessage('');
    window.location.assign('/login?switch=1&next=/conta');
  }

  async function handleSignOut() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
      setProfile(null);
      setMessage('Voce saiu desta conta neste aparelho.');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Nao foi possivel sair da conta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPanel() {
    setError('');
    setMessage('');

    if (!user || !internalAccess) {
      router.push('/login?next=/conta');
      return;
    }

    if (isRunningAsInstalledApp()) {
      setPanelOpening(true);
      window.location.assign(buildExternalAppUrl(panelBaseUrl, '/dashboard'));
      return;
    }

    const panelOrigin = getUrlOrigin(panelBaseUrl);
    const panelWindow = window.open(panelUrl, 'monte-sinai-admin');

    if (!panelWindow) {
      setError('O navegador bloqueou a abertura do painel. Libere pop-ups para a loja Monte Sinai.');
      return;
    }

    if (!panelOrigin) {
      panelWindow.focus();
      return;
    }

    setPanelOpening(true);

    try {
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
        refreshToken: session.refresh_token,
        issuedAt: Date.now()
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
          setMessage('Painel aberto. Se ele nao entrar automaticamente, confirme a senha uma vez neste navegador.');
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
          setMessage('Painel aberto com a mesma conta.');
        }

        if (response.type === 'monte-sinai-admin-session-rejected') {
          cleanup();
          setError(response.message || 'O painel recusou a sessao enviada pela loja.');
        }
      };

      window.addEventListener('message', handlePanelResponse);
      intervalId = window.setInterval(sendSession, 300);
      sendSession();
      panelWindow.focus();
    } catch (openError) {
      setPanelOpening(false);
      panelWindow.focus();
      setError(openError instanceof Error ? openError.message : 'Nao foi possivel abrir o painel automaticamente.');
    }
  }

  if (checking) {
    return (
      <section className="profile-loading-card">
        <Loader2 className="account-auth-spinner size-7" />
        <span>Conferindo acesso</span>
        <h1>Preparando sua area Monte Sinai</h1>
        <p>Estamos verificando se este aparelho ja possui uma sessao salva.</p>
      </section>
    );
  }

  return (
    <>
      {message ? <p className="account-auth-success">{message}</p> : null}
      {error ? <p className="account-auth-error">{error}</p> : null}

      <section className="profile-command-center">
        <article className={`profile-orbit-card ${user ? 'is-active' : 'is-guest'}`}>
          <div className="profile-orbit-top">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-frame">
                {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : <strong>{initials}</strong>}
              </div>
              <Link href={user ? '/conta/editar' : '/login?next=/conta'} aria-label={user ? 'Editar foto do perfil' : 'Entrar para adicionar foto'}>
                <Camera className="size-4" />
              </Link>
            </div>
            <div className="profile-orbit-copy">
              <small>{user ? 'Perfil conectado' : 'Acesso da loja'}</small>
              <h1>{user ? `Ola, ${displayName}` : 'Entre na sua conta Monte Sinai'}</h1>
              <p>
                {user
                  ? 'Acompanhe suas compras e mantenha seus dados de entrega sempre prontos.'
                  : 'Entre para acompanhar pedidos, salvar seus dados de entrega e comprar com mais agilidade.'}
              </p>
              <div className="profile-identity-facts" aria-label="Dados rapidos da conta">
                <span>
                  <Mail className="size-4" />
                  {accountEmail || 'E-mail nao informado'}
                </span>
                {user ? (
                  <span>
                    <Phone className="size-4" />
                    {accountPhone || 'Telefone pendente'}
                  </span>
                ) : null}
                {user ? (
                  <span>
                    <MapPin className="size-4" />
                    {accountAddress || 'Endereco pendente'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="profile-orbit-meta" aria-label="Resumo do acesso">
            <span>
              <i />
              {internalAccess ? formatInternalAccess(internalAccess) : user ? 'Cliente' : 'Sem login'}
            </span>
            <span>{user ? 'Sessao ativa' : 'Login da loja'}</span>
          </div>

          {user ? (
            <div className="profile-completion" aria-label={`Cadastro ${profileCompletion}% completo`}>
              <div>
                <span>
                  <CircleCheck className="size-4" />
                  Cadastro
                </span>
                <strong>{profileCompletion}% completo</strong>
              </div>
              <div className="profile-completion-track" aria-hidden="true">
                <i style={{ width: `${profileCompletion}%` }} />
              </div>
              <small>
                {profileCompletion === 100
                  ? 'Seus dados essenciais estao completos.'
                  : 'Complete telefone, endereco e foto para agilizar seus pedidos.'}
              </small>
            </div>
          ) : null}

          <div className="profile-session-actions profile-orbit-actions">
            {user ? (
              <>
                <Link href="/conta/editar">
                  <PencilLine className="size-4" />
                  Editar perfil
                </Link>
                <button type="button" onClick={handleSwitchAccount} disabled={loading}>
                  <LogIn className="size-4" />
                  Trocar conta
                </button>
                <button type="button" onClick={() => void handleSignOut()} disabled={loading}>
                  <LogOut className="size-4" />
                  {loading ? 'Saindo...' : 'Sair'}
                </button>
              </>
            ) : (
              <Link href="/login?next=/conta">
                <LogIn className="size-4" />
                Entrar agora
              </Link>
            )}
          </div>
        </article>

        <article className="profile-menu-board">
          <div className="profile-board-heading">
            <span>
              <ReceiptText className="size-5" />
              Minha conta
            </span>
            <h2>Tudo que voce precisa, sem procurar</h2>
            <p>Gerencie compras, dados pessoais, seguranca e preferencias em areas separadas.</p>
          </div>

          <div className="profile-menu-layout">
            <div className="profile-primary-list" aria-label="Acoes principais da conta">
              {primaryMenuCards.map((item) =>
                item.external ? (
                  <button
                    key={item.label}
                    type="button"
                    className={`profile-primary-row is-${item.tone}`}
                    onClick={() => void handleOpenPanel()}
                    disabled={panelOpening}
                  >
                    <span>
                      <item.icon className="size-5" />
                    </span>
                    <strong>{panelOpening ? 'Abrindo painel' : item.label}</strong>
                    <small>{item.text}</small>
                    <ExternalLink className="size-5" />
                  </button>
                ) : (
                  <Link key={item.label} className={`profile-primary-row is-${item.tone}`} href={item.href}>
                    <span>
                      <item.icon className="size-5" />
                    </span>
                    <strong>{item.label}</strong>
                    <small>{item.text}</small>
                    <ChevronRight className="size-5" />
                  </Link>
                )
              )}
            </div>

            <div className="profile-shop-strip" aria-label="Atalhos da loja">
              {shoppingMenuCards.map((item) => (
                <Link key={item.label} className={`profile-shop-link is-${item.tone}`} href={item.href}>
                  <span>
                    <item.icon className="size-5" />
                  </span>
                  <strong>{item.label}</strong>
                  <small>{item.text}</small>
                </Link>
              ))}
            </div>
          </div>
        </article>
      </section>
    </>
  );
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

function buildPanelEntryUrl(baseUrl: string, email: string) {
  try {
    const url = new URL('/login', baseUrl);
    url.searchParams.set('next', '/dashboard');
    url.searchParams.set('handoff', '1');
    if (email.trim()) url.searchParams.set('account', email.trim().toLowerCase());
    return url.toString();
  } catch {
    const params = new URLSearchParams({ next: '/dashboard', handoff: '1' });
    if (email.trim()) params.set('account', email.trim().toLowerCase());
    return `${baseUrl.replace(/\/$/, '')}/login?${params.toString()}`;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Tempo limite ao carregar sessao.'));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
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
  return labels[value] || 'Acesso interno';
}

function getCustomerName(user: User | null, profile: ProfileAccess | null) {
  const metadata = user?.user_metadata || {};
  const name = profile?.nome || metadata.name || metadata.nome || metadata.full_name;
  return typeof name === 'string' && name.trim() ? name.trim() : user?.email?.split('@')[0] || 'Cliente Monte Sinai';
}

function getMetadataAvatar(user: User | null) {
  const metadata = user?.user_metadata || {};
  const avatar = metadata.avatar_url || metadata.photo || metadata.picture;
  return typeof avatar === 'string' ? avatar : '';
}

function normalizeAvatar(value?: string | null) {
  const cleanValue = value?.trim();
  if (!cleanValue || cleanValue.startsWith('data:')) return '';
  return cleanValue;
}

function getInitials(value: string) {
  return (
    value
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'MS'
  );
}
