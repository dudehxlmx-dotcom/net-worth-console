// Net Worth Console — Service Worker
// ------------------------------------------------------------
// Purpose: satisfy PWA installability (a registered service worker is a
// hard requirement) and let the app shell load even with no connectivity,
// so you can at least SEE your last-saved data offline.
//
// Deliberately does NOT cache or intercept POST requests (including every
// call to api.anthropic.com for statement reading) -- those always go
// straight to the network, untouched. Caching a POST request containing
// your statement data would be both useless and a bad idea.

const CACHE_NAME = 'networth-console-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never touch anything but simple same-origin GETs -- this excludes every
  // AI extraction call (which is a POST to a different origin) automatically.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for the app shell, so you always get the latest version
  // when online, falling back to the cached copy only when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
