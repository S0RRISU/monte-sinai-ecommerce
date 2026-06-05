'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck, UserRound, Users } from 'lucide-react';
import { getCurrentProfile, signInWithMagicLink, signInWithPassword, signOut } from '@/lib/admin-services';
import { readRecentAdminUsers, rememberAdminUser, type RecentAdminAccount } from '@/lib/admin-accounts';
import { storeConfig } from '@/lib/constants';
import { canAccessAdmin } from '@/lib/roles';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const blockedSession = searchParams.get('semAcesso') === '1';
  const switchingAccount = searchParams.get('trocarConta') === '1';
  const accountParam = searchParams.get('account') || '';
  const autoSwitch = searchParams.get('auto') === '1';
  const [email, setEmail] = useState(accountParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recentUsers, setRecentUsers] = useState<RecentAdminAccount[]>(() => {
    return readRecentAdminUsers();
  });

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
          rememberAdminUser({
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl
          });
          router.replace(nextPath);
          return;
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
  }, [autoSwitch, blockedSession, nextPath, router, switchingAccount]);

  function rememberUser(account: string | Partial<RecentAdminAccount>) {
    setRecentUsers((current) => rememberAdminUser(account, current));
  }

  function selectRecentUser(account: RecentAdminAccount) {
    setEmail(account.email);
    setPassword('');
    setError('');
    setNotice('');
  }

  async function handleSwitchUser() {
    setLoading(true);
    setError('');
    try {
      await signOut();
      setEmail('');
      setPassword('');
      setNotice('Sessao anterior encerrada. Escolha a conta correta para entrar.');
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : 'Nao foi possivel trocar de usuario.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      const profile = await getCurrentProfile();
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
              Sessao anterior encerrada. Escolha a conta que deseja usar agora.
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

          {notice ? <p className="admin-login-success">{notice}</p> : null}
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
