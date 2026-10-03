const CACHE_NAME = 'kas-press-v7-dynamic';

self.addEventListener('install', event => {
    // Memaksa SW baru untuk segera aktif tanpa menunggu tab ditutup
    self.skipWaiting(); 
});

self.addEventListener('activate', event => {
    // Hapus semua cache versi lama dan langsung ambil alih halaman
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim()) 
    );
});

// STRATEGI NETWORK-FIRST (Sangat agresif mengecek internet)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Selalu simpan ke cache hasil terbaru untuk offline fallback
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
