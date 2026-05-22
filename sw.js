const CACHE_VERSION = 'monte-sinai-20260522-9';
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
  '/css/style.css?v=20260522-6',
  '/js/script.js?v=20260522-7',
  '/js/supabase.js?v=20260520-4',
  '/site.webmanifest',
  ASSET_MANIFEST_URL,
  '/assets/brand/v2/monte-sinai-logo-v2.png',
  '/assets/hero/v2/hero-banner-v2.png',
  '/assets/produtos/v2/agua-mineral-20l.png',
  '/assets/produtos/v2/gas-p13.png',
];

const PRIVATE_PATHS = [
  '/login',
  '/login.html',
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
  '/pages/pagamento.html',
  '/pages/pedidos.html',
  '/pages/perfil.html',
  '/pages/editar-perfil.html',
  '/pages/configuracoes.html',
  '/pages/painel.html',
];

const FRESH_STATIC_FILE_RE = /\.(?:css|js)$/i;
const STATIC_FILE_RE = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|webmanifest)$/i;

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
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
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

  // Cache STATIC_ASSETS forcing network to bypass the browser HTTP cache.
  for (const asset of STATIC_ASSETS) {
    try {
      const req = new Request(asset, { cache: 'no-store' });
      const res = await fetch(req);
      if (res && res.ok) {
        await cache.put(asset, res.clone());
      }
    } catch (e) {
      // ignore individual asset failures
    }
  }

  try {
    const response = await fetch(ASSET_MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const manifest = await response.json();
    const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
    const urls = assets
      .flatMap((asset) => [asset.new_path, asset.site_path])
      .filter(Boolean)
      .map((path) => `/${String(path).replace(/^\/+/, '')}`);

    // fetch each manifest asset with `no-store` and put into cache
    for (const url of urls) {
      try {
        const req = new Request(url, { cache: 'no-store' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(url, res.clone());
      } catch (e) {
        // ignore failures per asset
      }
    }
  } catch (_error) {
    // O app continua instalavel mesmo se o manifest de assets ainda nao existir no primeiro deploy.
  }
}
