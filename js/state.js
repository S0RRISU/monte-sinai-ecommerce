import { CONFIG } from './config.js';

export const STORAGE = {
  cart: 'ms_cart_v3',
  orders: 'ms_orders_v2',
  profile: 'ms_customer_v3',
  accounts: 'ms_saved_accounts_v1',
  avatars: 'ms_customer_avatars_v1',
  settings: 'ms_site_settings_v2',
  theme: 'ms_theme_preference_v1'
};

export const appState = {
  products: [],
  productMap: new Map(),
  cart: readJSON(STORAGE.cart, []),
  user: null,
  profile: null,
  orders: [],
  productSource: 'fallback',
  activeCategory: 'all'
};

export const THEMES = ['system', 'light', 'dark'];
export const SITE_PREFERENCES = {
  density: ['comfortable', 'compact'],
  cards: ['premium', 'flat'],
  motion: ['normal', 'reduced'],
  menu: ['complete', 'clean'],
  productView: ['visual', 'simple']
};

export const DEFAULT_SITE_PREFERENCES = {
  density: 'comfortable',
  cards: 'premium',
  motion: 'normal',
  menu: 'complete',
  productView: 'visual'
};

export function isPagePath() {
  return location.pathname.replaceAll('\\', '/').includes('/pages/');
}

