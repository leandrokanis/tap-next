/*
 * Service worker do Tap Next (ADR 0007) — offline-first.
 *
 * Estratégia: pré-cacheia o shell no install; em runtime, cache-first para
 * GETs same-origin (bundle, fontes, sons, ícones entram no cache na
 * primeira visita e passam a servir offline). Navegações caem para o shell
 * cacheado quando a rede falta. Bump de CACHE invalida tudo no deploy.
 */
const CACHE = 'tapnext-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Sem rede e sem cache: navegações voltam para o shell.
          if (request.mode === 'navigate') return caches.match('/');
          return Response.error();
        });
    }),
  );
});
