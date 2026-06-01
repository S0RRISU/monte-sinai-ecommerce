import { CONFIG } from './config.js';
import {
  appState,
  applySitePreferences,
  applyThemePreference,
  categoryIconName,
  currentPage,
  escapeHTML,
  hasTrustedImage,
  href,
  isOffer,
  productImage,
  sitePreferences,
  themeLabel,
  themePreference
} from './state.js';
import { bindUI, mountAdminShell, mountShell, pageRoot, syncThemeUI } from './ui.js';
import { bindCart, renderCart } from './cart.js';
import { bindProductUI, filterProducts, loadProducts, renderCategories, renderCategoryChips, renderProductGrid, seedFallbackProducts } from './products.js';
import { bindSearch } from './search.js';
import { bindAuth, initAuth, renderAuthPage } from './auth.js';
import { bindProfile, renderEditProfilePage, renderProfilePage } from './profile.js';
import { bindOrders, renderOrdersPage } from './orders.js';
import { bindCheckout, renderCheckout } from './checkout.js';
import { bindAdmin, renderAdminPage } from './admin.js';

function goToProductsCategory(category) {
  if (currentPage() === 'produtos' || currentPage() === 'catalogo' || currentPage() === 'promocoes') return false;
  location.href = `${href('produtos')}?categoria=${encodeURIComponent(category)}`;
  return true;
}

function heroProductStageHTML() {
  const products = appState.products.slice(0, 3);
  return `
    <div class="hero-showcase" aria-label="Produtos em destaque">
      ${products.map((product, index) => `
        <button class="hero-showcase__item ${index === 0 ? 'is-main' : ''}" type="button" data-product-open="${escapeHTML(product.id)}" aria-label="Ver ${escapeHTML(product.name)}">
          ${hasTrustedImage(product.image)
            ? `<img src="${productImage(product)}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async">`
            : `<span class="product-placeholder"><i class="fa-solid ${categoryIconName(product.categoryKey || product.category)}"></i></span>`}
        </button>
      `).join('')}
    </div>
  `;
}

function homeHTML() {
  return `
    <section class="hero">
      <div class="hero__grid">
        <div>
          <span class="eyebrow">Monte Sinai Delivery</span>
          <h1>Pedido rapido para agua, gas e limpeza.</h1>
          <p>Essenciais para casa com compra direta, atendimento local e acompanhamento do pedido em um so lugar.</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${href('produtos')}">Comprar agora <i class="fa-solid fa-arrow-right"></i></a>
            <a class="btn btn--ghost" href="${href('pedidos')}">Acompanhar pedido</a>
          </div>
          <div class="hero__proof">
            <span class="chip"><i class="fa-solid fa-truck-fast"></i> Entrega rapida</span>
            <span class="chip"><i class="fa-solid fa-lock"></i> Pagamento seguro</span>
            <span class="chip"><i class="fa-solid fa-shield-heart"></i> Produtos de qualidade</span>
          </div>
        </div>
        <div class="hero__media">
          ${heroProductStageHTML()}
        </div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div class="section-title"><span class="eyebrow">Comprar</span><h2>Escolha por categoria</h2></div><a class="btn btn--soft" href="${href('produtos')}">Produtos</a></div>
      <div class="category-row" data-home-categories></div>
    </section>
    <section class="section">
      <div class="home-actions">
        <a class="home-action" href="${href('produtos')}"><i class="fa-solid fa-box-open"></i><strong>Produtos</strong><span>Catalogo completo</span></a>
        <a class="home-action" href="${href('pedidos')}"><i class="fa-solid fa-route"></i><strong>Pedidos</strong><span>Acompanhar status</span></a>
        <a class="home-action" href="${href('perfil')}"><i class="fa-solid fa-user"></i><strong>Perfil</strong><span>Dados e historico</span></a>
        <a class="home-action" href="${href('contato')}"><i class="fa-solid fa-headset"></i><strong>Suporte</strong><span>Falar com a loja</span></a>
      </div>
    </section>
  `;
}

