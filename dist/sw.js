// AquaBook Service Worker for 100% Offline PWA & Mobile Installation
const CACHE_NAME = 'aquabook-v2-offline';

// Core shell assets to precache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png',
  '/icons.svg',
  '/assets/html2canvas-nBw05R-p.js',
  '/assets/index-DZdKv0vL.js',
  '/assets/index-fUQQFesC.css',
  '/assets/index.es-BmdOSpp2.js',
  '/assets/purify.es-Dn3VvdGh.js'
];

// Install: Precache shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch for individual items to prevent 1 failed asset from failing whole install
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[AquaBook SW] Failed to precache ${url}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old cache versions and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log(`[AquaBook SW] Removing old cache: ${key}`);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Smart caching strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignore browser extensions & non-http protocols
  if (!url.protocol.startsWith('http')) return;

  // 1. Supabase / External API requests: Bypass service worker cache completely
  if (url.hostname.includes('supabase.co')) {
    return; // Let standard browser fetch handle it (app handles offline via try/catch)
  }

  // 2. Navigation Requests (HTML / App Route changes e.g., /quick-delivery, /customers):
  // Network first with offline fallback to cached /index.html (SPA routing)
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', copy);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // OFFLINE: Return cached index.html so React Router renders the requested page offline
          const cachedHtml = await caches.match('/index.html');
          if (cachedHtml) return cachedHtml;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return new Response('Offline - AquaBook', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 3. Static Assets: JS bundles, CSS, Images, Fonts, Icons
  // Cache-First with Network fallback and automatic runtime caching
  const isStaticAsset = 
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Return from cache immediately
          return cachedResponse;
        }

        // Not in cache yet: Fetch from network and save to cache
        return fetch(req)
          .then((networkResponse) => {
            // Check if valid response (allow basic and opaque for CORS fonts)
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback: Return empty response with matching content-type instead of 503 text
            if (url.pathname.endsWith('.js')) {
              return new Response('/* Offline fallback */', {
                status: 200,
                headers: { 'Content-Type': 'application/javascript' }
              });
            }
            if (url.pathname.endsWith('.css')) {
              return new Response('/* Offline fallback */', {
                status: 200,
                headers: { 'Content-Type': 'text/css' }
              });
            }
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
    );
    return;
  }

  // 4. Default handler for all other requests: Stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => cached || new Response('', { status: 408 }));

      return cached || fetchPromise;
    })
  );
});
