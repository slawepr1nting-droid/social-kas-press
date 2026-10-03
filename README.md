# Update v5: Advanced Features

Fitur Tambahan (Sesuai Permintaan):
1. **Pilihan Bulan di Home/Dashboard:** Anda bisa mengecek history Lunas/Belum Lunas di Home berdasarkan bulan yang Anda tentukan sendiri.
2. **Rekap Tahunan Terbagi 2 Kolom:** Menjadikan scroll lebih ringkas (Kiri: Jan-Jun, Kanan: Jul-Des).
3. **Optimasi Ceklis Iuran (Tanpa Loading & Loncat):** Mengubah status bayar di tab Iuran sekarang terasa instan (tidak me-reload halaman atau lompat ke atas).
4. **Soft-Delete Karyawan (Riwayat Aman):** Jika Anda menghapus karyawan, mereka hanya disembunyikan dari tagihan bulan depan. Riwayat bulan-bulan sebelumnya saat mereka masih aktif akan tetap terjaga (tidak merusak target lunas).

**SANGAT PENTING:** 
Anda wajib menjalankan kembali *script* SQL di bawah ini di menu **SQL Editor Supabase** agar fitur riwayat dinamis bekerja:

```sql
alter table public.karyawan add column if not exists is_active boolean default true;
alter table public.karyawan add column if not exists nonaktif_bulan varchar(7);
```