function renderHome(root) {
  root.innerHTML = homeHTML();
  renderCategories(root.querySelector('[data-home-categories]'));
  root.addEventListener('click', (event) => {
    const categoryButton = event.target.closest('[data-category-filter]');
    if (categoryButton) goToProductsCategory(categoryButton.dataset.categoryFilter || 'all');
  });
}

function catalogHTML(title = 'Catalogo') {
  return `
    <section class="product-hero">
      <div>
        <span class="eyebrow">Monte Sinai</span>
        <h1>${escapeHTML(title)}</h1>
        <p>Busque, selecione as opcoes quando necessario e adicione ao carrinho.</p>
      </div>
      <div class="product-hero__actions">
        <button class="btn btn--primary" type="button" data-open="#search-modal"><i class="fa-solid fa-magnifying-glass"></i> Buscar</button>
        <a class="btn btn--soft" href="${href('pagamento')}"><i class="fa-solid fa-cart-shopping"></i> Carrinho</a>
      </div>
    </section>
    <section class="catalog-layout product-layout">
      <aside class="catalog-sidebar">
        <h2>Categorias</h2>
        <div class="form catalog-filter-list" data-catalog-chips></div>
      </aside>
      <div>
        <div class="product-command-bar">
          <div class="catalog-toolbar__label"><i class="fa-solid fa-sliders"></i><span data-catalog-count>0 produtos</span></div>
          <div class="catalog-tools">
            <input class="input" type="search" placeholder="Buscar no catalogo..." data-catalog-search>
            <select class="select" data-catalog-sort aria-label="Ordenar produtos">
              <option value="default">Mais relevantes</option>
              <option value="name">Nome A-Z</option>
              <option value="price-asc">Menor preco</option>
              <option value="price-desc">Maior preco</option>
              <option value="offers">Ofertas primeiro</option>
            </select>
          </div>
        </div>
        <div class="product-grid" data-catalog-grid></div>
      </div>
    </section>
  `;
}

function sortCatalogProducts(products, sort = 'default') {
  const next = [...products];
  if (sort === 'name') next.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (sort === 'price-asc') next.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sort === 'price-desc') next.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sort === 'offers') next.sort((a, b) => Number(isOffer(b)) - Number(isOffer(a)));
  return next;
}

function renderCatalog(root, title = 'Produtos', initialCategory = 'all') {
  const params = new URLSearchParams(location.search);
  let category = params.get('categoria') || initialCategory;
  let query = '';
  let sort = 'default';
  const apply = () => {
    renderCategoryChips(root.querySelector('[data-catalog-chips]'), category);
    const filtered = filterProducts(appState.products, { category, query });
    const sorted = sortCatalogProducts(filtered, sort);
    const count = root.querySelector('[data-catalog-count]');
    if (count) count.textContent = `${sorted.length} produto${sorted.length === 1 ? '' : 's'}`;
    renderProductGrid(root.querySelector('[data-catalog-grid]'), sorted);
  };
  root.innerHTML = catalogHTML(title);
  apply();
  root.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-category-filter]');
    if (!filter) return;
    category = filter.dataset.categoryFilter || 'all';
    appState.activeCategory = category;
    apply();
  });
  document.addEventListener('catalog:filter', (event) => {
    query = event.detail?.query || '';
    apply();
  }, { once: false });
  root.querySelector('[data-catalog-sort]')?.addEventListener('change', (event) => {
    sort = event.target.value || 'default';
    apply();
  });
  document.addEventListener('products:updated', apply, { once: true });
}

