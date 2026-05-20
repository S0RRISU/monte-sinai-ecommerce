document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const STORAGE = {
    cart: 'ms_cart_v2',
    legacyCart: 'ms_cart_v1',
    user: 'ms_customer_v2',
    accounts: 'ms_accounts_v1',
    orders: 'ms_orders_v1',
    owner: 'ms_owner_config_v1',
    theme: 'ms_theme_v1'
  };

  const DEFAULT_OWNER = {
    whatsapp: '5511960928234',
    altWhatsapp: '5511982690871',
    merchantName: 'MONTE SINAI',
    merchantCity: 'SAO PAULO',
    pixKey: ''
  };

  const DELIVERY_FEE = 3;
  const FREE_SHIPPING_FROM = 50;
  const PRODUCT_INDEX = [
    { name: 'Água mineral 20L', category: 'Água', price: 15, terms: 'agua mineral galao garrafao bebedouro cozinha casa reposicao entrega' },
    { name: 'Gás de cozinha P13', category: 'Gás', price: 125, terms: 'gas botijao cozinha p13 supergas ultragas fogao entrega casa' },
    { name: 'Álcool Perfumado 500ml', category: 'Limpeza', price: 5, terms: 'alcool higienizacao perfume cheiro limpeza banheiro cozinha superficie' },
    { name: 'Amaciante 2L', category: 'Lavanderia', price: 10, terms: 'amaciante roupa roupas lavar lavanderia perfume macio' },
    { name: 'Cândida 2L', category: 'Limpeza pesada', price: 5, terms: 'candida agua sanitaria cloro limpeza pesada banheiro piso quintal' },
    { name: 'Cândida Colorida 2L', category: 'Lavanderia', price: 12, terms: 'candida colorida roupa roupas tecido lavar limpeza' },
    { name: 'Cloro 1L', category: 'Limpeza pesada', price: 7.5, terms: 'cloro agua sanitaria banheiro piscina piso quintal higienizar' },
    { name: 'Cloro 2L', category: 'Limpeza pesada', price: 12, terms: 'cloro agua sanitaria banheiro piscina piso quintal higienizar rendimento' },
    { name: 'Detergente 2L', category: 'Cozinha', price: 10, terms: 'detergente louca pia cozinha prato copo gordura limpeza' },
    { name: 'Desinfetante 2L', category: 'Limpeza', price: 5, terms: 'desinfetante banheiro piso cheiro perfume eucalipto pinho limpeza casa' },
    { name: 'Limpa Alumínio 500ml', category: 'Limpeza', price: 5, terms: 'limpa aluminio panela brilho metal cozinha limpeza' },
    { name: 'Limpa Pedra 2L', category: 'Limpeza pesada', price: 12, terms: 'limpa pedra quintal area externa piso pesado limpeza' },
    { name: 'Limpa Pedra 500ml', category: 'Limpeza pesada', price: 5, terms: 'limpa pedra quintal area externa piso limpeza manutencao' },
    { name: 'Sabão de Coco 2L', category: 'Lavanderia', price: 12, terms: 'sabao coco roupa roupas lavanderia lavar suave' },
    { name: 'Sabão Omo 2L', category: 'Lavanderia', price: 22, terms: 'sabao omo roupa roupas lavanderia lavar liquido' },
    { name: 'Sabonete Líquido 500ml', category: 'Higiene', price: 6, terms: 'sabonete liquido higiene maos banheiro pia lavar' },
    { name: 'Escova de Roupa', category: 'Utensílios', price: 5, terms: 'escova roupa lavar esfregar lavanderia limpeza' },
    { name: 'Escova de Vaso Sanitário', category: 'Banheiro', price: 8.5, terms: 'escova vaso sanitario banheiro privada limpeza' },
    { name: 'Esponja de Aço', category: 'Cozinha', price: 4.9, terms: 'esponja aco panela bombril cozinha louca brilho' },
    { name: 'Esponja de Louça', category: 'Cozinha', price: 2, terms: 'esponja louca pia cozinha prato copo limpeza' },
    { name: 'Esponjão', category: 'Limpeza pesada', price: 9.9, terms: 'esponjao esponja pesada limpeza piso parede quintal' },
    { name: 'Bombril', category: 'Cozinha', price: 3, terms: 'bombril esponja aco panela brilho cozinha' },
    { name: 'Pá', category: 'Utensílios', price: 7.5, terms: 'pa lixo varrer vassoura limpeza casa' },
    { name: 'Pasta de Brilho', category: 'Limpeza', price: 6, terms: 'pasta brilho panela aluminio fogao limpeza' },
    { name: 'Pedra de Vaso', category: 'Banheiro', price: 2.5, terms: 'pedra vaso banheiro perfume sanitário privada' },
    { name: 'Prendedor de Madeira', category: 'Lavanderia', price: 3.2, terms: 'prendedor madeira roupa varal lavanderia' },
    { name: 'Prendedor Plástico', category: 'Lavanderia', price: 3.6, terms: 'prendedor plastico roupa varal lavanderia' },
    { name: 'Rodo Grande', category: 'Utensílios', price: 9.9, terms: 'rodo grande piso puxar agua quintal limpeza' },
    { name: 'Rodo Pequeno', category: 'Utensílios', price: 7.99, terms: 'rodo pequeno banheiro cozinha piso puxar agua' },
    { name: 'Rodinho de Pia', category: 'Cozinha', price: 5, terms: 'rodinho pia cozinha agua limpeza seca' },
    { name: 'Saco de Lixo', category: 'Organização', price: 6, terms: 'saco lixo descarte cozinha banheiro limpeza' },
    { name: 'Vassoura', category: 'Utensílios', price: 12, terms: 'vassoura varrer casa quintal limpeza pa' }
  ];
  const SEARCH_EXPANSIONS = {
    casa: 'agua gas vassoura rodo detergente desinfetante lixo limpeza',
    cozinha: 'gas detergente esponja louca rodinho pia aluminio panela agua',
    banheiro: 'desinfetante cloro candida escova vaso pedra sabonete rodo',
    roupa: 'sabao amaciante prendedor escova lavanderia coco omo tecido',
    roupas: 'sabao amaciante prendedor escova lavanderia coco omo tecido',
    lavar: 'sabao detergente amaciante escova roupa louca lavanderia',
    cheiro: 'desinfetante alcool amaciante sabonete perfume',
    perfume: 'desinfetante alcool amaciante sabonete cheiro',
    piso: 'rodo desinfetante cloro candida limpa pedra vassoura',
    quintal: 'vassoura rodo limpa pedra cloro candida pa',
    louca: 'detergente esponja pia cozinha rodinho',
    gordura: 'detergente esponja limpa aluminio pasta brilho',
    fogao: 'gas limpa aluminio pasta brilho cozinha',
    garrafao: 'agua galao mineral bebedouro',
    botijao: 'gas p13 cozinha fogao supergas ultragas',
    sanitário: 'vaso banheiro escova pedra desinfetante',
    sanitario: 'vaso banheiro escova pedra desinfetante'
  };
  const SMART_SEARCH_CHIPS = [
    { label: 'Limpar banheiro', query: 'banheiro' },
    { label: 'Lavar roupa', query: 'roupa' },
    { label: 'Cozinha e louça', query: 'cozinha' },
    { label: 'Quintal e piso', query: 'quintal' },
    { label: 'Cheiro bom', query: 'cheiro' },
    { label: 'Água mineral', query: 'água' },
    { label: 'Gás de cozinha', query: 'gás' },
    { label: 'Tirar gordura', query: 'gordura' }
  ];

  let cart = loadCart();
  let currentUser = loadJSON(STORAGE.user, null);
  let ownerConfig = { ...DEFAULT_OWNER, ...loadJSON(STORAGE.owner, {}) };
  let activePayment = 'delivery';

  applySavedTheme();
  upgradeProductImages();
  enhanceNavigation();
  bindMobileMenu();
  setActiveNavigation();
  bindSiteSearch();
  bindCatalog();
  bindProductCards();
  bindProductRail();
  ensureCartShell();
  ensureSmartSearchShell();
  bindCartActions();
  bindSmartSearchPanel();
  renderCart();
  bindAccountPage();
  initPaymentPage();
  initProfilePage();
  initProfileEditPage();
  initSettingsPage();
  initOwnerDashboard();
  bindSubtleAnimations();

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function qsa(selector, scope = document) {
    return [...scope.querySelectorAll(selector)];
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      showToast('Nao foi possivel salvar. Tente remover a foto ou usar uma imagem menor.');
      return false;
    }
  }

  function loadCart() {
    const modern = loadJSON(STORAGE.cart, null);
    if (Array.isArray(modern)) return modern;

    const legacy = loadJSON(STORAGE.legacyCart, []);
    if (!Array.isArray(legacy)) return [];

    const migrated = legacy.map(item => ({
      id: item.id || makeCartId(item.name, item.variant),
      name: item.name,
      variant: item.variant || '',
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      image: canonicalAssetPath(item.image || '')
    })).filter(item => item.name && item.price >= 0);

    saveJSON(STORAGE.cart, migrated);
    return migrated;
  }

  function saveCart() {
    saveJSON(STORAGE.cart, cart);
  }

  function saveUser(user) {
    currentUser = user;
    let saved = true;
    if (user) saved = saveJSON(STORAGE.user, user);
    else localStorage.removeItem(STORAGE.user);
    updateAccountUI();
    return saved;
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function searchTokens(value) {
    const tokens = normalizeText(value).split(/[^a-z0-9]+/).filter(token => token.length > 1);
    const expanded = tokens.flatMap(token => normalizeText(SEARCH_EXPANSIONS[token] || '').split(/[^a-z0-9]+/).filter(Boolean));
    return [...new Set([...tokens, ...expanded])];
  }

  function productScore(product, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return 1;

    const normalizedName = normalizeText(product.name);
    const blob = normalizeText(`${product.name} ${product.category || ''} ${product.terms || ''}`);
    let score = blob.includes(normalizedQuery) ? 12 : 0;
    if (normalizedName.includes(normalizedQuery)) score += 18;

    searchTokens(query).forEach(token => {
      if (blob.includes(token)) score += token.length > 3 ? 4 : 2;
      if (normalizedName.includes(token)) score += 3;
      if (normalizeText(product.category || '').includes(token)) score += 2;
    });

    return score;
  }

  function cardSearchData(card) {
    const name = card.dataset.name || card.querySelector('h3')?.textContent || '';
    const match = PRODUCT_INDEX.find(product => normalizeText(product.name) === normalizeText(name) || normalizeText(name).includes(normalizeText(product.name)));
    return {
      name,
      category: card.dataset.category || match?.category || '',
      terms: `${card.textContent || ''} ${match?.terms || ''}`
    };
  }

  function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
  }

  function currentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function insidePages() {
    return location.pathname.replaceAll('\\', '/').includes('/pages/');
  }

  function pageHref(page) {
    return insidePages() ? page : `pages/${page}`;
  }

  function homeHref() {
    return insidePages() ? '../index.html' : 'index.html';
  }

  function productHref(query = '') {
    const search = query ? `?q=${encodeURIComponent(query)}` : '';
    return `${pageHref('produtos.html')}${search}#todos-produtos`;
  }

  function loginHref(params = {}) {
    const query = new URLSearchParams(params).toString();
    return `${pageHref('login.html')}${query ? `?${query}` : ''}`;
  }

  function profileHref() {
    return pageHref('perfil.html');
  }

  function checkoutHref() {
    return pageHref('pagamento.html');
  }

  function currentLocationForRedirect() {
    const path = insidePages() ? currentPage() : '../index.html';
    return `${path}${location.search}${location.hash}`;
  }

  function profileComplete(user = currentUser) {
    return Boolean(user?.name && user?.phone && user?.address);
  }

  function firstName(user = currentUser) {
    return String(user?.nick || user?.name || 'Cliente').split(' ')[0];
  }

  function ensureCustomerProfile() {
    currentUser = loadJSON(STORAGE.user, null);
    if (currentUser) {
      if (!currentUser.email) {
        currentUser.email = `cliente-${Date.now()}@monte-sinai.local`;
        currentUser.provider = currentUser.provider || 'Cadastro local';
        saveUser(currentUser);
      }
      return currentUser;
    }

    currentUser = {
      email: `cliente-${Date.now()}@monte-sinai.local`,
      name: '',
      nick: '',
      phone: '',
      address: '',
      provider: 'Cadastro local'
    };
    saveUser(currentUser);
    return currentUser;
  }

  function cartSubtotal() {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }

  function deliveryFee() {
    return cartSubtotal() >= FREE_SHIPPING_FROM || cartSubtotal() === 0 ? 0 : DELIVERY_FEE;
  }

  function orderTotal() {
    return cartSubtotal() + deliveryFee();
  }

  function cartCount() {
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function hasGasGift() {
    return cart.some(item => normalizeText(item.name).includes('gas'));
  }

  function ownerWhatsApp() {
    return onlyDigits(ownerConfig.whatsapp) || DEFAULT_OWNER.whatsapp;
  }

  function makeCartId(name, variant = '') {
    return normalizeText(`${name} ${variant}`).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function canonicalAssetPath(src) {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    const clean = src.replaceAll('\\', '/');
    const index = clean.indexOf('assets/');
    return index >= 0 ? clean.slice(index) : clean.replace(/^\.\.\//, '').replace(/^\.\//, '');
  }

  function assetHref(src) {
    if (!src || /^(https?:|data:|blob:)/.test(src)) return src || '';
    const clean = canonicalAssetPath(src);
    return `${insidePages() ? '../' : ''}${clean}`;
  }

  function showToast(message) {
    let toast = qs('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function applySavedTheme() {
    const stored = localStorage.getItem(STORAGE.theme);
    setTheme(stored || 'light', false);
  }

  function setTheme(theme, persist = true) {
    const isLight = theme !== 'dark';
    document.body.classList.toggle('light-mode', isLight);
    if (persist) localStorage.setItem(STORAGE.theme, isLight ? 'light' : 'dark');
    updateThemeControls();
  }

  function updateThemeControls() {
    const isLight = document.body.classList.contains('light-mode');
    const darkToggle = qs('#dark-mode-toggle');
    const current = qs('#theme-current');
    const preview = qs('#theme-preview');

    if (darkToggle) {
      darkToggle.classList.toggle('active', !isLight);
      darkToggle.setAttribute('aria-pressed', String(!isLight));
    }

    if (current) current.textContent = isLight ? 'Modo claro ativado' : 'Modo noturno ativado';
    if (preview) preview.textContent = isLight ? 'Claro' : 'Noturno';
  }

  function upgradeProductImages() {
    qsa('.product-card .product-image').forEach(img => {
      const original = img.getAttribute('src') || '';
      if (!original || original.includes('/site/') || original.endsWith('.svg')) return;

      const enhanced = original.replace('/produtos/', '/produtos/site/');
      img.dataset.originalSrc = original;
      img.src = enhanced;
      img.addEventListener('error', () => {
        img.src = img.dataset.originalSrc || original;
      }, { once: true });
    });
  }

  function enhanceNavigation() {
    const navInner = qs('.nav-inner');
    if (!navInner) return;

    const mobileToggle = qs('.mobile-menu-toggle', navInner);
    const navMenu = qs('.nav-menu', navInner);
    const brand = qs('.brand', navInner);

    if (brand && !qs('.brand-text', brand)) {
      brand.insertAdjacentHTML('beforeend', '<span class="brand-text">Monte Sinai</span>');
    }

    if (!qs('.nav-search', navInner)) {
      const search = document.createElement('form');
      search.className = 'nav-search';
      search.setAttribute('role', 'search');
      search.dataset.siteSearchForm = '';
      search.innerHTML = `
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" name="busca" data-site-search-input placeholder="Pesquisar produto">
        <button type="submit" aria-label="Buscar produto">
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;
      navInner.insertBefore(search, navMenu?.nextSibling || mobileToggle || null);
    }

    if (!qs('.nav-actions', navInner)) {
      const actions = document.createElement('div');
      actions.className = 'nav-actions';
      actions.innerHTML = `
        <a class="nav-pill nav-account-link" href="${loginHref({ redirect: currentLocationForRedirect() })}" aria-label="Entrar ou cadastrar">
          <span class="nav-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span class="nav-account-label" data-account-label>Entrar ou cadastrar</span>
        </a>
        <button class="nav-icon nav-cart-link" type="button" data-open-cart aria-label="Abrir carrinho">
          <i class="fa-solid fa-bag-shopping"></i>
          <span class="nav-cart-count" data-cart-count>0</span>
        </button>
      `;
      navInner.insertBefore(actions, mobileToggle || null);
    }

    const mobileMenu = qs('.mobile-menu');
    if (mobileMenu && !qs('[data-mobile-extra]', mobileMenu)) {
      mobileMenu.insertAdjacentHTML('beforeend', `
        <div class="mobile-menu-divider" data-mobile-extra></div>
        <a class="mobile-only-link nav-account-link" href="${loginHref({ redirect: currentLocationForRedirect() })}" data-mobile-extra>
          <span class="mobile-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span data-account-label>Entrar ou cadastrar</span>
        </a>
        <button class="mobile-only-link mobile-menu-button" type="button" data-open-cart data-mobile-extra>
          <i class="fa-solid fa-bag-shopping"></i>
          Carrinho
          <strong data-cart-count>0</strong>
        </button>
      `);
    }

    if (!document.body.classList.contains('auth-body') && !qs('.mobile-quick-dock')) {
      const dock = document.createElement('nav');
      dock.className = 'mobile-quick-dock';
      dock.setAttribute('aria-label', 'Atalhos para celular');
      dock.innerHTML = `
        <a href="${productHref()}" data-dock-section="store">
          <i class="fa-solid fa-store"></i>
          <span>Loja</span>
        </a>
        <button type="button" data-open-search data-dock-section="search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>Buscar</span>
        </button>
        <button class="dock-cart" type="button" data-open-cart data-dock-section="cart">
          <i class="fa-solid fa-bag-shopping"></i>
          <span>Carrinho</span>
          <strong data-cart-count>0</strong>
        </button>
        <a class="mobile-settings-link" href="${pageHref('configuracoes.html')}" data-dock-section="settings">
          <i class="fa-solid fa-gear"></i>
          <span>Ajustes</span>
        </a>
        <a class="nav-account-link" href="${loginHref({ redirect: currentLocationForRedirect() })}" data-dock-section="account">
          <span class="dock-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span data-account-label>Conta</span>
        </a>
      `;
      document.body.appendChild(dock);
    }

    updateAccountUI();
    updateDockActive();
  }

  function accountAvatarHTML(signed) {
    if (!signed) return '<i class="fa-solid fa-user" aria-hidden="true"></i>';
    if (currentUser?.photo) return `<img src="${escapeHTML(currentUser.photo)}" alt="">`;
    const initial = (currentUser?.name || currentUser?.email || 'U').trim().charAt(0).toUpperCase() || 'U';
    return `<span>${escapeHTML(initial)}</span>`;
  }

  function updateAccountUI() {
    const signed = Boolean(currentUser?.email);
    qsa('[data-account-label]').forEach(label => {
      label.textContent = label.closest('.mobile-quick-dock')
        ? 'Conta'
        : (signed ? firstName() : 'Entrar ou cadastrar');
    });

    qsa('[data-account-avatar]').forEach(avatar => {
      avatar.classList.toggle('signed-in', signed);
      avatar.classList.toggle('has-photo', signed && Boolean(currentUser?.photo));
      avatar.innerHTML = accountAvatarHTML(signed);
    });

    qsa('[data-dock-section="account"]').forEach(link => {
      link.classList.toggle('has-photo', signed && Boolean(currentUser?.photo));
    });

    qsa('.nav-account-link, [data-account-cta], [data-account-login]').forEach(link => {
      if (!(link instanceof HTMLAnchorElement)) return;
      link.href = signed ? profileHref() : loginHref({ redirect: currentLocationForRedirect() });
      link.classList.toggle('active', signed && ['perfil.html', 'editar-perfil.html', 'configuracoes.html'].includes(currentPage()));
      link.setAttribute('aria-label', signed ? `Conta de ${firstName()}` : 'Entrar ou cadastrar');

      if (link.hasAttribute('data-account-cta')) {
        link.innerHTML = signed
          ? '<i class="fa-solid fa-user-gear"></i> Minha conta'
          : '<i class="fa-solid fa-user-check"></i> Entrar ou cadastrar';
      }
    });
  }

  function bindMobileMenu() {
    const toggle = qs('.mobile-menu-toggle');
    const menu = qs('.mobile-menu');
    if (!toggle || !menu) return;

    const close = () => {
      menu.classList.remove('show');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
      document.body.classList.remove('menu-open');
    };

    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('show');
      menu.classList.toggle('show', open);
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
      document.body.classList.toggle('menu-open', open);
    });

    menu.addEventListener('click', event => {
      if (event.target.closest('a, button')) close();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  }

  function setActiveNavigation() {
    const page = currentPage();
    qsa('.nav-menu a, .mobile-menu a, .footer-links a').forEach(link => {
      const linkPage = (link.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop() || 'index.html';
      link.classList.toggle('active', linkPage === page);
    });
    updateDockActive();
  }

  function updateDockActive() {
    const page = currentPage();
    const activeSection = (() => {
      if (['index.html', 'produtos.html'].includes(page)) return 'store';
      if (page === 'configuracoes.html') return 'settings';
      if (['login.html', 'perfil.html', 'editar-perfil.html', 'criar.html'].includes(page)) return 'account';
      return '';
    })();

    qsa('.mobile-quick-dock a, .mobile-quick-dock button').forEach(item => {
      const isActive = item.dataset.dockSection === activeSection;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function bindSiteSearch() {
    qsa('[data-site-search-form]').forEach(form => {
      const input = qs('[data-site-search-input]', form);
      const suggestions = ensureSearchSuggestions(form);

      input?.addEventListener('input', () => {
        closeOtherSearchSuggestions(suggestions);
        renderSearchSuggestions(form, suggestions, input.value);
      });
      input?.addEventListener('focus', () => {
        closeOtherSearchSuggestions(suggestions);
        renderSearchSuggestions(form, suggestions, input.value);
      });

      form.addEventListener('submit', event => {
        event.preventDefault();
        const term = input?.value.trim() || '';
        hideSearchSuggestions(suggestions);

        if (currentPage() !== 'produtos.html') {
          window.location.href = productHref(term);
          return;
        }

        const catalogInput = qs('[data-catalog-search]');
        if (catalogInput && input !== catalogInput) catalogInput.value = term;
        applyCatalogFilters();
        qs('#todos-produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-site-search-form]')) return;
      qsa('.search-suggestions').forEach(hideSearchSuggestions);
    });
    window.addEventListener('scroll', () => {
      qsa('.search-suggestions').forEach(hideSearchSuggestions);
    }, { passive: true });
    window.addEventListener('resize', () => {
      qsa('.search-suggestions').forEach(hideSearchSuggestions);
    });

    qsa('[data-mobile-search]').forEach(button => {
      button.addEventListener('click', () => {
        if (currentPage() !== 'produtos.html') {
          window.location.href = productHref();
          return;
        }
        qs('[data-catalog-search]')?.focus();
        qs('#todos-produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function ensureSearchSuggestions(form) {
    let suggestions = qs('.search-suggestions', form);
    if (suggestions) return suggestions;

    suggestions = document.createElement('div');
    suggestions.className = 'search-suggestions';
    suggestions.setAttribute('role', 'listbox');
    suggestions.setAttribute('aria-label', 'Sugestões de produtos');
    form.appendChild(suggestions);
    return suggestions;
  }

  function renderSearchSuggestions(form, suggestions, query) {
    const term = query.trim();
    if (term.length < 2) {
      suggestions.innerHTML = '';
      hideSearchSuggestions(suggestions);
      return;
    }

    const matches = PRODUCT_INDEX
      .map(product => ({ ...product, score: productScore(product, term) }))
      .filter(product => product.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 5);

    suggestions.innerHTML = '';

    if (!matches.length) {
      suggestions.innerHTML = `
        <div class="search-suggestion-empty">
          <strong>Nenhum produto exato</strong>
          <span>Veja limpeza, água, gás e utensílios no catálogo.</span>
        </div>
      `;
      suggestions.classList.add('show');
      return;
    }

    matches.forEach(product => {
      const item = document.createElement('button');
      item.className = 'search-suggestion-item';
      item.type = 'button';
      item.setAttribute('role', 'option');
      item.innerHTML = `
        <span>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.category)} • ${formatMoney(product.price)}</small>
        </span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      `;
      item.addEventListener('click', () => {
        const input = qs('[data-site-search-input]', form);
        if (input) input.value = product.name;
        hideSearchSuggestions(suggestions);

        if (currentPage() === 'produtos.html') {
          const catalogInput = qs('[data-catalog-search]');
          if (catalogInput) catalogInput.value = product.name;
          applyCatalogFilters();
          qs('#todos-produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.href = productHref(product.name);
        }
      });
      suggestions.appendChild(item);
    });

    suggestions.classList.add('show');
  }

  function hideSearchSuggestions(suggestions) {
    suggestions?.classList.remove('show');
  }

  function closeOtherSearchSuggestions(activeSuggestions) {
    qsa('.search-suggestions').forEach(suggestions => {
      if (suggestions !== activeSuggestions) hideSearchSuggestions(suggestions);
    });
  }

  function ensureSmartSearchShell() {
    if (document.body.classList.contains('auth-body') || qs('.smart-search')) return;

    const shell = document.createElement('section');
    shell.className = 'smart-search';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-label', 'Busca inteligente de produtos');
    shell.innerHTML = `
      <div class="smart-search-backdrop" data-close-search></div>
      <div class="smart-search-panel">
        <header class="smart-search-head">
          <div>
            <span class="eyebrow">Busca inteligente</span>
            <h2>O que voce precisa hoje?</h2>
            <p>Digite do seu jeito: banheiro, lavar roupa, tirar gordura, gas ou agua.</p>
          </div>
          <button class="smart-search-close" type="button" data-close-search aria-label="Fechar busca">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <form class="smart-search-form" data-smart-search-form role="search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input data-smart-search-input type="search" autocomplete="off" placeholder="Ex: limpar banheiro, lavar roupa, gas...">
          <button type="submit">Buscar</button>
        </form>

        <div class="smart-search-chips" aria-label="Buscas rapidas">
          ${SMART_SEARCH_CHIPS.map(chip => `
            <button type="button" data-smart-chip="${escapeHTML(chip.query)}">${escapeHTML(chip.label)}</button>
          `).join('')}
        </div>

        <div class="smart-search-results" data-smart-search-results></div>
      </div>
    `;

    document.body.appendChild(shell);
    renderSmartSearchResults('');
  }

  function bindSmartSearchPanel() {
    const shell = qs('.smart-search');
    if (!shell) return;

    qsa('[data-open-search]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        const seed = qs('[data-catalog-search]')?.value || qs('[data-site-search-input]')?.value || '';
        openSmartSearch(seed);
      });
    });

    const form = qs('[data-smart-search-form]', shell);
    const input = qs('[data-smart-search-input]', shell);

    input?.addEventListener('input', () => renderSmartSearchResults(input.value));

    form?.addEventListener('submit', event => {
      event.preventDefault();
      navigateSmartSearch(input?.value || '');
    });

    shell.addEventListener('click', event => {
      const closeButton = event.target.closest('[data-close-search]');
      if (closeButton) {
        closeSmartSearch();
        return;
      }

      const chip = event.target.closest('[data-smart-chip]');
      if (chip) {
        const query = chip.dataset.smartChip || '';
        if (input) input.value = query;
        renderSmartSearchResults(query);
        input?.focus();
        return;
      }

      const product = event.target.closest('[data-smart-product]');
      if (product) navigateSmartSearch(product.dataset.smartProduct || input?.value || '');
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && shell.classList.contains('open')) closeSmartSearch();
    });
  }

  function openSmartSearch(seed = '') {
    const shell = qs('.smart-search');
    if (!shell) {
      window.location.href = productHref(seed);
      return;
    }

    const input = qs('[data-smart-search-input]', shell);
    if (input) input.value = seed.trim();
    renderSmartSearchResults(seed);
    shell.classList.add('open');
    document.body.classList.add('smart-search-open');
    qsa('.mobile-quick-dock [data-dock-section="search"]').forEach(button => button.classList.add('active'));
    setTimeout(() => input?.focus(), 80);
  }

  function closeSmartSearch() {
    qs('.smart-search')?.classList.remove('open');
    document.body.classList.remove('smart-search-open');
    updateDockActive();
  }

  function navigateSmartSearch(query) {
    const term = query.trim();

    if (currentPage() === 'produtos.html') {
      const catalogInput = qs('[data-catalog-search]');
      if (catalogInput) catalogInput.value = term;
      applyCatalogFilters();
      closeSmartSearch();
      qs('#todos-produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.location.href = productHref(term);
  }

  function renderSmartSearchResults(query = '') {
    const results = qs('[data-smart-search-results]');
    if (!results) return;

    const term = query.trim();
    const matches = smartSearchMatches(term);
    const heading = term ? 'Produtos encontrados' : 'Mais procurados agora';
    const subtitle = term
      ? `${matches.length} sugestao${matches.length === 1 ? '' : 'es'} para "${escapeHTML(term)}"`
      : 'Atalhos para os pedidos mais comuns no celular';

    results.innerHTML = `
      <div class="smart-search-result-head">
        <div>
          <strong>${heading}</strong>
          <span>${subtitle}</span>
        </div>
        <button type="button" data-smart-chip="limpeza">Ver limpeza</button>
      </div>
      ${matches.length ? `
        <div class="smart-search-result-grid">
          ${matches.map(product => `
            <button type="button" class="smart-search-product" data-smart-product="${escapeHTML(product.name)}">
              <span class="smart-search-product-icon"><i class="fa-solid ${smartProductIcon(product)}"></i></span>
              <span class="smart-search-product-copy">
                <strong>${escapeHTML(product.name)}</strong>
                <small>${escapeHTML(product.category)} - ${formatMoney(product.price)}</small>
              </span>
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          `).join('')}
        </div>
      ` : `
        <div class="smart-search-empty">
          <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
          <strong>Nenhum produto exato ainda</strong>
          <span>Tente procurar por banheiro, roupa, cozinha, quintal, gas, agua ou cheiro bom.</span>
        </div>
      `}
    `;
  }

  function smartSearchMatches(query) {
    if (!query.trim()) {
      const featured = ['agua mineral', 'gas de cozinha', 'detergente', 'desinfetante', 'sabao omo', 'vassoura'];
      return featured
        .map(term => PRODUCT_INDEX.find(product => normalizeText(product.name).includes(term)))
        .filter(Boolean);
    }

    const scored = PRODUCT_INDEX
      .map(product => ({ ...product, score: productScore(product, query) }))
      .filter(product => product.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'));
    const hasStrongMatches = scored.some(product => product.score >= 6);
    return scored
      .filter(product => hasStrongMatches ? product.score >= 6 : product.score > 0)
      .slice(0, 8);
  }

  function smartProductIcon(product) {
    const blob = normalizeText(`${product.name} ${product.category}`);
    if (blob.includes('gas')) return 'fa-fire-flame-simple';
    if (blob.includes('agua')) return 'fa-droplet';
    if (blob.includes('roupa') || blob.includes('lavanderia') || blob.includes('sabao') || blob.includes('amaciante')) return 'fa-shirt';
    if (blob.includes('cozinha') || blob.includes('detergente') || blob.includes('esponja')) return 'fa-kitchen-set';
    if (blob.includes('banheiro') || blob.includes('vaso') || blob.includes('sabonete')) return 'fa-bath';
    if (blob.includes('vassoura') || blob.includes('rodo') || blob.includes('pa')) return 'fa-broom';
    return 'fa-spray-can-sparkles';
  }

  function bindCatalog() {
    const products = qsa('.catalog-product');
    if (!products.length) return;

    const input = qs('[data-catalog-search]');
    const params = new URLSearchParams(location.search);
    const initialQuery = params.get('q') || '';
    if (input && initialQuery) input.value = initialQuery;

    input?.addEventListener('input', applyCatalogFilters);

    qsa('[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        qsa('[data-filter]').forEach(item => item.classList.toggle('active', item === chip));
        applyCatalogFilters();
      });
    });

    applyCatalogFilters();
  }

  function applyCatalogFilters() {
    const products = qsa('.catalog-product');
    if (!products.length) return;

    const rawTerm = qs('[data-catalog-search]')?.value || '';
    const term = normalizeText(rawTerm);
    const activeChip = qs('[data-filter].active');
    const filter = activeChip?.dataset.filter || 'all';
    const scoredCards = products.map(card => ({
      card,
      score: productScore(cardSearchData(card), term)
    }));
    const hasStrongMatches = !term || scoredCards.some(item => item.score >= 6);
    let visible = 0;

    scoredCards.forEach(({ card, score }) => {
      const category = card.dataset.category || '';
      const recommended = card.dataset.recommended === 'true' || card.classList.contains('is-recommended');
      const matchesTerm = !term || (hasStrongMatches ? score >= 6 : score > 0);
      const matchesFilter = filter === 'all' || category === filter || (filter === 'recommended' && recommended);
      const show = matchesTerm && matchesFilter;
      card.classList.toggle('hidden', !show);
      card.classList.toggle('is-related-result', Boolean(term && show && score < 6));
      if (show) visible += 1;
    });

    qs('#catalog-empty')?.classList.toggle('hidden', visible > 0);
    const result = qs('[data-catalog-results]');
    if (result) {
      const suffix = term ? ` para "${rawTerm.trim()}"` : '';
      const related = term && !hasStrongMatches && visible
        ? (visible === 1 ? ' relacionado' : ' relacionados')
        : '';
      result.textContent = `${visible} produto${visible === 1 ? '' : 's'}${related} encontrado${visible === 1 ? '' : 's'}${suffix}`;
    }
  }

  function bindProductCards() {
    document.body.addEventListener('change', event => {
      const select = event.target.closest('.product-option');
      if (!select) return;

      const option = select.selectedOptions[0];
      const card = select.closest('.product-card');
      const price = Number(option?.dataset.price || card?.querySelector('.btn-add-cart')?.dataset.price || 0);
      const priceEl = card?.querySelector('strong');
      const button = card?.querySelector('.btn-add-cart');

      if (priceEl) priceEl.textContent = formatMoney(price);
      if (button && option?.dataset.price) button.dataset.price = option.dataset.price;
    });

    document.body.addEventListener('click', event => {
      const button = event.target.closest('.btn-add-cart');
      if (!button) return;

      const card = button.closest('.product-card');
      const select = card?.querySelector('.product-option');
      const option = select?.selectedOptions[0];
      const baseName = button.dataset.name || card?.dataset.name || card?.querySelector('h3')?.textContent.trim();
      const variant = option?.value || '';
      const price = Number(option?.dataset.price || button.dataset.price || 0);
      const image = canonicalAssetPath(card?.querySelector('.product-image')?.getAttribute('src') || button.dataset.image || '');

      if (!baseName || Number.isNaN(price)) return;

      addToCart({
        name: baseName,
        variant,
        price,
        image
      });

      const original = button.dataset.originalText || button.textContent.trim();
      button.dataset.originalText = original;
      button.textContent = 'Adicionado';
      button.classList.add('is-added');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-added');
      }, 1150);
    });
  }

  function addToCart(product) {
    const displayName = product.variant ? `${product.name} - ${product.variant}` : product.name;
    const id = makeCartId(product.name, product.variant);
    const existing = cart.find(item => item.id === id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id,
        name: displayName,
        baseName: product.name,
        variant: product.variant || '',
        price: Number(product.price || 0),
        quantity: 1,
        image: product.image || ''
      });
    }

    saveCart();
    renderCart();
    showToast(`${displayName} adicionado ao carrinho.`);
  }

  function bindProductRail() {
    const rail = qs('[data-product-rail]');
    if (!rail) return;

    const cards = () => qsa('.rail-product', rail);
    let active = 0;

    const applyRailState = index => {
      const list = cards();
      if (!list.length) return;
      active = Math.max(0, Math.min(index, list.length - 1));
      list.forEach((card, cardIndex) => {
        const distance = Math.abs(cardIndex - active);
        card.classList.toggle('is-center', cardIndex === active);
        card.classList.toggle('is-near', distance === 1);
        card.classList.toggle('is-left', cardIndex < active);
        card.classList.toggle('is-right', cardIndex > active);
      });
    };

    const scrollRailTo = (index, behavior = 'smooth') => {
      const list = cards();
      if (!list.length) return;
      const safeIndex = Math.max(0, Math.min(index, list.length - 1));
      const target = list[safeIndex];
      const targetRect = target.getBoundingClientRect();
      const step = (targetRect.width || target.offsetWidth || 316) + 18;
      const left = safeIndex * step;
      const desiredLeft = Math.max(0, left);
      rail.scrollTo({ left: desiredLeft, behavior });
      window.setTimeout(() => {
        if (Math.abs(rail.scrollLeft - desiredLeft) < 1 && desiredLeft > 0) {
          rail.scrollLeft = desiredLeft;
        }
      }, 120);
    };

    const focusCard = (index, behavior = 'smooth') => {
      applyRailState(index);
      scrollRailTo(active, behavior);
    };

    qsa('[data-rail-scroll]').forEach(button => {
      button.addEventListener('click', () => {
        focusCard(active + (button.dataset.railScroll === 'prev' ? -1 : 1));
      });
    });

    rail.addEventListener('click', event => {
      if (event.target.closest('button, select, input, textarea, label, a')) return;

      const card = event.target.closest('.rail-product');
      if (!card || !rail.contains(card)) return;

      const list = cards();
      const index = list.indexOf(card);
      if (index < 0) return;

      focusCard(index === active ? (active + 1) % list.length : index);
    });

    rail.addEventListener('scroll', () => {
      window.requestAnimationFrame(() => {
        const rect = rail.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        let next = active;
        let best = Infinity;

        cards().forEach((card, index) => {
          const cardRect = card.getBoundingClientRect();
          const distance = Math.abs(center - (cardRect.left + cardRect.width / 2));
          if (distance < best) {
            best = distance;
            next = index;
          }
        });

        if (next !== active) applyRailState(next);
      });
    }, { passive: true });

    window.requestAnimationFrame(() => applyRailState(0));
  }

  function ensureCartShell() {
    if (!qs('.cart-float') && !document.body.classList.contains('auth-body')) {
      const float = document.createElement('button');
      float.className = 'cart-float is-empty';
      float.type = 'button';
      float.dataset.openCart = '';
      float.innerHTML = '<i class="fa-solid fa-bag-shopping"></i><span>Carrinho</span><span class="badge" data-cart-count>0</span>';
      document.body.appendChild(float);
    }

    if (!qs('.cart-modal')) {
      const modal = document.createElement('div');
      modal.className = 'cart-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Carrinho de compras');
      modal.innerHTML = `
        <div class="cart-modal-panel">
          <header class="cart-modal-header">
            <div>
              <span class="eyebrow">Seu carrinho</span>
              <h3>Resumo do pedido</h3>
            </div>
            <button class="icon-button" type="button" data-close-cart aria-label="Fechar carrinho">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="cart-items" data-modal-cart-items></div>
          <footer class="cart-modal-footer">
            <div class="cart-total">
              <span>Subtotal</span>
              <strong data-cart-total>R$ 0,00</strong>
            </div>
            <a class="btn btn-primary btn-full" data-modal-checkout href="${checkoutHref()}">
              <i class="fa-solid fa-lock"></i>
              Finalizar pedido
            </a>
            <a class="btn btn-secondary btn-full" href="${productHref()}">
              <i class="fa-solid fa-store"></i>
              Continuar comprando
            </a>
          </footer>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  function bindCartActions() {
    document.body.addEventListener('click', event => {
      const open = event.target.closest('[data-open-cart]');
      const close = event.target.closest('[data-close-cart]');
      const action = event.target.closest('[data-cart-action]');
      const pageCheckout = event.target.closest('[data-page-checkout]');

      if (open) {
        openCartModal();
        return;
      }

      if (close || event.target.classList.contains('cart-modal')) {
        closeCartModal();
        return;
      }

      if (pageCheckout) {
        if (!cart.length) {
          showToast('Adicione pelo menos um produto antes de finalizar.');
          return;
        }
        window.location.href = checkoutHref();
        return;
      }

      if (!action) return;

      const id = action.dataset.cartId;
      const item = cart.find(entry => entry.id === id);
      if (!item) return;

      if (action.dataset.cartAction === 'increase') item.quantity += 1;
      if (action.dataset.cartAction === 'decrease') item.quantity = Math.max(1, item.quantity - 1);
      if (action.dataset.cartAction === 'remove') cart = cart.filter(entry => entry.id !== id);

      saveCart();
      renderCart();
      renderPaymentSummary();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeCartModal();
    });
  }

  function openCartModal() {
    renderCart();
    qs('.cart-modal')?.classList.add('open');
    document.body.classList.add('cart-open');
    qsa('.mobile-quick-dock .dock-cart').forEach(button => button.classList.add('active'));
  }

  function closeCartModal() {
    qs('.cart-modal')?.classList.remove('open');
    document.body.classList.remove('cart-open');
    updateDockActive();
  }

  function renderCart() {
    qsa('[data-cart-count], #cart-count').forEach(el => {
      el.textContent = String(cartCount());
    });
    qsa('[data-profile-cart-count]').forEach(el => {
      el.textContent = String(cartCount());
    });

    qsa('[data-cart-total], #cart-total').forEach(el => {
      el.textContent = formatMoney(cartSubtotal());
    });

    qsa('.cart-float').forEach(button => {
      button.classList.toggle('is-empty', cart.length === 0);
    });
    qsa('.mobile-quick-dock .dock-cart').forEach(button => {
      button.classList.toggle('has-items', cartCount() > 0);
    });

    const pageItems = qs('#cart-items');
    const modalItems = qs('[data-modal-cart-items]');
    if (pageItems) renderCartItems(pageItems);
    if (modalItems) renderCartItems(modalItems);

    qsa('[data-page-checkout], [data-modal-checkout]').forEach(button => {
      button.classList.toggle('hidden', cart.length === 0);
      if (button instanceof HTMLAnchorElement) button.href = checkoutHref();
    });
  }

  function renderCartItems(container) {
    container.innerHTML = '';

    if (!cart.length) {
      container.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
      return;
    }

    cart.forEach(item => {
      const row = document.createElement('article');
      row.className = 'cart-item';
      row.innerHTML = `
        <div class="cart-item-left">
          <span class="cart-thumb">
            ${item.image ? `<img class="cart-thumb-img" src="${assetHref(item.image)}" alt="">` : '<i class="fa-solid fa-box"></i>'}
          </span>
          <span>
            <span class="cart-item-name">${escapeHTML(item.name)}</span>
            <span class="cart-item-price">${formatMoney(item.price)} cada</span>
          </span>
        </div>
        <div class="cart-item-right">
          <div class="qty-controls" aria-label="Quantidade">
            <button class="icon-button" type="button" data-cart-action="decrease" data-cart-id="${escapeHTML(item.id)}" aria-label="Diminuir quantidade">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="qty">${escapeHTML(item.quantity)}</span>
            <button class="icon-button" type="button" data-cart-action="increase" data-cart-id="${escapeHTML(item.id)}" aria-label="Aumentar quantidade">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <button class="icon-button btn-remove" type="button" data-cart-action="remove" data-cart-id="${escapeHTML(item.id)}" aria-label="Remover produto">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;
      container.appendChild(row);
    });
  }

  function bindAccountPage() {
    const form = qs('#account-form');
    if (!form) return;

    const params = new URLSearchParams(location.search);
    const tabs = qsa('[data-auth-mode]');
    const submitLabel = qs('[data-auth-submit-label]');
    const status = qs('#account-status');
    const nameInput = qs('#login-name');
    const emailInput = qs('#login-email');
    const passInput = qs('#login-password');
    const confirmInput = qs('#login-password-confirm');
    const phoneInput = qs('#login-phone');
    const addressInput = qs('#login-address');

    const setMode = mode => {
      form.dataset.authMode = mode;
      tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.authMode === mode));
      qsa('[data-register-only]').forEach(field => field.classList.toggle('hidden', mode !== 'register'));
      if (submitLabel) submitLabel.textContent = mode === 'register' ? 'Cadastrar' : 'Entrar';
      if (status) {
        status.textContent = mode === 'register'
          ? 'Crie sua conta local para salvar telefone e endereço neste aparelho.'
          : 'Entre para usar seus dados salvos e finalizar pedidos mais rápido.';
      }
      passInput?.setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
    };

    tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.authMode || 'login')));

    if (currentUser?.email) {
      emailInput.value = currentUser.email || '';
      nameInput.value = currentUser.name || '';
      phoneInput.value = currentUser.phone || '';
      addressInput.value = currentUser.address || '';
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const mode = form.dataset.authMode || 'login';
      const accounts = loadJSON(STORAGE.accounts, {});
      const email = emailInput.value.trim().toLowerCase();
      const password = passInput.value;

      if (!email || !password) {
        showToast('Informe email e senha para continuar.');
        return;
      }

      if (mode === 'register') {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();

        if (!name || !phone || !address) {
          showToast('Preencha nome, WhatsApp e endereço para cadastrar.');
          return;
        }

        if (password.length < 4) {
          showToast('Use uma senha com pelo menos 4 caracteres.');
          return;
        }

        if (password !== confirmInput.value) {
          showToast('A confirmação da senha precisa ser igual.');
          return;
        }

        const user = { email, password, name, phone, address, nick: '', provider: 'Cadastro local' };
        accounts[email] = user;
        saveJSON(STORAGE.accounts, accounts);
        finishLogin(user, 'Conta criada com sucesso.');
        return;
      }

      const saved = accounts[email];
      if (saved && saved.password !== password) {
        showToast('Senha diferente da conta salva neste aparelho.');
        return;
      }

      const user = saved || {
        email,
        password,
        name: email.split('@')[0],
        phone: '',
        address: '',
        nick: '',
        provider: 'Login local'
      };
      accounts[email] = user;
      saveJSON(STORAGE.accounts, accounts);
      finishLogin(user, profileComplete(user) ? 'Login realizado.' : 'Login realizado. Complete seu endereço quando finalizar.');
    });

    setMode(params.get('mode') === 'register' ? 'register' : 'login');
  }

  function finishLogin(user, message) {
    const { password: _password, ...safeUser } = user;
    saveUser(safeUser);
    showToast(message);

    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    setTimeout(() => {
      window.location.href = redirect || profileHref();
    }, 500);
  }

  function initPaymentPage() {
    if (!qs('#payment-summary')) return;

    qsa('[data-payment-option]').forEach(button => {
      button.addEventListener('click', () => setPaymentOption(button.dataset.paymentOption || 'delivery'));
    });

    qs('#order-for-other')?.addEventListener('change', event => {
      if (event.target.checked) {
        qs('#payment-form')?.classList.remove('profile-ready');
        ['#payment-name', '#payment-phone', '#payment-address'].forEach(selector => {
          const input = qs(selector);
          if (input) input.value = '';
        });
        showToast('Preencha os dados do destinatário.');
      } else {
        applyCheckoutProfile();
      }
    });

    qs('#checkout-edit-customer')?.addEventListener('click', () => {
      qs('#payment-form')?.classList.remove('profile-ready');
      qs('#checkout-profile-box')?.classList.add('hidden');
      showToast('Dados liberados para edição neste pedido.');
    });

    qs('#payment-confirm')?.addEventListener('click', finalizeOrder);

    renderPaymentSummary();
    applyCheckoutProfile();
    setPaymentOption('delivery');
  }

  function setPaymentOption(option) {
    activePayment = option || 'delivery';
    qsa('[data-payment-option]').forEach(button => {
      button.classList.toggle('active', button.dataset.paymentOption === activePayment);
    });
    qsa('[data-payment-panel]').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.paymentPanel === activePayment);
    });

    const confirm = qs('#payment-confirm');
    if (confirm) {
      confirm.innerHTML = activePayment === 'whatsapp'
        ? '<i class="fa-brands fa-whatsapp"></i> Enviar pelo WhatsApp'
        : '<i class="fa-solid fa-truck-fast"></i> Finalizar para entrega';
    }
  }

  function renderPaymentSummary() {
    const summary = qs('#payment-summary');
    if (!summary) return;

    const empty = qs('#payment-empty');
    const form = qs('#payment-form');
    const accountCard = qs('#checkout-account-card');
    summary.innerHTML = '';

    if (!cart.length) {
      empty?.classList.remove('hidden');
      form?.classList.add('hidden');
      accountCard?.classList.add('hidden');
      return;
    }

    empty?.classList.add('hidden');
    form?.classList.remove('hidden');
    accountCard?.classList.remove('hidden');

    const list = document.createElement('div');
    list.className = 'payment-items';
    cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'payment-item';
      row.innerHTML = `<span>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</span><strong>${formatMoney(item.price * item.quantity)}</strong>`;
      list.appendChild(row);
    });

    const fee = deliveryFee();
    const gift = hasGasGift();
    summary.appendChild(list);
    summary.insertAdjacentHTML('beforeend', `
      <div class="payment-fee">
        <span>Entrega</span>
        <strong>${fee ? formatMoney(fee) : 'Grátis'}</strong>
      </div>
      ${gift ? '<div class="payment-gift"><span>Brinde</span><strong>Compra de gás</strong></div>' : ''}
      <div class="payment-total">
        <span>Total</span>
        <strong>${formatMoney(orderTotal())}</strong>
      </div>
    `);
  }

  function applyCheckoutProfile() {
    currentUser = loadJSON(STORAGE.user, null);
    const form = qs('#payment-form');
    const profileBox = qs('#checkout-profile-box');
    const accountText = qs('#checkout-account-text');
    const loginLink = qs('[data-account-login]');

    if (profileComplete()) {
      qs('#payment-name').value = currentUser.name || '';
      qs('#payment-phone').value = currentUser.phone || '';
      qs('#payment-address').value = currentUser.address || '';
      form?.classList.add('profile-ready');
      profileBox?.classList.remove('hidden');
      if (accountText) accountText.textContent = `Usando os dados salvos de ${firstName()}.`;
      if (loginLink) {
        loginLink.href = profileHref();
        loginLink.innerHTML = '<i class="fa-solid fa-user-gear"></i> Minha conta';
      }
    } else {
      form?.classList.remove('profile-ready');
      profileBox?.classList.add('hidden');
      if (accountText) accountText.textContent = 'Entre ou cadastre-se para salvar seus dados e pedir mais rápido.';
      if (loginLink) {
        loginLink.href = loginHref({ redirect: currentLocationForRedirect() });
        loginLink.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
      }
    }
  }

  function collectCheckoutCustomer() {
    const customer = {
      name: qs('#payment-name')?.value.trim() || '',
      phone: qs('#payment-phone')?.value.trim() || '',
      address: qs('#payment-address')?.value.trim() || '',
      note: qs('#payment-note')?.value.trim() || '',
      email: currentUser?.email || ''
    };

    if (!customer.name || !customer.phone || !customer.address) {
      showToast('Preencha nome, telefone e endereço.');
      return null;
    }

    return customer;
  }

  function finalizeOrder() {
    if (!cart.length) {
      showToast('Seu carrinho está vazio.');
      return;
    }

    const customer = collectCheckoutCustomer();
    if (!customer) return;

    const order = {
      id: createOrderId(),
      createdAt: new Date().toISOString(),
      customer,
      items: cart.map(item => ({ ...item })),
      subtotal: cartSubtotal(),
      delivery: deliveryFee(),
      total: orderTotal(),
      gift: hasGasGift(),
      payment: activePayment === 'whatsapp'
        ? 'Combinar pelo WhatsApp'
        : (qs('input[name="delivery-payment"]:checked')?.value || 'Pagar na entrega'),
      status: 'Pedido enviado'
    };

    saveOrder(order);
    openWhatsAppOrder(order);
    cart = [];
    saveCart();
    renderCart();

    const summary = qs('#payment-summary');
    qs('#payment-form')?.classList.add('hidden');
    qs('#checkout-account-card')?.classList.add('hidden');
    if (summary) {
      summary.innerHTML = `
        <div class="checkout-success">
          <span class="eyebrow">Pedido enviado</span>
          <h3>${escapeHTML(order.id)}</h3>
          <p>Seu pedido foi montado e enviado para atendimento no WhatsApp. Você também pode reenviar a mensagem se o navegador bloquear a abertura automática.</p>
          <a class="btn btn-primary" href="https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
            Reenviar WhatsApp
          </a>
          <a class="btn btn-secondary" href="${productHref()}">Comprar mais</a>
        </div>
      `;
    }

    renderOrdersEverywhere();
    showToast('Pedido finalizado.');
  }

  function createOrderId() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MS-${date}-${random}`;
  }

  function saveOrder(order) {
    const orders = loadJSON(STORAGE.orders, []);
    orders.unshift(order);
    saveJSON(STORAGE.orders, orders.slice(0, 100));
  }

  function buildOrderMessage(order) {
    const lines = [
      '*Novo pedido Monte Sinai*',
      `Pedido: ${order.id}`,
      `Cliente: ${order.customer.name}`,
      `Telefone: ${order.customer.phone}`,
      `Endereço: ${order.customer.address}`,
      `Pagamento: ${order.payment}`,
      '',
      '*Itens:*'
    ];

    order.items.forEach(item => {
      lines.push(`- ${item.quantity} x ${item.name} = ${formatMoney(item.price * item.quantity)}`);
    });

    lines.push('');
    lines.push(`Subtotal: ${formatMoney(order.subtotal)}`);
    lines.push(`Entrega: ${order.delivery ? formatMoney(order.delivery) : 'Grátis'}`);
    if (order.gift) lines.push('Brinde: compra de gás');
    lines.push(`*Total: ${formatMoney(order.total)}*`);
    if (order.customer.note) lines.push(`Observações: ${order.customer.note}`);
    return lines.join('\n');
  }

  function openWhatsAppOrder(order) {
    window.open(`https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}`, '_blank');
  }

  function initProfilePage() {
    if (!qs('#profile-page') || currentPage() !== 'perfil.html') return;
    if (currentUser && !currentUser.email) currentUser = ensureCustomerProfile();

    const summary = qs('.profile-summary');
    const details = qs('#profile-details');
    const empty = qs('#profile-empty');

    if (!currentUser?.email) {
      summary?.classList.add('hidden');
      details?.classList.add('hidden');
      empty?.classList.remove('hidden');
      return;
    }

    empty?.classList.add('hidden');
    summary?.classList.remove('hidden');
    details?.classList.remove('hidden');

    const avatar = qs('#profile-avatar');
    if (avatar) {
      avatar.textContent = (currentUser.name || currentUser.email || 'U').trim().charAt(0).toUpperCase();
      if (currentUser.photo) {
        avatar.innerHTML = `<img src="${escapeHTML(currentUser.photo)}" alt="">`;
      }
    }

    setText('#profile-name', currentUser.name || 'Cliente Monte Sinai');
    setText('#profile-nick', currentUser.nick ? `@${currentUser.nick}` : '');
    setText('#profile-provider', currentUser.provider || 'Cadastro local');
    setText('#profile-email', currentUser.email || 'Não informado');
    setText('#profile-phone', currentUser.phone || 'Complete seu WhatsApp');
    setText('#profile-address', currentUser.address || 'Complete seu endereço');

    qs('[data-switch-account]')?.addEventListener('click', () => {
      window.location.href = loginHref({ redirect: 'perfil.html' });
    });

    qs('[data-logout-account]')?.addEventListener('click', () => {
      saveUser(null);
      showToast('Você saiu da conta.');
      setTimeout(() => window.location.href = loginHref(), 500);
    });

    renderOrdersEverywhere();
  }

  function initProfileEditPage() {
    const form = qs('#profile-edit-form');
    if (!form) return;

    currentUser = ensureCustomerProfile();

    qs('#edit-name').value = currentUser.name || '';
    qs('#edit-nick').value = currentUser.nick || '';
    qs('#edit-phone').value = currentUser.phone || '';
    qs('#edit-address').value = currentUser.address || '';

    const preview = qs('#edit-photo-preview');
    if (preview && currentUser.photo) {
      preview.src = currentUser.photo;
      preview.classList.remove('hidden');
    }

    qs('#edit-photo')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      resizeProfilePhoto(file).then(photo => {
        if (preview) {
          preview.src = photo;
          preview.classList.remove('hidden');
        }
      }).catch(() => showToast('Nao consegui carregar esta foto. Tente outra imagem.'));
    });

    qs('[data-cancel-edit]')?.addEventListener('click', () => {
      window.location.href = profileHref();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const updated = {
        ...ensureCustomerProfile(),
        name: qs('#edit-name')?.value.trim() || '',
        nick: qs('#edit-nick')?.value.trim() || '',
        phone: qs('#edit-phone')?.value.trim() || '',
        address: qs('#edit-address')?.value.trim() || '',
        photo: preview?.src?.startsWith('data:') ? preview.src : currentUser.photo,
        provider: currentUser.provider || 'Cadastro local',
        updatedAt: new Date().toISOString()
      };

      if (!updated.name || !updated.phone || !updated.address) {
        showToast('Preencha nome, WhatsApp e endereço.');
        return;
      }

      const accounts = loadJSON(STORAGE.accounts, {});
      accounts[updated.email] = { ...(accounts[updated.email] || {}), ...updated };
      const accountSaved = saveJSON(STORAGE.accounts, accounts);
      const profileSaved = saveUser(updated);
      if (!accountSaved || !profileSaved) return;
      showToast('Perfil atualizado e salvo.');
      setTimeout(() => window.location.href = profileHref(), 500);
    });
  }

  function resizeProfilePhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file.type?.startsWith('image/')) {
        reject(new Error('Arquivo invalido'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 420;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result || ''));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  function setText(selector, value) {
    const el = qs(selector);
    if (el) el.textContent = value;
  }

  function initSettingsPage() {
    qs('#dark-mode-toggle')?.addEventListener('click', () => {
      setTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
    });
    updateThemeControls();

    qsa('[data-setting-toggle]').forEach(toggle => {
      const key = `ms_setting_${toggle.dataset.settingToggle}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) toggle.classList.toggle('active', stored === 'true');
      toggle.setAttribute('aria-pressed', String(toggle.classList.contains('active')));
      toggle.addEventListener('click', () => {
        const active = !toggle.classList.contains('active');
        toggle.classList.toggle('active', active);
        toggle.setAttribute('aria-pressed', String(active));
        localStorage.setItem(key, String(active));
      });
    });

    qs('[data-reset-feedback]')?.addEventListener('click', () => {
      qs('#feedback-form')?.reset();
      qs('#feedback-success')?.classList.remove('show');
    });

    qs('#feedback-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const text = [
        `Olá! Sou ${data.get('name') || 'cliente'}.`,
        `Contato: ${data.get('contact') || ''}`,
        `Categoria: ${data.get('category') || ''}`,
        '',
        `Sugestão: ${data.get('message') || ''}`
      ].join('\n');

      qs('#feedback-success')?.classList.add('show');
      window.open(`https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(text)}`, '_blank');
      setTimeout(() => qs('#feedback-success')?.classList.remove('show'), 1800);
    });

    renderOrdersEverywhere();
  }

  function initOwnerDashboard() {
    const form = qs('#owner-config-form');
    const ordersList = qs('#orders-list');
    if (!form && !ordersList) return;

    const fields = {
      whatsapp: qs('#owner-whatsapp'),
      pixKey: qs('#owner-pix-key'),
      merchantName: qs('#owner-merchant-name'),
      merchantCity: qs('#owner-merchant-city')
    };

    if (fields.whatsapp) fields.whatsapp.value = ownerConfig.whatsapp || '';
    if (fields.pixKey) fields.pixKey.value = ownerConfig.pixKey || '';
    if (fields.merchantName) fields.merchantName.value = ownerConfig.merchantName || DEFAULT_OWNER.merchantName;
    if (fields.merchantCity) fields.merchantCity.value = ownerConfig.merchantCity || DEFAULT_OWNER.merchantCity;

    form?.addEventListener('submit', event => {
      event.preventDefault();
      ownerConfig = {
        whatsapp: fields.whatsapp?.value.trim() || DEFAULT_OWNER.whatsapp,
        pixKey: fields.pixKey?.value.trim() || '',
        merchantName: fields.merchantName?.value.trim() || DEFAULT_OWNER.merchantName,
        merchantCity: fields.merchantCity?.value.trim() || DEFAULT_OWNER.merchantCity,
        savedAt: new Date().toISOString()
      };
      saveJSON(STORAGE.owner, ownerConfig);
      showToast('Configuração salva.');
    });

    qs('#request-notification')?.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        showToast('Este navegador não suporta notificações.');
        return;
      }
      const permission = await Notification.requestPermission();
      showToast(permission === 'granted' ? 'Notificações ativadas.' : 'Notificações não autorizadas.');
    });

    qs('#export-orders')?.addEventListener('click', () => {
      const orders = loadJSON(STORAGE.orders, []);
      const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedidos-monte-sinai-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    qs('#clear-orders')?.addEventListener('click', () => {
      if (!confirm('Deseja limpar os pedidos salvos neste navegador?')) return;
      saveJSON(STORAGE.orders, []);
      renderOrdersEverywhere();
      showToast('Pedidos removidos.');
    });

    document.body.addEventListener('click', event => {
      const button = event.target.closest('[data-order-whatsapp]');
      if (!button) return;
      const order = loadJSON(STORAGE.orders, []).find(item => item.id === button.dataset.orderWhatsapp);
      if (order) openWhatsAppOrder(order);
    });

    renderOrdersEverywhere();
  }

  function renderOrdersEverywhere() {
    const orders = loadJSON(STORAGE.orders, []);
    const customerOrders = currentUser?.email
      ? orders.filter(order => order.customer?.email === currentUser.email || order.customer?.phone === currentUser.phone)
      : [];

    setText('#dash-orders-count', String(orders.length));
    setText('#dash-orders-total', formatMoney(orders.reduce((sum, order) => sum + Number(order.total || 0), 0)));
    setText('#dash-last-order', orders[0]?.id || 'Nenhum');
    qsa('[data-profile-order-count]').forEach(el => {
      el.textContent = String(customerOrders.length);
    });

    qsa('[data-orders-container], #orders-list').forEach(container => {
      renderOrders(container, orders);
    });
  }

  function renderOrders(container, orders) {
    if (!container) return;
    container.innerHTML = '';

    let visibleOrders = orders;
    if (container.id === 'profile-orders' && currentUser?.email) {
      visibleOrders = orders.filter(order => order.customer?.email === currentUser.email || order.customer?.phone === currentUser.phone);
    }

    if (!visibleOrders.length) {
      container.insertAdjacentHTML('beforeend', '<p class="empty-cart">Nenhum pedido registrado neste navegador ainda.</p>');
      return;
    }

    visibleOrders.forEach(order => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const items = (order.items || []).map(item => `<li>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</li>`).join('');
      card.innerHTML = `
        <header>
          <strong>${escapeHTML(order.id)}</strong>
          <span class="badge">${escapeHTML(order.status || 'Pedido enviado')}</span>
        </header>
        <p>${escapeHTML(order.customer?.name || '')} - ${escapeHTML(order.customer?.phone || '')}</p>
        <p>${escapeHTML(order.customer?.address || '')}</p>
        <ul>${items}</ul>
        <footer>
          <strong>${formatMoney(order.total || 0)}</strong>
          <button class="btn btn-secondary" type="button" data-order-whatsapp="${escapeHTML(order.id)}">
            <i class="fa-brands fa-whatsapp"></i>
            Abrir WhatsApp
          </button>
        </footer>
      `;
      container.appendChild(card);
    });
  }

  function bindSubtleAnimations() {
    const elements = qsa('.section-head, .category-card, .product-card, .info-card, .about-card, .contact-box, .settings-section, .profile-card');
    elements.forEach(el => el.classList.add('reveal-on-scroll'));

    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    elements.forEach(el => observer.observe(el));
  }
});
