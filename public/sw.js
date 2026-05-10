const CACHE_NAME = '2048-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 这种简单的 Service Worker 能够缓存基础页面，让应用在离线时也能加载外框
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
