document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const STORAGE_KEY = 'ms_cart_v1';
  const THEME_KEY = 'ms_theme_v1';
  const USER_KEY = 'ms_customer_v2';
  const ACCOUNTS_KEY = 'ms_accounts_v1';
  const ORDERS_KEY = 'ms_orders_v1';
  const OWNER_KEY = 'ms_owner_config_v1';

  const DEFAULT_OWNER = {
    whatsapp: '5511960928234',
    altWhatsapp: '5511982690871',
    pixKey: '',
    merchantName: 'MONTE SINAI',
    merchantCity: 'SAO PAULO'
  };

  let cart = loadJSON(STORAGE_KEY, []);
  let currentUser = loadJSON(USER_KEY, null);
  let ownerConfig = { ...DEFAULT_OWNER, ...loadJSON(OWNER_KEY, {}) };
  let activePayment = 'pix';

  if (enforceAccountGate()) return;
  applySavedTheme();
  enhanceNavigation();
  bindThemeSettings();
  bindNotificationToggles();
  bindDataActions();
  bindAccountSettings();
  bindFeedbackForm();
  bindMobileMenu();
  setActiveNav();
  bindCatalogFilters();
  bindProductButtons();
  bindProductRail();
  bindTiltCards();
  bindAccountPage();
  ensureCartUI();
  renderCart();
  initPaymentPage();
  initOwnerDashboard();

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function saveCart() {
    saveJSON(STORAGE_KEY, cart);
  }

  function formatPrice(value) {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
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
      .toLowerCase();
  }

  function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
  }

  function getCurrentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function isInsidePages() {
    return location.pathname.toLowerCase().includes('/pages/');
  }

  function pageHref(page) {
    return `${isInsidePages() ? '' : 'pages/'}${page}`;
  }

  function homeHref() {
    return isInsidePages() ? '../index.html' : 'index.html';
  }

  function getLoginUrl(params = {}) {
    const query = new URLSearchParams(params).toString();
    return `${pageHref('login.html')}${query ? `?${query}` : ''}`;
  }

  function getCurrentTargetForLogin() {
    const page = getCurrentPage();
    const target = isInsidePages() ? page : page === 'index.html' ? '../index.html' : `../${page}`;
    return `${target}${location.search || ''}${location.hash || ''}`;
  }

  function hasSignedInUser() {
    return Boolean(currentUser?.email && profileComplete(currentUser));
  }

  function enforceAccountGate() {
    const isLoginPage = getCurrentPage() === 'login.html';
    if (hasSignedInUser() || isLoginPage) return false;

    localStorage.removeItem(USER_KEY);
    currentUser = null;
    window.location.replace(getLoginUrl({ redirect: getCurrentTargetForLogin() }));
    return true;
  }

  function getPaymentPageUrl() {
    return pageHref('pagamento.html');
  }

  function getOwnerWhatsApp() {
    return onlyDigits(ownerConfig.whatsapp) || DEFAULT_OWNER.whatsapp;
  }

  function cartTotal() {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }

  function cartCount() {
    return cart.reduce((count, item) => count + Number(item.quantity || 0), 0);
  }

  function profileComplete(profile = currentUser) {
    return Boolean(profile?.name && profile?.phone && profile?.address);
  }

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function applySavedTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = storedTheme || (prefersLight ? 'light' : 'dark');
    setTheme(theme, false);
  }

  function setTheme(theme, persist = true) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-mode', isLight);
    if (persist) localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
    updateThemeSettings();
  }

  function toggleTheme() {
    setTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
  }

  function updateThemeSettings() {
    const isLight = document.body.classList.contains('light-mode');
    const toggle = document.getElementById('dark-mode-toggle');
    const current = document.getElementById('theme-current');
    const preview = document.getElementById('theme-preview');

    if (toggle) {
      toggle.classList.toggle('active', !isLight);
      toggle.setAttribute('aria-pressed', String(!isLight));
    }

    if (current) current.textContent = isLight ? 'Modo claro ativado' : 'Modo escuro ativado';
    if (preview) preview.textContent = isLight ? 'Claro' : 'Noturno';
  }

  function bindThemeSettings() {
    const themeToggle = document.getElementById('dark-mode-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    updateThemeSettings();
  }

  function enhanceNavigation() {
    document.querySelectorAll('.settings-float').forEach(item => item.remove());

    const navInner = document.querySelector('.nav-inner');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (navInner && !navInner.querySelector('.nav-actions')) {
      const actions = document.createElement('div');
      actions.className = 'nav-actions';
      const accountHref = hasSignedInUser() ? pageHref('configuracoes.html') : getLoginUrl();
      actions.innerHTML = `
        <a class="nav-pill nav-account-link" href="${accountHref}" aria-label="Entrar na conta">
          <i class="fa-solid fa-user"></i>
          <span data-account-label>Entrar</span>
        </a>
        <a class="nav-icon nav-admin-link" href="${pageHref('painel.html')}" aria-label="Painel do lojista" title="Painel do lojista">
          <i class="fa-solid fa-chart-line"></i>
        </a>
        <a class="nav-icon settings-link" href="${pageHref('configuracoes.html')}" aria-label="Configurações" title="Configurações">
          <i class="fa-solid fa-gear"></i>
        </a>
      `;
      navInner.insertBefore(actions, mobileToggle || null);
    }

    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu && !mobileMenu.querySelector('[data-mobile-extra]')) {
      const accountHref = hasSignedInUser() ? pageHref('configuracoes.html') : getLoginUrl();
      mobileMenu.insertAdjacentHTML('beforeend', `
        <div class="mobile-menu-divider" data-mobile-extra></div>
        <a class="mobile-only-link nav-account-link" href="${accountHref}" data-mobile-extra><i class="fa-solid fa-user"></i> <span data-account-label>Conta</span></a>
        <a class="mobile-only-link" href="${pageHref('configuracoes.html')}" data-mobile-extra><i class="fa-solid fa-gear"></i> Configurações</a>
        <a class="mobile-only-link" href="${pageHref('painel.html')}" data-mobile-extra><i class="fa-solid fa-chart-line"></i> Painel do lojista</a>
      `);
    }

    updateAccountUI();
  }

  function updateAccountUI() {
    const signedIn = hasSignedInUser();
    document.querySelectorAll('[data-account-label]').forEach(label => {
      label.textContent = signedIn ? currentUser.name.split(' ')[0] : 'Entrar';
    });

    document.querySelectorAll('.nav-account-link').forEach(link => {
      link.href = signedIn ? pageHref('configuracoes.html') : getLoginUrl();
      link.classList.toggle('active', ['login.html', 'configuracoes.html'].includes(getCurrentPage()));
      link.setAttribute('aria-label', signedIn ? `Conta de ${currentUser.name}` : 'Entrar na conta');
    });

    document.querySelectorAll('[data-account-cta]').forEach(link => {
      link.href = signedIn ? pageHref('configuracoes.html') : getLoginUrl({ redirect: getCurrentTargetForLogin() });
      link.innerHTML = signedIn
        ? '<i class="fa-solid fa-user-gear"></i> Minha conta'
        : '<i class="fa-solid fa-user-check"></i> Entrar ou cadastrar';
    });
  }

  function bindNotificationToggles() {
    document.querySelectorAll('[data-setting-toggle]').forEach(toggle => {
      const key = `ms_setting_${toggle.dataset.settingToggle}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) toggle.classList.toggle('active', stored === 'true');

      toggle.addEventListener('click', () => {
        const active = !toggle.classList.contains('active');
        toggle.classList.toggle('active', active);
        toggle.setAttribute('aria-pressed', String(active));
        localStorage.setItem(key, String(active));
      });
    });
  }

  function bindDataActions() {
    const clearCart = document.querySelector('[data-clear-cart]');
    const clearAll = document.querySelector('[data-clear-all]');

    if (clearCart) {
      clearCart.addEventListener('click', () => {
        if (!confirm('Deseja limpar todos os itens do carrinho?')) return;
        cart = [];
        saveCart();
        renderCart();
        showToast('Carrinho limpo com sucesso.');
      });
    }

    if (clearAll) {
      clearAll.addEventListener('click', () => {
        if (!confirm('Deseja remover preferências, carrinho e dados salvos neste navegador?')) return;
        localStorage.clear();
        cart = [];
        currentUser = null;
        ownerConfig = { ...DEFAULT_OWNER };
        setTheme('dark');
        updateAccountUI();
        renderCart();
        showToast('Dados locais removidos.');
        setTimeout(() => {
          window.location.href = getLoginUrl({ redirect: getCurrentTargetForLogin() });
        }, 700);
      });
    }
  }

  function bindFeedbackForm() {
    const form = document.getElementById('feedback-form');
    if (!form) return;

    const success = document.getElementById('feedback-success');
    const resetButton = document.querySelector('[data-reset-feedback]');

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        if (success) success.classList.remove('show');
      });
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const contact = String(data.get('contact') || '').trim();
      const category = String(data.get('category') || '').trim();
      const message = String(data.get('message') || '').trim();

      if (message.length > 500) {
        alert('A sugestão precisa ter no máximo 500 caracteres.');
        return;
      }

      const text = [
        `Olá! Sou ${name}.`,
        '',
        `Categoria: ${category}`,
        `Sugestão: ${message}`,
        `Contato: ${contact}`
      ].join('\n');

      window.open(`https://wa.me/${getOwnerWhatsApp()}?text=${encodeURIComponent(text)}`, '_blank');
      if (success) success.classList.add('show');
      setTimeout(() => {
        form.reset();
        if (success) success.classList.remove('show');
      }, 1800);
    });
  }

  function bindMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!mobileToggle || !mobileMenu) return;

    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.addEventListener('click', () => {
      const expanded = !mobileMenu.classList.contains('show');
      mobileMenu.classList.toggle('show', expanded);
      mobileToggle.classList.toggle('open', expanded);
      mobileToggle.setAttribute('aria-expanded', String(expanded));
      document.body.classList.toggle('menu-open', expanded);
      mobileToggle.innerHTML = expanded
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });

    mobileMenu.addEventListener('click', event => {
      if (!event.target.closest('a')) return;
      mobileMenu.classList.remove('show');
      mobileToggle.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      mobileToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !mobileMenu.classList.contains('show')) return;
      mobileMenu.classList.remove('show');
      mobileToggle.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      mobileToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  }

  function setActiveNav() {
    const currentPage = getCurrentPage();
    document.querySelectorAll('.nav-menu a, .mobile-menu a, .footer-links a, .nav-icon').forEach(link => {
      const href = link.getAttribute('href');
      const linkPage = String(href || '').split(/[?#]/)[0].split('/').pop() || 'index.html';
      link.classList.toggle('active', linkPage === currentPage);
    });
  }

  function bindCatalogFilters() {
    const search = document.querySelector('[data-catalog-search]');
    const chips = document.querySelectorAll('[data-filter]');
    const products = document.querySelectorAll('.catalog-product');
    const empty = document.getElementById('catalog-empty');
    if (!products.length) return;

    let activeFilter = 'all';

    const applyFilters = () => {
      const term = search ? normalizeText(search.value.trim()) : '';
      let visibleCount = 0;

      products.forEach(card => {
        const haystack = normalizeText(`${card.dataset.name || ''} ${card.textContent || ''}`);
        const category = card.dataset.category || '';
        const recommended = card.dataset.recommended === 'true';
        const matchesSearch = !term || haystack.includes(term);
        const matchesFilter =
          activeFilter === 'all' ||
          category === activeFilter ||
          (activeFilter === 'recommended' && recommended);
        const visible = matchesSearch && matchesFilter;

        card.classList.toggle('hidden', !visible);
        if (visible) visibleCount += 1;
      });

      if (empty) empty.classList.toggle('hidden', visibleCount > 0);
    };

    if (search) search.addEventListener('input', applyFilters);
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter || 'all';
        chips.forEach(item => item.classList.toggle('active', item === chip));
        applyFilters();
      });
    });

    applyFilters();
  }

  function bindProductButtons() {
    document.querySelectorAll('.btn-add-cart').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('.product-card');
        const name = button.dataset.name || card?.dataset.name;
        const price = Number(button.dataset.price || 0);
        const image = button.dataset.image || card?.querySelector('.product-image')?.getAttribute('src') || '';
        if (!name || Number.isNaN(price)) return;

        addToCart({ name, price, image });

        const original = button.dataset.originalText || button.textContent;
        button.dataset.originalText = original;
        button.textContent = 'Adicionado';
        button.classList.add('is-added');
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove('is-added');
        }, 1200);
      });
    });

    document.body.addEventListener('click', event => {
      const button = event.target.closest('[data-cart-action]');
      if (!button) return;
      const index = Number(button.dataset.index);
      if (!Number.isInteger(index) || !cart[index]) return;

      const action = button.dataset.cartAction;
      if (action === 'increase') cart[index].quantity += 1;
      if (action === 'decrease') cart[index].quantity = Math.max(1, cart[index].quantity - 1);
      if (action === 'remove') cart.splice(index, 1);

      saveCart();
      renderCart();
      updatePixPanel();
    });
  }

  function bindProductRail() {
    const rail = document.querySelector('[data-product-rail]');
    if (!rail) return;

    let activeIndex = 0;
    let frameRequested = false;

    const getCards = () => [...rail.querySelectorAll('.rail-product')];

    const applyRailState = index => {
      const cards = getCards();
      if (!cards.length) return;

      activeIndex = Math.max(0, Math.min(index, cards.length - 1));
      cards.forEach((card, cardIndex) => {
        const distance = Math.abs(activeIndex - cardIndex);
        card.classList.toggle('is-center', cardIndex === activeIndex);
        card.classList.toggle('is-near', distance === 1);
        card.classList.toggle('is-left', cardIndex < activeIndex);
        card.classList.toggle('is-right', cardIndex > activeIndex);
        card.style.setProperty('--rail-distance', String(Math.min(1, distance)));
      });
    };

    const findClosestCardIndex = () => {
      const cards = getCards();
      const railRect = rail.getBoundingClientRect();
      const center = railRect.left + railRect.width / 2;
      let closestIndex = activeIndex;
      let closestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(center - cardCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    };

    const updateRailFocus = () => {
      frameRequested = false;
      applyRailState(findClosestCardIndex());
    };

    const scheduleRailUpdate = () => {
      if (frameRequested) return;
      frameRequested = true;
      window.requestAnimationFrame(updateRailFocus);
    };

    const focusCard = (index, behavior = 'smooth') => {
      const cards = getCards();
      if (!cards.length) return;
      const safeIndex = Math.max(0, Math.min(index, cards.length - 1));
      applyRailState(safeIndex);
      cards[safeIndex].scrollIntoView({ behavior, block: 'nearest', inline: 'center' });
    };

    document.querySelectorAll('[data-rail-scroll]').forEach(button => {
      button.addEventListener('click', () => {
        const direction = button.dataset.railScroll === 'prev' ? -1 : 1;
        focusCard(activeIndex + direction);
      });
    });

    rail.addEventListener('click', event => {
      const card = event.target.closest('.rail-product');
      if (!card || card.classList.contains('is-center')) return;

      event.preventDefault();
      event.stopPropagation();
      focusCard(getCards().indexOf(card));
    }, true);

    rail.addEventListener('scroll', scheduleRailUpdate, { passive: true });
    window.addEventListener('resize', () => focusCard(activeIndex, 'auto'));
    window.requestAnimationFrame(() => focusCard(0, 'auto'));
  }

  function bindTiltCards() {
    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || reducedMotion) return;

    document.querySelectorAll('.tilt-3d').forEach(card => {
      card.addEventListener('mousemove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  function addToCart(product) {
    const existing = cart.find(item => item.name === product.name);
    if (existing) {
      existing.quantity += 1;
      existing.image = existing.image || product.image;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    renderCart();
    updatePixPanel();
  }

  function ensureCartUI() {
    if (!document.querySelector('.cart-float')) {
      const float = document.createElement('button');
      float.className = 'cart-float hidden';
      float.type = 'button';
      float.setAttribute('aria-label', 'Abrir carrinho');
      float.innerHTML = '<i class="fa-solid fa-cart-shopping"></i><span class="badge">0</span>';
      document.body.appendChild(float);
      float.addEventListener('click', () => document.getElementById('cart-modal')?.classList.add('open'));
    }

    if (!document.getElementById('cart-modal')) {
      const modal = document.createElement('div');
      modal.id = 'cart-modal';
      modal.className = 'cart-modal';
      modal.innerHTML = `
        <div class="cart-modal-panel" role="dialog" aria-modal="true" aria-label="Carrinho de compras">
          <header class="cart-modal-header">
            <div>
              <span class="eyebrow">Carrinho</span>
              <h3>Seu pedido</h3>
            </div>
            <button class="icon-button cart-modal-close" type="button" aria-label="Fechar carrinho">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div id="cart-items-modal" class="cart-items"></div>
          <footer class="cart-modal-footer">
            <div class="cart-total">
              <span>Total</span>
              <strong id="cart-total-modal">R$ 0,00</strong>
            </div>
            <div class="cart-actions">
              <button class="btn btn-secondary btn-empty-cart" type="button">Esvaziar</button>
              <button class="btn btn-primary btn-checkout" type="button">Finalizar</button>
            </div>
          </footer>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', event => {
        if (event.target === modal || event.target.closest('.cart-modal-close')) modal.classList.remove('open');
      });

      modal.querySelector('.btn-empty-cart').addEventListener('click', () => {
        cart = [];
        saveCart();
        renderCart();
        updatePixPanel();
      });

      modal.querySelector('.btn-checkout').addEventListener('click', () => {
        window.location.href = getPaymentPageUrl();
      });
    }

    const pageCheckoutButton = document.querySelector('[data-page-checkout]');
    if (pageCheckoutButton) {
      pageCheckoutButton.addEventListener('click', () => {
        window.location.href = getPaymentPageUrl();
      });
    }
  }

  function renderCart() {
    const containers = new Set(document.querySelectorAll('.cart-items'));
    const total = cartTotal();
    const totalCount = cartCount();

    containers.forEach(container => {
      container.innerHTML = '';
      if (!cart.length) {
        container.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
        return;
      }

      cart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        const thumb = item.image
          ? `<img class="cart-thumb-img" src="${escapeHTML(item.image)}" alt="">`
          : `<span>${escapeHTML(String(item.name).charAt(0))}</span>`;

        row.innerHTML = `
          <div class="cart-item-left">
            <div class="cart-thumb">${thumb}</div>
            <div>
              <p class="cart-item-name">${escapeHTML(item.name)}</p>
              <small class="cart-item-price">${formatPrice(item.price)}</small>
            </div>
          </div>
          <div class="cart-item-right">
            <div class="qty-controls" aria-label="Quantidade">
              <button class="icon-button" type="button" data-cart-action="decrease" data-index="${index}" aria-label="Diminuir quantidade">-</button>
              <span class="qty">${item.quantity}</span>
              <button class="icon-button" type="button" data-cart-action="increase" data-index="${index}" aria-label="Aumentar quantidade">+</button>
            </div>
            <button class="icon-button btn-remove" type="button" data-cart-action="remove" data-index="${index}" aria-label="Remover item">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
        container.appendChild(row);
      });
    });

    document.querySelectorAll('[data-cart-count], #cart-count').forEach(item => {
      item.textContent = String(totalCount);
    });

    document.querySelectorAll('[data-cart-total], #cart-total, #cart-total-modal').forEach(item => {
      item.textContent = formatPrice(total);
    });

    document.querySelectorAll('.cart-float').forEach(button => {
      button.classList.toggle('hidden', totalCount === 0);
      const badge = button.querySelector('.badge');
      if (badge) badge.textContent = String(totalCount);
    });

    document.querySelectorAll('[data-page-checkout]').forEach(button => {
      button.classList.toggle('hidden', totalCount === 0);
    });
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getAccounts() {
    return loadJSON(ACCOUNTS_KEY, {});
  }

  function saveAccounts(accounts) {
    saveJSON(ACCOUNTS_KEY, accounts);
  }

  function hashSecret(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `local-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function userFromAccount(account) {
    return {
      provider: account.provider || 'Cadastro local',
      name: account.name,
      email: account.email,
      phone: account.phone,
      address: account.address,
      savedAt: new Date().toISOString()
    };
  }

  function finishAccountAccess(account, message = 'Conta acessada com sucesso.') {
    currentUser = userFromAccount(account);
    saveJSON(USER_KEY, currentUser);
    updateAccountUI();
    showToast(message);

    const redirect = new URLSearchParams(location.search).get('redirect');
    window.location.href = redirect || homeHref();
  }

  function bindAccountSettings() {
    const accountCurrent = document.getElementById('settings-account-current');
    const logoutButtons = document.querySelectorAll('[data-logout-account]');
    const switchButtons = document.querySelectorAll('[data-switch-account]');
    if (!accountCurrent && !logoutButtons.length && !switchButtons.length) return;

    if (accountCurrent) {
      accountCurrent.textContent = hasSignedInUser()
        ? `${currentUser.name} - ${currentUser.email}`
        : 'Nenhuma conta conectada';
    }

    logoutButtons.forEach(button => {
      button.addEventListener('click', () => {
        localStorage.removeItem(USER_KEY);
        currentUser = null;
        updateAccountUI();
        showToast('Você saiu da conta.');
        window.location.href = getLoginUrl({ redirect: getCurrentTargetForLogin() });
      });
    });

    switchButtons.forEach(button => {
      button.addEventListener('click', () => {
        window.location.href = getLoginUrl({ switch: '1', redirect: getCurrentTargetForLogin() });
      });
    });
  }

  function bindAccountPage() {
    const form = document.getElementById('account-form');
    if (!form) return;

    const status = document.getElementById('account-status');
    const logout = document.getElementById('logout-account');
    const modeButtons = document.querySelectorAll('[data-auth-mode]');
    const submitLabel = document.querySelector('[data-auth-submit-label]');
    const params = new URLSearchParams(location.search);
    const switchingAccount = params.get('switch') === '1';
    let mode = 'login';

    const fields = {
      name: document.getElementById('login-name'),
      email: document.getElementById('login-email'),
      phone: document.getElementById('login-phone'),
      address: document.getElementById('login-address'),
      password: document.getElementById('login-password'),
      confirm: document.getElementById('login-password-confirm')
    };

    const setMode = nextMode => {
      mode = nextMode === 'register' ? 'register' : 'login';
      form.dataset.authMode = mode;

      document.querySelectorAll('[data-register-only]').forEach(item => {
        item.classList.toggle('hidden', mode !== 'register');
      });

      modeButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.authMode === mode);
      });

      if (submitLabel) submitLabel.textContent = mode === 'register' ? 'Criar conta' : 'Entrar';
      if (logout) logout.classList.toggle('hidden', !hasSignedInUser());
      if (status && !hasSignedInUser()) {
        status.textContent = mode === 'register'
          ? 'Crie sua conta uma vez para salvar nome, WhatsApp e endereço de entrega.'
          : 'Entre com o email e senha cadastrados para continuar comprando.';
      }
    };

    if (hasSignedInUser()) {
      fields.name.value = currentUser.name || '';
      fields.email.value = currentUser.email || '';
      fields.phone.value = currentUser.phone || '';
      fields.address.value = currentUser.address || '';
      if (status) status.textContent = `Conta ativa: ${currentUser.name}. Você já pode comprar sem refazer o login.`;
      if (!switchingAccount) {
        setTimeout(() => {
          window.location.href = params.get('redirect') || homeHref();
        }, 700);
      }
    }

    modeButtons.forEach(button => {
      button.addEventListener('click', () => setMode(button.dataset.authMode));
    });

    form.addEventListener('submit', event => {
      event.preventDefault();

      const email = normalizeEmail(fields.email.value);
      const password = fields.password.value;
      if (!email || !password) {
        alert('Preencha email e senha para continuar.');
        return;
      }

      const accounts = getAccounts();

      if (mode === 'login') {
        const account = accounts[email];
        if (!account || account.passwordHash !== hashSecret(password)) {
          alert('Email ou senha não encontrados. Confira os dados ou crie uma conta.');
          return;
        }
        finishAccountAccess(account, 'Login feito com sucesso.');
        return;
      }

      const newAccount = {
        provider: 'Cadastro local',
        name: fields.name.value.trim(),
        email,
        phone: fields.phone.value.trim(),
        address: fields.address.value.trim(),
        passwordHash: hashSecret(password),
        createdAt: new Date().toISOString()
      };

      if (!profileComplete(newAccount)) {
        alert('Preencha nome, telefone e endereço para criar sua conta.');
        return;
      }

      if (password.length < 6) {
        alert('Use uma senha com pelo menos 6 caracteres.');
        return;
      }

      if (fields.confirm.value !== password) {
        alert('A confirmação de senha precisa ser igual à senha.');
        return;
      }

      if (accounts[email] && !confirm('Já existe uma conta com este email. Deseja atualizar os dados salvos?')) return;

      accounts[email] = newAccount;
      saveAccounts(accounts);
      finishAccountAccess(newAccount, 'Conta criada com sucesso.');
    });

    if (logout) {
      logout.addEventListener('click', () => {
        localStorage.removeItem(USER_KEY);
        currentUser = null;
        form.reset();
        setMode('login');
        updateAccountUI();
        if (status) status.textContent = 'Conta removida deste navegador.';
        showToast('Você saiu da conta local.');
      });
    }

    setMode(switchingAccount ? 'login' : mode);
  }
  function initPaymentPage() {
    const summary = document.getElementById('payment-summary');
    if (!summary) return;

    const empty = document.getElementById('payment-empty');
    const form = document.getElementById('payment-form');
    const accountText = document.getElementById('checkout-account-text');
    const accountCard = document.getElementById('checkout-account-card');
    const accountLoginLink = accountCard?.querySelector('a[href="login.html"]');
    const editCustomer = document.getElementById('checkout-edit-customer');
    const confirmButton = document.getElementById('payment-confirm');
    const copyPix = document.getElementById('copy-pix');
    const cardNumber = document.getElementById('card-number');
    const cardExpiry = document.getElementById('card-expiry');

    const renderPaymentSummary = () => {
      summary.innerHTML = '';

      if (!cart.length) {
        if (empty) empty.classList.remove('hidden');
        if (form) form.classList.add('hidden');
        if (accountCard) accountCard.classList.add('hidden');
        return;
      }

      if (empty) empty.classList.add('hidden');
      if (form) form.classList.remove('hidden');
      if (accountCard) accountCard.classList.remove('hidden');

      const items = document.createElement('div');
      items.className = 'payment-items';
      cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'payment-item';
        row.innerHTML = `<span>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</span><strong>${formatPrice(item.price * item.quantity)}</strong>`;
        items.appendChild(row);
      });

      const totalRow = document.createElement('div');
      totalRow.className = 'payment-total';
      totalRow.innerHTML = `<span>Total</span><strong>${formatPrice(cartTotal())}</strong>`;

      summary.appendChild(items);
      summary.appendChild(totalRow);
    };

    const applyCustomerProfile = () => {
      currentUser = loadJSON(USER_KEY, null);
      const nameInput = document.getElementById('payment-name');
      const phoneInput = document.getElementById('payment-phone');
      const addressInput = document.getElementById('payment-address');

      if (profileComplete()) {
        nameInput.value = currentUser.name || '';
        phoneInput.value = currentUser.phone || '';
        addressInput.value = currentUser.address || '';
        form.classList.add('profile-ready');
        if (editCustomer) editCustomer.classList.remove('hidden');
        if (accountText) {
          accountText.textContent = `Usando dados salvos de ${currentUser.name}: ${currentUser.address}.`;
        }
        if (accountLoginLink) {
          accountLoginLink.href = getLoginUrl({ switch: '1', redirect: getCurrentTargetForLogin() });
          accountLoginLink.innerHTML = '<i class="fa-solid fa-user-gear"></i> Trocar conta';
        }
      } else {
        form.classList.remove('profile-ready');
        if (editCustomer) editCustomer.classList.add('hidden');
        if (accountText) accountText.textContent = 'Entre ou crie uma conta para não preencher tudo novamente.';
        if (accountLoginLink) {
          accountLoginLink.href = getLoginUrl({ redirect: getCurrentTargetForLogin() });
          accountLoginLink.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
        }
      }
    };

    document.querySelectorAll('[data-payment-option]').forEach(button => {
      button.addEventListener('click', () => setPaymentOption(button.dataset.paymentOption));
    });

    if (editCustomer) {
      editCustomer.addEventListener('click', () => {
        form.classList.remove('profile-ready');
        editCustomer.classList.add('hidden');
        showToast('Dados liberados para edição neste pedido.');
      });
    }

    if (copyPix) {
      copyPix.addEventListener('click', async () => {
        const code = document.getElementById('pix-code')?.value || '';
        if (!code.trim()) return;
        try {
          await navigator.clipboard.writeText(code);
          showToast('Código Pix copiado.');
        } catch (error) {
          document.getElementById('pix-code')?.select();
          showToast('Selecione e copie o código Pix.');
        }
      });
    }

    if (cardNumber) {
      cardNumber.addEventListener('input', () => {
        cardNumber.value = cardNumber.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
        const preview = document.getElementById('card-preview-number');
        if (preview) preview.textContent = cardNumber.value || '•••• •••• •••• ••••';
      });
    }

    if (cardExpiry) {
      cardExpiry.addEventListener('input', () => {
        const clean = cardExpiry.value.replace(/\D/g, '').slice(0, 4);
        cardExpiry.value = clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
      });
    }

    if (confirmButton) confirmButton.addEventListener('click', finalizeOrder);

    renderPaymentSummary();
    applyCustomerProfile();
    setPaymentOption('pix');
  }

  function setPaymentOption(method) {
    activePayment = method || 'pix';

    document.querySelectorAll('[data-payment-option]').forEach(button => {
      button.classList.toggle('active', button.dataset.paymentOption === activePayment);
    });

    document.querySelectorAll('[data-payment-panel]').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.paymentPanel === activePayment);
    });

    const confirmButton = document.getElementById('payment-confirm');
    if (confirmButton) {
      const labels = {
        pix: '<i class="fa-solid fa-qrcode"></i> Confirmar pedido com Pix',
        card: '<i class="fa-solid fa-lock"></i> Pagar com cartão',
        delivery: '<i class="fa-solid fa-truck-fast"></i> Finalizar para entrega',
        whatsapp: '<i class="fa-brands fa-whatsapp"></i> Enviar pelo WhatsApp'
      };
      confirmButton.innerHTML = labels[activePayment] || labels.pix;
    }

    updatePixPanel();
  }

  function updatePixPanel() {
    const code = document.getElementById('pix-code');
    const qr = document.getElementById('pix-qr');
    const status = document.getElementById('pix-status');
    if (!code || !qr || !status) return;

    if (!cart.length) {
      code.value = '';
      qr.removeAttribute('src');
      status.textContent = 'Adicione produtos ao carrinho para gerar o Pix.';
      return;
    }

    if (!ownerConfig.pixKey) {
      const setupText = 'Configure a chave Pix no Painel do Lojista antes de publicar o site.';
      code.value = setupText;
      qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(setupText)}`;
      status.textContent = 'Pix ainda sem chave configurada. O QR Code abaixo é apenas informativo.';
      return;
    }

    const payload = buildPixPayload(cartTotal(), `MS${Date.now().toString().slice(-8)}`);
    code.value = payload;
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(payload)}`;
    status.textContent = `QR Code gerado para ${formatPrice(cartTotal())}.`;
  }

  function collectCustomerFromCheckout() {
    const form = document.getElementById('payment-form');
    const profileReady = form?.classList.contains('profile-ready') && profileComplete();
    const customer = profileReady
      ? {
          name: currentUser.name,
          phone: currentUser.phone,
          address: currentUser.address,
          email: currentUser.email || '',
          note: document.getElementById('payment-note')?.value.trim() || ''
        }
      : {
          name: document.getElementById('payment-name')?.value.trim() || '',
          phone: document.getElementById('payment-phone')?.value.trim() || '',
          address: document.getElementById('payment-address')?.value.trim() || '',
          email: currentUser?.email || '',
          note: document.getElementById('payment-note')?.value.trim() || ''
        };

    if (!customer.name || !customer.phone || !customer.address) {
      alert('Preencha nome, telefone e endereço para continuar.');
      return null;
    }

    return customer;
  }

  function getPaymentLabel() {
    if (activePayment === 'pix') return 'Pix pelo site';
    if (activePayment === 'card') return 'Cartão pelo site (aguardando gateway)';
    if (activePayment === 'whatsapp') return 'Combinar no WhatsApp';
    const checked = document.querySelector('input[name="delivery-payment"]:checked');
    return checked?.value || 'Pagar na entrega';
  }

  function validateCardFields() {
    const number = onlyDigits(document.getElementById('card-number')?.value || '');
    const name = document.getElementById('card-name')?.value.trim() || '';
    const expiry = document.getElementById('card-expiry')?.value.trim() || '';
    const cvv = onlyDigits(document.getElementById('card-cvv')?.value || '');

    if (number.length < 13 || !name || expiry.length < 5 || cvv.length < 3) {
      alert('Preencha os dados do cartão para continuar. A cobrança real depende de um gateway integrado.');
      return false;
    }

    return true;
  }

  function finalizeOrder() {
    if (!cart.length) {
      alert('Adicione produtos ao carrinho antes de finalizar.');
      return;
    }

    const customer = collectCustomerFromCheckout();
    if (!customer) return;

    if (activePayment === 'pix' && !ownerConfig.pixKey) {
      alert('Configure sua chave Pix no Painel do Lojista para gerar um QR Code real.');
      return;
    }

    if (activePayment === 'card' && !validateCardFields()) return;

    const order = {
      id: createOrderId(),
      createdAt: new Date().toISOString(),
      customer,
      items: cart.map(item => ({ ...item })),
      total: cartTotal(),
      payment: getPaymentLabel(),
      status: activePayment === 'card' ? 'Aguardando gateway de pagamento' : 'Pedido enviado',
      channel: activePayment
    };

    saveOrder(order);
    notifyLocal(order);
    openOrderWhatsApp(order);

    cart = [];
    saveCart();
    renderCart();

    const summary = document.getElementById('payment-summary');
    const form = document.getElementById('payment-form');
    const accountCard = document.getElementById('checkout-account-card');
    const empty = document.getElementById('payment-empty');
    if (empty) empty.classList.add('hidden');
    if (form) form.classList.add('hidden');
    if (accountCard) accountCard.classList.add('hidden');
    if (summary) {
      summary.innerHTML = `
        <div class="checkout-success">
          <span class="eyebrow">Pedido registrado</span>
          <h3>Pedido ${escapeHTML(order.id)} enviado</h3>
          <p>A Monte Sinai recebeu a mensagem no WhatsApp. Se o navegador não abriu automaticamente, use o botão abaixo.</p>
          <a class="btn btn-primary" href="https://wa.me/${getOwnerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
            Reenviar pelo WhatsApp
          </a>
          <a class="btn btn-secondary" href="produtos.html#todos-produtos">Comprar mais</a>
        </div>
      `;
    }

    showToast('Pedido finalizado.');
  }

  function createOrderId() {
    const stamp = new Date();
    const date = stamp.toISOString().slice(2, 10).replaceAll('-', '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MS-${date}-${random}`;
  }

  function saveOrder(order) {
    const orders = loadJSON(ORDERS_KEY, []);
    orders.unshift(order);
    saveJSON(ORDERS_KEY, orders.slice(0, 80));
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
      lines.push(`- ${item.quantity} x ${item.name} = ${formatPrice(item.price * item.quantity)}`);
    });

    lines.push('', `*Total:* ${formatPrice(order.total)}`);
    if (order.customer.note) lines.push(`Observações: ${order.customer.note}`);
    return lines.join('\n');
  }

  function openOrderWhatsApp(order) {
    window.open(`https://wa.me/${getOwnerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}`, '_blank');
  }

  function notifyLocal(order) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification('Novo pedido Monte Sinai', {
      body: `${order.customer.name} - ${formatPrice(order.total)}`
    });
  }

  function pixField(id, value) {
    const text = String(value ?? '');
    return `${id}${String(text.length).padStart(2, '0')}${text}`;
  }

  function sanitizePixText(value, maxLength) {
    return normalizeText(value)
      .toUpperCase()
      .replace(/[^A-Z0-9 .-]/g, '')
      .slice(0, maxLength);
  }

  function buildPixPayload(amount, txid) {
    const merchantName = sanitizePixText(ownerConfig.merchantName || DEFAULT_OWNER.merchantName, 25);
    const merchantCity = sanitizePixText(ownerConfig.merchantCity || DEFAULT_OWNER.merchantCity, 15);
    const tx = sanitizePixText(txid || 'MONTE', 25);
    const merchantAccount = pixField('00', 'br.gov.bcb.pix') + pixField('01', ownerConfig.pixKey) + pixField('02', 'PEDIDO MONTE SINAI');
    const additional = pixField('05', tx);
    const payloadWithoutCRC =
      pixField('00', '01') +
      pixField('26', merchantAccount) +
      pixField('52', '0000') +
      pixField('53', '986') +
      pixField('54', Number(amount).toFixed(2)) +
      pixField('58', 'BR') +
      pixField('59', merchantName) +
      pixField('60', merchantCity) +
      pixField('62', additional) +
      '6304';

    return payloadWithoutCRC + crc16(payloadWithoutCRC);
  }

  function crc16(payload) {
    let crc = 0xffff;
    for (let index = 0; index < payload.length; index += 1) {
      crc ^= payload.charCodeAt(index) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function initOwnerDashboard() {
    const form = document.getElementById('owner-config-form');
    const ordersList = document.getElementById('orders-list');
    if (!form && !ordersList) return;

    const fields = {
      whatsapp: document.getElementById('owner-whatsapp'),
      pixKey: document.getElementById('owner-pix-key'),
      merchantName: document.getElementById('owner-merchant-name'),
      merchantCity: document.getElementById('owner-merchant-city')
    };

    if (fields.whatsapp) fields.whatsapp.value = ownerConfig.whatsapp || '';
    if (fields.pixKey) fields.pixKey.value = ownerConfig.pixKey || '';
    if (fields.merchantName) fields.merchantName.value = ownerConfig.merchantName || '';
    if (fields.merchantCity) fields.merchantCity.value = ownerConfig.merchantCity || '';

    if (form) {
      form.addEventListener('submit', event => {
        event.preventDefault();
        ownerConfig = {
          whatsapp: fields.whatsapp.value.trim() || DEFAULT_OWNER.whatsapp,
          pixKey: fields.pixKey.value.trim(),
          merchantName: fields.merchantName.value.trim() || DEFAULT_OWNER.merchantName,
          merchantCity: fields.merchantCity.value.trim() || DEFAULT_OWNER.merchantCity,
          savedAt: new Date().toISOString()
        };
        saveJSON(OWNER_KEY, ownerConfig);
        showToast('Configuração salva neste navegador.');
        updatePixPanel();
      });
    }

    const requestNotification = document.getElementById('request-notification');
    if (requestNotification) {
      requestNotification.addEventListener('click', async () => {
        if (!('Notification' in window)) {
          showToast('Este navegador não suporta notificações locais.');
          return;
        }
        const result = await Notification.requestPermission();
        showToast(result === 'granted' ? 'Notificações locais ativadas.' : 'Notificações não autorizadas.');
      });
    }

    const exportOrders = document.getElementById('export-orders');
    if (exportOrders) {
      exportOrders.addEventListener('click', () => {
        const orders = loadJSON(ORDERS_KEY, []);
        const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pedidos-monte-sinai-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
      });
    }

    const clearOrders = document.getElementById('clear-orders');
    if (clearOrders) {
      clearOrders.addEventListener('click', () => {
        if (!confirm('Deseja limpar os pedidos salvos neste navegador?')) return;
        saveJSON(ORDERS_KEY, []);
        renderOwnerDashboard();
        showToast('Pedidos locais removidos.');
      });
    }

    document.body.addEventListener('click', event => {
      const button = event.target.closest('[data-order-whatsapp]');
      if (!button) return;
      const orders = loadJSON(ORDERS_KEY, []);
      const order = orders.find(item => item.id === button.dataset.orderWhatsapp);
      if (order) openOrderWhatsApp(order);
    });

    renderOwnerDashboard();
  }

  function renderOwnerDashboard() {
    const orders = loadJSON(ORDERS_KEY, []);
    const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const count = document.getElementById('dash-orders-count');
    const totalEl = document.getElementById('dash-orders-total');
    const last = document.getElementById('dash-last-order');
    const list = document.getElementById('orders-list');

    if (count) count.textContent = String(orders.length);
    if (totalEl) totalEl.textContent = formatPrice(total);
    if (last) last.textContent = orders[0]?.id || 'Nenhum';

    if (!list) return;
    list.innerHTML = '';

    if (!orders.length) {
      list.innerHTML = '<p class="empty-cart">Nenhum pedido salvo neste navegador ainda.</p>';
      return;
    }

    orders.forEach(order => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const items = order.items.map(item => `<li>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</li>`).join('');
      card.innerHTML = `
        <header>
          <strong>${escapeHTML(order.id)}</strong>
          <span class="badge">${escapeHTML(order.status)}</span>
        </header>
        <p>${escapeHTML(order.customer.name)} - ${escapeHTML(order.customer.phone)}</p>
        <p>${escapeHTML(order.customer.address)}</p>
        <ul>${items}</ul>
        <footer>
          <strong>${formatPrice(order.total)}</strong>
          <button class="btn btn-secondary" type="button" data-order-whatsapp="${escapeHTML(order.id)}">
            <i class="fa-brands fa-whatsapp"></i>
            Abrir WhatsApp
          </button>
        </footer>
      `;
      list.appendChild(card);
    });
  }
});
