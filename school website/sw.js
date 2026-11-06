/* Service Worker for Bhavesh Vidya Niketan Progressive Web App (v2) */
const CACHE_NAME = 'bvn-cache-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/assets/images/logo.png',
  '/assets/images/director-bhavesh.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('BVN ServiceWorker Pre-cache notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Web3Forms / Supabase live API
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('api.web3forms.com') ||
    event.request.url.includes('supabase.co')
  ) {
    return;
  }

  // Network-First for HTML, CSS, and JS so updates reflect immediately
  const isCoreResource = 
    event.request.mode === 'navigate' ||
    event.request.url.endsWith('.html') ||
    event.request.url.includes('script.js') ||
    event.request.url.includes('style.css');

  if (isCoreResource) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for images, icons, and static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {/* Offline fallback silent catch */});

      return cachedResponse || fetchPromise;
    })
  );
});
