import { appState, asset, cartTotals, categoryIconName, escapeHTML, hasTrustedImage, href, money, orderCode, onlyDigits } from './state.js';
import { clearCart } from './cart.js';
import { createOrder, fetchCurrentProfile, whatsappOrderUrl } from './supabase-services.js';

function summaryHTML() {
  const totals = cartTotals();
  return `
    <aside class="card card--padded form">
      <span class="eyebrow">Resumo</span>
      <h2>Seu carrinho</h2>
      <div>
        ${appState.cart.map((item) => `
          <div class="cart-item">
            ${hasTrustedImage(item.image)
              ? `<img src="${asset(item.image)}" alt="${escapeHTML(item.name)}">`
              : `<span class="cart-item__placeholder" aria-hidden="true"><i class="fa-solid ${categoryIconName(item.category)}"></i></span>`}
            <div><strong>${escapeHTML(item.name)}</strong><p>${item.quantity} x ${money(item.price)}</p></div>
            <strong>${money(Number(item.quantity) * Number(item.price))}</strong>
          </div>
        `).join('')}
      </div>
      <div class="section-title">
        <p>Subtotal: <strong data-cart-subtotal>${money(totals.subtotal)}</strong></p>
        <p>Entrega: <strong data-cart-delivery>${money(totals.delivery)}</strong></p>
        <h2>Total: <span data-cart-total>${money(totals.total)}</span></h2>
      </div>
      <a class="btn btn--soft" href="${href('produtos')}">Continuar comprando</a>
    </aside>
  `;
}

export async function renderCheckout(root) {
  if (!appState.cart.length) {
    root.innerHTML = `
      <div class="state">
        <i class="fa-solid fa-cart-shopping"></i>
        <strong>Seu carrinho esta vazio</strong>
        <a class="btn btn--primary" href="${href('produtos')}">Ver produtos</a>
      </div>
    `;
    return;
  }
  const profile = await fetchCurrentProfile();
  const code = orderCode();
  root.innerHTML = `
    <section class="checkout-steps" aria-label="Etapas do pedido">
      <div class="is-active"><i class="fa-solid fa-cart-shopping"></i><span>Carrinho</span></div>
      <div class="is-active"><i class="fa-solid fa-location-dot"></i><span>Entrega</span></div>
      <div><i class="fa-solid fa-check"></i><span>Confirmacao</span></div>
    </section>
    <section class="checkout-layout">
      <div class="card card--padded">
        <form class="form" data-checkout-form>
          <span class="eyebrow">Finalizar pedido</span>
          <h1>Entrega Monte Sinai</h1>
          <input type="hidden" name="code" value="${code}">
          <div class="form-grid">
            <div class="field"><label for="customer-name">Nome</label><input class="input" id="customer-name" name="name" value="${escapeHTML(profile?.name || '')}" required></div>
            <div class="field"><label for="customer-phone">WhatsApp</label><input class="input" id="customer-phone" name="phone" value="${escapeHTML(profile?.phone || '')}" inputmode="tel" required></div>
            <div class="field"><label for="customer-email">Email</label><input class="input" id="customer-email" name="email" type="email" value="${escapeHTML(profile?.email || '')}"></div>
          </div>
          <div class="field"><label for="customer-address">Endereco de entrega</label><input class="input" id="customer-address" name="address" value="${escapeHTML(profile?.address || '')}" required></div>
          <fieldset class="field">
            <legend>Forma de pagamento</legend>
            <div class="payment-options">
              <label class="choice-card"><input type="radio" name="payment" value="Pagar na entrega" checked><span><i class="fa-solid fa-hand-holding-dollar"></i><strong>Pagar na entrega</strong><small>Combine com a loja</small></span></label>
              <label class="choice-card"><input type="radio" name="payment" value="Pix"><span><i class="fa-brands fa-pix"></i><strong>Pix</strong><small>Confirmacao rapida</small></span></label>
              <label class="choice-card"><input type="radio" name="payment" value="Cartao na entrega"><span><i class="fa-solid fa-credit-card"></i><strong>Cartao</strong><small>Maquininha na entrega</small></span></label>
            </div>
          </fieldset>
          <div class="field"><label for="notes">Observacao</label><textarea class="textarea" id="notes" name="notes" placeholder="Referencia, troco ou detalhe da entrega"></textarea></div>
          <button class="btn btn--primary" type="submit"><i class="fa-solid fa-check"></i>Finalizar pedido</button>
        </form>
      </div>
      ${summaryHTML()}
    </section>
  `;
}

export function bindCheckout() {
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-checkout-form]');
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    try {
      if (onlyDigits(data.phone).length < 10) throw new Error('Informe um WhatsApp valido.');
      const totals = cartTotals();
      const order = await createOrder({
        customer: {
          code: data.code,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address
        },
        payment: data.payment,
        notes: data.notes,
        items: appState.cart,
        totals
      });
      clearCart();
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: `Pedido ${order.code} criado.`, type: 'success' } }));
      window.open(whatsappOrderUrl(order), '_blank', 'noopener');
      location.href = href('pedidos');
    } catch (error) {
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: error.message || 'Falha ao finalizar pedido.', type: 'error' } }));
    } finally {
      button.disabled = false;
    }
  });
}