function renderStaticPage(root, type) {
  if (type === 'configuracoes') {
    const prefs = sitePreferences();
    const option = (group, value, icon, title, text) => `
      <button class="theme-option ${prefs[group] === value ? 'is-active' : ''}" type="button" data-site-pref="${group}" data-site-pref-value="${value}" aria-pressed="${prefs[group] === value}">
        <i class="fa-solid ${icon}"></i><strong>${title}</strong><span>${text}</span>
      </button>
    `;
    root.innerHTML = `
      <section class="settings-page">
        <div class="card card--padded form">
          <span class="eyebrow">Preferencias</span>
          <h1>Configuracoes do site</h1>
          <p>Ajustes salvos neste dispositivo para deixar a loja mais clara, limpa e confortavel.</p>
          <div class="theme-options" role="group" aria-label="Tema do site">
            <button class="theme-option" type="button" data-theme-option="system"><i class="fa-solid fa-circle-half-stroke"></i><strong>Sistema</strong><span>Segue o dispositivo</span></button>
            <button class="theme-option" type="button" data-theme-option="light"><i class="fa-solid fa-sun"></i><strong>Claro</strong><span>Interface luminosa</span></button>
            <button class="theme-option" type="button" data-theme-option="dark"><i class="fa-solid fa-moon"></i><strong>Escuro</strong><span>Menos brilho</span></button>
          </div>
        </div>
        <div class="settings-grid">
          <section class="card card--padded form">
            <span class="eyebrow">Leitura</span>
            <h2>Espacamento</h2>
            <div class="theme-options theme-options--two">
              ${option('density', 'comfortable', 'fa-up-right-and-down-left-from-center', 'Confortavel', 'Mais respiro entre elementos')}
              ${option('density', 'compact', 'fa-compress', 'Compacto', 'Menos altura e menos distancia')}
            </div>
          </section>
          <section class="card card--padded form">
            <span class="eyebrow">Visual</span>
            <h2>Cards</h2>
            <div class="theme-options theme-options--two">
              ${option('cards', 'premium', 'fa-layer-group', 'Premium', 'Sombras e profundidade controlada')}
              ${option('cards', 'flat', 'fa-square', 'Plano', 'Menos sombra e mais simplicidade')}
            </div>
          </section>
          <section class="card card--padded form">
            <span class="eyebrow">Movimento</span>
            <h2>Animações</h2>
            <div class="theme-options theme-options--two">
              ${option('motion', 'normal', 'fa-wand-magic-sparkles', 'Normal', 'Transicoes suaves')}
              ${option('motion', 'reduced', 'fa-person-walking-arrow-right', 'Reduzido', 'Menos movimento na interface')}
            </div>
          </section>
          <section class="card card--padded form">
            <span class="eyebrow">Navegacao</span>
            <h2>Menu</h2>
            <div class="theme-options theme-options--two">
              ${option('menu', 'complete', 'fa-bars-staggered', 'Completo', 'Mostra atalhos principais')}
              ${option('menu', 'clean', 'fa-minus', 'Limpo', 'Oculta extras e deixa mais direto')}
            </div>
          </section>
          <section class="card card--padded form">
            <span class="eyebrow">Produtos</span>
            <h2>Vitrine</h2>
            <div class="theme-options theme-options--two">
              ${option('productView', 'visual', 'fa-image', 'Visual', 'Cards com imagem em destaque')}
              ${option('productView', 'simple', 'fa-list', 'Simples', 'Lista mais compacta para compra rapida')}
            </div>
          </section>
          <aside class="card card--padded form settings-summary">
            <span class="eyebrow">Atual</span>
            <h2>Tema <span data-theme-current>${themeLabel(themePreference())}</span></h2>
            <div class="trust-card card"><i class="fa-solid fa-user"></i><div><strong>Perfil</strong><span>Foto e dados ficam em Editar perfil.</span></div></div>
            <div class="trust-card card"><i class="fa-solid fa-cart-shopping"></i><div><strong>Carrinho</strong><span>Salvo neste navegador.</span></div></div>
            <button class="btn btn--soft" type="button" data-settings-reset>Restaurar padrao</button>
          </aside>
        </div>
      </section>
    `;
    return;
  }

  if (type === 'contato') {
    root.innerHTML = `
      <section class="info-hero">
        <span class="eyebrow">Contato</span>
        <h1>Atendimento direto para pedido, entrega e suporte.</h1>
        <p>Use os canais oficiais para confirmar disponibilidade, combinar entrega ou acompanhar um pedido.</p>
      </section>
      <section class="feature-grid">
        <a class="feature-card" href="https://wa.me/${CONFIG.store.whatsapp}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i><strong>WhatsApp</strong><p>Falar com a loja agora.</p></a>
        <a class="feature-card" href="mailto:${CONFIG.store.email}"><i class="fa-solid fa-envelope"></i><strong>Email</strong><p>${CONFIG.store.email}</p></a>
        <a class="feature-card" href="${href('pedidos')}"><i class="fa-solid fa-receipt"></i><strong>Pedidos</strong><p>Consultar status por codigo.</p></a>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    <section class="info-hero">
      <span class="eyebrow">Sobre a Monte Sinai</span>
      <h1>Uma loja local feita para vender essenciais com clareza.</h1>
      <p>A estrutura combina catalogo, carrinho, checkout, historico e painel administrativo para manter o atendimento rapido sem perder controle.</p>
    </section>
    <section class="feature-grid">
      <article class="feature-card"><i class="fa-solid fa-store"></i><strong>Operacao local</strong><p>${CONFIG.store.address} - ${CONFIG.store.city}</p></article>
      <article class="feature-card"><i class="fa-solid fa-shield-heart"></i><strong>Compra segura</strong><p>Dados e pedidos ligados ao Supabase com RLS.</p></article>
      <article class="feature-card"><i class="fa-solid fa-truck-fast"></i><strong>Entrega orientada</strong><p>Status, WhatsApp e acompanhamento por codigo.</p></article>
    </section>
  `;
}

async function renderPage() {
  const root = pageRoot();
  const page = currentPage();
  if (page === 'painel') {
    await renderAdminPage(root);
    return;
  }
  if (page === 'home') renderHome(root);
  else if (page === 'produtos') renderCatalog(root, 'Produtos', 'all');
  else if (page === 'catalogo') renderCatalog(root, 'Catalogo', 'all');
  else if (page === 'promocoes') renderCatalog(root, 'Promocoes', 'ofertas');
  else if (page === 'login') renderAuthPage(root, 'login');
  else if (page === 'criar') renderAuthPage(root, 'create');
  else if (page === 'perfil') await renderProfilePage(root);
  else if (page === 'editar-perfil') await renderEditProfilePage(root);
  else if (page === 'pedidos') await renderOrdersPage(root);
  else if (page === 'pagamento') await renderCheckout(root);
  else if (['sobre', 'contato', 'configuracoes'].includes(page)) renderStaticPage(root, page);
  else renderHome(root);
}

async function boot() {
  applyThemePreference();
  applySitePreferences();
  const page = currentPage();
  if (page === 'painel') mountAdminShell();
  else mountShell();
  bindUI();
  bindCart();
  bindProductUI();
  bindSearch();
  bindAuth();
  bindProfile();
  bindOrders();
  bindCheckout();
  bindAdmin();

  seedFallbackProducts();
  const publicFirstRender = ['home', 'produtos', 'catalogo', 'promocoes', 'sobre', 'contato', 'configuracoes'].includes(page);
  if (page === 'painel') {
    await initAuth();
    await renderPage();
    syncThemeUI();
    renderCart();
    return;
  }
  if (publicFirstRender) await renderPage();
  await Promise.allSettled([loadProducts(), initAuth()]);
  if (!publicFirstRender) await renderPage();
  syncThemeUI();
  renderCart();
}

document.addEventListener('DOMContentLoaded', boot);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Monte Sinai] Service worker nao registrado.', error);
    });
  });
}
