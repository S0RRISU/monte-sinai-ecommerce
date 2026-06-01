import { CONFIG } from './config.js';
import {
  applySitePreferences,
  applyThemePreference,
  asset,
  currentPage,
  cycleThemePreference,
  escapeHTML,
  href,
  resetSitePreferences,
  sitePreferences,
  themeLabel,
  themePreference,
  updateSitePreference
} from './state.js';
import { renderSearchResults } from './search.js';

const primaryNav = [
  ['home', 'Inicio', 'fa-house'],
  ['produtos', 'Produtos', 'fa-box-open'],
  ['promocoes', 'Ofertas', 'fa-percent'],
  ['pedidos', 'Pedidos', 'fa-clipboard-list'],
  ['contato', 'Contato', 'fa-headset']
];

export function pageTitle(page = currentPage()) {
  return {
    home: 'Inicio',
    produtos: 'Produtos',
    catalogo: 'Catalogo',
    promocoes: 'Promocoes',
    login: 'Entrar',
    criar: 'Criar conta',
    perfil: 'Perfil',
    'editar-perfil': 'Editar perfil',
    pedidos: 'Pedidos',
    pagamento: 'Pagamento',
    contato: 'Contato',
    sobre: 'Sobre',
    configuracoes: 'Configuracoes',
    painel: 'Painel'
  }[page] || 'Monte Sinai';
}

function navLink([page, label, icon]) {
  const active = currentPage() === page || (page === 'home' && currentPage() === 'index');
  return `<a class="${active ? 'is-active' : ''}" href="${href(page)}"><i class="fa-solid ${icon}"></i>${label}</a>`;
}

function themeIcon(theme = themePreference()) {
  return theme === 'dark' ? 'fa-moon' : theme === 'light' ? 'fa-sun' : 'fa-circle-half-stroke';
}

function headerHTML() {
  return `
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="site-logo" href="${href('home')}" aria-label="Monte Sinai inicio">
          <img src="${asset(CONFIG.store.logo)}" alt="Monte Sinai">
        </a>
        <form class="desktop-search" role="search" data-search-form>
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" name="q" placeholder="Buscar produtos..." autocomplete="off">
        </form>
        <div class="header-actions">
          <span class="delivery-chip"><i class="fa-solid fa-location-dot"></i><span><small>Entregar em</small>${CONFIG.store.address}</span></span>
          <button class="icon-btn" type="button" data-theme-cycle aria-label="Tema: ${themeLabel()}"><i class="fa-solid ${themeIcon()}" data-theme-icon></i></button>
          <button class="icon-btn" type="button" data-open="#search-modal" aria-label="Buscar"><i class="fa-solid fa-magnifying-glass"></i></button>
          <button class="icon-btn" type="button" data-open="#cart-drawer" aria-label="Carrinho"><i class="fa-solid fa-cart-shopping"></i><span class="badge" data-cart-count>0</span></button>
          <a class="account-chip" href="${href('perfil')}"><i class="fa-regular fa-user"></i><span><small>Ola</small><span data-account-label>Minha conta</span></span></a>
        </div>
      </div>
      <div class="category-bar">
        <nav class="container category-bar__inner" aria-label="Categorias">
          ${primaryNav.map(navLink).join('')}
        </nav>
      </div>
      <div class="mobile-service-strip">
        <a href="${href('produtos')}"><i class="fa-solid fa-location-dot"></i><span>${CONFIG.store.address}</span><strong>Comprar</strong></a>
      </div>
    </header>
  `;
}

function overlaysHTML() {
  return `
    <section class="drawer" id="cart-drawer" data-overlay hidden>
      <aside class="drawer__panel" role="dialog" aria-label="Carrinho">
        <header class="panel-header"><h2>Carrinho</h2><button class="icon-btn" type="button" data-close="#cart-drawer" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button></header>
        <div class="panel-body" data-cart-body></div>
        <footer class="panel-footer"><div><p>Subtotal <strong data-cart-subtotal>R$ 0,00</strong></p><p>Total <strong data-cart-total>R$ 0,00</strong></p></div><a class="btn btn--primary" href="${href('pagamento')}">Finalizar</a></footer>
      </aside>
    </section>
    <section class="modal" id="search-modal" data-overlay hidden>
      <div class="modal__panel" role="dialog" aria-label="Busca">
        <header class="panel-header"><h2>Buscar produtos</h2><button class="icon-btn" type="button" data-close="#search-modal" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button></header>
        <div class="panel-body form">
          <input class="input" type="search" placeholder="Buscar agua, gas, cloro..." data-search-input>
          <div class="hero__proof"><button class="chip" data-search-suggestion="agua">Agua</button><button class="chip" data-search-suggestion="gas">Gas</button><button class="chip" data-search-suggestion="limpeza">Limpeza</button></div>
          <div class="product-grid" data-search-results></div>
        </div>
      </div>
    </section>
    <section class="modal" id="product-modal" data-overlay hidden>
      <div class="modal__panel" role="dialog" aria-label="Produto">
        <header class="panel-header"><h2>Detalhes do produto</h2><button class="icon-btn" type="button" data-close="#product-modal" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button></header>
        <div class="panel-body" data-product-modal-body></div>
      </div>
    </section>
    <div class="toast-stack" data-toast-stack></div>
  `;
}

