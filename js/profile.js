import { currentPage, emit, escapeHTML, forgetAccount, href, roleAllowsPanel, savedAccounts } from './state.js';
import { fetchCurrentProfile, saveProfileAvatar, updateProfile, uploadProfileAvatar } from './supabase-services.js';

function profileInitials(profile = {}) {
  const source = profile.name || profile.email || 'Cliente';
  const parts = source.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
}

function avatarHTML(profile = {}) {
  if (profile.avatar) {
    return `<img src="${escapeHTML(profile.avatar)}" alt="${escapeHTML(profile.name || 'Cliente Monte Sinai')}" loading="lazy" decoding="async">`;
  }
  return `<span>${escapeHTML(profileInitials(profile))}</span>`;
}

function profileHeroHTML(profile = {}) {
  return `
    <section class="profile-hero">
      <div class="profile-avatar-stack">
        <div class="profile-avatar" data-profile-avatar-preview>${avatarHTML(profile)}</div>
        <a class="profile-avatar-edit" href="${href('editar-perfil')}" aria-label="Editar perfil">
          <i class="fa-solid fa-pen"></i>
        </a>
      </div>
      <div class="profile-hero__content">
        <span class="eyebrow">Area do cliente</span>
        <h1>${escapeHTML(profile.name || 'Cliente Monte Sinai')}</h1>
        <p>${escapeHTML(profile.email || 'Conta Monte Sinai')}</p>
        <div class="profile-tags">
          <span><i class="fa-solid fa-user-check"></i> Cliente</span>
          <span><i class="fa-solid fa-shield-heart"></i> Conta ativa</span>
        </div>
      </div>
      <div class="profile-hero__actions">
        <a class="btn btn--soft" href="${href('configuracoes')}"><i class="fa-solid fa-sliders"></i> Configurar site</a>
        ${roleAllowsPanel(profile.role) ? `<a class="btn btn--soft" href="${href('painel')}"><i class="fa-solid fa-chart-line"></i> Painel administrativo</a>` : ''}
        <button class="btn btn--soft" type="button" data-open="#account-switch-modal"><i class="fa-solid fa-right-left"></i> Trocar conta</button>
        <button class="btn btn--soft" type="button" data-sign-out><i class="fa-solid fa-arrow-right-from-bracket"></i> Sair</button>
      </div>
    </section>
  `;
}

function profileDetailsHTML(profile = {}) {
  return `
    <section class="profile-clean-grid profile-clean-grid--single">
      <article class="card card--padded form">
        <span class="eyebrow">Dados principais</span>
        <h2>Conta e entrega</h2>
        <div class="profile-detail-list">
          <div class="profile-detail"><i class="fa-solid fa-phone"></i><div><strong>${escapeHTML(profile.phone || 'Telefone nao informado')}</strong><span>WhatsApp de contato</span></div></div>
          <div class="profile-detail"><i class="fa-solid fa-location-dot"></i><div><strong>${escapeHTML(profile.address || 'Endereco nao informado')}</strong><span>Endereco principal</span></div></div>
          <div class="profile-detail"><i class="fa-solid fa-envelope"></i><div><strong>${escapeHTML(profile.email || 'Email nao informado')}</strong><span>Email da conta</span></div></div>
        </div>
      </article>
    </section>
  `;
}

