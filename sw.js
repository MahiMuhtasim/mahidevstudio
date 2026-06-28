// Mahi Dev Studio Pro — Service Worker
// Strategy:
//   - Shell files (this app's own HTML/manifest/icons): cache-first, refreshed in background.
//   - Everything else (Google Fonts, lucide, Prettier, Monaco CDN files): cache-first too,
//     since these are version-pinned CDN URLs that never change content for a given URL.
//     First run needs internet; after that, cached copies let the app open offline.

const CACHE_VERSION = 'v1';
const CACHE_NAME = 'mahi-dev-studio-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-48.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('mahi-dev-studio-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; let everything else (e.g. POST to an AI API) pass straight through.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // Cache a copy of successful (or opaque cross-origin) responses for next time.
          if (res && (res.ok || res.type === 'opaque')) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // offline and not cached for this URL -> nothing we can do

      // Cache-first: serve cached copy instantly if we have one, else wait on network.
      return cached || networkFetch;
    })
  );
});
