document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const STORAGE = {
    cart: 'ms_cart_v2',
    legacyCart: 'ms_cart_v1',
    user: 'ms_customer_v2',
    orders: 'ms_orders_v1',
    coupon: 'ms_coupon_v1',
    owner: 'ms_owner_config_v1',
    site: 'ms_site_config_v1',
    theme: 'ms_theme_v2',
    legacyTheme: 'ms_theme_v1',
    installPromptDismissed: 'ms_install_prompt_dismissed_v1',
    appInstalled: 'ms_app_installed_v1',
    profiles: 'ms_saved_profiles_v1',
    pendingProfile: 'ms_pending_profile_email_v1',
    pendingProfileSavePassword: 'ms_pending_profile_save_password_v1',
    authSessions: 'ms_saved_auth_sessions_v1',
  };

  const THEME_MODES = ['system', 'light', 'dark'];

  const DEFAULT_OWNER = {
    whatsapp: '5511960928234',
    altWhatsapp: '5511982690871',
    merchantName: 'MONTE SINAI',
    merchantCity: 'SAO PAULO',
    pixKey: '',
    deliveryFee: 3,
    freeShippingFrom: 50,
    giftText: 'Compra de gás',
  };

  const DEFAULT_SITE_CONFIG = {
    storeName: 'Monte Sinai',
    footerDescription: 'Água, gás e produtos de limpeza para sua casa.',
    logoUrl: 'assets/brand/v2/monte-sinai-logo-v2.png',
    accentColor: '#008cff',
    heroEyebrow: 'Entrega rápida, segura e local',
    heroTitle: 'Monte Sinai leva água, gás e produtos de limpeza até você.',
    heroText:
      'Escolha os produtos, monte o carrinho, entre com sua conta e finalize com pagamento na entrega ou atendimento pelo WhatsApp.',
    heroButton: 'Comprar agora',
    heroImage: 'assets/hero/v2/hero-site-3d-v2.png',
    announcementActive: false,
    announcement: 'Entrega rápida hoje para água, gás e limpeza.',
    catalogTitle: 'Essenciais para abastecer e cuidar da casa',
    showcaseTitle: 'Role pelas laterais e escolha seus produtos',
    storefrontTitle: 'Atalhos para resolver a casa em poucos toques',
    stockAlertThreshold: 3,
    servedNeighborhoods: ['Centro', 'Jardim Monte Sinai', 'Vila Sao Jose'],
    coupons: [],
    copyright: '© 2026 Monte Sinai. Todos os direitos reservados.',
  };

  const DELIVERY_FEE = 3;
  const FREE_SHIPPING_FROM = 50;
  const SITE_CONFIG_TABLE = 'site_configuracoes';
  let productIndex = [];
  const CATALOG_CATEGORY_ORDER = [
    'agua',
    'gas',
    'limpeza',
    'lavanderia',
    'higiene',
    'banheiro',
    'cozinha',
    'utensilios',
    'organizacao',
    'limpeza-pesada',
  ];
  const PUBLIC_CATEGORY_FILTERS = [
    ['agua', 'Água'],
    ['gas', 'Gás'],
    ['limpeza', 'Limpeza'],
    ['lavanderia', 'Lavanderia'],
    ['higiene', 'Higiene'],
    ['banheiro', 'Banheiro'],
    ['cozinha', 'Cozinha'],
    ['utensilios', 'Utensílios'],
    ['organizacao', 'Organização'],
    ['limpeza-pesada', 'Limpeza pesada'],
  ];
  const CATALOG_SECTION_META = {
    recommended: {
      eyebrow: 'Recomendados',
      title: 'Água e gás mais pedidos',
    },
    agua: {
      eyebrow: 'Água mineral',
      title: 'Galões para abastecer sua casa',
    },
    gas: {
      eyebrow: 'Gás de cozinha',
      title: 'Botijões para sua cozinha',
    },
    limpeza: {
      eyebrow: 'Líquidos e químicos',
      title: 'Produtos de limpeza',
    },
    lavanderia: {
      eyebrow: 'Cuidado das roupas',
      title: 'Lavanderia',
    },
    higiene: {
      eyebrow: 'Cuidado pessoal',
      title: 'Higiene',
    },
    banheiro: {
      eyebrow: 'Banheiro',
      title: 'Itens para banheiro',
    },
    cozinha: {
      eyebrow: 'Cozinha',
      title: 'Louças, pia e fogão',
    },
    utensilios: {
      eyebrow: 'Utensílios e acessórios',
      title: 'Itens para limpeza e organização',
    },
    organizacao: {
      eyebrow: 'Organização',
      title: 'Apoio para o dia a dia',
    },
  };
  const CATALOG_VARIANT_ORDER = {
    'gas-de-cozinha-p13': ['Supergas', 'Ultragas'],
    'desinfetante-2l': ['Kaialque', 'Violeta', 'Eucalipto', 'Pinho', 'Jasmim', 'Talco', 'Dama da Noite', 'Palmolive'],
  };
  const ORDER_STATUS_OPTIONS = ['Recebido', 'Preparando', 'Saiu para entrega', 'Entregue', 'Cancelado'];
  const PAYMENT_STATUS_OPTIONS = ['Pendente', 'Pago', 'Cancelado'];
  // Emergency fallback mapping for admin emails. Do NOT rely on this in production.
  const FALLBACK_ADMIN_EMAILS = (window && window.__FALLBACK_ADMIN_EMAILS__) || {};
  function getFallbackRoleForEmail(email = '') {
    try {
      return String(FALLBACK_ADMIN_EMAILS[(email || '').toLowerCase()] || '').trim();
    } catch (e) {
      return '';
    }
  }
  const PRODUCT_IMAGE_BUCKET = 'produtos';
  const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
  const ADMIN_PANEL_HREF = '/pages/painel.html';
  const PRODUCT_BASE_SELECT = 'id, nome, preco, imagem, categoria, descricao, ativo, estoque, estoque_minimo, created_at, updated_at';
  const PRODUCT_EXTENDED_SELECT = `${PRODUCT_BASE_SELECT}, tipo, destaque, oferta_ativa, preco_promocional, oferta_inicio, oferta_fim, kit_itens, catalogo_visivel, loja_visivel, catalogo_ordem, descricao_detalhada, catalogo_destaque`;
  const PUBLIC_PRODUCT_VIEW = 'vw_catalogo_publico';
  const PUBLIC_PRODUCT_VARIATION_VIEW = 'vw_catalogo_variacoes_publicas';
  const PUBLIC_PRODUCT_SELECT =
    'id, nome, preco, preco_original, imagem, categoria, descricao, tipo, destaque, oferta_ativa, preco_promocional, oferta_inicio, oferta_fim, kit_itens, catalogo_ordem, descricao_detalhada, catalogo_destaque, pode_comprar, indisponivel, created_at, updated_at';
  const PUBLIC_PRODUCT_VARIATION_SELECT =
    'id, produto_id, nome, slug, sku, preco, preco_original, imagem, atributos, ordem, preco_promocional, oferta_ativa, oferta_inicio, oferta_fim, pode_comprar, indisponivel, created_at, updated_at';
  const PRODUCT_VARIATION_SELECT =
    'id, produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem, preco_promocional, oferta_ativa, oferta_inicio, oferta_fim, estoque_minimo, created_at, updated_at';
  const PRODUCT_VARIATION_BASIC_SELECT =
    'id, produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem, created_at, updated_at';
  const ADMIN_ORDER_POLL_MS = 25000;
  const ORDER_NOTIFICATION_SELECT =
    'id, pedido_id, user_id, cliente_email, cliente_telefone, titulo, mensagem, tipo, lida, created_at';
  const SEARCH_EXPANSIONS = {
    ada: 'agua mineral galao garrafao bebedouro',
    agau: 'agua mineral galao garrafao bebedouro',
    auga: 'agua mineral galao garrafao bebedouro',
    agua: 'agua mineral galao garrafao bebedouro',
    alcol: 'alcool perfumado higienizacao limpeza perfume',
    alcool: 'alcool perfumado higienizacao limpeza perfume',
    gaz: 'gas botijao cozinha p13 supergas ultragas fogao',
    gas: 'gas botijao cozinha p13 supergas ultragas fogao',
    detegente: 'detergente louca pia cozinha gordura',
    deterg: 'detergente louca pia cozinha gordura',
    candid: 'candida agua sanitaria cloro limpeza pesada',
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
    sanitario: 'vaso banheiro escova pedra desinfetante',
  };
  const SMART_SEARCH_CHIPS = [
    { label: 'Limpar banheiro', query: 'banheiro' },
    { label: 'Lavar roupa', query: 'roupa' },
    { label: 'Cozinha e louça', query: 'cozinha' },
    { label: 'Quintal e piso', query: 'quintal' },
    { label: 'Cheiro bom', query: 'cheiro' },
    { label: 'Água mineral', query: 'água' },
    { label: 'Gás de cozinha', query: 'gás' },
    { label: 'Tirar gordura', query: 'gordura' },
  ];

  let cart = loadCart();
  let appliedCoupon = loadJSON(STORAGE.coupon, null);
  let currentUser = loadJSON(STORAGE.user, null);
  if (currentUser?.provider !== 'Supabase Auth') currentUser = null;
  let ownerConfig = { ...DEFAULT_OWNER, ...loadJSON(STORAGE.owner, {}) };
  let siteConfig = { ...DEFAULT_SITE_CONFIG, ...loadJSON(STORAGE.site, {}) };
  let remoteOrdersCache = [];
  let remoteOrdersLoaded = false;
  let adminProductsCache = [];
  let adminProductsSource = 'supabase';
  let adminProductSaving = false;
  const adminProductActionLocks = new Set();
  let localCatalogProductsCache = null;
  let adminProfileCache = null;
  let productExtendedColumnsReady = true;
  let orderExtendedColumnsReady = true;
  let activePayment = 'delivery';
  let lastLowStockSignature = '';
  let activeSearchProduct = null;
  let productSearchResults = [];
  let activeSearchSuggestionContext = null;
  let searchSuggestionFrame = 0;
  let lockedPageScrollY = 0;
  let deferredInstallPrompt = null;
  let installPromptVisible = false;
  let adminOrderPollTimer = null;
  let adminRealtimeChannel = null;
  let customerOrdersRealtimeChannel = null;
  let adminOrderAlertsStarted = false;
  let orderNotificationsCache = [];
  let orderNotificationsReady = true;
  let ordersPageAdminMode = false;

  applySavedTheme();
  applySiteConfig();
  const authReady = initSupabaseAuth();
  initSiteConfig();
  upgradeProductImages();
  clearPublicProductShell();
  enhanceNavigation();
  bindProfilePhotoPreview();
  applySiteConfig();
  bindMobileMenu();
  setActiveNavigation();
  bindSiteSearch();
  bindCatalog();
  bindFullCatalogPage();
  bindProductCards();
  bindProductRail();
  ensureCartShell();
  ensureSmartSearchShell();
  ensureProductSearchModalShell();
  bindCartActions();
  bindDataCleanupActions();
  bindSmartSearchPanel();
  renderCart();
  bindAccountPage();
  initPaymentPage();
  initProfilePage();
  initOrdersPage();
  initProfileEditPage();
  initSettingsPage();
  initOwnerDashboard();
  bindSubtleAnimations();
  loadProductsFromSupabase();
  optimizeImageLoading();
  initInstallPrompt();
  initAdminOrderAlerts();
  registerServiceWorker();

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
      showToast('Não foi possível salvar. Tente remover a foto ou usar uma imagem menor.');
      return false;
    }
  }

  function cleanConfigText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function cleanColor(value, fallback = DEFAULT_SITE_CONFIG.accentColor) {
    const color = String(value ?? '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }

  function uniqueCleanList(values = []) {
    const source = Array.isArray(values) ? values : String(values ?? '').split(/\r?\n|,/);
    const seen = new Set();
    return source
      .map((value) => String(value ?? '').trim())
      .filter((value) => {
        const key = normalizeText(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizeNeighborhoods(value) {
    const list = uniqueCleanList(value);
    return list.length ? list : [...DEFAULT_SITE_CONFIG.servedNeighborhoods];
  }

  function normalizeCoupon(raw = {}) {
    let source = raw;
    if (typeof raw === 'string') {
      const parts = raw.split(/[|;]/).map((part) => part.trim());
      const valueText = parts[1] || '';
      source = {
        code: parts[0],
        value: parsePrice(valueText),
        type: valueText.includes('%') ? 'percent' : 'fixed',
        minSubtotal: parsePrice(parts[2] || 0),
        label: parts[3] || '',
      };
    }

    const code = normalizeText(source.code || '')
      .replace(/[^a-z0-9]+/g, '')
      .toUpperCase();
    const type = source.type === 'fixed' ? 'fixed' : 'percent';
    const value = parsePrice(source.value);
    const minSubtotal = parsePrice(source.minSubtotal ?? source.min ?? 0);
    if (!code || value <= 0) return null;

    return {
      code,
      type,
      value: type === 'percent' ? Math.min(100, value) : value,
      minSubtotal,
      label: cleanConfigText(
        source.label,
        type === 'percent' ? `${value}% de desconto` : `${formatMoney(value)} de desconto`,
      ),
      active: source.active !== false,
    };
  }

  function normalizeCoupons(value) {
    const source = Array.isArray(value)
      ? value
      : String(value ?? '')
          .split(/\r?\n/)
          .filter(Boolean);
    const seen = new Set();
    return source.map(normalizeCoupon).filter((coupon) => {
      if (!coupon || seen.has(coupon.code)) return false;
      seen.add(coupon.code);
      return true;
    });
  }

  function couponLinesFromCoupons(coupons = []) {
    return coupons
      .map((coupon) => {
        const value = coupon.type === 'percent' ? `${coupon.value}%` : String(coupon.value);
        return [coupon.code, value, coupon.minSubtotal || 0, coupon.label || ''].join(' | ');
      })
      .join('\n');
  }

  function normalizedOwnerConfig(raw = {}) {
    return {
      ...DEFAULT_OWNER,
      ...raw,
      whatsapp: cleanConfigText(raw.whatsapp, DEFAULT_OWNER.whatsapp),
      altWhatsapp: cleanConfigText(raw.altWhatsapp, DEFAULT_OWNER.altWhatsapp),
      merchantName: cleanConfigText(raw.merchantName, DEFAULT_OWNER.merchantName).slice(0, 25),
      merchantCity: cleanConfigText(raw.merchantCity, DEFAULT_OWNER.merchantCity).slice(0, 15),
      pixKey: cleanConfigText(raw.pixKey, ''),
      deliveryFee: parsePrice(raw.deliveryFee ?? DEFAULT_OWNER.deliveryFee),
      freeShippingFrom: parsePrice(raw.freeShippingFrom ?? DEFAULT_OWNER.freeShippingFrom),
      giftText: cleanConfigText(raw.giftText, DEFAULT_OWNER.giftText),
    };
  }

  function normalizedSiteConfig(raw = {}) {
    return {
      ...DEFAULT_SITE_CONFIG,
      ...raw,
      storeName: cleanConfigText(raw.storeName, DEFAULT_SITE_CONFIG.storeName),
      footerDescription: cleanConfigText(raw.footerDescription, DEFAULT_SITE_CONFIG.footerDescription),
      logoUrl: cleanConfigText(raw.logoUrl, DEFAULT_SITE_CONFIG.logoUrl),
      accentColor: cleanColor(raw.accentColor),
      heroEyebrow: cleanConfigText(raw.heroEyebrow, DEFAULT_SITE_CONFIG.heroEyebrow),
      heroTitle: cleanConfigText(raw.heroTitle, DEFAULT_SITE_CONFIG.heroTitle),
      heroText: cleanConfigText(raw.heroText, DEFAULT_SITE_CONFIG.heroText),
      heroButton: cleanConfigText(raw.heroButton, DEFAULT_SITE_CONFIG.heroButton),
      heroImage: cleanConfigText(raw.heroImage, DEFAULT_SITE_CONFIG.heroImage),
      announcementActive: raw.announcementActive === true || raw.announcementActive === 'true',
      announcement: cleanConfigText(raw.announcement, DEFAULT_SITE_CONFIG.announcement),
      catalogTitle: cleanConfigText(raw.catalogTitle, DEFAULT_SITE_CONFIG.catalogTitle),
      showcaseTitle: cleanConfigText(raw.showcaseTitle, DEFAULT_SITE_CONFIG.showcaseTitle),
      storefrontTitle: cleanConfigText(raw.storefrontTitle, DEFAULT_SITE_CONFIG.storefrontTitle),
      stockAlertThreshold: Math.max(
        0,
        Math.round(parsePrice(raw.stockAlertThreshold ?? DEFAULT_SITE_CONFIG.stockAlertThreshold)),
      ),
      servedNeighborhoods: normalizeNeighborhoods(raw.servedNeighborhoods ?? raw.neighborhoods),
      coupons: normalizeCoupons(raw.coupons ?? raw.couponsText),
      copyright: cleanConfigText(raw.copyright, DEFAULT_SITE_CONFIG.copyright),
    };
  }

  function persistSiteSettings() {
    ownerConfig = normalizedOwnerConfig(ownerConfig);
    siteConfig = normalizedSiteConfig(siteConfig);
    saveJSON(STORAGE.owner, ownerConfig);
    saveJSON(STORAGE.site, siteConfig);
  }

  async function initSiteConfig() {
    const remote = await loadRemoteSiteConfig();
    if (!remote) return;
    if (remote.owner) ownerConfig = normalizedOwnerConfig({ ...ownerConfig, ...remote.owner });
    if (remote.site || !remote.owner) siteConfig = normalizedSiteConfig({ ...siteConfig, ...(remote.site || remote) });
    persistSiteSettings();
    applySiteConfig();
    renderCart();
  }

  function missingSiteConfigTable(error) {
    const text = normalizeText(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
    return (
      text.includes('site_configuracoes') || text.includes('pgrst205') || text.includes('could not find the table')
    );
  }

  async function loadRemoteSiteConfig() {
    const client = supabaseProductClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from(SITE_CONFIG_TABLE).select('config').eq('id', 'site').maybeSingle();

      if (error) throw error;
      return data?.config || null;
    } catch (error) {
      if (!missingSiteConfigTable(error))
        console.warn('[Supabase] Nao foi possivel carregar configuracoes do site.', error);
      return null;
    }
  }

  async function saveRemoteSiteConfig() {
    const client = ordersClient();
    if (!client) return { saved: false, reason: 'no-client' };

    const config = {
      owner: normalizedOwnerConfig(ownerConfig),
      site: normalizedSiteConfig(siteConfig),
    };

    try {
      const { error } = await client.from(SITE_CONFIG_TABLE).upsert(
        {
          id: 'site',
          config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (error) throw error;
      return { saved: true };
    } catch (error) {
      if (!missingSiteConfigTable(error))
        console.warn('[Supabase] Nao foi possivel salvar configuracoes do site.', error);
      return { saved: false, error };
    }
  }

  function setElementText(selector, value, scope = document) {
    const el = qs(selector, scope);
    if (el && value) el.textContent = value;
  }

  function heroBackgroundImage(value) {
    const href = assetHref(value || DEFAULT_SITE_CONFIG.heroImage).replaceAll('"', '\\"');
    return `linear-gradient(90deg, rgba(0, 6, 31, 0.98) 0%, rgba(0, 15, 62, 0.84) 44%, rgba(0, 16, 68, 0.16) 100%), url("${href}")`;
  }

  function syncSiteAnnouncement() {
    let banner = qs('.site-announcement');
    if (!siteConfig.announcementActive) {
      banner?.remove();
      return;
    }

    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'site-announcement';
      const header = qs('.navbar');
      header?.insertAdjacentElement('afterend', banner);
    }

    banner.innerHTML = `
      <span><i class="fa-solid fa-bullhorn" aria-hidden="true"></i>${escapeHTML(siteConfig.announcement)}</span>
      <a href="https://wa.me/${ownerWhatsApp()}" target="_blank" rel="noreferrer">WhatsApp</a>
    `;
  }

  function renderServedNeighborhoods() {
    const neighborhoods = normalizeNeighborhoods(siteConfig.servedNeighborhoods);
    qsa('[data-served-neighborhoods]').forEach((container) => {
      container.innerHTML = neighborhoods
        .map((name) => `<span class="neighborhood-chip">${escapeHTML(name)}</span>`)
        .join('');
    });
    qsa('[data-served-neighborhoods-count]').forEach((el) => {
      el.textContent = String(neighborhoods.length);
    });
  }

  function applySiteConfig() {
    siteConfig = normalizedSiteConfig(siteConfig);
    ownerConfig = normalizedOwnerConfig(ownerConfig);

    document.documentElement.style.setProperty('--primary', siteConfig.accentColor);
    document.documentElement.style.setProperty('--primary-strong', siteConfig.accentColor);
    document.documentElement.style.setProperty('--blue', siteConfig.accentColor);

    qsa('.brand-logo').forEach((img) => {
      if (siteConfig.logoUrl) img.src = assetHref(siteConfig.logoUrl);
      img.alt = siteConfig.storeName;
    });
    qsa('.brand-text').forEach((el) => {
      el.textContent = siteConfig.storeName;
    });
    qsa('.footer-inner > div:first-child h3').forEach((el) => {
      el.textContent = siteConfig.storeName;
    });
    qsa('.footer-inner > div:first-child p').forEach((el) => {
      el.textContent = siteConfig.footerDescription;
    });
    qsa('.footer-copy').forEach((el) => {
      el.textContent = siteConfig.copyright;
    });
    qsa('.footer-social a[href*="wa.me"]').forEach((link) => {
      link.href = `https://wa.me/${ownerWhatsApp()}`;
    });

    const hero = qs('.hero-home');
    if (hero) {
      hero.style.backgroundImage = heroBackgroundImage(siteConfig.heroImage);
      setElementText('.hero-home .eyebrow', siteConfig.heroEyebrow);
      setElementText('.hero-home h1', siteConfig.heroTitle);
      setElementText('.hero-home-content > p', siteConfig.heroText);
      setElementText('.hero-home .hero-actions .btn-primary', siteConfig.heroButton);
    }

    const homeSectionHeads = qsa('main > .section.container > .section-head');
    if (homeSectionHeads[0]) setElementText('h2', siteConfig.catalogTitle, homeSectionHeads[0]);
    setElementText('#mais-vendidos .section-head h2', siteConfig.showcaseTitle);
    setElementText('.storefront-section .section-head h2', siteConfig.storefrontTitle);

    const trust = qsa('.trust-strip .trust-item').at(-1)?.querySelector('span');
    if (trust) trust.textContent = `Frete grátis acima de ${formatMoney(ownerFreeShippingFrom())}`;
    qsa('.payment-note-box strong').forEach((el) => {
      el.textContent = ownerDeliveryFee()
        ? `Taxa de entrega de ${formatMoney(ownerDeliveryFee())} adicionada ao valor final.`
        : 'Entrega grátis para todos os pedidos.';
    });
    qsa('.payment-note-large p').forEach((el) => {
      el.textContent = `Entrega grátis em pedidos acima de ${formatMoney(ownerFreeShippingFrom())}. Na compra de um gás, você ganha: ${ownerGiftText()}.`;
    });

    syncSiteAnnouncement();
    renderServedNeighborhoods();
  }

  function loadCart() {
    const modern = loadJSON(STORAGE.cart, null);
    if (Array.isArray(modern)) return modern;

    const legacy = loadJSON(STORAGE.legacyCart, []);
    if (!Array.isArray(legacy)) return [];

    const migrated = legacy
      .map((item) => ({
        id: item.id || makeCartId(item.name, item.variant),
        productId: item.productId || '',
        variationId: item.variationId || item.variacao_id || '',
        name: item.name,
        variant: item.variant || '',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        image: canonicalAssetPath(item.image || ''),
      }))
      .filter((item) => item.name && item.price >= 0);

    saveJSON(STORAGE.cart, migrated);
    return migrated;
  }

  function saveCart() {
    saveJSON(STORAGE.cart, cart);
  }

  function saveUser(user) {
    adminProfileCache = null;
    currentUser = user;
    let saved = true;
    if (user) {
      saved = saveJSON(STORAGE.user, user);
      rememberProfile(user);
    } else {
      localStorage.removeItem(STORAGE.user);
      setAdminPanelLinksVisible(false);
    }
    updateAccountUI();
    return saved;
  }

  function profileKey(user = {}) {
    return normalizeText(user.email || user.id || '');
  }

  function authSessionKey(email = '') {
    return normalizeText(email);
  }

  function savedAuthSessions() {
    const sessions = loadJSON(STORAGE.authSessions, {});
    return sessions && typeof sessions === 'object' && !Array.isArray(sessions) ? sessions : {};
  }

  function savedAuthSessionForEmail(email = '') {
    const key = authSessionKey(email);
    if (!key) return null;
    const session = savedAuthSessions()[key];
    return session?.access_token && session?.refresh_token ? session : null;
  }

  function saveAuthSessionForEmail(email = '', session = null) {
    const key = authSessionKey(email);
    if (!key || !session?.access_token || !session?.refresh_token) return false;
    const sessions = savedAuthSessions();
    sessions[key] = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || 0,
      token_type: session.token_type || 'bearer',
      savedAt: new Date().toISOString(),
    };
    return saveJSON(STORAGE.authSessions, sessions);
  }

  function removeSavedAuthSession(email = '') {
    const key = authSessionKey(email);
    if (!key) return false;
    const sessions = savedAuthSessions();
    if (!sessions[key]) return false;
    delete sessions[key];
    saveJSON(STORAGE.authSessions, sessions);
    return true;
  }

  function profileSummary(user = {}, previous = {}) {
    const email = String(user.email || previous.email || '')
      .trim()
      .toLowerCase();
    const savedSession = Boolean(savedAuthSessionForEmail(email));
    return {
      id: user.id || '',
      email,
      name: user.name || '',
      nick: user.nick || '',
      phone: user.phone || '',
      address: user.address || '',
      photo: user.photo || '',
      provider: user.provider || 'Supabase Auth',
      passwordSaved: user.passwordSaved ?? savedSession,
      updatedAt: user.updatedAt || new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
  }

  function savedProfiles() {
    return loadJSON(STORAGE.profiles, [])
      .filter((profile) => profile?.email)
      .map((profile) => ({
        ...profile,
        passwordSaved: Boolean(profile.passwordSaved && savedAuthSessionForEmail(profile.email)),
      }))
      .slice(0, 3);
  }

  function rememberProfile(user = currentUser) {
    if (!user?.email) return [];
    const profiles = savedProfiles();
    const previous = profiles.find((profile) => profileKey(profile) === profileKey(user));
    const next = profileSummary(user, previous);
    const saved = [next, ...profiles.filter((profile) => profileKey(profile) !== profileKey(next))].slice(0, 3);
    saveJSON(STORAGE.profiles, saved);
    renderProfileChoices();
    return saved;
  }

  function removeSavedProfile(email = '') {
    const target = normalizeText(email);
    const saved = savedProfiles().filter((profile) => normalizeText(profile.email) !== target);
    removeSavedAuthSession(email);
    saveJSON(STORAGE.profiles, saved);
    renderProfileChoices();
    return saved;
  }

  function displayProfileName(profile = {}) {
    return profile.nick || profile.name || profile.email?.split('@')[0] || 'Perfil';
  }

  function profileAvatarMarkup(profile = {}) {
    if (profile.photo) return `<img src="${escapeHTML(profile.photo)}" alt="" loading="lazy" decoding="async">`;
    const initial = displayProfileName(profile).trim().charAt(0).toUpperCase() || 'P';
    return `<span>${escapeHTML(initial)}</span>`;
  }

  function profilePasswordHint(profile = {}) {
    return profile.passwordSaved
      ? '<small class="saved-profile-auth-hint"><i class="fa-solid fa-key"></i> Troca automatica</small>'
      : '<small class="saved-profile-auth-hint"><i class="fa-solid fa-lock"></i> Pede senha</small>';
  }

  function selectSavedProfile(email = '') {
    const profile = savedProfiles().find((item) => normalizeText(item.email) === normalizeText(email));
    if (!profile) return null;
    sessionStorage.setItem(STORAGE.pendingProfile, profile.email);
    return profile;
  }

  async function rememberBrowserPassword({ email = '', password = '', name = '' } = {}) {
    if (!email || !password || !navigator.credentials?.store || typeof window.PasswordCredential !== 'function')
      return false;

    try {
      await navigator.credentials.store(
        new window.PasswordCredential({
          id: email,
          name: name || email,
          password,
        }),
      );
      return true;
    } catch (error) {
      console.debug('[Auth] Navegador nao salvou a senha automaticamente.', error);
      return false;
    }
  }

  async function userWithPasswordPreference(
    user = {},
    { email = '', password = '', name = '', shouldSave = null, session = null } = {},
  ) {
    if (!user?.email) return user;

    const accountEmail = user.email || email;
    const nextUser = { ...user, passwordSaved: Boolean(savedAuthSessionForEmail(accountEmail)) };

    if (shouldSave !== false) {
      const sessionSaved = saveAuthSessionForEmail(accountEmail, session);
      const browserSaved = await rememberBrowserPassword({
        email: user.email || email,
        password,
        name: user.name || name || email,
      });
      nextUser.passwordSaved = Boolean(sessionSaved || browserSaved || savedAuthSessionForEmail(accountEmail));
    } else if (shouldSave === false) {
      removeSavedAuthSession(accountEmail);
      nextUser.passwordSaved = false;
    }

    saveUser(nextUser);
    return nextUser;
  }

  async function savedBrowserPasswordForEmail(email = '', options = {}) {
    const targetEmail = normalizeText(email);
    if (!targetEmail || !navigator.credentials?.get) return null;

    try {
      const credential = await navigator.credentials.get({
        password: true,
        mediation: options.mediation || 'optional',
      });

      if (!credential?.password || normalizeText(credential.id || '') !== targetEmail) return null;
      return {
        email: String(credential.id || email)
          .trim()
          .toLowerCase(),
        password: credential.password,
        name: credential.name || '',
      };
    } catch (error) {
      console.debug('[Auth] Navegador nao liberou a senha salva.', error);
      return null;
    }
  }

  async function signInWithSavedBrowserProfile(profile = {}, options = {}) {
    const email = String(profile.email || '')
      .trim()
      .toLowerCase();
    if (!profile.passwordSaved) return null;
    const savedSession = savedAuthSessionForEmail(email);
    if (!savedSession) return null;

    const client = authClient();
    if (!client?.auth) throw new Error('Autenticacao indisponivel.');

    const { data, error } = await client.auth.setSession({
      access_token: savedSession.access_token,
      refresh_token: savedSession.refresh_token,
    });
    if (error) {
      removeSavedAuthSession(email);
      throw error;
    }

    const user = userFromAuthUser(data.session?.user);
    if (!user?.email) throw new Error('Sessao nao retornada pelo Supabase.');
    saveAuthSessionForEmail(user.email || email, data.session);
    saveUser({ ...user, passwordSaved: true });
    await safeUpsertProfileRecord(data.session.user, user, options.context || 'login com senha salva');
    return { ...user, passwordSaved: true };
  }

  function authClient() {
    return supabaseProductClient();
  }

  function clearSupabaseAuthStorage() {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (/^sb-.*-auth-token$/.test(key) || key.includes('supabase.auth')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_error) {}
  }

  async function signOutEverywhere(options = {}) {
    const redirect = options.redirect || '';
    const message = options.message === undefined ? 'Voce saiu da conta.' : options.message;
    const localOnly = Boolean(options.localOnly);
    const client = authClient();

    try {
      if (client?.auth) await client.auth.signOut(localOnly ? { scope: 'local' } : undefined);
    } catch (error) {
      console.warn('[Supabase Auth] Nao foi possivel encerrar a sessao remota. Limpando sessao local.', error);
    }

    clearSupabaseAuthStorage();
    saveUser(null);
    updateAdminPanelLinks({ force: true }).catch(() => {});
    if (message) showToast(message, { type: 'success' });
    if (redirect)
      window.setTimeout(() => {
        window.location.href = redirect;
      }, 350);
  }

  function authMetadata(user = {}) {
    return user.user_metadata || {};
  }

  function userFromAuthUser(user) {
    if (!user) return null;
    const meta = authMetadata(user);
    return {
      id: user.id || '',
      email: user.email || '',
      name: meta.name || meta.full_name || '',
      nick: meta.nick || '',
      phone: meta.phone || '',
      address: meta.address || '',
      photo: meta.photo || meta.avatar_url || '',
      provider: 'Supabase Auth',
      updatedAt: meta.updatedAt || user.updated_at || '',
    };
  }

  function applyAuthSession(session) {
    adminProfileCache = null;
    saveUser(session?.user ? userFromAuthUser(session.user) : null);
    applyCheckoutProfile();
    if (currentPage() === 'perfil.html') initProfilePage();
    if (currentPage() === 'pedidos.html') {
      window.setTimeout(() => updateOrdersPageMode({ force: true }), 0);
    }
    updateAdminPanelLinks({ force: true });
  }

  async function initSupabaseAuth() {
    const client = authClient();
    if (!client?.auth) {
      saveUser(null);
      return;
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      applyAuthSession(data?.session || null);
    } catch (error) {
      console.warn('[Supabase Auth] Não foi possível restaurar a sessão.', error);
      saveUser(null);
    }

    client.auth.onAuthStateChange((event, session) => {
      applyAuthSession(session || null);
      if (event === 'PASSWORD_RECOVERY') {
        window.dispatchEvent(new CustomEvent('monte-sinai-password-recovery'));
      }
    });
  }

  function authFriendlyError(error, fallback = 'Não foi possível concluir. Tente novamente.') {
    const message = normalizeText(error?.message || '');
    if (message.includes('invalid login') || message.includes('invalid credentials'))
      return 'Email ou senha incorretos.';
    if (message.includes('email not confirmed'))
      return 'Seu cadastro foi criado, mas a confirmacao por email ainda esta ligada no Supabase.';
    if (message.includes('already registered') || message.includes('user already registered'))
      return 'Este email já está cadastrado. Tente entrar.';
    if (message.includes('password') && message.includes('six')) return 'Use uma senha com pelo menos 6 caracteres.';
    if (message.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    return fallback;
  }

  function checkoutFriendlyError(error, fallback = 'Nao consegui salvar o pedido no Supabase. Tente novamente.') {
    const message = normalizeText(`${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`);
    if (message.includes('create_order') || message.includes('function') || message.includes('rpc')) {
      return 'Finalize a atualizacao do SQL no Supabase antes de vender. O carrinho foi mantido.';
    }
    if (message.includes('estoque insuficiente') || message.includes('produto do pedido nao esta disponivel')) {
      return 'Um produto ficou sem estoque ou indisponivel. Confira o carrinho e tente novamente.';
    }
    if (message.includes('telefone')) return 'Confira o WhatsApp informado antes de finalizar.';
    return fallback;
  }

  function authRedirectUrl(page = 'login.html', params = {}) {
    const allowedPages = new Set(['login.html', 'perfil.html']);
    const safePage = allowedPages.has(page) ? page : 'login.html';
    const url = new URL(pageHref(safePage), window.location.href);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.href;
  }

  async function sendWelcomeEmail(user = {}) {
    const client = authClient();
    const email = user.email || '';
    if (!client?.functions || !email) return;

    try {
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData?.session;
      if (!session?.access_token) return;
      if (normalizeText(session.user?.email || '') !== normalizeText(email)) return;

      await client.functions.invoke('send-welcome-email', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          email,
          name: user.name || email.split('@')[0],
          storeName: siteConfig.storeName || DEFAULT_SITE_CONFIG.storeName,
          logoUrl: new URL(assetHref(siteConfig.logoUrl || DEFAULT_SITE_CONFIG.logoUrl), window.location.href).href,
          siteUrl: new URL(homeHref(), window.location.href).href,
          installUrl: new URL(homeHref(), window.location.href).href,
        },
      });
    } catch (error) {
      console.warn('[Supabase] Email de boas-vindas nao enviado.', error);
    }
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function formatDateTime(value) {
    if (!value) return 'Sem data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function normalizeOrderStatus(status = '') {
    const text = normalizeText(status);
    if (text.includes('cancel')) return 'Cancelado';
    if (text.includes('prepar')) return 'Preparando';
    if (text.includes('saiu') || text.includes('entrega'))
      return text.includes('entregue') ? 'Entregue' : 'Saiu para entrega';
    if (text.includes('entregue')) return 'Entregue';
    return 'Recebido';
  }

  function normalizePaymentStatus(status = '') {
    const text = normalizeText(status);
    if (text.includes('pago') || text.includes('paid')) return 'Pago';
    if (text.includes('cancel')) return 'Cancelado';
    return 'Pendente';
  }

  function orderStatusClass(status = '') {
    return (
      {
        Recebido: 'is-status-received',
        Preparando: 'is-status-preparing',
        'Saiu para entrega': 'is-status-delivery',
        Entregue: 'is-status-delivered',
        Cancelado: 'is-status-canceled',
      }[normalizeOrderStatus(status)] || 'is-status-received'
    );
  }

  function orderPaymentClass(status = '') {
    return (
      {
        Pendente: 'is-payment-pending',
        Pago: 'is-payment-paid',
        Cancelado: 'is-payment-canceled',
      }[normalizePaymentStatus(status)] || 'is-payment-pending'
    );
  }

  function normalizeEmail(value = '') {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function knownAdminRoleForEmail(email = '') {
    return getFallbackRoleForEmail(email) || '';
  }

  function adminRole(profile = adminProfileCache) {
    // Prefer explicit profile role
    const role = normalizeText(profile?.admin_role || profile?.role || '');
    if (role) return role;
    return profile?.is_admin ? 'owner' : 'customer';
  }

  function isDeveloperProfile(profile = adminProfileCache) {
    if (adminRole(profile) === 'developer') return true;
    return false;
  }

  function roleLabel(role = adminRole()) {
    return (
      {
        developer: 'Desenvolvedor / Presidente',
        owner: 'Proprietário',
        staff: 'Equipe',
        customer: 'Cliente',
      }[role] || 'Administrador'
    );
  }

  function formatDateTimeLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function isoFromLocalInput(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function addHoursLocalInput(hours = 24) {
    const date = new Date(Date.now() + Number(hours || 0) * 60 * 60 * 1000);
    return formatDateTimeLocalInput(date.toISOString());
  }

  function productOfferActive(product = {}) {
    const enabled = Boolean(product.oferta_ativa ?? product.offerActive);
    const promo = parsePrice(product.preco_promocional ?? product.promotionalPrice ?? product.promoPrice);
    if (!enabled || promo <= 0) return false;

    const now = Date.now();
    const start = product.oferta_inicio || product.offerStartsAt;
    const end = product.oferta_fim || product.offerEndsAt;
    if (start && new Date(start).getTime() > now) return false;
    if (end && new Date(end).getTime() < now) return false;
    return true;
  }

  function variationOfferData(raw = {}) {
    const enabled = Boolean(raw.oferta_ativa ?? raw.offerActive);
    const promo = parsePrice(
      raw.preco_promocional ?? raw.promotionalPrice ?? raw.promoPrice,
    );
    const start = raw.oferta_inicio || raw.offerStartsAt;
    const end = raw.oferta_fim || raw.offerEndsAt;
    const now = Date.now();
    const startsOk = !start || new Date(start).getTime() <= now;
    const endsOk = !end || new Date(end).getTime() >= now;
    return {
      active: enabled && promo > 0 && startsOk && endsOk,
      promotionalPrice: promo,
      startsAt: start || '',
      endsAt: end || '',
    };
  }

  function offerCountdownText(value) {
    if (!value) return 'Oferta por tempo limitado';
    const end = new Date(value).getTime();
    if (Number.isNaN(end)) return 'Oferta por tempo limitado';
    const diff = end - Date.now();
    if (diff <= 0) return 'Oferta encerrando';

    const minutes = Math.ceil(diff / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0) return `Termina em ${days}d ${hours}h`;
    if (hours > 0) return `Termina em ${hours}h ${mins}min`;
    return `Termina em ${mins}min`;
  }

  function isMissingProductExtensionError(error) {
    const text = normalizeText(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
    return (
      text.includes('preco_promocional') ||
      text.includes('oferta_ativa') ||
      text.includes('oferta_inicio') ||
      text.includes('oferta_fim') ||
      text.includes('kit_itens') ||
      text.includes('estoque') ||
      text.includes('estoque_minimo') ||
      text.includes('destaque') ||
      text.includes('tipo') ||
      text.includes('catalogo_visivel') ||
      text.includes('loja_visivel') ||
      text.includes('catalogo_ordem') ||
      text.includes('descricao_detalhada') ||
      text.includes('catalogo_destaque')
    );
  }

  function isMissingOrderExtensionError(error) {
    const text = normalizeText(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
    return (
      text.includes('cupom_codigo') ||
      text.includes('desconto') ||
      text.includes('cliente_tipo') ||
      text.includes('confirmado') ||
      text.includes('pagamento_status') ||
      text.includes('could not find') ||
      text.includes('pgrst204')
    );
  }

  function isMissingProfileRoleError(error) {
    const text = normalizeText(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
    return text.includes('admin_role') || text.includes('could not find') || text.includes('pgrst204');
  }

  function isMissingNotificationTableError(error) {
    const text = normalizeText(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
    return (
      text.includes('pedido_notificacoes') ||
      text.includes('could not find') ||
      text.includes('pgrst205') ||
      text.includes('pgrst204')
    );
  }

  function isMissingProductVariationTableError(error) {
    const text = normalizeText(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
    return (
      text.includes('produto_variacoes') ||
      text.includes('could not find') ||
      text.includes('pgrst205') ||
      text.includes('pgrst204')
    );
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeSelectorValue(value) {
    if (window.CSS?.escape) return CSS.escape(String(value ?? ''));
    return String(value ?? '').replace(/["\\]/g, '\\$&');
  }

  function isUUID(value = '') {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
  }

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function splitSearchTokens(value) {
    return normalizeText(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1);
  }

  function parsePrice(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const text = String(value ?? '').trim();
    if (!text) return 0;

    const clean = text.replace(/[^\d,.-]/g, '');
    const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function categorySlug(value) {
    const normalized = normalizeText(value || 'produtos');
    if (normalized.includes('limpeza pesada')) return 'limpeza-pesada';
    if (normalized.includes('agua')) return 'agua';
    if (normalized.includes('gas')) return 'gas';
    if (normalized.includes('lavanderia')) return 'lavanderia';
    if (normalized.includes('higiene')) return 'higiene';
    if (normalized.includes('banheiro')) return 'banheiro';
    if (normalized.includes('cozinha')) return 'cozinha';
    if (normalized.includes('organiz')) return 'organizacao';
    if (normalized.includes('utens')) return 'utensilios';
    if (normalized.includes('limpeza')) return 'limpeza';
    const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'produtos';
    return ['recomendado', 'recomendados', 'oferta', 'ofertas', 'promocao', 'promocoes', 'kit', 'kits'].includes(slug)
      ? 'produtos'
      : slug;
  }

  function categoryOrderIndex(slug) {
    const index = CATALOG_CATEGORY_ORDER.indexOf(slug);
    return index === -1 ? CATALOG_CATEGORY_ORDER.length : index;
  }

  function orderedCategoryEntries(products = productIndex) {
    const categories = new Map();

    products.forEach((product) => {
      const slug = product.categorySlug || categorySlug(product.category);
      if (!categories.has(slug)) categories.set(slug, product.category || 'Produtos');
    });

    return [...categories.entries()].sort(([slugA, labelA], [slugB, labelB]) => {
      const orderA = categoryOrderIndex(slugA);
      const orderB = categoryOrderIndex(slugB);
      if (orderA !== orderB) return orderA - orderB;
      return String(labelA).localeCompare(String(labelB), 'pt-BR');
    });
  }

  function storeProducts() {
    return productIndex.filter((product) => {
      const normalized = normalizeProduct(product);
      return normalized.active && normalized.storeVisible;
    });
  }

  function catalogProducts() {
    return productIndex.filter((product) => {
      const normalized = normalizeProduct(product);
      return normalized.active && normalized.catalogVisible;
    });
  }

  function compareCatalogProducts(a, b) {
    const productA = normalizeProduct(a);
    const productB = normalizeProduct(b);
    const orderA = productA.catalogOrder;
    const orderB = productB.catalogOrder;
    if (orderA !== null || orderB !== null) return (orderA ?? 99999) - (orderB ?? 99999);

    const stockA = productA.stockState === 'out' ? 1 : 0;
    const stockB = productB.stockState === 'out' ? 1 : 0;
    if (stockA !== stockB) return stockA - stockB;

    const featuredA = productA.offerActive || productA.catalogHighlight || productA.highlight ? 0 : 1;
    const featuredB = productB.offerActive || productB.catalogHighlight || productB.highlight ? 0 : 1;
    if (featuredA !== featuredB) return featuredA - featuredB;

    return String(productA.name || '').localeCompare(String(productB.name || ''), 'pt-BR');
  }

  function catalogSectionMeta(slug, label) {
    return (
      CATALOG_SECTION_META[slug] || {
        eyebrow: label || 'Produtos',
        title: label || 'Produtos disponíveis',
      }
    );
  }

  function productTerms(product) {
    const optionTerms = Array.isArray(product?.options)
      ? product.options.map((option) => `${option.label || ''} ${option.value || ''} ${option.name || ''}`).join(' ')
      : '';
    return `${product?.name || ''} ${product?.category || ''} ${product?.description || ''} ${product?.kitItems || ''} ${product?.terms || ''} ${optionTerms}`;
  }

  function isRecommendedProduct(product) {
    const blob = normalizeText(productTerms(product));
    return (
      Boolean(product?.recommended || product?.highlight || product?.offerActive || product?.isKit) ||
      blob.includes('agua') ||
      blob.includes('gas')
    );
  }

  function normalizeProductVariation(raw = {}, product = {}) {
    const name = String(raw.nome ?? raw.name ?? '').trim();
    const image = resolveProductImagePath(raw.imagem ?? raw.image ?? '', name || product.name || '');
    const originalPrice = parsePrice(raw.preco_original ?? raw.originalPrice ?? raw.preco ?? raw.price ?? product.price ?? 0);
    const offer = variationOfferData(raw);
    const stock =
      raw.estoque === null || raw.stock === null || raw.estoque === ''
        ? null
        : Number.isFinite(Number(raw.estoque ?? raw.stock))
          ? Number(raw.estoque ?? raw.stock)
          : null;
    const canBuy = raw.pode_comprar ?? raw.canBuy;
    const unavailable = raw.indisponivel ?? raw.unavailable ?? (canBuy === false ? true : false);

    return {
      id: raw.id ?? raw.variationId ?? '',
      productId: raw.produto_id ?? raw.productId ?? product.id ?? '',
      name,
      slug: String(raw.slug ?? '').trim(),
      sku: String(raw.sku ?? '').trim(),
      price: offer.active ? offer.promotionalPrice : originalPrice,
      originalPrice,
      promotionalPrice: offer.promotionalPrice,
      offerActive: offer.active,
      offerStartsAt: offer.startsAt,
      offerEndsAt: offer.endsAt,
      stock,
      canBuy: canBuy === undefined || canBuy === null ? stock === null || stock > 0 : canBuy !== false,
      unavailable: unavailable === true,
      active: (raw.ativo ?? raw.active ?? true) !== false,
      image,
      attributes: raw.atributos ?? raw.attributes ?? {},
      order: Number.isFinite(Number(raw.ordem ?? raw.order)) ? Number(raw.ordem ?? raw.order) : 0,
    };
  }

  function normalizeProduct(raw = {}) {
    const name = String(raw.nome ?? raw.name ?? '').trim();
    const category = String(raw.categoria ?? raw.category ?? 'Produtos').trim() || 'Produtos';
    const description = String(raw.descricao ?? raw.description ?? '').trim();
    const originalPrice = parsePrice(raw.preco_original ?? raw.originalPrice ?? raw.preco ?? raw.price);
    const promotionalPrice = parsePrice(raw.preco_promocional ?? raw.promotionalPrice ?? raw.promoPrice);
    const image = resolveProductImagePath(raw.imagem ?? raw.image ?? '', name);
    const type =
      String(raw.tipo ?? raw.type ?? '').trim() || (normalizeText(category).includes('kit') ? 'kit' : 'produto');
    const offerActive = productOfferActive(raw);
    const price = offerActive && promotionalPrice > 0 ? promotionalPrice : originalPrice;
    const highlight = Boolean(raw.destaque ?? raw.highlight ?? raw.recommended) || offerActive || type === 'kit';
    const stock = productStockLevel(raw);
    const lowStockLimit = productLowStockLimit(raw);
    const canBuy = raw.pode_comprar ?? raw.canBuy;
    const unavailable = raw.indisponivel ?? raw.unavailable ?? (canBuy === false ? true : false);
    const active = raw.ativo ?? raw.active ?? true;
    const catalogVisible = raw.catalogo_visivel ?? raw.catalogVisible ?? true;
    const storeVisible = raw.loja_visivel ?? raw.storeVisible ?? true;
    const catalogOrder = raw.catalogo_ordem ?? raw.catalogOrder ?? null;
    const detailedDescription = String(raw.descricao_detalhada ?? raw.detailedDescription ?? '').trim();
    const catalogHighlight = Boolean(raw.catalogo_destaque ?? raw.catalogHighlight ?? false);
    const productBase = { id: raw.id ?? raw.productId ?? '', name, price };
    const sourceVariations = Array.isArray(raw.variacoes)
      ? raw.variacoes
      : Array.isArray(raw.variations)
        ? raw.variations
        : Array.isArray(raw.options)
          ? raw.options
          : [];
    const options = sourceVariations
      .map((variation) => normalizeProductVariation(variation, productBase))
      .filter((variation) => variation.active && variation.name)
      .sort((a, b) => a.order - b.order || String(a.name).localeCompare(String(b.name), 'pt-BR'));
    const hasVariations = options.length > 0;
    const stockState = hasVariations
      ? productVariationsStockState(options, lowStockLimit)
      : productStockState({
          estoque: stock,
          estoque_minimo: lowStockLimit,
          pode_comprar: canBuy,
          indisponivel: unavailable,
        });

    return {
      id: raw.id ?? raw.productId ?? '',
      name,
      category,
      categorySlug: categorySlug(category),
      description,
      detailedDescription,
      price,
      originalPrice,
      promotionalPrice,
      image,
      type,
      isKit: type === 'kit',
      highlight: highlight || catalogHighlight,
      catalogHighlight,
      offerActive,
      offerStartsAt: raw.oferta_inicio ?? raw.offerStartsAt ?? '',
      offerEndsAt: raw.oferta_fim ?? raw.offerEndsAt ?? '',
      kitItems: raw.kit_itens ?? raw.kitItems ?? '',
      stock,
      lowStockLimit,
      stockState,
      canBuy: canBuy === undefined || canBuy === null ? stockState !== 'out' : canBuy !== false,
      unavailable: unavailable === true,
      active: active !== false,
      catalogVisible: catalogVisible !== false,
      storeVisible: storeVisible !== false,
      catalogOrder: Number.isFinite(Number(catalogOrder)) ? Number(catalogOrder) : null,
      options,
      hasVariations,
      recommended: highlight || catalogHighlight,
      terms: `${name} ${category} ${description} ${detailedDescription} ${options.map((option) => option.name).join(' ')}`,
    };
  }

  function productVariantInfo(product) {
    const name = product.name || '';
    const normalized = normalizeText(name);

    if (normalized.startsWith('gas de cozinha p13')) {
      const baseName = 'Gás de cozinha P13';
      const variant = productVariantLabel(name, baseName, /^g[aá]s de cozinha p13\s*/i);
      return {
        baseName,
        variant,
        category: 'Gás',
        description: 'Escolha o tipo: Supergas R$ 125,00 ou Ultragas R$ 135,00.',
      };
    }

    if (normalized.startsWith('desinfetante 2l')) {
      const baseName = 'Desinfetante 2L';
      const variant = productVariantLabel(name, baseName, /^desinfetante 2l\s*/i);
      return {
        baseName,
        variant,
        category: 'Limpeza',
        description: 'Escolha a fragrância de sua preferência para perfumar a limpeza.',
      };
    }

    return null;
  }

  function variantOrderIndex(baseName, variant) {
    const order = CATALOG_VARIANT_ORDER[categorySlug(baseName)] || [];
    const index = order.findIndex((item) => normalizeText(item) === normalizeText(variant));
    return index === -1 ? order.length : index;
  }

  function productVariantLabel(name, baseName, prefixPattern) {
    const order = CATALOG_VARIANT_ORDER[categorySlug(baseName)] || [];
    const knownVariant = order.find((option) => normalizeText(name).includes(normalizeText(option)));
    if (knownVariant) return knownVariant;
    return name.replace(prefixPattern, '').trim() || 'Padrão';
  }

  function groupProductVariants(products) {
    const grouped = new Map();
    const result = [];

    products.forEach((product) => {
      const variantInfo = productVariantInfo(product);
      if (!variantInfo) {
        result.push(product);
        return;
      }

      const key = normalizeText(variantInfo.baseName);
      let group = grouped.get(key);

      if (!group) {
        group = {
          ...product,
          name: variantInfo.baseName,
          category: variantInfo.category || product.category,
          categorySlug: categorySlug(variantInfo.category || product.category),
          description: variantInfo.description || product.description,
          image: resolveProductImagePath(product.image || '', variantInfo.baseName),
          options: [],
          recommended: Boolean(product.recommended) || isRecommendedProduct(product),
          terms: `${variantInfo.baseName} ${variantInfo.category || product.category} ${product.terms || ''}`,
        };
        grouped.set(key, group);
        result.push(group);
      }

      if (
        variantInfo.variant !== 'Padrão' &&
        !group.options.some((option) => normalizeText(option.value) === normalizeText(variantInfo.variant))
      ) {
        group.options.push({
          label: `${variantInfo.variant} - ${formatMoney(product.price)}`,
          value: variantInfo.variant,
          price: Number(product.price || 0),
        });
      }

      group.price = group.options[0]?.price ?? group.price;
      group.terms = `${group.terms || ''} ${variantInfo.variant} ${product.description || ''}`;
    });

    result.forEach((product) => {
      if (product.options?.length > 1) {
        product.options.sort((optionA, optionB) => {
          const orderA = variantOrderIndex(product.name, optionA.value);
          const orderB = variantOrderIndex(product.name, optionB.value);
          if (orderA !== orderB) return orderA - orderB;
          return String(optionA.value).localeCompare(String(optionB.value), 'pt-BR');
        });
        product.price = Number(product.options[0]?.price || product.price || 0);
      }
    });

    return result;
  }

  function uniqueProductList(products) {
    const seen = new Set();
    const unique = products
      .map(normalizeProduct)
      .filter((product) => product.name)
      .filter((product) => product.active !== false)
      .filter((product) => {
        const key = normalizeText(product.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return unique;
  }

  function setProductIndex(products) {
    productIndex = uniqueProductList(products);
  }

  function clearPublicProductShell() {
    if (!['index.html', 'produtos.html', 'catalogo.html', 'promocoes.html'].includes(currentPage())) return;
    productIndex = [];
    qsa('#todos-produtos .section-head, #todos-produtos .grid-produtos, [data-product-rail] .product-card, [data-promotions-grid] .product-card').forEach((node) =>
      node.remove(),
    );
  }

  function pruneCartUnavailableProducts(products = []) {
    const activeIds = new Set(
      products
        .filter((product) => normalizeProduct(product).active !== false)
        .map((product) => String(product.id || ''))
        .filter(Boolean),
    );
    const activeVariationIds = new Set(
      products
        .flatMap((product) => normalizeProduct(product).options || [])
        .map((variation) => String(variation.id || ''))
        .filter(Boolean),
    );
    if (!activeIds.size) return;

    const previousLength = cart.length;
    cart = cart.filter(
      (item) =>
        (!item.productId || activeIds.has(String(item.productId))) &&
        (!item.variationId || activeVariationIds.has(String(item.variationId))),
    );
    if (cart.length !== previousLength) {
      saveCart();
      renderCart();
    }
  }

  function supabaseProductClient() {
    const candidates = [window.monteSinaiSupabase, window.supabaseClient, window.msSupabase];

    return candidates.find((client) => client && typeof client.from === 'function') || null;
  }

  function ordersClient() {
    return supabaseProductClient();
  }

  async function rpcAdminUpdateOrder(orderId, payload = {}) {
    const client = ordersClient();
    if (!client?.rpc) return { data: null, error: new Error('RPC indisponivel') };
    return client.rpc('admin_update_order', {
      p_id: orderId,
      p_status: payload.status ?? null,
      p_pagamento_status: payload.pagamento_status ?? null,
      p_confirmado: payload.confirmado ?? null,
    });
  }

  async function rpcAdminUpdateProduct(productId, payload = {}) {
    const client = ordersClient();
    if (!client?.rpc) return { data: null, error: new Error('RPC indisponivel') };
    return client.rpc('admin_update_product', {
      p_id: productId,
      p_payload: payload,
    });
  }

  async function currentAuthUser() {
    const client = authClient();
    if (!client?.auth) return null;
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

  async function upsertProfileRecord(user = null, source = currentUser || {}) {
    const client = ordersClient();
    const authUser = user || (await currentAuthUser());
    if (!client || !authUser?.id) return null;

    const profile = {
      id: authUser.id,
      email: authUser.email || source.email || '',
      nome: source.name || '',
      apelido: source.nick || '',
      telefone: source.phone || '',
      endereco: source.address || '',
      foto: source.photo || '',
    };

    let columns = 'id, email, nome, apelido, telefone, endereco, foto, is_admin, admin_role';
    let { data: existing, error: lookupError } = await client
      .from('profiles')
      .select(columns)
      .eq('id', authUser.id)
      .maybeSingle();

    if (lookupError && isMissingProfileRoleError(lookupError)) {
      columns = 'id, email, nome, apelido, telefone, endereco, foto, is_admin';
      const fallback = await client.from('profiles').select(columns).eq('id', authUser.id).maybeSingle();
      existing = fallback.data;
      lookupError = fallback.error;
    }

    if (lookupError) throw lookupError;
    if (existing?.is_admin || ['developer', 'owner', 'staff'].includes(adminRole(existing))) return existing;

    const query = existing
      ? client.from('profiles').update(profile).eq('id', authUser.id)
      : client.from('profiles').insert(profile);

    const { data, error } = await query.select(columns).single();
    if (error) throw error;
    return data;
  }

  async function safeUpsertProfileRecord(user = null, source = currentUser || {}, context = 'perfil') {
    try {
      return await upsertProfileRecord(user, source);
    } catch (error) {
      console.warn(`[Supabase] Login ok, mas nao foi possivel sincronizar ${context}.`, error);
      return null;
    }
  }

  function fallbackAdminProfileFromAuthUser(authUser = null) {
    const role = knownAdminRoleForEmail(authUser?.email);
    if (!role) return null;
    return {
      id: authUser.id || '',
      email: authUser.email || '',
      nome: authMetadata(authUser).name || authMetadata(authUser).full_name || '',
      is_admin: true,
      admin_role: role,
      __emailFallback: true,
    };
  }

  async function upsertCheckoutAddress(userId, customer) {
    const client = ordersClient();
    if (!client || !userId || !customer?.address) return;

    const { error } = await client.from('enderecos').insert({
      user_id: userId,
      nome: customer.name,
      telefone: customer.phone,
      endereco: customer.address,
      observacao: customer.note || '',
      principal: true,
    });

    if (error) console.warn('[Supabase] Nao foi possivel salvar endereco do pedido.', error);
  }

  async function currentAdminProfile({ force = false } = {}) {
    if (adminProfileCache && !force) return adminProfileCache;

    const client = ordersClient();
    if (!client) return null;

    await authReady.catch(() => null);
    const authUser = await currentAuthUser().catch(() => null);
    if (!authUser?.id) return null;

    let { data, error } = await client
      .from('profiles')
      .select('id, email, nome, is_admin, admin_role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error && isMissingProfileRoleError(error)) {
      const fallback = await client
        .from('profiles')
        .select('id, email, nome, is_admin')
        .eq('id', authUser.id)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      const fallback = fallbackAdminProfileFromAuthUser(authUser);
      if (fallback) {
        console.warn('[Admin] Perfil admin nao foi lido no Supabase; usando fallback por email conhecido.', error);
        adminProfileCache = fallback;
        return adminProfileCache;
      }
      throw error;
    }

    if (data) {
      adminProfileCache = { ...data, email: data.email || authUser.email || '' };
      return adminProfileCache;
    }

    adminProfileCache =
      (await safeUpsertProfileRecord(authUser, userFromAuthUser(authUser), 'perfil admin')) ||
      fallbackAdminProfileFromAuthUser(authUser);
    return adminProfileCache;
  }

  async function isCurrentUserAdmin({ force = true } = {}) {
    const profile = await currentAdminProfile({ force });
    return Boolean(profile?.is_admin || ['developer', 'owner', 'staff'].includes(adminRole(profile)));
  }

  async function loadProductVariations(client, products = []) {
    const ids = products.map((product) => product.id).filter(Boolean);
    if (!client || !ids.length) return [];

    let { data, error } = await client
      .from(PUBLIC_PRODUCT_VARIATION_VIEW)
      .select(PUBLIC_PRODUCT_VARIATION_SELECT)
      .in('produto_id', ids)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205' || isMissingProductVariationTableError(error)) {
        console.info('[Supabase] View publica de variacoes ausente. Execute a migracao da etapa 7 para liberar opcoes sem expor estoque.');
        return [];
      }
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  function attachProductVariations(products = [], variations = []) {
    if (!variations.length) return products;
    const byProduct = variations.reduce((map, variation) => {
      const productId = String(variation.produto_id || '');
      if (!productId) return map;
      if (!map.has(productId)) map.set(productId, []);
      map.get(productId).push(variation);
      return map;
    }, new Map());

    return products.map((product) => ({
      ...product,
      variacoes: byProduct.get(String(product.id || '')) || [],
    }));
  }

  async function loadProductsFromSupabase() {
    const client = supabaseProductClient();
    if (!client) {
      console.warn('[Supabase] Cliente nao encontrado. Catalogo publico nao carregado.');
      setProductIndex([]);
      renderSupabaseProducts();
      return;
    }

    try {
      const tableNames = [PUBLIC_PRODUCT_VIEW];
      let products = [];
      let loadedTable = '';
      let lastError = null;

      for (const tableName of tableNames) {
        const query = client.from(tableName).select(PUBLIC_PRODUCT_SELECT).order('nome', { ascending: true });

        let { data, error } = await query;

        if (!error) {
          products = Array.isArray(data) ? data : [];
          loadedTable = tableName;
          break;
        }

        lastError = error;
        if (error.code !== 'PGRST205') throw error;
        console.warn(`[Supabase] View publica "${tableName}" nao encontrada. Execute a migracao da etapa 7.`);
      }

      if (!loadedTable) throw lastError || new Error('Nenhuma tabela de produtos encontrada no Supabase.');
      const variations = loadedTable === PUBLIC_PRODUCT_VIEW ? await loadProductVariations(client, products) : [];
      const productsWithVariations = attachProductVariations(products, variations);
      setProductIndex(productsWithVariations);
      pruneCartUnavailableProducts(productsWithVariations);
      renderSupabaseProducts();
    } catch (error) {
      console.error('[Supabase] Erro ao carregar produtos:', error);
      const localProducts = await loadLocalCatalogProducts().catch(() => []);
      setProductIndex(localProducts);
      renderSupabaseProducts();
      if (currentPage() === 'produtos.html') {
        showToast('Nao foi possivel carregar os produtos do Supabase. Tente atualizar a pagina.');
      }
    }
  }

  function renderSupabaseProducts() {
    renderDynamicCatalog();
    renderFullCatalogPage();
    renderPromotionsPage();
    renderDynamicProductRail();
    injectProductJsonLd();
    optimizeImageLoading();
    applyCatalogHashFilter(false);
    applyCatalogFilters();
    renderSmartSearchResults(qs('[data-smart-search-input]')?.value || '');
  }

  function injectProductJsonLd() {
    const page = currentPage();
    if (!['index.html', 'produtos.html', 'catalogo.html', 'promocoes.html'].includes(page)) return;

    const products = storeProducts()
      .slice(0, 80)
      .map((product) => {
        const normalized = normalizeProduct(product);
        const image = productAssetPath(normalized);
        return {
          '@type': 'Product',
          name: normalized.name,
          description: normalized.description || `Produto de ${normalized.category}.`,
          category: normalized.category,
          sku: normalized.id || normalized.name,
          image: image ? new URL(assetHref(image), window.location.href).href : undefined,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: Number(normalized.price || 0).toFixed(2),
            availability:
              normalized.stockState === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            url: new URL(productHref(normalized.name), window.location.href).href,
          },
        };
      });

    if (!products.length) return;
    let script = qs('#monte-sinai-products-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.id = 'monte-sinai-products-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': products,
    });
  }

  function searchTokens(value) {
    const tokens = splitSearchTokens(value);
    const expanded = tokens.flatMap((token) => splitSearchTokens(SEARCH_EXPANSIONS[token] || ''));
    const fuzzyExpanded = tokens.flatMap((token) => {
      if (token.length < 3) return [];

      return Object.entries(SEARCH_EXPANSIONS).flatMap(([key, expansion]) => {
        const keyScore = fuzzyTokenScore(token, key);
        return keyScore >= 5 ? splitSearchTokens(expansion) : [];
      });
    });

    return [...new Set([...tokens, ...expanded, ...fuzzyExpanded])];
  }

  function boundedLevenshtein(a, b, maxDistance) {
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMin = current[0];

      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
        current[j] = value;
        rowMin = Math.min(rowMin, value);
      }

      if (rowMin > maxDistance) return maxDistance + 1;
      previous = current;
    }

    return previous[b.length];
  }

  function fuzzyTokenScore(token, candidate) {
    token = normalizeText(token);
    candidate = normalizeText(candidate);
    if (!token || !candidate) return 0;
    if (token === candidate) return 12;
    if (candidate.startsWith(token)) return token.length > 2 ? 9 : 4;
    if (token.startsWith(candidate) && candidate.length > 2) return 6;
    if (candidate.includes(token)) return token.length > 2 ? 6 : 2;

    if (token.length < 3 || candidate.length < 3) return 0;

    const maxDistance = token.length <= 3 ? 2 : token.length <= 6 ? 2 : 3;
    const distance = boundedLevenshtein(token, candidate, maxDistance);
    if (distance <= maxDistance) {
      return Math.max(1, (maxDistance - distance + 1) * 2);
    }

    if (candidate.length > token.length) {
      const prefix = candidate.slice(0, token.length);
      const prefixDistance = boundedLevenshtein(token, prefix, maxDistance);
      if (prefixDistance <= maxDistance) {
        return Math.max(1, (maxDistance - prefixDistance + 1) * 2);
      }
    }

    return 0;
  }

  function productSearchData(product) {
    const normalizedName = normalizeText(product.name);
    const normalizedCategory = normalizeText(product.category || '');
    const blob = normalizeText(productTerms(product));

    return {
      normalizedName,
      normalizedCategory,
      blob,
      tokens: splitSearchTokens(blob),
    };
  }

  function productScore(product, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return 1;

    const data = productSearchData(product);
    let score = data.blob.includes(normalizedQuery) ? 12 : 0;
    if (data.normalizedName.includes(normalizedQuery)) score += 18;
    if (data.normalizedName.startsWith(normalizedQuery)) score += 10;

    searchTokens(query).forEach((token) => {
      if (data.blob.includes(token)) score += token.length > 3 ? 4 : 2;
      if (data.normalizedName.includes(token)) score += 5;
      if (data.normalizedName.startsWith(token)) score += 6;
      if (data.normalizedCategory.includes(token)) score += 3;

      const bestFuzzy = data.tokens.reduce((best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)), 0);
      if (bestFuzzy) score += bestFuzzy;
    });

    return score;
  }

  function cardSearchData(card) {
    const name = card.dataset.name || card.querySelector('h3')?.textContent || '';
    const match = productIndex.find(
      (product) =>
        normalizeText(product.name) === normalizeText(name) ||
        normalizeText(name).includes(normalizeText(product.name)),
    );
    return {
      name,
      category: card.dataset.category || match?.category || '',
      terms: `${card.textContent || ''} ${match?.terms || ''}`,
    };
  }

  function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
  }

  function currentPage() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const cleanRoutes = new Set([
      'produtos',
      'catalogo',
      'promocoes',
      'pedidos',
      'sobre',
      'contato',
      'login',
      'pagamento',
      'perfil',
      'editar-perfil',
      'configuracoes',
      'painel',
    ]);
    return cleanRoutes.has(page) ? `${page}.html` : page;
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

  function catalogHref() {
    return pageHref('catalogo.html');
  }

  function promotionsHref() {
    return pageHref('promocoes.html');
  }

  function ordersHref() {
    return pageHref('pedidos.html');
  }

  function featuredSearchProducts(limit = 6) {
    const featured = ['agua mineral', 'gas de cozinha', 'detergente', 'desinfetante', 'sabao omo', 'vassoura'];
    const highlighted = featured
      .map((term) => productIndex.find((product) => normalizeText(product.name).includes(term)))
      .filter(Boolean)
      .slice(0, limit);

    return uniqueProductList([...highlighted, ...productIndex]).slice(0, limit);
  }

  function directSearchProducts(query, limit = 5) {
    const term = String(query ?? '').trim();
    if (!term) return [];

    const normalizedTerm = normalizeText(term);
    const exact = productIndex.find((product) => normalizeText(product.name) === normalizedTerm);
    if (exact) return [exact];

    const scored = productIndex
      .map((product) => ({ ...product, score: productScore(product, term) }))
      .filter((product) => product.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'));
    const hasStrongMatches = scored.some((product) => product.score >= 6);

    return scored.filter((product) => (hasStrongMatches ? product.score >= 6 : product.score > 0)).slice(0, limit);
  }

  function searchSuggestionProducts(query, limit = 5) {
    const direct = directSearchProducts(query, limit);
    if (direct.length) return direct;
    return String(query ?? '').trim() ? featuredSearchProducts(Math.min(limit, 4)) : featuredSearchProducts(limit);
  }

  function searchSuggestionEntries(query, limit = 5) {
    const term = normalizeText(query);
    const entries = [];
    productIndex.forEach((product) => {
      const normalized = normalizeProduct(product);
      (normalized.options || []).forEach((option) => {
        const blob = normalizeText(`${normalized.name} ${option.name} ${normalized.category}`);
        if (term && blob.includes(term)) entries.push({ product: normalized, option });
      });
    });
    searchSuggestionProducts(query, limit).forEach((product) => entries.push({ product: normalizeProduct(product), option: null }));
    const seen = new Set();
    return entries
      .filter((entry) => {
        const key = `${entry.product.id || entry.product.name}|${entry.option?.id || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  }

  function catalogSearchProducts(query, limit = Infinity) {
    const term = String(query ?? '').trim();
    if (!term) return [];

    const normalizedTerm = normalizeText(term);
    const queryTokens = splitSearchTokens(term);
    const exact = productIndex.filter((product) => normalizeText(product.name) === normalizedTerm);
    if (exact.length) return exact.slice(0, limit);

    const phraseMatches = productIndex
      .filter((product) => {
        const productName = normalizeText(product.name);
        return productName.includes(normalizedTerm) || normalizedTerm.includes(productName);
      })
      .sort(
        (a, b) => normalizeText(a.name).length - normalizeText(b.name).length || a.name.localeCompare(b.name, 'pt-BR'),
      );

    if (phraseMatches.length) return phraseMatches.slice(0, limit);

    const scored = productIndex
      .map((product) => {
        const data = productSearchData(product);
        const nameTokens = splitSearchTokens(product.name);
        const contextTokens = splitSearchTokens(`${product.category || ''} ${product.terms || ''}`);
        let nameScore = 0;
        let totalScore = 0;
        let matchedTokens = 0;

        queryTokens.forEach((token) => {
          const directNameHit = data.normalizedName.includes(token);
          const bestNameScore = nameTokens.reduce(
            (best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)),
            0,
          );

          if (directNameHit || bestNameScore >= 5) {
            const score = Math.max(bestNameScore, directNameHit ? 8 : 0);
            nameScore += score;
            totalScore += score + 4;
            matchedTokens += 1;
            return;
          }

          const directContextHit = data.blob.includes(token);
          const bestContextScore = contextTokens.reduce(
            (best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)),
            0,
          );
          if (directContextHit || bestContextScore >= 6) {
            totalScore += Math.max(bestContextScore, directContextHit ? 4 : 0);
            matchedTokens += 1;
          }
        });

        return {
          ...product,
          nameScore,
          totalScore,
          matchedTokens,
        };
      })
      .filter((product) => {
        if (!queryTokens.length || product.matchedTokens < queryTokens.length) return false;
        if (product.nameScore > 0) return true;
        return product.totalScore >= (queryTokens.length > 1 ? 10 : 8);
      })
      .sort((a, b) => {
        if (b.nameScore !== a.nameScore) return b.nameScore - a.nameScore;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.name.localeCompare(b.name, 'pt-BR');
      });

    const nameMatches = scored.filter((product) => product.nameScore > 0);
    const finalMatches = nameMatches.length ? nameMatches : scored;
    return finalMatches
      .slice(0, limit)
      .map(({ nameScore: _nameScore, totalScore: _totalScore, matchedTokens: _matchedTokens, ...product }) => product);
  }

  function cardMatchesCatalogProduct(card, product) {
    const cardName = normalizeText(card.dataset.name || card.querySelector('h3')?.textContent || '');
    const productName = normalizeText(product.name);
    return cardName === productName || cardName.includes(productName) || productName.includes(cardName);
  }

  function cardMatchesCatalogQuery(card, query, allowContext = false) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return true;

    const data = cardSearchData(card);
    const normalizedName = normalizeText(data.name);
    const tokens = splitSearchTokens(query);
    if (!tokens.length) return false;
    if (
      normalizedName === normalizedQuery ||
      normalizedName.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedName)
    )
      return true;

    const nameTokens = splitSearchTokens(data.name);
    const contextBlob = normalizeText(`${data.category || ''} ${data.terms || ''}`);
    const contextTokens = splitSearchTokens(`${data.category || ''} ${data.terms || ''}`);
    let nameMatches = 0;
    let contextMatches = 0;

    tokens.forEach((token) => {
      const directNameHit = normalizedName.includes(token);
      const bestNameScore = nameTokens.reduce(
        (best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)),
        0,
      );
      if (directNameHit || bestNameScore >= 5) {
        nameMatches += 1;
        return;
      }

      if (!allowContext) return;

      const directContextHit = contextBlob.includes(token);
      const bestContextScore = contextTokens.reduce(
        (best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)),
        0,
      );
      if (directContextHit || bestContextScore >= 6) contextMatches += 1;
    });

    return nameMatches + contextMatches >= tokens.length && (nameMatches > 0 || allowContext);
  }

  function resolveSearchProduct(productOrName) {
    const value = typeof productOrName === 'string' ? productOrName : productOrName?.name;
    const normalized = normalizeText(value);
    if (!normalized) return null;

    const resolved =
      productIndex.find((product) => normalizeText(product.name) === normalized) ||
      productIndex.find((product) => {
        const productName = normalizeText(product.name);
        return productName.includes(normalized) || normalized.includes(productName);
      }) ||
      (typeof productOrName === 'object' ? productOrName : null);
    return typeof productOrName === 'object' && productOrName?.preferredVariationId && resolved
      ? { ...resolved, preferredVariationId: productOrName.preferredVariationId }
      : resolved;
  }

  function uniqueProducts(products) {
    const seen = new Set();
    return products
      .map(resolveSearchProduct)
      .filter(Boolean)
      .filter((product) => {
        const key = normalizeText(product.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function productCatalogCard(product) {
    return qsa('.catalog-product, .rail-product, .product-card').find((card) =>
      cardMatchesCatalogProduct(card, product),
    );
  }

  function productAssetFallback(productName) {
    const name = normalizeText(productName);
    const images = [
      ['agua', 'assets/produtos/v2/agua-mineral-20l.png'],
      ['gas', 'assets/produtos/v2/gas-p13.png'],
      ['alcool', 'assets/produtos/v2/alcool-perfumado.png'],
      ['amaciante', 'assets/produtos/v2/amaciante-2l.png'],
      ['candida colorida', 'assets/produtos/v2/candida-colorida.png'],
      ['candida', 'assets/produtos/v2/candida-2l.png'],
      ['cloro 1', 'assets/produtos/v2/cloro-1l.png'],
      ['cloro 2', 'assets/produtos/v2/cloro-2l.png'],
      ['detergente', 'assets/produtos/v2/detergente-2l.png'],
      ['desinfetante', 'assets/produtos/v2/desinfetante-2l.png'],
      ['limpa aluminio', 'assets/produtos/v2/limpa-aluminio.png'],
      ['limpa pedra 500', 'assets/produtos/v2/limpa-pedra-500ml.png'],
      ['limpa pedra', 'assets/produtos/v2/limpa-pedra-2l.png'],
      ['sabao de coco', 'assets/produtos/v2/sabao-coco.png'],
      ['sabao omo', 'assets/produtos/v2/sabao-omo.png'],
      ['sabonete', 'assets/produtos/v2/sabonete-liquido.png'],
      ['escova de roupa', 'assets/produtos/v2/escova-roupa.png'],
      ['escova de vaso', 'assets/produtos/v2/escova-vaso.png'],
      ['esponja de aco', 'assets/produtos/v2/esponja-aco.png'],
      ['esponja de louca', 'assets/produtos/v2/esponja-louca.png'],
      ['esponjao', 'assets/produtos/v2/esponjao.png'],
      ['bombril', 'assets/produtos/v2/bombril.png'],
      ['pasta de brilho', 'assets/produtos/v2/pasta-brilho.png'],
      ['pedra de vaso', 'assets/produtos/v2/pedra-vaso.png'],
      ['prendedor de madeira', 'assets/produtos/v2/prendedor-madeira.png'],
      ['prendedor plastico', 'assets/produtos/v2/prendedor-plastico.png'],
      ['rodo grande', 'assets/produtos/v2/rodo-grande.png'],
      ['rodo pequeno', 'assets/produtos/v2/rodo-pequeno.png'],
      ['rodinho', 'assets/produtos/v2/rodinho-pia.png'],
      ['saco de lixo', 'assets/produtos/v2/saco-lixo.png'],
      ['vassoura', 'assets/produtos/v2/vassoura.png'],
      ['pa', 'assets/produtos/v2/pa.png'],
    ];

    return images.find(([term]) => name.includes(term))?.[1] || '';
  }

  function productAssetPath(product, card = productCatalogCard(product)) {
    const productImage = resolveProductImagePath(product?.image || '', product?.name || '');
    if (productImage) return productImage;
    if (product?.id && !String(product.id).startsWith('local-') && Object.prototype.hasOwnProperty.call(product, 'image')) {
      return '';
    }

    const cardImage = card?.querySelector('.product-image')?.getAttribute('src');
    if (cardImage) return canonicalAssetPath(cardImage);

    return productAssetFallback(product?.name || '');
  }

  function productDescription(product, card = productCatalogCard(product)) {
    return (
      card?.querySelector('p')?.textContent?.trim() ||
      `Produto de ${product.category || 'catálogo'} pronto para adicionar ao seu pedido.`
    );
  }

  function normalizeVariationStockValue(value) {
    if (value === null || value === undefined || value === '') return null;
    const stock = Number(value);
    return Number.isFinite(stock) ? stock : null;
  }

  function productOptions(product, card = productCatalogCard(product)) {
    if (Array.isArray(product?.options) && product.options.length) {
      return product.options.map((option) => ({
        id: option.id || option.variationId || '',
        label: option.label || option.name || option.value || 'Opcao',
        value: option.id || option.variationId || option.value || option.name || option.label || '',
        name: option.name || option.value || option.label || '',
        price: Number(option.price || product.price || 0),
        stock: normalizeVariationStockValue(option.stock),
        canBuy: option.canBuy ?? option.pode_comprar,
        unavailable: option.unavailable ?? option.indisponivel,
        image: option.image || '',
      }));
    }

    const existingSelect = card?.querySelector('.product-option');
    if (existingSelect) {
      return [...existingSelect.options].map((option) => ({
        id: option.dataset.variationId || '',
        label: option.textContent.trim(),
        value: option.value || option.textContent.trim(),
        name: option.dataset.variationName || option.textContent.trim(),
        price: Number(option.dataset.price || product.price || 0),
        stock: normalizeVariationStockValue(option.dataset.stock),
        canBuy: option.dataset.available === '' ? undefined : option.dataset.available !== 'false',
        unavailable: option.dataset.available === 'false',
        image: option.dataset.image || '',
      }));
    }

    return [
      {
        id: '',
        label: 'Padrao',
        value: '',
        name: '',
        price: Number(product.price || 0),
        stock: product.stock,
        canBuy: product.canBuy ?? product.pode_comprar,
        unavailable: product.unavailable ?? product.indisponivel,
        image: '',
      },
    ];
    if (Array.isArray(product?.options) && product.options.length) {
      return product.options.map((option) => ({
        label: option.label || option.value || 'Opção',
        value: option.value || option.label || '',
        price: Number(option.price || product.price || 0),
      }));
    }

    const select = card?.querySelector('.product-option');
    if (select) {
      return [...select.options].map((option) => ({
        label: option.textContent.trim(),
        value: option.value || option.textContent.trim(),
        price: Number(option.dataset.price || product.price || 0),
      }));
    }

    return [{ label: 'Padrão', value: '', price: Number(product.price || 0) }];
  }

  function openSearchProductFromQuery(query) {
    const term = String(query ?? '').trim();
    if (!term) {
      showToast('Digite o produto que você quer encontrar.');
      return;
    }

    const direct = directSearchProducts(term, 6);
    const matches = direct.length ? direct : searchSuggestionProducts(term, 6);
    if (!matches.length) {
      showToast('Nenhum produto encontrado para essa busca.');
      return;
    }

    if (['produtos.html', 'catalogo.html', 'promocoes.html'].includes(currentPage())) {
      const catalogInput = qs('[data-catalog-search]') || qs('[data-full-catalog-search]');
      if (catalogInput) {
        catalogInput.value = term;
        if (catalogInput.matches('[data-catalog-search]')) {
          activateCatalogFilter('all');
          applyCatalogFilters();
          scrollCatalogToTop('smooth');
        } else {
          qsa('[data-full-catalog-filter]').forEach((button) =>
            button.classList.toggle('active', button.dataset.fullCatalogFilter === 'all'),
          );
          renderFullCatalogPage();
          qs('[data-full-catalog-list]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
    }

    openProductSearchModal(matches[0], matches, term);
  }

  function ensureProductSearchModalShell() {
    if (qs('.product-search-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'product-search-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Produto pesquisado');
    modal.innerHTML = `
      <div class="product-search-backdrop" data-close-product-search></div>
      <article class="product-search-panel">
        <button class="icon-button product-search-close" type="button" data-close-product-search aria-label="Fechar produto">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="product-search-content" data-product-search-content></div>
      </article>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-product-search]')) {
        closeProductSearchModal();
        return;
      }

      const resultButton = event.target.closest('[data-product-result-index]');
      if (resultButton) {
        const index = Number(resultButton.dataset.productResultIndex || 0);
        const nextProduct = productSearchResults[index];
        if (nextProduct) renderProductSearchModal(nextProduct);
        return;
      }

      const addButton = event.target.closest('[data-add-search-product]');
      if (!addButton || !activeSearchProduct) return;

      const options = productOptions(activeSearchProduct);
      const selectedIndex = Number(qs('[data-product-search-variant]', modal)?.value || 0);
      const selected = options[selectedIndex] || options[0];
      addToCart({
        productId: activeSearchProduct.id || '',
        variationId: selected?.id || '',
        name: activeSearchProduct.name,
        variant: selected?.name || '',
        price: Number(selected?.price || activeSearchProduct.price || 0),
        image: selected?.image || productAssetPath(activeSearchProduct),
        stock: selected?.stock ?? activeSearchProduct.stock,
      });
      closeProductSearchModal();
    });
  }

  function openProductSearchModal(product, results = [], query = '') {
    const resolved = resolveSearchProduct(product);
    if (!resolved) {
      showToast('Produto não encontrado.');
      return;
    }

    productSearchResults = uniqueProducts(results.length ? results : [resolved]);
    if (!productSearchResults.some((item) => normalizeText(item.name) === normalizeText(resolved.name))) {
      productSearchResults.unshift(resolved);
    }

    const modal = qs('.product-search-modal');
    if (!modal) return;
    modal.dataset.searchTerm = query;
    renderProductSearchModal(resolved);
    lockPageScroll();
    modal.classList.add('open');
    document.body.classList.add('product-search-open');
  }

  function closeProductSearchModal() {
    qs('.product-search-modal')?.classList.remove('open');
    document.body.classList.remove('product-search-open');
    unlockPageScroll();
    activeSearchProduct = null;
  }

  function renderProductSearchModal(product) {
    activeSearchProduct = resolveSearchProduct(product);
    const content = qs('[data-product-search-content]');
    if (!content || !activeSearchProduct) return;

    const card = productCatalogCard(activeSearchProduct);
    const image = productAssetPath(activeSearchProduct, card);
    const description = productDescription(activeSearchProduct, card);
    const options = productOptions(activeSearchProduct, card);
    const preferredOption = options.find((option) => String(option.id) === String(activeSearchProduct.preferredVariationId || ''));
    const firstOption = preferredOption || options[0] || { price: activeSearchProduct.price || 0 };
    const resultButtons =
      productSearchResults.length > 1
        ? `
        <div class="product-search-more">
          <span>
            <strong>Outras sugestões</strong>
            <small>Produtos relacionados à sua busca</small>
          </span>
          <div>
            ${productSearchResults
              .map((result, index) => {
                const resultImage = assetHref(productAssetPath(result));
                return `
                <button class="${normalizeText(result.name) === normalizeText(activeSearchProduct.name) ? 'active' : ''}" type="button" data-product-result-index="${index}">
                  <span class="product-search-more-thumb">
                    ${
                      resultImage
                        ? `<img src="${escapeHTML(resultImage)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">${productPlaceholderHTML(result, 'product-placeholder-compact')}`
                        : productPlaceholderHTML(result, 'product-placeholder-compact')
                    }
                  </span>
                  <span>${escapeHTML(result.name)}</span>
                </button>
              `;
              })
              .join('')}
          </div>
        </div>
      `
        : '';

    content.innerHTML = `
      <div class="product-search-media">
        ${productMediaHTML(activeSearchProduct, image)}
      </div>
      <div class="product-search-info">
        <span class="eyebrow">Resultado principal</span>
        <h2>${escapeHTML(activeSearchProduct.name)}</h2>
        <span class="product-search-category">${escapeHTML(activeSearchProduct.category || 'Produto encontrado')}</span>
        <p>${escapeHTML(description)}</p>
        <strong data-product-search-price>${formatMoney(firstOption.price || activeSearchProduct.price)}</strong>
        <small class="product-stock-line ${optionOutOfStock(firstOption) ? 'is-unavailable' : 'is-empty'}">${escapeHTML(
          activeSearchProduct.hasVariations
            ? customerAvailabilityText(activeSearchProduct, firstOption)
            : customerAvailabilityText(activeSearchProduct),
        )}</small>
        ${
          activeSearchProduct.hasVariations && options.length
            ? `
          <label class="product-search-variant">
            <span>Escolha uma opção</span>
            <select data-product-search-variant>
              ${options.map((option, index) => `<option value="${index}" ${String(option.id) === String(firstOption.id || '') ? 'selected' : ''}>${escapeHTML(optionPriceLabel(option, activeSearchProduct))}</option>`).join('')}
            </select>
          </label>
        `
            : ''
        }
        ${resultButtons}
        <div class="product-search-actions">
          <button class="btn btn-primary" type="button" data-add-search-product>
            <i class="fa-solid fa-cart-plus"></i>
            Adicionar ao carrinho
          </button>
          <button class="btn btn-secondary" type="button" data-close-product-search>Agora não</button>
        </div>
      </div>
    `;

    qs('[data-product-search-variant]', content)?.addEventListener('change', (event) => {
      const selected = options[Number(event.target.value || 0)] || firstOption;
      const price = qs('[data-product-search-price]', content);
      const stockLine = qs('.product-stock-line', content);
      if (price) price.textContent = formatMoney(selected.price || activeSearchProduct.price);
      if (stockLine) {
        const text = customerAvailabilityText(activeSearchProduct, selected);
        stockLine.textContent = text;
        stockLine.classList.toggle('is-empty', !text);
        stockLine.classList.toggle('is-unavailable', Boolean(text));
      }
    });
  }

  function activateCatalogFilter(filter = 'all') {
    const chips = qsa('[data-filter]');
    const target = chips.some((chip) => chip.dataset.filter === filter) ? filter : 'all';
    chips.forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.filter === target);
    });
    return target;
  }

  function catalogFilterFromHash(hash = location.hash) {
    const slug = categorySlug(decodeURIComponent(String(hash || '').replace(/^#/, '')));
    if (!slug || ['todos-produtos', 'todos', 'catalogo', 'produtos'].includes(slug)) return 'all';
    if (['aguas', 'agua-mineral', 'agua-minerais'].includes(slug)) return 'agua';
    if (['gases', 'gas-de-cozinha'].includes(slug)) return 'gas';
    if (['oferta', 'ofertas', 'promocoes', 'promocao'].includes(slug)) return 'ofertas';
    if (['kit', 'kits'].includes(slug)) return 'kits';
    if (slug === 'recomendados') return 'recommended';
    return slug;
  }

  function applyCatalogHashFilter(shouldApplyFilters = true) {
    if (currentPage() !== 'produtos.html' || !location.hash) return false;
    const filter = catalogFilterFromHash(location.hash);
    activateCatalogFilter(filter);
    if (shouldApplyFilters) applyCatalogFilters();
    return true;
  }

  function updateCatalogSearchURL(term) {
    if (currentPage() !== 'produtos.html') return;

    const url = new URL(location.href);
    const value = String(term ?? '').trim();
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    url.hash = 'todos-produtos';
    history.replaceState(null, '', url);
  }

  function scrollCatalogToTop(behavior = 'smooth') {
    const target = qs('#todos-produtos') || qs('.catalog-tools');
    if (!target) return;

    const navHeight = qs('.navbar')?.getBoundingClientRect().height || 0;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - navHeight - 8);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top, behavior });
    });
  }

  function runCatalogSearch(term, options = {}) {
    const { scroll = true, syncURL = true, resetFilter = true, behavior = 'smooth' } = options;
    const value = String(term ?? '').trim();
    const catalogInput = qs('[data-catalog-search]');

    if (catalogInput) catalogInput.value = value;
    if (resetFilter) activateCatalogFilter('all');
    applyCatalogFilters();
    if (syncURL) updateCatalogSearchURL(value);
    if (scroll) scrollCatalogToTop(behavior);
  }

  function safeRedirectTarget(value, fallback = profileHref()) {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^(?:https?:|\/\/|javascript:|data:)/i.test(raw)) return fallback;

    try {
      const url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return fallback;
      const page = url.pathname.split('/').pop() || 'index.html';
      const allowedPages = new Set([
        'index.html',
        'produtos.html',
        'catalogo.html',
        'promocoes.html',
        'pagamento.html',
        'perfil.html',
        'pedidos.html',
        'editar-perfil.html',
        'configuracoes.html',
        'painel.html',
        'sobre.html',
        'contato.html',
      ]);
      if (!allowedPages.has(page)) return fallback;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_error) {
      return fallback;
    }
  }

  function loginHref(params = {}) {
    const cleanParams = { ...params };
    if (cleanParams.redirect) cleanParams.redirect = safeRedirectTarget(cleanParams.redirect, '');
    if (!cleanParams.redirect) delete cleanParams.redirect;
    const query = new URLSearchParams(cleanParams).toString();
    return `${pageHref('login.html')}${query ? `?${query}` : ''}`;
  }

  function profileHref() {
    return pageHref('perfil.html');
  }

  function adminPanelHref() {
    return ADMIN_PANEL_HREF;
  }

  function checkoutHref() {
    return pageHref('pagamento.html');
  }

  function currentLocationForRedirect() {
    const page = currentPage();
    const path = insidePages() ? page : page === 'index.html' ? 'index.html' : page;
    return `${path}${location.search}${location.hash}`;
  }

  function profileComplete(user = currentUser) {
    return Boolean(user?.name && user?.phone && user?.address);
  }

  function firstName(user = currentUser) {
    return String(user?.nick || user?.name || 'Cliente').split(' ')[0];
  }

  function ensureCustomerProfile() {
    return currentUser?.email ? currentUser : null;
  }

  function cartSubtotal() {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }

  function activeCoupons() {
    return normalizeCoupons(siteConfig.coupons).filter((coupon) => coupon.active);
  }

  function couponByCode(code = '') {
    const normalized = normalizeText(code)
      .replace(/[^a-z0-9]+/g, '')
      .toUpperCase();
    return activeCoupons().find((coupon) => coupon.code === normalized) || null;
  }

  function couponDiscountAmount(coupon, subtotal = cartSubtotal()) {
    if (!coupon || subtotal < Number(coupon.minSubtotal || 0)) return 0;
    const discount =
      coupon.type === 'percent' ? subtotal * (Number(coupon.value || 0) / 100) : Number(coupon.value || 0);
    return Math.min(subtotal, Math.max(0, Number(discount.toFixed(2))));
  }

  function currentCoupon() {
    if (!appliedCoupon?.code) return null;
    return couponByCode(appliedCoupon.code);
  }

  function couponDiscount() {
    return couponDiscountAmount(currentCoupon());
  }

  function saveAppliedCoupon(coupon) {
    appliedCoupon = coupon ? { code: coupon.code } : null;
    if (appliedCoupon) saveJSON(STORAGE.coupon, appliedCoupon);
    else localStorage.removeItem(STORAGE.coupon);
  }

  function productStockLevel(product = {}) {
    const raw = product.estoque ?? product.stock;
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Math.round(parsePrice(raw));
    return Number.isFinite(value) ? Math.max(0, value) : null;
  }

  function productLowStockLimit(product = {}) {
    const value = Math.round(
      parsePrice(product.estoque_minimo ?? product.lowStockLimit ?? siteConfig.stockAlertThreshold),
    );
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_SITE_CONFIG.stockAlertThreshold;
  }

  function productStockState(product = {}) {
    if (product.indisponivel === true || product.unavailable === true || product.pode_comprar === false || product.canBuy === false)
      return 'out';
    const stock = productStockLevel(product);
    const limit = productLowStockLimit(product);
    if (stock === null && (product.pode_comprar === true || product.canBuy === true)) return 'ok';
    if (stock === null) return 'untracked';
    if (stock <= 0) return 'out';
    if (stock <= limit) return 'low';
    return 'ok';
  }

  function variationStockState(variation = {}, lowStockLimit = siteConfig.stockAlertThreshold) {
    if (
      variation.indisponivel === true ||
      variation.unavailable === true ||
      variation.pode_comprar === false ||
      variation.canBuy === false
    )
      return 'out';
    const stock = variation.stock;
    if ((stock === null || stock === undefined || stock === '') && (variation.pode_comprar === true || variation.canBuy === true))
      return 'ok';
    if (stock === null || stock === undefined || stock === '') return 'untracked';
    const value = Number(stock);
    if (!Number.isFinite(value)) return 'untracked';
    if (value <= 0) return 'out';
    if (value <= lowStockLimit) return 'low';
    return 'ok';
  }

  function productVariationsStockState(variations = [], lowStockLimit = siteConfig.stockAlertThreshold) {
    if (!variations.length) return 'untracked';
    const states = variations.map((variation) => variationStockState(variation, lowStockLimit));
    if (states.every((state) => state === 'out')) return 'out';
    if (states.some((state) => state === 'low')) return 'low';
    if (states.some((state) => state === 'ok')) return 'ok';
    return 'untracked';
  }

  function ownerDeliveryFee() {
    const value = parsePrice(ownerConfig.deliveryFee ?? DELIVERY_FEE);
    return Number.isFinite(value) && value >= 0 ? value : DELIVERY_FEE;
  }

  function ownerFreeShippingFrom() {
    const value = parsePrice(ownerConfig.freeShippingFrom ?? FREE_SHIPPING_FROM);
    return Number.isFinite(value) && value >= 0 ? value : FREE_SHIPPING_FROM;
  }

  function ownerGiftText() {
    return cleanConfigText(ownerConfig.giftText, DEFAULT_OWNER.giftText);
  }

  function deliveryFee() {
    return cartSubtotal() >= ownerFreeShippingFrom() || cartSubtotal() === 0 ? 0 : ownerDeliveryFee();
  }

  function orderTotal() {
    return Math.max(0, cartSubtotal() - couponDiscount()) + deliveryFee();
  }

  function cartCount() {
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function hasGasGift() {
    return cart.some((item) => normalizeText(item.name).includes('gas'));
  }

  function ownerWhatsApp() {
    return onlyDigits(ownerConfig.whatsapp) || DEFAULT_OWNER.whatsapp;
  }

  function makeCartId(name, variant = '', variationId = '') {
    return normalizeText(`${name} ${variationId || variant}`)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function canonicalAssetPath(src) {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    const clean = src.replaceAll('\\', '/');
    const index = clean.indexOf('assets/');
    return index >= 0 ? clean.slice(index) : clean.replace(/^\.\.\//, '').replace(/^\.\//, '');
  }

  function resolveProductImagePath(src, productName = '') {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;

    const clean = String(src).trim().replaceAll('\\', '/').replace(/^\/+/, '');
    if (!clean) return '';
    if (clean.includes('assets/')) return canonicalAssetPath(clean);
    if (clean.startsWith('produtos/v2/')) return `assets/${clean}`;
    if (clean.startsWith('produtos/')) return `assets/produtos/v2/${clean.replace(/^produtos\//, '')}`;
    if (clean.startsWith('site/v2/')) return `assets/produtos/${clean}`;
    if (clean.startsWith('site/')) return `assets/produtos/site/v2/${clean.replace(/^site\//, '')}`;
    if (/\.(png|jpe?g|webp|svg|gif)$/i.test(clean)) return `assets/produtos/v2/${clean}`;

    const fallback = productAssetFallback(productName || clean);
    return fallback || clean;
  }

  function assetHref(src) {
    if (!src || /^(https?:|data:|blob:)/.test(src)) return src || '';
    const clean = canonicalAssetPath(src);
    return `${insidePages() ? '../' : ''}${clean}`;
  }

  function toastIcon(type = 'info') {
    return (
      {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        order: 'fa-clipboard-list',
        install: 'fa-mobile-screen-button',
        info: 'fa-circle-info',
      }[type] || 'fa-circle-info'
    );
  }

  function ensureToastStack() {
    let stack = qs('.toast-stack');
    if (stack) return stack;
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-atomic', 'false');
    document.body.appendChild(stack);
    return stack;
  }

  function showToast(message, options = {}) {
    const config = typeof options === 'string' ? { type: options } : options || {};
    const type = config.type || 'info';
    const stack = ensureToastStack();
    const toast = document.createElement('div');
    toast.className = `toast toast-modern toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="toast-icon"><i class="fa-solid ${toastIcon(type)}"></i></span>
      <span class="toast-copy">
        ${config.title ? `<strong>${escapeHTML(config.title)}</strong>` : ''}
        <span>${escapeHTML(message)}</span>
      </span>
      ${config.actionLabel ? `<button class="toast-action" type="button">${escapeHTML(config.actionLabel)}</button>` : ''}
      <button class="toast-close" type="button" aria-label="Fechar aviso"><i class="fa-solid fa-xmark"></i></button>
    `;
    stack.appendChild(toast);

    const close = () => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 220);
    };

    qs('.toast-close', toast)?.addEventListener('click', close);
    qs('.toast-action', toast)?.addEventListener('click', () => {
      if (typeof config.onAction === 'function') config.onAction();
      close();
    });

    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(close, Number(config.duration || 3600));
  }

  function applySavedTheme() {
    if (!localStorage.getItem(STORAGE.theme)) localStorage.removeItem(STORAGE.legacyTheme);
    setThemeMode(currentThemeMode(), false);
    bindSystemThemeSync();
  }

  function currentThemeMode() {
    const stored = localStorage.getItem(STORAGE.theme);
    return THEME_MODES.includes(stored) ? stored : 'system';
  }

  function preferredSystemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function resolveThemeMode(mode = currentThemeMode()) {
    return mode === 'system' ? preferredSystemTheme() : mode;
  }

  function bindSystemThemeSync() {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media || bindSystemThemeSync.bound) return;

    bindSystemThemeSync.bound = true;
    const syncTheme = () => {
      if (currentThemeMode() !== 'system') return;
      setThemeMode('system', false);
    };

    if (media.addEventListener) media.addEventListener('change', syncTheme);
    else media.addListener?.(syncTheme);
  }

  function setTheme(theme, persist = true) {
    setThemeMode(THEME_MODES.includes(theme) ? theme : 'system', persist);
  }

  function setThemeMode(mode, persist = true) {
    const themeMode = THEME_MODES.includes(mode) ? mode : 'system';
    const resolvedTheme = resolveThemeMode(themeMode);
    const isLight = resolvedTheme !== 'dark';
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = themeMode;
    document.body.classList.toggle('light-mode', isLight);
    document.body.dataset.theme = resolvedTheme;
    document.body.dataset.themeMode = themeMode;
    document.body.dataset.themeResolved = resolvedTheme;
    qs('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#eef3f8' : '#091525');
    if (persist) localStorage.setItem(STORAGE.theme, themeMode);
    updateThemeControls();
  }

  function updateThemeControls() {
    const themeMode = document.body.dataset.themeMode || currentThemeMode();
    const resolvedTheme = document.body.dataset.themeResolved || resolveThemeMode(themeMode);
    const isLight = resolvedTheme !== 'dark';
    const darkToggle = qs('#dark-mode-toggle');
    const current = qs('#theme-current');
    const preview = qs('#theme-preview');

    if (darkToggle) {
      darkToggle.classList.toggle('active', !isLight);
      darkToggle.setAttribute('aria-pressed', String(!isLight));
    }

    qsa('[data-theme-choice]').forEach((button) => {
      const active = button.dataset.themeChoice === themeMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
      button.setAttribute('aria-pressed', String(active));
    });

    if (current) {
      current.textContent =
        themeMode === 'system'
          ? `Seguindo o dispositivo: modo ${isLight ? 'claro' : 'noturno'}`
          : `Modo ${isLight ? 'claro' : 'noturno'} ativado`;
    }

    if (preview) {
      preview.textContent = themeMode === 'system' ? 'Sistema' : isLight ? 'Claro' : 'Noturno';
      preview.className = `badge theme-badge theme-${themeMode}`;
    }
  }

  function upgradeProductImages() {
    qsa('.product-card .product-image').forEach((img) => {
      const original = img.getAttribute('src') || '';
      if (!original || original.includes('/site/') || original.endsWith('.svg')) return;

      const enhanced = original.replace('/produtos/', '/produtos/site/');
      img.dataset.originalSrc = original;
      img.src = enhanced;
      img.addEventListener(
        'error',
        () => {
          img.src = img.dataset.originalSrc || original;
        },
        { once: true },
      );
    });
  }

  function navLinkPage(link) {
    return (link?.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop() || 'index.html';
  }

  function ensureClientOrdersLink(container) {
    if (!container) return;
    const orderLinks = qsa('a', container).filter(
      (link) => link.hasAttribute('data-client-orders-link') || navLinkPage(link) === 'pedidos.html',
    );
    orderLinks.slice(1).forEach((link) => link.remove());
    if (orderLinks.length) return;

    const markup = `<a href="${ordersHref()}" data-client-orders-link>Pedidos</a>`;
    const productsLink = qsa('a', container).find((link) => navLinkPage(link) === 'produtos.html');
    if (productsLink) productsLink.insertAdjacentHTML('afterend', markup);
    else container.insertAdjacentHTML('beforeend', markup);
  }

  function cleanupDuplicateOrderLinks() {
    qsa('.nav-menu, .mobile-menu, .footer-links').forEach((container) => {
      const links = qsa('a', container).filter(
        (link) => link.hasAttribute('data-client-orders-link') || navLinkPage(link) === 'pedidos.html',
      );
      links.slice(1).forEach((link) => link.remove());
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

    ensureClientOrdersLink(navMenu);

    if (navMenu && !qs('[data-admin-panel-link="nav"]', navMenu)) {
      navMenu.insertAdjacentHTML(
        'beforeend',
        `
        <a class="hidden nav-admin-link" href="${adminPanelHref()}" data-admin-panel-link="nav">
          <span class="nav-admin-label">Admin</span>
          <span class="admin-order-badge is-empty" data-admin-order-count aria-label="0 pedidos pendentes">0</span>
        </a>
      `,
      );
    }
    if (!qs('.nav-search', navInner)) {
      const search = document.createElement('form');
      search.className = 'nav-search';
      search.setAttribute('role', 'search');
      search.dataset.siteSearchForm = '';
      search.innerHTML = `
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" name="busca" data-site-search-input placeholder="Pesquisar agua, gas ou limpeza">
        <button type="submit" aria-label="Buscar produto">
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;
      navInner.insertBefore(search, navMenu?.nextSibling || mobileToggle || null);
    }

    if (mobileToggle && !qs('.nav-search-trigger', navInner)) {
      const trigger = document.createElement('button');
      trigger.className = 'nav-search-trigger';
      trigger.type = 'button';
      trigger.dataset.navSearchToggle = '';
      trigger.setAttribute('aria-label', 'Abrir pesquisa');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i><span>Buscar produto</span>';
      navInner.insertBefore(trigger, mobileToggle);
    }
    syncTopNavControls();
    if (document.body.dataset.topNavControlsBound !== 'true') {
      window.addEventListener('resize', syncTopNavControls, { passive: true });
      window.visualViewport?.addEventListener('resize', syncTopNavControls, { passive: true });
      document.body.dataset.topNavControlsBound = 'true';
    }

    if (!qs('.nav-actions', navInner)) {
      const actions = document.createElement('div');
      actions.className = 'nav-actions';
      actions.innerHTML = `
        <a class="nav-icon nav-whatsapp-link" href="https://wa.me/${ownerWhatsApp()}" target="_blank" rel="noreferrer" aria-label="Chamar no WhatsApp">
          <i class="fa-brands fa-whatsapp"></i>
          <span>WhatsApp</span>
        </a>
        <a class="nav-pill nav-account-link" href="${profileHref()}" aria-label="Abrir perfil do cliente">
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

    const navActions = qs('.nav-actions', navInner);
    if (navActions && !qs('.nav-whatsapp-link', navActions)) {
      navActions.insertAdjacentHTML(
        'afterbegin',
        `
        <a class="nav-icon nav-whatsapp-link" href="https://wa.me/${ownerWhatsApp()}" target="_blank" rel="noreferrer" aria-label="Chamar no WhatsApp">
          <i class="fa-brands fa-whatsapp"></i>
          <span>WhatsApp</span>
        </a>
      `,
      );
    }

    qsa('.mobile-top-actions').forEach((actions) => actions.remove());
    document.body.classList.remove('has-mobile-top-actions');

    const mobileMenu = qs('.mobile-menu');
    ensureClientOrdersLink(mobileMenu);
    qsa('.footer-links').forEach(ensureClientOrdersLink);
    cleanupDuplicateOrderLinks();
    if (mobileMenu && !qs('[data-mobile-extra]', mobileMenu)) {
      mobileMenu.insertAdjacentHTML(
        'beforeend',
        `
        <div class="mobile-menu-divider" data-mobile-extra></div>
        <a class="mobile-only-link nav-account-link" href="${profileHref()}" data-mobile-extra>
          <span class="mobile-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span data-account-label>Entrar ou cadastrar</span>
        </a>
        <a class="mobile-only-link hidden" href="${adminPanelHref()}" data-admin-panel-link="mobile" data-mobile-extra>
          <i class="fa-solid fa-gauge-high"></i>
          Painel Admin
        </a>
        <button class="mobile-only-link mobile-menu-button" type="button" data-open-cart data-mobile-extra>
          <i class="fa-solid fa-bag-shopping"></i>
          Carrinho
          <strong data-cart-count>0</strong>
        </button>
      `,
      );
    }
    updateAdminPanelLinks();
    updateClientOrdersLinksForRole();

    if (!document.body.classList.contains('auth-body') && !qs('.mobile-quick-dock')) {
      const dock = document.createElement('nav');
      dock.className = 'mobile-quick-dock';
      dock.setAttribute('aria-label', 'Atalhos para celular');
      dock.innerHTML = `
        <a href="${homeHref()}" data-dock-section="home">
          <i class="fa-solid fa-house"></i>
          <span>Início</span>
        </a>
        <a href="${productHref()}" data-dock-section="store">
          <i class="fa-solid fa-store"></i>
          <span>Loja</span>
        </a>
        <button class="dock-cart" type="button" data-open-cart data-dock-section="cart">
          <i class="fa-solid fa-bag-shopping"></i>
          <span>Carrinho</span>
          <strong data-cart-count>0</strong>
        </button>
        <a class="dock-offers" href="${promotionsHref()}" data-dock-section="promos">
          <i class="fa-solid fa-tags"></i>
          <span>Ofertas</span>
        </a>
        <a class="nav-account-link dock-profile-link" href="${profileHref()}" data-dock-section="account">
          <span class="dock-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span class="dock-profile-label" data-account-label>Perfil</span>
        </a>
      `;
      document.body.appendChild(dock);
      syncTopNavControls();
    }

    updateAccountUI();
    updateDockActive();
  }

  function syncTopNavControls() {
    const navInner = qs('.nav-inner');
    const brand = qs('.brand', navInner || document);
    const trigger = qs('.nav-search-trigger', navInner || document);
    const mobileToggle = qs('.mobile-menu-toggle', navInner || document);
    const dock = qs('.mobile-quick-dock');
    if (!brand && !trigger && !mobileToggle && !dock) return;

    [brand, trigger, mobileToggle].filter(Boolean).forEach((control) => {
      control.removeAttribute('style');
    });
    if (dock) dock.removeAttribute('style');
  }

  function accountAvatarHTML(signed) {
    if (!signed) return '<i class="fa-solid fa-user" aria-hidden="true"></i>';
    if (currentUser?.photo)
      return `<img src="${escapeHTML(currentUser.photo)}" alt="" loading="lazy" decoding="async">`;
    const initial = (currentUser?.name || currentUser?.email || 'U').trim().charAt(0).toUpperCase() || 'U';
    return `<span>${escapeHTML(initial)}</span>`;
  }

  function updateAccountUI() {
    const signed = Boolean(currentUser?.email);
    const hasPhoto = signed && Boolean(currentUser?.photo);
    qsa('[data-account-label]').forEach((label) => {
      label.textContent = label.closest('.mobile-quick-dock') ? 'Perfil' : signed ? firstName() : 'Entrar ou cadastrar';
    });

    qsa('[data-account-avatar]').forEach((avatar) => {
      avatar.classList.toggle('signed-in', signed);
      avatar.classList.toggle('has-photo', hasPhoto);
      avatar.innerHTML = accountAvatarHTML(signed);
    });

    qsa('.nav-account-link').forEach((link) => {
      link.classList.toggle('has-photo', hasPhoto);
    });

    qsa('[data-dock-section="account"]').forEach((link) => {
      link.classList.toggle('has-photo', hasPhoto);
    });

    qsa('.nav-account-link, [data-account-cta]').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      link.href = profileHref();
      link.classList.toggle(
        'active',
        ['perfil.html', 'editar-perfil.html', 'configuracoes.html'].includes(currentPage()),
      );
      link.setAttribute('aria-label', signed ? `Conta de ${firstName()}` : 'Abrir perfil de visitante');

      if (link.hasAttribute('data-account-cta')) {
        link.innerHTML = signed
          ? '<i class="fa-solid fa-user-gear"></i> Minha conta'
          : '<i class="fa-solid fa-user"></i> Perfil visitante';
      }
    });

    qsa('[data-account-login]').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      link.href = signed ? profileHref() : loginHref({ redirect: currentLocationForRedirect() });
      link.setAttribute('aria-label', signed ? `Conta de ${firstName()}` : 'Entrar ou cadastrar');
    });
  }

  function renderProfileChoices(scope = document) {
    qsa('[data-saved-profiles]', scope).forEach((container) => {
      const profiles = savedProfiles();
      container.classList.toggle('hidden', profiles.length === 0);
      container.innerHTML = profiles.length
        ? profiles
            .map(
              (profile) => `
          <article class="saved-profile-card ${normalizeText(profile.email) === normalizeText(currentUser?.email || '') ? 'is-current' : ''}">
            <button type="button" class="saved-profile-select" data-select-saved-profile="${escapeHTML(profile.email)}">
              <span class="saved-profile-avatar">${profileAvatarMarkup(profile)}</span>
              <span class="saved-profile-copy">
                <strong>${escapeHTML(displayProfileName(profile))}</strong>
                <small>${escapeHTML(profile.email)}</small>
                ${profilePasswordHint(profile)}
              </span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
            <button type="button" class="saved-profile-remove" data-remove-saved-profile="${escapeHTML(profile.email)}" aria-label="Remover perfil salvo">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </article>
        `,
            )
            .join('')
        : '<p class="empty-cart">Nenhum perfil salvo neste aparelho.</p>';
    });
  }

  function ensureProfileSwitcherShell() {
    let modal = qs('#profile-switcher-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'profile-switcher-modal';
    modal.className = 'profile-switcher-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'profile-switcher-title');
    modal.innerHTML = `
      <button class="profile-switcher-backdrop" type="button" data-close-profile-switcher aria-label="Fechar perfis"></button>
      <div class="profile-switcher-panel">
        <div class="profile-switcher-head">
          <div>
            <span class="eyebrow">Trocar conta</span>
            <h2 id="profile-switcher-title">Escolha um perfil</h2>
            <p>Voce pode manter ate 3 perfis neste aparelho. Marque a opcao abaixo para guardar o acesso automatico deste perfil.</p>
          </div>
          <button class="icon-button" type="button" data-close-profile-switcher aria-label="Fechar">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="saved-profile-list" data-saved-profiles></div>
        <label class="profile-switcher-save-password">
          <input type="checkbox" data-profile-switch-save-password autocomplete="off">
          <span>
            <strong>Usar ou guardar senha neste navegador</strong>
            <small>Deixe marcado para trocar automaticamente. Desmarque para pedir senha na proxima vez.</small>
          </span>
        </label>
        <div class="profile-switcher-actions">
          <a class="btn btn-primary" href="${loginHref({ redirect: 'perfil.html' })}" data-login-other-profile>
            <i class="fa-solid fa-user-plus"></i>
            Usar outro email
          </a>
          <button class="btn btn-secondary" type="button" data-switch-signout>
            <i class="fa-solid fa-right-from-bracket"></i>
            Sair da sessao atual
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', async (event) => {
      const close = event.target.closest('[data-close-profile-switcher]');
      if (close) {
        closeProfileSwitcher();
        return;
      }

      const remove = event.target.closest('[data-remove-saved-profile]');
      if (remove) {
        event.preventDefault();
        event.stopPropagation();
        removeSavedProfile(remove.dataset.removeSavedProfile);
        return;
      }

      const select = event.target.closest('[data-select-saved-profile]');
      if (select) {
        const profile = selectSavedProfile(select.dataset.selectSavedProfile);
        if (!profile) return;
        const allowSavedPassword = Boolean(qs('[data-profile-switch-save-password]', modal)?.checked);
        sessionStorage.setItem(STORAGE.pendingProfileSavePassword, allowSavedPassword ? 'true' : 'false');
        select.disabled = true;
        try {
          if (allowSavedPassword && profile.passwordSaved) {
            const user = await signInWithSavedBrowserProfile(profile, {
              mediation: 'required',
              context: 'troca de perfil',
            });
            if (user) {
              sessionStorage.removeItem(STORAGE.pendingProfile);
              sessionStorage.removeItem(STORAGE.pendingProfileSavePassword);
              closeProfileSwitcher();
              showToast(`Perfil de ${displayProfileName(user)} aberto com a senha salva.`);
              window.setTimeout(() => {
                window.location.href = profileHref();
              }, 350);
              return;
            }
          }
        } catch (error) {
          console.warn('[Auth] Nao foi possivel trocar usando a senha salva.', error);
          showToast(authFriendlyError(error, 'A senha salva nao funcionou. Digite a senha para entrar.'));
        } finally {
          select.disabled = false;
        }

        await signOutEverywhere({
          redirect: loginHref({ redirect: 'perfil.html' }),
          localOnly: true,
          message:
            allowSavedPassword && profile.passwordSaved
              ? 'Escolha o perfil. Se o navegador liberar a senha salva, a entrada sera automatica.'
              : 'Digite a senha para entrar neste perfil.',
        });
        return;
      }

      const signout = event.target.closest('[data-switch-signout]');
      if (signout) {
        sessionStorage.removeItem(STORAGE.pendingProfileSavePassword);
        await signOutEverywhere({ redirect: loginHref({ redirect: 'perfil.html' }) });
      }
    });

    return modal;
  }

  function openProfileSwitcher() {
    const modal = ensureProfileSwitcherShell();
    renderProfileChoices(modal);
    const savePassword = qs('[data-profile-switch-save-password]', modal);
    if (savePassword) savePassword.checked = true;
    modal.classList.remove('hidden');
    document.body.classList.add('profile-switcher-open');
  }

  function closeProfileSwitcher() {
    qs('#profile-switcher-modal')?.classList.add('hidden');
    document.body.classList.remove('profile-switcher-open');
  }

  function ensurePhotoPreviewShell() {
    let modal = qs('#profile-photo-preview-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'profile-photo-preview-modal';
    modal.className = 'profile-photo-preview-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <button class="profile-photo-backdrop" type="button" data-close-photo-preview aria-label="Fechar foto"></button>
      <div class="profile-photo-panel">
        <button class="icon-button profile-photo-close" type="button" data-close-photo-preview aria-label="Fechar">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <img src="" alt="Foto do perfil ampliada" data-photo-preview-img>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-photo-preview]')) closeProfilePhotoPreview();
    });
    return modal;
  }

  function openProfilePhotoPreview(src = currentUser?.photo) {
    if (!src) return;
    const modal = ensurePhotoPreviewShell();
    const img = qs('[data-photo-preview-img]', modal);
    if (img) img.src = src;
    modal.classList.remove('hidden');
    document.body.classList.add('profile-photo-open');
  }

  function closeProfilePhotoPreview() {
    qs('#profile-photo-preview-modal')?.classList.add('hidden');
    document.body.classList.remove('profile-photo-open');
  }

  function bindProfilePhotoPreview() {
    if (document.body.dataset.profilePhotoPreviewBound === 'true') return;
    document.body.addEventListener('click', (event) => {
      const profileAvatar = event.target.closest('#profile-avatar');
      if (profileAvatar && currentUser?.photo) {
        event.preventDefault();
        openProfilePhotoPreview(currentUser.photo);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeProfileSwitcher();
        closeProfilePhotoPreview();
      }
    });
    document.body.dataset.profilePhotoPreviewBound = 'true';
  }

  function setForcedElementVisible(element, visible) {
    element.classList.toggle('hidden', !visible);
    element.hidden = !visible;
    element.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (!visible) {
      element.setAttribute('tabindex', '-1');
      element.style.setProperty('display', 'none', 'important');
    } else {
      element.removeAttribute('tabindex');
      element.style.removeProperty('display');
    }
  }

  function setAdminPanelLinksVisible(visible) {
    qsa('[data-admin-panel-link]').forEach((link) => {
      setForcedElementVisible(link, visible);
      if (link instanceof HTMLAnchorElement) link.href = adminPanelHref();
    });
  }

  function setAdminOrderLinksVisible(visible) {
    qsa('[data-admin-orders-link]').forEach((link) => {
      setForcedElementVisible(link, visible);
      if (link instanceof HTMLAnchorElement) link.href = ordersHref();
    });
    qs('.mobile-menu-toggle')?.classList.toggle('has-admin-order-alert', false);
  }

  function updateClientOrdersLinksForRole(admin = ordersPageAdminMode) {
    const count = admin ? adminUnreadOrders(remoteOrdersCache).length : 0;
    qsa('[data-client-orders-link]').forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      link.href = ordersHref();
      link.innerHTML = admin
        ? `<span class="nav-orders-label">Controle</span><span class="admin-order-badge ${count ? '' : 'is-empty'}" data-client-order-count>${count}</span>`
        : 'Pedidos';
      link.classList.toggle('nav-orders-link', admin);
      link.classList.toggle('has-pending-orders', admin && count > 0);
      link.setAttribute('aria-label', admin ? 'Controlar pedidos dos clientes' : 'Ver meus pedidos');
    });
  }

  function adminPendingOrders(orders = remoteOrdersCache) {
    return (orders || []).filter((order) => {
      const payment = normalizePaymentStatus(order.paymentStatus);
      if (payment === 'Cancelado') return false;
      return !order.confirmed || normalizeOrderStatus(order.status) !== 'Entregue' || payment === 'Pendente';
    });
  }

  function adminUnreadOrders(orders = remoteOrdersCache) {
    const list = orders || [];
    const withConfirmation = list.filter((order) => order.confirmed === false);
    if (withConfirmation.length) return withConfirmation;
    return list.filter((order) => normalizeOrderStatus(order.status) !== 'Entregue');
  }

  function updateAdminOrderAlertUI(orders = remoteOrdersCache, visible = null) {
    const count = adminUnreadOrders(orders).length;
    const anyVisible = qsa('[data-admin-orders-link]').some((link) => !link.classList.contains('hidden'));
    const shouldShow = visible ?? anyVisible;
    setAdminOrderLinksVisible(Boolean(shouldShow));
    qsa('[data-admin-order-count], [data-client-order-count]').forEach((badge) => {
      badge.textContent = String(count);
      badge.classList.toggle('is-empty', count === 0);
      badge.setAttribute('aria-label', `${count} pedido${count === 1 ? '' : 's'} nao lido${count === 1 ? '' : 's'}`);
    });
    qsa('[data-admin-orders-link]').forEach((link) => {
      link.classList.toggle('has-pending-orders', count > 0);
    });
    qsa('[data-client-orders-link]').forEach((link) => {
      link.classList.toggle('has-pending-orders', count > 0 && ordersPageAdminMode);
    });
    const toggle = qs('.mobile-menu-toggle');
    if (toggle) {
      toggle.classList.toggle('has-admin-order-alert', count > 0 && Boolean(shouldShow));
      toggle.setAttribute('data-admin-pending-orders', String(count));
    }
  }

  async function updateAdminPanelLinks({ force = false } = {}) {
    setAdminPanelLinksVisible(false);
    setAdminOrderLinksVisible(false);
    updateClientOrdersLinksForRole(false);
    if (!currentUser?.email) return false;

    try {
      await authReady.catch(() => null);
      const admin = await isCurrentUserAdmin({ force });
      ordersPageAdminMode = Boolean(admin);
      document.body.classList.toggle('orders-admin-mode', ordersPageAdminMode);
      setAdminPanelLinksVisible(admin);
      setAdminOrderLinksVisible(admin);
      updateClientOrdersLinksForRole(admin);
      if (admin) refreshAdminOrderAlerts({ force: true });
      return admin;
    } catch (error) {
      console.warn('[Admin] Nao foi possivel validar o link do painel.', error);
      setAdminPanelLinksVisible(false);
      setAdminOrderLinksVisible(false);
      ordersPageAdminMode = false;
      document.body.classList.remove('orders-admin-mode');
      updateClientOrdersLinksForRole(false);
      return false;
    }
  }

  async function refreshAdminOrderAlerts({ force = false } = {}) {
    if (!currentUser?.email) {
      updateAdminOrderAlertUI([], false);
      return [];
    }

    let admin = false;
    try {
      admin = await isCurrentUserAdmin({ force: false });
    } catch (_error) {
      admin = false;
    }
    if (!admin) {
      updateAdminOrderAlertUI([], false);
      return [];
    }

    const orders = await loadOrdersFromSupabase({ force });
    updateAdminOrderAlertUI(orders, true);
    return orders;
  }

  async function updateOrdersPageMode({ force = false } = {}) {
    if (currentPage() !== 'pedidos.html') return false;

    let admin = false;
    if (currentUser?.email) {
      admin = await isCurrentUserAdmin({ force }).catch(() => false);
    }

    ordersPageAdminMode = Boolean(admin);
    document.body.classList.toggle('orders-admin-mode', ordersPageAdminMode);
    updateClientOrdersLinksForRole(ordersPageAdminMode);

    const loginLink = qs('[data-orders-login]');
    if (loginLink) {
      const showLogin = !currentUser?.email;
      loginLink.classList.toggle('hidden', !showLogin);
      loginLink.hidden = !showLogin;
      if (loginLink instanceof HTMLAnchorElement) loginLink.href = loginHref({ redirect: 'pedidos.html' });
    }

    qs('.track-order-panel')?.classList.add('hidden');

    const eyebrow = qs('#customer-orders-page .hero .eyebrow');
    const title = qs('#customer-orders-page .hero h1');
    const text = qs('#customer-orders-page .hero p');
    const panelEyebrow = qs('.customer-orders-panel .admin-section-head .eyebrow');
    const panelTitle = qs('.customer-orders-panel .admin-section-head h2');
    const panelText = qs('.customer-orders-panel .admin-section-head p');

    if (ordersPageAdminMode) {
      if (eyebrow) eyebrow.textContent = 'Controle';
      if (title) title.textContent = 'Pedidos dos clientes';
      if (text)
        text.textContent = 'Atualize status, confirme pagamento e acompanhe os pedidos fora do painel administrativo.';
      if (panelEyebrow) panelEyebrow.textContent = 'Admin';
      if (panelTitle) panelTitle.innerHTML = '<i class="fa-solid fa-clipboard-list"></i> Controle de pedidos';
      if (panelText)
        panelText.textContent = 'Administradores veem todos os pedidos e podem confirmar status, pagamento e entrega.';
    } else {
      if (eyebrow) eyebrow.textContent = 'Acompanhamento';
      if (title) title.textContent = 'Meus pedidos';
      if (text)
        text.textContent = 'Veja o status que a loja atualiza: recebido, preparando, saiu para entrega e entregue.';
      if (panelEyebrow) panelEyebrow.textContent = 'Histórico';
      if (panelTitle) panelTitle.innerHTML = '<i class="fa-solid fa-clipboard-list"></i> Pedidos vinculados ao cliente';
      if (panelText)
        panelText.textContent = currentUser?.email
          ? 'Veja os pedidos vinculados ao seu cadastro.'
          : 'Visitantes veem o histórico deste aparelho sem precisar entrar.';
    }

    await renderOrdersEverywhere({ force: true });
    return ordersPageAdminMode;
  }

  function startAdminOrderPolling() {
    if (adminOrderPollTimer) window.clearInterval(adminOrderPollTimer);
    adminOrderPollTimer = window.setInterval(() => {
      refreshAdminOrderAlerts({ force: true }).catch((error) => {
        console.warn('[Admin] Nao foi possivel atualizar contador de pedidos.', error);
      });
    }, ADMIN_ORDER_POLL_MS);
  }

  function startAdminOrdersRealtime() {
    const client = ordersClient();
    if (!client?.channel || adminRealtimeChannel) return;
    try {
      adminRealtimeChannel = client
        .channel('monte-sinai-admin-pedidos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          remoteOrdersLoaded = false;
          refreshAdminOrderAlerts({ force: true }).catch((error) => {
            console.warn('[Admin] Realtime de pedidos falhou.', error);
          });
        })
        .subscribe();
    } catch (error) {
      console.warn('[Admin] Realtime de pedidos indisponivel, usando polling.', error);
      adminRealtimeChannel = null;
    }
  }

  async function initAdminOrderAlerts() {
    if (adminOrderAlertsStarted) return;
    adminOrderAlertsStarted = true;
    await authReady.catch(() => null);
    await updateAdminPanelLinks({ force: true });
    const admin = await isCurrentUserAdmin({ force: false }).catch(() => false);
    if (!admin) return;
    startAdminOrdersRealtime();
    startAdminOrderPolling();
    refreshAdminOrderAlerts({ force: true }).catch(() => {});
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

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  function setActiveNavigation() {
    const page = currentPage();
    const adminOrderHashes = ['#orders', '#orders-list'];
    qsa('.nav-menu a, .mobile-menu a, .footer-links a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      const linkPage = navLinkPage(link);
      let active = linkPage === page;

      if (link.hasAttribute('data-client-orders-link')) {
        active = page === 'pedidos.html';
      } else if (link.hasAttribute('data-admin-orders-link')) {
        active = page === 'painel.html' && adminOrderHashes.includes(location.hash);
      } else if (link.hasAttribute('data-admin-panel-link')) {
        active = page === 'painel.html' && !(link.closest('.mobile-menu') && adminOrderHashes.includes(location.hash));
      } else if (href.includes('#') && page === 'painel.html') {
        active = linkPage === page && location.hash === `#${href.split('#')[1]}`;
      }

      link.classList.toggle('active', active);
    });
    updateDockActive();
  }

  function updateDockActive() {
    const page = currentPage();
    const activeSection = (() => {
      if (page === 'index.html') return 'home';
      if (page === 'produtos.html' || page === 'catalogo.html') return 'store';
      if (page === 'promocoes.html') return 'promos';
      if (
        [
          'login.html',
          'perfil.html',
          'pedidos.html',
          'editar-perfil.html',
          'configuracoes.html',
          'criar.html',
        ].includes(page)
      )
        return 'account';
      return '';
    })();

    setDockSectionActive(activeSection);
  }

  function setDockSectionActive(activeSection) {
    qsa('.mobile-quick-dock a, .mobile-quick-dock button').forEach((item) => {
      const isActive = item.dataset.dockSection === activeSection;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function bindSiteSearch() {
    bindSearchSuggestionViewportTracking();
    bindNavSearchToggle();

    qsa('[data-site-search-form]').forEach((form) => {
      const input = qs('[data-site-search-input]', form);
      const suggestions = ensureSearchSuggestions(form);

      form.setAttribute('autocomplete', 'off');
      input?.setAttribute('autocomplete', 'off');
      input?.setAttribute('autocapitalize', 'none');
      input?.setAttribute('autocorrect', 'off');
      input?.setAttribute('spellcheck', 'false');

      input?.addEventListener('input', () => {
        closeOtherSearchSuggestions(suggestions);
        renderSearchSuggestions(form, suggestions, input.value);
        scheduleSearchSuggestionsPosition(form, suggestions);
      });
      input?.addEventListener('focus', () => {
        closeOtherSearchSuggestions(suggestions);
        renderSearchSuggestions(form, suggestions, input.value);
        scheduleSearchSuggestionsPosition(form, suggestions);
      });
      input?.addEventListener('blur', () => {
        releaseSearchFormAfterBlur(form, suggestions);
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const term = input?.value.trim() || '';
        hideSearchSuggestions(suggestions);
        closeNavSearch();
        openSearchProductFromQuery(term);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        qsa('.search-suggestions').forEach(hideSearchSuggestions);
      }
    });

    qsa('[data-mobile-search]').forEach((button) => {
      button.addEventListener('click', () => {
        if (currentPage() !== 'produtos.html') {
          window.location.href = productHref();
          return;
        }
        qs('[data-catalog-search]')?.focus();
        scrollCatalogToTop();
      });
    });
  }

  function bindNavSearchToggle() {
    if (document.body.dataset.navSearchToggleBound === 'true') return;
    document.body.dataset.navSearchToggleBound = 'true';

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-nav-search-toggle]');
      if (trigger) {
        event.preventDefault();
        const willOpen = !document.body.classList.contains('header-search-open');
        document.body.classList.toggle('header-search-open', willOpen);
        trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

        if (willOpen) {
          const input = qs('.navbar .nav-search [data-site-search-input]');
          setTimeout(() => input?.focus(), 40);
        } else {
          qsa('.navbar .search-suggestions').forEach(hideSearchSuggestions);
        }
        return;
      }

      if (!document.body.classList.contains('header-search-open')) return;
      if (event.target.closest('.navbar .nav-search') || event.target.closest('.navbar .nav-search-trigger')) return;
      closeNavSearch();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNavSearch();
    });
  }

  function closeNavSearch() {
    if (!document.body.classList.contains('header-search-open')) return;
    document.body.classList.remove('header-search-open');
    qs('[data-nav-search-toggle]')?.setAttribute('aria-expanded', 'false');
    qsa('.navbar .search-suggestions').forEach(hideSearchSuggestions);
  }

  function ensureSearchSuggestions(form) {
    let suggestions = qs('.search-suggestions', form);
    if (suggestions) return suggestions;

    suggestions = document.createElement('div');
    suggestions.className = 'search-suggestions';
    suggestions.setAttribute('role', 'listbox');
    suggestions.setAttribute('aria-label', 'Sugestões de produtos');
    suggestions.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
    suggestions.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
    form.appendChild(suggestions);
    return suggestions;
  }

  function renderSearchSuggestions(form, suggestions, query) {
    const term = query.trim();
    if (term.length < 1) {
      suggestions.innerHTML = '';
      hideSearchSuggestions(suggestions);
      return;
    }

    const entries = searchSuggestionEntries(term, 5);
    const matches = entries.map((entry) => entry.product);
    const usingFallback = !directSearchProducts(term, 5).length && !entries.some((entry) => entry.option);

    suggestions.innerHTML = '';

    if (!matches.length) {
      suggestions.innerHTML = `
        <div class="search-suggestion-empty">
          <strong>Nenhum produto exato</strong>
          <span>Veja limpeza, água, gás e utensílios no catálogo.</span>
        </div>
      `;
      suggestions.classList.add('show');
      scheduleSearchSuggestionsPosition(form, suggestions);
      return;
    }

    entries.forEach(({ product, option }) => {
      const item = document.createElement('button');
      const suggestionProduct = option ? { ...product, preferredVariationId: option.id } : product;
      const image = option?.image || productAssetPath(product);
      const imageSrc = assetHref(image);
      item.className = 'search-suggestion-item';
      item.type = 'button';
      item.setAttribute('role', 'option');
      item.innerHTML = `
        <span class="search-suggestion-media">
          ${
            imageSrc
              ? `<img src="${escapeHTML(imageSrc)}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" onerror="this.remove()">${productPlaceholderHTML(product, 'product-placeholder-compact')}`
              : productPlaceholderHTML(product, 'product-placeholder-compact')
          }
        </span>
        <span>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.category)}${option ? ` - ${escapeHTML(option.name)}` : ''} - ${formatMoney(option?.price || product.price)}${usingFallback ? ' - sugestao' : ''}</small>
        </span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      `;
      item.addEventListener('click', () => {
        const input = qs('[data-site-search-input]', form);
        if (input) input.value = option ? `${product.name} ${option.name}` : product.name;
        hideSearchSuggestions(suggestions);
        openProductSearchModal(suggestionProduct, matches, input?.value || product.name);
      });
      suggestions.appendChild(item);
    });

    suggestions.classList.add('show');
    scheduleSearchSuggestionsPosition(form, suggestions);
  }

  function hideSearchSuggestions(suggestions) {
    suggestions?.classList.remove('show');
    clearSearchSuggestionsPosition(suggestions);
  }

  function lockPageScroll() {
    if (document.body.dataset.scrollLocked === 'true') return;
    lockedPageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.scrollLocked = 'true';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedPageScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockPageScroll() {
    if (document.body.dataset.scrollLocked !== 'true') return;
    document.body.dataset.scrollLocked = 'false';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, lockedPageScrollY);
  }

  function closeOtherSearchSuggestions(activeSuggestions) {
    qsa('.search-suggestions').forEach((suggestions) => {
      if (suggestions !== activeSuggestions) hideSearchSuggestions(suggestions);
    });
  }

  function isMobileSearchViewport() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function clearSearchSuggestionsPosition(suggestions) {
    if (!suggestions) return;
    suggestions.classList.remove('is-mobile-fixed');
    ['--suggestions-top', '--suggestions-left', '--suggestions-width', '--suggestions-max-height'].forEach((prop) => {
      suggestions.style.removeProperty(prop);
    });
    if (activeSearchSuggestionContext?.suggestions === suggestions) activeSearchSuggestionContext = null;
  }

  function releaseSearchFormAfterBlur(form, suggestions) {
    window.setTimeout(() => {
      const focusedInside = form.contains(document.activeElement);
      if (focusedInside) return;
      hideSearchSuggestions(suggestions);
    }, 180);
  }

  function scheduleSearchSuggestionsPosition(form, suggestions) {
    activeSearchSuggestionContext = { form, suggestions };
    window.cancelAnimationFrame(searchSuggestionFrame);
    searchSuggestionFrame = window.requestAnimationFrame(() => positionSearchSuggestions(form, suggestions));
  }

  function positionSearchSuggestions(form, suggestions) {
    if (!suggestions?.classList.contains('show')) {
      clearSearchSuggestionsPosition(suggestions);
      return;
    }

    const rect = form.getBoundingClientRect();
    if (!rect.width || rect.bottom < 0 || rect.top > window.innerHeight) {
      hideSearchSuggestions(suggestions);
      return;
    }

    const margin = 12;
    const preferredWidth = Math.max(300, Math.min(440, rect.width < 260 ? 360 : rect.width));
    const width = Math.min(preferredWidth, window.innerWidth - margin * 2);
    const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 180);
    const maxHeight = Math.max(180, window.innerHeight - top - margin);

    suggestions.classList.add('is-positioned');
    suggestions.style.setProperty('--suggestions-top', `${Math.max(margin, top)}px`);
    suggestions.style.setProperty('--suggestions-left', `${left}px`);
    suggestions.style.setProperty('--suggestions-width', `${width}px`);
    suggestions.style.setProperty('--suggestions-max-height', `${maxHeight}px`);
  }

  function bindSearchSuggestionViewportTracking() {
    if (document.body.dataset.searchSuggestionTracking === 'true') return;
    document.body.dataset.searchSuggestionTracking = 'true';

    const refresh = () => {
      const context = activeSearchSuggestionContext;
      if (context?.form && context?.suggestions) scheduleSearchSuggestionsPosition(context.form, context.suggestions);
    };

    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('scroll', refresh, { passive: true });
    window.visualViewport?.addEventListener('resize', refresh, { passive: true });
    window.visualViewport?.addEventListener('scroll', refresh, { passive: true });
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
            <h2>O que você precisa hoje?</h2>
            <p>Digite do seu jeito: banheiro, lavar roupa, tirar gordura, gás ou água.</p>
          </div>
          <button class="smart-search-close" type="button" data-close-search aria-label="Fechar busca">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <form class="smart-search-form" data-smart-search-form role="search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input data-smart-search-input type="search" autocomplete="off" placeholder="Ex: limpar banheiro, lavar roupa, gás...">
          <button type="submit">Buscar</button>
        </form>

        <div class="smart-search-results" data-smart-search-results></div>
      </div>
    `;

    document.body.appendChild(shell);
    renderSmartSearchResults('');
  }

  function bindSmartSearchPanel() {
    const shell = qs('.smart-search');
    if (!shell) return;

    qsa('[data-open-search]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const seed = qs('[data-catalog-search]')?.value || qs('[data-site-search-input]')?.value || '';
        openSmartSearch(seed);
      });
    });

    const form = qs('[data-smart-search-form]', shell);
    const input = qs('[data-smart-search-input]', shell);

    input?.addEventListener('input', () => renderSmartSearchResults(input.value));

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      navigateSmartSearch(input?.value || '');
    });

    shell.addEventListener('click', (event) => {
      const closeButton = event.target.closest('[data-close-search]');
      if (closeButton) {
        closeSmartSearch();
        return;
      }

      const product = event.target.closest('[data-smart-product]');
      if (product) navigateSmartSearch(product.dataset.smartProduct || input?.value || '');
    });

    document.addEventListener('keydown', (event) => {
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
    setDockSectionActive('search');
    setTimeout(() => input?.focus(), 80);
  }

  function closeSmartSearch() {
    qs('.smart-search')?.classList.remove('open');
    document.body.classList.remove('smart-search-open');
    updateDockActive();
  }

  function navigateSmartSearch(query) {
    const term = query.trim();
    closeSmartSearch();
    openSearchProductFromQuery(term);
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
      </div>
      ${
        matches.length
          ? `
        <div class="smart-search-result-grid">
          ${matches
            .map((product) => {
              const imageSrc = assetHref(productAssetPath(product));
              return `
              <button type="button" class="smart-search-product" data-smart-product="${escapeHTML(product.name)}">
                <span class="smart-search-product-icon">
                  ${
                    imageSrc
                      ? `<img src="${escapeHTML(imageSrc)}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" onerror="this.remove()">${productPlaceholderHTML(product, 'product-placeholder-compact')}`
                      : productPlaceholderHTML(product, 'product-placeholder-compact')
                  }
                </span>
                <span class="smart-search-product-copy">
                  <strong>${escapeHTML(product.name)}</strong>
                  <small>${escapeHTML(product.category)} - ${formatMoney(product.price)}</small>
                </span>
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </button>
            `;
            })
            .join('')}
        </div>
      `
          : `
        <div class="smart-search-empty">
          <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
          <strong>Nenhum produto exato ainda</strong>
          <span>Tente procurar por banheiro, roupa, cozinha, quintal, gás, água ou cheiro bom.</span>
        </div>
      `
      }
    `;
  }

  function smartSearchMatches(query) {
    return searchSuggestionProducts(query, String(query ?? '').trim() ? 5 : 6);
  }

  function smartProductIcon(product) {
    const blob = normalizeText(productTerms(product));
    if (blob.includes('gas')) return 'fa-fire-flame-simple';
    if (blob.includes('agua')) return 'fa-droplet';
    if (blob.includes('roupa') || blob.includes('lavanderia') || blob.includes('sabao') || blob.includes('amaciante'))
      return 'fa-shirt';
    if (blob.includes('cozinha') || blob.includes('detergente') || blob.includes('esponja')) return 'fa-kitchen-set';
    if (blob.includes('banheiro') || blob.includes('vaso') || blob.includes('sabonete')) return 'fa-bath';
    if (blob.includes('vassoura') || blob.includes('rodo') || blob.includes('pa')) return 'fa-broom';
    return 'fa-spray-can-sparkles';
  }

  function productPlaceholderTone(product = {}) {
    const blob = normalizeText(productTerms(product));
    if (blob.includes('gas')) return 'gas';
    if (blob.includes('agua')) return 'agua';
    if (blob.includes('vassoura') || blob.includes('rodo') || blob.includes('pa') || blob.includes('utensilio'))
      return 'utensilios';
    if (blob.includes('higiene') || blob.includes('sabonete') || blob.includes('banheiro')) return 'higiene';
    return 'limpeza';
  }

  function productPlaceholderHTML(product = {}, modifier = '') {
    const tone = productPlaceholderTone(product);
    const classes = ['product-placeholder', `product-placeholder-${tone}`, modifier].filter(Boolean).join(' ');
    return `
      <span class="${classes}" aria-hidden="true">
        <i class="fa-solid ${smartProductIcon(product)}"></i>
        <small>${escapeHTML(product.category || product.categoria || 'Produto')}</small>
      </span>
    `;
  }

  function productMediaHTML(product = {}, image = productAssetPath(product), modifier = '') {
    const placeholder = productPlaceholderHTML(product, modifier);
    if (!image) return placeholder;
    return `<img class="product-image" src="${escapeHTML(assetHref(image))}" alt="${escapeHTML(product.name || product.nome || '')}" loading="lazy" decoding="async" onerror="this.remove()">${placeholder}`;
  }

  function productStockText(product = {}) {
    const normalized = normalizeProduct(product);
    if (normalized.stockState === 'out') return 'Indisponivel no momento';
    return '';
  }

  function customerAvailabilityText(product = {}, option = null) {
    const normalized = normalizeProduct(product);
    const out = option ? optionOutOfStock(option) : normalized.stockState === 'out';
    return out ? 'Indisponivel no momento' : '';
  }

  function optionStockText(option = {}, product = {}) {
    if (optionOutOfStock(option)) return 'Indisponivel no momento';
    return '';
  }

  function optionOutOfStock(option = {}) {
    if (option.unavailable === true || option.indisponivel === true || option.canBuy === false || option.pode_comprar === false)
      return true;
    const stock = option.stock;
    return stock !== null && stock !== undefined && stock !== '' && Number(stock) <= 0;
  }

  function optionPriceLabel(option = {}, product = {}) {
    const price = Number(option.price || normalizeProduct(product).price || 0);
    return `${option.name || option.label || 'Opcao'} - ${formatMoney(price)}`;
  }

  function optionSelectLabel(option = {}) {
    return option.name || option.label || 'Opcao';
  }

  function productOptionsHTML(options = [], product = {}) {
    return options
      .map((option) => {
        const image = option.image || productAssetPath(product);
        return `<option value="${escapeHTML(option.value)}" title="${escapeHTML(optionPriceLabel(option, product))}" data-variation-id="${escapeHTML(option.id)}" data-variation-name="${escapeHTML(option.name || option.label)}" data-price="${escapeHTML(option.price)}" data-stock="" data-available="${optionOutOfStock(option) ? 'false' : 'true'}" data-image="${escapeHTML(image)}">${escapeHTML(optionSelectLabel(option))}</option>`;
      })
      .join('');
  }

  function variationFromProductIndex(productId = '', variationId = '') {
    if (!productId || !variationId) return null;
    const product = productIndex.find((item) => String(normalizeProduct(item).id) === String(productId));
    if (!product) return null;
    const normalized = normalizeProduct(product);
    return normalized.options.find((option) => String(option.id) === String(variationId)) || null;
  }

  function selectedVariationState(option, card) {
    const button = card?.querySelector('.btn-add-cart');
    const productId = button?.dataset.productId || card?.dataset.productId || '';
    const variationId = option?.dataset.variationId || button?.dataset.variationId || '';
    const current = variationFromProductIndex(productId, variationId);
    const stock = normalizeVariationStockValue(current ? current.stock : option?.dataset.stock);
    const price = Number(current?.price ?? option?.dataset.price ?? button?.dataset.price ?? 0);
    const image = current?.image || option?.dataset.image || button?.dataset.image || '';
    const name = current?.name || option?.dataset.variationName || option?.textContent?.trim() || '';
    const explicitOut = current
      ? optionOutOfStock(current)
      : option?.dataset.available === 'false' || button?.dataset.available === 'false';
    const out = explicitOut || (stock !== null && stock <= 0);

    return {
      variationId,
      name,
      price: Number.isFinite(price) ? price : 0,
      stock: null,
      image,
      out,
      stockText: out ? 'Indisponivel no momento' : '',
      statusText: out ? 'Indisponivel no momento' : '',
    };
  }

  function updateSelectedVariationUI(select) {
    const option = select?.selectedOptions[0];
    const card = select?.closest('.product-card, .full-catalog-item, .catalog-detail-copy, .catalog-detail-panel');
    if (!option || !card) return;

    const state = selectedVariationState(option, card);
    const priceEl = card.querySelector('[data-product-price-display]') || card.querySelector('strong');
    const stockLine = card.querySelector('.product-stock-line');
    const button = card.querySelector('.btn-add-cart');
    const imageEl = card.querySelector('.product-image');
    const availabilityNote = card.querySelector('.catalog-availability-note');
    const statusBadge = card.querySelector('.catalog-status-badge:not(.is-offer):not(.is-kit)');
    const productCard = card.classList.contains('product-card') ? card : card.closest('.product-card');
    const fullCatalogItem = card.classList.contains('full-catalog-item') ? card : card.closest('.full-catalog-item');
    const stockBadge = productCard?.querySelector('.stock-badge');

    if (priceEl) {
      priceEl.textContent = state.out ? 'Indisponivel' : formatMoney(state.price);
      priceEl.classList.toggle('product-unavailable', state.out);
    }
    if (stockLine) {
      stockLine.textContent = state.stockText;
      stockLine.classList.toggle('is-empty', !state.stockText);
      stockLine.classList.toggle('is-unavailable', state.out);
    }
    if (state.image && imageEl) imageEl.src = assetHref(state.image);
    if (availabilityNote) {
      const label = state.out
        ? 'Indisponivel no momento'
        : availabilityNote.classList.contains('catalog-detail-note')
          ? 'Pronto para pedir'
          : 'Pronto para pedir';
      availabilityNote.innerHTML = `<i class="fa-solid ${state.out ? 'fa-ban' : 'fa-circle-check'}"></i> ${label}`;
    }
    if (statusBadge) {
      statusBadge.textContent = state.statusText;
      statusBadge.classList.toggle('is-out', state.out);
      statusBadge.classList.toggle('is-ok', !state.out);
      statusBadge.classList.toggle('is-low', false);
      statusBadge.classList.toggle('hidden', !state.statusText);
    }
    productCard?.classList.toggle('is-out-of-stock', state.out);
    fullCatalogItem?.classList.toggle('is-out-of-stock', state.out);
    if (stockBadge) {
      stockBadge.textContent = state.out ? 'Indisponivel' : '';
      stockBadge.classList.toggle('hidden', !state.out);
    }
    if (button) {
      button.dataset.price = String(state.price);
      button.dataset.stock = '';
      button.dataset.available = state.out ? 'false' : 'true';
      button.dataset.image = state.image || button.dataset.image || '';
      button.dataset.variationId = state.variationId || '';
      button.dataset.variationName = state.name || '';
      button.disabled = state.out;
      button.setAttribute('aria-disabled', String(state.out));
      button.classList.toggle('btn-primary', !state.out);
      button.classList.toggle('btn-esgotado', state.out);
      button.innerHTML = state.out ? 'Indisponivel' : 'Adicionar';
    }
  }

  function productCardHTML(product, mode = 'catalog') {
    const normalized = normalizeProduct(product);
    const recommended = isRecommendedProduct(normalized);
    const options = productOptions(normalized);
    const hasOptions = normalized.hasVariations && options.length > 0;
    const firstOption = options[0] || { price: normalized.price };
    const image = (hasOptions && firstOption.image) || productAssetPath(normalized);
    const selectedOutOfStock = hasOptions ? optionOutOfStock(firstOption) : normalized.stockState === 'out';
    const outOfStock = normalized.stockState === 'out';
    const lowStock = normalized.stockState === 'low';
    const detailKey = normalized.id || normalized.name;
    const cardClass = [
      'product-card',
      mode === 'rail' ? 'rail-product tilt-3d' : 'catalog-product',
      recommended ? 'is-recommended' : '',
      normalized.offerActive ? 'is-offer-product' : '',
      normalized.isKit ? 'is-kit-product' : '',
      outOfStock ? 'is-out-of-stock' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return `
      <article class="${cardClass}" data-name="${escapeHTML(normalized.name)}" data-category="${escapeHTML(normalized.categorySlug)}" data-recommended="${recommended}" data-product-id="${escapeHTML(normalized.id)}" data-catalog-detail-key="${escapeHTML(detailKey)}">
        ${
          outOfStock
            ? '<span class="recommended-badge stock-badge">Indisponivel</span>'
            : normalized.offerActive
                ? `<span class="recommended-badge offer-badge">${escapeHTML(offerCountdownText(normalized.offerEndsAt))}</span>`
                : normalized.isKit
                  ? '<span class="recommended-badge kit-badge">Kit especial</span>'
                  : recommended
                    ? '<span class="recommended-badge">Recomendado</span>'
                    : ''
        }
        <div class="product-media">
          ${productMediaHTML(normalized, image)}
        </div>
        <div class="product-icon"><i class="fa-solid ${smartProductIcon(normalized)}"></i></div>
        <h3>${escapeHTML(normalized.name)}</h3>
        <p>${escapeHTML(normalized.description || `Produto de ${normalized.category} pronto para adicionar ao pedido.`)}</p>
        ${normalized.kitItems ? `<p class="kit-items">${escapeHTML(normalized.kitItems)}</p>` : ''}
        ${
          hasOptions
            ? `
          <select class="product-option" aria-label="${escapeHTML(normalized.name.includes('Desinfetante') ? 'Escolher fragrância do desinfetante' : 'Escolher tipo do produto')}">
            ${productOptionsHTML(options, normalized)}
          </select>
        `
            : ''
        }
        <strong data-product-price-display class="${selectedOutOfStock ? 'product-unavailable' : ''}">${selectedOutOfStock ? 'Indisponivel' : `${normalized.offerActive && normalized.originalPrice > normalized.price ? `<span class="old-price">${formatMoney(normalized.originalPrice)}</span> ` : ''}${formatMoney(firstOption.price || normalized.price)}`}</strong>
        <small class="product-stock-line ${selectedOutOfStock ? 'is-unavailable' : 'is-empty'}">${escapeHTML(
          customerAvailabilityText(normalized, hasOptions ? firstOption : null),
        )}</small>
        <div class="product-card-actions">
          ${
            `<button class="btn ${selectedOutOfStock ? 'btn-esgotado' : 'btn-primary'} btn-add-cart" type="button" ${selectedOutOfStock ? 'disabled' : ''} data-name="${escapeHTML(normalized.name)}" data-price="${escapeHTML(firstOption.price || normalized.price)}" data-image="${escapeHTML(image)}" data-product-id="${escapeHTML(normalized.id)}" data-variation-id="${escapeHTML(firstOption.id || '')}" data-variation-name="${escapeHTML(firstOption.name || '')}" data-stock="" data-available="${selectedOutOfStock ? 'false' : 'true'}">${selectedOutOfStock ? 'Indisponivel' : 'Adicionar'}</button>`
          }
          <button class="btn btn-secondary btn-product-details" type="button" data-catalog-detail="${escapeHTML(detailKey)}">
            Ver detalhes
          </button>
        </div>
      </article>
    `;
  }

  function renderDynamicFilters() {
    const filterBar = qs('.filter-chips');
    if (!filterBar) return;

    filterBar.innerHTML = [
      '<button class="filter-chip active" type="button" data-filter="all">Todos</button>',
      ...PUBLIC_CATEGORY_FILTERS.map(
        ([slug, label]) =>
          `<button class="filter-chip" type="button" data-filter="${escapeHTML(slug)}">${escapeHTML(label)}</button>`,
      ),
    ].join('');
  }

  function catalogProductGroups() {
    const products = storeProducts();
    const recommended = products.filter((product) => isRecommendedProduct(product));
    const recommendedNames = new Set(recommended.map((product) => normalizeText(product.name)));
    const remaining = products.filter((product) => !recommendedNames.has(normalizeText(product.name)));
    const groups = [];

    if (recommended.length) {
      groups.push({
        slug: 'recommended',
        products: recommended,
        ...CATALOG_SECTION_META.recommended,
      });
    }

    orderedCategoryEntries(remaining).forEach(([slug, label]) => {
      const groupProducts = remaining.filter(
        (product) => (product.categorySlug || categorySlug(product.category)) === slug,
      );
      if (!groupProducts.length) return;

      groups.push({
        slug,
        products: groupProducts,
        ...catalogSectionMeta(slug, label),
      });
    });

    return groups;
  }

  function renderDynamicCatalog() {
    const catalog = qs('#todos-produtos > div');
    if (!catalog) return;

    renderDynamicFilters();

    [...catalog.children].forEach((child) => {
      if (child.matches('.section-head, .grid-produtos')) child.remove();
    });

    let empty = qs('#catalog-empty', catalog);
    if (!empty) {
      empty = document.createElement('p');
      empty.id = 'catalog-empty';
      empty.className = 'empty-cart hidden';
      empty.textContent = 'Nenhum produto encontrado com esse filtro.';
      catalog.appendChild(empty);
    }

    catalogProductGroups().forEach((group) => {
      const head = document.createElement('div');
      head.className = 'section-head';
      head.dataset.catalogSection = group.slug;
      head.innerHTML = `
        <span class="eyebrow">${escapeHTML(group.eyebrow)}</span>
        <h2>${escapeHTML(group.title)}</h2>
      `;

      const grid = document.createElement('div');
      grid.className = 'grid-produtos';
      grid.dataset.dynamicCatalog = '';
      grid.dataset.catalogSection = group.slug;
      grid.innerHTML = group.products.map((product) => productCardHTML(product, 'catalog')).join('');

      catalog.insertBefore(head, empty);
      catalog.insertBefore(grid, empty);
    });
  }

  function renderDynamicProductRail() {
    const rail = qs('[data-product-rail]');
    if (!rail) return;

    const products = storeProducts();
    if (!products.length) {
      rail.innerHTML = `
      <a class="more-card rail-product more-card-3d tilt-3d" href="${catalogHref()}" aria-label="Ver catalogo completo">
        <div class="product-icon"><i class="fa-solid fa-arrow-right"></i></div>
        <h3>Ver catalogo</h3>
        <p>Abra o catalogo completo quando os produtos estiverem disponiveis.</p>
        <span class="btn btn-secondary">Ver catalogo completo</span>
      </a>
    `;
      return;
    }
    const recommended = products.filter((product) => isRecommendedProduct(product));
    const recommendedNames = new Set(recommended.map((product) => normalizeText(product.name)));
    const featured = [
      ...recommended,
      ...products.filter((product) => !recommendedNames.has(normalizeText(product.name))),
    ].slice(0, 6);
    rail.innerHTML = `
      ${featured.map((product) => productCardHTML(product, 'rail')).join('')}
      <a class="more-card rail-product more-card-3d tilt-3d" href="${catalogHref()}" aria-label="Ver catalogo completo">
        <div class="product-icon"><i class="fa-solid fa-arrow-right"></i></div>
        <h3>Ver mais produtos</h3>
        <p>Abra o catálogo completo com todos os produtos cadastrados.</p>
        <span class="btn btn-secondary">Ver catálogo completo</span>
      </a>
    `;
    qsa('.rail-product', rail).forEach((card, index) => card.classList.toggle('is-center', index === 0));
  }

  function renderPromotionsPage() {
    const grid = qs('[data-promotions-grid]');
    if (!grid) return;

    const offers = storeProducts()
      .map((product) => {
        const normalized = normalizeProduct(product);
        const optionOffers = (normalized.options || []).filter((option) => option.offerActive && !optionOutOfStock(option));
        if (!optionOffers.length) return normalized;
        return {
          ...normalized,
          offerActive: true,
          price: optionOffers[0].price,
          originalPrice: optionOffers[0].originalPrice || optionOffers[0].price,
          promotionalPrice: optionOffers[0].promotionalPrice || optionOffers[0].price,
          offerEndsAt: optionOffers[0].offerEndsAt,
          options: optionOffers,
          hasVariations: true,
        };
      })
      .filter((product) => normalizeProduct(product).offerActive && normalizeProduct(product).stockState !== 'out');
    grid.innerHTML = offers.map((product) => productCardHTML(product, 'catalog')).join('');
    qs('#promotions-empty')?.classList.toggle('hidden', offers.length > 0);
    qsa('[data-promotions-count]').forEach((el) => {
      el.textContent = String(offers.length);
    });
  }

  function fullCatalogStockText(product) {
    return customerAvailabilityText(product);
  }

  function fullCatalogStatusText(product) {
    const normalized = normalizeProduct(product);
    if (normalized.stockState === 'out') return 'Indisponivel no momento';
    return '';
  }

  function fullCatalogMatchesFilter(product, filter) {
    const normalized = normalizeProduct(product);
    if (filter === 'out') return normalized.stockState === 'out';
    if (filter === 'low') return normalized.stockState === 'low';
    if (filter === 'offers') return normalized.offerActive;
    if (filter === 'kits') return normalized.isKit;
    return true;
  }

  function fullCatalogCardHTML(product) {
    const normalized = normalizeProduct(product);
    const image = productAssetPath(normalized);
    const outOfStock = normalized.stockState === 'out';
    const statusText = fullCatalogStatusText(normalized);
    const stockText = fullCatalogStockText(normalized);
    const key = normalized.id || normalized.name;
    const options = productOptions(normalized);
    const firstOption = options[0] || { price: normalized.price };
    const hasOptions = normalized.hasVariations && options.length > 0;
    const selectedOutOfStock = hasOptions ? optionOutOfStock(firstOption) : outOfStock;
    const displayImage = (hasOptions && firstOption.image) || image;

    return `
      <article class="full-catalog-item ${outOfStock ? 'is-out-of-stock' : ''}" data-full-catalog-product data-catalog-product-key="${escapeHTML(key)}" data-name="${escapeHTML(normalized.name)}" data-category="${escapeHTML(normalized.categorySlug)}">
        <div class="full-catalog-media">
          ${productMediaHTML(normalized, displayImage)}
        </div>
        <div class="full-catalog-copy">
          <div class="full-catalog-badges">
            ${statusText ? `<span class="catalog-status-badge is-out">${escapeHTML(statusText)}</span>` : ''}
            ${normalized.offerActive ? '<span class="catalog-status-badge is-offer">Oferta</span>' : ''}
            ${normalized.isKit ? '<span class="catalog-status-badge is-kit">Kit</span>' : ''}
          </div>
          <h3>${escapeHTML(normalized.name)}</h3>
          <p>${escapeHTML(normalized.description || `Produto de ${normalized.category}.`)}</p>
          ${normalized.kitItems ? `<small>${escapeHTML(normalized.kitItems)}</small>` : ''}
        </div>
        <div class="full-catalog-stock">
          <strong class="product-stock-line ${selectedOutOfStock ? 'is-unavailable' : 'is-empty'}">${escapeHTML(
            hasOptions ? customerAvailabilityText(normalized, firstOption) : stockText,
          )}</strong>
          <span>${escapeHTML(normalized.category)}</span>
        </div>
        <div class="full-catalog-action">
          ${
            hasOptions
              ? `
            <select class="product-option product-option-compact" aria-label="Escolher opcao do produto">
              ${productOptionsHTML(options, normalized)}
            </select>
          `
              : ''
          }
          <strong data-product-price-display class="${selectedOutOfStock ? 'product-unavailable' : ''}">${selectedOutOfStock ? 'Indisponivel' : `${normalized.offerActive && normalized.originalPrice > normalized.price ? `<span class="old-price">${formatMoney(normalized.originalPrice)}</span> ` : ''}${formatMoney(firstOption.price || normalized.price)}`}</strong>
          <button class="btn ${selectedOutOfStock ? 'btn-esgotado' : 'btn-primary'} btn-add-cart" type="button" ${selectedOutOfStock ? 'disabled' : ''} data-name="${escapeHTML(normalized.name)}" data-price="${escapeHTML(firstOption.price || normalized.price)}" data-image="${escapeHTML(displayImage)}" data-product-id="${escapeHTML(normalized.id)}" data-variation-id="${escapeHTML(firstOption.id || '')}" data-variation-name="${escapeHTML(firstOption.name || '')}" data-stock="" data-available="${selectedOutOfStock ? 'false' : 'true'}">
            <i class="fa-solid ${selectedOutOfStock ? 'fa-ban' : 'fa-cart-plus'}"></i>
            ${selectedOutOfStock ? 'Indisponivel' : 'Adicionar'}
          </button>
          <button class="btn btn-secondary" type="button" data-catalog-detail="${escapeHTML(key)}">
            <i class="fa-solid fa-circle-info"></i>
            Ver detalhes
          </button>
        </div>
      </article>
    `;
  }

  function renderFullCatalogPage() {
    const list = qs('[data-full-catalog-list]');
    if (!list) return;

    const input = qs('[data-full-catalog-search]');
    const term = normalizeText(input?.value || '');
    const activeFilter = qs('[data-full-catalog-filter].active')?.dataset.fullCatalogFilter || 'all';
    const products = catalogProducts().sort((a, b) => {
      const productA = normalizeProduct(a);
      const productB = normalizeProduct(b);
      const categoryCompare = categoryOrderIndex(productA.categorySlug) - categoryOrderIndex(productB.categorySlug);
      if (categoryCompare !== 0) return categoryCompare;
      return compareCatalogProducts(a, b);
    });

    const visible = products.filter((product) => {
      const normalized = normalizeProduct(product);
      const blob = normalizeText(
        `${normalized.name} ${normalized.category} ${normalized.description} ${normalized.kitItems}`,
      );
      return (!term || blob.includes(term)) && fullCatalogMatchesFilter(normalized, activeFilter);
    });

    const categoryCount = new Set(products.map((product) => normalizeProduct(product).categorySlug)).size;
    const outCount = products.filter((product) => normalizeProduct(product).stockState === 'out').length;
    setText('[data-full-catalog-total]', String(products.length));
    setText('[data-full-catalog-available]', String(categoryCount));
    setText('[data-full-catalog-out]', String(outCount));

    const grouped = orderedCategoryEntries(visible)
      .map(([slug, label]) => {
        const meta = catalogSectionMeta(slug, label);
        const categoryProducts = visible
          .filter((product) => normalizeProduct(product).categorySlug === slug)
          .sort(compareCatalogProducts);
        return `
        <section class="full-catalog-category" data-full-catalog-category="${escapeHTML(slug)}">
          <div class="full-catalog-category-head">
            <span class="eyebrow">${escapeHTML(meta.eyebrow)}</span>
            <h2>${escapeHTML(label)}</h2>
            <small>${categoryProducts.length} item${categoryProducts.length === 1 ? '' : 's'}</small>
          </div>
          <div class="full-catalog-category-grid">
            ${categoryProducts.map(fullCatalogCardHTML).join('')}
          </div>
        </section>
      `;
      })
      .join('');

    list.innerHTML = grouped;
    qs('[data-full-catalog-empty]')?.classList.toggle('hidden', visible.length > 0);

    const result = qs('[data-full-catalog-results]');
    if (result) {
      result.textContent = products.length
        ? `${visible.length} de ${products.length} produto${products.length === 1 ? '' : 's'} no catalogo`
        : 'Carregando catalogo...';
    }
  }

  function ensureCatalogDetailModal() {
    let modal = qs('#catalog-detail-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'catalog-detail-modal';
    modal.className = 'catalog-detail-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'catalog-detail-title');
    modal.innerHTML = `
      <button class="catalog-detail-backdrop" type="button" data-catalog-detail-close aria-label="Fechar detalhes"></button>
      <article class="catalog-detail-panel">
        <button class="catalog-detail-close" type="button" data-catalog-detail-close aria-label="Fechar detalhes">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div data-catalog-detail-body></div>
      </article>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-catalog-detail-close]')) closeCatalogDetailModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeCatalogDetailModal();
    });
    return modal;
  }

  function catalogProductByKey(key = '') {
    const target = String(key || '');
    return catalogProducts().find((product) => {
      const normalized = normalizeProduct(product);
      return String(normalized.id || normalized.name) === target;
    });
  }

  function openCatalogDetailModal(key = '') {
    const product = catalogProductByKey(key);
    if (!product) {
      showToast('Produto nao encontrado no catalogo.', { type: 'warning' });
      return;
    }

    const normalized = normalizeProduct(product);
    const modal = ensureCatalogDetailModal();
    const body = qs('[data-catalog-detail-body]', modal);
    const image = productAssetPath(normalized);
    const outOfStock = normalized.stockState === 'out';
    const statusText = fullCatalogStatusText(normalized);
    const stockText = fullCatalogStockText(normalized);
    const detailText = normalized.detailedDescription || normalized.description || `Produto de ${normalized.category}.`;
    const options = productOptions(normalized);
    const firstOption = options[0] || { price: normalized.price };
    const hasOptions = normalized.hasVariations && options.length > 0;
    const selectedOutOfStock = hasOptions ? optionOutOfStock(firstOption) : outOfStock;
    const displayImage = (hasOptions && firstOption.image) || image;

    if (body) {
      body.innerHTML = `
        <div class="catalog-detail-media">
          ${productMediaHTML(normalized, displayImage)}
        </div>
        <div class="catalog-detail-copy">
          <div class="full-catalog-badges">
            ${statusText ? `<span class="catalog-status-badge is-out">${escapeHTML(statusText)}</span>` : ''}
            ${normalized.offerActive ? '<span class="catalog-status-badge is-offer">Oferta</span>' : ''}
            ${normalized.isKit ? '<span class="catalog-status-badge is-kit">Kit</span>' : ''}
          </div>
          <span class="eyebrow">${escapeHTML(normalized.category)}</span>
          <h2 id="catalog-detail-title">${escapeHTML(normalized.name)}</h2>
          <p>${escapeHTML(detailText)}</p>
          ${normalized.kitItems ? `<div class="kit-items">${escapeHTML(normalized.kitItems)}</div>` : ''}
          <div class="catalog-detail-facts">
            <div><span>Preco</span><strong data-product-price-display class="${selectedOutOfStock ? 'product-unavailable' : ''}">${selectedOutOfStock ? 'Indisponivel' : `${normalized.offerActive && normalized.originalPrice > normalized.price ? `<span class="old-price">${formatMoney(normalized.originalPrice)}</span> ` : ''}${formatMoney(firstOption.price || normalized.price)}`}</strong></div>
            <div><span>Situação</span><strong class="product-stock-line ${selectedOutOfStock ? 'is-unavailable' : 'is-empty'}">${escapeHTML(
              hasOptions ? customerAvailabilityText(normalized, firstOption) : stockText,
            )}</strong></div>
            <div><span>Categoria</span><strong>${escapeHTML(normalized.category)}</strong></div>
          </div>
          ${
            hasOptions
              ? `
            <label class="product-choice catalog-detail-choice">
              <span>Escolha a opcao</span>
              <select class="product-option" aria-label="Escolher opcao do produto">
                ${productOptionsHTML(options, normalized)}
              </select>
            </label>
          `
              : ''
          }
          <div class="catalog-detail-actions">
            ${
              `<button class="btn ${selectedOutOfStock ? 'btn-esgotado' : 'btn-primary'} btn-add-cart" type="button" ${selectedOutOfStock ? 'disabled' : ''} data-name="${escapeHTML(normalized.name)}" data-price="${escapeHTML(firstOption.price || normalized.price)}" data-image="${escapeHTML(displayImage)}" data-product-id="${escapeHTML(normalized.id)}" data-variation-id="${escapeHTML(firstOption.id || '')}" data-variation-name="${escapeHTML(firstOption.name || '')}" data-stock="" data-available="${selectedOutOfStock ? 'false' : 'true'}">
              <i class="fa-solid fa-cart-plus"></i>
              ${selectedOutOfStock ? 'Indisponivel' : 'Adicionar ao carrinho'}
            </button>`
            }
            <a class="btn btn-secondary" href="${productHref(normalized.name)}">
              <i class="fa-solid fa-store"></i>
              Ver na loja
            </a>
            <button class="btn btn-secondary" type="button" data-catalog-detail-close>
              <i class="fa-solid fa-arrow-left"></i>
              Voltar ao catalogo
            </button>
          </div>
        </div>
      `;
    }

    modal.classList.remove('hidden');
    lockPageScroll();
    document.body.classList.add('catalog-detail-open');
    requestAnimationFrame(() => modal.classList.add('show'));
  }

  function closeCatalogDetailModal() {
    const modal = qs('#catalog-detail-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.remove('show');
    document.body.classList.remove('catalog-detail-open');
    window.setTimeout(() => {
      modal.classList.add('hidden');
      unlockPageScroll();
    }, 180);
  }

  function bindFullCatalogPage() {
    const list = qs('[data-full-catalog-list]');
    if (!list) return;

    qs('[data-full-catalog-search]')?.addEventListener('input', renderFullCatalogPage);
    qsa('[data-full-catalog-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        qsa('[data-full-catalog-filter]').forEach((item) => item.classList.toggle('active', item === button));
        renderFullCatalogPage();
      });
    });
    list.addEventListener('click', (event) => {
      const detailButton = event.target.closest('[data-catalog-detail]');
      const trigger = detailButton || event.target.closest('[data-full-catalog-product]');
      if (!trigger) return;
      if (!detailButton && event.target.closest('button, select, input, label, a')) return;
      event.preventDefault();
      const key = trigger.dataset.catalogDetail || trigger.dataset.catalogProductKey;
      openCatalogDetailModal(key);
    });

    renderFullCatalogPage();
  }

  function bindCatalog() {
    const input = qs('[data-catalog-search]');
    const filterBar = qs('.filter-chips');
    const params = new URLSearchParams(location.search);
    const initialQuery = params.get('q') || '';
    if (input && initialQuery) input.value = initialQuery;
    if (initialQuery) activateCatalogFilter('all');
    else applyCatalogHashFilter(false);

    input?.addEventListener('input', () => {
      if (input.value.trim()) activateCatalogFilter('all');
      applyCatalogFilters();
    });

    const handleFilterClick = (event) => {
      const chip = event.target.closest('.products-page .filter-chips [data-filter]');
      if (!chip) return;
      const scopedFilterBar = chip.closest('.filter-chips') || filterBar;
      qsa('[data-filter]', scopedFilterBar || document).forEach((item) =>
        item.classList.toggle('active', item === chip),
      );
      applyCatalogFilters();
    };

    document.body.addEventListener('click', handleFilterClick);

    window.addEventListener('hashchange', () => {
      if (!applyCatalogHashFilter(true)) return;
      scrollCatalogToTop('smooth');
    });

    applyCatalogFilters();
    if (initialQuery || location.hash) {
      setTimeout(() => scrollCatalogToTop('auto'), 80);
    }
  }

  function applyCatalogFilters() {
    const catalogRoot = qs('.products-page #todos-produtos') || qs('#todos-produtos') || document;
    const products = qsa('.catalog-product', catalogRoot);

    const rawTerm = qs('[data-catalog-search]')?.value || '';
    const term = normalizeText(rawTerm);
    const searchProducts = term ? catalogSearchProducts(rawTerm, 8) : [];
    const activeChip =
      qs('.products-page .filter-chips [data-filter].active') ||
      qs('.filter-chips [data-filter].active', catalogRoot) ||
      qs('.filter-chips [data-filter].active');
    const filter = activeChip?.dataset.filter || 'all';
    let visible = 0;

    products.forEach((card) => {
      const category = card.dataset.category || '';
      const matchesProduct = searchProducts.some((product) => cardMatchesCatalogProduct(card, product));
      const matchesCardText = !searchProducts.length && cardMatchesCatalogQuery(card, rawTerm, true);
      const matchesTerm = !term || matchesProduct || matchesCardText;
      const matchesFilter = filter === 'all' || category === filter;
      const show = matchesTerm && matchesFilter;
      card.classList.toggle('hidden', !show);
      card.classList.toggle('is-related-result', false);
      if (show) visible += 1;
    });

    qsa('.grid-produtos', catalogRoot).forEach((grid) => {
      const hasVisibleProducts = qsa('.catalog-product:not(.hidden)', grid).length > 0;
      const sectionHead = grid.previousElementSibling?.classList.contains('section-head')
        ? grid.previousElementSibling
        : null;
      const hideGroup = Boolean(term || filter !== 'all') && !hasVisibleProducts;
      grid.classList.toggle('hidden', hideGroup);
      sectionHead?.classList.toggle('hidden', hideGroup);
    });

    const empty = qs('#catalog-empty', catalogRoot);
    if (empty) {
      empty.textContent =
        filter !== 'all' && !term
          ? 'Nenhum produto encontrado nesta categoria'
          : 'Nenhum produto encontrado com esse filtro.';
      empty.classList.toggle('hidden', visible > 0);
    }
    const result = qs('[data-catalog-results]');
    if (result) {
      const suffix = term ? ` para "${rawTerm.trim()}"` : '';
      const suggested = term && visible ? (visible === 1 ? ' sugerido' : ' sugeridos') : '';
      result.textContent = `${visible} produto${visible === 1 ? '' : 's'}${suggested} encontrado${visible === 1 ? '' : 's'}${suffix}`;
    }
  }

  function bindProductCards() {
    document.body.addEventListener('change', (event) => {
      const select = event.target.closest('.product-option');
      if (!select) return;
      updateSelectedVariationUI(select);
    });

    document.body.addEventListener('click', (event) => {
      const button = event.target.closest('.btn-add-cart');
      if (!button) {
        const detailButton = event.target.closest('[data-catalog-detail]');
        if (detailButton) {
          event.preventDefault();
          openCatalogDetailModal(detailButton.dataset.catalogDetail || '');
          return;
        }

        const cardDetail = event.target.closest('.catalog-product');
        if (!cardDetail || event.target.closest('button, select, input, label, a')) return;
        openCatalogDetailModal(
          cardDetail.dataset.catalogDetailKey || cardDetail.dataset.productId || cardDetail.dataset.name,
        );
        return;
      }

      const card = button.closest('.product-card, .full-catalog-item, .catalog-detail-copy, .catalog-detail-panel');
      const select = card?.querySelector('.product-option');
      const option = select?.selectedOptions[0];
      const selectedState = select ? selectedVariationState(option, card) : null;
      const baseName = button.dataset.name || card?.dataset.name || card?.querySelector('h3')?.textContent.trim();
      const variant = selectedState?.name || option?.dataset.variationName || button.dataset.variationName || '';
      const variationId = selectedState?.variationId || option?.dataset.variationId || button.dataset.variationId || '';
      const price = Number(selectedState?.price ?? option?.dataset.price ?? button.dataset.price ?? 0);
      const image = canonicalAssetPath(
        selectedState?.image || card?.querySelector('.product-image')?.getAttribute('src') || button.dataset.image || '',
      );

      if (!baseName || Number.isNaN(price)) return;

      addToCart({
        productId: button.dataset.productId || card?.dataset.productId || '',
        variationId,
        name: baseName,
        variant,
        price,
        image,
        stock: selectedState ? selectedState.stock : button.dataset.stock === '' ? null : Number(button.dataset.stock),
      });
      closeCatalogDetailModal();

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
    const catalogProduct = product.productId
      ? productIndex.find((item) => String(normalizeProduct(item).id) === String(product.productId))
      : productIndex.find((item) => normalizeText(normalizeProduct(item).name) === normalizeText(product.name));
    const normalizedCatalogProduct = catalogProduct ? normalizeProduct(catalogProduct) : null;
    const selectedVariation = product.variationId
      ? normalizedCatalogProduct?.options.find((option) => String(option.id) === String(product.variationId))
      : null;
    if (normalizedCatalogProduct && normalizedCatalogProduct.active === false) {
      showToast(`${displayName} nao esta disponivel.`);
      return;
    }
    if (product.variationId && !selectedVariation) {
      showToast(`${displayName} nao esta disponivel.`);
      return;
    }
    const id = makeCartId(product.name, product.variant, product.variationId);
    const existing = cart.find((item) => item.id === id);
    const effectiveStock = selectedVariation ? selectedVariation.stock : product.stock;
    const stock =
      effectiveStock === null || effectiveStock === undefined || Number.isNaN(Number(effectiveStock))
        ? null
        : Number(effectiveStock);

    if (stock !== null && stock <= 0) {
      showToast(`${displayName} esta esgotado.`);
      return;
    }

    if (stock !== null && existing && existing.quantity >= stock) {
      showToast(`Estoque maximo de ${displayName} no carrinho.`);
      return;
    }

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id,
        productId: product.productId || '',
        variationId: product.variationId || '',
        name: displayName,
        baseName: product.name,
        variant: product.variant || '',
        price: Number(product.price || 0),
        quantity: 1,
        image: product.image || '',
        stock,
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

    const applyRailState = (index) => {
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

    qsa('[data-rail-scroll]').forEach((button) => {
      button.addEventListener('click', () => {
        focusCard(active + (button.dataset.railScroll === 'prev' ? -1 : 1));
      });
    });

    rail.addEventListener('click', (event) => {
      if (event.target.closest('button, select, input, textarea, label, a')) return;

      const card = event.target.closest('.rail-product');
      if (!card || !rail.contains(card)) return;

      const list = cards();
      const index = list.indexOf(card);
      if (index < 0) return;

      focusCard(index === active ? (active + 1) % list.length : index);
    });

    rail.addEventListener(
      'scroll',
      () => {
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
      },
      { passive: true },
    );

    window.requestAnimationFrame(() => applyRailState(0));
  }

  function ensureCartShell() {
    if (!qs('.cart-float') && !document.body.classList.contains('auth-body')) {
      const float = document.createElement('button');
      float.className = 'cart-float is-empty';
      float.type = 'button';
      float.dataset.openCart = '';
      float.innerHTML =
        '<i class="fa-solid fa-bag-shopping"></i><span>Carrinho</span><span class="badge" data-cart-count>0</span>';
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
            <button class="btn btn-secondary btn-full cart-clear-button hidden" type="button" data-clear-cart>
              <i class="fa-solid fa-trash-can"></i>
              Limpar carrinho
            </button>
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
    document.body.addEventListener('click', (event) => {
      const open = event.target.closest('[data-open-cart]');
      const close = event.target.closest('[data-close-cart]');
      const action = event.target.closest('[data-cart-action]');
      const pageCheckout = event.target.closest('[data-page-checkout]');
      const clearCart = event.target.closest('[data-clear-cart]');
      const applyCoupon = event.target.closest('[data-apply-coupon]');
      const clearCoupon = event.target.closest('[data-clear-coupon]');
      const repeatOrderButton = event.target.closest('[data-repeat-order]');

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

      if (clearCart) {
        clearCartItems();
        return;
      }

      if (applyCoupon) {
        applyCouponFromInput();
        return;
      }

      if (clearCoupon) {
        saveAppliedCoupon(null);
        renderPaymentSummary();
        showToast('Cupom removido.');
        return;
      }

      if (repeatOrderButton) {
        repeatOrderById(repeatOrderButton.dataset.repeatOrder, repeatOrderButton.dataset.repeatCheckout === 'true');
        return;
      }

      const cartSuggestion = event.target.closest('[data-cart-suggestion-product]');
      if (cartSuggestion) {
        const productId = cartSuggestion.dataset.cartSuggestionProduct || '';
        const product = productIndex.find((item) => String(normalizeProduct(item).id) === String(productId));
        const normalized = product ? normalizeProduct(product) : null;
        if (!normalized) return;
        const option = (normalized.options || []).find((item) => !optionOutOfStock(item));
        addToCart({
          productId: normalized.id,
          variationId: option?.id || '',
          name: normalized.name,
          variant: option?.name || '',
          price: Number(option?.price || normalized.price || 0),
          image: option?.image || productAssetPath(normalized),
          stock: option ? option.stock : normalized.stock,
        });
        return;
      }

      if (!action) return;

      const id = action.dataset.cartId;
      const item = cart.find((entry) => entry.id === id);
      if (!item) return;

      if (action.dataset.cartAction === 'increase') {
        if (item.stock !== null && item.stock !== undefined && item.quantity >= Number(item.stock)) {
          showToast('Limite de quantidade atingido para este item.');
          return;
        }
        item.quantity += 1;
      }
      if (action.dataset.cartAction === 'decrease') item.quantity = Math.max(1, item.quantity - 1);
      if (action.dataset.cartAction === 'remove') cart = cart.filter((entry) => entry.id !== id);

      saveCart();
      renderCart();
      renderPaymentSummary();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeCartModal();
        closeProductSearchModal();
      }
    });
  }

  function bindDataCleanupActions() {
    document.body.addEventListener('click', (event) => {
      const clearCache = event.target.closest('[data-clear-cache]');
      const clearOrders = event.target.closest('[data-clear-order-history]');
      const clearAll = event.target.closest('[data-clear-cache-orders]');

      if (clearCache) {
        clearLocalCache();
        return;
      }

      if (clearOrders) {
        clearOrderHistory();
        return;
      }

      if (clearAll) {
        if (!confirm('Deseja limpar cache local, carrinho e histórico de pedidos deste navegador?')) return;
        clearLocalCache(false);
        clearOrderHistory(false);
        showToast('Cache e histórico de pedidos limpos.');
      }
    });
  }

  function clearCartItems(showMessage = true) {
    if (!cart.length) {
      if (showMessage) showToast('O carrinho já está vazio.');
      return;
    }

    if (showMessage && !confirm('Deseja remover todos os produtos do carrinho?')) return;
    cart = [];
    saveAppliedCoupon(null);
    saveCart();
    renderCart();
    renderPaymentSummary();
    if (showMessage) showToast('Carrinho limpo.');
  }

  function applyCouponFromInput() {
    const input = qs('#payment-coupon');
    const raw = input?.value.trim() || '';
    if (!raw) {
      showToast('Digite um cupom.');
      return;
    }

    const coupon = couponByCode(raw);
    if (!coupon) {
      showToast('Cupom nao encontrado ou inativo.');
      return;
    }

    if (cartSubtotal() < coupon.minSubtotal) {
      showToast(`Este cupom vale acima de ${formatMoney(coupon.minSubtotal)}.`);
      return;
    }

    saveAppliedCoupon(coupon);
    renderPaymentSummary();
    showToast(`Cupom ${coupon.code} aplicado.`);
  }

  async function repeatOrderById(orderId, goToCheckout = false) {
    const orders = await loadOrdersFromSupabase();
    const order = orders.find((item) => item.id === orderId);
    if (!order?.items?.length) {
      showToast('Nao encontrei os itens deste pedido.');
      return;
    }

    cart = order.items.map((item) => {
      const baseName = item.baseName || item.name;
      return {
        id: makeCartId(baseName, item.variant || '', item.variationId || ''),
        productId: item.productId || '',
        variationId: item.variationId || '',
        name: item.variant ? `${baseName} - ${item.variant}` : item.name,
        baseName,
        variant: item.variant || '',
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        image: item.image || '',
      };
    });
    saveAppliedCoupon(null);
    saveCart();
    renderCart();
    renderPaymentSummary();
    showToast('Pedido repetido no carrinho.');
    window.location.href = goToCheckout ? checkoutHref() : productHref();
  }

  function clearOrderHistory(showMessage = true) {
    if (showMessage && !confirm('Deseja limpar o histórico de pedidos deste navegador?')) return;
    saveJSON(STORAGE.orders, []);
    renderOrdersEverywhere({ force: true });
    if (showMessage) showToast('Histórico de pedidos limpo.');
  }

  function clearLocalCache(showMessage = true) {
    if (showMessage && !confirm('Deseja limpar o cache local do site neste navegador?')) return;

    localStorage.removeItem(STORAGE.cart);
    localStorage.removeItem(STORAGE.coupon);
    localStorage.removeItem(STORAGE.legacyCart);
    localStorage.removeItem(STORAGE.legacyTheme);
    Object.keys(localStorage)
      .filter((key) => key.startsWith('ms_setting_'))
      .forEach((key) => localStorage.removeItem(key));

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }

    cart = [];
    appliedCoupon = null;
    renderCart();
    renderPaymentSummary();
    updateThemeControls();
    if (showMessage) showToast('Cache local limpo.');
  }

  function openCartModal() {
    renderCart();
    qs('.cart-modal')?.classList.add('open');
    document.body.classList.add('cart-open');
    setDockSectionActive('cart');
  }

  function closeCartModal() {
    qs('.cart-modal')?.classList.remove('open');
    document.body.classList.remove('cart-open');
    updateDockActive();
  }

  function renderCart() {
    const hasItems = cartCount() > 0;
    document.body.classList.toggle('cart-has-items', hasItems);

    qsa('[data-cart-count], #cart-count').forEach((el) => {
      el.textContent = String(cartCount());
    });
    qsa('[data-profile-cart-count]').forEach((el) => {
      el.textContent = String(cartCount());
    });

    qsa('[data-cart-total], #cart-total').forEach((el) => {
      el.textContent = formatMoney(cartSubtotal());
    });

    qsa('.cart-float, .nav-cart-link, .mobile-quick-dock .dock-cart, .mobile-menu-button[data-open-cart]').forEach(
      (button) => {
        button.classList.toggle('has-items', hasItems);
        button.classList.toggle('is-empty', !hasItems);
      },
    );

    const pageItems = qs('#cart-items');
    const modalItems = qs('[data-modal-cart-items]');
    if (pageItems) renderCartItems(pageItems);
    if (modalItems) renderCartItems(modalItems);

    qsa('[data-page-checkout], [data-modal-checkout]').forEach((button) => {
      button.classList.toggle('hidden', cart.length === 0);
      if (button instanceof HTMLAnchorElement) button.href = checkoutHref();
    });

    qsa('[data-clear-cart]').forEach((button) => {
      button.classList.toggle('hidden', cart.length === 0);
    });
  }

  function renderCartItems(container) {
    container.innerHTML = '';

    if (!cart.length) {
      container.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
      return;
    }

    cart.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'cart-item';
      row.innerHTML = `
        <div class="cart-item-left">
          <span class="cart-thumb">
            ${item.image ? `<img class="cart-thumb-img" src="${assetHref(item.image)}" alt="" loading="lazy" decoding="async">` : '<i class="fa-solid fa-box"></i>'}
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

    const suggestions = cartSuggestionProducts();
    if (suggestions.length) {
      const block = document.createElement('section');
      block.className = 'cart-suggestions';
      block.innerHTML = `
        <div class="cart-suggestions-head">
          <strong>Complete seu pedido</strong>
          <span>Sugestões rápidas para adicionar ao carrinho</span>
        </div>
        <div class="cart-suggestions-grid">
          ${suggestions
            .map((product) => {
              const imageSrc = assetHref(productAssetPath(product));
              return `
                <button class="cart-suggestion-card" type="button" data-cart-suggestion-product="${escapeHTML(product.id)}">
                  <span class="cart-suggestion-media">
                    ${
                      imageSrc
                        ? `<img src="${escapeHTML(imageSrc)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">${productPlaceholderHTML(product, 'product-placeholder-compact')}`
                        : productPlaceholderHTML(product, 'product-placeholder-compact')
                    }
                  </span>
                  <span class="cart-suggestion-copy">
                    <strong>${escapeHTML(product.name)}</strong>
                    <small>${escapeHTML(product.category)} - ${formatMoney(product.price)}</small>
                  </span>
                  <i class="fa-solid fa-plus" aria-hidden="true"></i>
                </button>
              `;
            })
            .join('')}
        </div>
      `;
      container.appendChild(block);
    }
  }

  function cartSuggestionProducts() {
    if (!cart.length || !productIndex.length) return [];
    const inCartProductIds = new Set(cart.map((item) => String(item.productId || '')).filter(Boolean));
    const inCartNames = new Set(cart.map((item) => normalizeText(item.baseName || item.name || '')));
    const active = productIndex
      .map(normalizeProduct)
      .filter((product) => product.active !== false)
      .filter((product) => !inCartProductIds.has(String(product.id || '')))
      .filter((product) => !inCartNames.has(normalizeText(product.name)))
      .filter((product) => {
        if (product.hasVariations) return (product.options || []).some((option) => !optionOutOfStock(option));
        return product.stockState !== 'out';
      });
    return [
      ...active.filter((product) => product.recommended || product.highlight || product.offerActive),
      ...active,
    ]
      .filter((product, index, list) => list.findIndex((item) => String(item.id) === String(product.id)) === index)
      .slice(0, 3);
  }

  function bindAccountPage() {
    const form = qs('#account-form');
    if (!form) return;

    const client = authClient();
    const params = new URLSearchParams(location.search);
    const tabs = qsa('.auth-mode-tab[data-auth-mode]');
    const submitLabel = qs('[data-auth-submit-label]');
    const status = qs('#account-status');
    const title = qs('#account-title');
    const nameInput = qs('#login-name');
    const emailInput = qs('#login-email');
    const passInput = qs('#login-password');
    const confirmInput = qs('#login-password-confirm');
    const phoneInput = qs('#login-phone');
    const addressInput = qs('#login-address');
    const passwordGroup = qs('[data-password-group]');
    const confirmGroup = qs('[data-confirm-password-group]');
    const submitButton = qs('button[type="submit"]', form);
    const resetLink = qs('[data-reset-password-link]', form);

    const setMode = (mode) => {
      form.dataset.authMode = mode;
      tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.authMode === mode));
      qsa('[data-register-only]').forEach((field) => field.classList.toggle('hidden', mode !== 'register'));
      passwordGroup?.classList.toggle('hidden', mode === 'reset-request');
      confirmGroup?.classList.toggle('hidden', !['register', 'reset-password'].includes(mode));
      resetLink?.classList.toggle('hidden', mode !== 'login');
      const passwordLabel = qs('label', passwordGroup || document);
      if (passwordLabel) {
        passwordLabel.textContent =
          {
            register: 'Criar senha',
            'reset-password': 'Nova senha',
          }[mode] || 'Senha';
      }

      if (submitLabel) {
        submitLabel.textContent =
          {
            register: 'Cadastrar',
            'reset-request': 'Enviar link',
            'reset-password': 'Salvar nova senha',
          }[mode] || 'Entrar';
      }

      if (title) {
        title.textContent =
          {
            register: 'Criar conta',
            'reset-request': 'Recuperar senha',
            'reset-password': 'Nova senha',
          }[mode] || 'Entrar';
      }

      if (status) {
        status.textContent =
          {
            register: 'Crie sua conta segura com Supabase Auth para salvar telefone e endereço.',
            'reset-request': 'Informe seu email para receber um link de recuperação de senha.',
            'reset-password': 'Digite e confirme sua nova senha para finalizar a recuperação.',
          }[mode] || 'Entre com Supabase Auth para usar seus dados salvos e finalizar pedidos mais rápido.';
      }

      form.setAttribute('autocomplete', 'on');
      emailInput?.setAttribute('name', 'username');
      emailInput?.setAttribute('autocomplete', 'username');
      passInput?.setAttribute('name', 'password');
      passInput?.setAttribute(
        'autocomplete',
        ['register', 'reset-password'].includes(mode) ? 'new-password' : 'current-password',
      );
      passInput?.setAttribute(
        'placeholder',
        mode === 'register' ? 'Crie uma senha' : mode === 'reset-password' ? 'Nova senha' : 'Sua senha',
      );
      confirmInput?.setAttribute('name', 'password_confirmation');
      confirmInput?.setAttribute('autocomplete', 'new-password');
      confirmInput?.setAttribute(
        'placeholder',
        mode === 'reset-password' ? 'Repita a nova senha' : 'Repita a senha criada',
      );
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.authMode || 'login')));
    resetLink?.addEventListener('click', () => setMode('reset-request'));
    qsa('[data-toggle-password]', form).forEach((button) => {
      button.addEventListener('click', () => {
        const input = qs(button.dataset.togglePassword);
        if (!input) return;
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        button.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
        button.innerHTML = visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
      });
    });
    window.addEventListener('monte-sinai-password-recovery', () => setMode('reset-password'));

    const applyProfileToForm = (profile) => {
      if (!profile) return;
      if (emailInput) emailInput.value = profile.email || '';
      if (nameInput) nameInput.value = profile.name || '';
      if (phoneInput) phoneInput.value = profile.phone || '';
      if (addressInput) addressInput.value = profile.address || '';
      if (passInput) passInput.value = '';
      if (confirmInput) confirmInput.value = '';
      emailInput?.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput?.dispatchEvent(new Event('change', { bubbles: true }));
      setMode('login');
      setTimeout(() => passInput?.focus(), 80);
    };

    const pendingEmail = sessionStorage.getItem(STORAGE.pendingProfile);
    const pendingProfile = pendingEmail
      ? savedProfiles().find((profile) => normalizeText(profile.email) === normalizeText(pendingEmail))
      : null;
    const savePasswordPreference = sessionStorage.getItem(STORAGE.pendingProfileSavePassword);
    const shouldSavePasswordAfterProfileSwitch =
      savePasswordPreference === null ? null : savePasswordPreference === 'true';
    if (currentUser?.email) applyProfileToForm(currentUser);
    if (pendingProfile) applyProfileToForm(pendingProfile);
    if (pendingEmail) sessionStorage.removeItem(STORAGE.pendingProfile);
    sessionStorage.removeItem(STORAGE.pendingProfileSavePassword);
    renderProfileChoices(form.parentElement || document);

    const setBusy = (busy) => {
      if (!submitButton) return;
      submitButton.disabled = busy;
      submitButton.classList.toggle('is-loading', busy);
    };

    const trySavedProfileLogin = async (profile, mediation = 'optional') => {
      if (!profile?.email || form.dataset.authMode !== 'login') return false;
      if (!profile.passwordSaved) {
        if (status) status.textContent = 'Digite a senha para entrar neste perfil.';
        return false;
      }
      let completed = false;
      setBusy(true);
      if (status) status.textContent = 'Verificando senha salva no navegador...';
      try {
        const user = await signInWithSavedBrowserProfile(profile, {
          mediation,
          context: 'login com perfil salvo',
        });
        if (!user) return false;
        completed = true;
        finishLogin(user, `Login realizado com a senha salva de ${displayProfileName(user)}.`);
        return true;
      } catch (error) {
        console.warn('[Auth] Nao foi possivel entrar com a senha salva.', error);
        showToast(authFriendlyError(error, 'A senha salva nao funcionou. Digite a senha para entrar.'));
        if (passInput) passInput.value = '';
        return false;
      } finally {
        setBusy(false);
        if (!completed && status) {
          status.textContent = 'Digite sua senha para entrar. Se o navegador oferecer uma senha salva, voce pode usar.';
        }
      }
    };

    if (pendingProfile) {
      window.setTimeout(() => {
        trySavedProfileLogin(pendingProfile, 'required').then((signedIn) => {
          if (!signedIn) passInput?.focus();
        });
      }, 120);
    }

    (form.parentElement || document).addEventListener('click', async (event) => {
      const select = event.target.closest('[data-select-saved-profile]');
      if (select) {
        const profile = selectSavedProfile(select.dataset.selectSavedProfile);
        applyProfileToForm(profile);
        sessionStorage.removeItem(STORAGE.pendingProfile);
        if (profile) await trySavedProfileLogin(profile, 'required');
        return;
      }

      const remove = event.target.closest('[data-remove-saved-profile]');
      if (remove) {
        event.preventDefault();
        event.stopPropagation();
        removeSavedProfile(remove.dataset.removeSavedProfile);
      }
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const mode = form.dataset.authMode || 'login';
      const email = emailInput.value.trim().toLowerCase();
      const password = passInput.value;

      if (!client?.auth) {
        showToast('Autenticação indisponível agora. Tente novamente em alguns instantes.');
        return;
      }

      if (!email) {
        showToast('Informe seu email para continuar.');
        return;
      }

      if (mode === 'reset-request') {
        setBusy(true);
        try {
          const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: authRedirectUrl('login.html', { mode: 'reset-password' }),
          });
          if (error) throw error;
          showToast('Enviamos um link de recuperação para seu email.');
          if (status)
            status.textContent =
              'Confira sua caixa de entrada e spam. O link leva você de volta para criar uma nova senha.';
        } catch (error) {
          showToast(authFriendlyError(error, 'Não consegui enviar o link. Confira o email e tente novamente.'));
        } finally {
          setBusy(false);
        }
        return;
      }

      if (!password) {
        showToast('Informe sua senha para continuar.');
        return;
      }

      if (['register', 'reset-password'].includes(mode)) {
        if (password.length < 6) {
          showToast('Use uma senha com pelo menos 6 caracteres.');
          return;
        }

        if (password !== confirmInput.value) {
          showToast('A confirmação da senha precisa ser igual.');
          return;
        }
      }

      if (mode === 'reset-password') {
        setBusy(true);
        try {
          const { data: sessionData } = await client.auth.getSession();
          if (!sessionData?.session) {
            showToast('Abra o link recebido por email antes de salvar a nova senha.');
            return;
          }

          const { data, error } = await client.auth.updateUser({ password });
          if (error) throw error;
          const user = userFromAuthUser(data.user);
          if (!user?.email) throw new Error('Sessão não retornada pelo Supabase.');
          saveUser(user);
          await safeUpsertProfileRecord(data.user, user, 'recuperacao de senha');
          const nextUser = await userWithPasswordPreference(user, {
            email,
            password,
            name: user.name || email,
            shouldSave: shouldSavePasswordAfterProfileSwitch,
            session: sessionData.session,
          });
          finishLogin(
            nextUser,
            nextUser.passwordSaved ? 'Acesso automatico atualizado neste navegador.' : 'Senha atualizada com sucesso.',
          );
        } catch (error) {
          showToast(authFriendlyError(error, 'Não consegui atualizar a senha. Tente abrir o link novamente.'));
        } finally {
          setBusy(false);
        }
        return;
      }

      setBusy(true);
      try {
        if (mode === 'register') {
          const name = nameInput.value.trim();
          const phone = phoneInput.value.trim();
          const address = addressInput.value.trim();

          if (!name || !phone || !address) {
            showToast('Preencha nome, WhatsApp e endereço para cadastrar.');
            return;
          }

          const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: authRedirectUrl('perfil.html'),
              data: { name, phone, address, nick: '', photo: '' },
            },
          });
          if (error) throw error;

          if (data.session?.user) {
            const user = userFromAuthUser(data.session.user);
            saveUser(user);
            await safeUpsertProfileRecord(data.session.user, user, 'cadastro');
            const nextUser = await userWithPasswordPreference(user, {
              email,
              password,
              name,
              shouldSave: shouldSavePasswordAfterProfileSwitch,
              session: data.session,
            });
            sendWelcomeEmail(user);
            finishLogin(
              nextUser,
              nextUser.passwordSaved
                ? 'Conta criada e acesso automatico guardado neste navegador.'
                : 'Conta criada com sucesso.',
            );
          } else {
            if (shouldSavePasswordAfterProfileSwitch === true) await rememberBrowserPassword({ email, password, name });
            showToast('Conta criada. Entre com email e senha para receber a boas-vindas e salvar seus dados.');
            setMode('login');
          }
          return;
        }

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = userFromAuthUser(data.session?.user);
        if (!user?.email) throw new Error('Sessão não retornada pelo Supabase.');
        saveUser(user);
        await safeUpsertProfileRecord(data.session.user, user, 'login');
        const nextUser = await userWithPasswordPreference(user, {
          email,
          password,
          name: user.name || email,
          shouldSave: shouldSavePasswordAfterProfileSwitch,
          session: data.session,
        });
        finishLogin(
          nextUser,
          nextUser.passwordSaved
            ? 'Login realizado. Acesso automatico guardado neste navegador.'
            : profileComplete(nextUser)
              ? 'Login realizado.'
              : 'Login realizado. Complete seu endereço quando finalizar.',
        );
      } catch (error) {
        showToast(authFriendlyError(error, 'Não foi possível entrar. Confira os dados e tente novamente.'));
      } finally {
        setBusy(false);
      }
    });

    const initialMode =
      params.get('mode') === 'register'
        ? 'register'
        : params.get('mode') === 'reset-password' || location.hash.includes('type=recovery')
          ? 'reset-password'
          : 'login';
    setMode(initialMode);
  }

  function finishLogin(user, message) {
    if (user) saveUser(user);
    showToast(message);

    const params = new URLSearchParams(location.search);
    const redirect = safeRedirectTarget(params.get('redirect'), profileHref());
    setTimeout(() => {
      window.location.href = redirect;
    }, 500);
  }

  function initPaymentPage() {
    if (!qs('#payment-summary')) return;

    qsa('[data-payment-option]').forEach((button) => {
      button.addEventListener('click', () => setPaymentOption(button.dataset.paymentOption || 'delivery'));
    });

    qs('#order-for-other')?.addEventListener('change', (event) => {
      if (event.target.checked) {
        qs('#payment-form')?.classList.remove('profile-ready');
        ['#payment-name', '#payment-phone', '#payment-address'].forEach((selector) => {
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

    qs('#payment-confirm')?.addEventListener('click', finalizarPedido);

    renderPaymentSummary();
    applyCheckoutProfile();
    setPaymentOption('delivery');
  }

  function setPaymentOption(option) {
    activePayment = option || 'delivery';
    qsa('[data-payment-option]').forEach((button) => {
      button.classList.toggle('active', button.dataset.paymentOption === activePayment);
    });
    qsa('[data-payment-panel]').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.paymentPanel === activePayment);
    });

    const confirm = qs('#payment-confirm');
    if (confirm) {
      confirm.innerHTML =
        activePayment === 'whatsapp'
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
    cart.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'payment-item';
      row.innerHTML = `<span>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</span><strong>${formatMoney(item.price * item.quantity)}</strong>`;
      list.appendChild(row);
    });

    const fee = deliveryFee();
    const coupon = currentCoupon();
    const discount = couponDiscount();
    const gift = hasGasGift();
    summary.appendChild(list);
    summary.insertAdjacentHTML(
      'beforeend',
      `
      <div class="coupon-box">
        <label for="payment-coupon">Cupom de desconto</label>
        <div class="coupon-entry">
          <input id="payment-coupon" type="text" value="${escapeHTML(appliedCoupon?.code || '')}" placeholder="Digite seu cupom">
          <button class="btn btn-secondary" type="button" data-apply-coupon>Aplicar</button>
        </div>
        ${
          coupon
            ? `<p class="coupon-feedback">Cupom ${escapeHTML(coupon.code)} ativo: ${escapeHTML(coupon.label)} <button type="button" data-clear-coupon>remover</button></p>`
            : '<p class="coupon-feedback">Use um cupom divulgado pela loja para ganhar desconto.</p>'
        }
      </div>
      <div class="payment-fee">
        <span>Subtotal</span>
        <strong>${formatMoney(cartSubtotal())}</strong>
      </div>
      ${discount ? `<div class="payment-fee payment-discount"><span>Desconto</span><strong>- ${formatMoney(discount)}</strong></div>` : ''}
      <div class="payment-fee">
        <span>Entrega</span>
        <strong>${fee ? formatMoney(fee) : 'Grátis'}</strong>
      </div>
      ${gift ? `<div class="payment-gift"><span>Brinde</span><strong>${escapeHTML(ownerGiftText())}</strong></div>` : ''}
      <div class="payment-total">
        <span>Total</span>
        <strong>${formatMoney(orderTotal())}</strong>
      </div>
      <button class="btn btn-secondary btn-full cart-clear-button" type="button" data-clear-cart>
        <i class="fa-solid fa-trash-can"></i>
        Limpar carrinho
      </button>
    `,
    );
  }

  function applyCheckoutProfile() {
    const form = qs('#payment-form');
    const profileBox = qs('#checkout-profile-box');
    const accountCard = qs('#checkout-account-card');
    const accountText = qs('#checkout-account-text');
    const loginLink = qs('[data-account-login]');
    const signed = Boolean(currentUser?.email);
    const complete = profileComplete();

    accountCard?.classList.toggle('is-signed', signed);
    accountCard?.classList.toggle('needs-profile-data', signed && !complete);
    accountCard?.classList.toggle('profile-complete', complete);

    if (signed) {
      const nameInput = qs('#payment-name');
      const phoneInput = qs('#payment-phone');
      const addressInput = qs('#payment-address');

      if (nameInput && currentUser.name) nameInput.value = currentUser.name;
      if (phoneInput && currentUser.phone) phoneInput.value = currentUser.phone;
      if (addressInput && currentUser.address) addressInput.value = currentUser.address;

      form?.classList.toggle('profile-ready', complete);
      profileBox?.classList.remove('hidden');
      if (profileBox) {
        const boxText = qs('p', profileBox);
        if (boxText) {
          boxText.textContent = complete
            ? `Usando os dados salvos de ${firstName()} para este pedido.`
            : 'Conta conectada. Complete os dados que faltam para finalizar o pedido.';
        }
      }
      if (accountText) {
        accountText.textContent = complete
          ? `Conta conectada como ${firstName()}. Seus dados serao usados na entrega.`
          : `Conta conectada como ${firstName()}. Complete telefone e endereco para finalizar.`;
      }
      if (loginLink) {
        loginLink.href = profileHref();
        loginLink.innerHTML = complete
          ? '<i class="fa-solid fa-user-check"></i> Minha conta'
          : '<i class="fa-solid fa-user-pen"></i> Completar dados';
      }
    } else {
      form?.classList.remove('profile-ready');
      profileBox?.classList.add('hidden');
      if (accountText)
        accountText.textContent = 'Login opcional: preencha os dados abaixo para finalizar como visitante.';
      if (loginLink) {
        loginLink.href = loginHref({ redirect: currentLocationForRedirect() });
        loginLink.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar para salvar dados';
      }
    }
  }

  function collectCheckoutCustomer() {
    const customer = {
      name: qs('#payment-name')?.value.trim() || '',
      phone: qs('#payment-phone')?.value.trim() || '',
      address: qs('#payment-address')?.value.trim() || '',
      note: qs('#payment-note')?.value.trim() || '',
      email: currentUser?.email || '',
    };

    if (!customer.name || !customer.phone || !customer.address) {
      showToast('Preencha nome, telefone e endereço.');
      return null;
    }

    return customer;
  }

  async function finalizarPedido() {
    if (!cart.length) {
      showToast('Seu carrinho está vazio.');
      return;
    }

    await authReady.catch(() => null);
    const client = ordersClient();
    let authUser = null;
    try {
      authUser = await currentAuthUser();
    } catch (error) {
      console.warn('[Supabase] Nao foi possivel conferir usuario autenticado.', error);
    }

    const customer = collectCheckoutCustomer();
    if (!customer) return;

    const coupon = currentCoupon();
    const discount = couponDiscount();
    const order = {
      id: createOrderId(),
      createdAt: new Date().toISOString(),
      customer,
      items: cart.map((item) => ({ ...item })),
      subtotal: cartSubtotal(),
      discount,
      coupon: coupon ? { code: coupon.code, label: coupon.label, type: coupon.type, value: coupon.value } : null,
      delivery: deliveryFee(),
      total: orderTotal(),
      gift: hasGasGift(),
      payment:
        activePayment === 'whatsapp'
          ? 'Combinar pelo WhatsApp'
          : qs('input[name="delivery-payment"]:checked')?.value || 'Pagar na entrega',
      status: 'Recebido',
      confirmed: false,
      paymentStatus: 'Pendente',
      customerType: authUser?.id ? 'cliente' : 'visitante',
    };

    const confirm = qs('#payment-confirm');
    if (confirm) {
      confirm.disabled = true;
      confirm.classList.add('is-loading');
    }

    let savedInSupabase = false;
    let checkoutWarning = '';
    try {
      if (!client) throw new Error('Cliente Supabase indisponivel.');
      await saveOrder(order, authUser);
      savedInSupabase = true;
    } catch (error) {
      console.error('[Supabase] Erro ao salvar pedido:', error);
      checkoutWarning = checkoutFriendlyError(error);
      saveOrderLocally(order);
      showToast('O Supabase falhou, mas seu pedido sera enviado pelo WhatsApp.', {
        type: 'warning',
        title: 'Pedido por WhatsApp',
      });
    }

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
          <p>${
            savedInSupabase
              ? `Seu pedido foi salvo e enviado para atendimento no WhatsApp. ${authUser?.id ? 'Ele tambem ficou vinculado ao seu perfil.' : 'Voce finalizou como visitante, sem precisar fazer login.'}`
              : `Seu pedido foi enviado pelo WhatsApp. ${checkoutWarning || 'O Supabase nao salvou agora, entao confirme o pedido pela conversa.'}`
          }</p>
          <a class="btn btn-primary" href="https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
            Reenviar WhatsApp
          </a>
          <a class="btn btn-secondary" href="${productHref()}">Comprar mais</a>
        </div>
      `;
    }

    renderOrdersEverywhere({ force: true });
    showToast('Pedido finalizado.');
  }

  async function finalizeOrder() {
    return finalizarPedido();
  }

  function createOrderId() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MS-${date}-${random}`;
  }

  async function saveOrder(order, authUser) {
    const client = ordersClient();
    if (!client) throw new Error('Cliente Supabase indisponivel.');

    if (authUser?.id) {
      order.customer.email = order.customer.email || authUser.email || '';
      await upsertProfileRecord(authUser, {
        ...currentUser,
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
      });
    }

    const saved = await saveOrderThroughRpc(order);
    if (saved?.order_id) order.uuid = saved.order_id;
    if (saved?.codigo) order.id = saved.codigo;
    if (Number.isFinite(Number(saved?.subtotal))) order.subtotal = Number(saved.subtotal);
    if (Number.isFinite(Number(saved?.desconto))) order.discount = Number(saved.desconto);
    if (Number.isFinite(Number(saved?.entrega))) order.delivery = Number(saved.entrega);
    if (Number.isFinite(Number(saved?.total))) order.total = Number(saved.total);
    if (saved?.cliente_tipo) order.customerType = saved.cliente_tipo;

    saveOrderLocally(order);
  }

  function orderPayload(order) {
    return {
      codigo: order.id,
      cliente_tipo: order.customerType || 'visitante',
      cliente_nome: order.customer.name,
      cliente_email: order.customer.email || '',
      cliente_telefone: order.customer.phone,
      endereco_entrega: order.customer.address,
      observacao: order.customer.note || '',
      pagamento: order.payment,
      status: order.status,
      subtotal: order.subtotal,
      desconto: order.discount || 0,
      cupom_codigo: order.coupon?.code || '',
      entrega: order.delivery,
      total: order.total,
      brinde: order.gift,
      whatsapp_enviado: true,
      confirmado: false,
      pagamento_status: normalizePaymentStatus(order.paymentStatus),
    };
  }

  function orderItemsPayload(order) {
    return order.items.map((item) => ({
      produto_id: isUUID(item.productId) ? item.productId : null,
      variacao_id: isUUID(item.variationId) ? item.variationId : null,
      nome: item.name,
      variacao: item.variant || '',
      quantidade: Number(item.quantity || 1),
      preco_unitario: Number(item.price || 0),
      total: Number(item.price || 0) * Number(item.quantity || 1),
      imagem: item.image || '',
    }));
  }

  async function saveOrderThroughRpc(order) {
    const client = ordersClient();
    const { data, error } = await client.rpc('create_order', {
      order_payload: orderPayload(order),
      items_payload: orderItemsPayload(order),
    });
    if (error) throw error;
    return data || {};
  }

  function orderKeyCandidates(order = {}) {
    const values = [order.uuid, order.order_id, order.pedido_id, order.codigo, order.id];
    return values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .map((value) => value.toLowerCase());
  }

  function orderHasRemoteIdentity(order = {}) {
    return isUUID(order.uuid || order.order_id || order.pedido_id || '');
  }

  function preferredOrder(nextOrder, currentOrder) {
    if (!currentOrder) return nextOrder;
    const nextRemote = orderHasRemoteIdentity(nextOrder);
    const currentRemote = orderHasRemoteIdentity(currentOrder);
    if (nextRemote !== currentRemote) return nextRemote ? nextOrder : currentOrder;

    const nextTime = new Date(nextOrder.createdAt || nextOrder.created_at || 0).getTime();
    const currentTime = new Date(currentOrder.createdAt || currentOrder.created_at || 0).getTime();
    return nextTime >= currentTime ? nextOrder : currentOrder;
  }

  function dedupeOrders(orders = []) {
    const visible = [];
    const keyIndex = new Map();

    orders.filter(Boolean).forEach((order) => {
      const keys = orderKeyCandidates(order);
      const existingIndex = keys.map((key) => keyIndex.get(key)).find((index) => Number.isInteger(index));
      if (Number.isInteger(existingIndex)) {
        visible[existingIndex] = preferredOrder(order, visible[existingIndex]);
        orderKeyCandidates(visible[existingIndex]).forEach((key) => keyIndex.set(key, existingIndex));
        return;
      }

      const nextIndex = visible.length;
      visible.push(order);
      keys.forEach((key) => keyIndex.set(key, nextIndex));
    });

    return visible;
  }

  function loadLocalOrders() {
    // Cache local apenas para o cliente reencontrar os pedidos recentes.
    // Historico admin, arquivamento e financeiro devem vir sempre do Supabase.
    return dedupeOrders(loadJSON(STORAGE.orders, []).map(trackedOrderFromPayload));
  }

  function saveOrderLocally(order) {
    // Nao usar este cache para operacoes administrativas ou dados de producao.
    const orders = dedupeOrders([trackedOrderFromPayload(order), ...loadLocalOrders()]);
    saveJSON(STORAGE.orders, orders.slice(0, 20));
  }

  function optimizeImageLoading() {
    qsa('img').forEach((img, index) => {
      const priority =
        img.classList.contains('brand-logo') ||
        img.classList.contains('hero-3d-product') ||
        img.classList.contains('hero-visual') ||
        index < 4;

      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('loading')) img.setAttribute('loading', priority ? 'eager' : 'lazy');
      if (priority && !img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'high');
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.update().catch(() => {});
        })
        .catch((error) => {
          console.warn('[PWA] Nao foi possivel registrar o service worker.', error);
        });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (sessionStorage.getItem('ms_sw_reloaded_v2') === 'true') return;
      sessionStorage.setItem('ms_sw_reloaded_v2', 'true');
      window.location.reload();
    });
  }

  function initInstallPrompt() {
    syncInstallVisibility();
    bindInstallButtons();

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      syncInstallVisibility();
      if (isAppInstalled()) return;
      deferredInstallPrompt = event;
      if (!installPromptBlocked()) scheduleInstallPrompt(false);
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      markAppInstalled();
      hideInstallPrompt();
      showToast('Aplicativo Monte Sinai instalado.', { type: 'install' });
    });

    if (!installPromptBlocked() && isIOSInstallCandidate()) scheduleInstallPrompt(true);
  }

  function bindInstallButtons() {
    qsa('[data-install-app]').forEach((button) => {
      if (button.dataset.installBound === 'true') return;
      button.dataset.installBound = 'true';
      if (isAppInstalled()) {
        button.classList.add('hidden');
        button.hidden = true;
        return;
      }
      button.addEventListener('click', () => handleManualInstallRequest());
    });
  }

  async function handleManualInstallRequest() {
    if (isAppInstalled()) {
      syncInstallVisibility();
      showToast('O app Monte Sinai ja esta instalado neste aparelho.', { type: 'install' });
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      if (choice?.outcome === 'accepted') {
        hideInstallPrompt();
        markAppInstalled();
        showToast('Instalacao iniciada.', { type: 'install' });
      } else {
        showToast('Instalacao cancelada. Voce pode tentar novamente depois.', { type: 'warning' });
      }
      return;
    }

    renderInstallPrompt(isIOSInstallCandidate(), { manual: true });
    showToast(
      isIOSInstallCandidate()
        ? 'No iPhone, toque em compartilhar e depois em Adicionar a Tela de Inicio.'
        : 'No Chrome ou Edge, use o menu do navegador e escolha Instalar app.',
      { type: 'install' },
    );
  }

  function installPromptBlocked(options = {}) {
    const manual = options.manual === true;
    if (!manual && document.body.classList.contains('auth-body')) return true;
    if (!manual && ['painel.html', 'login.html', 'pagamento.html'].includes(currentPage())) return true;
    if (isAppInstalled()) return true;
    const dismissedUntil = Number(localStorage.getItem(STORAGE.installPromptDismissed) || 0);
    return !manual && Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  }

  function isAppInstalled() {
    return isStandaloneApp() || localStorage.getItem(STORAGE.appInstalled) === 'true';
  }

  function isStandaloneApp() {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function markAppInstalled() {
    try {
      localStorage.setItem(STORAGE.appInstalled, 'true');
      localStorage.setItem(STORAGE.installPromptDismissed, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
    } catch (_error) {}
    syncInstallVisibility();
  }

  function syncInstallVisibility() {
    const installed = isAppInstalled();
    document.body.classList.toggle('app-is-installed', installed);
    if (installed) hideInstallPrompt();
    qsa('[data-install-app], .auth-install-button').forEach((element) => {
      element.classList.toggle('hidden', installed);
      element.hidden = installed;
      element.setAttribute('aria-hidden', String(installed));
      if (installed) element.setAttribute('tabindex', '-1');
      else element.removeAttribute('tabindex');
    });
  }

  function isIOSInstallCandidate() {
    const agent = window.navigator.userAgent || '';
    const isAppleMobile = /iphone|ipad|ipod/i.test(agent);
    return isAppleMobile && !isStandaloneApp();
  }

  function scheduleInstallPrompt(iosHelp = false) {
    if (installPromptBlocked()) return;
    window.setTimeout(() => renderInstallPrompt(iosHelp), iosHelp ? 2600 : 1600);
  }

  function renderInstallPrompt(iosHelp = false, options = {}) {
    const manual = options.manual === true;
    if (installPromptBlocked({ manual }) || installPromptVisible || qs('[data-app-install-banner]')) return;
    if (!iosHelp && !deferredInstallPrompt && !manual) return;

    const banner = document.createElement('aside');
    banner.className = 'app-install-banner';
    banner.dataset.appInstallBanner = 'true';
    banner.setAttribute('aria-label', 'Instalar aplicativo Monte Sinai');
    banner.innerHTML = `
      <div class="app-install-icon">
        <img src="${escapeHTML(assetHref(siteConfig.logoUrl || DEFAULT_SITE_CONFIG.logoUrl))}" alt="" loading="eager" decoding="async">
      </div>
      <div class="app-install-copy">
        <strong>Baixe o app Monte Sinai</strong>
        <span>${
          iosHelp
            ? 'No iPhone, toque em compartilhar e escolha "Adicionar a Tela de Inicio".'
            : deferredInstallPrompt
              ? 'Instale no celular para pedir agua, gas e limpeza mais rapido.'
              : 'Abra o menu do Chrome ou Edge e escolha Instalar app.'
        }</span>
      </div>
      <div class="app-install-actions">
        <button class="btn btn-primary" type="button" data-app-install-action>
          <i class="fa-solid fa-download"></i>
          ${iosHelp || !deferredInstallPrompt ? 'Entendi' : 'Instalar'}
        </button>
        <button class="app-install-close" type="button" aria-label="Fechar sugestao de app" data-app-install-dismiss>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;

    document.body.appendChild(banner);
    installPromptVisible = true;
    requestAnimationFrame(() => banner.classList.add('show'));

    qs('[data-app-install-dismiss]', banner)?.addEventListener('click', () => dismissInstallPrompt());
    qs('[data-app-install-action]', banner)?.addEventListener('click', async () => {
      if (iosHelp) {
        dismissInstallPrompt(14);
        return;
      }
      if (!deferredInstallPrompt) {
        dismissInstallPrompt(manual ? 0 : 3);
        return;
      }
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      if (choice?.outcome === 'accepted') {
        markAppInstalled();
        hideInstallPrompt();
      } else dismissInstallPrompt(7);
    });
  }

  function dismissInstallPrompt(days = 7) {
    try {
      localStorage.setItem(STORAGE.installPromptDismissed, String(Date.now() + days * 24 * 60 * 60 * 1000));
    } catch (_error) {}
    hideInstallPrompt();
  }

  function hideInstallPrompt() {
    const banner = qs('[data-app-install-banner]');
    installPromptVisible = false;
    if (!banner) return;
    banner.classList.remove('show');
    window.setTimeout(() => banner.remove(), 220);
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
      '*Itens:*',
    ];

    order.items.forEach((item) => {
      lines.push(`- ${item.quantity} x ${item.name} = ${formatMoney(item.price * item.quantity)}`);
    });

    lines.push('');
    lines.push(`Subtotal: ${formatMoney(order.subtotal)}`);
    if (order.coupon?.code) lines.push(`Cupom: ${order.coupon.code}`);
    if (order.discount) lines.push(`Desconto: - ${formatMoney(order.discount)}`);
    lines.push(`Entrega: ${order.delivery ? formatMoney(order.delivery) : 'Grátis'}`);
    if (order.gift) lines.push(`Brinde: ${ownerGiftText()}`);
    lines.push(`*Total: ${formatMoney(order.total)}*`);
    if (order.customer.note) lines.push(`Observações: ${order.customer.note}`);
    return lines.join('\n');
  }

  function openWhatsAppOrder(order) {
    window.open(`https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}`, '_blank');
  }

  function buildOrderUpdateMessage(order) {
    const status = normalizeOrderStatus(order.status);
    const payment = normalizePaymentStatus(order.paymentStatus);
    const lines = [
      `Ola, ${order.customer?.name || 'cliente'}! Aqui e a Monte Sinai.`,
      `Seu pedido ${order.id} foi atualizado.`,
      `Entrega: ${status}.`,
      `Pagamento: ${payment}.`,
    ];
    if (status === 'Saiu para entrega') lines.push('Seu pedido saiu para entrega e esta a caminho.');
    if (status === 'Entregue') lines.push('Obrigado pela preferencia. A Monte Sinai cuida de voce e da sua casa.');
    if (payment === 'Pendente') lines.push('Se precisar combinar o pagamento, responda esta mensagem.');
    return lines.join('\n');
  }

  function openCustomerStatusWhatsApp(order) {
    const phone = onlyDigits(order.customer?.phone || '');
    const target = phone.length >= 10 ? phone : ownerWhatsApp();
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(buildOrderUpdateMessage(order))}`, '_blank');
  }

  function profileActionText(signed, action) {
    if (!signed) {
      return (
        {
          personal: 'Entre ou cadastre-se para salvar nome, WhatsApp, endereço e foto.',
          orders: 'Abra o catálogo, escolha os produtos e finalize quando estiver pronto.',
          privacy: 'Ajuste tema, notificações, cache, carrinho e histórico local.',
          support: 'Fale conosco pelo WhatsApp para dúvidas, pedidos e ajuda no cadastro.',
        }[action] || ''
      );
    }

    const missing = [
      !currentUser.name ? 'nome' : '',
      !currentUser.phone ? 'WhatsApp' : '',
      !currentUser.address ? 'endereço' : '',
    ].filter(Boolean);

    if (action === 'personal') {
      return missing.length
        ? `Conta conectada. Falta completar: ${missing.join(', ')}.`
        : `${firstName()}, seus dados estão prontos para pedidos rápidos.`;
    }

    if (action === 'orders') {
      const count = cartCount();
      return count
        ? `Você tem ${count} item${count === 1 ? '' : 's'} no carrinho para finalizar.`
        : 'Acompanhe seus pedidos e veja cada mudanca de status atualizada pela loja.';
    }

    if (action === 'privacy') {
      return 'Seus dados ficam na sua conta Supabase e são usados apenas para agilizar pedidos.';
    }

    if (action === 'support') {
      return `Chame a Monte Sinai pelo WhatsApp${currentUser.name ? ` como ${firstName()}` : ''}.`;
    }

    return '';
  }

  function setProfileActionCard(action, config) {
    const card = qs(`[data-profile-action-card="${action}"]`);
    if (!card) return;

    const text = qs('[data-profile-action-text]', card);
    const cta = qs('.profile-action-card-cta', card);
    if (text) text.textContent = config.text || '';
    if (cta) {
      cta.innerHTML = `${escapeHTML(config.cta || 'Abrir')} <i class="fa-solid fa-arrow-right"></i>`;
    }

    if (card instanceof HTMLAnchorElement) {
      card.href = config.href;
      if (config.external) {
        card.target = '_blank';
        card.rel = 'noreferrer';
      } else {
        card.removeAttribute('target');
        card.removeAttribute('rel');
      }
    }

    card.setAttribute('aria-label', config.label || config.cta || 'Abrir ação do perfil');
  }

  function updateProfileActionCards(signed) {
    const cartHasItems = cartCount() > 0;
    const supportText = signed
      ? `Olá, sou ${currentUser.name || currentUser.email}. Preciso de ajuda no site Monte Sinai.`
      : 'Olá, preciso de ajuda no site Monte Sinai.';

    setProfileActionCard('personal', {
      href: signed ? 'editar-perfil.html' : loginHref({ mode: 'register', redirect: 'perfil.html' }),
      text: profileActionText(signed, 'personal'),
      cta: signed ? (profileComplete() ? 'Atualizar dados' : 'Completar perfil') : 'Entrar ou cadastrar',
      label: signed ? 'Editar dados pessoais' : 'Entrar ou cadastrar para salvar dados',
    });

    setProfileActionCard('orders', {
      href: cartHasItems ? checkoutHref() : ordersHref(),
      text: profileActionText(signed, 'orders'),
      cta: cartHasItems ? 'Finalizar carrinho' : 'Ver meus pedidos',
      label: cartHasItems ? 'Finalizar pedido no carrinho' : 'Acompanhar pedidos',
    });

    setProfileActionCard('privacy', {
      href: 'configuracoes.html#controle-dados',
      text: profileActionText(signed, 'privacy'),
      cta: 'Abrir privacidade',
      label: 'Abrir configurações de privacidade e dados',
    });

    setProfileActionCard('support', {
      href: `https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(supportText)}`,
      text: profileActionText(signed, 'support'),
      cta: 'Chamar no WhatsApp',
      label: 'Abrir suporte direto no WhatsApp',
      external: true,
    });
  }

  function initProfilePage() {
    if (!qs('#profile-page') || currentPage() !== 'perfil.html') return;
    const firstBind = document.body.dataset.profilePageBound !== 'true';
    const summary = qs('.profile-summary');
    const details = qs('#profile-details');
    const empty = qs('#profile-empty');
    const guestActions = qs('#profile-guest-actions');
    const authActions = qs('#profile-actions');
    const authOnly = qsa('[data-auth-only]');
    const loginUrl = loginHref({ redirect: 'perfil.html' });
    const registerUrl = loginHref({ mode: 'register', redirect: 'perfil.html' });
    const signed = Boolean(currentUser?.email);

    document.body.classList.toggle('profile-guest-mode', !signed);
    empty?.classList.add('hidden');
    summary?.classList.remove('hidden');
    details?.classList.remove('hidden');
    guestActions?.classList.toggle('hidden', signed);
    authActions?.classList.toggle('hidden', !signed);
    authOnly.forEach((item) => item.classList.toggle('hidden', !signed));
    qsa('[data-profile-login]').forEach((link) => {
      if (link instanceof HTMLAnchorElement) link.href = loginUrl;
    });
    qsa('[data-profile-register]').forEach((link) => {
      if (link instanceof HTMLAnchorElement) link.href = registerUrl;
    });

    const avatar = qs('#profile-avatar');
    if (avatar) {
      avatar.textContent = signed ? (currentUser.name || currentUser.email || 'U').trim().charAt(0).toUpperCase() : 'V';
      if (signed && currentUser.photo) {
        avatar.innerHTML = `<img src="${escapeHTML(currentUser.photo)}" alt="" loading="lazy" decoding="async">`;
      }
    }

    if (!currentUser) currentUser = {};

    setText('#profile-name', signed ? currentUser.name || 'Cliente Monte Sinai' : 'Cliente visitante');
    setText('#profile-nick', signed && currentUser.nick ? `@${currentUser.nick}` : '');
    setText(
      '#profile-provider',
      signed ? currentUser.provider || 'Supabase Auth' : 'Entre ou cadastre-se para salvar seus dados',
    );
    setText('#profile-email', signed ? currentUser.email || 'Não informado' : 'Aparece após entrar ou cadastrar');
    setText(
      '#profile-phone',
      signed ? currentUser.phone || 'Complete seu WhatsApp' : 'Salve seu WhatsApp em uma conta',
    );
    setText(
      '#profile-address',
      signed ? currentUser.address || 'Complete seu endereço' : 'Salve seu endereço para pedidos rápidos',
    );
    setText('#profile-details-eyebrow', signed ? 'Detalhes do perfil' : 'Área do cliente');
    setText('.profile-details .section-head h2', signed ? 'Informações do cliente' : 'Acesso e configurações');
    setText(
      '.profile-details .section-head p',
      signed
        ? 'Todos os dados são usados apenas para simplificar o pedido e a entrega.'
        : 'Você pode ajustar as configurações do site agora. Para editar perfil e salvar dados, entre ou cadastre-se.',
    );
    updateProfileActionCards(signed);

    if (firstBind) {
      qsa('[data-profile-tab]').forEach((tab) => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.profileTab || 'details';
          qsa('[data-profile-tab]').forEach((item) => item.classList.toggle('active', item === tab));
          qsa('[data-profile-panel]').forEach((panel) => {
            panel.classList.toggle('hidden', panel.dataset.profilePanel !== target);
          });
        });
      });

      qs('[data-switch-account]')?.addEventListener('click', () => {
        rememberProfile(currentUser);
        openProfileSwitcher();
      });

      qs('[data-logout-account]')?.addEventListener('click', async () => {
        await signOutEverywhere({
          redirect: profileHref(),
          message: 'Voce saiu da conta.',
        });
      });

      document.body.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-order-whatsapp]');
        if (!button) return;
        const orders = await loadOrdersFromSupabase();
        const order = orders.find((item) => item.id === button.dataset.orderWhatsapp);
        if (order) openWhatsAppOrder(order);
      });

      document.body.dataset.profilePageBound = 'true';
    }

    renderOrdersEverywhere({ force: true });
  }

  function initOrdersPage() {
    if (currentPage() !== 'pedidos.html') return;
    if (document.body.dataset.ordersPageBound === 'true') return;

    qsa('[data-orders-login]').forEach((link) => {
      if (link instanceof HTMLAnchorElement) link.href = loginHref({ redirect: 'pedidos.html' });
    });

    const refresh = () => renderOrdersEverywhere({ force: true });
    qs('[data-refresh-customer-orders]')?.addEventListener('click', () => {
      updateOrdersPageMode({ force: true });
      showToast('Pedidos atualizados.');
    });

    const form = qs('#track-order-form');
    const result = qs('[data-track-order-result]');
    const status = qs('[data-track-order-status]');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = qs('button[type="submit"]', form);
      const code = qs('#track-order-code')?.value || '';
      const phone = qs('#track-order-phone')?.value || '';
      if (submit) submit.disabled = true;
      if (status) status.textContent = 'Consultando pedido...';

      try {
        const order = await trackOrderByCode(code, phone);
        rememberTrackedOrder(order);
        if (result) renderOrders(result, [order]);
        if (status) status.textContent = 'Pedido encontrado. O status abaixo vem do Supabase.';
      } catch (error) {
        console.warn('[Pedidos] Nao foi possivel consultar o pedido por codigo.', error);
        if (result) result.innerHTML = '';
        if (status)
          status.textContent =
            'Nao encontrei este pedido. Confira o codigo e o WhatsApp, ou execute o SQL atualizado no Supabase.';
        showToast('Nao encontrei este pedido pelo codigo informado.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });

    window.setInterval(() => {
      if (document.hidden) return;
      refresh();
    }, ADMIN_ORDER_POLL_MS);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });

    document.body.addEventListener('click', handleAdminPanelClick);
    document.body.addEventListener('change', handleAdminPanelChange);
    subscribeCustomerOrdersRealtime();
    updateOrdersPageMode({ force: true });
    document.body.dataset.ordersPageBound = 'true';
  }

  async function initProfileEditPage() {
    const form = qs('#profile-edit-form');
    if (!form) return;

    await authReady.catch(() => null);

    if (!currentUser?.email) {
      showToast('Entre ou cadastre-se para editar o perfil.');
      setTimeout(() => {
        window.location.href = loginHref({ mode: 'register', redirect: 'editar-perfil.html' });
      }, 500);
      return;
    }

    qs('#edit-name').value = currentUser.name || '';
    qs('#edit-nick').value = currentUser.nick || '';
    qs('#edit-phone').value = currentUser.phone || '';
    qs('#edit-address').value = currentUser.address || '';

    const preview = qs('#edit-photo-preview');
    if (preview && currentUser.photo) {
      preview.src = currentUser.photo;
      preview.classList.remove('hidden');
    }

    qs('#edit-photo')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      resizeProfilePhoto(file)
        .then((photo) => {
          if (preview) {
            preview.src = photo;
            preview.classList.remove('hidden');
          }
        })
        .catch(() => showToast('Não consegui carregar esta foto. Tente outra imagem.'));
    });

    qs('[data-cancel-edit]')?.addEventListener('click', () => {
      window.location.href = profileHref();
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const updated = {
        ...currentUser,
        name: qs('#edit-name')?.value.trim() || '',
        nick: qs('#edit-nick')?.value.trim() || '',
        phone: qs('#edit-phone')?.value.trim() || '',
        address: qs('#edit-address')?.value.trim() || '',
        photo: preview?.src?.startsWith('data:') ? preview.src : currentUser.photo,
        provider: 'Supabase Auth',
        updatedAt: new Date().toISOString(),
      };

      if (!updated.name || !updated.phone || !updated.address) {
        showToast('Preencha nome, WhatsApp e endereço.');
        return;
      }

      const client = authClient();
      if (!client?.auth) {
        showToast('Autenticação indisponível agora. Tente novamente.');
        return;
      }

      try {
        const { data, error } = await client.auth.updateUser({
          data: {
            name: updated.name,
            nick: updated.nick,
            phone: updated.phone,
            address: updated.address,
            photo: updated.photo || '',
            updatedAt: updated.updatedAt,
          },
        });
        if (error) throw error;

        const savedUser = userFromAuthUser(data.user);
        if (!savedUser?.email) throw new Error('Perfil não retornado pelo Supabase.');
        saveUser(savedUser);
        await safeUpsertProfileRecord(data.user, savedUser, 'edicao de perfil');
        showToast('Perfil atualizado com segurança.');
        setTimeout(() => (window.location.href = profileHref()), 500);
      } catch (error) {
        showToast(authFriendlyError(error, 'Não consegui salvar o perfil. Tente novamente.'));
      }
    });
  }

  function resizeProfilePhoto(file) {
    return new Promise((resolve, reject) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
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
      setThemeMode(resolveThemeMode() === 'light' ? 'dark' : 'light');
    });

    qsa('[data-theme-choice]').forEach((choice) => {
      choice.addEventListener('click', () => {
        setThemeMode(choice.dataset.themeChoice || 'system');
      });
      choice.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const choices = qsa('[data-theme-choice]');
        const currentIndex = choices.indexOf(choice);
        const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
        const next = choices[(currentIndex + direction + choices.length) % choices.length];
        next?.focus();
        next?.click();
      });
    });
    updateThemeControls();

    qsa('[data-setting-toggle]').forEach((toggle) => {
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

    qs('#feedback-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const text = [
        `Olá! Sou ${data.get('name') || 'cliente'}.`,
        `Contato: ${data.get('contact') || ''}`,
        `Categoria: ${data.get('category') || ''}`,
        '',
        `Sugestão: ${data.get('message') || ''}`,
      ].join('\n');

      qs('#feedback-success')?.classList.add('show');
      window.open(`https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(text)}`, '_blank');
      setTimeout(() => qs('#feedback-success')?.classList.remove('show'), 1800);
    });

    renderOrdersEverywhere();
  }

  function initOwnerDashboardLegacy() {
    const form = qs('#owner-config-form');
    const ordersList = qs('#orders-list');
    if (!form && !ordersList) return;

    const fields = {
      whatsapp: qs('#owner-whatsapp'),
      pixKey: qs('#owner-pix-key'),
      merchantName: qs('#owner-merchant-name'),
      merchantCity: qs('#owner-merchant-city'),
    };

    if (fields.whatsapp) fields.whatsapp.value = ownerConfig.whatsapp || '';
    if (fields.pixKey) fields.pixKey.value = ownerConfig.pixKey || '';
    if (fields.merchantName) fields.merchantName.value = ownerConfig.merchantName || DEFAULT_OWNER.merchantName;
    if (fields.merchantCity) fields.merchantCity.value = ownerConfig.merchantCity || DEFAULT_OWNER.merchantCity;

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      ownerConfig = {
        whatsapp: fields.whatsapp?.value.trim() || DEFAULT_OWNER.whatsapp,
        pixKey: fields.pixKey?.value.trim() || '',
        merchantName: fields.merchantName?.value.trim() || DEFAULT_OWNER.merchantName,
        merchantCity: fields.merchantCity?.value.trim() || DEFAULT_OWNER.merchantCity,
        savedAt: new Date().toISOString(),
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

    qs('#export-orders')?.addEventListener('click', async () => {
      const orders = await loadOrdersFromSupabase({ force: true });
      const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedidos-monte-sinai-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    qs('#clear-orders')?.addEventListener('click', () => {
      if (!confirm('Deseja limpar apenas o cache local deste navegador? Os pedidos do Supabase continuam salvos.'))
        return;
      saveJSON(STORAGE.orders, []);
      renderOrdersEverywhere({ force: true });
      showToast('Pedidos removidos.');
    });

    document.body.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-order-whatsapp]');
      if (!button) return;
      const orders = await loadOrdersFromSupabase();
      const order = orders.find((item) => item.id === button.dataset.orderWhatsapp);
      if (order) openWhatsAppOrder(order);
    });

    renderOrdersEverywhere();
  }

  async function initOwnerDashboard() {
    const dashboard = qs('#admin-dashboard');
    const form = qs('#owner-config-form');
    const ordersList = qs('#orders-list');
    const productsList = qs('#admin-products-list');
    if (!dashboard && !form && !ordersList && !productsList) return;

    const canAccess = await protectAdminDashboard();
    if (!canAccess) return;

    populateOwnerConfigForm();
    bindAdminDashboardActions();
    initAdminTabs();
    await Promise.all([renderOrdersEverywhere({ force: true }), refreshAdminProducts()]);
  }

  async function protectAdminDashboard() {
    const access = qs('#admin-access-state');
    const content = qs('[data-admin-content]');

    const showGate = (title, message, icon = 'lock', showLogin = false) => {
      content?.classList.add('hidden');
      if (!access) return;
      access.classList.remove('hidden');
      access.innerHTML = `
        <h2><i class="fa-solid fa-${icon}"></i> ${escapeHTML(title)}</h2>
        <p>${escapeHTML(message)}</p>
        <div class="settings-actions">
          <a class="btn btn-primary ${showLogin ? '' : 'hidden'}" href="${loginHref({ redirect: 'painel.html' })}" data-admin-login>
            <i class="fa-solid fa-right-to-bracket"></i>
            Entrar como administrador
          </a>
          <a class="btn btn-secondary" href="${productHref()}">
            <i class="fa-solid fa-basket-shopping"></i>
            Voltar para a loja
          </a>
        </div>
      `;
    };

    try {
      await authReady.catch(() => null);
      const authUser = await currentAuthUser().catch(() => null);
      if (!authUser?.id) {
        showGate(
          'Acesso restrito',
          'Entre com uma conta marcada como administradora para abrir o painel.',
          'right-to-bracket',
          true,
        );
        return false;
      }

      const admin = await isCurrentUserAdmin();
      if (!admin) {
        showGate(
          'Acesso negado',
          'Sua conta existe, mas ainda nao esta marcada como administradora no Supabase.',
          'shield-halved',
          false,
        );
        return false;
      }

      access?.classList.add('hidden');
      content?.classList.remove('hidden');
      applyAdminRoleUI(await currentAdminProfile({ force: true }));
      return true;
    } catch (error) {
      console.warn('[Supabase] Nao foi possivel validar admin.', error);
      showGate(
        'Painel indisponivel',
        'Nao foi possivel validar suas permissoes agora. Tente entrar novamente.',
        'triangle-exclamation',
        true,
      );
      return false;
    }
  }

  function populateOwnerConfigForm() {
    const fields = {
      storeName: qs('#owner-store-name'),
      footerDescription: qs('#owner-footer-description'),
      logoUrl: qs('#owner-logo-url'),
      accentColor: qs('#owner-accent-color'),
      whatsapp: qs('#owner-whatsapp'),
      pixKey: qs('#owner-pix-key'),
      merchantName: qs('#owner-merchant-name'),
      merchantCity: qs('#owner-merchant-city'),
      heroEyebrow: qs('#owner-hero-eyebrow'),
      heroTitle: qs('#owner-hero-title'),
      heroText: qs('#owner-hero-text'),
      heroButton: qs('#owner-hero-button'),
      heroImage: qs('#owner-hero-image'),
      announcementActive: qs('#owner-announcement-active'),
      announcement: qs('#owner-announcement'),
      deliveryFee: qs('#owner-delivery-fee'),
      freeShippingFrom: qs('#owner-free-shipping'),
      giftText: qs('#owner-gift-text'),
      catalogTitle: qs('#owner-catalog-title'),
      showcaseTitle: qs('#owner-showcase-title'),
      storefrontTitle: qs('#owner-storefront-title'),
      coupons: qs('#owner-coupons'),
      neighborhoods: qs('#owner-neighborhoods'),
      stockAlertThreshold: qs('#owner-stock-threshold'),
    };

    if (fields.storeName) fields.storeName.value = siteConfig.storeName || DEFAULT_SITE_CONFIG.storeName;
    if (fields.footerDescription)
      fields.footerDescription.value = siteConfig.footerDescription || DEFAULT_SITE_CONFIG.footerDescription;
    if (fields.logoUrl) fields.logoUrl.value = siteConfig.logoUrl || DEFAULT_SITE_CONFIG.logoUrl;
    if (fields.accentColor) fields.accentColor.value = siteConfig.accentColor || DEFAULT_SITE_CONFIG.accentColor;
    if (fields.whatsapp) fields.whatsapp.value = ownerConfig.whatsapp || '';
    if (fields.pixKey) fields.pixKey.value = ownerConfig.pixKey || '';
    if (fields.merchantName) fields.merchantName.value = ownerConfig.merchantName || DEFAULT_OWNER.merchantName;
    if (fields.merchantCity) fields.merchantCity.value = ownerConfig.merchantCity || DEFAULT_OWNER.merchantCity;
    if (fields.heroEyebrow) fields.heroEyebrow.value = siteConfig.heroEyebrow || DEFAULT_SITE_CONFIG.heroEyebrow;
    if (fields.heroTitle) fields.heroTitle.value = siteConfig.heroTitle || DEFAULT_SITE_CONFIG.heroTitle;
    if (fields.heroText) fields.heroText.value = siteConfig.heroText || DEFAULT_SITE_CONFIG.heroText;
    if (fields.heroButton) fields.heroButton.value = siteConfig.heroButton || DEFAULT_SITE_CONFIG.heroButton;
    if (fields.heroImage) fields.heroImage.value = siteConfig.heroImage || DEFAULT_SITE_CONFIG.heroImage;
    if (fields.announcementActive) fields.announcementActive.value = siteConfig.announcementActive ? 'true' : 'false';
    if (fields.announcement) fields.announcement.value = siteConfig.announcement || DEFAULT_SITE_CONFIG.announcement;
    if (fields.deliveryFee) fields.deliveryFee.value = String(ownerDeliveryFee());
    if (fields.freeShippingFrom) fields.freeShippingFrom.value = String(ownerFreeShippingFrom());
    if (fields.giftText) fields.giftText.value = ownerGiftText();
    if (fields.catalogTitle) fields.catalogTitle.value = siteConfig.catalogTitle || DEFAULT_SITE_CONFIG.catalogTitle;
    if (fields.showcaseTitle)
      fields.showcaseTitle.value = siteConfig.showcaseTitle || DEFAULT_SITE_CONFIG.showcaseTitle;
    if (fields.storefrontTitle)
      fields.storefrontTitle.value = siteConfig.storefrontTitle || DEFAULT_SITE_CONFIG.storefrontTitle;
    if (fields.coupons) fields.coupons.value = couponLinesFromCoupons(siteConfig.coupons);
    if (fields.neighborhoods)
      fields.neighborhoods.value = normalizeNeighborhoods(siteConfig.servedNeighborhoods).join('\n');
    if (fields.stockAlertThreshold)
      fields.stockAlertThreshold.value = String(
        siteConfig.stockAlertThreshold ?? DEFAULT_SITE_CONFIG.stockAlertThreshold,
      );
  }

  function applyAdminRoleUI(profile = adminProfileCache) {
    const role = adminRole(profile);
    const developer = isDeveloperProfile(profile);
    document.body.dataset.adminRole = role;
    document.body.classList.toggle('admin-developer', developer);
    document.body.classList.toggle('admin-owner', role === 'owner' || role === 'staff');
    qsa('[data-developer-only]').forEach((element) => {
      element.classList.toggle('hidden', !developer);
      element.hidden = !developer;
      element.setAttribute('aria-hidden', String(!developer));
    });
    setText('[data-admin-role-label]', roleLabel(role));
    setText('[data-admin-name-label]', profile?.nome || profile?.email || 'Administrador');
  }

  function renderDeveloperDiagnostics() {
    const container = qs('#developer-diagnostics');
    if (!container) return;

    const cssHref = qs('link[href*="style.css"]')?.getAttribute('href') || '';
    const jsSrc = qs('script[src*="script.js"]')?.getAttribute('src') || '';
    const cssVersion = new URL(cssHref, window.location.href).searchParams.get('v') || 'sem versao';
    const jsVersion = new URL(jsSrc, window.location.href).searchParams.get('v') || 'sem versao';
    const swState =
      'serviceWorker' in navigator
        ? navigator.serviceWorker.controller
          ? 'Ativo nesta aba'
          : 'Registravel'
        : 'Nao suportado';
    const rows = [
      { label: 'Perfil admin', value: `${roleLabel(adminRole())} (${adminProfileCache?.email || 'sem email'})` },
      { label: 'Sessao local', value: currentUser?.email ? 'Cliente autenticado' : 'Sem sessao salva' },
      { label: 'Supabase', value: ordersClient() ? 'Cliente carregado' : 'Indisponivel' },
      { label: 'RPC pedidos', value: 'create_order obrigatorio' },
      {
        label: 'Schema produtos',
        value: productExtendedColumnsReady ? 'Ofertas/estoque ativos' : 'Campos extras pendentes',
      },
      {
        label: 'Schema pedidos',
        value: orderExtendedColumnsReady ? 'Pagamento/cupom ativos' : 'Campos extras pendentes',
      },
      { label: 'Service worker', value: swState },
      { label: 'CSS ativo', value: cssVersion },
      { label: 'JS ativo', value: jsVersion },
      { label: 'Pedidos em cache', value: String(remoteOrdersCache.length) },
      { label: 'Produtos em cache', value: String(adminProductsCache.length) },
      { label: 'Caches do navegador', value: 'Conferindo...', key: 'cache' },
    ];

    container.innerHTML = rows
      .map(
        (row) => `
      <div class="developer-diagnostic-row" ${row.key ? `data-dev-diagnostic="${escapeHTML(row.key)}"` : ''}>
        <span>${escapeHTML(row.label)}</span>
        <strong>${escapeHTML(row.value)}</strong>
      </div>
    `,
      )
      .join('');

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          const row = qs('[data-dev-diagnostic="cache"] strong', container);
          if (row)
            row.textContent =
              keys.filter((key) => key.startsWith('monte-sinai-')).join(', ') || 'Nenhum cache Monte Sinai';
        })
        .catch(() => {
          const row = qs('[data-dev-diagnostic="cache"] strong', container);
          if (row) row.textContent = 'Sem acesso ao Cache API';
        });
    }
  }

  function bindAdminDashboardActions() {
    const dashboard = qs('#admin-dashboard');
    if (dashboard?.dataset.adminBound === 'true') return;

    qs('#owner-config-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = qs('#owner-config-form button[type="submit"]');
      if (submit) {
        submit.disabled = true;
        submit.classList.add('is-loading');
      }

      ownerConfig = normalizedOwnerConfig({
        whatsapp: qs('#owner-whatsapp')?.value.trim() || DEFAULT_OWNER.whatsapp,
        pixKey: qs('#owner-pix-key')?.value.trim() || '',
        merchantName: qs('#owner-merchant-name')?.value.trim() || DEFAULT_OWNER.merchantName,
        merchantCity: qs('#owner-merchant-city')?.value.trim() || DEFAULT_OWNER.merchantCity,
        deliveryFee: qs('#owner-delivery-fee')?.value || DEFAULT_OWNER.deliveryFee,
        freeShippingFrom: qs('#owner-free-shipping')?.value || DEFAULT_OWNER.freeShippingFrom,
        giftText: qs('#owner-gift-text')?.value.trim() || DEFAULT_OWNER.giftText,
        savedAt: new Date().toISOString(),
      });
      siteConfig = normalizedSiteConfig({
        storeName: qs('#owner-store-name')?.value.trim() || DEFAULT_SITE_CONFIG.storeName,
        footerDescription: qs('#owner-footer-description')?.value.trim() || DEFAULT_SITE_CONFIG.footerDescription,
        logoUrl: qs('#owner-logo-url')?.value.trim() || DEFAULT_SITE_CONFIG.logoUrl,
        accentColor: qs('#owner-accent-color')?.value || DEFAULT_SITE_CONFIG.accentColor,
        heroEyebrow: qs('#owner-hero-eyebrow')?.value.trim() || DEFAULT_SITE_CONFIG.heroEyebrow,
        heroTitle: qs('#owner-hero-title')?.value.trim() || DEFAULT_SITE_CONFIG.heroTitle,
        heroText: qs('#owner-hero-text')?.value.trim() || DEFAULT_SITE_CONFIG.heroText,
        heroButton: qs('#owner-hero-button')?.value.trim() || DEFAULT_SITE_CONFIG.heroButton,
        heroImage: qs('#owner-hero-image')?.value.trim() || DEFAULT_SITE_CONFIG.heroImage,
        announcementActive: qs('#owner-announcement-active')?.value === 'true',
        announcement: qs('#owner-announcement')?.value.trim() || DEFAULT_SITE_CONFIG.announcement,
        catalogTitle: qs('#owner-catalog-title')?.value.trim() || DEFAULT_SITE_CONFIG.catalogTitle,
        showcaseTitle: qs('#owner-showcase-title')?.value.trim() || DEFAULT_SITE_CONFIG.showcaseTitle,
        storefrontTitle: qs('#owner-storefront-title')?.value.trim() || DEFAULT_SITE_CONFIG.storefrontTitle,
        couponsText: qs('#owner-coupons')?.value || '',
        servedNeighborhoods: qs('#owner-neighborhoods')?.value || DEFAULT_SITE_CONFIG.servedNeighborhoods,
        stockAlertThreshold: qs('#owner-stock-threshold')?.value || DEFAULT_SITE_CONFIG.stockAlertThreshold,
      });

      persistSiteSettings();
      applySiteConfig();
      renderCart();
      populateOwnerConfigForm();

      const remote = await saveRemoteSiteConfig();
      if (submit) {
        submit.disabled = false;
        submit.classList.remove('is-loading');
      }
      showToast(
        remote.saved
          ? 'Configuracao salva e aplicada no site.'
          : 'Configuracao aplicada neste navegador. Execute o SQL de configuracoes para salvar globalmente.',
      );
    });

    qs('#request-notification')?.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        showToast('Este navegador nao suporta notificacoes.');
        return;
      }
      const permission = await Notification.requestPermission();
      showToast(permission === 'granted' ? 'Notificacoes ativadas.' : 'Notificacoes nao autorizadas.');
    });

    qs('#refresh-orders')?.addEventListener('click', () => renderOrdersEverywhere({ force: true }));
    qsa('[data-admin-refresh-dashboard]').forEach((button) => {
      button.addEventListener('click', () => {
        renderOrdersEverywhere({ force: true });
        refreshAdminProducts({ force: true });
        renderDeveloperDiagnostics();
      });
    });
    qs('#refresh-products')?.addEventListener('click', () => refreshAdminProducts({ force: true }));
    qs('#import-local-products')?.addEventListener('click', importLocalCatalogProducts);
    qsa('[data-admin-create-product]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        startAdminProductForm('produto');
      });
    });
    qsa('[data-admin-create-kit]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        startAdminProductForm('kit');
      });
    });
    qsa('[data-admin-create-offer]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        startAdminOfferForm();
      });
    });
    qsa('[data-offer-duration]').forEach((button) => {
      button.addEventListener('click', () => setAdminOfferDuration(Number(button.dataset.offerDuration || 24)));
    });

    const exportOrders = async () => {
      const orders = await loadOrdersFromSupabase({ force: true });
      const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedidos-monte-sinai-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    };
    qs('#export-orders')?.addEventListener('click', exportOrders);
    qsa('[data-admin-export-orders]').forEach((button) => {
      button.addEventListener('click', exportOrders);
    });

    qs('#admin-product-form')?.addEventListener('submit', saveAdminProduct);
    qs('#admin-product-upload')?.addEventListener('click', uploadSelectedAdminProductImage);
    qs('#cancel-product-edit')?.addEventListener('click', resetAdminProductForm);
    qs('#admin-product-image')?.addEventListener('input', (event) => {
      updateAdminProductPreview(event.target.value);
    });
    qs('#admin-product-file')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      updateAdminProductPreview(file ? URL.createObjectURL(file) : qs('#admin-product-image')?.value.trim());
    });
    qsa('[data-admin-modal-close]').forEach((button) => {
      button.addEventListener('click', () => closeAdminModal(button.dataset.adminModalClose));
    });
    qs('#admin-product-search')?.addEventListener('input', () => renderAdminProducts(adminProductsCache));
    qsa('[data-admin-product-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        qsa('[data-admin-product-filter]').forEach((item) => item.classList.toggle('active', item === button));
        renderAdminProducts(adminProductsCache);
      });
    });

    document.body.addEventListener('click', handleAdminPanelClick);
    document.body.addEventListener('change', handleAdminPanelChange);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAdminModal();
    });

    if (dashboard) dashboard.dataset.adminBound = 'true';
  }

  function initAdminTabs() {
    const content = qs('[data-admin-content]');
    if (!content || content.dataset.tabsBound === 'true') return;

    content.classList.add('is-tabbed');
    qsa('[data-admin-tab]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        setAdminTab(button.dataset.adminTab || 'overview');
      });
    });

    const defaultTab =
      !location.hash && !isDeveloperProfile() && window.matchMedia?.('(max-width: 760px)').matches
        ? 'products'
        : adminTabFromHash(location.hash);
    setAdminTab(defaultTab);
    content.dataset.tabsBound = 'true';
  }

  function adminTabFromHash(hash = '') {
    const target = String(hash || '').replace('#', '');
    if (target === 'admin-products' || target === 'products') return 'products';
    if (target === 'orders-list' || target === 'orders') return 'orders';
    if (target === 'owner-config-form' || target === 'store') return 'store';
    if (target === 'developer' || target === 'programador') return 'developer';
    return 'overview';
  }

  function setAdminTab(tab = 'overview') {
    let target = ['overview', 'products', 'orders', 'store', 'developer'].includes(tab) ? tab : 'overview';
    if (target === 'developer' && !isDeveloperProfile()) target = 'overview';
    qsa('[data-admin-tab]').forEach((button) => {
      const active = button.dataset.adminTab === target;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    qsa('[data-admin-tab-panel]').forEach((panel) => {
      const active = panel.dataset.adminTabPanel === target;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });

    const groupedTabsActive = ['orders', 'store'].includes(target);
    const layout = qs('.dashboard-layout');
    if (layout) {
      layout.classList.toggle('is-active-tab-group', groupedTabsActive);
      layout.hidden = !groupedTabsActive;
      layout.setAttribute('aria-hidden', String(!groupedTabsActive));
    }

    if (target === 'products') {
      ensureAdminProductsVisible();
      if (!adminProductsCache.length || qs('#admin-products-list')?.childElementCount === 0) {
        refreshAdminProducts({ force: !adminProductsCache.length });
      }
    }

    if (target === 'developer') renderDeveloperDiagnostics();
  }

  function ensureAdminProductsVisible() {
    const panel = qs('#admin-products');
    const list = qs('#admin-products-list');
    if (!panel) return;

    panel.classList.add('active');
    panel.hidden = false;
    panel.removeAttribute('aria-hidden');

    if (list) {
      list.hidden = false;
      list.classList.remove('hidden');
      list.removeAttribute('aria-hidden');
      list.style.removeProperty('display');
      list.style.removeProperty('visibility');
      list.style.removeProperty('opacity');
    }
  }

  function adminModalElement(name = 'product') {
    return name === 'product' ? qs('#admin-product-modal') : null;
  }

  function openAdminModal(name = 'product') {
    const modal = adminModalElement(name);
    if (!modal) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    modal.classList.remove('hidden');
    document.body.classList.add('admin-modal-open');
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
  }

  function closeAdminModal(name = '') {
    const modals = name ? [adminModalElement(name)] : qsa('.admin-modal');
    modals.filter(Boolean).forEach((modal) => modal.classList.add('hidden'));
    document.body.classList.remove('admin-modal-open');
  }

  function configureAdminProductFormMode(mode = 'produto') {
    const form = qs('#admin-product-form');
    const title = qs('#admin-product-form-title');
    const intro = qs('.admin-product-form .admin-form-intro p');
    const eyebrow = qs('.admin-product-form .admin-form-intro .eyebrow');
    const name = qs('#admin-product-name');
    const price = qs('#admin-product-price');
    const category = qs('#admin-product-category');
    const description = qs('#admin-product-description');
    const kitItems = qs('#admin-product-kit-items');
    const detailDescription = qs('#admin-product-detail-description');
    const offerActive = qs('#admin-product-offer-active');
    const highlight = qs('#admin-product-highlight');
    const catalogHighlight = qs('#admin-product-catalog-highlight');

    form?.setAttribute('data-product-mode', mode);
    if (eyebrow) {
      eyebrow.textContent =
        {
          kit: 'Montagem de kit',
          offer: 'Promocao com tempo',
        }[mode] || 'Cadastro do catalogo';
    }
    if (title) {
      title.textContent =
        {
          kit: 'Criar kit de produtos',
          offer: 'Criar oferta com tempo',
        }[mode] || 'Criar produto';
    }
    if (intro) {
      intro.textContent =
        {
          kit: 'Agrupe varios produtos em uma oferta unica, com nome, preco final e lista de itens do pacote.',
          offer: 'Escolha o produto, defina preco promocional e programe quando a oferta comeca e termina.',
          produto: 'Cadastre um item comum da loja com preco, estoque, imagem e detalhes para o cliente.',
        }[mode] || 'Cadastre um item comum da loja com preco, estoque, imagem e detalhes para o cliente.';
    }

    name?.setAttribute(
      'placeholder',
      mode === 'kit' ? 'Kit limpeza completa' : mode === 'offer' ? 'Agua mineral 20L em oferta' : 'Agua mineral 20L',
    );
    price?.setAttribute('placeholder', mode === 'kit' ? '49,90' : '15,00');
    category?.setAttribute('placeholder', mode === 'kit' ? 'Kits' : 'Agua, Gas, Limpeza');
    description?.setAttribute(
      'placeholder',
      mode === 'kit'
        ? 'Resumo do kit exibido na loja'
        : mode === 'offer'
          ? 'Resumo da promocao exibido na vitrine'
          : 'Descricao curta exibida no catalogo',
    );
    kitItems?.setAttribute(
      'placeholder',
      mode === 'kit'
        ? 'Ex: 1 Agua 20L + 1 Detergente 2L + 1 Esponja'
        : 'Opcional: descreva itens inclusos se este produto virar kit',
    );
    detailDescription?.setAttribute(
      'placeholder',
      mode === 'offer'
        ? 'Explique a oferta, condicoes e validade para o cliente'
        : 'Texto maior exibido no modal de detalhes',
    );

    if (mode === 'offer') {
      if (offerActive) offerActive.checked = true;
      if (highlight) highlight.value = 'true';
      if (catalogHighlight) catalogHighlight.value = 'true';
    } else if (offerActive) {
      offerActive.checked = false;
    }
  }

  function startAdminProductForm(type = 'produto') {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    resetAdminProductForm();
    const typeInput = qs('#admin-product-type');
    const category = qs('#admin-product-category');
    if (typeInput) typeInput.value = type;
    if (type === 'kit' && category && !category.value) category.value = 'Kits';
    configureAdminProductFormMode(type === 'kit' ? 'kit' : 'produto');
    openAdminModal('product');
    setTimeout(() => {
      window.scrollTo(scrollX, scrollY);
      qs(type === 'kit' ? '#admin-product-kit-items' : '#admin-product-name')?.focus({ preventScroll: true });
    }, 80);
  }

  function startAdminOfferForm() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    resetAdminProductForm();
    const typeInput = qs('#admin-product-type');
    if (typeInput) typeInput.value = 'produto';
    configureAdminProductFormMode('offer');
    const active = qs('#admin-product-offer-active');
    const highlight = qs('#admin-product-highlight');
    if (active) active.checked = true;
    if (highlight) highlight.value = 'true';
    setAdminOfferDuration(24);
    openAdminModal('product');
    setTimeout(() => {
      window.scrollTo(scrollX, scrollY);
      qs('#admin-product-promo-price')?.focus({ preventScroll: true });
    }, 80);
  }

  function setAdminOfferDuration(hours = 24) {
    const active = qs('#admin-product-offer-active');
    const start = qs('#admin-product-offer-start');
    const end = qs('#admin-product-offer-end');
    if (active) active.checked = true;
    if (start && !start.value) start.value = formatDateTimeLocalInput(new Date().toISOString());
    if (end) end.value = addHoursLocalInput(hours);
  }

  async function handleAdminPanelClick(event) {
    const whatsapp = event.target.closest('[data-order-whatsapp]');
    if (whatsapp) {
      const orders = await loadOrdersFromSupabase();
      const order = orders.find((item) => item.id === whatsapp.dataset.orderWhatsapp);
      if (order) openWhatsAppOrder(order);
      return;
    }

    const customerWhatsapp = event.target.closest('[data-order-customer-whatsapp]');
    if (customerWhatsapp) {
      const orders = await loadOrdersFromSupabase();
      const order = orders.find(
        (item) =>
          item.uuid === customerWhatsapp.dataset.orderCustomerWhatsapp ||
          item.id === customerWhatsapp.dataset.orderCustomerWhatsapp,
      );
      if (order) openCustomerStatusWhatsApp(order);
      return;
    }

    const confirmOrder = event.target.closest('[data-order-confirm]');
    if (confirmOrder) {
      await confirmAdminOrder(confirmOrder.dataset.orderConfirm);
      return;
    }

    const edit = event.target.closest('[data-admin-product-edit]');
    if (edit) {
      const product = adminProductsCache.find((item) => item.id === edit.dataset.adminProductEdit);
      if (product) {
        fillAdminProductForm(product.__local ? { ...product, id: '' } : product);
        if (product.__local) showToast('Produto local aberto. Salve para criar no Supabase.');
      }
      return;
    }

    const toggle = event.target.closest('[data-admin-product-toggle]');
    if (toggle) {
      await toggleAdminProduct(toggle.dataset.adminProductToggle, toggle.dataset.productActive !== 'true');
      return;
    }

    const highlight = event.target.closest('[data-admin-product-highlight]');
    if (highlight) {
      await toggleAdminProductHighlight(
        highlight.dataset.adminProductHighlight,
        highlight.dataset.productHighlighted !== 'true',
      );
      return;
    }

    const quickOffer = event.target.closest('[data-admin-product-quick-offer]');
    if (quickOffer) {
      await quickAdminProductOffer(quickOffer.dataset.adminProductQuickOffer);
      return;
    }

    const duplicate = event.target.closest('[data-admin-product-duplicate]');
    if (duplicate) {
      duplicateAdminProduct(duplicate.dataset.adminProductDuplicate);
      return;
    }

    const endOffer = event.target.closest('[data-admin-product-end-offer]');
    if (endOffer) {
      await endAdminProductOffer(endOffer.dataset.adminProductEndOffer);
      return;
    }

    const remove = event.target.closest('[data-admin-product-delete]');
    if (remove) {
      await deleteAdminProduct(remove.dataset.adminProductDelete);
      return;
    }

    const price = event.target.closest('[data-admin-product-price-save]');
    if (price) {
      const key = `price:${price.dataset.adminProductPriceSave}`;
      if (!lockAdminProductAction(key, price)) return;
      try {
        await saveAdminProductPrice(price.dataset.adminProductPriceSave);
      } finally {
        unlockAdminProductAction(key, price);
      }
      return;
    }

    const stock = event.target.closest('[data-admin-product-stock-save]');
    if (stock) {
      const key = `stock:${stock.dataset.adminProductStockSave}`;
      if (!lockAdminProductAction(key, stock)) return;
      try {
        await saveAdminProductStock(stock.dataset.adminProductStockSave);
      } finally {
        unlockAdminProductAction(key, stock);
      }
      return;
    }

    const stockSet = event.target.closest('[data-admin-product-stock-set]');
    if (stockSet) {
      const key = `stock-set:${stockSet.dataset.adminProductStockSet}`;
      if (!lockAdminProductAction(key, stockSet)) return;
      try {
        await setAdminProductStock(stockSet.dataset.adminProductStockSet, stockSet.dataset.stockValue);
      } finally {
        unlockAdminProductAction(key, stockSet);
      }
    }
  }

  async function handleAdminPanelChange(event) {
    const status = event.target.closest('[data-order-status]');
    if (status) {
      await updateOrderStatus(status.dataset.orderStatus, status.value);
      return;
    }

    const paymentStatus = event.target.closest('[data-order-payment-status]');
    if (paymentStatus) {
      await updateOrderPaymentStatus(paymentStatus.dataset.orderPaymentStatus, paymentStatus.value);
    }
  }

  async function updateOrderStatus(orderId, status) {
    if (!orderId || !ORDER_STATUS_OPTIONS.includes(status)) return;
    const client = ordersClient();
    if (!client) return;

    const previousOrders = remoteOrdersCache;
    remoteOrdersCache = remoteOrdersCache.map((order) =>
      order.uuid === orderId || order.id === orderId ? { ...order, status } : order,
    );
    remoteOrdersLoaded = true;
    await renderOrdersEverywhere({ force: false });

    let { data, error } = await client
      .from('pedidos')
      .update({ status })
      .eq('id', orderId)
      .select('id, status')
      .maybeSingle();

    if (error || !data) {
      const fallback = await rpcAdminUpdateOrder(orderId, { status });
      data = Array.isArray(fallback.data) ? fallback.data[0] : fallback.data;
      error = fallback.error;
    }

    if (error || !data || normalizeOrderStatus(data.status) !== status) {
      remoteOrdersCache = previousOrders;
      remoteOrdersLoaded = false;
      await renderOrdersEverywhere({ force: true });
      showToast('Nao consegui atualizar o status. Confira as permissoes do Supabase.', {
        type: 'error',
        title: 'Pedido nao salvo',
      });
      console.warn('[Supabase] Erro ao atualizar status do pedido.', error);
      return;
    }

    remoteOrdersLoaded = false;
    await renderOrdersEverywhere({ force: true });
    showToast('Status do pedido atualizado e aviso interno criado.', { type: 'order' });
  }

  async function updateOrderPaymentStatus(orderId, status) {
    const normalized = normalizePaymentStatus(status);
    if (!orderId || !PAYMENT_STATUS_OPTIONS.includes(normalized)) return;
    const client = ordersClient();
    if (!client) return;

    const previousOrders = remoteOrdersCache;
    remoteOrdersCache = remoteOrdersCache.map((order) =>
      order.uuid === orderId || order.id === orderId ? { ...order, paymentStatus: normalized } : order,
    );
    remoteOrdersLoaded = true;
    await renderOrdersEverywhere({ force: false });

    const payload = {
      pagamento_status: normalized,
      pagamento_confirmado_em: normalized === 'Pago' ? new Date().toISOString() : null,
    };

    let { data, error } = await client
      .from('pedidos')
      .update(payload)
      .eq('id', orderId)
      .select('id, pagamento_status')
      .maybeSingle();

    if (error || !data) {
      const fallback = await rpcAdminUpdateOrder(orderId, { pagamento_status: normalized });
      data = Array.isArray(fallback.data) ? fallback.data[0] : fallback.data;
      error = fallback.error;
    }

    if (error || !data || normalizePaymentStatus(data.pagamento_status) !== normalized) {
      remoteOrdersCache = previousOrders;
      remoteOrdersLoaded = false;
      await renderOrdersEverywhere({ force: true });
      showToast('Nao consegui atualizar o pagamento. Execute o SQL novo no Supabase.', {
        type: 'error',
        title: 'Pagamento nao salvo',
      });
      console.warn('[Supabase] Erro ao atualizar pagamento.', error);
      return;
    }

    remoteOrdersLoaded = false;
    await renderOrdersEverywhere({ force: true });
    showToast('Pagamento atualizado e aviso interno criado.', { type: 'order' });
  }

  async function confirmAdminOrder(orderId) {
    if (!orderId) return;
    const client = ordersClient();
    if (!client) return;

    const previousOrders = remoteOrdersCache;
    remoteOrdersCache = remoteOrdersCache.map((order) =>
      order.uuid === orderId || order.id === orderId ? { ...order, confirmed: true } : order,
    );
    remoteOrdersLoaded = true;
    await renderOrdersEverywhere({ force: false });

    let { data, error } = await client
      .from('pedidos')
      .update({ confirmado: true, confirmado_em: new Date().toISOString() })
      .eq('id', orderId)
      .select('id, confirmado')
      .maybeSingle();

    if (error || !data) {
      const fallback = await rpcAdminUpdateOrder(orderId, { confirmado: true });
      data = Array.isArray(fallback.data) ? fallback.data[0] : fallback.data;
      error = fallback.error;
    }

    if (error || !data || data.confirmado !== true) {
      remoteOrdersCache = previousOrders;
      remoteOrdersLoaded = false;
      await renderOrdersEverywhere({ force: true });
      showToast('Nao consegui confirmar o pedido. Execute o SQL novo no Supabase.', {
        type: 'error',
        title: 'Pedido nao confirmado',
      });
      console.warn('[Supabase] Erro ao confirmar pedido.', error);
      return;
    }

    remoteOrdersLoaded = false;
    await renderOrdersEverywhere({ force: true });
    showToast('Pedido confirmado e cliente avisado no perfil.', { type: 'order' });
  }

  function localCategoryLabel(value = '') {
    const slug = categorySlug(value || 'produtos');
    return (
      {
        recommended: 'Recomendados',
        agua: 'Agua',
        gas: 'Gas',
        limpeza: 'Limpeza',
        lavanderia: 'Lavanderia',
        higiene: 'Higiene',
        banheiro: 'Banheiro',
        cozinha: 'Cozinha',
        utensilios: 'Utensilios',
        organizacao: 'Organizacao',
      }[slug] || cleanConfigText(value, 'Produtos')
    );
  }

  function inferredPublicCategoryLabel(name = '', fallback = 'Produtos') {
    const normalized = normalizeText(name);
    if (normalized.includes('agua')) return 'Agua';
    if (normalized.includes('gas')) return 'Gas';
    if (normalized.includes('amaciante') || normalized.includes('sabao') || normalized.includes('escova de roupa')) {
      return 'Lavanderia';
    }
    if (normalized.includes('sabonete')) return 'Higiene';
    if (normalized.includes('vaso')) return 'Banheiro';
    if (
      normalized.includes('detergente') ||
      normalized.includes('esponja de louca') ||
      normalized.includes('bombril') ||
      normalized.includes('pasta de brilho') ||
      normalized.includes('rodinho de pia') ||
      normalized.includes('limpa aluminio')
    ) {
      return 'Cozinha';
    }
    if (normalized.includes('prendedor') || normalized.includes('saco de lixo')) return 'Organizacao';
    if (normalized.includes('limpa pedra') || normalized.includes('cloro')) return 'Limpeza pesada';
    return localCategoryLabel(fallback);
  }

  function localProductFromCard(card, index = 0) {
    const button = qs('.btn-add-cart', card);
    const name =
      card.dataset.name || qs('h3', card)?.textContent?.trim() || button?.dataset.name || `Produto ${index + 1}`;
    const price = parsePrice(button?.dataset.price || qs('strong', card)?.textContent || 0);
    const image = canonicalAssetPath(qs('.product-image', card)?.getAttribute('src') || productAssetFallback(name));
    const category = inferredPublicCategoryLabel(
      name,
      card.dataset.category || qs('.eyebrow', card)?.textContent || 'Produtos',
    );
    return {
      id: `local-${storageSafeFileName(name)}-${index}`,
      nome: name,
      preco: price,
      imagem: image,
      categoria: category,
      descricao: qs('p', card)?.textContent?.trim() || `Produto do catalogo ${siteConfig.storeName}.`,
      ativo: true,
      tipo: normalizeText(category).includes('kit') ? 'kit' : 'produto',
      destaque: card.classList.contains('is-recommended') || card.dataset.recommended === 'true',
      __local: true,
    };
  }

  function staticLocalCatalogProducts() {
    const items = [
      ['Agua mineral 20L', 15, 'Agua'],
      ['Gas de cozinha P13', 125, 'Gas'],
      ['Alcool Perfumado 500ml', 5, 'Limpeza'],
      ['Amaciante 2L', 10, 'Lavanderia'],
      ['Candida 2L Tradicional', 5, 'Limpeza'],
      ['Candida Colorida 2L', 12, 'Limpeza'],
      ['Cloro 1L Tradicional', 7.5, 'Limpeza'],
      ['Cloro 2L Tradicional', 12, 'Limpeza'],
      ['Detergente 2L Neutro', 10, 'Cozinha'],
      ['Desinfetante 2L', 5, 'Limpeza'],
      ['Limpa Aluminio 500ml', 5, 'Cozinha'],
      ['Limpa Pedra 2L Uso Pesado', 12, 'Limpeza'],
      ['Limpa Pedra 500ml Uso Diario', 5, 'Limpeza'],
      ['Sabao de Coco 2L', 12, 'Lavanderia'],
      ['Sabao Omo 2L', 22, 'Lavanderia'],
      ['Sabonete Liquido 500ml', 6, 'Higiene'],
      ['Escova de Roupa', 5, 'Lavanderia'],
      ['Escova de Vaso Sanitario com Pote', 8.5, 'Banheiro'],
      ['Esponja de Aco', 4.9, 'Cozinha'],
      ['Esponja de Louca', 2, 'Cozinha'],
      ['Esponjao', 9.9, 'Utensilios'],
      ['Bombril', 3, 'Cozinha'],
      ['Pa', 7.5, 'Utensilios'],
      ['Pasta de Brilho', 6, 'Cozinha'],
      ['Pedra de Vaso', 2.5, 'Banheiro'],
      ['Prendedor de Madeira', 3.2, 'Organizacao'],
      ['Prendedor Plastico', 3.6, 'Organizacao'],
      ['Rodo Grande', 9.9, 'Utensilios'],
      ['Rodo Pequeno', 7.99, 'Utensilios'],
      ['Rodinho de Pia', 5, 'Cozinha'],
      ['Saco de Lixo', 6, 'Organizacao'],
      ['Vassoura', 12, 'Utensilios'],
    ];

    return items.map(([nome, preco, categoria], index) => ({
      id: `local-${storageSafeFileName(nome)}-${index}`,
      nome,
      preco,
      imagem: productAssetFallback(nome),
      categoria,
      descricao: `Produto de ${categoria.toLowerCase()} pronto para venda no catalogo.`,
      ativo: true,
      tipo: 'produto',
      destaque: index < 2,
      __local: true,
    }));
  }

  async function loadLocalCatalogProducts() {
    if (localCatalogProductsCache) return localCatalogProductsCache;

    if (productIndex.length) {
      localCatalogProductsCache = productIndex.map((product, index) => ({
        id: `local-${storageSafeFileName(product.name)}-${index}`,
        nome: product.name,
        preco: Number(product.price || 0),
        imagem: productAssetPath(product),
        categoria: product.category || 'Produtos',
        descricao: product.description || productDescription(product),
        ativo: true,
        tipo: product.isKit ? 'kit' : 'produto',
        destaque: Boolean(product.recommended || product.highlight),
        __local: true,
      }));
      return localCatalogProductsCache;
    }

    try {
      const response = await fetch(pageHref('produtos.html'), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const cards = [...doc.querySelectorAll('.catalog-product')];
      localCatalogProductsCache = cards
        .map(localProductFromCard)
        .filter((product) => product.nome && product.preco >= 0);
    } catch (error) {
      console.warn('[Catalogo local] Nao foi possivel ler pages/produtos.html. Usando lista interna.', error);
      localCatalogProductsCache = staticLocalCatalogProducts();
    }

    if (!localCatalogProductsCache.length) localCatalogProductsCache = staticLocalCatalogProducts();
    return localCatalogProductsCache;
  }

  async function fallbackAdminProducts(source = 'local') {
    adminProductsSource = source;
    adminProductsCache = await loadLocalCatalogProducts();
    return adminProductsCache;
  }

  function withAdminTimeout(promise, ms = 4500, label = 'Supabase') {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error(`${label} demorou mais de ${ms}ms`)), ms);
      }),
    ]);
  }

  function updateAdminProductMetrics(products = []) {
    setText('#dash-products-count', String(products.filter((product) => product.ativo !== false).length));
    setText('#dash-offers-count', String(products.filter((product) => productOfferActive(product)).length));
    setText('#dash-kits-count', String(products.filter((product) => productType(product) === 'kit').length));
    renderStockAlerts(products);
    setProductIndex(products.filter((product) => product.ativo !== false));
  }

  function supabaseProductRows(products = []) {
    return products
      .map((product) => {
        const row = {
          nome: product.nome || '',
          preco: parsePrice(product.preco),
          imagem: canonicalAssetPath(product.imagem || ''),
          categoria: product.categoria || 'Produtos',
          descricao: product.descricao || '',
          ativo: product.ativo !== false,
        };
        if (productExtendedColumnsReady) {
          row.catalogo_visivel = product.catalogo_visivel ?? true;
          row.loja_visivel = product.loja_visivel ?? true;
          row.catalogo_destaque = product.catalogo_destaque ?? false;
          row.descricao_detalhada = product.descricao_detalhada || '';
        }
        return row;
      })
      .filter((product) => product.nome);
  }

  async function importLocalCatalogProducts() {
    const client = ordersClient();
    if (!client) {
      showToast('Supabase indisponivel para importar o catalogo.');
      return;
    }

    const button = qs('#import-local-products');
    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
    }

    try {
      const products = await loadLocalCatalogProducts();
      const rows = supabaseProductRows(products);
      const names = rows.map((product) => product.nome);
      if (!rows.length) {
        showToast('Nenhum produto local para importar.');
        return;
      }

      const { data: existing, error: lookupError } = await client.from('produtos').select('nome').in('nome', names);
      if (lookupError) throw lookupError;

      const existingNames = new Set((existing || []).map((product) => normalizeText(product.nome)));
      const missing = rows.filter((product) => !existingNames.has(normalizeText(product.nome)));
      if (!missing.length) {
        showToast('Catalogo ja esta importado no Supabase.');
        await refreshAdminProducts({ force: true });
        return;
      }

      const { error } = await client.from('produtos').insert(missing);
      if (error) throw error;

      await refreshAdminProducts({ force: true });
      showToast(
        `${missing.length} produto${missing.length === 1 ? '' : 's'} importado${missing.length === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      console.warn('[Supabase] Nao foi possivel importar catalogo local.', error);
      showToast('Nao consegui importar o catalogo. Confira as permissoes admin.');
    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove('is-loading');
      }
    }
  }

  async function loadAdminProducts({ force = false } = {}) {
    const client = ordersClient();
    if (!client) return fallbackAdminProducts('local-no-client');
    if (adminProductsCache.length && !force) return adminProductsCache;

    let data = [];
    let error = null;

    try {
      const response = await withAdminTimeout(
        client
          .from('produtos')
          .select(productExtendedColumnsReady ? PRODUCT_EXTENDED_SELECT : PRODUCT_BASE_SELECT)
          .order('nome', { ascending: true }),
        4500,
        'Produtos do Supabase',
      );

      data = response.data;
      error = response.error;

      if (error && productExtendedColumnsReady && isMissingProductExtensionError(error)) {
        productExtendedColumnsReady = false;
        const fallback = await withAdminTimeout(
          client.from('produtos').select(PRODUCT_BASE_SELECT).order('nome', { ascending: true }),
          4500,
          'Produtos basicos do Supabase',
        );
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      if (!data?.length) return fallbackAdminProducts('local-empty-supabase');

      adminProductsSource = 'supabase';
      adminProductsCache = data || [];
      return adminProductsCache;
    } catch (loadError) {
      console.warn('[Supabase] Produtos administrativos indisponiveis. Mostrando catalogo local.', loadError);
      return fallbackAdminProducts('local-error');
    }
  }

  async function refreshAdminProducts({ force = true } = {}) {
    try {
      ensureAdminProductsVisible();
      setAdminProductsStatus('Preparando produtos...');
      const list = qs('#admin-products-list');
      const previewProducts = adminProductsCache.length
        ? adminProductsCache
        : await loadLocalCatalogProducts().catch(() => []);

      if (previewProducts.length) {
        if (!adminProductsCache.length) {
          adminProductsSource = 'local-preview';
          adminProductsCache = previewProducts;
        }
        renderAdminProducts(previewProducts);
        updateAdminProductMetrics(previewProducts);
        setAdminProductsStatus('Catalogo local visivel. Sincronizando produtos do Supabase...');
      } else if (list) {
        list.innerHTML = `
          <div class="admin-products-empty">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <strong>Carregando produtos...</strong>
            <span>Buscando o catalogo na tabela public.produtos.</span>
          </div>
        `;
      }
      const products = await loadAdminProducts({ force });
      renderAdminProducts(products);
      updateAdminProductMetrics(products);
      if (adminProductsSource === 'supabase') {
        const extra = productExtendedColumnsReady
          ? 'Kits, destaques e ofertas com temporizador estao ativos.'
          : 'Execute supabase/ofertas-kits-produtos.sql para liberar kits e ofertas completas.';
        setAdminProductsStatus(
          `${products.length} produto${products.length === 1 ? '' : 's'} carregado${products.length === 1 ? '' : 's'} da tabela public.produtos. ${extra}`,
        );
      } else {
        setAdminProductsStatus(
          `${products.length} produto${products.length === 1 ? '' : 's'} do catalogo local visivel${products.length === 1 ? '' : 's'} com imagem. Use "Importar catalogo" para copiar para o Supabase e controlar tudo pelo painel.`,
        );
      }
    } catch (error) {
      console.warn('[Supabase] Nao foi possivel carregar produtos administrativos.', error);
      setAdminProductsStatus('Nao foi possivel carregar os produtos do Supabase.');
      qs('#admin-products-list')?.replaceChildren();
      qs('#admin-products-list')?.insertAdjacentHTML(
        'beforeend',
        `
        <div class="admin-products-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Nao foi possivel carregar os produtos</strong>
          <span>Confira o acesso admin, as policies do Supabase e a tabela public.produtos.</span>
          <button class="btn btn-secondary" type="button" id="refresh-products-inline">
            <i class="fa-solid fa-rotate"></i>
            Tentar novamente
          </button>
        </div>
      `,
      );
      qs('#refresh-products-inline')?.addEventListener('click', () => refreshAdminProducts({ force: true }));
    }
  }

  function setAdminProductsStatus(message = '') {
    setText('#admin-products-status', message);
    setText(
      '#admin-offer-status',
      productExtendedColumnsReady
        ? 'Kits, destaques e ofertas serao salvos no Supabase.'
        : 'Execute supabase/ofertas-kits-produtos.sql para salvar kits/ofertas completas.',
    );
  }

  function productType(product = {}) {
    return String(product.tipo || '').trim() || (normalizeText(product.categoria).includes('kit') ? 'kit' : 'produto');
  }

  function adminProductHighlighted(product = {}) {
    return Boolean(product.destaque) || productOfferActive(product) || productType(product) === 'kit';
  }

  function currentAdminProductFilter() {
    return qs('[data-admin-product-filter].active')?.dataset.adminProductFilter || 'all';
  }

  function filteredAdminProducts(products = []) {
    const query = normalizeText(qs('#admin-product-search')?.value || '');
    const filter = currentAdminProductFilter();

    return products.filter((product) => {
      const blob = normalizeText(
        `${product.nome || ''} ${product.categoria || ''} ${product.descricao || ''} ${product.kit_itens || ''}`,
      );
      const matchesSearch = !query || blob.includes(query);
      const active = product.ativo !== false;
      const type = productType(product);
      const offer = productOfferActive(product);
      const stockState = productStockState(product);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && active) ||
        (filter === 'inactive' && !active) ||
        (filter === 'offer' && offer) ||
        (filter === 'kit' && type === 'kit') ||
        (filter === 'low' && stockState === 'low') ||
        (filter === 'out' && stockState === 'out');

      return matchesSearch && matchesFilter;
    });
  }

  function adminProductPayload() {
    const nome = qs('#admin-product-name')?.value.trim() || '';
    const preco = parsePrice(qs('#admin-product-price')?.value || 0);
    const categoria = qs('#admin-product-category')?.value.trim() || '';
    const tipo = qs('#admin-product-type')?.value === 'kit' ? 'kit' : 'produto';
    const promoPrice = parsePrice(qs('#admin-product-promo-price')?.value || 0);
    const offerActive = Boolean(qs('#admin-product-offer-active')?.checked);

    if (!nome || !categoria || preco < 0) {
      showToast('Preencha nome, categoria e preco valido.');
      return null;
    }

    if (offerActive && promoPrice <= 0) {
      showToast('Informe um preco promocional para ativar a oferta.');
      return null;
    }

    if (offerActive && !qs('#admin-product-offer-end')?.value) {
      showToast('Escolha quando a oferta termina.');
      return null;
    }

    const imagem = safeAdminProductImageValue(qs('#admin-product-image')?.value || '');
    if (imagem === null) return null;

    const payload = {
      nome,
      preco,
      categoria: tipo === 'kit' && !normalizeText(categoria).includes('kit') ? 'Kits' : categoria,
      imagem,
      descricao: qs('#admin-product-description')?.value.trim() || '',
      ativo: qs('#admin-product-active')?.value !== 'false',
    };

    if (productExtendedColumnsReady) {
      payload.tipo = tipo;
      payload.destaque = qs('#admin-product-highlight')?.value === 'true' || offerActive || tipo === 'kit';
      payload.oferta_ativa = offerActive;
      payload.preco_promocional = offerActive && promoPrice > 0 ? promoPrice : null;
      payload.oferta_inicio = offerActive
        ? isoFromLocalInput(qs('#admin-product-offer-start')?.value || '') || new Date().toISOString()
        : null;
      payload.oferta_fim = offerActive ? isoFromLocalInput(qs('#admin-product-offer-end')?.value || '') : null;
      payload.kit_itens = qs('#admin-product-kit-items')?.value.trim() || '';
      payload.estoque =
        qs('#admin-product-stock')?.value === ''
          ? null
          : Math.max(0, Math.round(parsePrice(qs('#admin-product-stock')?.value || 0)));
      payload.estoque_minimo = Math.max(
        0,
        Math.round(parsePrice(qs('#admin-product-stock-min')?.value || siteConfig.stockAlertThreshold || 0)),
      );
      payload.catalogo_visivel = qs('#admin-product-catalog-visible')?.value !== 'false';
      payload.loja_visivel = qs('#admin-product-store-visible')?.value !== 'false';
      payload.catalogo_destaque = qs('#admin-product-catalog-highlight')?.value === 'true';
      payload.catalogo_ordem =
        qs('#admin-product-catalog-order')?.value === ''
          ? null
          : Math.max(0, Math.round(parsePrice(qs('#admin-product-catalog-order')?.value || 0)));
      payload.descricao_detalhada = qs('#admin-product-detail-description')?.value.trim() || '';
    }

    return payload;
  }

  function productImageUploadStatus(message = '') {
    const status = qs('#admin-product-upload-status');
    if (status) status.textContent = message;
  }

  function safeAdminProductImageValue(value = '') {
    const image = String(value || '').trim();
    if (/^data:/i.test(image)) {
      showToast('Imagem em base64/DataURL nao pode ser salva. Envie pelo Storage ou use uma URL.');
      return null;
    }
    return image;
  }

  function setAdminProductFormBusy(form, busy) {
    qsa('button[type="submit"]', form || qs('#admin-product-form') || document).forEach((button) => {
      button.disabled = busy;
      button.classList.toggle('is-loading', busy);
    });
  }

  function lockAdminProductAction(key, button = null) {
    if (adminProductActionLocks.has(key)) return false;
    adminProductActionLocks.add(key);
    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
    }
    return true;
  }

  function unlockAdminProductAction(key, button = null) {
    adminProductActionLocks.delete(key);
    if (button) {
      button.disabled = false;
      button.classList.remove('is-loading');
    }
  }

  function updateAdminProductPreview(src = '') {
    const preview = qs('#admin-product-image-preview');
    if (!preview) return;

    const clean = String(src || '').trim();
    if (!clean) {
      preview.innerHTML = '<i class="fa-solid fa-image"></i>';
      return;
    }

    const href = assetHref(clean);
    preview.innerHTML = `<img src="${escapeHTML(href)}" alt="Previa da imagem do produto" loading="lazy" decoding="async">`;
  }

  function storageSafeFileName(value) {
    return (
      normalizeText(value || 'produto')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 70) || 'produto'
    );
  }

  function imageFileExtension(file) {
    const fromName = String(file?.name || '')
      .split('.')
      .pop()
      ?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;
    if (file?.type === 'image/jpeg') return 'jpg';
    if (file?.type === 'image/png') return 'png';
    if (file?.type === 'image/webp') return 'webp';
    return 'png';
  }

  function imageContentType(file, extension) {
    if (file?.type) return file.type;
    if (extension === 'jpg') return 'image/jpeg';
    return `image/${extension}`;
  }

  function selectedAdminProductImageFile() {
    return qs('#admin-product-file')?.files?.[0] || null;
  }

  async function uploadSelectedAdminProductImage() {
    const file = selectedAdminProductImageFile();
    if (!file) {
      showToast('Escolha uma imagem primeiro.');
      return '';
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Use imagem JPG, PNG ou WebP.');
      return '';
    }

    if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
      showToast('Use uma imagem de ate 5 MB.');
      return '';
    }

    const client = ordersClient();
    if (!client?.storage) {
      showToast('Storage do Supabase indisponivel.');
      return '';
    }

    const uploadButton = qs('#admin-product-upload');
    const baseName = qs('#admin-product-name')?.value.trim() || file.name;
    const extension = imageFileExtension(file);
    const path = `${storageSafeFileName(baseName)}/${Date.now()}-${storageSafeFileName(file.name)}.${extension}`;

    try {
      if (uploadButton) {
        uploadButton.disabled = true;
        uploadButton.classList.add('is-loading');
      }
      productImageUploadStatus('Enviando imagem...');

      const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: imageContentType(file, extension),
        upsert: false,
      });

      if (error) throw error;

      const { data } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl || '';
      if (!publicUrl) throw new Error('URL publica nao retornada pelo Supabase.');

      const imageInput = qs('#admin-product-image');
      if (imageInput) imageInput.value = publicUrl;
      updateAdminProductPreview(publicUrl);
      const fileInput = qs('#admin-product-file');
      if (fileInput) fileInput.value = '';
      productImageUploadStatus('Imagem enviada.');
      showToast('Imagem enviada para o Supabase Storage.');
      return publicUrl;
    } catch (error) {
      console.warn('[Supabase Storage] Erro ao enviar imagem.', error);
      productImageUploadStatus('Falha no upload.');
      showToast('Nao consegui enviar a imagem.');
      return '';
    } finally {
      if (uploadButton) {
        uploadButton.disabled = false;
        uploadButton.classList.remove('is-loading');
      }
    }
  }

  async function ensureAdminProductImageUploaded() {
    const file = selectedAdminProductImageFile();
    const imageInput = qs('#admin-product-image');
    if (!file) return imageInput?.value.trim() || '';
    return uploadSelectedAdminProductImage();
  }

  async function saveAdminProduct(event) {
    event.preventDefault();
    if (adminProductSaving) return;
    adminProductSaving = true;
    setAdminProductFormBusy(event.currentTarget, true);
    const id = qs('#admin-product-id')?.value || '';
    try {
      const hasSelectedFile = Boolean(selectedAdminProductImageFile());
      const uploadedUrl = await ensureAdminProductImageUploaded();
      if (hasSelectedFile && !uploadedUrl) {
        showToast('Upload da imagem falhou. Tente novamente antes de salvar.');
        return;
      }

      const payload = adminProductPayload();
      if (!payload) return;

      const client = ordersClient();
      if (!client) {
        showToast('Supabase indisponivel para salvar o produto.');
        return;
      }

      const request = id
        ? client.from('produtos').update(payload).eq('id', id).select('id').maybeSingle()
        : client.from('produtos').insert(payload).select('id').maybeSingle();

      let { data, error } = await request;
      if (id && (error || !data)) {
        const rpc = await rpcAdminUpdateProduct(id, payload);
        data = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        error = rpc.error;
      }
      if (error && productExtendedColumnsReady && isMissingProductExtensionError(error)) {
        productExtendedColumnsReady = false;
        const basePayload = {
          nome: payload.nome,
          preco: payload.preco,
          categoria: payload.categoria,
          imagem: payload.imagem,
          descricao: payload.descricao,
          ativo: payload.ativo,
        };
        const fallback = id
          ? await client.from('produtos').update(basePayload).eq('id', id).select('id').maybeSingle()
          : await client.from('produtos').insert(basePayload).select('id').maybeSingle();
        data = fallback.data;
        error = fallback.error;
        showToast('Produto salvo. Execute o SQL novo para salvar kit/oferta.');
      }

      if (error || !data) {
        showToast('Nao consegui salvar o produto. Execute o SQL de reparo no Supabase.');
        console.warn('[Supabase] Erro ao salvar produto.', error);
        return;
      }

      resetAdminProductForm();
      closeAdminModal('product');
      await refreshAdminProducts({ force: true });
      showToast(id ? 'Produto atualizado.' : 'Produto criado.');
    } catch (error) {
      showToast('Nao consegui salvar o produto. Tente novamente.');
      console.warn('[Supabase] Erro ao salvar produto.', error);
    } finally {
      adminProductSaving = false;
      setAdminProductFormBusy(event.currentTarget, false);
    }
  }

  function fillAdminProductForm(product) {
    const id = qs('#admin-product-id');
    const name = qs('#admin-product-name');
    const price = qs('#admin-product-price');
    const category = qs('#admin-product-category');
    const image = qs('#admin-product-image');
    const file = qs('#admin-product-file');
    const description = qs('#admin-product-description');
    const active = qs('#admin-product-active');
    const type = qs('#admin-product-type');
    const highlight = qs('#admin-product-highlight');
    const kitItems = qs('#admin-product-kit-items');
    const offerActive = qs('#admin-product-offer-active');
    const promoPrice = qs('#admin-product-promo-price');
    const offerStart = qs('#admin-product-offer-start');
    const offerEnd = qs('#admin-product-offer-end');
    const stock = qs('#admin-product-stock');
    const stockMin = qs('#admin-product-stock-min');
    const catalogVisible = qs('#admin-product-catalog-visible');
    const storeVisible = qs('#admin-product-store-visible');
    const catalogHighlight = qs('#admin-product-catalog-highlight');
    const catalogOrder = qs('#admin-product-catalog-order');
    const detailDescription = qs('#admin-product-detail-description');

    if (id) id.value = product.id || '';
    if (name) name.value = product.nome || '';
    if (price) price.value = Number(product.preco || 0).toFixed(2);
    if (category) category.value = product.categoria || '';
    if (image) image.value = product.imagem || '';
    if (file) file.value = '';
    updateAdminProductPreview(product.imagem || '');
    productImageUploadStatus('');
    if (description) description.value = product.descricao || '';
    if (active) active.value = product.ativo ? 'true' : 'false';
    if (type) type.value = productType(product);
    if (highlight) highlight.value = adminProductHighlighted(product) ? 'true' : 'false';
    if (kitItems) kitItems.value = product.kit_itens || '';
    if (offerActive) offerActive.checked = Boolean(product.oferta_ativa);
    if (promoPrice) promoPrice.value = product.preco_promocional ? Number(product.preco_promocional).toFixed(2) : '';
    if (offerStart) offerStart.value = formatDateTimeLocalInput(product.oferta_inicio);
    if (offerEnd) offerEnd.value = formatDateTimeLocalInput(product.oferta_fim);
    if (stock) stock.value = product.estoque ?? '';
    if (stockMin)
      stockMin.value =
        product.estoque_minimo ?? siteConfig.stockAlertThreshold ?? DEFAULT_SITE_CONFIG.stockAlertThreshold;
    if (catalogVisible) catalogVisible.value = product.catalogo_visivel === false ? 'false' : 'true';
    if (storeVisible) storeVisible.value = product.loja_visivel === false ? 'false' : 'true';
    if (catalogHighlight) catalogHighlight.value = product.catalogo_destaque ? 'true' : 'false';
    if (catalogOrder) catalogOrder.value = product.catalogo_ordem ?? '';
    if (detailDescription) detailDescription.value = product.descricao_detalhada || '';
    configureAdminProductFormMode(productType(product) === 'kit' ? 'kit' : 'produto');
    setText('#admin-product-form-title', productType(product) === 'kit' ? 'Editar kit' : 'Editar produto');
    setAdminTab('products');
    openAdminModal('product');
  }

  function resetAdminProductForm() {
    qs('#admin-product-form')?.reset();
    const id = qs('#admin-product-id');
    const active = qs('#admin-product-active');
    const file = qs('#admin-product-file');
    const type = qs('#admin-product-type');
    const highlight = qs('#admin-product-highlight');
    const stockMin = qs('#admin-product-stock-min');
    const catalogVisible = qs('#admin-product-catalog-visible');
    const storeVisible = qs('#admin-product-store-visible');
    const catalogHighlight = qs('#admin-product-catalog-highlight');
    if (id) id.value = '';
    if (active) active.value = 'true';
    if (file) file.value = '';
    if (type) type.value = 'produto';
    if (highlight) highlight.value = 'false';
    if (catalogVisible) catalogVisible.value = 'true';
    if (storeVisible) storeVisible.value = 'true';
    if (catalogHighlight) catalogHighlight.value = 'false';
    if (stockMin) stockMin.value = siteConfig.stockAlertThreshold ?? DEFAULT_SITE_CONFIG.stockAlertThreshold;
    configureAdminProductFormMode('produto');
    updateAdminProductPreview('');
    productImageUploadStatus('');
  }

  async function toggleAdminProduct(id, active) {
    const client = ordersClient();
    if (!client || !id) return;

    const { error } = await client.from('produtos').update({ ativo: active }).eq('id', id);
    if (error) {
      showToast('Nao consegui alterar o status do produto.');
      console.warn('[Supabase] Erro ao ativar/desativar produto.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast(active ? 'Produto ativado.' : 'Produto desativado.');
  }

  async function toggleAdminProductHighlight(id, highlighted) {
    const client = ordersClient();
    if (!client || !id) return;
    if (!productExtendedColumnsReady) {
      showToast('Execute o SQL de kits/ofertas para usar destaques.');
      return;
    }

    const { error } = await client.from('produtos').update({ destaque: highlighted }).eq('id', id);
    if (error) {
      showToast('Nao consegui alterar o destaque.');
      console.warn('[Supabase] Erro ao destacar produto.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast(highlighted ? 'Produto destacado.' : 'Destaque removido.');
  }

  async function quickAdminProductOffer(id) {
    const client = ordersClient();
    const product = adminProductsCache.find((item) => item.id === id);
    if (!client || !id || !product) return;
    if (!productExtendedColumnsReady) {
      showToast('Execute o SQL de kits/ofertas para usar ofertas com tempo.');
      return;
    }

    const price = Number(product.preco || 0);
    const promo = Math.max(0, Number((price * 0.9).toFixed(2)));
    const { error } = await client
      .from('produtos')
      .update({
        destaque: true,
        oferta_ativa: true,
        preco_promocional: promo,
        oferta_inicio: new Date().toISOString(),
        oferta_fim: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', id);

    if (error) {
      showToast('Nao consegui criar a oferta rapida.');
      console.warn('[Supabase] Erro ao criar oferta rapida.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast('Oferta de 24h criada.');
  }

  function duplicateAdminProduct(id) {
    const product = adminProductsCache.find((item) => item.id === id);
    if (!product) return;

    fillAdminProductForm({
      ...product,
      id: '',
      nome: `${product.nome || 'Produto'} copia`,
      oferta_ativa: false,
      preco_promocional: null,
      oferta_inicio: null,
      oferta_fim: null,
    });
    setText('#admin-product-form-title', productType(product) === 'kit' ? 'Duplicar kit' : 'Duplicar produto');
    showToast('Produto duplicado no formulario. Revise e salve.');
  }

  async function endAdminProductOffer(id) {
    const client = ordersClient();
    if (!client || !id) return;
    if (!productExtendedColumnsReady) {
      showToast('Execute o SQL de kits/ofertas para alterar ofertas.');
      return;
    }

    const { error } = await client
      .from('produtos')
      .update({
        oferta_ativa: false,
        preco_promocional: null,
        oferta_fim: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      showToast('Nao consegui encerrar a oferta.');
      console.warn('[Supabase] Erro ao encerrar oferta.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast('Oferta encerrada.');
  }

  async function saveAdminProductPrice(id) {
    const input = qs(`[data-admin-product-price-input="${escapeSelectorValue(id)}"]`);
    const preco = parsePrice(input?.value || 0);
    const client = ordersClient();
    if (!client || !id || preco < 0) return;

    const { error } = await client.from('produtos').update({ preco }).eq('id', id);
    if (error) {
      showToast('Nao consegui atualizar o preco.');
      console.warn('[Supabase] Erro ao atualizar preco.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast('Preco atualizado.');
  }

  async function saveAdminProductStock(id) {
    const input = qs(`[data-admin-product-stock-input="${escapeSelectorValue(id)}"]`);
    const estoque = input?.value === '' ? null : Math.max(0, Math.round(parsePrice(input?.value || 0)));
    const client = ordersClient();
    if (!client || !id) return;
    if (!productExtendedColumnsReady) {
      showToast('Execute o SQL de estoque para controlar quantidades.');
      return;
    }

    const { error } = await client.from('produtos').update({ estoque }).eq('id', id);
    if (error) {
      showToast('Nao consegui atualizar o estoque.');
      console.warn('[Supabase] Erro ao atualizar estoque.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast('Estoque atualizado.');
  }

  async function setAdminProductStock(id, value) {
    const estoque = Math.max(0, Math.round(parsePrice(value || 0)));
    const client = ordersClient();
    if (!client || !id) return;
    if (!productExtendedColumnsReady) {
      showToast('Execute o SQL de estoque para controlar quantidades.');
      return;
    }

    const { error } = await client.from('produtos').update({ estoque }).eq('id', id);
    if (error) {
      showToast('Nao consegui atualizar o estoque.');
      console.warn('[Supabase] Erro ao definir estoque.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast(estoque === 0 ? 'Produto marcado como esgotado.' : 'Produto reposto no estoque.');
  }

  async function deleteAdminProduct(id) {
    if (!id || !confirm('Deseja excluir este produto do Supabase?')) return;
    const client = ordersClient();
    if (!client) return;

    const { error } = await client.from('produtos').delete().eq('id', id);
    if (error) {
      showToast('Nao consegui excluir o produto.');
      console.warn('[Supabase] Erro ao excluir produto.', error);
      return;
    }

    await refreshAdminProducts({ force: true });
    showToast('Produto excluido.');
  }

  function renderAdminProducts(products) {
    const list = qs('#admin-products-list');
    if (!list) return;
    list.innerHTML = '';
    const visibleProducts = filteredAdminProducts(products);

    if (!products.length) {
      list.insertAdjacentHTML(
        'beforeend',
        `
        <div class="admin-products-empty">
          <i class="fa-solid fa-box-open"></i>
          <strong>Nenhum produto apareceu aqui</strong>
          <span>Se o catalogo ja existe, confirme se o usuario e admin e se a tabela public.produtos tem registros. Voce tambem pode criar um produto agora.</span>
          <div class="settings-actions">
            <button class="btn btn-primary" type="button" data-admin-create-product>
              <i class="fa-solid fa-plus"></i>
              Criar produto
            </button>
            <button class="btn btn-secondary" type="button" id="refresh-products-empty">
              <i class="fa-solid fa-rotate"></i>
              Recarregar
            </button>
          </div>
        </div>
      `,
      );
      qs('#refresh-products-empty')?.addEventListener('click', () => refreshAdminProducts({ force: true }));
      qs('[data-admin-create-product]', list)?.addEventListener('click', () => startAdminProductForm('produto'));
      return;
    }

    if (!visibleProducts.length) {
      list.insertAdjacentHTML(
        'beforeend',
        `
        <div class="admin-products-empty">
          <i class="fa-solid fa-filter-circle-xmark"></i>
          <strong>Nenhum produto encontrado neste filtro</strong>
          <span>Limpe a busca ou selecione "Todos" para ver o catalogo inteiro.</span>
        </div>
      `,
      );
      return;
    }

    visibleProducts.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'admin-product-card';
      const active = product.ativo !== false;
      const normalized = normalizeProduct(product);
      const image = productAssetPath(normalized);
      const type = productType(product);
      const offer = productOfferActive(product);
      const highlighted = adminProductHighlighted(product);
      const local = Boolean(product.__local);
      const stock = productStockLevel(product);
      const stockState = productStockState(product);
      const stockText = stock === null ? 'Sem controle de estoque' : stock <= 0 ? 'Esgotado' : `${stock} em estoque`;
      card.classList.toggle('is-offer', offer);
      card.classList.toggle('is-kit', type === 'kit');
      card.classList.toggle('is-local', local);
      card.classList.toggle('is-low-stock', stockState === 'low');
      card.classList.toggle('is-out-of-stock', stockState === 'out');

      card.innerHTML = `
        <div class="admin-product-media">
          ${image ? `<img src="${escapeHTML(assetHref(image))}" alt="${escapeHTML(product.nome || '')}" loading="lazy" decoding="async">` : '<i class="fa-solid fa-box"></i>'}
        </div>
        <div class="admin-product-info">
          <div class="admin-product-title">
            <strong>${escapeHTML(product.nome || '')}</strong>
            <span class="badge ${active ? 'is-active' : 'is-inactive'}">${active ? 'Ativo' : 'Desativado'}</span>
            ${type === 'kit' ? '<span class="badge is-kit">Kit</span>' : ''}
            ${offer ? '<span class="badge is-offer">Oferta</span>' : ''}
            ${highlighted && !offer ? '<span class="badge is-highlight">Destaque</span>' : ''}
            ${stockState === 'low' ? '<span class="badge is-stock-low">Estoque baixo</span>' : ''}
            ${stockState === 'out' ? '<span class="badge is-stock-out">Esgotado</span>' : ''}
            ${local ? '<span class="badge is-local">Local</span>' : ''}
          </div>
          <p>${escapeHTML(product.categoria || 'Produtos')}</p>
          <small>${escapeHTML(product.descricao || 'Sem descricao')}</small>
          <small><strong>Estoque:</strong> ${escapeHTML(stockText)}</small>
          ${product.kit_itens ? `<small><strong>Kit:</strong> ${escapeHTML(product.kit_itens)}</small>` : ''}
          ${offer ? `<small><strong>${escapeHTML(offerCountdownText(product.oferta_fim))}</strong> - de ${formatMoney(product.preco)} por ${formatMoney(product.preco_promocional)}</small>` : ''}
          <div class="admin-price-row">
            <label for="product-price-${escapeHTML(product.id)}">Preco</label>
            <input id="product-price-${escapeHTML(product.id)}" type="number" min="0" step="0.01" value="${Number(product.preco || 0).toFixed(2)}" data-admin-product-price-input="${escapeHTML(product.id)}" ${local ? 'disabled' : ''}>
            <button class="btn btn-secondary" type="button" data-admin-product-price-save="${escapeHTML(product.id)}" ${local ? 'disabled' : ''}>
              <i class="fa-solid fa-check"></i>
              Salvar preco
            </button>
          </div>
          <div class="admin-stock-row">
            <label for="product-stock-${escapeHTML(product.id)}">Estoque</label>
            <input id="product-stock-${escapeHTML(product.id)}" type="number" min="0" step="1" value="${stock === null ? '' : escapeHTML(stock)}" data-admin-product-stock-input="${escapeHTML(product.id)}" ${local ? 'disabled' : ''}>
            <button class="btn btn-secondary" type="button" data-admin-product-stock-save="${escapeHTML(product.id)}" ${local || !productExtendedColumnsReady ? 'disabled' : ''}>
              <i class="fa-solid fa-box"></i>
              Salvar estoque
            </button>
          </div>
          ${
            local
              ? ''
              : `<div class="admin-stock-quick-actions">
            <button class="btn btn-secondary" type="button" data-admin-product-stock-set="${escapeHTML(product.id)}" data-stock-value="0" ${!productExtendedColumnsReady ? 'disabled' : ''}>
              <i class="fa-solid fa-ban"></i>
              Esgotar
            </button>
            <button class="btn btn-secondary" type="button" data-admin-product-stock-set="${escapeHTML(product.id)}" data-stock-value="${escapeHTML((stock ?? 0) + 1)}" ${!productExtendedColumnsReady ? 'disabled' : ''}>
              <i class="fa-solid fa-plus"></i>
              +1 unidade
            </button>
          </div>`
          }
        </div>
        <div class="admin-product-actions">
          <button class="btn btn-secondary" type="button" data-admin-product-edit="${escapeHTML(product.id)}">
            <i class="fa-solid ${local ? 'fa-cloud-arrow-up' : 'fa-pen'}"></i>
            ${local ? 'Salvar no Supabase' : 'Editar'}
          </button>
          ${
            local
              ? ''
              : `<button class="btn btn-secondary" type="button" data-admin-product-highlight="${escapeHTML(product.id)}" data-product-highlighted="${highlighted ? 'true' : 'false'}">
            <i class="fa-solid fa-star"></i>
            ${highlighted ? 'Tirar destaque' : 'Destacar'}
          </button>
          <button class="btn btn-secondary" type="button" data-admin-product-quick-offer="${escapeHTML(product.id)}">
            <i class="fa-solid fa-bolt"></i>
            Oferta 24h
          </button>
          ${
            offer
              ? `
            <button class="btn btn-secondary" type="button" data-admin-product-end-offer="${escapeHTML(product.id)}">
              <i class="fa-solid fa-hourglass-end"></i>
              Encerrar oferta
            </button>
          `
              : ''
          }
          <button class="btn btn-secondary" type="button" data-admin-product-duplicate="${escapeHTML(product.id)}">
            <i class="fa-solid fa-copy"></i>
            Duplicar
          </button>
          <button class="btn btn-secondary" type="button" data-admin-product-toggle="${escapeHTML(product.id)}" data-product-active="${active ? 'true' : 'false'}">
            <i class="fa-solid ${active ? 'fa-eye-slash' : 'fa-eye'}"></i>
            ${active ? 'Desativar' : 'Ativar'}
          </button>
          <button class="btn btn-secondary admin-danger" type="button" data-admin-product-delete="${escapeHTML(product.id)}">
            <i class="fa-solid fa-trash"></i>
            Excluir
          </button>`
          }
        </div>
      `;
      list.appendChild(card);
    });
  }

  function mapSupabaseOrder(row) {
    return {
      id: row.codigo || row.id,
      uuid: row.id,
      createdAt: row.created_at,
      customer: {
        name: row.cliente_nome || '',
        email: row.cliente_email || '',
        phone: row.cliente_telefone || '',
        address: row.endereco_entrega || '',
        note: row.observacao || '',
      },
      items: (row.pedido_itens || []).map((item) => ({
        id: item.id,
        productId: item.produto_id || '',
        name: item.nome,
        variant: item.variacao || '',
        quantity: item.quantidade,
        price: item.preco_unitario,
        image: item.imagem || '',
      })),
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.desconto || 0),
      coupon: row.cupom_codigo ? { code: row.cupom_codigo } : null,
      delivery: Number(row.entrega || 0),
      total: Number(row.total || 0),
      gift: Boolean(row.brinde),
      payment: row.pagamento || '',
      status: normalizeOrderStatus(row.status),
      paymentStatus: normalizePaymentStatus(row.pagamento_status),
      confirmed: Boolean(row.confirmado),
      customerType: row.cliente_tipo || (row.user_id ? 'cliente' : 'visitante'),
    };
  }

  async function loadOrdersFromSupabase({ force = false } = {}) {
    const client = ordersClient();
    if (!client) return loadLocalOrders();
    if (remoteOrdersLoaded && !force) return dedupeOrders(remoteOrdersCache);

    try {
      await authReady.catch(() => null);
      const extendedSelect =
        'id, codigo, user_id, created_at, cliente_tipo, cliente_nome, cliente_email, cliente_telefone, endereco_entrega, observacao, pagamento, status, pagamento_status, confirmado, confirmado_em, subtotal, entrega, total, brinde, cupom_codigo, desconto, pedido_itens(id, produto_id, nome, variacao, quantidade, preco_unitario, total, imagem)';
      const baseSelect =
        'id, codigo, user_id, created_at, cliente_nome, cliente_email, cliente_telefone, endereco_entrega, observacao, pagamento, status, subtotal, entrega, total, brinde, pedido_itens(id, produto_id, nome, variacao, quantidade, preco_unitario, total, imagem)';
      let { data, error } = await client
        .from('pedidos')
        .select(orderExtendedColumnsReady ? extendedSelect : baseSelect)
        .order('created_at', { ascending: false });

      if (error && orderExtendedColumnsReady && isMissingOrderExtensionError(error)) {
        orderExtendedColumnsReady = false;
        const fallback = await client.from('pedidos').select(baseSelect).order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      remoteOrdersCache = dedupeOrders((data || []).map(mapSupabaseOrder));
      remoteOrdersLoaded = true;
      return remoteOrdersCache;
    } catch (error) {
      console.warn('[Supabase] Nao foi possivel carregar pedidos. Usando cache local.', error);
      return loadLocalOrders();
    }
  }

  function trackedOrderFromPayload(raw = {}) {
    const customer = raw.customer || {};
    return {
      id: raw.id || raw.codigo || '',
      uuid: raw.uuid || raw.order_id || raw.pedido_id || '',
      createdAt: raw.createdAt || raw.created_at || '',
      customer: {
        name: customer.name || raw.cliente_nome || '',
        email: customer.email || raw.cliente_email || '',
        phone: customer.phone || raw.cliente_telefone || '',
        address: customer.address || raw.endereco_entrega || '',
        note: customer.note || raw.observacao || '',
      },
      items: (raw.items || raw.pedido_itens || []).map((item) => ({
        id: item.id || '',
        productId: item.productId || item.produto_id || '',
        name: item.name || item.nome || 'Produto',
        variant: item.variant || item.variacao || '',
        quantity: Number(item.quantity ?? item.quantidade ?? 1),
        price: Number(item.price ?? item.preco_unitario ?? 0),
        image: item.image || item.imagem || '',
      })),
      subtotal: Number(raw.subtotal || 0),
      discount: Number(raw.discount ?? raw.desconto ?? 0),
      coupon: raw.coupon || (raw.cupom_codigo ? { code: raw.cupom_codigo } : null),
      delivery: Number(raw.delivery ?? raw.entrega ?? 0),
      total: Number(raw.total || 0),
      gift: Boolean(raw.gift ?? raw.brinde),
      payment: raw.payment || raw.pagamento || '',
      status: normalizeOrderStatus(raw.status),
      paymentStatus: normalizePaymentStatus(raw.paymentStatus || raw.pagamento_status),
      confirmed: Boolean(raw.confirmed ?? raw.confirmado),
      customerType: raw.customerType || raw.cliente_tipo || 'visitante',
    };
  }

  async function trackOrderByCode(code, phone) {
    const client = ordersClient();
    const cleanCode = String(code || '').trim();
    const cleanPhone = onlyDigits(phone || '');
    if (!client) throw new Error('Supabase indisponivel.');
    if (!cleanCode || cleanPhone.length < 10)
      throw new Error('Informe o codigo do pedido e o WhatsApp usado na compra.');

    const { data, error } = await client.rpc('track_order', {
      p_codigo: cleanCode,
      p_cliente_telefone: cleanPhone,
    });
    if (error) throw error;
    return trackedOrderFromPayload(data || {});
  }

  function rememberTrackedOrder(order) {
    if (!order?.id) return;
    saveOrderLocally(order);
  }

  async function refreshLocalOrdersFromSupabase() {
    const localOrders = loadLocalOrders();
    if (!localOrders.length || !ordersClient()?.rpc) return localOrders;

    const refreshed = await Promise.all(
      localOrders.map(async (order) => {
        const code = order.id || order.codigo || '';
        const phone = order.customer?.phone || '';
        if (!code || onlyDigits(phone).length < 10) return order;
        try {
          return await trackOrderByCode(code, phone);
        } catch (_error) {
          return order;
        }
      }),
    );

    const merged = dedupeOrders([...refreshed, ...localOrders]);
    saveJSON(STORAGE.orders, merged.slice(0, 20));
    return merged;
  }

  function subscribeCustomerOrdersRealtime() {
    const client = ordersClient();
    if (!client?.channel || customerOrdersRealtimeChannel || !['pedidos.html', 'perfil.html'].includes(currentPage())) return;
    try {
      customerOrdersRealtimeChannel = client
        .channel('monte-sinai-customer-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          remoteOrdersLoaded = false;
          renderOrdersEverywhere({ force: true });
        })
        .subscribe();
    } catch (error) {
      console.warn('[Pedidos] Realtime indisponivel para o cliente. Mantendo atualizacao por polling.', error);
    }
  }

  function orderBelongsToCurrentUser(order) {
    if (!currentUser?.email && !currentUser?.phone) return false;
    const userEmail = normalizeText(currentUser.email || '');
    const userPhone = onlyDigits(currentUser.phone || '');
    const orderEmail = normalizeText(order.customer?.email || '');
    const orderPhone = onlyDigits(order.customer?.phone || '');
    return Boolean(
      (userEmail && orderEmail && userEmail === orderEmail) || (userPhone && orderPhone && userPhone === orderPhone),
    );
  }

  function hasCurrentCustomerIdentity() {
    return Boolean(currentUser?.email || currentUser?.phone);
  }

  async function loadCustomerOrderNotifications({ force = false } = {}) {
    if (!force && orderNotificationsCache.length) return orderNotificationsCache;
    if (!orderNotificationsReady) return [];
    const client = ordersClient();
    if (!client || !currentUser?.email) return [];

    try {
      await authReady.catch(() => null);
      const authUser = await currentAuthUser().catch(() => null);
      let rows = [];
      if (authUser?.id) {
        const byUser = await client
          .from('pedido_notificacoes')
          .select(ORDER_NOTIFICATION_SELECT)
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(12);
        if (byUser.error) throw byUser.error;
        rows = byUser.data || [];
      }

      if (!rows.length && currentUser.email) {
        const byEmail = await client
          .from('pedido_notificacoes')
          .select(ORDER_NOTIFICATION_SELECT)
          .eq('cliente_email', currentUser.email)
          .order('created_at', { ascending: false })
          .limit(12);
        if (byEmail.error) throw byEmail.error;
        rows = byEmail.data || [];
      }

      orderNotificationsCache = rows;
      return rows;
    } catch (error) {
      if (isMissingNotificationTableError(error)) {
        orderNotificationsReady = false;
        return [];
      }
      console.warn('[Pedidos] Nao foi possivel carregar avisos do cliente.', error);
      return [];
    }
  }

  function ensureProfileNotificationsPanel() {
    const detailsPanel = qs('[data-profile-panel="details"]');
    if (!detailsPanel) return null;
    let panel = qs('#profile-order-notifications', detailsPanel);
    if (panel) return panel;

    panel = document.createElement('section');
    panel.id = 'profile-order-notifications';
    panel.className = 'profile-order-notifications';
    panel.innerHTML = `
      <div class="section-head">
        <span class="eyebrow">Avisos dos pedidos</span>
        <h3>Atualizacoes da Monte Sinai</h3>
        <p>Quando um pedido mudar de status, o aviso aparece aqui.</p>
      </div>
      <div class="profile-notification-list" data-profile-notification-list></div>
    `;
    detailsPanel.insertBefore(panel, qs('.profile-feature-grid', detailsPanel));
    return panel;
  }

  async function renderCustomerOrderNotifications({ force = false } = {}) {
    if (currentPage() !== 'perfil.html') return;
    const panel = ensureProfileNotificationsPanel();
    const list = qs('[data-profile-notification-list]', panel || document);
    if (!panel || !list) return;

    const notifications = await loadCustomerOrderNotifications({ force });
    panel.classList.toggle('hidden', !currentUser?.email && !notifications.length);
    list.innerHTML = notifications.length
      ? notifications
          .map(
            (item) => `
        <article class="profile-notification-item ${item.lida ? 'is-read' : ''}">
          <i class="fa-solid ${toastIcon(item.tipo === 'pagamento' ? 'warning' : 'order')}"></i>
          <span>
            <strong>${escapeHTML(item.titulo || 'Atualizacao do pedido')}</strong>
            <small>${escapeHTML(item.mensagem || '')}</small>
            <em>${escapeHTML(formatDateTime(item.created_at))}</em>
          </span>
        </article>
      `,
          )
          .join('')
      : '<p class="empty-cart">Nenhum aviso de pedido ainda.</p>';
  }

  async function renderOrdersEverywhere(options = {}) {
    let orders = dedupeOrders(await loadOrdersFromSupabase(options));
    if (!hasCurrentCustomerIdentity() && ['pedidos.html', 'perfil.html'].includes(currentPage())) {
      orders = await refreshLocalOrdersFromSupabase();
    }
    const customerOrders = hasCurrentCustomerIdentity() ? orders.filter(orderBelongsToCurrentUser) : loadLocalOrders();

    setText('#dash-orders-count', String(orders.length));
    setText('#dash-orders-total', formatMoney(orders.reduce((sum, order) => sum + Number(order.total || 0), 0)));
    setText('#dash-last-order', orders[0]?.id || 'Nenhum');
    renderSalesReports(orders);
    renderDeveloperDiagnostics();
    updateAdminOrderAlertUI(orders);
    qsa('[data-profile-order-count]').forEach((el) => {
      el.textContent = String(customerOrders.length);
    });

    qsa('[data-orders-container], #orders-list').forEach((container) => {
      renderOrders(container, orders);
    });
    renderCustomerOrderNotifications({ force: options.force === true });
  }

  function sameLocalDate(value, date = new Date()) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.toLocaleDateString('pt-BR') === date.toLocaleDateString('pt-BR');
  }

  function renderMetricList(container, rows = []) {
    if (!container) return;
    container.innerHTML = rows.length
      ? rows
          .map(
            (row) =>
              `<div class="admin-metric-row"><span>${escapeHTML(row.label)}</span><strong>${escapeHTML(row.value)}</strong></div>`,
          )
          .join('')
      : '<p class="empty-cart">Sem dados suficientes ainda.</p>';
  }

  function renderSalesReports(orders = []) {
    const delivered = orders.filter((order) => normalizeOrderStatus(order.status) === 'Entregue');
    const paidBase = delivered.length ? delivered : orders;
    const total = paidBase.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const todayOrders = orders.filter((order) => sameLocalDate(order.createdAt));
    const todayTotal = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const averageTicket = paidBase.length ? total / paidBase.length : 0;
    const pendingPayment = orders.filter((order) => normalizePaymentStatus(order.paymentStatus) === 'Pendente');
    const paidOrders = orders.filter((order) => normalizePaymentStatus(order.paymentStatus) === 'Pago');
    const unconfirmed = orders.filter((order) => !order.confirmed);
    const statusRows = ORDER_STATUS_OPTIONS.map((status) => ({
      label: status,
      value: String(orders.filter((order) => normalizeOrderStatus(order.status) === status).length),
    }));

    renderMetricList(qs('#sales-dashboard'), [
      { label: 'Pedidos no periodo', value: String(orders.length) },
      { label: 'Faturamento registrado', value: formatMoney(total) },
      { label: 'Ticket medio', value: formatMoney(averageTicket) },
      { label: 'Pedidos entregues', value: String(delivered.length) },
      { label: 'Aguardando confirmacao', value: String(unconfirmed.length) },
      { label: 'Pagamento pendente', value: String(pendingPayment.length) },
    ]);

    renderMetricList(qs('#daily-report'), [
      { label: 'Pedidos de hoje', value: String(todayOrders.length) },
      { label: 'Total de hoje', value: formatMoney(todayTotal) },
      { label: 'Ticket medio hoje', value: formatMoney(todayOrders.length ? todayTotal / todayOrders.length : 0) },
      { label: 'Pagos no painel', value: String(paidOrders.length) },
      ...statusRows,
    ]);
  }

  function lowStockProducts(products = []) {
    return products
      .filter((product) => product.ativo !== false && ['low', 'out'].includes(productStockState(product)))
      .sort((a, b) => (productStockLevel(a) ?? 9999) - (productStockLevel(b) ?? 9999));
  }

  function renderStockAlerts(products = []) {
    const container = qs('#stock-alerts');
    const lowProducts = lowStockProducts(products);
    if (container) {
      container.innerHTML = lowProducts.length
        ? lowProducts
            .map((product) => {
              const stock = productStockLevel(product) ?? 0;
              return `
            <div class="admin-stock-alert ${stock <= 0 ? 'is-out' : ''}">
              <span>${escapeHTML(product.nome || 'Produto')}</span>
              <strong>${stock <= 0 ? 'Esgotado' : `${stock} un.`}</strong>
            </div>
          `;
            })
            .join('')
        : '<p class="empty-cart">Nenhum produto em alerta de estoque.</p>';
    }
    notifyLowStock(lowProducts);
  }

  function orderStatusTimelineHTML(status = '') {
    const displayStatus = normalizeOrderStatus(status);
    const canceled = displayStatus === 'Cancelado';
    const steps = ORDER_STATUS_OPTIONS.map((label) => {
      const isCanceledStep = label === 'Cancelado';
      const active = canceled ? isCanceledStep : !isCanceledStep && ORDER_STATUS_OPTIONS.indexOf(label) <= ORDER_STATUS_OPTIONS.indexOf(displayStatus);
      return `<span class="${active ? 'active' : ''} ${isCanceledStep ? 'is-canceled-step' : ''}">${escapeHTML(label)}</span>`;
    });
    return steps.join('');
  }

  function notifyLowStock(products = []) {
    if (!products.length || !('Notification' in window) || Notification.permission !== 'granted') return;
    const signature = products.map((product) => `${product.id}:${productStockLevel(product)}`).join('|');
    if (!signature || signature === lastLowStockSignature) return;
    lastLowStockSignature = signature;
    new Notification('Monte Sinai: estoque baixo', {
      body: `${products.length} produto${products.length === 1 ? '' : 's'} precisam de reposicao.`,
      icon: assetHref(siteConfig.logoUrl),
    });
  }

  function renderOrders(container, orders) {
    if (!container) return;
    const isProfileHistory = container.id === 'profile-orders';
    const isCustomerOrdersPage = container.id === 'customer-orders-list';
    const isAdminOrders = isCustomerOrdersPage && ordersPageAdminMode;
    container.innerHTML = '';

    if (isProfileHistory) {
      container.insertAdjacentHTML(
        'beforeend',
        `
        <div class="section-head">
          <span class="eyebrow">Histórico de pedidos</span>
          <h3>Historico de pedidos do cliente</h3>
          <p>Acompanhe os pedidos já enviados e limpe o histórico quando quiser.</p>
        </div>
        <div class="settings-actions profile-history-actions">
          <button class="btn btn-secondary" type="button" data-clear-order-history>
            <i class="fa-solid fa-clock-rotate-left"></i>
            Limpar histórico
          </button>
          <button class="btn btn-secondary" type="button" data-clear-cache-orders>
            <i class="fa-solid fa-broom"></i>
            Limpar cache e histórico
          </button>
        </div>
      `,
      );
    }

    let visibleOrders = orders;
    if ((isProfileHistory || isCustomerOrdersPage) && !isAdminOrders) {
      if (!hasCurrentCustomerIdentity()) {
        if (isProfileHistory)
          container.insertAdjacentHTML(
            'beforeend',
            `
          <div class="profile-guest-note">
            <strong>Pedidos deste aparelho</strong>
            <p>Como visitante, seu historico fica salvo neste navegador. Entre ou cadastre-se para vincular seus pedidos ao perfil.</p>
            <div class="settings-actions">
              <a class="btn btn-primary" href="${loginHref({ mode: 'register', redirect: 'perfil.html' })}">Cadastrar</a>
              <a class="btn btn-secondary" href="${loginHref({ redirect: 'perfil.html' })}">Entrar</a>
            </div>
          </div>
        `,
          );
        if (isCustomerOrdersPage)
          container.insertAdjacentHTML(
            'beforeend',
            `
          <div class="profile-guest-note">
            <strong>Pedidos deste aparelho</strong>
            <p>Voce pode acompanhar os pedidos feitos neste celular sem entrar. Para buscar outro pedido, use o codigo e WhatsApp abaixo.</p>
          </div>
        `,
          );
        visibleOrders = loadLocalOrders();
      } else {
        visibleOrders = orders.filter(orderBelongsToCurrentUser);
      }
    }

    if (!visibleOrders.length) {
      const emptyMessage = isAdminOrders
        ? 'Nenhum pedido encontrado no Supabase.'
        : 'Nenhum pedido registrado neste navegador ainda.';
      container.insertAdjacentHTML('beforeend', `<p class="empty-cart">${emptyMessage}</p>`);
      return;
    }

    visibleOrders.forEach((order) => {
      const card = document.createElement('article');
      const displayStatus = normalizeOrderStatus(order.status);
      const paymentStatus = normalizePaymentStatus(order.paymentStatus);
      card.className = `order-card ${orderStatusClass(displayStatus)} ${orderPaymentClass(paymentStatus)} ${order.confirmed ? 'is-confirmed' : 'is-unconfirmed'}`;
      const items = (order.items || [])
        .map((item) => `<li>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</li>`)
        .join('');
      const statusOptions = ORDER_STATUS_OPTIONS.map(
        (status) =>
          `<option value="${escapeHTML(status)}" ${status === displayStatus ? 'selected' : ''}>${escapeHTML(status)}</option>`,
      ).join('');
      const paymentOptions = PAYMENT_STATUS_OPTIONS.map(
        (status) =>
          `<option value="${escapeHTML(status)}" ${status === paymentStatus ? 'selected' : ''}>${escapeHTML(status)}</option>`,
      ).join('');
      const statusControl =
        isAdminOrders && order.uuid
          ? `<label class="admin-order-status">Status<select data-order-status="${escapeHTML(order.uuid)}">${statusOptions}</select></label>`
          : `<span class="badge">${escapeHTML(displayStatus)}</span>`;
      const adminControls =
        isAdminOrders && order.uuid
          ? `
          <div class="admin-order-control-grid">
            <label>Pagamento<select data-order-payment-status="${escapeHTML(order.uuid)}">${paymentOptions}</select></label>
            <button class="btn btn-secondary ${order.confirmed ? 'is-confirmed' : ''}" type="button" data-order-confirm="${escapeHTML(order.uuid)}" ${order.confirmed ? 'disabled' : ''}>
              <i class="fa-solid ${order.confirmed ? 'fa-circle-check' : 'fa-check-double'}"></i>
              ${order.confirmed ? 'Confirmado' : 'Confirmar pedido'}
            </button>
            <button class="btn btn-secondary" type="button" data-order-customer-whatsapp="${escapeHTML(order.uuid)}">
              <i class="fa-brands fa-whatsapp"></i>
              Avisar cliente
            </button>
          </div>
        `
          : '';
      const statusSteps = orderStatusTimelineHTML(displayStatus);

      card.innerHTML = `
        <header>
          <strong>${escapeHTML(order.id)}</strong>
          ${statusControl}
        </header>
        <div class="order-admin-badges">
          <span class="badge ${order.customerType === 'visitante' ? 'is-local' : ''}">${escapeHTML(order.customerType === 'visitante' ? 'Visitante' : 'Cliente logado')}</span>
          <span class="badge ${order.confirmed ? 'is-paid' : 'is-pending'}">${escapeHTML(order.confirmed ? 'Pedido confirmado' : 'A confirmar')}</span>
          <span class="badge ${paymentStatus === 'Pago' ? 'is-paid' : paymentStatus === 'Cancelado' ? 'is-canceled' : 'is-pending'}">Pagamento: ${escapeHTML(paymentStatus)}</span>
        </div>
        <p>${escapeHTML(order.customer?.name || '')} - ${escapeHTML(order.customer?.phone || '')}</p>
        ${isAdminOrders ? `<p>${escapeHTML(order.customer?.email || 'Cliente sem email')}</p>` : ''}
        <p>${escapeHTML(order.customer?.address || '')}</p>
        ${adminControls}
        <div class="order-status-steps">${statusSteps}</div>
        <ul>${items}</ul>
        ${order.discount ? `<p class="order-discount">Cupom ${escapeHTML(order.coupon?.code || '')}: - ${formatMoney(order.discount)}</p>` : ''}
        <footer>
          <div>
            <strong>${formatMoney(order.total || 0)}</strong>
            <small>${escapeHTML(formatDateTime(order.createdAt))}</small>
          </div>
          <div class="order-card-actions">
            <button class="btn btn-secondary" type="button" data-repeat-order="${escapeHTML(order.id)}" data-repeat-checkout="${isProfileHistory || isCustomerOrdersPage ? 'true' : 'false'}">
              <i class="fa-solid fa-repeat"></i>
              Repetir pedido
            </button>
            <button class="btn btn-secondary" type="button" data-order-whatsapp="${escapeHTML(order.id)}">
              <i class="fa-brands fa-whatsapp"></i>
              Abrir WhatsApp
            </button>
          </div>
        </footer>
      `;
      container.appendChild(card);
    });
  }

  function bindSubtleAnimations() {
    const elements = qsa(
      '.section-head, .category-card, .product-card, .info-card, .about-card, .contact-box, .settings-section, .profile-card',
    );
    elements.forEach((el) => el.classList.add('reveal-on-scroll'));

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    elements.forEach((el) => observer.observe(el));
  }
});
