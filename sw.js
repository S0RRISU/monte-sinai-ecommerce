const CACHE_VERSION = 'monte-sinai-20260528-premium-foundation-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const ASSET_MANIFEST_URL = '/assets/generated/v2/manifest.json';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/produtos',
  '/catalogo',
  '/promocoes',
  '/sobre',
  '/contato',
  '/css/reset.css',
  '/css/tokens.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/states.css',
  '/js/supabase.js',
  '/js/config.js',
  '/js/state.js',
  '/js/supabase-client.js',
  '/js/supabase-services.js',
  '/js/cart.js',
  '/js/products.js',
  '/js/search.js',
  '/js/auth.js',
  '/js/profile.js',
  '/js/orders.js',
  '/js/checkout.js',
  '/js/admin.js',
  '/js/ui.js',
  '/js/app.js',
  '/site.webmanifest',
  ASSET_MANIFEST_URL,
  '/assets/brand/monte-sinai-logo-transparente.png',
  '/assets/brand/icons/monte-sinai-icon-transparente-192.png',
  '/assets/brand/icons/monte-sinai-icon-transparente-512.png',
  '/assets/produtos/v2/agua-mineral-20l.png',
  '/assets/produtos/v2/gas-p13.png'
];

const PRIVATE_PATHS = [
  '/login',
  '/login.html',
  '/criar',
  '/criar.html',
  '/pagamento',
  '/pagamento.html',
  '/pedidos',
  '/pedidos.html',
  '/perfil',
  '/perfil.html',
  '/editar-perfil',
  '/editar-perfil.html',
  '/configuracoes',
  '/configuracoes.html',
  '/painel',
  '/painel.html',
  '/pages/login.html',
  '/pages/criar.html',
  '/pages/pagamento.html',
  '/pages/pedidos.html',
  '/pages/perfil.html',
  '/pages/editar-perfil.html',
  '/pages/configuracoes.html',
  '/pages/painel.html'
];

const FRESH_STATIC_FILE_RE = /\.(?:css|js)$/i;
const STATIC_FILE_RE = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|webmanifest|json)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(cacheStaticAssets().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('monte-sinai-') && ![STATIC_CACHE, PAGE_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE_PATHS.includes(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (FRESH_STATIC_FILE_RE.test(url.pathname)) {
    event.respondWith(networkFirstStatic(request));
    return;
  }

  if (STATIC_FILE_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_error) {
    return (await cache.match(request)) || (await caches.match('/index.html'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}

async function networkFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(new Request(request, { cache: 'no-store' }));
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_error) {
    return (await cache.match(request)) || Response.error();
  }
}

async function cacheStaticAssets() {
  const cache = await caches.open(STATIC_CACHE);

  for (const path of STATIC_ASSETS) {
    try {
      const response = await fetch(new Request(path, { cache: 'no-store' }));
      if (response.ok) await cache.put(path, response.clone());
    } catch (_error) {
      // Individual cache misses must not block install.
    }
  }

  try {
    const response = await fetch(ASSET_MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const manifest = await response.json();
    const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
    const urls = assets
      .flatMap((item) => [item.new_path, item.site_path])
      .filter(Boolean)
      .map((path) => `/${String(path).replace(/^\/+/, '')}`);

    for (const url of urls) {
      try {
        const responseAsset = await fetch(new Request(url, { cache: 'no-store' }));
        if (responseAsset.ok) await cache.put(url, responseAsset.clone());
      } catch (_error) {
        // Optional generated assets are cached opportunistically.
      }
    }
  } catch (_error) {
    // The app remains installable without the generated asset manifest.
  }
}
