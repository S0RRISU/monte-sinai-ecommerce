import { appState, emit, escapeHTML, href, readJSON, savedAccounts, STORAGE } from './state.js';
import { fetchCurrentProfile, signIn, signOut, signUp } from './supabase-services.js';

export async function initAuth() {
  await fetchCurrentProfile();
  renderAuthState();
}

export function renderAuthState() {
  const profile = appState.profile || readJSON(STORAGE.profile, null);
  document.querySelectorAll('[data-account-label]').forEach((target) => {
    target.textContent = profile?.name ? profile.name.split(' ')[0] : 'Minha conta';
  });
  document.querySelectorAll('[data-auth-required]').forEach((target) => {
    target.hidden = Boolean(profile);
  });
}

function authFormHTML(mode = 'login') {
  const isCreate = mode === 'create';
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || '';
  const email = params.get('email') || '';
  const accounts = savedAccounts();
  return `
    <section class="auth-layout">
      <div class="card card--padded form">
        <span class="eyebrow">Conta Monte Sinai</span>
        <h1>${isCreate ? 'Criar conta' : 'Entrar na sua conta'}</h1>
        <p>${isCreate ? 'Cadastre seus dados para pedidos mais rapidos.' : 'Acesse seu perfil e acompanhe seus pedidos.'}</p>
        <form class="form" data-auth-form data-mode="${isCreate ? 'create' : 'login'}" data-next="${escapeHTML(next)}">
          ${isCreate ? `
            <div class="field">
              <label for="auth-name">Nome completo</label>
              <input class="input" id="auth-name" name="name" autocomplete="name" required>
            </div>
            <div class="field">
              <label for="auth-phone">Telefone / WhatsApp</label>
              <input class="input" id="auth-phone" name="phone" autocomplete="tel" inputmode="tel" required>
            </div>
          ` : ''}
          <div class="field">
            <label for="auth-email">Email</label>
            <input class="input" id="auth-email" name="email" type="email" autocomplete="username" value="${escapeHTML(email)}" required>
          </div>
          <div class="field">
            <label for="auth-password">Senha</label>
            <input class="input" id="auth-password" name="password" type="password" autocomplete="${isCreate ? 'new-password' : 'current-password'}" required minlength="6">
          </div>
          <button class="btn btn--primary" type="submit">${isCreate ? 'Criar conta' : 'Entrar'}</button>
          <a class="btn btn--soft" href="${href(isCreate ? 'login' : 'criar')}">${isCreate ? 'Ja tenho conta' : 'Criar conta'}</a>
        </form>
      </div>
      <aside class="card card--padded form account-panel">
        <span class="eyebrow">Contas salvas</span>
        <h2>Entrar em outra conta</h2>
        ${accounts.length ? `<div class="saved-account-list">
          ${accounts.map((account) => `
            <button class="saved-account" type="button" data-use-saved-account="${escapeHTML(account.email)}">
              <span>${escapeHTML((account.name || account.email || 'MS').slice(0, 2).toUpperCase())}</span>
              <strong>${escapeHTML(account.name || account.email)}</strong>
              <small>${escapeHTML(account.email || 'Email salvo')}</small>
            </button>
          `).join('')}
        </div>` : '<p>Nenhuma conta usada neste dispositivo ainda.</p>'}
        <a class="btn btn--blue" href="${href('produtos')}">Comprar sem entrar</a>
      </aside>
    </section>
  `;
}

export function renderAuthPage(root, mode = 'login') {
  root.innerHTML = authFormHTML(mode);
}

export function bindAuth() {
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-auth-form]');
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    try {
      if (form.dataset.mode === 'create') {
        await signUp({
          name: data.name,
          phone: data.phone,
          email: data.email,
          password: data.password
        });
        emit('toast', { message: 'Conta criada.', type: 'success' });
      } else {
        await signIn(data.email, data.password);
        emit('toast', { message: 'Entrada confirmada.', type: 'success' });
      }
      const next = form.dataset.next || new URLSearchParams(location.search).get('next') || 'perfil';
      location.href = href(next);
    } catch (error) {
      emit('toast', { message: error.message || 'Nao foi possivel entrar.', type: 'error' });
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener('click', async (event) => {
    const switchSaved = event.target.closest('[data-switch-saved-account]');
    if (switchSaved) {
      switchSaved.disabled = true;
      await signOut();
      const email = encodeURIComponent(switchSaved.dataset.switchSavedAccount || '');
      location.href = `${href('login')}?next=perfil${email ? `&email=${email}` : ''}`;
      return;
    }

    const saved = event.target.closest('[data-use-saved-account]');
    if (saved) {
      const emailInput = document.querySelector('#auth-email');
      if (emailInput) {
        emailInput.value = saved.dataset.useSavedAccount || '';
        document.querySelector('#auth-password')?.focus();
      }
      return;
    }

    const switchAccount = event.target.closest('[data-switch-account]');
    if (switchAccount) {
      switchAccount.disabled = true;
      await signOut();
      emit('toast', { message: 'Conta atual desconectada.', type: 'success' });
      location.href = `${href('login')}?next=perfil`;
      return;
    }

    const logout = event.target.closest('[data-sign-out]');
    if (!logout) return;
    logout.disabled = true;
    await signOut();
    emit('toast', { message: 'Conta desconectada.', type: 'success' });
    location.href = href('home');
  });
}
