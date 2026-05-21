document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const PRODUCT_IMAGE_BUCKET = 'produtos';
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const KNOWN_ADMIN_EMAILS = new Map([
    ['marcelol527319@gmail.com', 'developer'],
    ['marcelol527319@gmail.co', 'developer'],
    ['patriciapaula01234@gmail.com', 'owner'],
    ['marcelo52731@gmail.com', 'owner']
  ]);
  const ORDER_STATUS = {
    pendente: { label: 'Pendente', db: 'Recebido', column: 'lista-pendentes' },
    preparo: { label: 'Em Preparo', db: 'Preparando', column: 'lista-preparo' },
    entrega: { label: 'Saiu para Entrega', db: 'Saiu para entrega', column: 'lista-entrega' },
    entregue: { label: 'Entregue', db: 'Entregue', column: 'lista-entregues' }
  };
  const DB_TO_UI_STATUS = Object.entries(ORDER_STATUS)
    .reduce((map, [ui, config]) => ({ ...map, [config.db]: ui }), {});

  const state = {
    client: null,
    pedidos: [],
    produtos: [],
    realtimeChannel: null,
    activeTab: 'pedidos',
    user: null,
    profile: null,
    developerManifest: null
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const text = value => String(value ?? '');
  const onlyDigits = value => text(value).replace(/\D/g, '');
  const normalize = value => text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  function escapeHTML(value) {
    return text(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function escapeSelector(value) {
    if (window.CSS?.escape) return window.CSS.escape(text(value));
    return text(value).replace(/["\\]/g, '\\$&');
  }

  function parsePrice(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const clean = text(value).trim().replace(/[^\d,.-]/g, '');
    if (!clean) return 0;
    const normalized = clean.includes(',')
      ? clean.replace(/\./g, '').replace(',', '.')
      : clean;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
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
      minute: '2-digit'
    });
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

  function friendlyDbError(error, fallback) {
    const message = normalize(error?.message || error?.details || '');
    if (message.includes('row-level security') || message.includes('permission')) {
      return 'A conta precisa estar marcada como administradora no Supabase.';
    }
    if (message.includes('bucket') || message.includes('storage')) {
      return 'Confira o bucket público produtos e as policies de Storage.';
    }
    return fallback;
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
    const fallbackRole = KNOWN_ADMIN_EMAILS.get(normalize(state.user?.email));
    const profileRole = normalize(state.profile?.admin_role || state.profile?.role || '');
    return profileRole && profileRole !== 'customer' ? profileRole : normalize(fallbackRole || profileRole || '');
  }

  function isDeveloperAdmin() {
    const email = normalize(state.user?.email || state.profile?.email || '');
    return currentAdminRole() === 'developer' || KNOWN_ADMIN_EMAILS.get(email) === 'developer';
  }

  function applyDeveloperAccessUI() {
    const developer = isDeveloperAdmin();
    document.body.classList.toggle('admin-developer', developer);
    qsa('[data-developer-only]').forEach(element => {
      element.classList.toggle('hidden', !developer);
      element.hidden = !developer;
      element.setAttribute('aria-hidden', String(!developer));
    });
  }

  async function verificarAcessoAdmin() {
    const api = client();
    if (!api?.auth) {
      setAccessState('Supabase indisponível', 'O cliente Supabase não carregou nesta página.', { icon: 'triangle-exclamation' });
      return false;
    }

    const { data: sessionData, error: sessionError } = await api.auth.getUser();
    if (sessionError) console.warn('[Admin] Falha ao ler usuario autenticado.', sessionError);
    const user = sessionData?.user;
    if (!user?.id) {
      setAccessState('Acesso restrito', 'Entre com uma conta administrativa para abrir o painel.', {
        icon: 'right-to-bracket',
        login: true
      });
      return false;
    }

    state.user = user;
    const fallbackRole = KNOWN_ADMIN_EMAILS.get(normalize(user.email));

    const { data: profile, error } = await api
      .from('profiles')
      .select('id, email, nome, is_admin, admin_role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) console.warn('[Admin] Perfil admin nao foi lido.', error);
    state.profile = profile || {
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.name || user.email,
      is_admin: Boolean(fallbackRole),
      admin_role: fallbackRole || 'customer'
    };

    const role = currentAdminRole();
    const admin = Boolean(state.profile.is_admin || ['developer', 'owner', 'staff'].includes(role));
    if (!admin) {
      setAccessState('Acesso negado', 'Sua conta existe, mas ainda não está marcada como administradora.', {
        icon: 'shield-halved'
      });
      return false;
    }

    qs('#admin-access-state')?.classList.add('hidden');
    qs('[data-admin-workspace]')?.classList.remove('hidden');
    document.body.classList.add('admin-ready');
    document.body.classList.toggle('admin-owner', role === 'owner');
    applyDeveloperAccessUI();
    return true;
  }

  function renderAdminTab(tab = 'pedidos') {
    let nextTab = qs(`[data-admin-panel="${tab}"]`) ? tab : 'pedidos';
    if (nextTab === 'developer' && !isDeveloperAdmin()) {
      nextTab = 'pedidos';
      showToast('Área exclusiva do desenvolvedor.', 'error');
    }
    state.activeTab = nextTab;

    qsa('[data-admin-tab]').forEach(button => {
      const active = button.dataset.adminTab === nextTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    qsa('[data-admin-panel]').forEach(panel => {
      const active = panel.dataset.adminPanel === nextTab;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });

    history.replaceState(null, '', `#${nextTab}`);
    if (nextTab === 'financeiro') renderFinanceiro();
    if (nextTab === 'entregas') renderEntregas();
    if (nextTab === 'developer') renderDeveloperAdmin();
  }

  function dbStatusToUi(status = '') {
    return DB_TO_UI_STATUS[status] || 'pendente';
  }

  function uiStatusToDb(statusUi = '') {
    return ORDER_STATUS[statusUi]?.db || null;
  }

  function orderShortId(order) {
    return text(order.codigo || order.id).replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase() || 'NOVO';
  }

  function mapOrder(row = {}) {
    return {
      ...row,
      items: Array.isArray(row.pedido_itens) ? row.pedido_itens : [],
      statusUi: dbStatusToUi(row.status),
      totalNumber: Number(row.total || 0)
    };
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
      'subtotal',
      'entrega',
      'total',
      'brinde',
      'pedido_itens(id, produto_id, nome, variacao, quantidade, preco_unitario, total, imagem)'
    ].join(', ');
    const baseSelect = 'id, codigo, created_at, cliente_nome, cliente_email, cliente_telefone, endereco_entrega, observacao, pagamento, status, total';

    let { data, error } = await api
      .from('pedidos')
      .select(extendedSelect)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Admin] Busca completa de pedidos falhou, tentando campos basicos.', error);
      const fallback = await api
        .from('pedidos')
        .select(baseSelect)
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
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
    return order.items.map(item => {
      const variant = item.variacao ? ` - ${item.variacao}` : '';
      return `<li>${escapeHTML(item.quantidade || 1)} x ${escapeHTML(item.nome || 'Produto')}${escapeHTML(variant)}</li>`;
    }).join('');
  }

  function orderStatusSelect(order) {
    return `
      <label class="admin-order-status-select">
        <span>Status</span>
        <select data-admin-order-status="${escapeHTML(order.id)}">
          ${Object.entries(ORDER_STATUS).map(([key, config]) => `
            <option value="${escapeHTML(key)}" ${key === order.statusUi ? 'selected' : ''}>${escapeHTML(config.label)}</option>
          `).join('')}
        </select>
      </label>
    `;
  }

  function orderCardHTML(order, highlightId = '') {
    const highlighted = highlightId && order.id === highlightId;
    return `
      <article class="admin-order-card ${highlighted ? 'is-new' : ''}" data-admin-order-card="${escapeHTML(order.id)}">
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
        ${orderStatusSelect(order)}
      </article>
    `;
  }

  function renderizarPedidosAdmin(pedidos = state.pedidos, options = {}) {
    Object.values(ORDER_STATUS).forEach(config => {
      const column = qs(`#${config.column}`);
      if (column) column.innerHTML = '';
    });

    pedidos.forEach(order => {
      const status = ORDER_STATUS[order.statusUi] || ORDER_STATUS.pendente;
      const column = qs(`#${status.column}`);
      if (column) column.insertAdjacentHTML('beforeend', orderCardHTML(order, options.highlightId));
    });

    Object.entries(ORDER_STATUS).forEach(([key, config]) => {
      const column = qs(`#${config.column}`);
      if (column && !column.children.length) column.innerHTML = emptyColumnHTML(config.label);
      const wrapper = qs(`[data-status-column="${key}"]`);
      const count = pedidos.filter(order => order.statusUi === key).length;
      wrapper?.style.setProperty('--admin-column-count', `"${count}"`);
    });

    const openCount = pedidos.filter(order => order.statusUi !== 'entregue').length;
    const badge = qs('#badge-pedidos');
    if (badge) badge.textContent = String(openCount);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, payload => {
        const isInsert = payload.eventType === 'INSERT';
        carregarPedidosAdmin({
          highlightId: payload.new?.id || '',
          announce: isInsert
        });
      })
      .subscribe(result => {
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

    const { error } = await api
      .from('pedidos')
      .update({ status })
      .eq('id', pedidoId);

    if (select) select.disabled = false;

    if (error) {
      showToast(friendlyDbError(error, 'Não consegui atualizar o status.'), 'error');
      await carregarPedidosAdmin();
      return false;
    }

    state.pedidos = state.pedidos.map(order => order.id === pedidoId
      ? { ...order, status, statusUi }
      : order);
    renderizarPedidosAdmin(state.pedidos, { highlightId: pedidoId });
    showToast('Status do pedido atualizado.', 'success');
    return true;
  }

  async function carregarProdutosAdmin() {
    const api = client();
    if (!api) return [];
    const { data, error } = await api
      .from('produtos')
      .select('id, nome, preco, categoria, descricao, imagem, ativo, estoque, created_at')
      .order('created_at', { ascending: false });

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
    if (count) count.textContent = String(produtos.length);
    if (!list) return;

    if (!produtos.length) {
      list.innerHTML = '<p class="admin-empty-state">Nenhum produto cadastrado ainda.</p>';
      return;
    }

    list.innerHTML = produtos.map(product => `
      <article class="admin-product-simple-card">
        <span class="admin-product-thumb">
          ${product.imagem
            ? `<img src="${escapeHTML(product.imagem)}" alt="${escapeHTML(product.nome || '')}" loading="lazy" decoding="async">`
            : '<i class="fa-solid fa-box"></i>'}
        </span>
        <span>
          <strong>${escapeHTML(product.nome || 'Produto')}</strong>
          <small>${escapeHTML(product.categoria || 'Produtos')} - ${formatMoney(product.preco)}</small>
          <small>${product.ativo === false ? 'Desativado' : (Number(product.estoque) === 0 ? 'Esgotado' : 'Ativo')}</small>
        </span>
      </article>
    `).join('');
  }

  function safeFileName(value = 'produto') {
    return normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 70) || 'produto';
  }

  function imageExtension(file) {
    const fromName = text(file?.name).split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;
    if (file?.type === 'image/jpeg') return 'jpg';
    if (file?.type === 'image/png') return 'png';
    if (file?.type === 'image/webp') return 'webp';
    return 'png';
  }

  async function uploadImagemProduto(file) {
    const api = client();
    if (!api?.storage) throw new Error('Storage do Supabase indisponível.');
    if (!file) return '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Use uma imagem JPG, PNG ou WebP.');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('Use uma imagem de até 5 MB.');
    }

    const extension = imageExtension(file);
    const productName = qs('#prod-nome')?.value || file.name;
    const path = `${safeFileName(productName)}/${Date.now()}-${safeFileName(file.name)}.${extension}`;
    const { error } = await api.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || `image/${extension}`,
        upsert: false
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
      const publicUrl = file ? await uploadImagemProduto(file) : '';
      const estoqueValue = qs('#prod-estoque')?.value;
      const payload = {
        nome: qs('#prod-nome')?.value.trim() || '',
        preco: parsePrice(qs('#prod-preco')?.value || 0),
        categoria: qs('#prod-categoria')?.value || 'Produtos',
        descricao: qs('#prod-desc')?.value.trim() || '',
        imagem: publicUrl,
        ativo: true
      };
      if (estoqueValue !== '') payload.estoque = Math.max(0, Math.round(parsePrice(estoqueValue || 0)));

      if (!payload.nome || payload.preco < 0 || !payload.categoria) {
        throw new Error('Preencha nome, preço e categoria.');
      }

      const { error } = await api.from('produtos').insert(payload);
      if (error) throw error;

      form.reset();
      if (feedback) feedback.textContent = 'Produto salvo.';
      await carregarProdutosAdmin();
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
    container.innerHTML = rows.map(row => `
      <article class="admin-metric-card">
        <span>${escapeHTML(row.label)}</span>
        <strong>${escapeHTML(row.value)}</strong>
      </article>
    `).join('');
  }

  function renderFinanceiro() {
    const pedidos = state.pedidos;
    const total = pedidos.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const pagos = pedidos.filter(order => normalize(order.pagamento_status) === 'pago');
    renderMetric('#admin-finance-metrics', [
      { label: 'Pedidos', value: String(pedidos.length) },
      { label: 'Total vendido', value: formatMoney(total) },
      { label: 'Pagos no painel', value: String(pagos.length) }
    ]);
  }

  function renderEntregas() {
    const pedidos = state.pedidos;
    renderMetric('#admin-delivery-metrics', [
      { label: 'Pendentes', value: String(pedidos.filter(order => order.statusUi === 'pendente').length) },
      { label: 'Em preparo', value: String(pedidos.filter(order => order.statusUi === 'preparo').length) },
      { label: 'Em rota', value: String(pedidos.filter(order => order.statusUi === 'entrega').length) }
    ]);
  }

  function developerCardHTML(title, icon, rows) {
    return `
      <article class="admin-developer-card">
        <h2><i class="fa-solid fa-${escapeHTML(icon)}"></i> ${escapeHTML(title)}</h2>
        <dl>
          ${rows.map(row => `
            <div>
              <dt>${escapeHTML(row.label)}</dt>
              <dd>${escapeHTML(row.value)}</dd>
            </div>
          `).join('')}
        </dl>
      </article>
    `;
  }

  async function readAssetManifestSummary() {
    if (state.developerManifest) return state.developerManifest;
    const summary = {
      status: 'Não carregado',
      total: '0',
      generated: 'Sem data'
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
    const cacheKeys = 'caches' in window
      ? await caches.keys().catch(() => [])
      : [];
    const realtimeText = qs('#admin-realtime-status')?.textContent || 'Não iniciado';
    const profile = state.profile || {};

    container.innerHTML = [
      developerCardHTML('Acesso', 'user-shield', [
        { label: 'Conta', value: profile.email || state.user?.email || 'Sem email' },
        { label: 'Cargo', value: currentAdminRole() || 'Sem cargo' },
        { label: 'Perfil', value: profile.is_admin ? 'Administrador no Supabase' : 'Fallback por email conhecido' }
      ]),
      developerCardHTML('Supabase', 'database', [
        { label: 'Cliente', value: client() ? 'Carregado' : 'Indisponível' },
        { label: 'Realtime', value: realtimeText },
        { label: 'Pedidos em memória', value: String(state.pedidos.length) },
        { label: 'Produtos em memória', value: String(state.produtos.length) }
      ]),
      developerCardHTML('Assets e PWA', 'gears', [
        { label: 'Manifest de imagens', value: manifest.status },
        { label: 'Assets mapeados', value: manifest.total },
        { label: 'Gerado em', value: manifest.generated },
        { label: 'Caches do navegador', value: cacheKeys.length ? cacheKeys.join(', ') : 'Nenhum cache listado' }
      ])
    ].join('');
  }

  async function logoutAdmin() {
    const api = client();
    await api?.auth?.signOut();
    window.location.href = '../index.html';
  }

  function bindAdminEvents() {
    qsa('[data-admin-tab]').forEach(button => {
      button.addEventListener('click', () => renderAdminTab(button.dataset.adminTab || 'pedidos'));
    });

    qs('[data-admin-refresh-orders]')?.addEventListener('click', () => carregarPedidosAdmin());
    qs('[data-admin-refresh-products]')?.addEventListener('click', () => carregarProdutosAdmin());
    qs('[data-admin-refresh-developer]')?.addEventListener('click', () => {
      state.developerManifest = null;
      renderDeveloperAdmin();
    });
    qs('[data-admin-logout]')?.addEventListener('click', logoutAdmin);
    qs('#admin-product-form-basic')?.addEventListener('submit', salvarProdutoAdmin);
    qs('#admin-store-config-form')?.addEventListener('submit', event => {
      event.preventDefault();
      localStorage.setItem('ms_admin_store_config', JSON.stringify({
        whatsapp: qs('#admin-store-whatsapp')?.value || '',
        pix: qs('#admin-store-pix')?.value || '',
        savedAt: new Date().toISOString()
      }));
      showToast('Configuração salva neste navegador.', 'success');
    });

    document.body.addEventListener('change', event => {
      const select = event.target.closest('[data-admin-order-status]');
      if (!select) return;
      atualizarStatusPedido(select.dataset.adminOrderStatus, select.value);
    });
  }

  async function initAdminPanel() {
    bindAdminEvents();
    const canAccess = await verificarAcessoAdmin();
    if (!canAccess) return;

    const initialTab = text(location.hash).replace('#', '') || 'pedidos';
    renderAdminTab(initialTab);
    await Promise.all([
      carregarPedidosAdmin(),
      carregarProdutosAdmin()
    ]);
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

  window.switchTab = renderAdminTab;
  window.salvarProduto = salvarProdutoAdmin;
  window.logoutAdmin = logoutAdmin;

  initAdminPanel();
});
