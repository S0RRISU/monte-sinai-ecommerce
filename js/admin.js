document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const PRODUCT_IMAGE_BUCKET = 'produtos';
  const PRODUCT_IMAGE_MAX_SIDE = 1800;
  const PRODUCT_IMAGE_MIN_SIDE = 900;
  const PRODUCT_IMAGE_TARGET_SIZE = 2.4 * 1024 * 1024;
  const PRODUCT_IMAGE_OUTPUT_TYPE = 'image/jpeg';
  const PRODUCT_IMAGE_OUTPUT_EXTENSION = 'jpg';
  const IMAGE_COMPRESS_QUALITY = 0.85;
  const DEVELOPER_EMAILS = new Set(['marcelol527319@gmail.com']);
  // Optional emergency fallback for roles that do not depend on profile columns.
  const FALLBACK_ADMIN_EMAILS = (window && window.__FALLBACK_ADMIN_EMAILS__) || {};
  function getFallbackRoleForEmail(email) {
    const normalized = (email || '').toLowerCase().trim();
    if (DEVELOPER_EMAILS.has(normalized)) return 'developer';
    try {
      return String(FALLBACK_ADMIN_EMAILS[normalized] || '').trim();
    } catch (e) {
      return '';
    }
  }
  const ORDER_STATUS = {
    pendente: { label: 'Pendente', db: 'Recebido', column: 'lista-pendentes' },
    preparo: { label: 'Em Preparo', db: 'Preparando', column: 'lista-preparo' },
    entrega: { label: 'Saiu para Entrega', db: 'Saiu para entrega', column: 'lista-entrega' },
    entregue: { label: 'Entregue', db: 'Entregue', column: 'lista-entregues' },
  };
  const PAYMENT_STATUS = ['Pendente', 'Pago', 'Cancelado'];
  const PRODUCT_BASIC_SELECT = 'id, nome, preco, categoria, descricao, imagem, ativo, estoque, created_at';
  const PRODUCT_EXTENDED_SELECT = [
    PRODUCT_BASIC_SELECT,
    'tipo',
    'destaque',
    'oferta_ativa',
    'preco_promocional',
    'oferta_inicio',
    'oferta_fim',
    'kit_itens',
    'estoque_minimo',
  ].join(', ');
  const PRODUCT_VARIATION_SELECT =
    'id, produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem, preco_promocional, oferta_ativa, oferta_inicio, oferta_fim, estoque_minimo, created_at, updated_at';
  const PRODUCT_VARIATION_BASIC_SELECT =
    'id, produto_id, nome, slug, sku, preco, estoque, ativo, imagem, atributos, ordem, created_at, updated_at';
  const DB_TO_UI_STATUS = Object.entries(ORDER_STATUS).reduce((map, [ui, config]) => ({ ...map, [config.db]: ui }), {});
  const ADMIN_THEME_KEY = 'ms_admin_theme';

  function orderStatusClass(statusUi = 'pendente') {
    return (
      {
        pendente: 'is-status-received',
        preparo: 'is-status-preparing',
        entrega: 'is-status-delivery',
        entregue: 'is-status-delivered',
      }[statusUi] || 'is-status-received'
    );
  }

  function orderPaymentClass(status = 'Pendente') {
    return (
      {
        Pendente: 'is-payment-pending',
        Pago: 'is-payment-paid',
        Cancelado: 'is-payment-canceled',
      }[PAYMENT_STATUS.includes(status) ? status : 'Pendente'] || 'is-payment-pending'
    );
  }

  const state = {
    client: null,
    pedidos: [],
    produtos: [],
    variacoes: [],
    realtimeChannel: null,
    activeTab: 'pedidos',
    activeOrderStatus: 'pendente',
    orderView: 'active',
    selectedProductId: '',
    user: null,
    profile: null,
    developerManifest: null,
    auditLogs: [],
  };
  let productsExtendedReady = true;
  let ordersExtendedReady = true;
  let ordersArchiveReady = true;
  let orderEventsReady = true;
  let variationsExtendedReady = true;
  let productCreateSaving = false;
  const productSaveLocks = new Set();
  const variationSaveLocks = new Set();

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const text = (value) => String(value ?? '');
  const onlyDigits = (value) => text(value).replace(/\D/g, '');
  const normalize = (value) =>
    text(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  applyAdminTheme();

  function applyAdminTheme(theme = localStorage.getItem(ADMIN_THEME_KEY) || 'dark') {
    const resolved = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = resolved;
    document.body.classList.toggle('light-mode', resolved === 'light');
    document.body.dataset.theme = resolved;
    document.body.dataset.themeMode = resolved;
    document.body.dataset.themeResolved = resolved;
    document.body.dataset.adminTheme = resolved;
    qs('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#eef3f8' : '#091525');
    qsa('[data-admin-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(resolved === 'light'));
      const label = resolved === 'light' ? 'Tema escuro' : 'Tema claro';
      const icon = resolved === 'light' ? 'fa-moon' : 'fa-sun';
      button.innerHTML = `<i class="fa-solid ${icon}"></i>${label}`;
    });
  }

  function toggleAdminTheme() {
    const next = document.body.dataset.adminTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem(ADMIN_THEME_KEY, next);
    applyAdminTheme(next);
  }

  function escapeHTML(value) {
    return text(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[char],
    );
  }

  function escapeSelector(value) {
    if (window.CSS?.escape) return window.CSS.escape(text(value));
    return text(value).replace(/["\\]/g, '\\$&');
  }

  function parsePrice(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const clean = text(value)
      .trim()
      .replace(/[^\d,.-]/g, '');
    if (!clean) return 0;
    const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function isoFromLocal(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function productOfferActive(product = {}) {
    if (!product.oferta_ativa) return false;
    if (!product.preco_promocional || Number(product.preco_promocional) <= 0) return false;
    if (!product.oferta_fim) return true;
    return new Date(product.oferta_fim).getTime() > Date.now();
  }

  function productStockLow(product = {}) {
    if (product.estoque === '' || product.estoque === null || product.estoque === undefined) return false;
    const stock = Number(product.estoque);
    const minimum = Number(product.estoque_minimo ?? 3);
    return Number.isFinite(stock) && Number.isFinite(minimum) && stock > 0 && stock <= minimum;
  }

  function productCardField(id, field) {
    return qs(`[data-admin-product-field="${field}"][data-product-id="${escapeSelector(id)}"]`);
  }

  function variationField(id, field) {
    return qs(`[data-admin-variation-field="${field}"][data-variation-id="${escapeSelector(id)}"]`);
  }

  function safeSlug(value = 'opcao') {
    return (
      normalize(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 70) || 'opcao'
    );
  }

  function productPlaceholderTone(product = {}) {
    const blob = normalize(`${product.nome || ''} ${product.categoria || ''} ${product.descricao || ''}`);
    if (blob.includes('gas')) return 'gas';
    if (blob.includes('agua')) return 'agua';
    if (blob.includes('vassoura') || blob.includes('rodo') || blob.includes('pa') || blob.includes('utensilio'))
      return 'utensilios';
    if (blob.includes('higiene') || blob.includes('banheiro') || blob.includes('sabonete')) return 'higiene';
    return 'limpeza';
  }

  function productPlaceholderIcon(product = {}) {
    const tone = productPlaceholderTone(product);
    return (
      {
        gas: 'fa-fire-flame-simple',
        agua: 'fa-droplet',
        utensilios: 'fa-broom',
        higiene: 'fa-bath',
        limpeza: 'fa-spray-can-sparkles',
      }[tone] || 'fa-box'
    );
  }

  function productPlaceholderHTML(product = {}) {
    const tone = productPlaceholderTone(product);
    return `
      <span class="product-placeholder product-placeholder-${tone} admin-product-placeholder" aria-hidden="true">
        <i class="fa-solid ${productPlaceholderIcon(product)}"></i>
        <small>${escapeHTML(product.categoria || 'Produto')}</small>
      </span>
    `;
  }

  function productImageHTML(product = {}) {
    const src = text(product.imagem || '').trim();
    const placeholder = productPlaceholderHTML(product);
    if (!src) return placeholder;
    return `<img src="${escapeHTML(src)}" alt="${escapeHTML(product.nome || '')}" loading="lazy" decoding="async" onerror="this.remove()">${placeholder}`;
  }

  function showToast(message, type = 'info') {
    let stack = qs('.admin-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'admin-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const icon =
      {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info',
      }[type] || 'fa-circle-info';
    toast.innerHTML = `
      <span class="admin-toast-icon"><i class="fa-solid ${icon}"></i></span>
      <span class="admin-toast-message">${escapeHTML(message)}</span>
      <button class="admin-toast-close" type="button" aria-label="Fechar aviso"><i class="fa-solid fa-xmark"></i></button>
    `;
    stack.appendChild(toast);
    qs('.admin-toast-close', toast)?.addEventListener('click', () => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 180);
    });
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  function client() {
    if (!state.client) state.client = window.monteSinaiSupabase || window.supabaseClient || null;
    return state.client;
  }

  async function rpcAtualizarPedido(pedidoId, payload = {}) {
    const api = client();
    if (!api?.rpc) return { data: null, error: new Error('RPC indisponivel') };
    return api.rpc('admin_update_order', {
      p_id: pedidoId,
      p_status: payload.status ?? null,
      p_pagamento_status: payload.pagamento_status ?? null,
      p_confirmado: payload.confirmado ?? null,
    });
  }

  async function rpcAtualizarProduto(productId, payload = {}) {
    const api = client();
    if (!api?.rpc) return { data: null, error: new Error('RPC indisponivel') };
    return api.rpc('admin_update_product', {
      p_id: productId,
      p_payload: payload,
    });
  }

  async function logAdminAction(action, entityType, entityId, metadata = {}) {
    const api = client();
    if (!api?.rpc) return;
    try {
      const { error } = await api.rpc('admin_log_action', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: text(entityId),
        p_metadata: metadata || {},
      });
      if (error) console.warn('[Admin Audit] Log nao registrado.', error);
    } catch (error) {
      console.warn('[Admin Audit] Log nao registrado.', error);
    }
  }

  function friendlyDbError(error, fallback) {
    const message = normalize(error?.message || error?.details || '');
    if (
      message.includes('falha no storage') ||
      message.includes('sem permissao para enviar imagem') ||
      message.includes('formato de imagem') ||
      message.includes('imagem preparada') ||
      message.includes('usuario admin nao autenticado') ||
      message.includes('bucket produtos nao encontrado')
    ) {
      return error?.message || fallback;
    }
    if (message.includes('produto_variacoes')) {
      return 'Execute supabase/20260522-produto-variacoes.sql para liberar variacoes.';
    }
    if (message.includes('does not exist') || message.includes('column')) {
      return 'Banco do Supabase incompleto. Execute supabase/reparar-painel-admin.sql no SQL Editor.';
    }
    if (message.includes('row-level security') || message.includes('permission')) {
      return 'A conta precisa estar marcada como administradora no Supabase.';
    }
    if (message.includes('bucket') || message.includes('storage')) {
      return 'Confira o bucket público produtos e as policies de Storage.';
    }
    return fallback;
  }

  function isMissingSchemaError(error, patterns = []) {
    const message = normalize(`${error?.message || ''} ${error?.details || ''}`);
    return (
      message.includes('does not exist') ||
      message.includes('column') ||
      patterns.some((pattern) => message.includes(normalize(pattern)))
    );
  }

  function logAdminAccess(stage, details = {}) {
    const payload = {
      stage,
      hasSession: Boolean(details.hasSession),
      email: details.email || '',
      userId: details.userId || '',
      profileFound: Boolean(details.profileFound),
      profileIsAdmin: details.profileIsAdmin ?? null,
      profileAdminRole: details.profileAdminRole || '',
      decision: details.decision || '',
      reason: details.reason || '',
      error: details.error || '',
    };
    console.info('[Admin Access]', payload);
  }

  function setDatabaseAlert(message = '') {
    const alert = qs('#admin-db-alert');
    if (!alert) return;
    alert.classList.toggle('hidden', !message);
    alert.innerHTML = message ? `<strong>Ação necessária no Supabase</strong><span>${escapeHTML(message)}</span>` : '';
  }

  function setAccessState(title, message, options = {}) {
    const access = qs('#admin-access-state');
    const workspace = qs('[data-admin-workspace]');
    workspace?.classList.add('hidden');
    if (!access) return;
    access.classList.remove('hidden');
    access.innerHTML = `
      <i class="fa-solid fa-${escapeHTML(options.icon || 'lock')}"></i>
      <h1>${escapeHTML(title)}</h1>
      <p>${escapeHTML(message)}</p>
      <div class="settings-actions">
        <a class="btn btn-primary ${options.login ? '' : 'hidden'}" href="login.html?redirect=painel.html">
          <i class="fa-solid fa-right-to-bracket"></i>
          Entrar como administrador
        </a>
        <button class="btn btn-primary ${options.retry ? '' : 'hidden'}" type="button" data-admin-retry-access>
          <i class="fa-solid fa-rotate"></i>
          Tentar novamente
        </button>
        <a class="btn btn-secondary" href="../index.html">Voltar ao site</a>
      </div>
    `;
  }

  function currentAdminRole() {
    const emailRole = normalize(getFallbackRoleForEmail(state.profile?.email || state.user?.email || ''));
    if (emailRole === 'developer') return 'developer';
    return state.profile?.is_admin === true ? 'staff' : '';
  }

  function isDeveloperAdmin() {
    return currentAdminRole() === 'developer';
  }

  function applyDeveloperAccessUI() {
    const developer = isDeveloperAdmin();
    document.body.classList.toggle('admin-developer', developer);
    qsa('[data-developer-only]').forEach((element) => {
      element.classList.toggle('hidden', !developer);
      element.hidden = !developer;
      element.setAttribute('aria-hidden', String(!developer));
    });
  }

  async function loadCurrentAdminProfile(api, user) {
    const context = {
      hasSession: Boolean(user?.id),
      email: user?.email || '',
      userId: user?.id || '',
    };
    let { data: profile, error } = await api
      .from('profiles')
      .select('id, email, nome, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logAdminAccess('profiles-error', {
        ...context,
        error: error.message || error.details || error.code || 'erro desconhecido',
        decision: 'blocked',
        reason: 'profile-query-error',
      });
      throw error;
    }

    if (profile) {
      logAdminAccess('profiles-loaded', {
        ...context,
        profileFound: true,
        profileIsAdmin: profile.is_admin,
        profileAdminRole: getFallbackRoleForEmail(profile.email || user.email) || '',
      });
      return {
        ...profile,
        email: profile.email || user.email || '',
        role: getFallbackRoleForEmail(profile.email || user.email) || '',
      };
    }

    const fb = getFallbackRoleForEmail(user.email);
    logAdminAccess('profiles-empty', {
      ...context,
      profileFound: false,
      profileIsAdmin: false,
      profileAdminRole: fb || '',
      reason: 'profile-not-found-for-auth-user',
    });
    return {
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.name || user.email,
      is_admin: false,
      role: fb || 'customer',
    };
  }

  async function verificarAcessoAdmin() {
    const api = client();
    if (!api?.auth) {
      logAdminAccess('supabase-client-missing', {
        decision: 'blocked',
        reason: 'supabase-client-missing',
      });
      setAccessState('Supabase indisponível', 'O cliente Supabase não carregou nesta página.', {
        icon: 'triangle-exclamation',
        retry: true,
      });
      return false;
    }

    const { data: sessionData, error: sessionError } = await api.auth.getUser();
    if (sessionError) console.warn('[Admin] Falha ao ler usuario autenticado.', sessionError);
    const user = sessionData?.user;
    logAdminAccess('session-loaded', {
      hasSession: Boolean(user?.id),
      email: user?.email || '',
      userId: user?.id || '',
      error: sessionError?.message || '',
    });
    if (!user?.id) {
      logAdminAccess('access-decision', {
        hasSession: false,
        decision: 'blocked',
        reason: 'no-session',
      });
      setAccessState('Acesso restrito', 'Entre com uma conta administradora para acessar o painel.', {
        icon: 'right-to-bracket',
        login: true,
      });
      return false;
    }

    state.user = user;

    try {
      state.profile = await loadCurrentAdminProfile(api, user);
    } catch (error) {
      console.warn('[Admin] Perfil admin nao foi lido.', error);
      setAccessState('Erro ao carregar perfil', `Email detectado: ${user.email || 'não informado'}. Não foi possível validar suas permissões no Supabase agora.`, {
        icon: 'triangle-exclamation',
        retry: true,
      });
      return false;
    }

    const role = currentAdminRole();
    const admin = Boolean(state.profile?.is_admin === true || isDeveloperAdmin());
    logAdminAccess('access-decision', {
      hasSession: true,
      email: user.email || '',
      userId: user.id || '',
      profileFound: Boolean(state.profile),
      profileIsAdmin: state.profile?.is_admin,
      profileAdminRole: role,
      decision: admin ? 'allowed' : 'blocked',
      reason: admin ? 'is-admin-or-developer-email' : state.profile ? 'profile-not-admin' : 'profile-not-found',
    });
    if (!admin) {
      setAccessState('Acesso negado', 'Você não tem permissão para acessar o painel administrativo.', {
        icon: 'shield-halved',
      });
      return false;
    }

    qs('#admin-access-state')?.classList.add('hidden');
    qs('[data-admin-workspace]')?.classList.remove('hidden');
    document.body.classList.add('admin-ready');
    document.body.classList.toggle('admin-owner', role === 'owner');
    applyDeveloperAccessUI();
    applyTeamAccessUI();
    return true;
  }

  function canManageTeam() {
    return ['developer', 'owner'].includes(currentAdminRole());
  }

  function applyTeamAccessUI() {
    const allowed = canManageTeam();
    qsa('[data-admin-tab="equipe"]').forEach((element) => {
      element.classList.toggle('hidden', !allowed);
      element.hidden = !allowed;
      element.setAttribute('aria-hidden', String(!allowed));
    });
  }

  function renderAdminTab(tab = 'pedidos') {
    let nextTab = qs(`[data-admin-panel="${tab}"]`) ? tab : 'pedidos';
    if ((nextTab === 'developer' || nextTab === 'dev-console') && !isDeveloperAdmin()) {
      nextTab = 'pedidos';
      showToast('Área exclusiva do desenvolvedor.', 'error');
    }
    if (nextTab === 'equipe' && !canManageTeam()) {
      nextTab = 'pedidos';
      showToast('Área exclusiva para desenvolvedor e proprietários.', 'error');
    }
    state.activeTab = nextTab;

    qsa('[data-admin-tab]').forEach((button) => {
      const active = button.dataset.adminTab === nextTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    qsa('[data-admin-panel]').forEach((panel) => {
      const active = panel.dataset.adminPanel === nextTab;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });

    history.replaceState(null, '', `#${nextTab}`);
    if (nextTab === 'financeiro') renderFinanceiro();
    if (nextTab === 'entregas') renderEntregas();
    if (nextTab === 'perfil') renderAdminProfile();
    if (nextTab === 'equipe') carregarEquipeAdmin();
    if (nextTab === 'developer') renderDeveloperAdmin();
    if (nextTab === 'dev-console') renderDevConsole();
  }

  function dbStatusToUi(status = '') {
    return DB_TO_UI_STATUS[status] || 'pendente';
  }

  function uiStatusToDb(statusUi = '') {
    return ORDER_STATUS[statusUi]?.db || null;
  }

  function orderShortId(order) {
    return (
      text(order.codigo || order.id)
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 5)
        .toUpperCase() || 'NOVO'
    );
  }

  function mapOrder(row = {}) {
    return {
      ...row,
      items: Array.isArray(row.pedido_itens) ? row.pedido_itens : [],
      statusUi: dbStatusToUi(row.status),
      totalNumber: Number(row.total || 0),
      archivedAt: row.archived_at || null,
      archivedBy: row.archived_by || null,
      archivedReason: row.archived_reason || '',
    };
  }

  function setOrderArchiveView(view = 'active') {
    state.orderView = view === 'history' ? 'history' : 'active';
    renderizarPedidosAdmin(state.pedidos);
  }


  function unreadAdminOrders(pedidos = state.pedidos) {
    const list = pedidos || [];
    const unconfirmed = list.filter((order) => order.confirmado === false);
    if (unconfirmed.length) return unconfirmed;
    return list.filter((order) => order.statusUi !== 'entregue');
  }

  function adminSearchQuery(selector) {
    return normalize(qs(selector)?.value || '');
  }

  function orderMatchesSearch(order = {}, query = '') {
    if (!query) return true;
    const items = (order.items || []).map((item) => `${item.nome || ''} ${item.variacao || ''}`).join(' ');
    const haystack = normalize(
      [
        order.codigo,
        order.id,
        order.cliente_nome,
        order.cliente_email,
        order.cliente_telefone,
        onlyDigits(order.cliente_telefone),
        order.endereco_entrega,
        order.pagamento,
        order.pagamento_status,
        order.status,
        order.total,
        items,
      ].join(' '),
    );
    return haystack.includes(query);
  }

  function productMatchesSearch(product = {}, query = '') {
    if (!query) return true;
    const stock =
      product.estoque === null || product.estoque === undefined
        ? 'sem estoque cadastrado'
        : `${product.estoque} estoque`;
    const offer = productOfferActive(product) ? 'oferta promocao destaque' : '';
    const active = product.ativo === false ? 'desativado inativo' : 'ativo';
    const haystack = normalize(
      [product.nome, product.categoria, product.descricao, product.tipo, stock, offer, active, product.preco].join(' '),
    );
    return haystack.includes(query);
  }

  function adminCategorySlug(value = '') {
    const normalized = normalize(value || 'produtos');
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
    return normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'produtos';
  }

  function productMatchesCategory(product = {}, filter = 'all') {
    return !filter || filter === 'all' || adminCategorySlug(product.categoria) === filter;
  }

  function isMissingVariationTableError(error) {
    const message = normalize(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
    return (
      message.includes('produto_variacoes') ||
      message.includes('does not exist') ||
      message.includes('could not find') ||
      message.includes('pgrst205') ||
      message.includes('pgrst204')
    );
  }

  function productAuditActions(previous = {}, payload = {}, fallbackAction = 'produto_atualizado') {
    const actions = new Set([fallbackAction]);
    if (Object.prototype.hasOwnProperty.call(payload, 'ativo') && payload.ativo === false && previous.ativo !== false) {
      actions.add('produto_desativado');
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'estoque') && Number(payload.estoque) !== Number(previous.estoque)) {
      actions.add('estoque_alterado');
    }
    if (
      ['oferta_ativa', 'preco_promocional', 'oferta_inicio', 'oferta_fim'].some((key) =>
        Object.prototype.hasOwnProperty.call(payload, key),
      )
    ) {
      actions.add('oferta_alterada');
    }
    return [...actions];
  }

  async function logProductActions(productId, previous, payload, fallbackAction = 'produto_atualizado') {
    const metadata = {
      nome: payload.nome || previous?.nome || '',
      campos: Object.keys(payload),
    };
    for (const action of productAuditActions(previous, payload, fallbackAction)) {
      await logAdminAction(action, 'produto', productId, metadata);
    }
  }

  function updateOrderStatusTabs(pedidos = [], query = '') {
    Object.keys(ORDER_STATUS).forEach((key) => {
      const count = pedidos.filter((order) => order.statusUi === key).length;
      const button = qs(`[data-admin-order-filter="${key}"]`);
      const badge = qs(`[data-admin-order-filter-count="${key}"]`);
      if (badge) badge.textContent = String(count);
      if (button) {
        const active = key === state.activeOrderStatus;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
        button.disabled = query && count === 0 && !active;
      }
    });
  }

  function setActiveOrderStatus(statusUi = 'pendente') {
    state.activeOrderStatus = ORDER_STATUS[statusUi] ? statusUi : 'pendente';
    renderizarPedidosAdmin(state.pedidos);
  }

  async function carregarPedidosAdmin(options = {}) {
    const api = client();
    if (!api) return [];

    const extendedSelectFields = [
      'id',
      'codigo',
      'created_at',
      'cliente_tipo',
      'cliente_nome',
      'cliente_email',
      'cliente_telefone',
      'endereco_entrega',
      'observacao',
      'pagamento',
      'status',
      'pagamento_status',
      'confirmado',
      'confirmado_em',
      'pagamento_confirmado_em',
      'archived_at',
      'archived_by',
      'archived_reason',
      'subtotal',
      'entrega',
      'total',
      'brinde',
      'pedido_itens(id, produto_id, variacao_id, nome, variacao, quantidade, preco_unitario, total, imagem)',
    ];
    const extendedSelect = extendedSelectFields.join(', ');
    const baseSelect =
      'id, codigo, created_at, cliente_nome, cliente_email, cliente_telefone, endereco_entrega, observacao, pagamento, status, total';

    let { data, error } = await api.from('pedidos').select(extendedSelect).order('created_at', { ascending: false });

    if (error && isMissingSchemaError(error, ['archived_at', 'archived_by', 'archived_reason', 'variacao_id'])) {
      console.warn('[Admin] Campos da etapa 7 ausentes; tentando pedidos sem historico formal.', error);
      if (normalize(`${error?.message || ''} ${error?.details || ''}`).includes('archived')) ordersArchiveReady = false;
      setDatabaseAlert(
        'Aplique supabase/20260523-etapa-7-base-correta.sql para habilitar arquivamento e historico real de pedidos.',
      );
      const retrySelect = extendedSelectFields
        .filter((field) => !['archived_at', 'archived_by', 'archived_reason'].includes(field))
        .map((field) => field.replace('variacao_id, ', ''))
        .join(', ');
      const fallback = await api.from('pedidos').select(retrySelect).order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error && isMissingSchemaError(error, ['pagamento_status', 'confirmado'])) {
      console.warn('[Admin] Busca completa de pedidos falhou, tentando campos basicos.', error);
      ordersExtendedReady = false;
      setDatabaseAlert(
        'A tabela pedidos ainda não tem as colunas de pagamento/confirmacao. Execute supabase/reparar-painel-admin.sql para liberar status completo, pagamento e confirmação.',
      );
      const fallback = await api.from('pedidos').select(baseSelect).order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    } else if (!error) {
      ordersExtendedReady = true;
      if (ordersArchiveReady !== false) ordersArchiveReady = true;
    }

    if (error || !data) {
      showToast(friendlyDbError(error, 'Não consegui carregar os pedidos.'), 'error');
      return [];
    }

    // Pedidos ativos e arquivados vêm do Supabase. Nao usar localStorage
    // para arquivamento administrativo, historico real ou financeiro.
    state.pedidos = (data || []).map(mapOrder);
    renderizarPedidosAdmin(state.pedidos, options);
    renderFinanceiro();
    renderEntregas();
    return state.pedidos;
  }

  function emptyColumnHTML(label) {
    return `<p class="admin-empty-state">Nenhum pedido em ${escapeHTML(label.toLowerCase())}.</p>`;
  }

  function orderItemsHTML(order) {
    if (!order.items?.length) return '<li>Itens não carregados</li>';
    return order.items
      .map((item) => {
        const variant = item.variacao ? ` - ${item.variacao}` : '';
        return `<li>${escapeHTML(item.quantidade || 1)} x ${escapeHTML(item.nome || 'Produto')}${escapeHTML(variant)}</li>`;
      })
      .join('');
  }

  function orderStatusSelect(order) {
    return `
      <label class="admin-order-status-select">
        <span>Status</span>
        <select data-admin-order-status="${escapeHTML(order.id)}">
          ${Object.entries(ORDER_STATUS)
            .map(
              ([key, config]) => `
            <option value="${escapeHTML(key)}" ${key === order.statusUi ? 'selected' : ''}>${escapeHTML(config.label)}</option>
          `,
            )
            .join('')}
        </select>
      </label>
    `;
  }

  function orderPaymentSelect(order) {
    const payment = PAYMENT_STATUS.includes(order.pagamento_status) ? order.pagamento_status : 'Pendente';
    if (!ordersExtendedReady) {
      return `
        <label class="admin-order-status-select">
          <span>Pagamento</span>
          <select disabled>
            <option>Atualize o banco</option>
          </select>
        </label>
      `;
    }
    return `
      <label class="admin-order-status-select">
        <span>Pagamento</span>
        <select data-admin-order-payment="${escapeHTML(order.id)}">
          ${PAYMENT_STATUS.map(
            (status) => `
            <option value="${escapeHTML(status)}" ${status === payment ? 'selected' : ''}>${escapeHTML(status)}</option>
          `,
          ).join('')}
        </select>
      </label>
    `;
  }

  function adminOrderProgressHTML(statusUi = 'pendente') {
    const currentIndex = Math.max(0, Object.keys(ORDER_STATUS).indexOf(statusUi));
    const steps = [
      { key: 'pendente', label: 'Recebido', icon: 'fa-receipt' },
      { key: 'preparo', label: 'Preparo', icon: 'fa-box-open' },
      { key: 'entrega', label: 'Entrega', icon: 'fa-truck-fast' },
      { key: 'entregue', label: 'Entregue', icon: 'fa-circle-check' },
    ];
    const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;
    return `
      <div class="admin-order-progress" style="--order-progress:${progress}%;" aria-label="Progresso do pedido">
        <div class="admin-order-progress-track" aria-hidden="true"></div>
        <div class="admin-order-progress-steps">
          ${steps
            .map((step, index) => {
              const done = index <= currentIndex;
              const current = index === currentIndex;
              return `
                <span class="${done ? 'is-done' : ''} ${current ? 'is-current' : ''}" data-order-progress-step="${escapeHTML(step.key)}">
                  <i class="fa-solid ${step.icon}"></i>
                  <strong>${escapeHTML(step.label)}</strong>
                </span>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  function orderCardHTML(order, highlightId = '') {
    const highlighted = highlightId && order.id === highlightId;
    const payment = PAYMENT_STATUS.includes(order.pagamento_status) ? order.pagamento_status : 'Pendente';
    const archived = Boolean(order.archivedAt);
    return `
      <article class="admin-order-card ${orderStatusClass(order.statusUi)} ${orderPaymentClass(payment)} ${order.confirmado ? 'is-confirmed' : 'is-unconfirmed'} ${highlighted ? 'is-new' : ''}" data-admin-order-card="${escapeHTML(order.id)}">
        <header>
          <strong>#${escapeHTML(orderShortId(order))}</strong>
          <span>${escapeHTML(formatDateTime(order.created_at))}</span>
        </header>
        <div class="admin-order-customer">
          <h3>${escapeHTML(order.cliente_nome || 'Cliente')}</h3>
          <a href="https://wa.me/${escapeHTML(onlyDigits(order.cliente_telefone))}" target="_blank" rel="noreferrer">
            ${escapeHTML(order.cliente_telefone || 'Sem telefone')}
          </a>
          <p>${escapeHTML(order.endereco_entrega || 'Endereço não informado')}</p>
        </div>
        <ul class="admin-order-items">${orderItemsHTML(order)}</ul>
        <div class="admin-order-meta">
          <span>${escapeHTML(order.pagamento || 'Pagamento a combinar')}</span>
          <strong>${formatMoney(order.totalNumber)}</strong>
        </div>
        ${adminOrderProgressHTML(order.statusUi)}
        <div class="admin-order-control-grid">
          ${orderStatusSelect(order)}
          ${orderPaymentSelect(order)}
          <button class="btn btn-secondary ${order.confirmado ? 'is-confirmed' : ''}" type="button" data-admin-order-confirm="${escapeHTML(order.id)}" ${order.confirmado || !ordersExtendedReady ? 'disabled' : ''}>
            <i class="fa-solid ${order.confirmado ? 'fa-circle-check' : 'fa-check-double'}"></i>
            ${!ordersExtendedReady ? 'Atualize o banco' : order.confirmado ? 'Pedido confirmado' : 'Confirmar pedido'}
          </button>
          ${
            archived
              ? `<button class="btn btn-secondary" type="button" data-admin-order-restore="${escapeHTML(order.id)}">
            <i class="fa-solid fa-box-open"></i>
            Restaurar
          </button>`
              : `<button class="btn btn-secondary" type="button" data-admin-order-archive="${escapeHTML(order.id)}" ${ordersArchiveReady ? '' : 'disabled'}>
            <i class="fa-solid fa-box-archive"></i>
            ${ordersArchiveReady ? 'Arquivar' : 'Aplique migração'}
          </button>`
          }
        </div>
      </article>
    `;
  }

  function renderizarPedidosAdmin(pedidos = state.pedidos, options = {}) {
    const query = adminSearchQuery('#admin-order-search');
    const archivedCount = pedidos.filter((order) => order.archivedAt).length;
    const activeCount = pedidos.length - archivedCount;
    const byArchive = pedidos.filter((order) =>
      state.orderView === 'history' ? order.archivedAt : !order.archivedAt,
    );
    const visiblePedidos = query ? byArchive.filter((order) => orderMatchesSearch(order, query)) : byArchive;
    const activeStatus = ORDER_STATUS[state.activeOrderStatus] ? state.activeOrderStatus : 'pendente';
    const activeConfig = ORDER_STATUS[activeStatus];
    const activePedidos = visiblePedidos.filter((order) => order.statusUi === activeStatus);

    Object.values(ORDER_STATUS).forEach((config) => {
      const column = qs(`#${config.column}`);
      if (column) column.innerHTML = '';
    });

    const activeColumn = qs(`#${activeConfig.column}`);
    activePedidos.forEach((order) => {
      if (activeColumn) activeColumn.insertAdjacentHTML('beforeend', orderCardHTML(order, options.highlightId));
    });

    Object.entries(ORDER_STATUS).forEach(([key, config]) => {
      const column = qs(`#${config.column}`);
      const wrapper = qs(`[data-status-column="${key}"]`);
      const count = visiblePedidos.filter((order) => order.statusUi === key).length;
      wrapper?.style.setProperty('--admin-column-count', `"${count}"`);
      wrapper?.classList.toggle('is-active', key === activeStatus);
      if (wrapper) wrapper.hidden = key !== activeStatus;
      if (column && key === activeStatus && !column.children.length) column.innerHTML = emptyColumnHTML(config.label);
    });
    updateOrderStatusTabs(visiblePedidos, query);
    qsa('[data-admin-orders-view]').forEach((button) => {
      const view = button.dataset.adminOrdersView || 'active';
      button.classList.toggle('active', view === state.orderView);
      button.setAttribute('aria-pressed', String(view === state.orderView));
      const count = view === 'history' ? archivedCount : activeCount;
      const badge = button.querySelector('[data-admin-orders-view-count]');
      if (badge) badge.textContent = String(count);
    });

    const openCount = unreadAdminOrders(pedidos.filter((order) => !order.archivedAt)).length;
    const badge = qs('#badge-pedidos');
    if (badge) badge.textContent = String(openCount);
    if (badge) {
      badge.classList.toggle('is-empty', openCount === 0);
      badge.setAttribute(
        'aria-label',
        `${openCount} pedido${openCount === 1 ? '' : 's'} nao lido${openCount === 1 ? '' : 's'}`,
      );
    }
    qsa('[data-admin-mobile-orders]').forEach((mobileBadge) => {
      mobileBadge.textContent = String(openCount);
      mobileBadge.classList.toggle('is-empty', openCount === 0);
      mobileBadge.setAttribute(
        'aria-label',
        `${openCount} pedido${openCount === 1 ? '' : 's'} nao lido${openCount === 1 ? '' : 's'}`,
      );
    });

    if (options.announce) {
      const alert = qs('#admin-new-order-alert');
      if (alert) {
        alert.textContent = 'Novo pedido recebido no painel.';
        alert.classList.remove('hidden');
        window.setTimeout(() => alert.classList.add('hidden'), 5000);
      }
    }
    renderSystemConsoleSummary();
  }

  function renderAdminProfile() {
    const name =
      state.profile?.nome ||
      state.profile?.name ||
      state.user?.user_metadata?.nome ||
      state.user?.email?.split('@')[0] ||
      'Administrador Monte Sinai';
    const email = state.profile?.email || state.user?.email || 'Conta administrativa';
    const role = currentAdminRole() || 'admin';
    setText('#admin-profile-name', name);
    setText('#admin-profile-email', email);
    setText('#admin-profile-role', role === 'developer' ? 'Desenvolvedor' : role === 'owner' ? 'Proprietário' : 'Equipe');
  }

  function assinarPedidosRealtime() {
    const api = client();
    if (!api?.channel || state.realtimeChannel) return;
    const status = qs('#admin-realtime-status');
    if (status) status.textContent = 'Conectando...';

    state.realtimeChannel = api
      .channel('monte-sinai-admin-pedidos-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (payload) => {
        const isInsert = payload.eventType === 'INSERT';
        carregarPedidosAdmin({
          highlightId: payload.new?.id || '',
          announce: isInsert,
        });
      })
      .subscribe((result) => {
        if (status) {
          status.textContent = result === 'SUBSCRIBED' ? 'Realtime ativo' : 'Reconectando...';
          status.classList.toggle('is-live', result === 'SUBSCRIBED');
        }
      });
  }

  async function atualizarStatusPedido(pedidoId, statusUi) {
    const api = client();
    const status = uiStatusToDb(statusUi);
    if (!api || !pedidoId || !status) {
      showToast('Status inválido para este pedido.', 'error');
      return false;
    }

    const select = qs(`[data-admin-order-status="${escapeSelector(pedidoId)}"]`);
    if (select) select.disabled = true;

    let { data, error } = await api
      .from('pedidos')
      .update({ status })
      .eq('id', pedidoId)
      .select('id, status')
      .maybeSingle();

    if (error || !data) {
      const fallback = await rpcAtualizarPedido(pedidoId, { status });
      data = Array.isArray(fallback.data) ? fallback.data[0] : fallback.data;
      error = fallback.error;
    }

    if (select) select.disabled = false;

    if (error) {
      showToast(friendlyDbError(error, 'Não consegui atualizar o status.'), 'error');
      await carregarPedidosAdmin();
      return false;
    }

    state.pedidos = state.pedidos.map((order) => (order.id === pedidoId ? { ...order, status, statusUi } : order));
    renderizarPedidosAdmin(state.pedidos, { highlightId: pedidoId });
    await logAdminAction('pedido_status', 'pedido', pedidoId, { status });
    await registrarPedidoEvento(pedidoId, 'status_alterado', { status_novo: status });
    await carregarPedidosAdmin({ highlightId: pedidoId });
    showToast('Status do pedido atualizado.', 'success');
    return true;
  }

  async function atualizarPagamentoPedido(pedidoId, pagamentoStatus) {
    const api = client();
    if (!api || !pedidoId || !PAYMENT_STATUS.includes(pagamentoStatus)) {
      showToast('Status de pagamento invalido.', 'error');
      return false;
    }
    if (!ordersExtendedReady) {
      showToast('Execute o SQL de reparo no Supabase para controlar pagamento.', 'error');
      setDatabaseAlert(
        'A coluna pedidos.pagamento_status não existe no banco. Execute supabase/reparar-painel-admin.sql.',
      );
      return false;
    }

    const select = qs(`[data-admin-order-payment="${escapeSelector(pedidoId)}"]`);
    if (select) select.disabled = true;

    let { data, error } = await api
      .from('pedidos')
      .update({
        pagamento_status: pagamentoStatus,
        pagamento_confirmado_em: pagamentoStatus === 'Pago' ? new Date().toISOString() : null,
      })
      .eq('id', pedidoId)
      .select('id, pagamento_status')
      .maybeSingle();

    if (error || !data) {
      const fallback = await rpcAtualizarPedido(pedidoId, { pagamento_status: pagamentoStatus });
      data = Array.isArray(fallback.data) ? fallback.data[0] : fallback.data;
      error = fallback.error;
    }

    if (select) select.disabled = false;

    if (error || !data || data.pagamento_status !== pagamentoStatus) {
      showToast(friendlyDbError(error, 'Nao consegui atualizar o pagamento.'), 'error');
      await carregarPedidosAdmin();
      return false;
    }

    state.pedidos = state.pedidos.map((order) =>
      order.id === pedidoId ? { ...order, pagamento_status: pagamentoStatus } : order,
    );
    renderizarPedidosAdmin(state.pedidos, { highlightId: pedidoId });
    await logAdminAction('pedido_pagamento', 'pedido', pedidoId, { pagamento_status: pagamentoStatus });
    await registrarPedidoEvento(pedidoId, 'pagamento_alterado', { pagamento_status: pagamentoStatus });
    showToast('Pagamento atualizado.', 'success');
    return true;
  }

  async function confirmarPedidoAdmin(pedidoId) {
    const api = client();
    if (!api || !pedidoId) return false;
    if (!ordersExtendedReady) {
      showToast('Execute o SQL de reparo no Supabase para confirmar pedidos.', 'error');
      setDatabaseAlert('A coluna pedidos.confirmado não existe no banco. Execute supabase/reparar-painel-admin.sql.');
      return false;
    }

    const button = qs(`[data-admin-order-confirm="${escapeSelector(pedidoId)}"]`);
    if (button) button.disabled = true;

    let { data, error } = await api
      .from('pedidos')
      .update({ confirmado: true, confirmado_em: new Date().toISOString() })
      .eq('id', pedidoId)
      .select('id, confirmado')
      .maybeSingle();

    if (error || !data) {
      const fallback = await rpcAtualizarPedido(pedidoId, { confirmado: true });
      data = Array.isArray(fallback.data) ? fallback.data[0] : fallback.data;
      error = fallback.error;
    }

    if (error || !data || data.confirmado !== true) {
      if (button) button.disabled = false;
      showToast(friendlyDbError(error, 'Nao consegui confirmar o pedido.'), 'error');
      await carregarPedidosAdmin();
      return false;
    }

    state.pedidos = state.pedidos.map((order) => (order.id === pedidoId ? { ...order, confirmado: true } : order));
    renderizarPedidosAdmin(state.pedidos, { highlightId: pedidoId });
    await logAdminAction('pedido_confirmado', 'pedido', pedidoId, { confirmado: true });
    showToast('Pedido confirmado.', 'success');
    return true;
  }

  async function registrarPedidoEvento(pedidoId, tipo, payload = {}) {
    const api = client();
    if (!api || !pedidoId || orderEventsReady === false) return false;
    const { error } = await api.from('pedido_eventos').insert({
      pedido_id: pedidoId,
      tipo,
      status_anterior: payload.status_anterior || null,
      status_novo: payload.status_novo || null,
      payload,
      created_by: state.user?.id || null,
    });
    if (error) {
      orderEventsReady = false;
      console.warn('[Admin] pedido_eventos indisponivel. Aplique a migracao da etapa 7.', error);
      setDatabaseAlert('Aplique supabase/20260523-etapa-7-base-correta.sql para registrar eventos reais de pedidos.');
      return false;
    }
    return true;
  }

  async function archiveOrderAdmin(pedidoId) {
    const api = client();
    if (!api || !pedidoId) return false;
    if (!ordersArchiveReady) {
      setDatabaseAlert('Aplique supabase/20260523-etapa-7-base-correta.sql para arquivar pedidos sem usar o navegador.');
      showToast('Aplique a migracao da etapa 7 para arquivar pedidos.', 'error');
      return false;
    }

    const button = qs(`[data-admin-order-archive="${escapeSelector(pedidoId)}"]`);
    if (button) button.disabled = true;

    const reason = 'Arquivado no painel administrativo';
    const { data, error } = await api.rpc('archive_order', {
      pedido_id: pedidoId,
      reason,
    });

    if (button) button.disabled = false;

    if (error) {
      ordersArchiveReady = false;
      setDatabaseAlert('A RPC public.archive_order não respondeu. Confira as funções da etapa 7 no Supabase.');
      showToast(friendlyDbError(error, 'Nao consegui guardar o pedido no historico.'), 'error');
      await carregarPedidosAdmin();
      return false;
    }

    const archivedOrder = Array.isArray(data) ? data[0] : data;
    const archivedAt = archivedOrder?.archived_at || new Date().toISOString();
    state.pedidos = state.pedidos.map((order) =>
      String(order.id) === String(pedidoId)
        ? {
            ...order,
            archivedAt,
            archivedBy: archivedOrder?.archived_by || state.user?.id || null,
            archivedReason: archivedOrder?.archived_reason || reason,
          }
        : order,
    );
    renderizarPedidosAdmin(state.pedidos);
    renderFinanceiro();
    await carregarPedidosAdmin();
    showToast('Pedido guardado no historico.', 'success');
    return true;
  }

  async function restoreOrderAdmin(pedidoId) {
    const api = client();
    if (!api || !pedidoId) return false;
    if (!ordersArchiveReady) {
      setDatabaseAlert('Aplique supabase/20260523-etapa-7-base-correta.sql para restaurar pedidos do historico.');
      showToast('Aplique a migracao da etapa 7 para restaurar pedidos.', 'error');
      return false;
    }

    const button = qs(`[data-admin-order-restore="${escapeSelector(pedidoId)}"]`);
    if (button) button.disabled = true;

    const { error } = await api.rpc('restore_order', {
      pedido_id: pedidoId,
    });

    if (button) button.disabled = false;

    if (error) {
      ordersArchiveReady = false;
      setDatabaseAlert('A RPC public.restore_order não respondeu. Confira as funções da etapa 7 no Supabase.');
      showToast(friendlyDbError(error, 'Nao consegui restaurar o pedido.'), 'error');
      await carregarPedidosAdmin();
      return false;
    }

    state.pedidos = state.pedidos.map((order) =>
      String(order.id) === String(pedidoId) ? { ...order, archivedAt: null, archivedBy: null, archivedReason: '' } : order,
    );
    renderizarPedidosAdmin(state.pedidos);
    renderFinanceiro();
    await carregarPedidosAdmin();
    showToast('Pedido voltou para a tela principal.', 'success');
    return true;
  }

  async function excluirPedidoAdmin(pedidoId) {
    return archiveOrderAdmin(pedidoId);
  }

  async function carregarProdutosAdmin() {
    const api = client();
    if (!api) return [];
    let { data, error } = await api
      .from('produtos')
      .select(PRODUCT_EXTENDED_SELECT)
      .order('created_at', { ascending: false });

    if (
      error &&
      isMissingSchemaError(error, ['oferta', 'promocional', 'estoque_minimo', 'destaque', 'tipo', 'kit_itens'])
    ) {
      productsExtendedReady = false;
      setDatabaseAlert(
        'A tabela produtos ainda não tem todas as colunas de oferta/estoque. Execute supabase/reparar-painel-admin.sql para liberar todos os controles.',
      );
      const fallback = await api
        .from('produtos')
        .select(PRODUCT_BASIC_SELECT)
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    } else if (!error) {
      productsExtendedReady = true;
    }

    if (error) {
      showToast(friendlyDbError(error, 'Não consegui carregar os produtos.'), 'error');
      return [];
    }

    state.produtos = data || [];
    await carregarVariacoesAdmin(state.produtos);
    renderizarProdutosAdmin(state.produtos);
    return state.produtos;
  }

  async function carregarVariacoesAdmin(produtos = state.produtos) {
    const api = client();
    const ids = produtos.map((product) => product.id).filter(Boolean);
    state.variacoes = [];
    if (!api || !ids.length) return [];

    let { data, error } = await api
      .from('produto_variacoes')
      .select(PRODUCT_VARIATION_SELECT)
      .in('produto_id', ids)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      if (isMissingVariationTableError(error)) {
        const message = normalize(`${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`);
        if (message.includes('preco_promocional') || message.includes('oferta_ativa') || message.includes('oferta_inicio') || message.includes('oferta_fim') || message.includes('estoque_minimo')) {
          variationsExtendedReady = false;
          setDatabaseAlert(
            'Aplique supabase/20260523-etapa-7-base-correta.sql para habilitar oferta formal por opcao.',
          );
          const fallback = await api
            .from('produto_variacoes')
            .select(PRODUCT_VARIATION_BASIC_SELECT)
            .in('produto_id', ids)
            .order('ordem', { ascending: true })
            .order('nome', { ascending: true });
          data = fallback.data;
          error = fallback.error;
        } else {
          setDatabaseAlert('Execute supabase/20260522-produto-variacoes.sql para gerenciar variacoes no painel.');
          return [];
        }
      } else {
        showToast(friendlyDbError(error, 'Nao consegui carregar as variacoes.'), 'error');
        return [];
      }
    }

    if (!error && variationsExtendedReady !== false) variationsExtendedReady = true;
    if (error) {
      showToast(friendlyDbError(error, 'Nao consegui carregar as variacoes.'), 'error');
      return [];
    }

    state.variacoes = Array.isArray(data) ? data : [];
    return state.variacoes;
  }

  function renderizarProdutosAdmin(produtos = state.produtos) {
    const list = qs('#lista-produtos-admin');
    const count = qs('#admin-products-count');
    const query = adminSearchQuery('#admin-product-search');
    const categoryFilter = qs('#admin-product-category-filter')?.value || 'all';
    const visibleProdutos = produtos.filter(
      (product) => productMatchesSearch(product, query) && productMatchesCategory(product, categoryFilter),
    );
    if (count)
      count.textContent =
        query || categoryFilter !== 'all' ? `${visibleProdutos.length}/${produtos.length}` : String(produtos.length);
    if (!list) return;
    if (state.selectedProductId && !produtos.some((product) => product.id === state.selectedProductId)) {
      state.selectedProductId = '';
      renderProductDetailsPanel();
    }

    if (!visibleProdutos.length) {
      list.innerHTML = `<p class="admin-empty-state">${
        query || categoryFilter !== 'all'
          ? 'Nenhum produto encontrado para esta busca e categoria.'
          : 'Nenhum produto cadastrado ainda.'
      }</p>`;
      return;
    }

    list.innerHTML = visibleProdutos
      .map((product) => {
        const offer = productOfferActive(product);
        const stock = product.estoque ?? '';
        const active = product.ativo !== false;
        const lowStock = productStockLow(product);
        const stockLabel =
          stock === '' || stock === null
            ? 'Sem estoque cadastrado'
            : Number(stock) <= 0
              ? 'Esgotado'
              : lowStock
                ? `${stock} em estoque - baixo`
                : `${stock} em estoque`;
        const statusBadges = [
          `<span class="admin-product-badge ${active ? 'is-active' : 'is-inactive'}">${active ? 'Ativo' : 'Desativado'}</span>`,
          stock !== '' && stock !== null && Number(stock) <= 0
            ? '<span class="admin-product-badge is-out">Esgotado</span>'
            : '',
          lowStock ? '<span class="admin-product-badge is-low">Estoque baixo</span>' : '',
          offer ? '<span class="admin-product-badge is-offer">Oferta</span>' : '',
        ]
          .filter(Boolean)
          .join('');
        return `
        <article class="admin-product-simple-card admin-product-manage-card ${offer ? 'is-offer' : ''} ${product.id === state.selectedProductId ? 'is-selected' : ''}" role="button" tabindex="0" data-admin-product-open="${escapeHTML(product.id)}">
          <span class="admin-product-thumb">
            ${productImageHTML(product)}
          </span>
          <div class="admin-product-manage-body">
            <div class="admin-product-manage-title">
              <strong>${escapeHTML(product.nome || 'Produto')}</strong>
              <small>${escapeHTML(product.categoria || 'Produtos')} - ${formatMoney(product.preco)}</small>
              <small>${active ? stockLabel : 'Desativado'}${offer ? ' - Em oferta' : ''}</small>
              <span class="admin-product-badges">${statusBadges}</span>
            </div>
            <div class="admin-product-quick-actions">
              <button class="btn btn-secondary" type="button" data-admin-product-edit="${escapeHTML(product.id)}">
                <i class="fa-solid fa-pen"></i>
                Editar
              </button>
              <button class="btn btn-secondary" type="button" data-admin-product-details="${escapeHTML(product.id)}">
                <i class="fa-solid fa-eye"></i>
                Ver detalhes
              </button>
              <button class="btn btn-secondary" type="button" data-admin-product-offer-24="${escapeHTML(product.id)}">
                <i class="fa-solid fa-bolt"></i>
                Oferta 24h
              </button>
              <button class="btn btn-secondary" type="button" data-admin-product-stock-zero="${escapeHTML(product.id)}">
                <i class="fa-solid fa-ban"></i>
                Esgotar
              </button>
              <button class="btn btn-secondary admin-danger" type="button" data-admin-product-delete="${escapeHTML(product.id)}">
                <i class="fa-solid fa-trash"></i>
                Excluir
              </button>
            </div>
          </div>
        </article>
      `;
      })
      .join('');
    renderProductDetailsPanel();
    renderSystemConsoleSummary();
  }

  function productDetailsPanelHTML(product = {}) {
    const offer = productOfferActive(product);
    const active = product.ativo !== false;
    const variations = productVariations(product.id);
    const stock = product.estoque ?? '';
    const lowStock = productStockLow(product);
    const stockLabel =
      stock === '' || stock === null
        ? 'Sem estoque cadastrado'
        : Number(stock) <= 0
          ? 'Esgotado'
          : `${stock} em estoque${lowStock ? ' - baixo' : ''}`;
    return `
      <article class="admin-product-detail-card">
        <header>
          <div>
            <span class="eyebrow">Detalhes do produto</span>
            <h2>${escapeHTML(product.nome || 'Produto')}</h2>
          </div>
          <button class="icon-button" type="button" data-admin-product-detail-close aria-label="Fechar detalhes">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="admin-product-detail-grid">
          <span class="admin-product-detail-media">${productImageHTML(product)}</span>
          <dl>
            <div><dt>Categoria</dt><dd>${escapeHTML(product.categoria || 'Produtos')}</dd></div>
            <div><dt>Preco</dt><dd>${formatMoney(product.preco)}</dd></div>
            <div><dt>Status</dt><dd>${active ? 'Ativo' : 'Desativado'}</dd></div>
            <div><dt>Estoque</dt><dd>${escapeHTML(stockLabel)}</dd></div>
            <div><dt>Estoque minimo</dt><dd>${escapeHTML(product.estoque_minimo ?? 3)}</dd></div>
            <div><dt>Oferta</dt><dd>${offer ? `${formatMoney(product.preco_promocional)} ate ${formatDateTime(product.oferta_fim) || 'sem fim'}` : 'Nao ativa'}</dd></div>
            <div><dt>Destaque</dt><dd>${product.destaque ? 'Sim' : 'Nao'}</dd></div>
            <div><dt>ID</dt><dd>${escapeHTML(product.id || '')}</dd></div>
            <div class="is-wide"><dt>Imagem</dt><dd>${escapeHTML(product.imagem || 'Sem URL')}</dd></div>
            <div class="is-wide"><dt>Descricao</dt><dd>${escapeHTML(product.descricao || 'Sem descricao')}</dd></div>
            <div class="is-wide"><dt>Variacoes</dt><dd>${
              variations.length
                ? variations
                    .map(
                      (variation) =>
                        `${escapeHTML(variation.nome || 'Variacao')} - ${formatMoney(variation.preco || product.preco)} - ${
                          variation.ativo === false ? 'Inativa' : 'Ativa'
                        } - estoque ${escapeHTML(variation.estoque ?? 'livre')}`,
                    )
                    .join('<br>')
                : 'Sem variacoes cadastradas'
            }</dd></div>
          </dl>
        </div>
        <div class="admin-product-detail-actions">
          <button class="btn btn-primary" type="button" data-admin-product-edit="${escapeHTML(product.id)}">
            <i class="fa-solid fa-pen"></i>
            Editar produto
          </button>
          <button class="btn btn-secondary" type="button" data-admin-product-stock-zero="${escapeHTML(product.id)}">
            <i class="fa-solid fa-ban"></i>
            Esgotar
          </button>
          <button class="btn btn-secondary" type="button" data-admin-product-offer-24="${escapeHTML(product.id)}">
            <i class="fa-solid fa-bolt"></i>
            Oferta 24h
          </button>
        </div>
      </article>
    `;
  }

  function ensureProductDetailModal() {
    let modal = qs('#admin-product-detail-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'admin-product-detail-modal';
    modal.className = 'admin-product-detail-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Detalhes do produto');
    modal.innerHTML = '<div class="admin-product-detail-modal-panel" data-admin-product-detail-modal-panel></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target !== modal) return;
      state.selectedProductId = '';
      renderProductDetailsPanel();
      renderizarProdutosAdmin(state.produtos);
    });
    return modal;
  }

  function renderProductDetailsPanel() {
    const panel = qs('#admin-product-detail-panel');
    const modal = ensureProductDetailModal();
    const modalPanel = qs('[data-admin-product-detail-modal-panel]', modal);
    const product = state.produtos.find((item) => item.id === state.selectedProductId);
    if (panel) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
    }
    modal.classList.toggle('hidden', !product);
    document.body.classList.toggle('admin-detail-modal-open', Boolean(product));
    if (modalPanel) modalPanel.innerHTML = product ? productDetailsPanelHTML(product) : '';
  }

  function openProductDetails(productId) {
    const product = state.produtos.find((item) => item.id === productId);
    if (!product) return;
    state.selectedProductId = productId;
    renderProductDetailsPanel();
    renderizarProdutosAdmin(state.produtos);
  }

  function productVariations(productId) {
    return state.variacoes
      .filter((variation) => variation.produto_id === productId)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0) || text(a.nome).localeCompare(text(b.nome), 'pt-BR'));
  }

  function variationImageHTML(variation = {}, product = {}) {
    return productImageHTML({
      ...product,
      nome: variation.nome || product.nome || 'Variacao',
      imagem: variation.imagem || '',
    });
  }

  function productVariationsEditorHTML(product = {}) {
    const variations = productVariations(product.id);
    return `
      <section class="admin-product-variations">
        <header>
          <div>
            <span class="eyebrow">Produto principal separado das opcoes</span>
            <h3>Opcoes/variacoes</h3>
            <p>Use uma oferta por opcao quando precisar: por exemplo, so Ultragas em promocao.</p>
          </div>
          <small>${variations.length ? `${variations.length} cadastrada${variations.length === 1 ? '' : 's'}` : 'Nenhuma variacao cadastrada'}</small>
        </header>
        <div class="admin-variation-list">
          ${
            variations.length
              ? variations
                  .map((variation) => {
                    const active = variation.ativo !== false;
                    const stock = variation.estoque ?? '';
                    const offerActive = Boolean(variation.oferta_ativa);
                    return `
                    <article class="admin-variation-row ${active ? '' : 'is-inactive'}">
                      <div class="admin-variation-media">
                        <span class="admin-product-thumb">${variationImageHTML(variation, product)}</span>
                        <span class="admin-product-badge ${active ? 'is-active' : 'is-inactive'}">${active ? 'Ativa' : 'Desativada'}</span>
                      </div>
                      <div class="admin-variation-body">
                        <div class="admin-variation-fields">
                          <label class="admin-variation-name">Nome
                            <input type="text" value="${escapeHTML(variation.nome || '')}" data-admin-variation-field="nome" data-variation-id="${escapeHTML(variation.id)}">
                          </label>
                          <label>Preco
                            <input type="number" min="0" step="0.01" value="${Number(variation.preco || 0).toFixed(2)}" data-admin-variation-field="preco" data-variation-id="${escapeHTML(variation.id)}">
                          </label>
                          <label>Estoque
                            <input type="number" min="0" step="1" value="${escapeHTML(stock)}" placeholder="Livre" data-admin-variation-field="estoque" data-variation-id="${escapeHTML(variation.id)}">
                          </label>
                          <label>Status
                            <select data-admin-variation-field="ativo" data-variation-id="${escapeHTML(variation.id)}">
                              <option value="true" ${active ? 'selected' : ''}>Ativa</option>
                              <option value="false" ${!active ? 'selected' : ''}>Desativada</option>
                            </select>
                          </label>
                          <label>Oferta
                            <select data-admin-variation-field="oferta_ativa" data-variation-id="${escapeHTML(variation.id)}">
                              <option value="false" ${!offerActive ? 'selected' : ''}>Nao</option>
                              <option value="true" ${offerActive ? 'selected' : ''}>Sim</option>
                            </select>
                          </label>
                          <label>Preco de oferta
                            <input type="number" min="0" step="0.01" value="${variation.preco_promocional ? Number(variation.preco_promocional).toFixed(2) : ''}" data-admin-variation-field="preco_promocional" data-variation-id="${escapeHTML(variation.id)}">
                          </label>
                          <label>Oferta comeca
                            <input type="datetime-local" value="${escapeHTML(formatDateTimeLocal(variation.oferta_inicio))}" data-admin-variation-field="oferta_inicio" data-variation-id="${escapeHTML(variation.id)}">
                          </label>
                          <label>Oferta termina
                            <input type="datetime-local" value="${escapeHTML(formatDateTimeLocal(variation.oferta_fim))}" data-admin-variation-field="oferta_fim" data-variation-id="${escapeHTML(variation.id)}">
                          </label>
                          <div class="admin-variation-photo-box">
                            <label class="admin-variation-image-url">Imagem desta variacao
                              <input type="url" value="${escapeHTML(variation.imagem || '')}" placeholder="https://..." data-admin-variation-field="imagem" data-variation-id="${escapeHTML(variation.id)}">
                            </label>
                            <div class="admin-variation-photo-actions">
                              <label class="admin-upload-label">
                                <i class="fa-solid fa-camera"></i>
                                Tirar foto
                                <input type="file" accept="image/*" capture="environment" data-admin-variation-image-file-camera="${escapeHTML(variation.id)}">
                              </label>
                              <label class="admin-upload-label">
                                <i class="fa-solid fa-image"></i>
                                Escolher da galeria
                                <input type="file" accept="image/*" data-admin-variation-image-file="${escapeHTML(variation.id)}">
                              </label>
                              <button class="btn btn-secondary" type="button" data-admin-variation-image-clear="${escapeHTML(variation.id)}">
                                <i class="fa-solid fa-xmark"></i>
                                Remover imagem
                              </button>
                            </div>
                            <div class="admin-image-preview admin-variation-image-preview hidden" data-admin-variation-image-preview="${escapeHTML(variation.id)}" aria-live="polite"></div>
                            <small class="admin-image-feedback" data-admin-variation-image-feedback="${escapeHTML(variation.id)}"></small>
                          </div>
                        </div>
                      </div>
                      <div class="admin-variation-actions">
                        <button class="btn btn-primary" type="button" data-admin-variation-save="${escapeHTML(variation.id)}" data-product-id="${escapeHTML(product.id)}">
                          <i class="fa-solid fa-floppy-disk"></i>
                          Salvar
                        </button>
                        <button class="btn btn-secondary" type="button" data-admin-variation-toggle="${escapeHTML(variation.id)}" data-product-id="${escapeHTML(product.id)}" data-variation-active="${active ? 'true' : 'false'}">
                          <i class="fa-solid ${active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                          ${active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button class="btn btn-secondary" type="button" data-admin-variation-offer-24="${escapeHTML(variation.id)}" data-product-id="${escapeHTML(product.id)}" ${variationsExtendedReady ? '' : 'disabled'}>
                          <i class="fa-solid fa-bolt"></i>
                          ${variationsExtendedReady ? 'Oferta 24h' : 'Aplique SQL'}
                        </button>
                      </div>
                    </article>
                  `;
                  })
                  .join('')
              : '<p class="admin-empty-state">Cadastre uma opcao para este produto aparecer com seletor na loja.</p>'
          }
        </div>
        <div class="admin-variation-create" data-admin-variation-create="${escapeHTML(product.id)}">
          <label class="admin-variation-name">Nome
            <input type="text" data-admin-variation-new="nome" placeholder="Supergas, Pinho, Talco">
          </label>
          <label>Preco
            <input type="number" min="0" step="0.01" data-admin-variation-new="preco" value="${Number(product.preco || 0).toFixed(2)}">
          </label>
          <label>Estoque
            <input type="number" min="0" step="1" data-admin-variation-new="estoque" placeholder="Livre">
          </label>
          <div class="admin-variation-photo-box">
            <label class="admin-variation-image-url">Imagem desta nova variacao
              <input type="url" data-admin-variation-new="imagem" value="" placeholder="https://...">
            </label>
            <div class="admin-variation-photo-actions">
              <label class="admin-upload-label">
                <i class="fa-solid fa-camera"></i>
                Tirar foto
                <input type="file" accept="image/*" capture="environment" data-admin-variation-new-file-camera>
              </label>
              <label class="admin-upload-label">
                <i class="fa-solid fa-image"></i>
                Escolher da galeria
                <input type="file" accept="image/*" data-admin-variation-new-file>
              </label>
              <button class="btn btn-secondary" type="button" data-admin-variation-new-image-clear>
                <i class="fa-solid fa-xmark"></i>
                Remover imagem
              </button>
            </div>
            <div class="admin-image-preview admin-variation-image-preview hidden" data-admin-variation-new-image-preview aria-live="polite"></div>
            <small class="admin-image-feedback" data-admin-variation-new-image-feedback></small>
          </div>
          <button class="btn btn-primary" type="button" data-admin-variation-add="${escapeHTML(product.id)}">
            <i class="fa-solid fa-plus"></i>
            Adicionar variacao
          </button>
        </div>
      </section>
    `;
  }

  function productEditFormHTML(product = {}) {
    const stock = product.estoque ?? '';
    const active = product.ativo !== false;
    return `
      <div class="admin-product-editor-media">
        <span class="admin-product-thumb">${productImageHTML(product)}</span>
        <div>
          <strong>${escapeHTML(product.nome || 'Produto')}</strong>
          <small>${escapeHTML(product.categoria || 'Produtos')}</small>
        </div>
      </div>
      <div class="admin-product-edit-grid">
        <label>Nome
          <input type="text" value="${escapeHTML(product.nome || '')}" data-admin-product-field="nome" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label>Preco
          <input type="number" min="0" step="0.01" value="${Number(product.preco || 0).toFixed(2)}" data-admin-product-field="preco" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label>Categoria
          <input type="text" value="${escapeHTML(product.categoria || 'Produtos')}" data-admin-product-field="categoria" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label class="admin-product-edit-wide">Imagem principal do produto
          <input type="url" value="${escapeHTML(product.imagem || '')}" data-admin-product-field="imagem" data-product-id="${escapeHTML(product.id)}" placeholder="https://...">
        </label>
        <div class="admin-product-edit-wide admin-product-photo-box">
          <strong>Foto principal do produto</strong>
          <div class="admin-product-photo-actions">
            <label class="admin-upload-label">
              <i class="fa-solid fa-camera"></i>
              Tirar foto
              <input type="file" accept="image/*" capture="environment" data-admin-product-image-file-camera="${escapeHTML(product.id)}">
            </label>
            <label class="admin-upload-label">
              <i class="fa-solid fa-image"></i>
              Escolher da galeria
              <input type="file" accept="image/*" data-admin-product-image-file="${escapeHTML(product.id)}">
            </label>
            <button class="btn btn-secondary" type="button" data-admin-product-image-clear="${escapeHTML(product.id)}">
              <i class="fa-solid fa-xmark"></i>
              Remover imagem
            </button>
          </div>
          <div class="admin-image-preview admin-edit-image-preview hidden" data-admin-edit-image-preview="${escapeHTML(product.id)}" aria-live="polite"></div>
          <small class="admin-image-feedback" data-admin-edit-image-feedback="${escapeHTML(product.id)}"></small>
        </div>
        <label>Estoque
          <input type="number" min="0" step="1" value="${escapeHTML(stock)}" data-admin-product-field="estoque" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label>Estoque minimo
          <input type="number" min="0" step="1" value="${escapeHTML(product.estoque_minimo ?? 3)}" data-admin-product-field="estoque_minimo" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label>Status
          <select data-admin-product-field="ativo" data-product-id="${escapeHTML(product.id)}">
            <option value="true" ${active ? 'selected' : ''}>Ativo</option>
            <option value="false" ${!active ? 'selected' : ''}>Desativado</option>
          </select>
        </label>
        <label>Destaque
          <select data-admin-product-field="destaque" data-product-id="${escapeHTML(product.id)}">
            <option value="false" ${!product.destaque ? 'selected' : ''}>Nao</option>
            <option value="true" ${product.destaque ? 'selected' : ''}>Sim</option>
          </select>
        </label>
        <label>Oferta
          <select data-admin-product-field="oferta_ativa" data-product-id="${escapeHTML(product.id)}">
            <option value="false" ${!product.oferta_ativa ? 'selected' : ''}>Nao</option>
            <option value="true" ${product.oferta_ativa ? 'selected' : ''}>Sim</option>
          </select>
        </label>
        <label>Preco de oferta
          <input type="number" min="0" step="0.01" value="${product.preco_promocional ? Number(product.preco_promocional).toFixed(2) : ''}" data-admin-product-field="preco_promocional" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label>Oferta comeca
          <input type="datetime-local" value="${escapeHTML(formatDateTimeLocal(product.oferta_inicio))}" data-admin-product-field="oferta_inicio" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label>Oferta termina
          <input type="datetime-local" value="${escapeHTML(formatDateTimeLocal(product.oferta_fim))}" data-admin-product-field="oferta_fim" data-product-id="${escapeHTML(product.id)}">
        </label>
        <label class="admin-product-edit-wide">Descricao
          <textarea rows="3" data-admin-product-field="descricao" data-product-id="${escapeHTML(product.id)}">${escapeHTML(product.descricao || '')}</textarea>
        </label>
      </div>
      ${productVariationsEditorHTML(product)}
      <div class="settings-actions">
        <button class="btn btn-primary" type="button" data-admin-product-save="${escapeHTML(product.id)}">
          <i class="fa-solid fa-floppy-disk"></i>
          Salvar alteracoes
        </button>
        <button class="btn btn-secondary" type="button" data-admin-product-stock-zero="${escapeHTML(product.id)}">
          <i class="fa-solid fa-ban"></i>
          Esgotar
        </button>
        <button class="btn btn-secondary" type="button" data-admin-product-offer-24="${escapeHTML(product.id)}">
          <i class="fa-solid fa-bolt"></i>
          Oferta 24h
        </button>
        <button class="btn btn-secondary" type="button" data-admin-product-offer-end="${escapeHTML(product.id)}">
          <i class="fa-solid fa-hourglass-end"></i>
          Encerrar oferta
        </button>
      </div>
    `;
  }

  function ensureProductEditorModal() {
    let modal = qs('#admin-product-editor-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'admin-product-editor-modal';
    modal.className = 'admin-product-editor-modal hidden';
    modal.innerHTML = `
      <button class="admin-product-editor-backdrop" type="button" data-admin-product-editor-close aria-label="Fechar editor"></button>
      <section class="admin-product-editor-panel" role="dialog" aria-modal="true" aria-labelledby="admin-product-editor-title">
        <header class="admin-product-editor-head">
          <div>
            <span class="eyebrow">Editar produto</span>
            <h2 id="admin-product-editor-title">Produto da loja</h2>
          </div>
          <button class="icon-button" type="button" data-admin-product-editor-close aria-label="Fechar">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="admin-product-editor-content"></div>
      </section>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function openProductEditor(productId) {
    const product = state.produtos.find((item) => item.id === productId);
    if (!product) return;
    const modal = ensureProductEditorModal();
    const content = qs('.admin-product-editor-content', modal);
    const title = qs('#admin-product-editor-title', modal);
    if (title) title.textContent = product.nome || 'Produto da loja';
    if (content) content.innerHTML = productEditFormHTML(product);
    modal.classList.remove('hidden');
    document.body.classList.add('admin-product-editor-open');
  }

  function closeProductEditor() {
    qs('#admin-product-editor-modal')?.classList.add('hidden');
    document.body.classList.remove('admin-product-editor-open');
  }

  function adminProductPayloadFromCard(productId) {
    const field = (name) => productCardField(productId, name);
    const offerActive = field('oferta_ativa')?.value === 'true';
    return {
      nome: field('nome')?.value.trim() || '',
      preco: parsePrice(field('preco')?.value || 0),
      categoria: field('categoria')?.value.trim() || 'Produtos',
      imagem: ensureSafeProductImageValue(field('imagem')?.value || ''),
      descricao: field('descricao')?.value.trim() || '',
      estoque:
        field('estoque')?.value === '' ? null : Math.max(0, Math.round(parsePrice(field('estoque')?.value || 0))),
      estoque_minimo: Math.max(0, Math.round(parsePrice(field('estoque_minimo')?.value || 0))),
      ativo: field('ativo')?.value !== 'false',
      destaque: field('destaque')?.value === 'true' || offerActive,
      oferta_ativa: offerActive,
      preco_promocional: offerActive ? parsePrice(field('preco_promocional')?.value || 0) : null,
      oferta_inicio: offerActive ? isoFromLocal(field('oferta_inicio')?.value) || new Date().toISOString() : null,
      oferta_fim: offerActive ? isoFromLocal(field('oferta_fim')?.value) : null,
    };
  }

  function variationPayloadFromEditor(variationId) {
    const field = (name) => variationField(variationId, name);
    const name = field('nome')?.value.trim() || '';
    const payload = {
      nome: name,
      slug: safeSlug(name),
      preco: parsePrice(field('preco')?.value || 0),
      estoque:
        field('estoque')?.value === '' ? null : Math.max(0, Math.round(parsePrice(field('estoque')?.value || 0))),
      ativo: field('ativo')?.value !== 'false',
      imagem: ensureSafeProductImageValue(field('imagem')?.value || ''),
    };
    if (variationsExtendedReady) {
      const offerActive = field('oferta_ativa')?.value === 'true';
      payload.oferta_ativa = offerActive;
      payload.preco_promocional = offerActive ? parsePrice(field('preco_promocional')?.value || 0) : null;
      payload.oferta_inicio = offerActive ? isoFromLocal(field('oferta_inicio')?.value) || new Date().toISOString() : null;
      payload.oferta_fim = offerActive ? isoFromLocal(field('oferta_fim')?.value) : null;
    }
    return payload;
  }

  function setVariationBusy(variationId, busy) {
    qsa(`[data-admin-variation-save="${escapeSelector(variationId)}"], [data-admin-variation-toggle="${escapeSelector(variationId)}"]`).forEach(
      (button) => {
        button.disabled = busy;
        button.classList.toggle('is-loading', busy);
      },
    );
  }

  function setVariationAddBusy(productId, busy) {
    qsa(`[data-admin-variation-add="${escapeSelector(productId)}"]`).forEach((button) => {
      button.disabled = busy;
      button.classList.toggle('is-loading', busy);
    });
  }

  async function refreshProductEditor(productId) {
    await carregarProdutosAdmin();
    if (!qs('#admin-product-editor-modal')?.classList.contains('hidden')) openProductEditor(productId);
  }

  async function salvarVariacaoAdmin(variationId, productId, override = null) {
    const api = client();
    if (!api || !variationId || variationSaveLocks.has(variationId)) return false;
    variationSaveLocks.add(variationId);
    setVariationBusy(variationId, true);

    let payload;
    try {
      payload = override || variationPayloadFromEditor(variationId);
      if (!override) {
        const file =
          qs(`[data-admin-variation-image-file-camera="${escapeSelector(variationId)}"]`)?.files?.[0] ||
          qs(`[data-admin-variation-image-file="${escapeSelector(variationId)}"]`)?.files?.[0] ||
          null;
        if (file) {
          payload.imagem = await resolveProductImage(file, payload.nome || variationId, {
            productId,
            recordId: variationId,
            context: 'variacao',
            feedbackTarget: `[data-admin-variation-image-feedback="${escapeSelector(variationId)}"]`,
          });
        }
      }
      if (!payload.nome && !override) throw new Error('Informe o nome da variacao.');
      if (!override && payload.oferta_ativa && (!payload.preco_promocional || payload.preco_promocional <= 0)) {
        throw new Error('Informe o preco de oferta da opcao.');
      }
      if (payload.imagem) payload.imagem = ensureSafeProductImageValue(payload.imagem);
    } catch (error) {
      variationSaveLocks.delete(variationId);
      setVariationBusy(variationId, false);
      showToast(friendlyDbError(error, error.message || 'Nao consegui preparar a variacao.'), 'error');
      return false;
    }

    const { data, error } = await api.from('produto_variacoes').update(payload).eq('id', variationId).select('id, imagem').maybeSingle();
    variationSaveLocks.delete(variationId);
    setVariationBusy(variationId, false);

    if (error || !data) {
      showToast(
        friendlyDbError(
          error,
          payload.imagem ? 'Imagem enviada, mas nao foi possivel salvar a URL na variacao.' : 'Nao consegui salvar a variacao.',
        ),
        'error',
      );
      return false;
    }

    await logAdminAction(override?.ativo === false ? 'variacao_desativada' : 'variacao_atualizada', 'produto_variacao', variationId, {
      produto_id: productId,
      nome: payload.nome,
    });
    showToast(override?.ativo === false ? 'Variacao desativada.' : 'Variacao salva.', 'success');
    await refreshProductEditor(productId);
    return true;
  }

  async function adicionarVariacaoAdmin(productId) {
    const api = client();
    const box = qs(`[data-admin-variation-create="${escapeSelector(productId)}"]`);
    if (!api || !box || variationSaveLocks.has(`new-${productId}`)) return false;
    variationSaveLocks.add(`new-${productId}`);
    setVariationAddBusy(productId, true);

    const field = (name) => qs(`[data-admin-variation-new="${name}"]`, box);
    const product = state.produtos.find((item) => item.id === productId) || {};
    let payload;
    try {
      const name = field('nome')?.value.trim() || '';
      payload = {
        produto_id: productId,
        nome: name,
        slug: safeSlug(name),
        sku: '',
        preco: parsePrice(field('preco')?.value || product.preco || 0),
        estoque:
          field('estoque')?.value === '' ? null : Math.max(0, Math.round(parsePrice(field('estoque')?.value || 0))),
        ativo: true,
        imagem: ensureSafeProductImageValue(field('imagem')?.value || product.imagem || ''),
        ordem: productVariations(productId).length * 10 + 10,
      };
      const file =
        qs('[data-admin-variation-new-file-camera]', box)?.files?.[0] ||
        qs('[data-admin-variation-new-file]', box)?.files?.[0] ||
        null;
      if (file) {
        payload.imagem = await resolveProductImage(file, payload.nome || product.nome || productId, {
          productId,
          recordId: productId,
          context: 'nova-variacao',
          feedbackTarget: '[data-admin-variation-new-image-feedback]',
        });
      }
      if (!payload.nome) throw new Error('Informe o nome da variacao.');
    } catch (error) {
      variationSaveLocks.delete(`new-${productId}`);
      setVariationAddBusy(productId, false);
      showToast(friendlyDbError(error, error.message || 'Nao consegui preparar a variacao.'), 'error');
      return false;
    }

    const { data, error } = await api.from('produto_variacoes').insert(payload).select('id, imagem').maybeSingle();
    variationSaveLocks.delete(`new-${productId}`);
    setVariationAddBusy(productId, false);

    if (error) {
      showToast(
        friendlyDbError(
          error,
          payload.imagem
            ? 'Imagem enviada, mas nao foi possivel salvar a URL da nova variacao.'
            : 'Nao consegui adicionar a variacao.',
        ),
        'error',
      );
      return false;
    }

    await logAdminAction('variacao_criada', 'produto_variacao', data?.id || payload.nome, {
      produto_id: productId,
      nome: payload.nome,
    });
    showToast('Variacao adicionada.', 'success');
    await refreshProductEditor(productId);
    return true;
  }

  function setProductSaveBusy(productId, busy) {
    qsa(`[data-admin-product-save="${escapeSelector(productId)}"]`).forEach((button) => {
      button.disabled = busy;
      button.classList.toggle('is-loading', busy);
    });
  }

  function unlockProductSave(productId) {
    productSaveLocks.delete(productId);
    setProductSaveBusy(productId, false);
  }

  async function salvarEdicaoProduto(productId, override = null) {
    const api = client();
    if (!api || !productId) return false;
    if (productSaveLocks.has(productId)) return false;
    productSaveLocks.add(productId);
    setProductSaveBusy(productId, true);

    const previousProduct = state.produtos.find((product) => product.id === productId) || {};
    let payload;
    try {
      payload = override || adminProductPayloadFromCard(productId);
    } catch (error) {
      unlockProductSave(productId);
      showToast(friendlyDbError(error, error.message || 'Nao consegui preparar o produto.'), 'error');
      return false;
    }

    let uploadedImage = false;
    if (!override) {
      const file =
        qs(`[data-admin-product-image-file-camera="${escapeSelector(productId)}"]`)?.files?.[0] ||
        qs(`[data-admin-product-image-file="${escapeSelector(productId)}"]`)?.files?.[0] ||
        null;
      if (file) {
        try {
          showToast('Enviando nova imagem...', 'info');
          payload.imagem = await resolveProductImage(file, payload.nome || productId, { productId });
          uploadedImage = true;
        } catch (error) {
          unlockProductSave(productId);
          showToast(friendlyDbError(error, error.message || 'Nao consegui enviar a imagem.'), 'error');
          return false;
        }
      }
    }
    if (!override && !payload.nome) {
      unlockProductSave(productId);
      showToast('Informe o nome do produto.', 'error');
      return false;
    }
    if (payload.oferta_ativa && (!payload.preco_promocional || payload.preco_promocional <= 0)) {
      unlockProductSave(productId);
      showToast('Informe o preco promocional para ativar a oferta.', 'error');
      return false;
    }

    let data;
    let error;
    try {
      if (uploadedImage) {
        const imageInput = productCardField(productId, 'imagem');
        if (imageInput) imageInput.value = payload.imagem || '';
      }

      ({ data, error } = await api
        .from('produtos')
        .update(payload)
        .eq('id', productId)
        .select('id, imagem')
        .maybeSingle());

    if (error || !data) {
      const rpc = await rpcAtualizarProduto(productId, payload);
      data = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      error = rpc.error;
    }

    if (error && isMissingSchemaError(error, ['oferta', 'promocional', 'estoque_minimo', 'destaque'])) {
      productsExtendedReady = false;
      setDatabaseAlert(
        'Produto salvo apenas com campos básicos. Execute supabase/reparar-painel-admin.sql para salvar oferta e estoque completo.',
      );
      const basePayload = {
        nome: payload.nome,
        preco: payload.preco,
        categoria: payload.categoria,
        imagem: payload.imagem,
        descricao: payload.descricao,
        ativo: payload.ativo,
      };
      if (payload.estoque !== undefined) basePayload.estoque = payload.estoque;
      const fallback = await api.from('produtos').update(basePayload).eq('id', productId).select('id, imagem').maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
    } catch (requestError) {
      unlockProductSave(productId);
      showToast(
        friendlyDbError(
          requestError,
          uploadedImage ? 'Imagem enviada, mas nao foi possivel salvar a URL no produto.' : 'Nao consegui alterar o produto.',
        ),
        'error',
      );
      return false;
    }

    if (error || !data) {
      unlockProductSave(productId);
      showToast(
        friendlyDbError(
          error,
          uploadedImage ? 'Imagem enviada, mas nao foi possivel salvar a URL no produto.' : 'Nao consegui alterar o produto.',
        ),
        'error',
      );
      return false;
    }

    state.produtos = state.produtos.map((product) => (product.id === productId ? { ...product, ...payload, imagem: data?.imagem ?? payload.imagem } : product));
    renderizarProdutosAdmin(state.produtos);
    await logProductActions(productId, previousProduct, payload, override ? 'produto_atalho' : 'produto_atualizado');
    if (uploadedImage) setAdminImageFeedback('Imagem atualizada.', productId);
    showToast('Produto atualizado.', 'success');
    await carregarProdutosAdmin();
    unlockProductSave(productId);
    return true;
  }

  async function excluirProdutoAdmin(productId) {
    const api = client();
    if (!api || !productId) return;
    const product = state.produtos.find((item) => item.id === productId);
    const name = product?.nome || 'este produto';
    if (!confirm(`Excluir ${name} da loja?`)) return;

    const { error } = await api.from('produtos').delete().eq('id', productId);

    if (error) {
      showToast(friendlyDbError(error, 'Nao consegui excluir o produto.'), 'error');
      return;
    }

    await logAdminAction('produto_excluido', 'produto', productId, { nome: name });
    showToast('Produto excluido.', 'success');
    await carregarProdutosAdmin();
  }

  function safeFileName(value = 'produto') {
    return (
      normalize(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 70) || 'produto'
    );
  }

  function imageExtension(file) {
    const fromName = text(file?.name).split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;
    if (file?.type === 'image/jpeg') return 'jpg';
    if (file?.type === 'image/png') return 'png';
    if (file?.type === 'image/webp') return 'webp';
    return 'png';
  }

  function originalImageExtension(file) {
    return text(file?.name).split('.').pop()?.toLowerCase() || '';
  }

  function isUnsupportedPhoneImage(file) {
    const extension = originalImageExtension(file);
    const type = text(file?.type).toLowerCase();
    return ['heic', 'heif'].includes(extension) || ['image/heic', 'image/heif'].includes(type);
  }

  function validateProductImageFile(file) {
    if (!file) return;
    if (isUnsupportedPhoneImage(file)) {
      throw new Error('Este formato de foto nao foi aceito. Tente tirar novamente em JPG ou escolher outra imagem.');
    }
    const extension = originalImageExtension(file);
    const acceptedByExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
    const acceptedByMime = ['image/jpeg', 'image/png', 'image/webp'].includes(text(file.type).toLowerCase());
    if (!acceptedByMime && !acceptedByExtension) {
      throw new Error('Use uma imagem JPG, PNG ou WebP.');
    }
    // When a large image is provided, it is optimized before upload.
    if (file.size > PRODUCT_IMAGE_TARGET_SIZE) {
      // No console output needed for normal optimization flow.
    }
  }

  function ensureSafeProductImageValue(value = '') {
    const image = text(value).trim();
    if (/^data:/i.test(image)) {
      throw new Error('Imagem em base64/DataURL nao pode ser salva no produto. Envie a imagem pelo Storage ou use uma URL.');
    }
    return image;
  }

  function adminImageFeedbackTargets(target = '') {
    if (!target) return [qs('#admin-product-upload-feedback')].filter(Boolean);
    if (text(target).startsWith('[')) return qsa(target);
    return qsa(`[data-admin-edit-image-feedback="${escapeSelector(target)}"]`);
  }

  function setAdminImageFeedback(message = '', target = '') {
    const targets = adminImageFeedbackTargets(target);
    targets.forEach((target) => {
      target.textContent = message;
    });
  }

  function fileDiagnostic(file) {
    if (!file) return null;
    return {
      name: file.name || '',
      type: file.type || '',
      size: file.size || 0,
      sizeMb: Number(((file.size || 0) / 1024 / 1024).toFixed(2)),
    };
  }

  function storageErrorDiagnostic(error) {
    if (!error) return null;
    return {
      name: error.name || '',
      message: error.message || '',
      code: error.code || '',
      status: error.status || error.statusCode || '',
      details: error.details || '',
      hint: error.hint || '',
    };
  }

  function safeStringify(value) {
    const seen = new WeakSet();
    try {
      return JSON.stringify(
        value,
        (key, item) => {
          if (item instanceof Error) {
            return {
              name: item.name,
              message: item.message,
              code: item.code,
              status: item.status || item.statusCode,
              details: item.details,
              hint: item.hint,
              stack: item.stack,
            };
          }
          if (item && typeof item === 'object') {
            if (seen.has(item)) return '[Circular]';
            seen.add(item);
          }
          return item;
        },
        2,
      );
    } catch (stringifyError) {
      return String(value);
    }
  }

  function uploadLogPrefix(stage = '', context = '') {
    if (stage.includes('erro') || stage.includes('falha')) return '[Storage erro]';
    if (stage.includes('upload') || stage.includes('public-url')) return '[Storage upload]';
    if (context.includes('variacao')) return '[Upload variacao]';
    return '[Upload produto]';
  }

  function logImageUploadDiagnostic(stage, details = {}) {
    const payload = {
      stage,
      bucket: PRODUCT_IMAGE_BUCKET,
      ...details,
    };
    const prefix = uploadLogPrefix(stage, details.context || '');
    const isErrorStage = /erro|falha|autenticacao-falhou|upload-falhou|admin-can-write-erro|admin-can-write-indisponivel/i.test(stage);
    if (!isErrorStage) return;
    if (console.groupCollapsed) {
      console.groupCollapsed(`${prefix} ${stage}`);
      console.error(payload);
      console.groupEnd();
      return;
    }
    console.error(prefix, payload);
  }

  function friendlyStorageUploadError(error, fallback = 'Nao consegui enviar essa imagem.') {
    const rawMessage = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''} ${error?.code || ''} ${
      error?.status || error?.statusCode || ''
    }`;
    const message = normalize(rawMessage);
    if (
      message.includes('row-level security') ||
      message.includes('rls') ||
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('not authorized') ||
      message.includes('403')
    ) {
      return 'Sem permissão no Storage para enviar imagem.';
    }
    if (message.includes('bucket')) return 'Bucket produtos não encontrado ou inacessível.';
    if (
      message.includes('invalid') ||
      message.includes('path') ||
      message.includes('key') ||
      message.includes('object name')
    ) {
      return 'Arquivo/path inválido para Storage.';
    }
    if (message.includes('mime') || message.includes('unsupported')) {
      return 'Formato de imagem nao aceito pelo Storage.';
    }
    if (message.includes('too large') || message.includes('payload') || message.includes('413')) {
      return 'Imagem preparada, mas ainda ficou grande para envio.';
    }
    return error?.message || fallback;
  }

  async function diagnoseAdminCanWrite(api, context = 'produto') {
    try {
      if (typeof api.rpc !== 'function') {
        logImageUploadDiagnostic('admin-can-write-indisponivel', {
          context,
          error: { message: 'Cliente Supabase sem api.rpc disponivel.' },
        });
        return null;
      }
      const { data, error } = await api.rpc('admin_can_write');
      if (error) {
        logImageUploadDiagnostic('admin-can-write-erro', {
          context,
          error: storageErrorDiagnostic(error),
        });
        console.error('[Upload produto] admin_can_write erro', error?.message, error);
        return null;
      }
      logImageUploadDiagnostic('admin-can-write', {
        context,
        allowed: data === true,
        rawResult: data,
      });
      return data === true;
    } catch (error) {
      logImageUploadDiagnostic('admin-can-write-erro', {
        context,
        error: storageErrorDiagnostic(error),
      });
      console.error('[Upload produto] admin_can_write erro', error?.message, error);
      return null;
    }
  }

  function imageSourceSize(source) {
    return {
      width: source.width || source.naturalWidth || 0,
      height: source.height || source.naturalHeight || 0,
    };
  }

  async function loadImageForCompression(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (error) {
        console.info('[Admin] createImageBitmap nao aceitou a imagem, usando fallback.', error);
      }
    }

    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Nao consegui ler essa foto. Tente tirar novamente ou escolher outra imagem.'));
      };
      image.src = url;
    });
  }

  function drawImageToCanvas(source, maxSide) {
    const { width: sourceWidth, height: sourceHeight } = imageSourceSize(source);
    if (!sourceWidth || !sourceHeight) throw new Error('Nao consegui identificar o tamanho da imagem.');
    const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Seu navegador nao conseguiu preparar essa imagem.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  function canvasBlob(canvas, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, PRODUCT_IMAGE_OUTPUT_TYPE, quality));
  }

  function randomUploadToken() {
    const bytes = new Uint32Array(2);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (value) => value.toString(36)).join('-');
    }
    return Math.random().toString(36).slice(2, 12);
  }

  function buildProductImagePath(diagnostic = {}) {
    const recordId = safeFileName(diagnostic.recordId || diagnostic.productId || 'novo');
    const contextFolder = diagnostic.context?.includes('variacao') ? 'variacao' : 'produto';
    const path = `${contextFolder}/${recordId || 'novo'}/${Date.now()}-${randomUploadToken()}.${PRODUCT_IMAGE_OUTPUT_EXTENSION}`;
    if (
      !path ||
      path.includes('undefined') ||
      path.includes('null') ||
      path.includes('//') ||
      !/^[a-z0-9-]+\/[a-z0-9-]+\/[0-9]+-[a-z0-9-]+(?:-[a-z0-9-]+)?\.jpg$/.test(path)
    ) {
      throw new Error(`Path invalido para upload: ${path || '(vazio)'}`);
    }
    return path;
  }

  async function validateOptimizedProductImage(file) {
    if (!file) throw new Error('Arquivo final de imagem ausente.');
    if (!(file instanceof Blob)) throw new Error('Arquivo final nao e Blob/File valido.');
    if (!file.size || file.size <= 0) throw new Error('Arquivo final vazio.');
    if (file.type !== PRODUCT_IMAGE_OUTPUT_TYPE) {
      throw new Error(`ContentType invalido: ${file.type || '(vazio)'}. Esperado image/jpeg.`);
    }
    if (file.size > PRODUCT_IMAGE_TARGET_SIZE * 1.35) {
      throw new Error(`Imagem final grande demais (${fileDiagnostic(file).sizeMb} MB).`);
    }
    let source = null;
    try {
      source = await loadImageForCompression(file);
      const dimensions = imageSourceSize(source);
      if (!dimensions.width || !dimensions.height) throw new Error('Imagem final sem largura/altura validas.');
      return dimensions;
    } finally {
      source?.close?.();
    }
  }

  async function compressProductImage(file) {
    if (!file) return file;
    validateProductImageFile(file);
    let source = null;

    try {
      source = await loadImageForCompression(file);
      const qualitySteps = [IMAGE_COMPRESS_QUALITY, 0.78, 0.7, 0.62];
      const dimensionSteps = [PRODUCT_IMAGE_MAX_SIDE, 1600, 1400, 1200, PRODUCT_IMAGE_MIN_SIDE];
      let bestBlob = null;

      for (const maxSide of dimensionSteps) {
        const canvas = drawImageToCanvas(source, maxSide);
        for (const quality of qualitySteps) {
          const blob = await canvasBlob(canvas, quality);
          if (!blob) continue;
          if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
          if (blob.size <= PRODUCT_IMAGE_TARGET_SIZE) {
            const baseName = safeFileName(file.name.replace(/\.[^.]+$/, '') || 'produto');
            return new File([blob], `${baseName}.${PRODUCT_IMAGE_OUTPUT_EXTENSION}`, {
              type: PRODUCT_IMAGE_OUTPUT_TYPE,
              lastModified: Date.now(),
            });
          }
        }
      }

      if (!bestBlob) throw new Error('Nao consegui comprimir essa imagem.');
      if (bestBlob.size > PRODUCT_IMAGE_TARGET_SIZE * 1.35) {
        throw new Error('A foto ficou grande mesmo apos reducao. Tente tirar a foto mais perto do produto ou escolher outra imagem.');
      }
      const baseName = safeFileName(file.name.replace(/\.[^.]+$/, '') || 'produto');
      return new File([bestBlob], `${baseName}.${PRODUCT_IMAGE_OUTPUT_EXTENSION}`, {
        type: PRODUCT_IMAGE_OUTPUT_TYPE,
        lastModified: Date.now(),
      });
    } catch (error) {
      console.warn('[Admin] Compressao de imagem falhou.', error);
      throw new Error(error.message || 'Nao consegui preparar essa imagem. Tente outra foto.');
    } finally {
      source?.close?.();
    }
  }

  async function resolveProductImage(file, productNameOverride = '', options = {}) {
    if (!file) return '';
    const feedbackTarget = options.feedbackTarget || options.productId || '';
    const context = options.context || 'produto';
    const originalFile = fileDiagnostic(file);
    validateProductImageFile(file);
    try {
      logImageUploadDiagnostic('leitura', { context, originalFile });
      setAdminImageFeedback('Preparando imagem...', feedbackTarget);
      setAdminImageFeedback('Comprimindo imagem...', feedbackTarget);
      const preparedFile = await compressProductImage(file);
      logImageUploadDiagnostic('compressao', {
        context,
        originalFile,
        finalFile: fileDiagnostic(preparedFile),
      });
      setAdminImageFeedback('Enviando imagem...', feedbackTarget);
      validateProductImageFile(preparedFile);
      return await uploadImagemProduto(preparedFile, productNameOverride, {
        ...options,
        context,
        originalFile,
      });
    } catch (error) {
      logImageUploadDiagnostic('falha', {
        context,
        originalFile,
        error: storageErrorDiagnostic(error),
      });
      throw new Error(friendlyStorageUploadError(error, 'Imagem preparada, mas upload falhou.'));
    }
  }

  async function uploadImagemProduto(file, productNameOverride = '', diagnostic = {}) {
    const api = client();
    if (!api?.storage) throw new Error('Storage do Supabase indisponivel.');
    if (!file) return '';
    validateProductImageFile(file);
    const dimensions = await validateOptimizedProductImage(file);

    try {
      const { data, error } = await api.auth.getUser();
      if (error) throw error;
      if (!data?.user) throw new Error('Usuario admin nao autenticado para enviar imagem.');
      logImageUploadDiagnostic('autenticacao', {
        context: diagnostic.context || 'produto',
        userId: data.user.id,
        email: data.user.email || '',
      });
    } catch (error) {
      logImageUploadDiagnostic('autenticacao-falhou', {
        context: diagnostic.context || 'produto',
        error: storageErrorDiagnostic(error),
      });
      throw new Error('Usuario admin nao autenticado para enviar imagem.');
    }

    const canWrite = await diagnoseAdminCanWrite(api, diagnostic.context || 'produto');
    if (canWrite === false) {
      throw new Error('Seu usuário está logado, mas não tem permissão administrativa para enviar imagens.');
    }

    const path = buildProductImagePath(diagnostic);
    const fullObjectPath = `${PRODUCT_IMAGE_BUCKET}/${path}`;
    const uploadFile = new File([file], path.split('/').pop(), {
      type: PRODUCT_IMAGE_OUTPUT_TYPE,
      lastModified: Date.now(),
    });

    logImageUploadDiagnostic('upload', {
      context: diagnostic.context || 'produto',
      originalFile: diagnostic.originalFile || null,
      finalFile: fileDiagnostic(uploadFile),
      dimensions,
      bucket: PRODUCT_IMAGE_BUCKET,
      path,
      fullObjectPath,
      contentType: PRODUCT_IMAGE_OUTPUT_TYPE,
      finalSize: uploadFile.size,
      upsert: false,
    });

    const { data: uploadData, error } = await api.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, uploadFile, {
      cacheControl: '3600',
      contentType: PRODUCT_IMAGE_OUTPUT_TYPE,
      upsert: false,
    });

    if (error) {
      const detail = {
        context: diagnostic.context || 'produto',
        bucket: PRODUCT_IMAGE_BUCKET,
        path,
        fullObjectPath,
        request: {
          bucket: PRODUCT_IMAGE_BUCKET,
          path,
          fullObjectPath,
          contentType: PRODUCT_IMAGE_OUTPUT_TYPE,
          cacheControl: '3600',
          upsert: false,
          size: uploadFile.size,
          dimensions,
        },
        error: storageErrorDiagnostic(error),
        rawError: error,
      };
      logImageUploadDiagnostic('upload-falhou', detail);
      console.error('[Storage erro] Supabase retornou erro no upload.', detail);
      console.error('[Storage erro message]', error?.message);
      console.error('[Storage erro status]', error?.status || error?.statusCode);
      console.error('[Storage erro code]', error?.code);
      console.error('[Storage erro details]', error?.details);
      console.error('[Storage erro hint]', error?.hint);
      console.error('[Storage erro json]', safeStringify(error));
      throw error;
    }
    logImageUploadDiagnostic('upload-ok', {
      context: diagnostic.context || 'produto',
      path,
      uploadData,
    });
    const { data } = api.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Upload concluido, mas nao consegui gerar URL publica.');
    logImageUploadDiagnostic('public-url', {
      context: diagnostic.context || 'produto',
      path,
      publicUrl: data.publicUrl,
    });
    return data.publicUrl;
  }

  function renderCreateProductImagePreview(file) {
    const preview = qs('#admin-product-image-preview');
    if (!preview) return;
    if (!file) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('');
      return;
    }
    try {
      validateProductImageFile(file);
      const url = URL.createObjectURL(file);
      setAdminImageFeedback('Preparando imagem...');
      preview.classList.remove('hidden');
      preview.innerHTML = `
        <img src="${escapeHTML(url)}" alt="Previa da imagem do produto">
        <span>Imagem escolhida. Ela sera reduzida automaticamente antes do envio.</span>
      `;
    } catch (error) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('');
      showToast(error.message || 'Essa imagem nao pode ser usada. Tente outra foto.', 'error');
    }
  }

  function renderEditProductImagePreview(productId, file) {
    const preview = qs(`[data-admin-edit-image-preview="${escapeSelector(productId)}"]`);
    if (!preview) return;
    if (!file) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('', productId);
      return;
    }
    try {
      validateProductImageFile(file);
      const url = URL.createObjectURL(file);
      setAdminImageFeedback('Preparando imagem...', productId);
      preview.classList.remove('hidden');
      preview.innerHTML = `
        <img src="${escapeHTML(url)}" alt="Previa da nova imagem do produto">
        <span>Nova imagem escolhida. Ela sera reduzida automaticamente ao salvar.</span>
      `;
    } catch (error) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('', productId);
      showToast(error.message || 'Essa imagem nao pode ser usada. Tente outra foto.', 'error');
    }
  }

  function renderVariationImagePreview(variationId, file) {
    const selector = `[data-admin-variation-image-feedback="${escapeSelector(variationId)}"]`;
    const preview = qs(`[data-admin-variation-image-preview="${escapeSelector(variationId)}"]`);
    if (!preview) return;
    if (!file) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('', selector);
      return;
    }
    try {
      validateProductImageFile(file);
      const url = URL.createObjectURL(file);
      setAdminImageFeedback('Preparando imagem...', selector);
      preview.classList.remove('hidden');
      preview.innerHTML = `
        <img src="${escapeHTML(url)}" alt="Previa da imagem da variacao">
        <span>Imagem escolhida. Ela sera reduzida automaticamente ao salvar.</span>
      `;
    } catch (error) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('', selector);
      showToast(error.message || 'Essa imagem nao pode ser usada. Tente outra foto.', 'error');
    }
  }

  function renderNewVariationImagePreview(file) {
    const selector = '[data-admin-variation-new-image-feedback]';
    const preview = qs('[data-admin-variation-new-image-preview]');
    if (!preview) return;
    if (!file) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('', selector);
      return;
    }
    try {
      validateProductImageFile(file);
      const url = URL.createObjectURL(file);
      setAdminImageFeedback('Preparando imagem...', selector);
      preview.classList.remove('hidden');
      preview.innerHTML = `
        <img src="${escapeHTML(url)}" alt="Previa da imagem da nova variacao">
        <span>Imagem escolhida. Ela sera reduzida automaticamente ao salvar.</span>
      `;
    } catch (error) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
      setAdminImageFeedback('', selector);
      showToast(error.message || 'Essa imagem nao pode ser usada. Tente outra foto.', 'error');
    }
  }

  function selectedCreateProductImageFile() {
    return qs('#prod-foto-camera')?.files?.[0] || qs('#prod-foto')?.files?.[0] || null;
  }

  async function salvarProdutoAdmin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = qs('button[type="submit"]', form);
    const feedback = qs('#admin-product-upload-feedback');
    const file = selectedCreateProductImageFile();
    const api = client();

    if (!api) {
      showToast('Supabase indisponível para salvar produto.', 'error');
      return;
    }

    if (productCreateSaving) return;
    productCreateSaving = true;

    if (submit) {
      submit.disabled = true;
      submit.classList.add('is-loading');
    }

    try {
      if (feedback) feedback.textContent = file ? 'Enviando imagem...' : 'Salvando produto...';
      const productName = qs('#prod-nome')?.value.trim() || '';
      const publicUrl = file ? await resolveProductImage(file, productName || file.name || 'produto') : '';
      const estoqueValue = qs('#prod-estoque')?.value;
      const offerActive = qs('#prod-oferta-ativa')?.value === 'true';
      const payload = {
        nome: productName,
        preco: parsePrice(qs('#prod-preco')?.value || 0),
        categoria: qs('#prod-categoria')?.value || 'Produtos',
        descricao: qs('#prod-desc')?.value.trim() || '',
        imagem: publicUrl,
        ativo: true,
        destaque: qs('#prod-destaque')?.value === 'true' || offerActive,
        oferta_ativa: offerActive,
        preco_promocional: offerActive ? parsePrice(qs('#prod-preco-promocional')?.value || 0) : null,
        oferta_inicio: offerActive ? isoFromLocal(qs('#prod-oferta-inicio')?.value) || new Date().toISOString() : null,
        oferta_fim: offerActive ? isoFromLocal(qs('#prod-oferta-fim')?.value) : null,
        estoque_minimo: Math.max(0, Math.round(parsePrice(qs('#prod-estoque-minimo')?.value || 3))),
      };
      if (estoqueValue !== '') payload.estoque = Math.max(0, Math.round(parsePrice(estoqueValue || 0)));

      if (!payload.nome || payload.preco < 0 || !payload.categoria) {
        throw new Error('Preencha nome, preço e categoria.');
      }

      if (offerActive && (!payload.preco_promocional || payload.preco_promocional <= 0)) {
        throw new Error('Informe o preco promocional para ativar a oferta.');
      }

      let { data: insertedProduct, error } = await api.from('produtos').insert(payload).select('id').maybeSingle();
      if (
        error &&
        normalize(error.message || error.details || '').match(
          /oferta|promocional|estoque_minimo|destaque|tipo|kit_itens/,
        )
      ) {
        const basePayload = {
          nome: payload.nome,
          preco: payload.preco,
          categoria: payload.categoria,
          descricao: payload.descricao,
          imagem: payload.imagem,
          ativo: payload.ativo,
        };
        if (estoqueValue !== '') basePayload.estoque = payload.estoque;
        const fallback = await api.from('produtos').insert(basePayload).select('id').maybeSingle();
        insertedProduct = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;

      form.reset();
      renderCreateProductImagePreview(null);
      if (feedback) {
        feedback.textContent = file
          ? 'Imagem enviada com sucesso. Produto salvo com sucesso.'
          : 'Produto salvo com sucesso.';
      }
      await carregarProdutosAdmin();
      await logAdminAction('produto_criado', 'produto', insertedProduct?.id || payload.nome, { nome: payload.nome });
      showToast('Produto salvo com sucesso.', 'success');
    } catch (error) {
      console.warn('[Admin] Erro ao salvar produto.', error);
      if (feedback) feedback.textContent = 'Nao consegui salvar o produto.';
      showToast(friendlyDbError(error, error.message || 'Nao consegui salvar o produto.'), 'error');
    } finally {
      productCreateSaving = false;
      if (submit) {
        submit.disabled = false;
        submit.classList.remove('is-loading');
      }
    }
  }

  function renderMetric(containerId, rows) {
    const container = qs(containerId);
    if (!container) return;
    container.innerHTML = rows
      .map(
        (row) => `
      <article class="admin-metric-card">
        <span>${escapeHTML(row.label)}</span>
        <strong>${escapeHTML(row.value)}</strong>
      </article>
    `,
      )
      .join('');
  }

  function financePeriodRange(period = '7d') {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === 'today') return { start, end: now };
    if (period === 'yesterday') {
      const end = new Date(start);
      start.setDate(start.getDate() - 1);
      return { start, end };
    }
    if (period === 'month') {
      start.setDate(1);
      return { start, end: now };
    }
    if (period === 'all') return { start: null, end: null };
    start.setDate(start.getDate() - 6);
    return { start, end: now };
  }

  function orderInFinancePeriod(order, period) {
    const { start, end } = financePeriodRange(period);
    if (!start && !end) return true;
    const value = new Date(order.created_at || 0).getTime();
    if (!Number.isFinite(value)) return false;
    if (start && value < start.getTime()) return false;
    if (end && value > end.getTime()) return false;
    return true;
  }

  function aggregateOrderItems(pedidos = []) {
    const map = new Map();
    pedidos.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = text(item.nome || 'Produto');
        const variation = text(item.variacao || '');
        const key = `${normalize(name)}|${normalize(variation)}`;
        const quantity = Math.max(1, Number(item.quantidade || 1));
        const total = Number(item.total || Number(item.preco_unitario || 0) * quantity || 0);
        const current = map.get(key) || {
          produto: name,
          variacao: variation,
          quantidade: 0,
          valor: 0,
          pedidos: new Set(),
          ultima: '',
          categoria: '',
        };
        current.quantidade += quantity;
        current.valor += total;
        current.pedidos.add(order.id);
        current.ultima = !current.ultima || new Date(order.created_at) > new Date(current.ultima) ? order.created_at : current.ultima;
        map.set(key, current);
      });
    });
    return [...map.values()].sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor);
  }

  function financeTableHTML(rows = []) {
    if (!rows.length) return '<p class="admin-empty-state">Nenhuma venda com itens carregados neste periodo.</p>';
    return `
      <div class="admin-finance-table-wrap">
        <table class="admin-finance-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Opcao</th>
              <th>Quantidade</th>
              <th>Total vendido</th>
              <th>Pedidos</th>
              <th>Ultima venda</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .slice(0, 12)
              .map(
                (row) => `
              <tr>
                <td>${escapeHTML(row.produto)}</td>
                <td>${escapeHTML(row.variacao || '-')}</td>
                <td>${escapeHTML(row.quantidade)}</td>
                <td>${formatMoney(row.valor)}</td>
                <td>${row.pedidos.size}</td>
                <td>${escapeHTML(formatDateTime(row.ultima))}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderFinanceiro() {
    const period = qs('#admin-finance-period')?.value || '7d';
    const pedidos = state.pedidos.filter((order) => orderInFinancePeriod(order, period));
    const total = pedidos.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const pagos = pedidos.filter((order) => normalize(order.pagamento_status) === 'pago');
    const cancelados = pedidos.filter((order) => normalize(order.status).includes('cancel') || normalize(order.pagamento_status) === 'cancelado');
    const ticket = pedidos.length ? total / pedidos.length : 0;
    const itemRows = aggregateOrderItems(pedidos);
    renderMetric('#admin-finance-metrics', [
      { label: 'Pedidos', value: String(pedidos.length) },
      { label: 'Total vendido', value: formatMoney(total) },
      { label: 'Ticket medio', value: formatMoney(ticket) },
      { label: 'Pagos', value: String(pagos.length) },
      { label: 'Pendentes', value: String(pedidos.length - pagos.length - cancelados.length) },
      { label: 'Cancelados', value: String(cancelados.length) },
    ]);
    const details = qs('#admin-finance-details');
    if (details) {
      const top = itemRows[0];
      details.innerHTML = `
        <article class="admin-finance-panel">
          <h2>Produtos mais vendidos</h2>
          ${financeTableHTML(itemRows)}
        </article>
        <article class="admin-finance-panel">
          <h2>Resumo operacional</h2>
          <dl class="admin-finance-summary">
            <div><dt>Produto que mais saiu</dt><dd>${escapeHTML(top ? `${top.produto}${top.variacao ? ` - ${top.variacao}` : ''}` : 'Sem dados')}</dd></div>
            <div><dt>Itens vendidos</dt><dd>${itemRows.reduce((sum, item) => sum + item.quantidade, 0)}</dd></div>
            <div><dt>Entregues</dt><dd>${pedidos.filter((order) => order.statusUi === 'entregue').length}</dd></div>
            <div><dt>Em preparo</dt><dd>${pedidos.filter((order) => order.statusUi === 'preparo').length}</dd></div>
          </dl>
        </article>
      `;
    }
  }

  function renderEntregas() {
    const pedidos = state.pedidos;
    renderMetric('#admin-delivery-metrics', [
      { label: 'Pendentes', value: String(pedidos.filter((order) => order.statusUi === 'pendente').length) },
      { label: 'Em preparo', value: String(pedidos.filter((order) => order.statusUi === 'preparo').length) },
      { label: 'Em rota', value: String(pedidos.filter((order) => order.statusUi === 'entrega').length) },
    ]);
  }

  function developerCardHTML(title, icon, rows) {
    return `
      <article class="admin-developer-card">
        <h2><i class="fa-solid fa-${escapeHTML(icon)}"></i> ${escapeHTML(title)}</h2>
        <dl>
          ${rows
            .map(
              (row) => `
            <div>
              <dt>${escapeHTML(row.label)}</dt>
              <dd>${escapeHTML(row.value)}</dd>
            </div>
          `,
            )
            .join('')}
        </dl>
      </article>
    `;
  }

  async function loadAdminAuditLogs() {
    const api = client();
    if (!api) return { ready: false, logs: [] };
    const { data, error } = await api
      .from('admin_audit_logs')
      .select('created_at, actor_email, action, entity_type, entity_id, metadata')
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      console.warn('[Admin Audit] Nao consegui ler auditoria.', error);
      return { ready: false, logs: [] };
    }

    state.auditLogs = data || [];
    return { ready: true, logs: state.auditLogs };
  }

  function auditRows(audit = { ready: false, logs: [] }) {
    if (!audit.ready) {
      return [
        { label: 'Status', value: 'Execute supabase/reparar-painel-admin.sql' },
        { label: 'Tabela', value: 'admin_audit_logs' },
      ];
    }
    if (!audit.logs.length) {
      return [{ label: 'Status', value: 'Nenhuma alteracao registrada ainda' }];
    }
    return audit.logs.map((log) => ({
      label: `${formatDateTime(log.created_at)} - ${log.actor_email || 'admin'}`,
      value: `${log.action} ${log.entity_type || ''} ${text(log.entity_id).slice(0, 8)}`,
    }));
  }

  async function readAssetManifestSummary() {
    if (state.developerManifest) return state.developerManifest;
    const summary = {
      status: 'Não carregado',
      total: '0',
      generated: 'Sem data',
    };

    try {
      const response = await fetch('../assets/generated/v2/manifest.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const items = Array.isArray(manifest.assets) ? manifest.assets : Object.values(manifest.assets || {});
      summary.status = 'Manifest v2 encontrado';
      summary.total = String(items.length);
      summary.generated = manifest.generated_at || manifest.updated_at || 'Sem data';
      state.developerManifest = summary;
    } catch (error) {
      console.warn('[Admin Dev] Manifest de assets não carregou.', error);
      summary.status = 'Falha ao ler manifest v2';
    }

    return summary;
  }

  async function renderDeveloperAdmin() {
    if (!isDeveloperAdmin()) return;
    const container = qs('#admin-developer-diagnostics');
    if (!container) return;

    container.innerHTML = '<p class="admin-empty-state">Carregando diagnóstico técnico...</p>';
    const manifest = await readAssetManifestSummary();
    const cacheKeys = 'caches' in window ? await caches.keys().catch(() => []) : [];
    const audit = await loadAdminAuditLogs();
    const realtimeText = qs('#admin-realtime-status')?.textContent || 'Não iniciado';
    const profile = state.profile || {};

    container.innerHTML = [
      developerCardHTML('Acesso', 'user-shield', [
        { label: 'Conta', value: profile.email || state.user?.email || 'Sem email' },
        { label: 'Cargo', value: currentAdminRole() || 'Sem cargo' },
        { label: 'Perfil', value: profile.is_admin ? 'Administrador no Supabase' : 'Fallback por email conhecido' },
      ]),
      developerCardHTML('Supabase', 'database', [
        { label: 'Cliente', value: client() ? 'Carregado' : 'Indisponível' },
        { label: 'Realtime', value: realtimeText },
        { label: 'Pedidos em memória', value: String(state.pedidos.length) },
        { label: 'Produtos em memória', value: String(state.produtos.length) },
      ]),
      developerCardHTML('Assets e PWA', 'gears', [
        { label: 'Manifest de imagens', value: manifest.status },
        { label: 'Assets mapeados', value: manifest.total },
        { label: 'Gerado em', value: manifest.generated },
        { label: 'Caches do navegador', value: cacheKeys.length ? cacheKeys.join(', ') : 'Nenhum cache listado' },
      ]),
      developerCardHTML('Esqueleto do site', 'sitemap', [
        { label: 'Paginas publicas', value: 'inicio, produtos, catalogo, pedido, perfil, pagamento' },
        { label: 'Painel admin', value: 'pedidos, produtos, entregas, financeiro, configuracoes' },
        { label: 'Arquivos principais', value: 'pages/*.html, css/style.css, js/script.js, js/admin.js' },
        { label: 'SQL operacional', value: 'supabase/reparar-painel-admin.sql' },
      ]),
      developerCardHTML('Funcoes alteraveis', 'sliders', [
        { label: 'Produtos', value: 'nome, preco, categoria, estoque, status, oferta, imagem' },
        { label: 'Pedidos', value: 'status, pagamento, confirmacao, remocao' },
        { label: 'Loja', value: 'WhatsApp, Pix e caches locais' },
        { label: 'Auditoria', value: audit.ready ? 'Ativa' : 'Aguardando SQL de reparo' },
      ]),
      developerCardHTML('Auditoria admin', 'clipboard-list', auditRows(audit)),
    ].join('');
  }

  /* === Developer Console (SQL + Logs) === */
  function renderSystemConsoleSummary() {
    const realtime = text(qs('#admin-realtime-status')?.textContent || '');
    const orders = state.pedidos || [];
    const products = state.produtos || [];
    const variations = state.variacoes || [];
    const paidCount = orders.filter((order) => normalize(order.pagamento_status) === 'pago').length;
    const pendingPayment = orders.filter((order) => normalize(order.pagamento_status) === 'pendente').length;
    const openOrders = orders.filter((order) => normalize(order.status || order.statusUi) !== 'entregue').length;
    const activeProducts = products.filter((product) => product.ativo !== false).length;
    const lastOrder = orders[0]?.created_at ? ` Último pedido: ${formatDateTime(orders[0].created_at)}.` : '';

    const statusEl = qs('#admin-system-status');
    if (statusEl) statusEl.textContent = realtime || 'Sistema carregado.';

    const ordersEl = qs('#admin-system-orders');
    if (ordersEl)
      ordersEl.textContent = orders.length
        ? `${orders.length} pedido${orders.length === 1 ? '' : 's'} carregado${orders.length === 1 ? '' : 's'}, ${openOrders} em andamento.${lastOrder}`
        : 'Nenhum pedido carregado ainda.';

    const paymentsEl = qs('#admin-system-payments');
    if (paymentsEl)
      paymentsEl.textContent = orders.length
        ? `${paidCount} pago${paidCount === 1 ? '' : 's'} e ${pendingPayment} pendente${pendingPayment === 1 ? '' : 's'}.`
        : 'Aguardando dados de pagamento.';

    const productsEl = qs('#admin-system-products');
    if (productsEl)
      productsEl.textContent = products.length
        ? `${activeProducts} produto${activeProducts === 1 ? '' : 's'} ativo${activeProducts === 1 ? '' : 's'} de ${products.length} cadastrados, ${variations.length} variacao${variations.length === 1 ? '' : 'es'}.`
        : 'Aguardando catálogo.';
  }

  async function carregarLogsConsole() {
    const api = client();
    const container = qs('#admin-console-logs');
    if (!api || !container) return;
    container.innerHTML = '<p class="admin-empty-state">Carregando logs...</p>';
    try {
      const { data, error } = await api
        .from('admin_audit_logs')
        .select('id, created_at, action, actor_email, entity_type, entity_id, metadata')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        console.warn('[Admin] Falha ao carregar logs', error);
        container.innerHTML = `<p class="admin-empty-state">${escapeHTML(friendlyDbError(error, 'Falha ao carregar logs.'))}</p>`;
        return;
      }
      state.auditLogs = data || [];
      if (!state.auditLogs.length) {
        container.innerHTML = '<p class="admin-empty-state">Nenhum log encontrado.</p>';
      } else {
        container.innerHTML = state.auditLogs.map(renderConsoleLogEntry).join('');
      }
      subscribeAdminAuditRealtime();
    } catch (err) {
      console.warn('[Admin] Erro ao carregar logs', err);
      container.innerHTML = '<p class="admin-empty-state">Erro ao carregar logs.</p>';
    }
  }

  function renderConsoleLogEntry(log = {}) {
    const badgeClass = String(log.action || '')
      .toLowerCase()
      .includes('error')
      ? 'error'
      : String(log.action || '')
            .toLowerCase()
            .includes('success')
        ? 'success'
        : 'info';
    const metaDate = formatDateTime(log.created_at);
    const actor = escapeHTML(log.actor_email || log.actor || 'system');
    const action = escapeHTML(log.action || 'log');
    const entity = escapeHTML(`${text(log.entity_type || '')} ${text(log.entity_id || '')}`.trim());
    const payload = escapeHTML(text(JSON.stringify(log.metadata || {})));
    return `
      <div class="console-log-entry" data-log-id="${escapeHTML(log.id || '')}">
        <div class="console-log-body">
          <div class="console-log-head"><strong>${action}</strong><span class="console-log-meta">${metaDate} • ${actor}</span></div>
          <div class="console-log-payload">${payload}</div>
        </div>
        <div>
          <span class="console-log-badge ${badgeClass}">${escapeHTML(action)}</span>
        </div>
      </div>
    `;
  }

  function subscribeAdminAuditRealtime() {
    const api = client();
    if (!api?.channel) return;
    if (state.realtimeConsoleChannel) return;
    try {
      state.realtimeConsoleChannel = api
        .channel('monte-sinai-admin-audit-logs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_audit_logs' }, (payload) => {
          const log = payload?.new;
          if (!log) return;
          state.auditLogs = [log].concat(state.auditLogs || []);
          const container = qs('#admin-console-logs');
          if (container) container.insertAdjacentHTML('afterbegin', renderConsoleLogEntry(log));
        })
        .subscribe((status) => {
          // status is 'SUBSCRIBED' or other lifecycle events
          const realtime = qs('#admin-realtime-status');
          if (realtime) realtime.textContent = status === 'SUBSCRIBED' ? 'Realtime ativo' : 'Reconectando...';
          renderSystemConsoleSummary();
        });
    } catch (err) {
      console.warn('[Admin] Falha ao inscrever realtime de logs', err);
    }
  }

  async function copyAdminSql(sql) {
    const textToCopy = text(sql).trim();
    if (!textToCopy) {
      showToast('Cole o SQL antes de copiar.', 'error');
      return false;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('SQL copiado. Execute manualmente no Supabase.', 'success');
      await logAdminAction('sql_copiado', 'console', state.user?.id, { chars: textToCopy.length });
      return true;
    } catch (err) {
      console.warn('[Admin] Nao consegui copiar SQL.', err);
      showToast('Nao consegui copiar automaticamente. Selecione o texto e copie manualmente.', 'error');
      return false;
    }
  }

  function renderDevConsole() {
    if (!isDeveloperAdmin()) return;
    renderSystemConsoleSummary();
    carregarLogsConsole();
  }

  /* === Gerenciar Equipe (profiles) === */
  async function carregarEquipeAdmin() {
    const api = client();
    const container = qs('#admin-team-list');
    if (!api || !container) return;
    if (!canManageTeam()) {
      container.innerHTML =
        container.tagName && container.tagName.toLowerCase() === 'tbody'
          ? '<tr><td colspan="4" class="admin-empty-state">Acesso restrito ao desenvolvedor e proprietários.</td></tr>'
          : '<p class="admin-empty-state">Acesso restrito ao desenvolvedor e proprietários.</p>';
      return;
    }
    container.innerHTML = '<p class="admin-empty-state">Carregando lista de usuários...</p>';

    const { data: profiles, error: profilesErr } = await api
      .from('profiles')
      .select('id, email, nome, is_admin')
      .order('email', { ascending: true });
    if (profilesErr) {
      console.warn('[Admin] Falha ao carregar profiles', profilesErr);
      container.innerHTML = `<p class="admin-empty-state">${escapeHTML(friendlyDbError(profilesErr, 'Falha ao carregar perfis.'))}</p>`;
      return;
    }

    const rows = profiles.map((pr) => ({
      id: pr.id,
      email: pr.email,
      nome: pr.nome,
      is_admin: pr.is_admin,
      role: getFallbackRoleForEmail(pr.email) || (pr.is_admin ? 'staff' : 'customer'),
    }));

    const currentRole = currentAdminRole();
    const isDeveloper = currentRole === 'developer';
    const isOwner = currentRole === 'owner';
    const canEditRoles = ['developer', 'owner'].includes(currentRole);
    const rolesOptions = [
      { value: 'developer', label: 'Desenvolvedor / Presidente' },
      { value: 'owner', label: 'Proprietário' },
      { value: 'staff', label: 'Equipe' },
      { value: 'customer', label: 'Cliente' },
    ];

    const html = rows
      .map((row) => {
        const userRole = row.role || (row.is_admin ? 'staff' : 'customer');

        let selectDisabled = !canEditRoles;
        // Do not allow non-developers to change a developer's role
        if (userRole === 'developer' && !isDeveloper) selectDisabled = true;

        const optionsHtml = rolesOptions
          .map((opt) => {
            let disableOpt = '';
            // Only developer can assign another developer
            if (opt.value === 'developer' && !isDeveloper) disableOpt = 'disabled';
            // Owner cannot create developers
            if (isOwner && opt.value === 'developer') disableOpt = 'disabled';
            return `<option value="${escapeHTML(opt.value)}" ${opt.value === userRole ? 'selected' : ''} ${disableOpt}>${escapeHTML(opt.label)}</option>`;
          })
          .join('');

        const active = userRole !== 'customer';
        const statusHtml = `<span class="team-badge ${active ? 'is-active' : 'is-inactive'}"><span class="team-badge-dot" aria-hidden="true"></span>${active ? 'Ativo' : 'Inativo'}</span>`;

        return `
          <tr data-team-row="${escapeHTML(row.id)}">
            <td class="team-user">
              <div class="team-user-name">${escapeHTML(row.nome || row.email || 'Usuário')}</div>
              <div class="team-user-email">${escapeHTML(row.email || '')}</div>
            </td>
            <td class="team-role">
              <div class="select-wrap ${selectDisabled ? 'disabled' : ''}">
                <select class="team-role-select" data-admin-team-role="${escapeHTML(row.id)}" ${selectDisabled ? 'disabled' : ''} aria-label="Selecionar cargo">
                  ${optionsHtml}
                </select>
              </div>
            </td>
            <td class="team-status">${statusHtml}</td>
            <td class="team-actions">
              <button class="btn btn-ghost team-action-btn" type="button" data-admin-team-save="${escapeHTML(row.id)}" ${selectDisabled ? 'disabled' : ''} title="Salvar alterações">
                <i class="fa-solid fa-floppy-disk"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    // Se o container for um <tbody>, inserir tr corretamente; senão, substituir diretamente
    if (container.tagName && container.tagName.toLowerCase() === 'tbody') {
      container.innerHTML =
        html || '<tr><td colspan="4" class="admin-empty-state">Nenhum usuário encontrado.</td></tr>';
    } else {
      container.innerHTML = html || '<p class="admin-empty-state">Nenhum usuário encontrado.</p>';
    }
  }

  async function atualizarCargoUsuario(userId, newRole) {
    const api = client();
    if (!api || !userId) return false;
    try {
      // Prefer RPC admin_set_user_role (secure, server-side).
      if (api.rpc) {
        const { data, error } = await api.rpc('admin_set_user_role', { p_user_id: userId, p_role: newRole });
        if (error) {
          console.warn('[Admin] RPC admin_set_user_role erro', error);
          showToast(friendlyDbError(error, 'Falha ao alterar cargo via RPC.'), 'error');
          return false;
        }
        showToast('Cargo atualizado.', 'success');
        await carregarEquipeAdmin();
        // RPC já deve registrar auditoria server-side
        try {
          await logAdminAction('role_updated_rpc', 'user', userId, { role: newRole });
        } catch (_) {}
        return true;
      }

      showToast('RPC admin_set_user_role indisponível. Execute a migração de permissões no Supabase.', 'error');
      return false;
    } catch (err) {
      console.warn('[Admin] Falha ao atualizar cargo', err);
      showToast('Erro ao atualizar cargo.', 'error');
      return false;
    }
  }

  async function logoutAdmin() {
    const api = client();
    await api?.auth?.signOut();
    window.location.href = '../index.html';
  }

  function bindAdminEvents() {
    qsa('[data-admin-tab]').forEach((button) => {
      button.addEventListener('click', () => renderAdminTab(button.dataset.adminTab || 'pedidos'));
    });

    qs('[data-admin-refresh-orders]')?.addEventListener('click', () => carregarPedidosAdmin());
    qs('[data-admin-refresh-products]')?.addEventListener('click', () => carregarProdutosAdmin());
    qs('[data-admin-refresh-developer]')?.addEventListener('click', () => {
      state.developerManifest = null;
      renderDeveloperAdmin();
    });
    qs('[data-admin-refresh-console]')?.addEventListener('click', () => carregarLogsConsole());
    qs('#admin-sql-copy')?.addEventListener('click', async (event) => {
      event.preventDefault();
      const btn = event.currentTarget;
      const sql = qs('#admin-sql-console')?.value || '';
      try {
        if (btn) btn.disabled = true;
        await copyAdminSql(sql);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    qs('#admin-sql-clear')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (qs('#admin-sql-console')) qs('#admin-sql-console').value = '';
    });
    qs('[data-admin-refresh-equipe]')?.addEventListener('click', () => carregarEquipeAdmin());
    qsa('[data-admin-logout]').forEach((button) => {
      button.addEventListener('click', logoutAdmin);
    });
    qsa('[data-admin-theme-toggle]').forEach((button) => {
      button.addEventListener('click', toggleAdminTheme);
    });
    qs('#admin-product-form-basic')?.addEventListener('submit', salvarProdutoAdmin);
    qsa('#prod-foto, #prod-foto-camera').forEach((input) => {
      input.addEventListener('change', () => renderCreateProductImagePreview(input.files?.[0] || null));
    });
    qs('#admin-order-search')?.addEventListener('input', () => renderizarPedidosAdmin(state.pedidos));
    qs('#admin-finance-period')?.addEventListener('change', renderFinanceiro);
    qs('#admin-product-search')?.addEventListener('input', () => renderizarProdutosAdmin(state.produtos));
    qs('#admin-product-category-filter')?.addEventListener('change', () => renderizarProdutosAdmin(state.produtos));
    qs('#admin-team-search')?.addEventListener('input', (event) => {
      const query = normalize(event.target.value || '');
      qsa('#admin-team-list tr[data-team-row]').forEach((tr) => {
        const name = normalize(qs('.team-user-name', tr)?.textContent || '');
        const email = normalize(qs('.team-user-email', tr)?.textContent || '');
        tr.hidden = query && !(name.includes(query) || email.includes(query));
      });
    });
    qsa('[data-admin-order-filter]').forEach((button) => {
      button.addEventListener('click', () => setActiveOrderStatus(button.dataset.adminOrderFilter));
    });
    qsa('[data-admin-orders-view]').forEach((button) => {
      button.addEventListener('click', () => setOrderArchiveView(button.dataset.adminOrdersView));
    });
    qsa('[data-admin-product-view]').forEach((button) => {
      button.addEventListener('click', () => setAdminProductView(button.dataset.adminProductView || 'list'));
    });
    qs('#admin-store-config-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      localStorage.setItem(
        'ms_admin_store_config',
        JSON.stringify({
          whatsapp: qs('#admin-store-whatsapp')?.value || '',
          pix: qs('#admin-store-pix')?.value || '',
          savedAt: new Date().toISOString(),
        }),
      );
      showToast('Configuração salva neste navegador.', 'success');
    });

    document.body.addEventListener('change', (event) => {
      const select = event.target.closest('[data-admin-order-status]');
      if (select) {
        atualizarStatusPedido(select.dataset.adminOrderStatus, select.value);
        return;
      }

      const payment = event.target.closest('[data-admin-order-payment]');
      if (payment) atualizarPagamentoPedido(payment.dataset.adminOrderPayment, payment.value);
      const productImageFile = event.target.closest(
        '[data-admin-product-image-file], [data-admin-product-image-file-camera]',
      );
      if (productImageFile) {
        renderEditProductImagePreview(
          productImageFile.dataset.adminProductImageFile || productImageFile.dataset.adminProductImageFileCamera,
          productImageFile.files?.[0] || null,
        );
        return;
      }

      const variationImageFile = event.target.closest(
        '[data-admin-variation-image-file], [data-admin-variation-image-file-camera]',
      );
      if (variationImageFile) {
        renderVariationImagePreview(
          variationImageFile.dataset.adminVariationImageFile ||
            variationImageFile.dataset.adminVariationImageFileCamera,
          variationImageFile.files?.[0] || null,
        );
        return;
      }

      const newVariationImageFile = event.target.closest(
        '[data-admin-variation-new-file], [data-admin-variation-new-file-camera]',
      );
      if (newVariationImageFile) {
        renderNewVariationImagePreview(newVariationImageFile.files?.[0] || null);
        return;
      }
      // Mudanca de cargo na aba Gerenciar Equipe
      const teamSelect = event.target.closest('[data-admin-team-role]');
      if (teamSelect) {
        const userId = teamSelect.dataset.adminTeamRole;
        const newRole = teamSelect.value;
        atualizarCargoUsuario(userId, newRole);
        return;
      }
    });

    document.body.addEventListener('click', (event) => {
      const retryAccess = event.target.closest('[data-admin-retry-access]');
      if (retryAccess) {
        window.location.reload();
        return;
      }

      const editorClose = event.target.closest('[data-admin-product-editor-close]');
      if (editorClose) {
        closeProductEditor();
        return;
      }

      const detailClose = event.target.closest('[data-admin-product-detail-close]');
      if (detailClose) {
        state.selectedProductId = '';
        renderProductDetailsPanel();
        renderizarProdutosAdmin(state.produtos);
        return;
      }

      const detailOpen = event.target.closest('[data-admin-product-details]');
      if (detailOpen) {
        openProductDetails(detailOpen.dataset.adminProductDetails);
        return;
      }

      const edit = event.target.closest('[data-admin-product-edit]');
      if (edit) {
        openProductEditor(edit.dataset.adminProductEdit);
        return;
      }

      const imageClear = event.target.closest('[data-admin-product-image-clear]');
      if (imageClear) {
        const productId = imageClear.dataset.adminProductImageClear;
        const imageInput = qs(`[data-admin-product-field="imagem"][data-product-id="${escapeSelector(productId)}"]`);
        if (imageInput) imageInput.value = '';
        qsa(
          `[data-admin-product-image-file="${escapeSelector(productId)}"], [data-admin-product-image-file-camera="${escapeSelector(productId)}"]`,
        ).forEach((input) => {
          input.value = '';
        });
        renderEditProductImagePreview(productId, null);
        showToast('Imagem removida. Salve o produto para confirmar.', 'info');
        return;
      }

      const createImageClear = event.target.closest('[data-admin-create-image-clear]');
      if (createImageClear) {
        qsa('#prod-foto, #prod-foto-camera').forEach((input) => {
          input.value = '';
        });
        renderCreateProductImagePreview(null);
        showToast('Imagem removida do novo produto.', 'info');
        return;
      }

      const variationImageClear = event.target.closest('[data-admin-variation-image-clear]');
      if (variationImageClear) {
        const variationId = variationImageClear.dataset.adminVariationImageClear;
        const imageInput = variationField(variationId, 'imagem');
        if (imageInput) imageInput.value = '';
        qsa(
          `[data-admin-variation-image-file="${escapeSelector(variationId)}"], [data-admin-variation-image-file-camera="${escapeSelector(variationId)}"]`,
        ).forEach((input) => {
          input.value = '';
        });
        renderVariationImagePreview(variationId, null);
        showToast('Imagem removida da variacao. Salve para confirmar.', 'info');
        return;
      }

      const newVariationImageClear = event.target.closest('[data-admin-variation-new-image-clear]');
      if (newVariationImageClear) {
        const box = newVariationImageClear.closest('[data-admin-variation-create]');
        const imageInput = qs('[data-admin-variation-new="imagem"]', box);
        if (imageInput) imageInput.value = '';
        qsa('[data-admin-variation-new-file], [data-admin-variation-new-file-camera]', box).forEach((input) => {
          input.value = '';
        });
        renderNewVariationImagePreview(null);
        showToast('Imagem removida da nova variacao.', 'info');
        return;
      }

      const save = event.target.closest('[data-admin-product-save]');
      if (save) {
        salvarEdicaoProduto(save.dataset.adminProductSave).then((saved) => {
          if (saved) closeProductEditor();
        });
        return;
      }

      const variationAdd = event.target.closest('[data-admin-variation-add]');
      if (variationAdd) {
        adicionarVariacaoAdmin(variationAdd.dataset.adminVariationAdd);
        return;
      }

      const variationSave = event.target.closest('[data-admin-variation-save]');
      if (variationSave) {
        salvarVariacaoAdmin(variationSave.dataset.adminVariationSave, variationSave.dataset.productId);
        return;
      }

      const variationToggle = event.target.closest('[data-admin-variation-toggle]');
      if (variationToggle) {
        salvarVariacaoAdmin(variationToggle.dataset.adminVariationToggle, variationToggle.dataset.productId, {
          ativo: variationToggle.dataset.variationActive !== 'true',
        });
        return;
      }

      const variationOffer24 = event.target.closest('[data-admin-variation-offer-24]');
      if (variationOffer24) {
        if (!variationsExtendedReady) {
          setDatabaseAlert('Aplique supabase/20260523-etapa-7-base-correta.sql para criar oferta por opcao.');
          showToast('Aplique a migracao da etapa 7 para usar oferta por opcao.', 'error');
          return;
        }
        const variation = state.variacoes.find((item) => String(item.id) === String(variationOffer24.dataset.adminVariationOffer24));
        const price = Number(variation?.preco || 0);
        salvarVariacaoAdmin(variationOffer24.dataset.adminVariationOffer24, variationOffer24.dataset.productId, {
          oferta_ativa: true,
          preco_promocional: Math.max(0, Number((price * 0.9).toFixed(2))),
          oferta_inicio: new Date().toISOString(),
          oferta_fim: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        return;
      }

      const stockZero = event.target.closest('[data-admin-product-stock-zero]');
      if (stockZero) {
        salvarEdicaoProduto(stockZero.dataset.adminProductStockZero, { estoque: 0 });
        return;
      }

      const offer24 = event.target.closest('[data-admin-product-offer-24]');
      if (offer24) {
        const product = state.produtos.find((item) => item.id === offer24.dataset.adminProductOffer24);
        const price = Number(product?.preco || 0);
        salvarEdicaoProduto(offer24.dataset.adminProductOffer24, {
          destaque: true,
          oferta_ativa: true,
          preco_promocional: Math.max(0, Number((price * 0.9).toFixed(2))),
          oferta_inicio: new Date().toISOString(),
          oferta_fim: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        return;
      }

      const offerEnd = event.target.closest('[data-admin-product-offer-end]');
      if (offerEnd) {
        salvarEdicaoProduto(offerEnd.dataset.adminProductOfferEnd, {
          oferta_ativa: false,
          preco_promocional: null,
          oferta_fim: new Date().toISOString(),
        });
        return;
      }

      const remove = event.target.closest('[data-admin-product-delete]');
      if (remove) {
        excluirProdutoAdmin(remove.dataset.adminProductDelete);
        return;
      }

      const confirmOrder = event.target.closest('[data-admin-order-confirm]');
      if (confirmOrder) {
        confirmarPedidoAdmin(confirmOrder.dataset.adminOrderConfirm);
        return;
      }

      const archiveOrder = event.target.closest('[data-admin-order-archive]');
      if (archiveOrder) {
        archiveOrderAdmin(archiveOrder.dataset.adminOrderArchive);
        return;
      }

      const restoreOrder = event.target.closest('[data-admin-order-restore]');
      if (restoreOrder) {
        restoreOrderAdmin(restoreOrder.dataset.adminOrderRestore);
        return;
      }

      const productOpen = event.target.closest('[data-admin-product-open]');
      if (productOpen && !event.target.closest('button, a, input, select, textarea, label')) {
        openProductDetails(productOpen.dataset.adminProductOpen);
      }
      const teamSave = event.target.closest('[data-admin-team-save]');
      if (teamSave) {
        const userId = teamSave.dataset.adminTeamSave;
        const select = qs(`[data-admin-team-role="${escapeSelector(userId)}"]`);
        if (select) atualizarCargoUsuario(userId, select.value);
        return;
      }
    });

    document.body.addEventListener('keydown', (event) => {
      const productOpen = event.target.closest?.('[data-admin-product-open]');
      if (!productOpen || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openProductDetails(productOpen.dataset.adminProductOpen);
    });
  }

  function setAdminProductView(view = 'list') {
    const mode = view === 'new' ? 'new' : 'list';
    const layout = qs('[data-admin-products-layout]');
    layout?.classList.toggle('is-new-mode', mode === 'new');
    layout?.classList.toggle('is-list-mode', mode === 'list');
    qsa('[data-admin-product-view]').forEach((button) => {
      const active = button.dataset.adminProductView === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (mode === 'new') qs('#prod-nome')?.focus();
  }

  async function initAdminPanel() {
    try {
      bindAdminEvents();
      const canAccess = await verificarAcessoAdmin();
      if (!canAccess) return;

      const initialTab = text(location.hash).replace('#', '') || 'pedidos';
      renderAdminTab(initialTab);
      const results = await Promise.allSettled([carregarPedidosAdmin(), carregarProdutosAdmin()]);
      const failed = results.find((result) => result.status === 'rejected');
      if (failed) {
        console.warn('[Admin] Uma parte do painel nao carregou.', failed.reason);
        setDatabaseAlert('Uma parte do painel não carregou. Atualize a página ou confira as permissões no Supabase.');
        showToast('Painel aberto, mas uma parte não carregou.', 'error');
      }
      assinarPedidosRealtime();
    } catch (error) {
      console.error('[Admin] Falha ao iniciar painel.', error);
      setAccessState('Painel indisponível', 'Não consegui iniciar o painel agora. Atualize a página e tente novamente.', {
        icon: 'triangle-exclamation',
        retry: true,
      });
      showToast('Nao consegui iniciar o painel.', 'error');
    }
  }

  window.initAdminPanel = initAdminPanel;
  window.renderAdminTab = renderAdminTab;
  window.carregarPedidosAdmin = carregarPedidosAdmin;
  window.renderizarPedidosAdmin = renderizarPedidosAdmin;
  window.assinarPedidosRealtime = assinarPedidosRealtime;
  window.atualizarStatusPedido = atualizarStatusPedido;
  window.carregarProdutosAdmin = carregarProdutosAdmin;
  window.salvarProdutoAdmin = salvarProdutoAdmin;
  window.uploadImagemProduto = uploadImagemProduto;
  window.carregarEquipeAdmin = carregarEquipeAdmin;
  window.atualizarCargoUsuario = atualizarCargoUsuario;
  window.carregarLogsConsole = carregarLogsConsole;
  window.copyAdminSql = copyAdminSql;
  window.renderDevConsole = renderDevConsole;

  window.switchTab = renderAdminTab;
  window.salvarProduto = salvarProdutoAdmin;
  window.logoutAdmin = logoutAdmin;

  initAdminPanel();
});
