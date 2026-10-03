const CACHE_NAME = 'kas-press-v1';
// File yang akan disimpan di cache agar bisa dibuka offline (meski data baru tidak bisa dimuat)
const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './config.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Strategi Cache First, falling back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