function accountSwitchModalHTML(currentProfile = {}, options = {}) {
  const accounts = savedAccounts();
  const currentKey = String(currentProfile.id || currentProfile.email || '');
  const canManage = options.manage === true;
  return `
    <section class="modal account-switch-modal" id="account-switch-modal" data-overlay hidden>
      <div class="modal__panel" role="dialog" aria-label="Trocar conta">
        <header class="panel-header">
          <div>
            <span class="eyebrow">Contas neste dispositivo</span>
            <h2>Trocar conta</h2>
          </div>
          <button class="icon-btn" type="button" data-close="#account-switch-modal" aria-label="Fechar perfis salvos"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="panel-body form">
          <div class="account-switch-note">
            <i class="fa-solid fa-shield-halved"></i>
            <div>
              <strong>Perfis salvos neste aparelho</strong>
              <span>O site salva o perfil e o email. A senha deve ficar no gerenciador seguro do navegador.</span>
            </div>
          </div>
          <a class="btn btn--soft" href="${href('login')}?next=perfil"><i class="fa-solid fa-plus"></i> Adicionar conta</a>
          ${accounts.length ? `<div class="saved-account-list">
            ${accounts.map((account) => {
              const key = String(account.id || account.email || '');
              const current = key === currentKey || String(account.email || '') === String(currentProfile.email || '').toLowerCase();
              return `
                <div class="saved-account-row ${current ? 'is-current' : ''}">
                  <div class="saved-account-avatar">${account.avatar ? `<img src="${escapeHTML(account.avatar)}" alt="">` : `<span>${escapeHTML((account.name || account.email || 'MS').slice(0, 2).toUpperCase())}</span>`}</div>
                  <div>
                    <strong>${escapeHTML(account.name || account.email || 'Conta Monte Sinai')}</strong>
                    <span>${escapeHTML(account.email || 'Email nao informado')}</span>
                  </div>
                  ${current
                    ? '<small>Atual</small>'
                    : `<button class="btn btn--primary" type="button" data-switch-saved-account="${escapeHTML(account.email || '')}">Usar conta</button>`}
                  ${canManage ? `<button class="icon-btn" type="button" data-forget-account="${escapeHTML(key || account.email || '')}" aria-label="Remover conta salva"><i class="fa-solid fa-xmark"></i></button>` : ''}
                </div>
              `;
            }).join('')}
          </div>` : '<p>Nenhum perfil salvo neste dispositivo ainda. Depois que uma conta entrar, ela aparece aqui.</p>'}
          <p class="muted">${canManage ? 'Voce tambem pode remover perfis salvos deste dispositivo.' : 'Para entrar automaticamente, permita que o navegador salve a senha no login.'}</p>
        </div>
      </div>
    </section>
  `;
}

