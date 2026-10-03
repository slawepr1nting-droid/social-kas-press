# Update v9: Infinite Loop Fix

Memperbaiki *bug* pada `app.js` v8 di mana aplikasi masuk ke mode *refresh/reload* tanpa henti akibat konflik antara sistem *cache-busting* dinamis (`?v=timestamp`) di dalam Service Worker. 

**Solusi:**
1. Menghapus teknik *cache-busting* timestamp yang menyebabkan browser mengira ada update setiap milidetik.
2. Menggunakan metode Event Listener `controllerchange` murni yang aman dan hanya dieksekusi 1 kali saat update dari server benar-benar tersedia.
