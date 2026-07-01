# Contact Takeout & Removal Request Workflow

Dokumen ini mendeskripsikan alur kerja penarikan data (*takeout / opt-out*) kontak dari sistem CRM Kim Communication untuk kepatuhan regulasi privasi data (misal: GDPR / PDP).

---

## 1. Konsep Dasar Takeout / Opt-Out

Ketika seorang kontak meminta agar datanya dihapus atau tidak dihubungi kembali, sistem tidak langsung menghapus baris data secara permanen (*hard delete*) untuk menjaga riwayat kampanye/event sebelumnya. Sebaliknya, sistem menggunakan alur kerja **Removal Request**:
1. Kontak ditandai sebagai tidak aktif (`isActive = false`).
2. Entri permintaan dicatat di tabel `removal_requests` untuk kebutuhan audit kepatuhan.
3. Kontak disembunyikan secara otomatis dari seluruh daftar kontak aktif di UI.

---

## 2. Alur Pengajuan Removal Request (Staff Event / Manager)

Setiap user dengan role `ADMIN` atau `MANAGER` dapat mengajukan permohonan opt-out langsung dari direktori Kontak:

```
[Daftar Kontak] -> Klik Tombol "Opt-Out/Takeout" (Ikon Tempat Sampah/UserX)
                                 │
                                 ▼
                     [Buka Modal Takeout Form]
                                 │
                                 ▼
                      [Isi Kriteria Formulir]
       - Alasan (Reason): e.g., 'pindah_kerja', 'permintaan_sendiri', 'lainnya'
       - Requested By: Nama pemohon opt-out
       - Source DB: Sumber database asal
       - Notes: Catatan tambahan
                                 │
                                 ▼
                    [Kirim Ke Backend (POST)]
     - Request dikirim ke /api/removal-requests dengan status default 'done'
     - Kontak target langsung di-update menjadi `isActive = false`
                                 │
                                 ▼
                 [Kontak Disembunyikan dari UI]
```

---

## 3. Alur Audit & Pengarsipan (Admin)

Hanya user dengan role **`ADMIN`** yang memiliki akses ke halaman **Removal Requests** (`app/dashboard/settings/page.tsx`):

### A. Kategori Status Audit
Setiap entri permintaan memiliki status verifikasi:
* **`pending`**: Menunggu pemeriksaan Admin.
* **`approved` / `done`**: Permintaan disetujui, soft delete telah diaktifkan pada kontak terkait.
* **`rejected`**: Permintaan ditolak, kontak diaktifkan kembali.

### B. Tindakan Admin
Admin dapat mengaudit detail alasan, database asal, pemohon, dan catatan pendukung di tabel audit. 
* Jika status masih `pending`, Admin dapat menekan tombol **"Approve"** (mengubah status ke `done`) atau **"Reject"** (mengubah status ke `rejected`).
* Setelah diselesaikan, tombol aksi dinonaktifkan dan entri ditandai sebagai **"Archived"** untuk arsip audit permanen.

---

## 4. Dampak Data Inaktif di Sistem

Ketika `isActive = false` diterapkan pada kontak:
1. **Penyaringan Direktori Kontak:**
   Di file `contacts/page.tsx`, pencarian dan penyaringan kontak aktif secara otomatis mengecualikan kontak tidak aktif:
   ```tsx
   const filteredContacts = contacts.filter((c) => {
     // Menyembunyikan kontak yang sudah opt-out / tidak aktif
     if (c.isActive === false) return false;
     
     // Filter pencarian lainnya...
   });
   ```
2. **Pencarian Tikus (Duplicate Checking):**
   Selama proses impor Excel atau pembuatan kontak baru, sistem tetap membandingkan data ponsel/email terhadap kontak tidak aktif ini untuk mencegah pembuatan ulang identitas yang sama yang telah menyatakan opt-out.
