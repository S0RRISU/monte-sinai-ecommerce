import { appState, asset, cartTotals, categoryIconName, emit, escapeHTML, hasTrustedImage, money, saveCart } from './state.js';

export function setCartProducts(products) {
  appState.productMap = new Map(products.map((product) => [String(product.id), product]));
}

export function addToCart(productId, quantity = 1, variationId = '') {
  const product = appState.productMap.get(String(productId));
  if (!product || product.canBuy === false) return false;
  if (product.variations?.length && !variationId) {
    emit('toast', { message: 'Selecione uma opcao do produto.', type: 'error' });
    return false;
  }
  const variation = variationId ? product.variations?.find((item) => String(item.id) === String(variationId)) : null;
  const id = variation ? `${product.id}:${variation.id}` : String(product.id);
  const existing = appState.cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += Number(quantity || 1);
  } else {
    appState.cart.push({
      id,
      productId: product.productId || (/^[0-9a-f-]{36}$/i.test(product.id) ? product.id : null),
      catalogId: product.id,
      variationId: variation?.id || null,
      variationName: variation?.name || '',
      name: variation ? `${product.name} - ${variation.name}` : product.name,
      category: product.category,
      price: Number(variation?.price || product.price || 0),
      image: variation?.image || product.image,
      quantity: Number(quantity || 1)
    });
  }
  saveCart();
  emit('toast', { message: 'Produto adicionado.', type: 'success' });
  return true;
}

export function updateCartQuantity(itemId, quantity) {
  const next = Math.max(0, Number(quantity || 0));
  if (next <= 0) {
    removeFromCart(itemId);
    return;
  }
  const item = appState.cart.find((cartItem) => cartItem.id === itemId);
  if (item) item.quantity = next;
  saveCart();
}

export function removeFromCart(itemId) {
  appState.cart = appState.cart.filter((item) => item.id !== itemId);
  saveCart();
}

export function clearCart() {
  appState.cart = [];
  saveCart();
}

function cartItemHTML(item) {
  return `
    <article class="cart-item">
      ${hasTrustedImage(item.image)
        ? `<img src="${asset(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy">`
        : `<span class="cart-item__placeholder" aria-hidden="true"><i class="fa-solid ${categoryIconName(item.category)}"></i></span>`}
      <div>
        <strong>${escapeHTML(item.name)}</strong>
        <div class="muted">${money(item.price)}</div>
        <div class="qty-control" aria-label="Quantidade de ${escapeHTML(item.name)}">
          <button type="button" data-cart-dec="${escapeHTML(item.id)}">-</button>
          <input value="${Number(item.quantity || 1)}" inputmode="numeric" data-cart-qty="${escapeHTML(item.id)}" aria-label="Quantidade">
          <button type="button" data-cart-inc="${escapeHTML(item.id)}">+</button>
        </div>
      </div>
      <button class="icon-btn" type="button" data-cart-remove="${escapeHTML(item.id)}" aria-label="Remover ${escapeHTML(item.name)}">
        <i class="fa-solid fa-trash"></i>
      </button>
    </article>
  `;
}

export function renderCart() {
  const count = cartTotals().count;
  document.querySelectorAll('[data-cart-count]').forEach((target) => {
    target.textContent = String(count);
  });

  const body = document.querySelector('[data-cart-body]');
  if (!body) return;
  if (!appState.cart.length) {
    body.innerHTML = '<div class="state"><i class="fa-solid fa-basket-shopping"></i><strong>Carrinho vazio</strong><p>Escolha produtos para montar seu pedido.</p></div>';
  } else {
    body.innerHTML = appState.cart.map(cartItemHTML).join('');
  }

  const totals = cartTotals();
  document.querySelectorAll('[data-cart-subtotal]').forEach((target) => {
    target.textContent = money(totals.subtotal);
  });
  document.querySelectorAll('[data-cart-delivery]').forEach((target) => {
    target.textContent = money(totals.delivery);
  });
  document.querySelectorAll('[data-cart-total]').forEach((target) => {
    target.textContent = money(totals.total);
  });
}

export function bindCart() {
  document.addEventListener('cart:updated', renderCart);

  document.addEventListener('click', (event) => {
    const add = event.target.closest('[data-cart-add]');
    if (add) {
      const modalVariation = add.matches('[data-modal-add-product]')
        ? document.querySelector('[data-product-variation]')?.value || ''
        : '';
      const modalQuantity = add.matches('[data-modal-add-product]')
        ? Number(document.querySelector('[data-product-qty]')?.value || 1)
        : 1;
      addToCart(add.dataset.cartAdd, modalQuantity, add.dataset.variationId || modalVariation);
    }

    const remove = event.target.closest('[data-cart-remove]');
    if (remove) removeFromCart(remove.dataset.cartRemove);

    const inc = event.target.closest('[data-cart-inc]');
    if (inc) {
      const item = appState.cart.find((cartItem) => cartItem.id === inc.dataset.cartInc);
      updateCartQuantity(inc.dataset.cartInc, Number(item?.quantity || 0) + 1);
    }

    const dec = event.target.closest('[data-cart-dec]');
    if (dec) {
      const item = appState.cart.find((cartItem) => cartItem.id === dec.dataset.cartDec);
      updateCartQuantity(dec.dataset.cartDec, Number(item?.quantity || 0) - 1);
    }
  });

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cart-qty]');
    if (input) updateCartQuantity(input.dataset.cartQty, input.value);
  });
}
