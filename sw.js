// Cache version — bump this to force all clients to update
const CACHE_VERSION = 'v4';
const CACHE_NAME = 'hxh-' + CACHE_VERSION;

self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', CACHE_VERSION);
  self.skipWaiting(); // Activate immediately, don't wait
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // Take control of all tabs immediately
  );
});

// Network-first strategy — always try to get fresh content
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful GET responses for same-origin
        if (event.request.method === 'GET' && response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // Fallback to cache if offline
  );
});
