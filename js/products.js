import { CONFIG } from './config.js';
import {
  appState,
  categoryKey,
  categoryIconName,
  escapeHTML,
  hasTrustedImage,
  href,
  isOffer,
  money,
  normalize,
  productImage,
  setProducts
} from './state.js';
import { fetchProducts } from './supabase-services.js';
import { setCartProducts } from './cart.js';

export function seedFallbackProducts() {
  if (appState.products.length) return appState.products;
  const products = CONFIG.fallbackProducts.map((product) => ({
    id: String(product.id),
    productId: product.id,
    name: product.name,
    category: product.category,
    categoryKey: categoryKey(product.category),
    price: Number(product.promoPrice || product.price || 0),
    originalPrice: Number(product.promoPrice ? product.price : product.originalPrice || 0),
    promoPrice: product.promoPrice || null,
    image: product.image,
    description: product.description || '',
    type: 'produto',
    featured: Boolean(product.featured),
    offerActive: Boolean(product.offerActive),
    canBuy: true,
    unavailable: false,
    stock: null,
    variations: product.variations || []
  }));
  setProducts(products, 'fallback');
  setCartProducts(products);
  return products;
}

export async function loadProducts() {
  const result = await fetchProducts();
  setProducts(result.products, result.source);
  setCartProducts(result.products);
  return result.products;
}

export function filterProducts(products = appState.products, options = {}) {
  const query = normalize(options.query || '');
  const category = options.category || 'all';
  return products.filter((product) => {
    const inCategory = category === 'all'
      || (category === 'ofertas' ? isOffer(product) : product.categoryKey === category || categoryKey(product.category) === category);
    const blob = normalize(`${product.name} ${product.category} ${product.description}`);
    return inCategory && (!query || blob.includes(query));
  });
}

function hasTrustedProductImage(product = {}) {
  return hasTrustedImage(product.image);
}

function productMediaHTML(product = {}, alt = product.name || 'Produto') {
  if (hasTrustedProductImage(product)) {
    return `<img src="${productImage(product)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async">`;
  }
  return `<span class="product-placeholder" aria-label="${escapeHTML(alt)}"><i class="fa-solid ${categoryIconName(product.categoryKey || product.category)}"></i></span>`;
}

function selectedProductImage(product = {}, variation = null) {
  return variation?.image ? { ...product, image: variation.image } : product;
}

function priceHTML(item = {}) {
  return `
    ${Number(item.originalPrice || 0) > Number(item.price || 0) ? `<span class="price-old" data-selected-old>${money(item.originalPrice)}</span>` : '<span class="price-old is-hidden" data-selected-old></span>'}
    <strong class="price" data-selected-price>${money(item.price)}</strong>
  `;
}

export function productCardHTML(product) {
  const disabled = product.canBuy === false;
  const offer = isOffer(product);
  const hasOptions = Boolean(product.variations?.length);
  return `
    <article class="product-card" data-product-card="${escapeHTML(product.id)}">
      <button class="product-card__media" type="button" data-product-open="${escapeHTML(product.id)}" aria-label="Ver ${escapeHTML(product.name)}">
        ${productMediaHTML(product)}
        ${offer ? '<span class="product-card__flag">Oferta</span>' : ''}
      </button>
      <div class="product-card__body">
        <button class="product-card__title" type="button" data-product-open="${escapeHTML(product.id)}">${escapeHTML(product.name)}</button>
        <small>${escapeHTML(product.category)}</small>
      </div>
      <div class="product-card__footer">
        <div>
          ${product.originalPrice > product.price ? `<div class="price-old">${money(product.originalPrice)}</div>` : ''}
          <div class="price">${money(product.price)}</div>
        </div>
        <button class="product-card__add ${hasOptions ? 'product-card__add--select' : ''}" type="button" ${hasOptions ? `data-product-open="${escapeHTML(product.id)}"` : `data-cart-add="${escapeHTML(product.id)}"`} ${disabled ? 'disabled' : ''} aria-label="${hasOptions ? 'Selecionar opcao de' : 'Adicionar'} ${escapeHTML(product.name)}">
          <i class="fa-solid ${hasOptions ? 'fa-sliders' : 'fa-plus'}"></i>
          ${hasOptions ? '<span>Selecionar</span>' : ''}
        </button>
      </div>
    </article>
  `;
}

export function renderProductGrid(target, products, emptyText = 'Nenhum produto encontrado.') {
  if (!target) return;
  if (!products.length) {
    target.innerHTML = `<div class="state"><i class="fa-solid fa-box-open"></i><strong>${emptyText}</strong></div>`;
    return;
  }
  target.innerHTML = products.map(productCardHTML).join('');
}

export function renderCategories(target, active = 'all') {
  if (!target) return;
  target.innerHTML = CONFIG.categories.slice(1).map((category) => `
    <button class="category-card ${active === category.key ? 'is-active' : ''}" type="button" data-category-filter="${category.key}">
      <i class="fa-solid ${category.icon}" aria-hidden="true"></i>
      <span>${escapeHTML(category.label)}</span>
    </button>
  `).join('');
}

