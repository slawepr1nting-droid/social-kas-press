# Update v7: Auto-Update (Tanpa Hard Refresh)

Sistem PWA telah diubah pendekatannya agar sangat ramah bagi developer / pengguna yang sering melakukan update file via GitHub:
1. **HTML Anti-Cache Meta Tags**: File HTML sekarang dipaksa untuk selalu mengambil versi terbaru dari server.
2. **Dynamic Script Loading**: File `app.js` dan `config.js` dipanggil dengan parameter waktu dinamis (`?v=...`), sehingga browser tidak akan pernah menguncinya di memori lama.
3. **PWA Auto-Reload**: Jika ada update file, Service Worker baru akan mendeteksinya, menginstal dirinya secara senyap, lalu melakukan *auto-reload* 1x untuk menerapkan desain terbaru.

**Anda hanya tinggal *Pull-to-refresh* / memuat ulang halaman secara biasa (tidak perlu clear cache lagi)!**
