import { CONFIG } from './config.js';
import { appState, escapeHTML, href, money, roleAllowsPanel } from './state.js';
import {
  adminDeleteProduct,
  adminFetchOrders,
  adminFetchProducts,
  adminSaveProduct,
  adminUpdateOrder,
  adminUploadProductImage,
  fetchCurrentProfile
} from './supabase-services.js';

let adminState = {
  tab: 'dashboard',
  products: [],
  orders: []
};

function adminRoot() {
  return document.querySelector('[data-page-root]') || document.querySelector('#app');
}

function adminMenuHTML() {
  const items = [
    ['dashboard', 'fa-chart-line', 'Dashboard'],
    ['orders', 'fa-receipt', 'Pedidos'],
    ['products', 'fa-boxes-stacked', 'Produtos'],
    ['finance', 'fa-wallet', 'Financeiro'],
    ['config', 'fa-gear', 'Configuracoes']
  ];
  return items.map(([tab, icon, label]) => `
    <button type="button" class="${adminState.tab === tab ? 'is-active' : ''}" data-admin-tab="${tab}">
      <i class="fa-solid ${icon}"></i>${label}
    </button>
  `).join('');
}

function statusSelect(order) {
  return `
    <select class="select" data-admin-order-status="${escapeHTML(order.id)}">
      ${CONFIG.orderStatuses.map((status) => `<option value="${status.value}" ${status.value === order.status ? 'selected' : ''}>${status.label}</option>`).join('')}
    </select>
  `;
}

function paymentSelect(order) {
  return `
    <select class="select" data-admin-order-payment="${escapeHTML(order.id)}">
      ${CONFIG.paymentStatuses.map((status) => `<option value="${status}" ${status === order.paymentStatus ? 'selected' : ''}>${status}</option>`).join('')}
    </select>
  `;
}

function dashboardHTML() {
  const today = new Date().toDateString();
  const todayOrders = adminState.orders.filter((order) => new Date(order.createdAt).toDateString() === today);
  const revenue = adminState.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  return `
    <section class="admin-grid">
      <article class="admin-card"><span>Pedidos hoje</span><strong>${todayOrders.length}</strong></article>
      <article class="admin-card"><span>Faturamento</span><strong>${money(revenue)}</strong></article>
      <article class="admin-card"><span>Ticket medio</span><strong>${money(adminState.orders.length ? revenue / adminState.orders.length : 0)}</strong></article>
      <article class="admin-card"><span>Produtos</span><strong>${adminState.products.length}</strong></article>
    </section>
    <section class="admin-workspace">
      <div class="admin-panel">
        <div class="section-head"><h2>Pedidos recentes</h2><button class="btn btn--primary" type="button" data-admin-tab="orders">Ver todos</button></div>
        ${ordersTableHTML(adminState.orders.slice(0, 6))}
      </div>
      <div class="admin-panel">
        <h2>Produtos em destaque</h2>
        <div class="form" style="margin-top:16px">${adminState.products.slice(0, 5).map((product) => `<div class="section-head"><span>${escapeHTML(product.name)}</span><strong>${money(product.price)}</strong></div>`).join('')}</div>
      </div>
    </section>
  `;
}