export function renderCategoryChips(target, active = 'all') {
  if (!target) return;
  target.innerHTML = CONFIG.categories.map((category) => `
    <button class="chip ${active === category.key ? 'is-active' : ''}" type="button" data-category-filter="${category.key}">
      <i class="fa-solid ${category.icon}"></i>
      ${escapeHTML(category.label)}
    </button>
  `).join('');
}

export function openProduct(productId) {
  const product = appState.productMap.get(String(productId));
  const modal = document.querySelector('#product-modal');
  const body = document.querySelector('[data-product-modal-body]');
  if (!product || !modal || !body) return;
  const firstVariation = product.variations?.find((variation) => variation.canBuy !== false) || product.variations?.[0] || null;
  const selected = firstVariation || product;
  const variations = product.variations?.length ? `
    <div class="product-options" role="radiogroup" aria-label="Opcoes do produto">
      ${product.variations.map((variation) => `
        <button class="product-option ${String(variation.id) === String(firstVariation?.id) ? 'is-active' : ''}" type="button" data-product-option="${escapeHTML(variation.id)}" aria-pressed="${String(variation.id) === String(firstVariation?.id)}" ${variation.canBuy === false ? 'disabled' : ''}>
          <span>${escapeHTML(variation.name)}</span>
          <strong>${money(variation.price)}</strong>
        </button>
      `).join('')}
    </div>
  ` : '';
  body.innerHTML = `
    <div class="product-sheet" data-product-sheet="${escapeHTML(product.id)}">
      <div class="product-sheet__media card card--padded">
        <div class="product-detail-media" data-selected-media>${productMediaHTML(selectedProductImage(product, firstVariation), firstVariation?.name || product.name)}</div>
      </div>
      <div class="product-sheet__info card card--padded form">
        <span class="eyebrow">${escapeHTML(product.category)}</span>
        <h2>${escapeHTML(product.name)}</h2>
        <p data-selected-summary>${escapeHTML(firstVariation ? `Opcao selecionada: ${firstVariation.name}` : (product.description || 'Produto Monte Sinai com entrega local.'))}</p>
        <div class="product-sheet__price">
          ${priceHTML(selected)}
        </div>
        ${variations}
        <div class="product-sheet__buy">
          <div class="qty-control qty-control--large" aria-label="Quantidade">
            <button type="button" data-product-qty-dec>-</button>
            <input value="1" inputmode="numeric" data-product-qty aria-label="Quantidade">
            <button type="button" data-product-qty-inc>+</button>
          </div>
          <button class="btn btn--primary" type="button" data-cart-add="${escapeHTML(product.id)}" data-modal-add-product ${firstVariation ? `data-variation-id="${escapeHTML(firstVariation.id)}"` : ''}>
            <i class="fa-solid fa-cart-plus"></i>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  `;
  modal.hidden = false;
  document.body.classList.add('is-scroll-locked');
}

export function bindProductUI() {
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-product-open]');
    if (open) openProduct(open.dataset.productOpen);

    const option = event.target.closest('[data-product-option]');
    if (option) {
      const sheet = option.closest('[data-product-sheet]');
      const product = appState.productMap.get(String(sheet?.dataset.productSheet || ''));
      const variation = product?.variations?.find((item) => String(item.id) === String(option.dataset.productOption));
      if (!product || !variation) return;
      sheet.querySelectorAll('[data-product-option]').forEach((button) => {
        const active = button === option;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      sheet.querySelector('[data-selected-price]').textContent = money(variation.price);
      const old = sheet.querySelector('[data-selected-old]');
      if (old) {
        old.textContent = Number(variation.originalPrice || 0) > Number(variation.price || 0) ? money(variation.originalPrice) : '';
        old.classList.toggle('is-hidden', !(Number(variation.originalPrice || 0) > Number(variation.price || 0)));
      }
      sheet.querySelector('[data-selected-summary]').textContent = `Opcao selecionada: ${variation.name}`;
      sheet.querySelector('[data-selected-media]').innerHTML = productMediaHTML(selectedProductImage(product, variation), variation.name || product.name);
      const add = sheet.querySelector('[data-modal-add-product]');
      if (add) add.dataset.variationId = variation.id;
    }

    const addFromModal = event.target.closest('[data-modal-add-product]');
    if (addFromModal) {
      window.setTimeout(() => {
        const productModal = document.querySelector('#product-modal');
        if (productModal) productModal.hidden = true;
        document.body.classList.remove('is-scroll-locked');
      }, 80);
    }

    const qtyInc = event.target.closest('[data-product-qty-inc]');
    if (qtyInc) {
      const input = document.querySelector('[data-product-qty]');
      if (input) input.value = String(Math.max(1, Number(input.value || 1) + 1));
    }

    const qtyDec = event.target.closest('[data-product-qty-dec]');
    if (qtyDec) {
      const input = document.querySelector('[data-product-qty]');
      if (input) input.value = String(Math.max(1, Number(input.value || 1) - 1));
    }
  });
}
