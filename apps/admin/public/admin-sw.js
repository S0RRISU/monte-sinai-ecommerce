const CACHE_NAME = 'monte-sinai-admin-pwa-v2';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const LOCAL_DEVELOPMENT = LOCAL_HOSTS.has(self.location.hostname);
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/manifest-admin.webmanifest',
  '/manifest-developer.webmanifest',
  '/brand/monte-sinai-logo-transparente.png',
  '/brand/icons/monte-sinai-icon-transparente-192.png',
  '/brand/icons/monte-sinai-icon-transparente-512.png'
];

self.addEventListener('install', (event) => {
  if (LOCAL_DEVELOPMENT) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (LOCAL_DEVELOPMENT) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith('monte-sinai-admin-')).map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
    );
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('monte-sinai-admin-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (LOCAL_DEVELOPMENT) return;

  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/_next/') || url.pathname.endsWith('.webmanifest') || url.pathname.startsWith('/brand/')) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('/dashboard')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}
