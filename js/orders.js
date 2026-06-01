import { CONFIG } from './config.js';
import { appState, asset, categoryIconName, escapeHTML, hasTrustedImage, href, money } from './state.js';
import { fetchCustomerOrders, trackOrder } from './supabase-services.js';

function orderStatusClass(status = '') {
  const clean = status.toLowerCase();
  if (clean.includes('entregue')) return 'is-success';
  if (clean.includes('cancel')) return 'is-danger';
  if (clean.includes('entrega') || clean.includes('prepar')) return 'is-warning';
  return '';
}

function orderStepIndex(status = '') {
  const clean = status.toLowerCase();
  if (clean.includes('cancel')) return -1;
  if (clean.includes('entregue')) return 3;
  if (clean.includes('entrega') || clean.includes('saiu')) return 2;
  if (clean.includes('prepar') || clean.includes('separ')) return 1;
  return 0;
}

function orderProgressHTML(order = {}) {
  const current = orderStepIndex(order.status || 'Recebido');
  const cancelled = current < 0;
  const steps = [
    ['Recebido', 'fa-receipt', 'Pedido confirmado'],
    ['Separacao', 'fa-box-open', 'Produtos separados'],
    ['A caminho', 'fa-motorcycle', 'Saiu para entrega'],
    ['Entregue', 'fa-house-circle-check', 'Pedido concluido']
  ];
  return `
    <div class="order-progress ${cancelled ? 'is-cancelled' : ''}" style="--progress-step:${Math.max(current, 0)}">
      ${steps.map(([label, icon, text], index) => `
        <div class="order-progress__step ${index < current ? 'is-done' : ''} ${index === current && !cancelled ? 'is-active' : ''} ${index > current ? 'is-pending' : ''}">
          <i class="fa-solid ${icon}"></i>
          <strong>${label}</strong>
          <span>${text}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function orderCardHTML(order) {
  const items = order.items?.length ? order.items : [];
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const createdAt = new Date(order.createdAt || Date.now()).toLocaleString('pt-BR');
  return `
    <article class="card card--padded form order-card">
      <div class="order-card__top">
        <div>
          <span class="eyebrow">Pedido ${escapeHTML(order.code || order.id)}</span>
          <h3>${escapeHTML(order.customer?.name || 'Cliente')}</h3>
          <p>${createdAt}</p>
        </div>
        <div class="order-card__status">
          <span class="status-pill ${orderStatusClass(order.status)}">${escapeHTML(order.status || 'Recebido')}</span>
          <strong class="price">${money(order.total)}</strong>
        </div>
      </div>
      ${orderProgressHTML(order)}
      <div class="order-summary">
        <div><i class="fa-solid fa-basket-shopping"></i><span>${itemCount || items.length} item${(itemCount || items.length) === 1 ? '' : 's'}</span></div>
        <div><i class="fa-solid fa-credit-card"></i><span>${escapeHTML(order.paymentStatus || 'Pagamento pendente')}</span></div>
        <div><i class="fa-solid fa-location-dot"></i><span>${escapeHTML(order.customer?.address || CONFIG.store.address)}</span></div>
      </div>
      <div class="order-items">
        ${items.slice(0, 4).map((item) => `
          <div class="order-item">
            ${hasTrustedImage(item.image)
              ? `<img src="${asset(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy">`
              : `<span class="cart-item__placeholder" aria-hidden="true"><i class="fa-solid ${categoryIconName(item.name)}"></i></span>`}
            <div><strong>${escapeHTML(item.name)}</strong><p>${Number(item.quantity || 1)} un. x ${money(item.price)}</p></div>
            <strong>${money(Number(item.quantity || 1) * Number(item.price || 0))}</strong>
          </div>
        `).join('')}
      </div>
      <div class="order-card__actions">
        <a class="btn btn--soft" href="${href('produtos')}"><i class="fa-solid fa-rotate-right"></i>Comprar novamente</a>
        <a class="btn btn--primary" href="https://wa.me/${CONFIG.store.whatsapp}?text=${encodeURIComponent(`Preciso de ajuda com o pedido ${order.code || order.id}`)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i>Suporte</a>
      </div>
    </article>
  `;
}

export async function renderOrderList(target, options = {}) {
  if (!target) return;
  target.innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i><strong>Carregando pedidos</strong></div>';
  const orders = await fetchCustomerOrders();
  appState.orders = orders;
  if (options.profileSummary) {
    document.querySelector('[data-profile-order-count]')?.replaceChildren(document.createTextNode(String(orders.length)));
    const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    document.querySelector('[data-profile-total]')?.replaceChildren(document.createTextNode(money(total)));
  }
  const visibleOrders = options.limit ? orders.slice(0, Number(options.limit)) : orders;
  target.innerHTML = orders.length
    ? `<div class="form">${visibleOrders.map(orderCardHTML).join('')}</div>`
    : '<div class="state"><i class="fa-solid fa-receipt"></i><strong>Nenhum pedido encontrado</strong><p>Pedidos finalizados aparecem aqui.</p></div>';
}

export async function renderOrdersPage(root) {
  root.innerHTML = `
    <section class="orders-layout">
      <div>
        <div class="section-head">
          <div class="section-title"><span class="eyebrow">Acompanhamento</span><h1>Meus pedidos</h1></div>
        </div>
        <div data-orders-list></div>
      </div>
      <aside class="card card--padded form">
        <form class="form" data-track-order-form>
          <span class="eyebrow">Consultar pedido</span>
          <h2>Buscar por codigo</h2>
          <div class="field"><label for="track-code">Codigo</label><input class="input" id="track-code" name="code" placeholder="MS-260528-ABC123" required></div>
          <div class="field"><label for="track-phone">WhatsApp</label><input class="input" id="track-phone" name="phone" inputmode="tel" required></div>
          <button class="btn btn--primary" type="submit">Ver pedido</button>
        </form>
        <div class="trust-card card"><i class="fa-solid fa-circle-info"></i><div><strong>Pedido visitante</strong><span>Use o codigo recebido no checkout.</span></div></div>
        <div data-track-result></div>
      </aside>
    </section>
  `;
  await renderOrderList(root.querySelector('[data-orders-list]'));
}

export function bindOrders() {
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-track-order-form]');
    if (!form) return;
    event.preventDefault();
    const result = document.querySelector('[data-track-result]');
    const data = Object.fromEntries(new FormData(form));
    result.innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i><strong>Consultando</strong></div>';
    try {
      const order = await trackOrder(data.code, data.phone);
      result.innerHTML = order ? orderCardHTML(order) : '<div class="state"><strong>Pedido nao encontrado</strong></div>';
    } catch (error) {
      result.innerHTML = `<div class="state"><strong>${escapeHTML(error.message || 'Falha ao consultar pedido.')}</strong></div>`;
    }
  });
}
