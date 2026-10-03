# Aplikasi PWA Kas Sosial Dept. Press

Aplikasi pencatatan kas ini dirancang dengan pendekatan **Zero Install & Zero Build**. 
Menggunakan perpaduan **Vanilla HTML/JS**, **Tailwind CSS CDN**, dan **Supabase JS CDN**.

Sangat cocok bagi Anda yang hanya ingin menghubungkan **GitHub + Supabase + Vercel** tanpa harus menginstal Node.js / NPM.

---

## 🚀 Panduan Setup & Deploy

### Langkah 1: Siapkan Database di Supabase
1. Buat akun / login ke [Supabase](https://supabase.com/).
2. Klik **New Project** dan berikan nama (misal: kas-press).
3. Setelah project siap, masuk ke menu **SQL Editor** (ikon terminal di sidebar kiri).
4. Buat query baru, buka file `database.sql` yang ada di folder ini, lalu **copy & paste semua isinya**.
5. Klik **Run** (tombol play hijau) untuk mengeksekusi script. Tabel akan otomatis dibuat.
6. Masuk ke menu **Project Settings -> API** (ikon gerigi -> API).
7. Simpan nilai **Project URL** dan **anon / public key** Anda.

### Langkah 2: Setup GitHub Repository
1. Buat akun / login ke [GitHub](https://github.com/).
2. Buat **Repository Baru** (misalnya bernama `kas-press`).
3. Upload seluruh isi file yang telah di-ekstrak dari ZIP ini ke dalam repository tersebut.
4. **PENTING:** Buka file `config.js` di dalam GitHub, klik tanda pensil (Edit), lalu masukkan **Project URL** dan **anon key** Supabase Anda.
5. Simpan perubahan (Commit changes).

### Langkah 3: Deploy ke Vercel
1. Buat akun / login ke [Vercel](https://vercel.com/) (gunakan login via GitHub agar mudah).
2. Di dashboard Vercel, klik **Add New... -> Project**.
3. Temukan repository `kas-press` yang Anda buat, lalu klik **Import**.
4. Di bagian *Framework Preset*, Vercel akan mendeteksinya sebagai `Other` (biarkan saja).
5. Langsung klik tombol **Deploy**.
6. Tunggu beberapa detik, dan aplikasi Anda sudah online!

### Langkah 4: Install di HP (PWA)
1. Buka URL / Link dari Vercel melalui browser di HP Anda (Chrome untuk Android / Safari untuk iOS).
2. Akan muncul prompt **"Add to Home Screen"** atau Anda bisa mencarinya di menu browser (Install App).
3. Aplikasi siap digunakan selayaknya aplikasi native di HP!

---
Dibuat dengan efisiensi tinggi, selamat menggunakan!