export function asset(path = '') {
  if (!path) return '';
  if (/^(https?:|data:|blob:|\/)/i.test(path)) return path;
  return isPagePath() ? `../${path.replace(/^\.?\//, '')}` : path.replace(/^\.?\//, '');
}

export function href(page = 'home') {
  if (page === 'home' || page === 'index') return isPagePath() ? '../index.html' : 'index.html';
  return isPagePath() ? `${page}.html` : `pages/${page}.html`;
}

export function currentPage() {
  return document.body.dataset.page || 'home';
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

export function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function emit(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, handler) {
  document.addEventListener(name, handler);
}

export function money(value = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function canonicalRole(role = '', options = {}) {
  const clean = normalize(role || options.adminRole || '');
  if (['developer', 'dev', 'programador'].includes(clean)) return 'developer';
  if (['admin', 'owner', 'administrator', 'administrador', 'manager'].includes(clean)) return 'admin';
  if (['equipe', 'staff', 'atendente', 'operador'].includes(clean)) return 'equipe';
  if (['motoboy', 'entregador', 'delivery'].includes(clean)) return 'motoboy';
  if (options.isAdmin === true) return 'admin';
  return 'cliente';
}

export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function slugify(value = '') {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
}

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

export function categoryKey(value = '') {
  const clean = normalize(value);
  if (clean.includes('agua')) return 'agua';
  if (clean.includes('gas')) return 'gas';
  if (clean.includes('limpeza') || clean.includes('lavanderia') || clean.includes('cozinha') || clean.includes('banheiro')) {
    return 'limpeza';
  }
  if (clean.includes('utens') || clean.includes('organiz')) return 'utensilios';
  return clean || 'outros';
}

export function categoryLabel(key = '') {
  return CONFIG.categories.find((category) => category.key === key)?.label || key || 'Produtos';
}

export function categoryIconName(categoryOrKey = '') {
  const key = CONFIG.categories.some((category) => category.key === categoryOrKey)
    ? categoryOrKey
    : categoryKey(categoryOrKey);
  return {
    agua: 'fa-droplet',
    gas: 'fa-fire-flame-simple',
    limpeza: 'fa-spray-can-sparkles',
    utensilios: 'fa-basket-shopping',
    ofertas: 'fa-percent'
  }[key] || 'fa-box-open';
}

export function hasTrustedImage(path = '') {
  const image = String(path || '');
  if (!image) return false;
  return true;
}

export function orderCode() {
  const stamp = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  const random = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `MS-${stamp}-${random}`;
}

export function saveCart() {
  writeJSON(STORAGE.cart, appState.cart);
  emit('cart:updated');
}

export function cartTotals() {
  const subtotal = appState.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const delivery = subtotal > 0 && subtotal < CONFIG.store.freeShippingFrom ? CONFIG.store.deliveryFee : 0;
  return {
    subtotal,
    delivery,
    total: subtotal + delivery,
    count: appState.cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
  };
}

export function setProducts(products, source = 'fallback') {
  appState.products = products;
  appState.productMap = new Map(products.map((product) => [String(product.id), product]));
  appState.productSource = source;
  emit('products:updated', { products, source });
}

export function productImage(product = {}) {
  return asset(product.image || 'assets/produtos/v2/agua-mineral-20l.png');
}

export function isOffer(product = {}) {
  return Boolean(product.offerActive || product.featured || product.promoPrice || (product.originalPrice && product.originalPrice > product.price));
}

export function roleAllowsPanel(role = '') {
  return CONFIG.adminRoles.includes(canonicalRole(role));
}

export function roleAllowsFullAdmin(role = '') {
  return CONFIG.fullAdminRoles.includes(canonicalRole(role));
}

export function themePreference() {
  const stored = localStorage.getItem(STORAGE.theme) || readJSON(STORAGE.settings, {})?.theme || 'system';
  return THEMES.includes(stored) ? stored : 'system';
}

export function applyThemePreference(theme = themePreference()) {
  const next = THEMES.includes(theme) ? theme : 'system';
  if (next === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = next;
  document.documentElement.dataset.themePreference = next;
  localStorage.setItem(STORAGE.theme, next);
  return next;
}

export function sitePreferences() {
  const stored = readJSON(STORAGE.settings, {});
  return Object.entries(DEFAULT_SITE_PREFERENCES).reduce((prefs, [key, fallback]) => {
    const value = stored?.[key] || fallback;
    prefs[key] = SITE_PREFERENCES[key]?.includes(value) ? value : fallback;
    return prefs;
  }, {});
}

export function applySitePreferences(prefs = sitePreferences()) {
  const next = { ...DEFAULT_SITE_PREFERENCES, ...prefs };
  document.documentElement.dataset.density = next.density;
  document.documentElement.dataset.cards = next.cards;
  document.documentElement.dataset.motion = next.motion;
  document.documentElement.dataset.menu = next.menu;
  document.documentElement.dataset.productView = next.productView;
  writeJSON(STORAGE.settings, { ...readJSON(STORAGE.settings, {}), ...next, theme: themePreference() });
  return next;
}

export function updateSitePreference(key, value) {
  if (!SITE_PREFERENCES[key]?.includes(value)) return sitePreferences();
  const next = { ...sitePreferences(), [key]: value };
  return applySitePreferences(next);
}

export function resetSitePreferences() {
  writeJSON(STORAGE.settings, { ...DEFAULT_SITE_PREFERENCES, theme: 'system' });
  applyThemePreference('system');
  return applySitePreferences(DEFAULT_SITE_PREFERENCES);
}

export function cycleThemePreference() {
  const current = themePreference();
  const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
  return applyThemePreference(next);
}

export function themeLabel(theme = themePreference()) {
  return { system: 'Sistema', light: 'Claro', dark: 'Escuro' }[theme] || 'Sistema';
}

export function profileAvatarKey(id = '') {
  return String(id || appState.profile?.id || appState.profile?.email || 'guest');
}

export function localProfileAvatar(id = '') {
  return readJSON(STORAGE.avatars, {})[profileAvatarKey(id)] || '';
}

export function saveLocalProfileAvatar(id = '', avatar = '') {
  const key = profileAvatarKey(id);
  const avatars = readJSON(STORAGE.avatars, {});
  if (avatar) avatars[key] = avatar;
  else delete avatars[key];
  writeJSON(STORAGE.avatars, avatars);
  return avatars[key] || '';
}

export function savedAccounts() {
  return readJSON(STORAGE.accounts, []);
}

export function rememberAccount(profile = {}) {
  const email = String(profile.email || '').trim().toLowerCase();
  const id = String(profile.id || email || '').trim();
  if (!id && !email) return savedAccounts();
  const account = {
    id,
    email,
    name: profile.name || profile.nome || email || 'Conta Monte Sinai',
    phone: profile.phone || profile.telefone || '',
    avatar: profile.avatar || '',
    lastUsedAt: new Date().toISOString()
  };
  const next = [account, ...savedAccounts().filter((item) => String(item.id || item.email) !== String(id || email))].slice(0, 5);
  writeJSON(STORAGE.accounts, next);
  return next;
}

export function forgetAccount(accountId = '') {
  const target = String(accountId || '').trim();
  const next = savedAccounts().filter((item) => String(item.id || item.email) !== target && String(item.email) !== target);
  writeJSON(STORAGE.accounts, next);
  return next;
}

export function localOrders() {
  return readJSON(STORAGE.orders, []);
}

export function saveLocalOrder(order) {
  const next = [order, ...localOrders().filter((item) => item.code !== order.code)].slice(0, 40);
  writeJSON(STORAGE.orders, next);
  return next;
}
