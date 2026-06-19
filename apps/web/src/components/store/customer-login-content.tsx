'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  X
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type AuthMode = 'login' | 'register' | 'forgot';
type RecentCustomerAccount = {
  email: string;
  name: string;
};

const recentCustomerAccountsKey = 'monte-sinai-customer-recent-accounts';

export function CustomerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const switchRequested = searchParams.get('switch') === '1';
  const confirmed = searchParams.get('confirmed') === '1';
  const recoveryRequested = searchParams.get('recovery') === '1';
  const passwordUpdated = searchParams.get('password') === 'updated';
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(recoveryRequested);
  const [showPassword, setShowPassword] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<RecentCustomerAccount[]>(() => readRecentCustomerAccounts());
  const [switchPickerOpen, setSwitchPickerOpen] = useState(switchRequested);
  const [switchTargetSelected, setSwitchTargetSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function hydrateLogin() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (switchRequested) {
        setUser(data.user);
        if (data.user?.email) setRecentAccounts(rememberCustomerAccount(data.user));
        setChecking(false);
        setSwitchPickerOpen(true);
        setSwitchTargetSelected(false);
        setMessage(data.user ? 'Escolha a conta que deseja usar agora.' : 'Escolha uma conta salva ou entre manualmente.');
        return;
      }

      setUser(data.user);
      if (data.user?.email) setRecentAccounts(rememberCustomerAccount(data.user));
      setSwitchTargetSelected(false);
      setChecking(false);
      if (!data.user && confirmed) {
        setMessage('E-mail confirmado. Agora entre com sua senha para acessar sua conta.');
      }
      if (!data.user && passwordUpdated) {
        setMessage('Senha atualizada. Entre com sua nova senha.');
      }
    }

    void hydrateLogin();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setUser(session?.user || null);
      if (session?.user?.email) setRecentAccounts(rememberCustomerAccount(session.user));
      setChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [confirmed, passwordUpdated, supabase, switchRequested]);

  useEffect(() => {
    if (!confirmed || !user?.email) return;
    void sendWelcomeEmail(user.email, getCustomerName(user));
  }, [confirmed, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (recoveryMode) {
      if (password.length < 6 || password !== passwordConfirmation) {
        setError('Informe duas vezes a nova senha com pelo menos 6 caracteres.');
        return;
      }

      setLoading(true);
      try {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        await supabase.auth.signOut();
        window.location.replace('/login?password=updated');
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : 'Nao foi possivel atualizar sua senha.');
        setLoading(false);
      }
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Informe seu e-mail.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/login?recovery=1`
        });
        if (resetError) throw resetError;
        setMessage('Enviamos um link de recuperacao para seu e-mail. Confira tambem a caixa de spam.');
      } catch (resetError) {
        setError(resetError instanceof Error ? resetError.message : 'Nao foi possivel enviar o link de recuperacao.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setError('Informe e-mail e senha com pelo menos 6 caracteres.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Informe seu nome para criar a conta.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (signInError) throw signInError;
        setRecentAccounts(rememberCustomerAccountFromEmail(cleanEmail, name.trim() || cleanEmail.split('@')[0]));
        setMessage('Entrada confirmada. Abrindo sua conta...');
        router.replace(nextPath);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?confirmed=1&next=${encodeURIComponent(nextPath)}`,
          data: {
            name: name.trim(),
            nome: name.trim(),
            signup_source: 'storefront'
          }
        }
      });
      if (signUpError) throw signUpError;
      if (signUpData.session && signUpData.user?.email) {
        setRecentAccounts(rememberCustomerAccount(signUpData.user));
        await sendWelcomeEmail(signUpData.user.email, name.trim());
      }
      setPassword('');
      setMessage('Cadastro criado. Enviamos um e-mail da Monte Sinai para confirmar sua conta.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nao foi possivel acessar sua conta.');
    } finally {
      setLoading(false);
    }
  }

  function handleSwitchAccount() {
    setError('');
    setMessage('');
    setSwitchTargetSelected(false);
    setSwitchPickerOpen(true);
  }

  function selectRecentAccount(account: RecentCustomerAccount) {
    setError('');
    setMessage('');

    if (user?.email?.trim().toLowerCase() === account.email.trim().toLowerCase()) {
      setSwitchPickerOpen(false);
      setMessage('Voce ja esta usando esta conta.');
      return;
    }

    setEmail(account.email);
    setPassword('');
    setMode('login');
    setSwitchTargetSelected(true);
    setMessage('Conta selecionada. Entre para confirmar a troca. A conta atual continua ativa ate la.');
    setSwitchPickerOpen(false);
  }

  function handleManualAccount() {
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    setMode('login');
    setSwitchTargetSelected(true);
    setMessage('Digite a conta que deseja usar. A conta atual continua ativa ate a nova entrada ser confirmada.');
    setSwitchPickerOpen(false);
  }

  if (checking) {
    return (
      <section className="customer-login-card customer-login-status">
        <Loader2 className="account-auth-spinner size-7" />
        <h1>Verificando acesso</h1>
        <p>Conferindo se este aparelho ja possui uma sessao da loja.</p>
      </section>
    );
  }

  if (!recoveryMode && switchPickerOpen && !switchTargetSelected) {
    return (
      <section className="customer-login-switch-page" aria-label="Trocar conta">
        <CustomerAccountSwitchCard
          accounts={recentAccounts}
          onSelect={selectRecentAccount}
          onManual={handleManualAccount}
          onClose={() => setSwitchPickerOpen(false)}
        />
      </section>
    );
  }

  if (user && !recoveryMode && !switchTargetSelected) {
    return (
      <section className="customer-login-card customer-login-status">
        <CheckCircle2 className="customer-login-ok size-9" />
        <span>Conta conectada</span>
        <h1>{getCustomerName(user)}</h1>
        <p>{user.email}</p>
        <div className="customer-login-actions">
          <Link href={nextPath}>Continuar</Link>
          <Link href="/conta">Minha conta</Link>
          <button type="button" onClick={handleSwitchAccount} disabled={loading}>
            <LogIn className="size-4" />
            Trocar conta
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="customer-login-layout">
      <aside className="customer-login-copy">
        <Link href="/" className="customer-login-brand">
          <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" />
        </Link>
        <Link href="/conta" className="customer-login-back">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <span>App do cliente</span>
        <h1>Entre na sua area Monte Sinai.</h1>
        <p>Uma tela propria para acessar pedidos, salvar entrega, trocar conta e continuar comprando sem misturar dados.</p>
        <div className="customer-login-benefits" aria-label="Beneficios do acesso">
          <p>
            <Truck className="size-5" />
            Endereco salvo no checkout
          </p>
          <p>
            <PackageCheck className="size-5" />
            Pedidos e status em um so lugar
          </p>
          <p>
            <ShieldCheck className="size-5" />
            Sessao separada da compra visitante
          </p>
        </div>
      </aside>

      <form className="customer-login-card" onSubmit={handleSubmit}>
        <div className="customer-login-card-header">
          <span>
            {recoveryMode ? <KeyRound className="size-5" /> : <Sparkles className="size-5" />}
          </span>
          <div>
            <small>{recoveryMode ? 'Nova senha' : mode === 'forgot' ? 'Recuperar senha' : mode === 'login' ? 'Entrar' : 'Criar cadastro'}</small>
            <h2>{recoveryMode ? 'Defina uma nova senha' : mode === 'forgot' ? 'Esqueceu a senha?' : mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}</h2>
            <p>
              {recoveryMode
                ? 'Crie uma senha nova para recuperar o acesso a esta conta.'
                : mode === 'forgot'
                  ? 'Informe seu e-mail para receber o link seguro de recuperacao.'
                  : mode === 'login'
                    ? 'Entre com e-mail e senha para liberar seus dados e atalhos.'
                    : 'Depois do cadastro, voce recebe um e-mail da Monte Sinai para confirmar o acesso.'}
            </p>
          </div>
        </div>

        {!recoveryMode && mode !== 'forgot' ? (
          <div className="account-auth-tabs" role="tablist" aria-label="Acesso do cliente">
            <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
              Entrar
            </button>
            <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>
              Criar conta
            </button>
          </div>
        ) : null}

        {!recoveryMode && mode === 'forgot' ? (
          <button type="button" className="customer-login-back-mode" onClick={() => setMode('login')}>
            <ArrowLeft className="size-4" />
            Voltar para entrar
          </button>
        ) : null}

        {mode === 'register' ? (
          <label className="customer-login-field">
            Nome
            <span>
              <UserRound className="size-4" />
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Seu nome" />
            </span>
          </label>
        ) : null}

        {!recoveryMode ? <label className="customer-login-field">
          E-mail
          <span>
            <Mail className="size-4" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="voce@email.com"
              required
            />
          </span>
        </label> : null}

        {mode !== 'forgot' ? <label className="customer-login-field">
          {recoveryMode ? 'Nova senha' : 'Senha'}
          <span>
            <LockKeyhole className="size-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' && !recoveryMode ? 'current-password' : 'new-password'}
              minLength={6}
              placeholder="Minimo 6 caracteres"
              required
            />
            <button
              type="button"
              className="customer-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label> : null}

        {recoveryMode ? (
          <label className="customer-login-field">
            Confirmar nova senha
            <span>
              <LockKeyhole className="size-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                placeholder="Repita a nova senha"
                required
              />
            </span>
          </label>
        ) : null}

        {!recoveryMode && mode === 'login' ? (
          <button type="button" className="customer-forgot-button" onClick={() => setMode('forgot')}>
            Esqueci minha senha
          </button>
        ) : null}

        {message ? <p className="account-auth-success">{message}</p> : null}
        {error ? <p className="account-auth-error">{error}</p> : null}

        <div className="customer-login-security">
          <ShieldCheck className="size-4" />
          <span>{recoveryMode || mode === 'forgot' ? 'O link de recuperacao e enviado pela Monte Sinai para seu e-mail.' : 'Seu acesso usa sessao local segura e protegida.'}</span>
        </div>

        <button className="customer-login-submit" type="submit" disabled={loading}>
          {loading ? 'Processando...' : recoveryMode ? 'Salvar nova senha' : mode === 'forgot' ? 'Enviar link de recuperacao' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <p className="customer-login-footnote">
          Ao criar uma conta voce autoriza a Monte Sinai a registrar seus dados para pedidos, entrega e atendimento.
        </p>
      </form>
      <CustomerAccountSwitchModal
        open={switchPickerOpen && !recoveryMode}
        accounts={recentAccounts}
        onSelect={selectRecentAccount}
        onManual={handleManualAccount}
        onClose={() => setSwitchPickerOpen(false)}
      />
    </section>
  );
}

function CustomerAccountSwitchModal({
  open,
  accounts,
  onSelect,
  onManual,
  onClose
}: {
  open: boolean;
  accounts: RecentCustomerAccount[];
  onSelect: (account: RecentCustomerAccount) => void | Promise<void>;
  onManual: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <section className="customer-account-switch-modal" role="dialog" aria-modal="true" aria-label="Trocar conta">
      <button className="customer-account-switch-backdrop" type="button" aria-label="Fechar troca de conta" onClick={onClose} />
      <div className="customer-account-switch-card">
        <header>
          <span>
            <UserRound className="size-5" />
          </span>
          <div>
            <strong>Escolha uma conta</strong>
            <p>Use uma conta salva neste aparelho. A senha continua protegida pelo navegador.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="size-4" />
          </button>
        </header>

        <div className="customer-account-switch-list">
          {accounts.length ? (
            accounts.map((account) => (
              <button key={account.email} type="button" onClick={() => onSelect(account)}>
                <span>{account.name.slice(0, 2).toUpperCase()}</span>
                <strong>{account.name}</strong>
                <small>{account.email}</small>
                <ArrowRight className="size-4" />
              </button>
            ))
          ) : (
            <p>Nenhuma conta salva neste aparelho ainda.</p>
          )}
        </div>

        <button type="button" className="customer-account-switch-manual" onClick={onManual}>
          Usar outra conta manualmente
        </button>
        <p>A Monte Sinai nao salva senha em texto. Para entrar sem digitar, use senha salva do navegador ou recuperação por e-mail.</p>
      </div>
    </section>
  );
}

function CustomerAccountSwitchCard({
  accounts,
  onSelect,
  onManual,
  onClose
}: {
  accounts: RecentCustomerAccount[];
  onSelect: (account: RecentCustomerAccount) => void | Promise<void>;
  onManual: () => void;
  onClose: () => void;
}) {
  return (
    <div className="customer-account-switch-card">
      <header>
        <span>
          <UserRound className="size-5" />
        </span>
        <div>
          <strong>Escolha uma conta</strong>
          <p>Use uma conta salva neste aparelho. A senha continua protegida pelo navegador.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar">
          <X className="size-4" />
        </button>
      </header>

      <div className="customer-account-switch-list">
        {accounts.length ? (
          accounts.map((account) => (
            <button key={account.email} type="button" onClick={() => onSelect(account)}>
              <span>{account.name.slice(0, 2).toUpperCase()}</span>
              <strong>{account.name}</strong>
              <small>{account.email}</small>
              <ArrowRight className="size-4" />
            </button>
          ))
        ) : (
          <p>Nenhuma conta salva neste aparelho ainda.</p>
        )}
      </div>

      <button type="button" className="customer-account-switch-manual" onClick={onManual}>
        Usar outra conta manualmente
      </button>
      <p>A Monte Sinai nao salva senha em texto. Para entrar sem digitar, use senha salva do navegador ou recuperacao por e-mail.</p>
    </div>
  );
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/conta';
  return value;
}

function getCustomerName(user: User | null) {
  const metadata = user?.user_metadata || {};
  const name = metadata.name || metadata.nome || metadata.full_name;
  return typeof name === 'string' && name.trim() ? name.trim() : user?.email?.split('@')[0] || 'Cliente Monte Sinai';
}

function readRecentCustomerAccounts(): RecentCustomerAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(recentCustomerAccountsKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((account): account is RecentCustomerAccount => {
        return Boolean(
          account &&
            typeof account === 'object' &&
            typeof (account as RecentCustomerAccount).email === 'string' &&
            typeof (account as RecentCustomerAccount).name === 'string'
        );
      })
      .slice(0, 5);
  } catch {
    return [];
  }
}

function rememberCustomerAccount(user: User) {
  return rememberCustomerAccountFromEmail(user.email || '', getCustomerName(user));
}

function rememberCustomerAccountFromEmail(rawEmail: string, rawName: string) {
  if (typeof window === 'undefined') return readRecentCustomerAccounts();
  const email = rawEmail.trim().toLowerCase();
  if (!email) return readRecentCustomerAccounts();
  const name = rawName.trim() || email.split('@')[0] || 'Cliente Monte Sinai';
  const current = readRecentCustomerAccounts();
  const next = [{ email, name }, ...current.filter((account) => account.email !== email)].slice(0, 5);
  window.localStorage.setItem(recentCustomerAccountsKey, JSON.stringify(next));
  return next;
}

async function sendWelcomeEmail(email: string, name: string) {
  if (typeof window === 'undefined') return;

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return;

  const storageKey = `monte-sinai-welcome-email:${cleanEmail}`;
  if (window.localStorage.getItem(storageKey)) return;

  try {
    const supabase = getSupabaseBrowserClient();
    const siteUrl = window.location.origin;
    const { error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: cleanEmail,
        name,
        storeName: 'Monte Sinai',
        siteUrl,
        installUrl: siteUrl,
        logoUrl: `${siteUrl}/brand/monte-sinai-logo-transparente.png`
      }
    });

    if (!error) {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    }
  } catch {
    // Login e cadastro continuam funcionando mesmo sem provedor de e-mail configurado.
  }
}