function bottomNavHTML() {
  const items = [
    ['home', 'Inicio', 'fa-house'],
    ['produtos', 'Produtos', 'fa-box-open'],
    ['pedidos', 'Pedidos', 'fa-clipboard-list'],
    ['perfil', 'Conta', 'fa-user']
  ];
  return `<nav class="bottom-nav" aria-label="Navegacao mobile">${items.map(navLink).join('')}</nav>`;
}

function footerHTML() {
  return `
    <footer class="site-footer">
      <div class="container site-footer__inner">
        <div><strong>Monte Sinai</strong><p>Agua, gas e produtos de limpeza com atendimento local.</p></div>
        <nav class="footer-links"><a href="${href('produtos')}">Produtos</a><a href="${href('pedidos')}">Pedidos</a><a href="${href('sobre')}">Sobre</a><a href="${href('contato')}">Contato</a><a href="${href('configuracoes')}">Configuracoes</a></nav>
      </div>
    </footer>
  `;
}

export function mountShell() {
  if (currentPage() === 'painel') return;
  const app = document.querySelector('#app');
  app.innerHTML = `
    <a class="skip-link" href="#page-root">Ir para o conteudo</a>
    <div class="app-shell">
      ${headerHTML()}
      <div class="main-shell">
        <main class="content-panel" id="page-root" data-page-root></main>
      </div>
      ${footerHTML()}
      ${bottomNavHTML()}
      ${overlaysHTML()}
    </div>
  `;
}

export function syncThemeUI() {
  const theme = themePreference();
  const prefs = applySitePreferences(sitePreferences());
  document.querySelectorAll('[data-theme-cycle]').forEach((button) => {
    button.setAttribute('aria-label', `Tema: ${themeLabel(theme)}`);
    button.setAttribute('title', `Tema: ${themeLabel(theme)}`);
  });
  document.querySelectorAll('[data-theme-icon]').forEach((icon) => {
    icon.className = `fa-solid ${themeIcon(theme)}`;
  });
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.themeOption === theme);
    button.setAttribute('aria-pressed', String(button.dataset.themeOption === theme));
  });
  document.querySelectorAll('[data-theme-current]').forEach((target) => {
    target.textContent = themeLabel(theme);
  });
  document.querySelectorAll('[data-site-pref]').forEach((button) => {
    const active = prefs[button.dataset.sitePref] === button.dataset.sitePrefValue;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

export function mountAdminShell() {
  document.querySelector('#app').innerHTML = '<main id="page-root" data-page-root></main><div class="toast-stack" data-toast-stack></div>';
}

export function pageRoot() {
  return document.querySelector('[data-page-root]') || document.querySelector('#app');
}

export function openOverlay(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  target.hidden = false;
  document.body.classList.add('is-scroll-locked');
  if (selector === '#search-modal') {
    renderSearchResults('');
    window.setTimeout(() => target.querySelector('[data-search-input]')?.focus(), 40);
  }
}

export function closeOverlay(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  target.hidden = true;
  if (!document.querySelector('.drawer:not([hidden]), .modal:not([hidden])')) {
    document.body.classList.remove('is-scroll-locked');
  }
}

export function showToast(message, type = 'info') {
  const stack = document.querySelector('[data-toast-stack]');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'is-success' : type === 'error' ? 'is-error' : ''}`;
  toast.textContent = message;
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

export function bindUI() {
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open]');
    if (open) openOverlay(open.dataset.open);

    const close = event.target.closest('[data-close]');
    if (close) closeOverlay(close.dataset.close);

    const themeToggle = event.target.closest('[data-theme-cycle]');
    if (themeToggle) {
      cycleThemePreference();
      syncThemeUI();
      showToast(`Tema: ${themeLabel()}`, 'success');
    }

    const themeOption = event.target.closest('[data-theme-option]');
    if (themeOption) {
      applyThemePreference(themeOption.dataset.themeOption);
      applySitePreferences(sitePreferences());
      syncThemeUI();
      showToast(`Tema: ${themeLabel()}`, 'success');
    }

    const sitePref = event.target.closest('[data-site-pref]');
    if (sitePref) {
      updateSitePreference(sitePref.dataset.sitePref, sitePref.dataset.sitePrefValue);
      syncThemeUI();
      showToast('Configuracao aplicada.', 'success');
    }

    const resetSettings = event.target.closest('[data-settings-reset]');
    if (resetSettings) {
      resetSitePreferences();
      syncThemeUI();
      showToast('Configuracoes restauradas.', 'success');
    }

    const overlay = event.target.closest('[data-overlay]');
    if (overlay && event.target === overlay) closeOverlay(`#${overlay.id}`);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.drawer:not([hidden]), .modal:not([hidden])').forEach((target) => closeOverlay(`#${target.id}`));
    }
  });

  document.addEventListener('toast', (event) => {
    showToast(event.detail?.message || 'Atualizado.', event.detail?.type || 'info');
  });

  syncThemeUI();
}
