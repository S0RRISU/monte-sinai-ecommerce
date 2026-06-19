'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  ChevronRight,
  ClipboardList,
  Edit3,
  LogIn,
  LogOut,
  MapPinned,
  MessageCircle,
  PackageSearch,
  Palette,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserRound
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { StoreThemeSettings } from './store-theme-settings';
import { ThemeSettings } from './theme-settings';

type SettingsContentProps = {
  whatsappHref: string;
};

const LOCATION_STORAGE_KEY = 'monte-sinai-delivery-location';
const LOCATION_EVENT = 'monte-sinai-location-updated';

export function CustomerSettingsContent({ whatsappHref }: SettingsContentProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsLoggedIn(Boolean(data.user));
      setLoadingSession(false);
    }

    void loadSession();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const syncNotificationStatus = window.setTimeout(() => setNotificationStatus(readNotificationStatus()), 0);
    return () => window.clearTimeout(syncNotificationStatus);
  }, []);

  async function requestNotifications() {
    setMessage('');
    setError('');

    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      setError('Este navegador nao permite notificacoes da loja.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
    setMessage(permission === 'granted' ? 'Notificacoes liberadas neste aparelho.' : 'Notificacoes nao foram liberadas.');
  }

  function clearSavedLocation() {
    window.localStorage.removeItem(LOCATION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(LOCATION_EVENT));
    setMessage('Endereco salvo removido deste aparelho.');
    setError('');
  }

  function switchAccount() {
    setMessage('');
    setError('');
    window.location.assign('/login?switch=1&next=/conta');
  }

  async function signOut() {
    setMessage('');
    setError('');

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setIsLoggedIn(false);
      setMessage('Voce saiu da conta neste aparelho.');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Nao foi possivel sair da conta.');
    }
  }

  return (
    <div className="settings-desktop-grid">
      {message ? <p className="account-auth-success">{message}</p> : null}
      {error ? <p className="account-auth-error">{error}</p> : null}

      <section className="settings-overview-grid" aria-label="Resumo das configuracoes">
        <article>
          <span><Palette className="size-5" /></span>
          <small>Visual</small>
          <strong>Tema personalizado</strong>
        </article>
        <article>
          <span><Bell className="size-5" /></span>
          <small>Notificacoes</small>
          <strong>{formatNotificationSummary(notificationStatus)}</strong>
        </article>
        <article>
          <span><UserRound className="size-5" /></span>
          <small>Conta</small>
          <strong>{loadingSession ? 'Verificando' : isLoggedIn ? 'Conectada' : 'Visitante'}</strong>
        </article>
      </section>

      <section className="settings-section settings-desktop-main">
        <div className="settings-section-heading">
          <span><Settings2 className="size-5" /></span>
          <div><h2>Aparencia</h2><p>Escolha como a loja aparece neste aparelho.</p></div>
        </div>
        <div className="settings-list">
          <div className="settings-list-row theme-row">
            <ShieldCheck className="size-6" />
            <span>
              <strong>Modo de cor</strong>
              <small>Altera o visual claro, escuro ou automatico neste aparelho.</small>
            </span>
            <ThemeSettings />
          </div>
          <div className="settings-list-row theme-style-row">
            <Palette className="size-6" />
            <span>
              <strong>Estilo da loja</strong>
              <small>Escolha uma identidade visual fiel às cores Monte Sinai.</small>
            </span>
            <StoreThemeSettings />
          </div>
        </div>

        <div className="settings-section-heading">
          <span><Smartphone className="size-5" /></span>
          <div><h2>Privacidade e aparelho</h2><p>Controle permissoes e dados salvos localmente.</p></div>
        </div>
        <div className="settings-list">
          <button className="settings-list-row" type="button" onClick={() => void requestNotifications()}>
            {notificationStatus === 'granted' ? <Bell className="size-6" /> : <BellOff className="size-6" />}
            <span>
              <strong>Notificacoes do navegador</strong>
              <small>{formatNotificationStatus(notificationStatus)}</small>
            </span>
            <ChevronRight className="size-5" />
          </button>
          <InfoRow icon={MapPinned} title="Endereco de entrega" text="Editar endereco, bairro, CEP e referencia." href="/conta/editar#localizacao" />
          <button className="settings-list-row settings-danger-row" type="button" onClick={clearSavedLocation}>
            <Trash2 className="size-6" />
            <span>
              <strong>Limpar endereco deste aparelho</strong>
              <small>Remove somente a localizacao salva localmente.</small>
            </span>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </section>

      <aside className="settings-desktop-side">
        <section className="settings-section">
          <h2>Conta</h2>
          <div className="settings-list">
            <InfoRow icon={UserRound} title="Detalhes da conta" text="Ver dados, acesso e localizacao salva." href="/conta/detalhes" />
            <InfoRow icon={Edit3} title="Editar perfil" text="Alterar nome, foto, telefone e localizacao." href="/conta/editar" />
            {loadingSession ? null : isLoggedIn ? (
              <>
                <button className="settings-list-row" type="button" onClick={switchAccount}>
                  <LogIn className="size-6" />
                  <span>
                    <strong>Trocar conta</strong>
                    <small>Escolhe outra conta sem encerrar esta sessao antes da confirmacao.</small>
                  </span>
                  <ChevronRight className="size-5" />
                </button>
                <button className="settings-list-row logout-settings-row" type="button" onClick={() => void signOut()}>
                  <LogOut className="size-6" />
                  <span>
                    <strong>Sair</strong>
                    <small>Remove a sessao da loja neste aparelho.</small>
                  </span>
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : (
              <InfoRow icon={LogIn} title="Entrar" text="Acessar pedidos, perfil e endereco salvo." href="/login?next=/configuracoes" />
            )}
          </div>
        </section>

        <section className="settings-section">
          <h2>Loja e atendimento</h2>
          <div className="settings-list">
            <InfoRow icon={ClipboardList} title="Meus pedidos" text="Acompanhar status e historico." href="/pedidos" />
            <InfoRow icon={ShoppingCart} title="Carrinho" text="Revisar produtos antes de finalizar." href="/carrinho" />
            <InfoRow icon={PackageSearch} title="Produtos" text="Voltar para a vitrine." href="/produtos" />
            <InfoRow icon={MessageCircle} title="WhatsApp" text="Falar com atendimento." href={whatsappHref} external />
          </div>
        </section>
      </aside>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  text,
  href,
  external = false
}: {
  icon: typeof UserRound;
  title: string;
  text: string;
  href: string;
  external?: boolean;
}) {
  const content = (
    <>
      <Icon className="size-6" />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <ChevronRight className="size-5" />
    </>
  );

  if (external) {
    return (
      <a href={href} className="settings-list-row" target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="settings-list-row">
      {content}
    </Link>
  );
}

function readNotificationStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function formatNotificationStatus(value: NotificationPermission | 'unsupported') {
  if (value === 'granted') return 'Liberadas neste navegador.';
  if (value === 'denied') return 'Bloqueadas pelo navegador.';
  if (value === 'default') return 'Pedir permissao neste aparelho.';
  return 'Nao suportadas neste navegador.';
}

function formatNotificationSummary(value: NotificationPermission | 'unsupported') {
  if (value === 'granted') return 'Ativas';
  if (value === 'denied') return 'Bloqueadas';
  if (value === 'default') return 'Nao configuradas';
  return 'Indisponiveis';
}
