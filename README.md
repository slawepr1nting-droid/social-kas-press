# Update v2: Iuran Bulanan Karyawan

Aplikasi kini mendukung:
1. **Dashboard** (Summary Total Kas & Iuran)
2. **Iuran (Ceklis)** - Rp 20.000 / bulan dengan filter per-bulan
3. **Kas Bebas** - Pemasukan/Pengeluaran lainnya
4. **Data Anggota** - Tambah/Hapus karyawan

## Panduan Update Database Supabase
Karena ada penambahan fitur Karyawan dan Iuran, Anda **WAJIB** menjalankan ulang script database:
1. Buka Supabase -> **SQL Editor**
2. Copy isi file `database.sql` dan **Run**.
3. (Tabel `kas_sosial` yang lama tidak akan terhapus, aman).

Konfigurasi di `config.js` sudah disesuaikan dengan URL dan Key yang Anda berikan.
Tinggal upload seluruh folder ini ke GitHub dan biarkan Vercel deploy otomatis.
