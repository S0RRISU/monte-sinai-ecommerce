const CACHE_VERSION = 'monte-sinai-20260520-7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/produtos',
  '/sobre',
  '/contato',
  '/css/style.css?v=20260520-43',
  '/js/script.js?v=20260520-36',
  '/js/supabase.js?v=20260520-3',
  '/site.webmanifest',
  '/assets/brand/monte-sinai-logo-3d.png',
  '/assets/hero/hero-banner.png',
  '/assets/produtos/agua-mineral-20l.png',
  '/assets/produtos/gas-p13.png'
];

const PRIVATE_PATHS = [
  '/login',
  '/login.html',
  '/pagamento',
  '/pagamento.html',
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
  '/pages/perfil.html',
  '/pages/editar-perfil.html',
  '/pages/configuracoes.html',
  '/pages/painel.html'
];

const STATIC_FILE_RE = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|webmanifest)$/i;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('monte-sinai-') && ![STATIC_CACHE, PAGE_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE_PATHS.includes(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
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
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}