function ordersTableHTML(orders = adminState.orders) {
  if (!orders.length) return '<div class="state state--dark"><strong>Nenhum pedido encontrado.</strong></div>';
  return `
    <div class="table-scroll">
      <table class="admin-table">
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Status</th><th>Pagamento</th><th></th></tr></thead>
        <tbody>
          ${orders.map((order) => `
            <tr>
              <td>${escapeHTML(order.code)}</td>
              <td>${escapeHTML(order.customer?.name || '')}</td>
              <td>${money(order.total)}</td>
              <td>${statusSelect(order)}</td>
              <td>${paymentSelect(order)}</td>
              <td><button class="btn btn--primary" type="button" data-admin-save-order="${escapeHTML(order.id)}">Salvar</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function productsHTML() {
  return `
    <section class="admin-workspace">
      <div class="admin-panel">
        <div class="section-head"><h2>Produtos</h2><button class="btn btn--primary" type="button" data-admin-new-product>Novo produto</button></div>
        <div class="table-scroll">
          <table class="admin-table">
            <thead><tr><th>Nome</th><th>Categoria</th><th>Preco</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${adminState.products.map((product) => `
                <tr>
                  <td>${escapeHTML(product.name)}</td>
                  <td>${escapeHTML(product.category)}</td>
                  <td>${money(product.price)}</td>
                  <td>${product.canBuy ? 'Ativo' : 'Inativo'}</td>
                  <td>
                    <button class="btn btn--soft" type="button" data-admin-edit-product="${escapeHTML(product.id)}">Editar</button>
                    <button class="btn btn--danger" type="button" data-admin-delete-product="${escapeHTML(product.id)}">Excluir</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="admin-panel">
        <form class="form" data-admin-product-form>
          <input type="hidden" name="id" data-product-id>
          <h2>Adicionar produto</h2>
          <div class="field"><label>Nome</label><input class="input" name="name" data-product-name required></div>
          <div class="form-grid">
            <div class="field"><label>Categoria</label><input class="input" name="category" data-product-category required></div>
            <div class="field"><label>Preco</label><input class="input" name="price" data-product-price inputmode="decimal" required></div>
            <div class="field"><label>Estoque</label><input class="input" name="stock" data-product-stock inputmode="numeric"></div>
            <div class="field"><label>Promocional</label><input class="input" name="promoPrice" data-product-promo inputmode="decimal"></div>
          </div>
          <div class="field"><label>Descricao</label><textarea class="textarea" name="description" data-product-description></textarea></div>
          <div class="field"><label>Imagem URL</label><input class="input" name="image" data-product-image></div>
          <div class="field"><label>Upload</label><input class="input" type="file" accept="image/*" data-product-file></div>
          <label class="chip"><input type="checkbox" name="featured" data-product-featured> Destaque</label>
          <label class="chip"><input type="checkbox" name="offerActive" data-product-offer> Oferta ativa</label>
          <button class="btn btn--primary" type="submit">Salvar produto</button>
        </form>
      </div>
    </section>
  `;
}

function financeHTML() {
  const revenue = adminState.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const paid = adminState.orders.filter((order) => order.paymentStatus === 'Pago').reduce((sum, order) => sum + Number(order.total || 0), 0);
  return `
    <section class="admin-grid">
      <article class="admin-card"><span>Receita registrada</span><strong>${money(revenue)}</strong></article>
      <article class="admin-card"><span>Recebido</span><strong>${money(paid)}</strong></article>
      <article class="admin-card"><span>Pendente</span><strong>${money(revenue - paid)}</strong></article>
      <article class="admin-card"><span>Pedidos</span><strong>${adminState.orders.length}</strong></article>
    </section>
  `;
}

function configHTML() {
  return `
    <section class="admin-panel form">
      <span class="eyebrow">Configuracoes</span>
      <h2>Operacao da loja</h2>
      <div class="form-grid">
        <div class="field"><label>WhatsApp</label><input class="input" value="${CONFIG.store.whatsapp}" readonly></div>
        <div class="field"><label>Taxa de entrega</label><input class="input" value="${CONFIG.store.deliveryFee}" readonly></div>
      </div>
      <p>Configuracoes persistentes continuam na tabela site_configuracoes e podem ser ampliadas nesta base modular.</p>
    </section>
  `;
}

function activePanelHTML() {
  if (adminState.tab === 'orders') return `<section class="admin-panel"><div class="section-head"><h2>Pedidos</h2></div>${ordersTableHTML()}</section>`;
  if (adminState.tab === 'products') return productsHTML();
  if (adminState.tab === 'finance') return financeHTML();
  if (adminState.tab === 'config') return configHTML();
  return dashboardHTML();
}

export async function renderAdminPage(root) {
  document.body.dataset.adminPage = 'true';
  root.innerHTML = '<div class="loading state--dark"><i class="fa-solid fa-spinner fa-spin"></i><strong>Carregando painel</strong></div>';
  let profile = null;
  try {
    profile = await fetchCurrentProfile();
  } catch (error) {
    root.innerHTML = `
      <section class="admin-shell">
        <aside class="admin-sidebar"><h1>Monte Sinai</h1></aside>
        <main class="admin-main">
          <div class="state state--dark"><i class="fa-solid fa-triangle-exclamation"></i><strong>Nao foi possivel carregar seu perfil</strong><p>${escapeHTML(error.message || 'Verifique sua sessao e tente novamente.')}</p><a class="btn btn--primary" href="${href('login')}?next=painel">Entrar novamente</a></div>
        </main>
      </section>
    `;
    return;
  }
  if (!profile || !roleAllowsPanel(profile.role)) {
    const action = appState.user
      ? `<a class="btn btn--soft" href="${href('perfil')}">Ver meu perfil</a>`
      : `<a class="btn btn--primary" href="${href('login')}?next=painel">Entrar como administrador</a>`;
    root.innerHTML = `
      <section class="admin-shell">
        <aside class="admin-sidebar"><h1>Monte Sinai</h1></aside>
        <main class="admin-main">
          <div class="state state--dark"><i class="fa-solid fa-lock"></i><strong>Acesso administrativo necessario</strong><p>Entre com uma conta que tenha perfil equipe, motoboy, admin ou developer.</p>${action}</div>
        </main>
      </section>
    `;
    return;
  }

  try {
    const [products, orders] = await Promise.all([adminFetchProducts(), adminFetchOrders()]);
    adminState.products = products;
    adminState.orders = orders;
  } catch (error) {
    document.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message || 'Falha ao carregar painel.', type: 'error' } }));
  }

  root.innerHTML = `
    <section class="admin-shell">
      <aside class="admin-sidebar">
        <img src="../${CONFIG.store.logo}" alt="Monte Sinai" style="width:140px">
        <p>${escapeHTML(profile.name || profile.email)}</p>
        <div class="admin-menu">${adminMenuHTML()}<a href="../index.html"><i class="fa-solid fa-store"></i> Loja</a></div>
      </aside>
      <main class="admin-main">
        <div class="section-head"><div><span class="eyebrow">Painel administrativo</span><h1>${adminState.tab === 'dashboard' ? 'Dashboard' : adminState.tab}</h1></div></div>
        <div data-admin-panel>${activePanelHTML()}</div>
      </main>
    </section>
  `;
}

function fillProductForm(product) {
  const form = document.querySelector('[data-admin-product-form]');
  if (!form) return;
  form.querySelector('[data-product-id]').value = product?.productId || product?.id || '';
  form.querySelector('[data-product-name]').value = product?.name || '';
  form.querySelector('[data-product-category]').value = product?.category || '';
  form.querySelector('[data-product-price]').value = product?.price || '';
  form.querySelector('[data-product-stock]').value = product?.stock ?? '';
  form.querySelector('[data-product-promo]').value = product?.promoPrice || '';
  form.querySelector('[data-product-description]').value = product?.description || '';
  form.querySelector('[data-product-image]').value = product?.image || '';
  form.querySelector('[data-product-featured]').checked = Boolean(product?.featured);
  form.querySelector('[data-product-offer]').checked = Boolean(product?.offerActive);
}

export function bindAdmin() {
  document.addEventListener('click', async (event) => {
    const tab = event.target.closest('[data-admin-tab]');
    if (tab) {
      adminState.tab = tab.dataset.adminTab;
      await renderAdminPage(adminRoot());
    }

    const edit = event.target.closest('[data-admin-edit-product]');
    if (edit) fillProductForm(adminState.products.find((product) => String(product.id) === String(edit.dataset.adminEditProduct)));

    const create = event.target.closest('[data-admin-new-product]');
    if (create) fillProductForm(null);

    const remove = event.target.closest('[data-admin-delete-product]');
    if (remove && confirm('Excluir este produto?')) {
      await adminDeleteProduct(remove.dataset.adminDeleteProduct);
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Produto excluido.', type: 'success' } }));
      await renderAdminPage(adminRoot());
    }

    const saveOrder = event.target.closest('[data-admin-save-order]');
    if (saveOrder) {
      const id = saveOrder.dataset.adminSaveOrder;
      const status = document.querySelector(`[data-admin-order-status="${CSS.escape(id)}"]`)?.value;
      const paymentStatus = document.querySelector(`[data-admin-order-payment="${CSS.escape(id)}"]`)?.value;
      try {
        saveOrder.disabled = true;
        await adminUpdateOrder(id, { status, paymentStatus });
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Pedido atualizado.', type: 'success' } }));
        await renderAdminPage(adminRoot());
      } catch (error) {
        saveOrder.disabled = false;
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message || 'Falha ao atualizar pedido.', type: 'error' } }));
      }
    }
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-admin-product-form]');
    if (!form) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const file = form.querySelector('[data-product-file]')?.files?.[0];
    try {
      if (file) data.image = await adminUploadProductImage(file, data.name);
      data.active = true;
      await adminSaveProduct(data);
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Produto salvo.', type: 'success' } }));
      await renderAdminPage(adminRoot());
    } catch (error) {
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message || 'Falha ao salvar produto.', type: 'error' } }));
    }
  });
}
