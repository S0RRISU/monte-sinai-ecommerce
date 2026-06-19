'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck, UserRound, Users } from 'lucide-react';
import { getCurrentProfile, signInWithMagicLink, signInWithPassword, signOut } from '@/lib/admin-services';
import { readRecentAdminUsers, rememberAdminUser, type RecentAdminAccount } from '@/lib/admin-accounts';
import { officialStoreUrl, storeConfig } from '@/lib/constants';
import { canAccessAdmin } from '@/lib/roles';
import { getSupabaseClient } from '@/lib/supabase';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const blockedSession = searchParams.get('semAcesso') === '1';
  const switchingAccount = searchParams.get('trocarConta') === '1';
  const accountParam = searchParams.get('account') || '';
  const expectedAccount = accountParam.trim().toLowerCase();
  const autoSwitch = searchParams.get('auto') === '1';
  const handoffRequested = searchParams.get('handoff') === '1';
  const [email, setEmail] = useState(expectedAccount);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recentUsers, setRecentUsers] = useState<RecentAdminAccount[]>(() => {
    return readRecentAdminUsers();
  });
  const visibleNotice = notice || (handoffRequested ? 'Aguardando a sessao segura enviada pela loja...' : '');

  useEffect(() => {
    let active = true;

    async function continueActiveSession() {
      if (blockedSession || autoSwitch || switchingAccount) {
        if (active) setCheckingSession(false);
        return;
      }

      try {
        const profile = await getCurrentProfile();
        if (!active) return;
        if (profile && canAccessAdmin(profile.role)) {
          const activeAccount = profile.email.trim().toLowerCase();
          if (expectedAccount && activeAccount && activeAccount !== expectedAccount) {
            await signOut();
            if (!active) return;
            setEmail(expectedAccount);
            setNotice(`Sessao anterior do painel encerrada. Entre com ${expectedAccount}.`);
            setCheckingSession(false);
            return;
          }
          rememberAdminUser({
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl
          });
          router.replace(nextPath);
          return;
        }
        if (profile) {
          await signOut();
          if (!active) return;
          setError('Esta conta nao tem permissao para acessar o painel.');
        }
      } catch {
        // An expired or invalid session should fall back to the regular login form.
      }

      if (active) setCheckingSession(false);
    }

    void continueActiveSession();
    return () => {
      active = false;
    };
  }, [autoSwitch, blockedSession, expectedAccount, nextPath, router, switchingAccount]);

  useEffect(() => {
    if (!handoffRequested) return;

    const storeOrigins = getTrustedStoreOrigins();
    let replyOrigin = storeOrigins[0] || '';
    let active = true;
    let readyInterval: number | null = null;
    let fallbackTimer: number | null = null;

    function postToStore(message: Record<string, unknown>) {
      if (!window.opener || !storeOrigins.length) return;
      const targets = replyOrigin ? [replyOrigin] : storeOrigins;
      targets.forEach((origin) => {
        window.opener?.postMessage(message, origin);
      });
    }

    async function acceptHandoff(event: MessageEvent) {
      if (!active || !isTrustedStoreOrigin(event.origin, storeOrigins)) return;
      replyOrigin = event.origin;
      const payload = parseHandoffPayload(event.data);
      if (!payload) return;

      if (expectedAccount && payload.email && payload.email !== expectedAccount) {
        const message = `A loja enviou ${payload.email}, mas esta entrada espera ${expectedAccount}.`;
        setError(message);
        postToStore({ type: 'monte-sinai-admin-session-rejected', message });
        return;
      }

      setLoading(true);
      setError('');
      setNotice('Validando sessao recebida da loja...');

      try {
        const client = getSupabaseClient();
        const { error: sessionError } = await client.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken
        });

        if (sessionError) throw sessionError;

        const profile = await getCurrentProfile();
        if (!profile || !canAccessAdmin(profile.role)) {
          await signOut();
          throw new Error('Esta conta nao tem permissao para acessar o painel.');
        }

        setRecentUsers((current) =>
          rememberAdminUser(
            {
              email: profile.email,
              name: profile.name,
              avatarUrl: profile.avatarUrl
            },
            current
          )
        );
        postToStore({ type: 'monte-sinai-admin-session-accepted' });
        router.replace(nextPath);
      } catch (handoffError) {
        const message = handoffError instanceof Error ? handoffError.message : 'Nao foi possivel entrar automaticamente.';
        setError(message);
        postToStore({ type: 'monte-sinai-admin-session-rejected', message });
      } finally {
        if (active) setLoading(false);
      }
    }

    window.addEventListener('message', acceptHandoff);
    readyInterval = window.setInterval(() => {
      postToStore({ type: 'monte-sinai-admin-ready', account: expectedAccount });
    }, 350);
    postToStore({ type: 'monte-sinai-admin-ready', account: expectedAccount });
    fallbackTimer = window.setTimeout(() => {
      if (active) setNotice('Se a entrada automatica nao concluir, confirme a senha uma vez neste app.');
    }, 7000);

    return () => {
      active = false;
      window.removeEventListener('message', acceptHandoff);
      if (readyInterval !== null) window.clearInterval(readyInterval);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, [expectedAccount, handoffRequested, nextPath, router]);

  function rememberUser(account: string | Partial<RecentAdminAccount>) {
    setRecentUsers((current) => rememberAdminUser(account, current));
  }

  function selectRecentUser(account: RecentAdminAccount) {
    setEmail(account.email);
    setPassword('');
    setError('');
    setNotice('Conta selecionada. Se o navegador tiver a senha salva, confirme a entrada.');
  }

  async function handleSwitchUser() {
    setError('');
    setEmail('');
    setPassword('');
    setNotice('Escolha uma conta salva ou digite outro e-mail. A sessao atual so muda quando a nova entrada for confirmada.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      const profile = await getCurrentProfile();
      if (!profile || !canAccessAdmin(profile.role)) {
        await signOut();
        throw new Error('Esta conta nao tem permissao para acessar o painel.');
      }
      rememberUser({
        email,
        name: profile?.name || email.split('@')[0],
        avatarUrl: profile?.avatarUrl
      });
      router.replace(nextPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    const cleanEmail = email.trim().toLowerCase();
    setError('');
    setNotice('');
    if (!cleanEmail) {
      setError('Informe o e-mail da conta antes de enviar o link de acesso.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}${nextPath}` : undefined;
      await signInWithMagicLink(cleanEmail, redirectTo);
      rememberUser(cleanEmail);
      setNotice('Enviei um link de acesso para esse e-mail. Abra o link para entrar sem digitar senha.');
    } catch (magicError) {
      setError(magicError instanceof Error ? magicError.message : 'Nao foi possivel enviar o link de acesso.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="admin-login-page bg-admin">
        <section className="glass-card admin-login-checking">
          <span className="admin-login-spinner" />
          <strong>Abrindo o painel...</strong>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-login-page bg-admin">
      <section className="glass-card admin-login-card">
        <aside className="admin-login-hero">
          <div>
            <img src={storeConfig.logo} alt="Monte Sinai" className="w-52" />
            <p>Painel administrativo</p>
            <h1>Entre com uma conta da equipe</h1>
            <span>Login protegido por Supabase Auth, permissoes reais e bloqueio por modulo.</span>
          </div>
          <div className="admin-login-security">
            <ShieldCheck className="size-5" />
            <span>Admin e desenvolvedor usam apps separados.</span>
          </div>
        </aside>

        <form className="admin-login-panel" onSubmit={handleSubmit}>
          <div className="admin-login-heading">
            <span>
              <UserRound className="size-5" />
            </span>
            <div>
              <p>Acesso do painel</p>
              <h2>Escolha a conta e entre</h2>
            </div>
          </div>

          {blockedSession ? (
            <p className="admin-login-success">
              A conta anterior nao tinha acesso ao painel e foi desconectada automaticamente.
            </p>
          ) : null}

          {autoSwitch && accountParam ? (
            <p className="admin-login-success">
              Conta selecionada para troca rapida. Se o navegador tiver a senha salva, confirme para entrar.
            </p>
          ) : null}

          {switchingAccount ? (
            <p className="admin-login-success">
              Escolha a conta que deseja usar. A sessao atual so muda quando a nova entrada for confirmada.
            </p>
          ) : null}

          {recentUsers.length ? (
            <div className="admin-login-recent">
              <div>
                <Users className="size-4" />
                <span>Contas recentes</span>
              </div>
              <div className="admin-login-accounts">
                {recentUsers.map((account) => (
                  <button key={account.email} type="button" className={email === account.email ? 'is-selected' : ''} onClick={() => selectRecentUser(account)}>
                    <RecentAccountAvatar account={account} />
                    <span className="admin-login-account-copy">
                      <strong>{account.name}</strong>
                      <small>{account.email}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="admin-login-field">
            <span>E-mail</span>
            <span>
              <Mail className="pointer-events-none size-4" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="seuemail@exemplo.com"
                required
              />
            </span>
          </label>

          <label className="admin-login-field">
            <span>Senha</span>
            <span>
              <Lock className="pointer-events-none size-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
              />
              <button
                className="admin-login-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          {visibleNotice ? <p className="admin-login-success">{visibleNotice}</p> : null}
          {error ? <p className="admin-login-error">{error}</p> : null}

          <button className="admin-button admin-button-primary w-full" type="submit" disabled={loading}>
            <LogIn className="size-4" />
            {loading ? 'Entrando...' : 'Entrar no painel'}
          </button>

          <button className="admin-login-secondary" type="button" onClick={handleSwitchUser} disabled={loading}>
            Usar outra conta
            <ArrowRight className="size-4" />
          </button>

          <button className="admin-login-secondary" type="button" onClick={handleMagicLink} disabled={loading}>
            Entrar sem senha por e-mail
            <Mail className="size-4" />
          </button>
        </form>
      </section>
    </main>
  );
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

function getTrustedStoreOrigins() {
  const origins = new Set<string>();
  try {
    const configured = new URL(officialStoreUrl, window.location.origin).origin;
    origins.add(configured);

    if (process.env.NODE_ENV === 'development') {
      const url = new URL(configured);
      if (url.hostname === '127.0.0.1') {
        origins.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ''}`);
      }
      if (url.hostname === 'localhost') {
        origins.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`);
      }
    }
  } catch {
    // Keep the list empty; the handoff will fall back to regular login.
  }

  return Array.from(origins);
}

function isTrustedStoreOrigin(origin: string, trustedOrigins: string[]) {
  return trustedOrigins.includes(origin);
}

function parseHandoffPayload(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const payload = value as {
    type?: unknown;
    email?: unknown;
    accessToken?: unknown;
    refreshToken?: unknown;
  };

  if (payload.type !== 'monte-sinai-admin-session') return null;
  if (typeof payload.accessToken !== 'string' || typeof payload.refreshToken !== 'string') return null;

  return {
    email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '',
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken
  };
}

function RecentAccountAvatar({ account }: { account: RecentAdminAccount }) {
  const [failedUrl, setFailedUrl] = useState('');
  const initials = account.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'MS';

  return (
    <span className="admin-login-account-avatar">
      {account.avatarUrl && failedUrl !== account.avatarUrl ? (
        <img src={account.avatarUrl} alt={account.name} onError={() => setFailedUrl(account.avatarUrl || '')} />
      ) : (
        <strong>{initials}</strong>
      )}
    </span>
  );
}
