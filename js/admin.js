document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const PRODUCT_IMAGE_BUCKET = 'produtos';
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  // Fallback mapping for admin emails — should NOT be relied on in production.
  // If you need an emergency fallback, inject via `window.__FALLBACK_ADMIN_EMAILS__ = { 'email@ex.com': 'developer' }`.
  const FALLBACK_ADMIN_EMAILS = (window && window.__FALLBACK_ADMIN_EMAILS__) || {};
  function getFallbackRoleForEmail(email) {
    try {
      return String(FALLBACK_ADMIN_EMAILS[(email || '').toLowerCase()] || '').trim();
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
  const DB_TO_UI_STATUS = Object.entries(ORDER_STATUS).reduce((map, [ui, config]) => ({ ...map, [config.db]: ui }), {});

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
    realtimeChannel: null,
    activeTab: 'pedidos',
    activeOrderStatus: 'pendente',
    selectedProductId: '',
    user: null,
    profile: null,
    developerManifest: null,
    auditLogs: [],
  };
  let productsExtendedReady = true;
  let ordersExtendedReady = true;

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

  function productCardField(id, field) {
    return qs(`[data-admin-product-field="${field}"][data-product-id="${escapeSelector(id)}"]`);
  }

  function productImageFallback(product = {}) {
    const name = normalize(product.nome || '');
    if (name.includes('agua')) return '../assets/produtos/v2/agua-mineral-20l.png';
    if (name.includes('gas')) return '../assets/produtos/v2/gas-p13.png';
    if (name.includes('desinfetante')) return '../assets/produtos/v2/desinfetante-2l.png';
    if (name.includes('detergente')) return '../assets/produtos/v2/detergente-2l.png';
    if (name.includes('alcool')) return '../assets/produtos/v2/alcool-perfumado.png';
    if (name.includes('amaciante')) return '../assets/produtos/v2/amaciante-2l.png';
    if (name.includes('candida') && name.includes('color')) return '../assets/produtos/v2/candida-colorida.png';
    if (name.includes('candida')) return '../assets/produtos/v2/candida-2l.png';
    if (name.includes('cloro') && name.includes('1l')) return '../assets/produtos/v2/cloro-1l.png';
    if (name.includes('cloro')) return '../assets/produtos/v2/cloro-2l.png';
    if (name.includes('bombril')) return '../assets/produtos/v2/bombril.png';
    if (name.includes('esponja') && name.includes('aco')) return '../assets/produtos/v2/esponja-aco.png';
    if (name.includes('esponja') && name.includes('louca')) return '../assets/produtos/v2/esponja-louca.png';
    if (name.includes('esponja')) return '../assets/produtos/v2/esponjao.png';
    if (name.includes('escova') && name.includes('vaso')) return '../assets/produtos/v2/escova-vaso.png';
    if (name.includes('escova')) return '../assets/produtos/v2/escova-roupa.png';
    if (name.includes('limpa') && name.includes('aluminio')) return '../assets/produtos/v2/limpa-aluminio.png';
    if (name.includes('limpa') && name.includes('pedra') && name.includes('500'))
      return '../assets/produtos/v2/limpa-pedra-500ml.png';
    if (name.includes('limpa') && name.includes('pedra')) return '../assets/produtos/v2/limpa-pedra-2l.png';
    if (name.includes('sabao') && name.includes('coco')) return '../assets/produtos/v2/sabao-coco.png';
    if (name.includes('sabao')) return '../assets/produtos/v2/sabao-omo.png';
    if (name.includes('sabonete')) return '../assets/produtos/v2/sabonete-liquido.png';
    if (name.includes('saco')) return '../assets/produtos/v2/saco-lixo.png';
    if (name.includes('rodo') && name.includes('pequeno')) return '../assets/produtos/v2/rodo-pequeno.png';
    if (name.includes('rodo')) return '../assets/produtos/v2/rodo-grande.png';
    if (name.includes('rodinho')) return '../assets/produtos/v2/rodinho-pia.png';
    if (name.includes('prendedor') && name.includes('madeira')) return '../assets/produtos/v2/prendedor-madeira.png';
    if (name.includes('prendedor')) return '../assets/produtos/v2/prendedor-plastico.png';
    if (name.includes('pedra')) return '../assets/produtos/v2/pedra-vaso.png';
    if (name.includes('pasta')) return '../assets/produtos/v2/pasta-brilho.png';
    if (name === 'pa' || name.includes(' pa')) return '../assets/produtos/v2/pa.png';
    if (name.includes('vassoura')) return '../assets/produtos/v2/vassoura.png';
    return '';
  }

  function productImageHTML(product = {}) {
    const src = text(product.imagem || '').trim();
    const fallback = productImageFallback(product);
    if (!src && !fallback) return '<i class="fa-solid fa-box"></i>';
    const onerror =
      fallback && src !== fallback
        ? ` onerror="this.onerror=null;this.src='${escapeHTML(fallback)}';"`
        : " onerror=\"this.onerror=null;this.closest('.admin-product-thumb').innerHTML='<i class=&quot;fa-solid fa-box&quot;></i>';\"";
    return `<img src="${escapeHTML(src || fallback)}" alt="${escapeHTML(product.nome || '')}" loading="lazy" decoding="async"${onerror}>`;
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
    toast.textContent = message;
    stack.appendChild(toast);
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

  async function rpcExcluirPedido(pedidoId) {
    const api = client();
    if (!api?.rpc) return { data: null, error: new Error('RPC indisponivel') };
    return api.rpc('admin_delete_order', { p_id: pedidoId });
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
    const { error } = await api.rpc('admin_log_action', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: text(entityId),
      p_metadata: metadata || {},
    });
    if (error) console.warn('[Admin Audit] Log nao registrado.', error);
  }

  function friendlyDbError(error, fallback) {
    const message = normalize(error?.message || error?.details || '');
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
        <a class="btn btn-secondary" href="../index.html">Voltar ao site</a>
      </div>
    `;
  }

  function currentAdminRole() {
    // Prefer explicit role from `profiles.admin_role`; `profile.role` is only a compatibility fallback.
    const profileRole = normalize(state.profile?.admin_role || state.profile?.role || '');
    if (profileRole && profileRole !== 'customer') return profileRole;
    // Only use fallback email mapping when profile is not available (emergency).
    if (!state.profile) return normalize(getFallbackRoleForEmail(state.user?.email) || '');
    return '';
  }

  function isDeveloperAdmin() {
    // Primary check: profile role
    if (currentAdminRole() === 'developer') return true;
    // Emergency fallback: use injected email map only if profile not loaded
    if (!state.profile) return getFallbackRoleForEmail(state.user?.email) === 'developer';
    return false;
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

  async function verificarAcessoAdmin() {
    const api = client();
    if (!api?.auth) {
      setAccessState('Supabase indisponível', 'O cliente Supabase não carregou nesta página.', {
        icon: 'triangle-exclamation',
      });
      return false;
    }

    const { data: sessionData, error: sessionError } = await api.auth.getUser();
    if (sessionError) console.warn('[Admin] Falha ao ler usuario autenticado.', sessionError);
    const user = sessionData?.user;
    if (!user?.id) {
      // Redireciona para login se não estiver autenticado
      window.location.href = 'login.html?redirect=painel.html';
      return false;
    }

    state.user = user;

    const { data: profile, error } = await api
      .from('profiles')
      .select('id, email, nome, is_admin, admin_role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) console.warn('[Admin] Perfil admin nao foi lido.', error);
    // If profile exists use it; otherwise leave profile empty and allow fallback only in emergency
    if (profile) {
      state.profile = profile;
    } else {
      state.profile = null;
    }
    // Tenta ler a role na tabela `perfis_usuarios` (tenta user_id então id)
    try {
      let perfisRow = null;
      const byUser = await api.from('perfis_usuarios').select('id, user_id, role').eq('user_id', user.id).maybeSingle();
      if (byUser?.data) perfisRow = byUser.data;
      else {
        const byId = await api.from('perfis_usuarios').select('id, user_id, role').eq('id', user.id).maybeSingle();
        if (byId?.data) perfisRow = byId.data;
      }
      if (perfisRow) {
        if (state.profile) {
          state.profile.perfis = perfisRow;
          state.profile.role = state.profile.admin_role || '';
        } else {
          const fb = getFallbackRoleForEmail(user.email);
          state.profile = {
            id: user.id,
            email: user.email,
            nome: user.user_metadata?.name || user.email,
            is_admin: Boolean(fb),
            admin_role: fb || 'customer',
            role: fb || 'customer',
            perfis: perfisRow,
          };
        }
      } else {
        if (!state.profile) {
          // emergency fallback when no profile row exists
          const fb = getFallbackRoleForEmail(user.email);
          state.profile = {
            id: user.id,
            email: user.email,
            nome: user.user_metadata?.name || user.email,
            is_admin: Boolean(fb),
            admin_role: fb || 'customer',
            role: fb || 'customer',
          };
        } else {
          state.profile.role = state.profile.admin_role || '';
        }
      }
    } catch (err) {
      console.warn('[Admin] falha ao ler perfis_usuarios', err);
      if (!state.profile) {
        const fb = getFallbackRoleForEmail(user.email);
        state.profile = {
          id: user.id,
          email: user.email,
          nome: user.user_metadata?.name || user.email,
          is_admin: Boolean(fb),
          admin_role: fb || 'customer',
          role: fb || 'customer',
        };
      } else {
        state.profile.role = state.profile.admin_role || '';
      }
    }

    const role = currentAdminRole();
    const validAdminRoles = ['developer', 'owner', 'staff'];
    const isAdminRole = validAdminRoles.includes(role);
    const admin = Boolean(state.profile.is_admin || isAdminRole);
    if (!admin) {
      // Redireciona para login quando usuário não tem cargo administrativo válido
      window.location.href = 'login.html?redirect=painel.html';
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
    };
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

    const extendedSelect = [
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
      'subtotal',
      'entrega',
      'total',
      'brinde',
      'pedido_itens(id, produto_id, nome, variacao, quantidade, preco_unitario, total, imagem)',
    ].join(', ');
    const baseSelect =
      'id, codigo, created_at, cliente_nome, cliente_email, cliente_telefone, endereco_entrega, observacao, pagamento, status, total';

    let { data, error } = await api.from('pedidos').select(extendedSelect).order('created_at', { ascending: false });

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
    }

    if (error || !data) {
      showToast(friendlyDbError(error, 'Não consegui carregar os pedidos.'), 'error');
      return [];
    }

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

  function orderCardHTML(order, highlightId = '') {
    const highlighted = highlightId && order.id === highlightId;
    const payment = PAYMENT_STATUS.includes(order.pagamento_status) ? order.pagamento_status : 'Pendente';
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
        <div class="admin-order-control-grid">
          ${orderStatusSelect(order)}
          ${orderPaymentSelect(order)}
          <button class="btn btn-secondary ${order.confirmado ? 'is-confirmed' : ''}" type="button" data-admin-order-confirm="${escapeHTML(order.id)}" ${order.confirmado || !ordersExtendedReady ? 'disabled' : ''}>
            <i class="fa-solid ${order.confirmado ? 'fa-circle-check' : 'fa-check-double'}"></i>
            ${!ordersExtendedReady ? 'Atualize o banco' : order.confirmado ? 'Pedido confirmado' : 'Confirmar pedido'}
          </button>
          <button class="btn btn-secondary admin-danger" type="button" data-admin-order-delete="${escapeHTML(order.id)}">
            <i class="fa-solid fa-trash"></i>
            Apagar
          </button>
        </div>
      </article>
    `;
  }

  function renderizarPedidosAdmin(pedidos = state.pedidos, options = {}) {
    const query = adminSearchQuery('#admin-order-search');
    const visiblePedidos = query ? pedidos.filter((order) => orderMatchesSearch(order, query)) : pedidos;
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

    const openCount = unreadAdminOrders(pedidos).length;
    const badge = qs('#badge-pedidos');
    if (badge) badge.textContent = String(openCount);
    if (badge) {
      badge.classList.toggle('is-empty', openCount === 0);
      badge.setAttribute(
        'aria-label',
        `${openCount} pedido${openCount === 1 ? '' : 's'} nao lido${openCount === 1 ? '' : 's'}`,
      );
    }

    if (options.announce) {
      const alert = qs('#admin-new-order-alert');
      if (alert) {
        alert.textContent = 'Novo pedido recebido no painel.';
        alert.classList.remove('hidden');
        window.setTimeout(() => alert.classList.add('hidden'), 5000);
      }
    }
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

  async function excluirPedidoAdmin(pedidoId) {
    const api = client();
    if (!api || !pedidoId) return false;
    const order = state.pedidos.find((item) => item.id === pedidoId);
    const label = order ? `#${orderShortId(order)} de ${order.cliente_nome || 'cliente'}` : 'este pedido';
    if (!confirm(`Apagar ${label}? Esta acao remove o pedido e os itens dele.`)) return false;

    let { error } = await api.from('pedidos').delete().eq('id', pedidoId);

    if (error) {
      const rpc = await rpcExcluirPedido(pedidoId);
      error = rpc.error;
    }

    if (error) {
      showToast(friendlyDbError(error, 'Nao consegui apagar o pedido.'), 'error');
      await carregarPedidosAdmin();
      return false;
    }

    state.pedidos = state.pedidos.filter((item) => item.id !== pedidoId);
    renderizarPedidosAdmin(state.pedidos);
    renderFinanceiro();
    renderEntregas();
    await logAdminAction('pedido_excluido', 'pedido', pedidoId, {
      codigo: order?.codigo || '',
      cliente: order?.cliente_nome || '',
    });
    showToast('Pedido apagado.', 'success');
    return true;
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
    renderizarProdutosAdmin(state.produtos);
    return state.produtos;
  }

  function renderizarProdutosAdmin(produtos = state.produtos) {
    const list = qs('#lista-produtos-admin');
    const count = qs('#admin-products-count');
    const query = adminSearchQuery('#admin-product-search');
    const visibleProdutos = query ? produtos.filter((product) => productMatchesSearch(product, query)) : produtos;
    if (count) count.textContent = query ? `${visibleProdutos.length}/${produtos.length}` : String(produtos.length);
    if (!list) return;
    if (state.selectedProductId && !produtos.some((product) => product.id === state.selectedProductId)) {
      state.selectedProductId = '';
      renderProductDetailsPanel();
    }

    if (!visibleProdutos.length) {
      list.innerHTML = `<p class="admin-empty-state">${query ? 'Nenhum produto encontrado para esta busca.' : 'Nenhum produto cadastrado ainda.'}</p>`;
      return;
    }

    list.innerHTML = visibleProdutos
      .map((product) => {
        const offer = productOfferActive(product);
        const stock = product.estoque ?? '';
        const active = product.ativo !== false;
        const stockLabel =
          stock === '' || stock === null
            ? 'Sem estoque cadastrado'
            : Number(stock) <= 0
              ? 'Esgotado'
              : `${stock} em estoque`;
        const statusBadges = [
          `<span class="admin-product-badge ${active ? 'is-active' : 'is-inactive'}">${active ? 'Ativo' : 'Desativado'}</span>`,
          stock !== '' && stock !== null && Number(stock) <= 0
            ? '<span class="admin-product-badge is-out">Esgotado</span>'
            : '',
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
              <button class="btn btn-secondary" type="button" data-admin-product-stock-zero="${escapeHTML(product.id)}">
                <i class="fa-solid fa-ban"></i>
                Esgotar
              </button>
              <button class="btn btn-secondary" type="button" data-admin-product-offer-24="${escapeHTML(product.id)}">
                <i class="fa-solid fa-bolt"></i>
                Oferta 24h
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
  }

  function productDetailsPanelHTML(product = {}) {
    const offer = productOfferActive(product);
    const active = product.ativo !== false;
    const stock = product.estoque ?? '';
    const stockLabel = stock === '' || stock === null ? 'Sem estoque cadastrado' : `${stock} em estoque`;
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

  function renderProductDetailsPanel() {
    const panel = qs('#admin-product-detail-panel');
    if (!panel) return;
    const product = state.produtos.find((item) => item.id === state.selectedProductId);
    panel.classList.toggle('hidden', !product);
    panel.innerHTML = product ? productDetailsPanelHTML(product) : '';
  }

  function openProductDetails(productId) {
    const product = state.produtos.find((item) => item.id === productId);
    if (!product) return;
    state.selectedProductId = productId;
    renderProductDetailsPanel();
    renderizarProdutosAdmin(state.produtos);
    qs('#admin-product-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        <label class="admin-product-edit-wide">Imagem do produto
          <input type="url" value="${escapeHTML(product.imagem || '')}" data-admin-product-field="imagem" data-product-id="${escapeHTML(product.id)}" placeholder="https://...">
        </label>
        <label class="admin-product-edit-wide">Enviar nova imagem
          <input type="file" accept="image/png,image/jpeg,image/webp" data-admin-product-image-file="${escapeHTML(product.id)}">
        </label>
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
      imagem: field('imagem')?.value.trim() || '',
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

  async function salvarEdicaoProduto(productId, override = null) {
    const api = client();
    if (!api || !productId) return false;
    const payload = override || adminProductPayloadFromCard(productId);
    if (!override) {
      const file = qs(`[data-admin-product-image-file="${escapeSelector(productId)}"]`)?.files?.[0] || null;
      if (file) {
        try {
          showToast('Enviando nova imagem...', 'info');
          payload.imagem = await resolveProductImage(file, payload.nome || productId);
        } catch (error) {
          showToast(friendlyDbError(error, error.message || 'Nao consegui enviar a imagem.'), 'error');
          return false;
        }
      }
    }
    if (!override && !payload.nome) {
      showToast('Informe o nome do produto.', 'error');
      return false;
    }
    if (payload.oferta_ativa && (!payload.preco_promocional || payload.preco_promocional <= 0)) {
      showToast('Informe o preco promocional para ativar a oferta.', 'error');
      return false;
    }

    let { data, error } = await api.from('produtos').update(payload).eq('id', productId).select('id').maybeSingle();

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
        descricao: payload.descricao,
        ativo: payload.ativo,
      };
      if (payload.estoque !== undefined) basePayload.estoque = payload.estoque;
      const fallback = await api.from('produtos').update(basePayload).eq('id', productId).select('id').maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) {
      showToast(friendlyDbError(error, 'Nao consegui alterar o produto.'), 'error');
      return false;
    }

    state.produtos = state.produtos.map((product) => (product.id === productId ? { ...product, ...payload } : product));
    renderizarProdutosAdmin(state.produtos);
    await logAdminAction(override ? 'produto_atalho' : 'produto_atualizado', 'produto', productId, {
      campos: Object.keys(payload),
    });
    showToast('Produto atualizado.', 'success');
    carregarProdutosAdmin();
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

  function validateProductImageFile(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Use uma imagem JPG, PNG ou WebP.');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('Use uma imagem de ate 5 MB.');
    }
  }

  function fileToDataUrl(file) {
    validateProductImageFile(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(text(reader.result || ''));
      reader.onerror = () => reject(new Error('Nao consegui ler a imagem selecionada.'));
      reader.readAsDataURL(file);
    });
  }

  async function resolveProductImage(file, productNameOverride = '') {
    if (!file) return '';
    validateProductImageFile(file);
    try {
      return await uploadImagemProduto(file, productNameOverride);
    } catch (error) {
      console.warn('[Admin] Upload no Storage falhou, usando imagem embutida no cadastro.', error);
      showToast('Storage nao aceitou a imagem; salvando direto no produto.', 'info');
      return fileToDataUrl(file);
    }
  }

  async function uploadImagemProduto(file, productNameOverride = '') {
    const api = client();
    if (!api?.storage) throw new Error('Storage do Supabase indisponível.');
    if (!file) return '';
    validateProductImageFile(file);

    const extension = imageExtension(file);
    const productName = productNameOverride || qs('#prod-nome')?.value || file.name;
    const path = `${safeFileName(productName)}/${Date.now()}-${safeFileName(file.name)}.${extension}`;
    const { error } = await api.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || `image/${extension}`,
      upsert: false,
    });

    if (error) throw error;
    const { data } = api.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || '';
  }

  async function salvarProdutoAdmin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = qs('button[type="submit"]', form);
    const feedback = qs('#admin-product-upload-feedback');
    const file = qs('#prod-foto')?.files?.[0] || null;
    const api = client();

    if (!api) {
      showToast('Supabase indisponível para salvar produto.', 'error');
      return;
    }

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
      if (feedback) feedback.textContent = 'Produto salvo.';
      await carregarProdutosAdmin();
      await logAdminAction('produto_criado', 'produto', insertedProduct?.id || payload.nome, { nome: payload.nome });
      showToast('Produto salvo no catálogo.', 'success');
    } catch (error) {
      console.warn('[Admin] Erro ao salvar produto.', error);
      if (feedback) feedback.textContent = 'Falha ao salvar.';
      showToast(friendlyDbError(error, error.message || 'Não consegui salvar o produto.'), 'error');
    } finally {
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

  function renderFinanceiro() {
    const pedidos = state.pedidos;
    const total = pedidos.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const pagos = pedidos.filter((order) => normalize(order.pagamento_status) === 'pago');
    renderMetric('#admin-finance-metrics', [
      { label: 'Pedidos', value: String(pedidos.length) },
      { label: 'Total vendido', value: formatMoney(total) },
      { label: 'Pagos no painel', value: String(pagos.length) },
    ]);
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
        });
    } catch (err) {
      console.warn('[Admin] Falha ao inscrever realtime de logs', err);
    }
  }

  async function executeAdminSql(sql) {
    const api = client();
    if (!api?.rpc) {
      showToast('RPC admin_execute_sql indisponível no cliente.', 'error');
      return null;
    }
    try {
      const { data, error } = await api.rpc('admin_execute_sql', { p_sql: sql });
      if (error) {
        showToast(friendlyDbError(error, 'Erro ao executar SQL.'), 'error');
        await logAdminAction('sql_failed', 'console', state.user?.id, { error: error?.message || '' });
        return null;
      }
      showToast('SQL executado. Verifique logs.', 'success');
      await logAdminAction('sql_executed', 'console', state.user?.id, { sql: sql.slice(0, 1200) });
      // if data is returned, append a lightweight result entry
      if (Array.isArray(data) && data.length) {
        const preview = {
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          action: 'sql_result',
          actor_email: state.user?.email,
          entity_type: 'rpc',
          entity_id: '',
          metadata: { rows: data.length },
        };
        const container = qs('#admin-console-logs');
        if (container) container.insertAdjacentHTML('afterbegin', renderConsoleLogEntry(preview));
      }
      return data;
    } catch (err) {
      console.warn('[Admin] Execucao SQL falhou', err);
      showToast('Falha ao executar SQL.', 'error');
      return null;
    }
  }

  function renderDevConsole() {
    if (!isDeveloperAdmin()) return;
    // garante carregar os logs e conectar realtime
    carregarLogsConsole();
  }

  /* === Gerenciar Equipe (perfis_usuarios) === */
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
      .select('id, email, nome, is_admin, admin_role')
      .order('email', { ascending: true });
    if (profilesErr) {
      console.warn('[Admin] Falha ao carregar profiles', profilesErr);
      container.innerHTML = `<p class="admin-empty-state">${escapeHTML(friendlyDbError(profilesErr, 'Falha ao carregar perfis.'))}</p>`;
      return;
    }

    const { data: perfisData, error: perfisErr } = await api.from('perfis_usuarios').select('id, user_id, role');
    if (perfisErr) console.warn('[Admin] perfis_usuarios nao lido', perfisErr);

    const perfisMap = {};
    (perfisData || []).forEach((p) => {
      const key = p.user_id || p.id;
      perfisMap[key] = p;
    });

    // inclui perfis que não estão em profiles
    const extraFromPerfis = (perfisData || []).filter((p) => !profiles.some((pr) => pr.id === (p.user_id || p.id)));

    const rows = [
      ...profiles.map((pr) => ({
        id: pr.id,
        email: pr.email,
        nome: pr.nome,
        is_admin: pr.is_admin,
        admin_role: pr.admin_role,
      })),
      ...extraFromPerfis.map((pf) => ({
        id: pf.user_id || pf.id,
        email: '',
        nome: '',
        is_admin: false,
        admin_role: '',
        _perfisRow: pf,
      })),
    ];

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
        const perf = perfisMap[row.id] || row._perfisRow || null;
        const userRole = row.admin_role || perf?.role || (row.is_admin ? 'owner' : 'customer');
        const perfisId = perf?.id || '';

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
                <select class="team-role-select" data-admin-team-role="${escapeHTML(row.id)}" data-perfis-id="${escapeHTML(perfisId)}" ${selectDisabled ? 'disabled' : ''} aria-label="Selecionar cargo">
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

  async function atualizarCargoUsuario(userId, newRole, perfisId = '') {
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

      // Fallback (antigo fluxo direto em perfis_usuarios) — usado apenas se RPC indisponível.
      // tenta atualizar por user_id
      let res = await api.from('perfis_usuarios').update({ role: newRole }).eq('user_id', userId).select();
      if (res.error) {
        console.warn('[Admin] Erro atualizando perfis_usuarios por user_id', res.error);
      }

      const hasData = res.data && (Array.isArray(res.data) ? res.data.length > 0 : true);
      if (!hasData) {
        // tenta atualizar por id da tabela perfis_usuarios
        if (perfisId) {
          const byId = await api.from('perfis_usuarios').update({ role: newRole }).eq('id', perfisId).select();
          if (byId.error) console.warn('[Admin] Erro atualizando perfis_usuarios por id', byId.error);
          if (byId.data && byId.data.length) {
            showToast('Cargo atualizado.', 'success');
            await carregarEquipeAdmin();
            await logAdminAction('role_updated', 'user', userId, { role: newRole });
            return true;
          }
        }

        // se nada foi atualizado, insere novo registro
        const inserted = await api.from('perfis_usuarios').insert({ user_id: userId, role: newRole }).select();
        if (inserted.error) {
          showToast(friendlyDbError(inserted.error, 'Falha ao alterar cargo.'), 'error');
          return false;
        }
        showToast('Cargo atribuído.', 'success');
        await carregarEquipeAdmin();
        await logAdminAction('role_assigned', 'user', userId, { role: newRole });
        return true;
      }

      showToast('Cargo atualizado.', 'success');
      await carregarEquipeAdmin();
      await logAdminAction('role_updated', 'user', userId, { role: newRole });
      return true;
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
    qs('#admin-sql-execute')?.addEventListener('click', async (event) => {
      event.preventDefault();
      const btn = event.currentTarget;
      const sql = qs('#admin-sql-console')?.value || '';
      if (!sql.trim()) return showToast('SQL vazio.', 'error');
      try {
        if (btn) btn.disabled = true;
        await executeAdminSql(sql);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    qs('#admin-sql-clear')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (qs('#admin-sql-console')) qs('#admin-sql-console').value = '';
    });
    qs('[data-admin-refresh-equipe]')?.addEventListener('click', () => carregarEquipeAdmin());
    qs('[data-admin-logout]')?.addEventListener('click', logoutAdmin);
    qs('#admin-product-form-basic')?.addEventListener('submit', salvarProdutoAdmin);
    qs('#admin-order-search')?.addEventListener('input', () => renderizarPedidosAdmin(state.pedidos));
    qs('#admin-product-search')?.addEventListener('input', () => renderizarProdutosAdmin(state.produtos));
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
      // Mudanca de cargo na aba Gerenciar Equipe
      const teamSelect = event.target.closest('[data-admin-team-role]');
      if (teamSelect) {
        const userId = teamSelect.dataset.adminTeamRole;
        const newRole = teamSelect.value;
        const perfisId = teamSelect.dataset.perfisId || '';
        atualizarCargoUsuario(userId, newRole, perfisId);
        return;
      }
    });

    document.body.addEventListener('click', (event) => {
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

      const edit = event.target.closest('[data-admin-product-edit]');
      if (edit) {
        openProductEditor(edit.dataset.adminProductEdit);
        return;
      }

      const save = event.target.closest('[data-admin-product-save]');
      if (save) {
        salvarEdicaoProduto(save.dataset.adminProductSave).then((saved) => {
          if (saved) closeProductEditor();
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

      const deleteOrder = event.target.closest('[data-admin-order-delete]');
      if (deleteOrder) {
        excluirPedidoAdmin(deleteOrder.dataset.adminOrderDelete);
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
        if (select) atualizarCargoUsuario(userId, select.value, select.dataset.perfisId || '');
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
    bindAdminEvents();
    const canAccess = await verificarAcessoAdmin();
    if (!canAccess) return;

    const initialTab = text(location.hash).replace('#', '') || 'pedidos';
    renderAdminTab(initialTab);
    await Promise.all([carregarPedidosAdmin(), carregarProdutosAdmin()]);
    assinarPedidosRealtime();
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
  window.executeAdminSql = executeAdminSql;
  window.renderDevConsole = renderDevConsole;

  window.switchTab = renderAdminTab;
  window.salvarProduto = salvarProdutoAdmin;
  window.logoutAdmin = logoutAdmin;

  initAdminPanel();
});
