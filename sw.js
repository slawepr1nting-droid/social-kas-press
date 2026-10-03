const CACHE_NAME = 'kas-press-v4';
const urlsToCache = ['./', './index.html', './app.js', './config.js'];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(r => r || fetch(event.request))));
