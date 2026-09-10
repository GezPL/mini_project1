// public/sw.js
const CACHE_NAME = 'vku-survey-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo-vku.jpg'
];

// Install: Precache shell cơ bản
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static core assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical precache error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate + Dynamic Cache + Offline Fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Bỏ qua các request không phải GET
  if (request.method !== 'GET') return;

  // Bỏ qua chrome-extension, capacitor schemes hoặc cross-origin không phải http
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // Chỉ cache các request cùng origin
  if (url.origin !== self.location.origin) return;

  // Chiến lược cho Navigation (khi người dùng mở hoặc reload trang)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cập nhật lại cache index.html khi online
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Khi offline: trả về index.html từ cache để không bị sụp trang
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = (await cache.match('/index.html')) || (await cache.match('/'));
          if (cachedIndex) return cachedIndex;
          return new Response('Offline: Page not found in cache', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Chiến lược cho các tài nguyên tĩnh khác (JS, CSS, hình ảnh, icons, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Background revalidation
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fetch fail, bỏ qua nếu đã có cache
        });

      // Nếu có trong cache, trả về ngay lập tức (nhanh & offline hoạt động 100%)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Nếu chưa có trong cache, chờ fetch từ mạng về
      return fetchPromise;
    })
  );
});