export async function renderProfilePage(root) {
  const profile = await fetchCurrentProfile();
  if (!profile) {
    root.innerHTML = `
      <section class="account-gateway">
        <div class="card card--padded form">
          <span class="eyebrow">Area do cliente</span>
          <h1>Entre para organizar sua conta.</h1>
          <p>Pedidos, dados de entrega e preferencias ficam reunidos em um painel do cliente.</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${href('login')}">Entrar</a>
            <a class="btn btn--soft" href="${href('criar')}">Criar conta</a>
          </div>
        </div>
        <aside class="card card--padded form">
          <div class="trust-card card"><i class="fa-solid fa-receipt"></i><div><strong>Historico</strong><span>Pedidos vinculados a conta</span></div></div>
          <div class="trust-card card"><i class="fa-solid fa-location-dot"></i><div><strong>Endereco principal</strong><span>Checkout mais direto</span></div></div>
          <div class="trust-card card"><i class="fa-solid fa-circle-half-stroke"></i><div><strong>Preferencias</strong><span>Claro, escuro ou sistema</span></div></div>
        </aside>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    ${profileHeroHTML(profile)}
    ${profileDetailsHTML(profile)}
    ${accountSwitchModalHTML(profile, { manage: false })}
  `;
}

export async function renderEditProfilePage(root) {
  const profile = await fetchCurrentProfile();
  if (!profile) {
    root.innerHTML = `<div class="state"><i class="fa-solid fa-user"></i><strong>Entre para editar seu perfil.</strong><a class="btn btn--primary" href="${href('login')}">Entrar</a></div>`;
    return;
  }

  root.innerHTML = `
    <section class="edit-profile-layout">
      <aside class="card card--padded form">
        <span class="eyebrow">Conta</span>
        <div class="profile-avatar-stack profile-avatar-stack--large">
          <div class="profile-avatar profile-avatar--large" data-profile-avatar-preview>${avatarHTML(profile)}</div>
          <button class="profile-avatar-edit" type="button" data-avatar-trigger aria-label="Alterar foto do perfil">
            <i class="fa-solid fa-camera"></i>
          </button>
        </div>
        <div class="profile-management-list">
          ${roleAllowsPanel(profile.role) ? `<a href="${href('painel')}"><i class="fa-solid fa-chart-line"></i><span>Painel administrativo</span></a>` : ''}
          <a href="${href('configuracoes')}"><i class="fa-solid fa-sliders"></i><span>Configurar site</span></a>
          <button type="button" data-open="#account-switch-modal"><i class="fa-solid fa-right-left"></i><span>Trocar conta</span></button>
          <button type="button" data-sign-out><i class="fa-solid fa-arrow-right-from-bracket"></i><span>Sair</span></button>
        </div>
        <span class="eyebrow">Foto do perfil</span>
        <input class="sr-only" type="file" accept="image/*" data-profile-avatar-input>
        <button class="btn btn--soft" type="button" data-avatar-remove><i class="fa-solid fa-trash"></i> Remover foto</button>
      </aside>
      <section class="card card--padded">
        <form class="form" data-profile-form>
          <span class="eyebrow">Dados do cliente</span>
          <h1>Atualize seu perfil</h1>
          <div class="form-grid">
            <div class="field"><label for="profile-name">Nome completo</label><input class="input" id="profile-name" name="name" autocomplete="name" value="${escapeHTML(profile.name || '')}" required></div>
            <div class="field"><label for="profile-email">Email</label><input class="input" id="profile-email" name="email" type="email" autocomplete="email" value="${escapeHTML(profile.email || '')}" required></div>
            <div class="field"><label for="profile-phone">Telefone / WhatsApp</label><input class="input" id="profile-phone" name="phone" autocomplete="tel" inputmode="tel" value="${escapeHTML(profile.phone || '')}" required></div>
            <div class="field"><label for="profile-address">Endereco principal</label><input class="input" id="profile-address" name="address" autocomplete="street-address" value="${escapeHTML(profile.address || '')}"></div>
          </div>
          <div class="hero__actions">
            <button class="btn btn--primary" type="submit">Salvar alteracoes</button>
            <a class="btn btn--soft" href="${href('perfil')}">Voltar ao perfil</a>
          </div>
        </form>
      </section>
    </section>
    ${accountSwitchModalHTML(profile, { manage: true })}
  `;
}

async function refreshProfileView() {
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  if (currentPage() === 'editar-perfil') await renderEditProfilePage(root);
  else if (currentPage() === 'perfil') await renderProfilePage(root);
}

export function bindProfile() {
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-profile-form]');
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await updateProfile(Object.fromEntries(new FormData(form)));
      emit('toast', { message: 'Perfil atualizado.', type: 'success' });
      location.href = href('perfil');
    } catch (error) {
      emit('toast', { message: error.message || 'Falha ao salvar perfil.', type: 'error' });
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener('click', async (event) => {
    const forget = event.target.closest('[data-forget-account]');
    if (forget) {
      forgetAccount(forget.dataset.forgetAccount);
      emit('toast', { message: 'Perfil removido deste dispositivo.', type: 'success' });
      await refreshProfileView();
      return;
    }

    const trigger = event.target.closest('[data-avatar-trigger]');
    if (trigger) {
      document.querySelector('[data-profile-avatar-input]')?.click();
      return;
    }

    const remove = event.target.closest('[data-avatar-remove]');
    if (!remove) return;
    remove.disabled = true;
    try {
      await saveProfileAvatar('');
      emit('toast', { message: 'Foto removida.', type: 'success' });
      await refreshProfileView();
    } catch (error) {
      emit('toast', { message: error.message || 'Nao foi possivel remover a foto.', type: 'error' });
    } finally {
      remove.disabled = false;
    }
  });

  document.addEventListener('change', async (event) => {
    const input = event.target.closest('[data-profile-avatar-input]');
    if (!input?.files?.length) return;
    try {
      await uploadProfileAvatar(input.files[0]);
      emit('toast', { message: 'Foto atualizada.', type: 'success' });
      await refreshProfileView();
    } catch (error) {
      emit('toast', { message: error.message || 'Nao foi possivel atualizar a foto.', type: 'error' });
    } finally {
      input.value = '';
    }
  });
}
