# Tikus (Suspicious Identity) Scoring Logic Workflow

Dokumen ini menjelaskan perbandingan antara **implementasi deteksi "Tikus" (fraud/spam) saat ini** dalam codebase CRM dengan **rencana matriks penilaian risiko (Tikus Score)** yang tercantum dalam dokumen desain basis data.

---

## 1. Kondisi Implementasi Saat Ini (Current Implementation)

Dalam codebase backend (`SuspiciousIdentityService.java`) dan frontend (`app/dashboard/flagged/page.tsx`) saat ini:
* **Tidak Ada Skor Numerik:** Sistem saat ini **belum** menyimpan atau menghitung skor risiko dalam bentuk angka (0-100). Kolom skor belum ada di tabel `flagged_identities` maupun entitas `FlaggedIdentity.java`.
* **Deteksi Duplikasi Otomatis:** Sistem mendeteksi potensi fraud secara otomatis saat kontak disimpan atau diimpor dari Excel dengan aturan:
  1. **`duplicate_phone`**: Jika nomor HP yang sama didaftarkan oleh kontak dengan nama depan/belakang yang berbeda. Status diatur ke `suspected`.
  2. **`duplicate_email`**: Jika alamat email yang sama digunakan oleh kontak dengan nama yang berbeda. Status diatur ke `suspected`.
* **Status Siklus Flag:**
  * `suspected`: Peringatan awal dari sistem.
  * `confirmed`: Terkonfirmasi oleh Admin sebagai identitas mencurigakan/fraud.
  * `cleared`: Dinyatakan aman (false positive) oleh Admin.
* **Manajemen Otoritas:** Hanya user dengan role **`ADMIN`** yang diizinkan untuk melihat menu, menandai profil baru secara manual, atau mengubah status/menghapus entri di Tikus Directory.

---

## 2. Rencana Pengembangan: Tikus Scoring Engine (Planned Design)

Berdasarkan dokumen `Database_Design_Lead_Event_Management.md` (Phase 4), sistem direncanakan menggunakan **Tikus Score** berupa akumulasi poin risiko. 

### A. Matriks Bobot Poin Risiko (Risk Weights)

| Parameter Pemeriksaan | Bobot Skor | Kondisi Pemicu |
| :--- | :---: | :--- |
| **Duplicate Phone Different Name**| **+50 Poin** | Nomor HP sama digunakan oleh nama kontak berbeda. |
| **Duplicate Email Different Name**| **+40 Poin** | Email sama digunakan oleh nama kontak berbeda. |
| **Personal Email Usage** | **+20 Poin** | Menggunakan email gratisan (Gmail, Yahoo, dll) untuk data kantor. |
| **High Frequency Attendance** | **+15 Poin** | Menghadiri >3 event dalam waktu singkat (indikator "pemburu souvenir"). |
| **Corporate Email Match** | **-10 Poin** | Menggunakan domain email resmi kantor yang terverifikasi. |

### B. Kategori Tingkat Risiko (Risk Levels)

Hasil akumulasi skor menentukan label risiko kontak di sistem:

| Total Skor | Label Risiko | Warna Indikator | Tindakan Sistem |
| :---: | :--- | :---: | :--- |
| **< 30** | **Low Risk** | Hijau 🟢 | Diizinkan berpartisipasi langsung (*Auto-Allow*). |
| **30 - 69** | **Medium Risk** | Kuning 🟡 | Memerlukan peninjauan manual oleh Admin (*Manual Review*). |
| **70 - 99** | **High Risk** | Jingga 🟠 | Ditandai peringatan keras di daftar peserta (*High Warning Flag*). |
| **>= 100** | **Blacklisted** | Merah 🔴 | Dilarang keras ditambahkan ke Event mana pun (*Block Access*). |

---

## 3. Langkah Rekayasa untuk Menerapkan Tikus Scoring

Jika Anda ingin mengaktifkan fitur penilaian skor angka ini di CRM, berikut adalah langkah teknis yang perlu dilakukan:

1. **Database Migration (Liquibase):**
   * Menambahkan kolom `risk_score` (Integer) ke dalam tabel `flagged_identities`.
2. **Backend Update (Spring Boot):**
   * Perbarui file entitas `FlaggedIdentity.java` untuk memetakan field `riskScore`.
   * Ubah `SuspiciousIdentityService.java` agar menghitung total poin berdasarkan matriks di atas saat mendeteksi duplikat, dan simpan hasilnya ke database.
3. **Frontend Update (Next.js):**
   * Perbarui halaman `app/dashboard/flagged/page.tsx` untuk menampilkan kolom **Score** dan indikator warna lingkaran sesuai level risiko (Hijau/Kuning/Jingga/Merah).
