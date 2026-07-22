# Panduan Update Dokumen BRD (Business Requirements Document)
Dokumen ini merangkum seluruh bagian yang perlu Anda tambahkan atau perbarui pada file BRD CRM Kim Communication agar sesuai dengan fitur yang saat ini berjalan di sistem.

---

## 1. Tambahan pada Bab 5 — Kebutuhan Fungsional (No. 1 & 2)

**Modul:** Database Management & Company Management  
**Detail Perubahan:** Lengkapi daftar atribut/kolom data individual dan perusahaan yang dapat ditampung oleh sistem (termasuk yang diimpor melalui Excel).

```markdown
### Atribut Data Kontak & Perusahaan Lengkap:
Sistem mendukung penyimpanan dan pengunggahan massal (Excel Import) untuk kolom-kolom berikut:
1.  **Grup Perusahaan:** Nama Group/Holding Company (Relasi otomatis ke entitas Group).
2.  **Nama Brand:** Brand Name afiliasi perusahaan.
3.  **Detail Perusahaan:** Company Name, Alamat Kantor (Address), Telepon Kantor (Office Phone), dan Website Perusahaan.
4.  **Kategori Bisnis:** Bidang Industri (Industry).
5.  **Ukuran Perusahaan (Company Size):** Berdasarkan total omset/pendapatan (Revenue) dan jumlah karyawan (Employee Size).
6.  **Kebutuhan Hardware:** Hardware khusus yang digunakan oleh perusahaan.
7.  **Lokasi:** Kota lokasi perusahaan (City).
8.  **Profil Kontak:** Salutation (Mr/Ms), First Name (Wajib), Last Name, Posisi/Level Jabatan (Position Level), Divisi/Spesialisasi (Speciality/Division), Job Title, dan Link LinkedIn.
9.  **Kontak Komunikasi:** Nomor Ponsel (Mobile Phone) serta dual-email: Email Kantor (Corporate Email) dan Email Pribadi (Personal Email).
```

---

## 2. Tambahan pada Bab 5 — Kebutuhan Fungsional (No. 4) & Pembatasan Otoritas

**Modul:** Participant & Engagement Tracking  
**Detail Perubahan:** Spesifikasi alur penugasan PIC (Person In Charge), format penyimpanan data, cakupan penyaringan per tab, serta aturan pembatasan hak akses (*authorization*) berdasarkan PIC.

```markdown
### Fitur Penugasan PIC & Pembatasan Hak Akses:
Untuk mengelola pembagian tugas staf di lapangan dan menjaga kerahasiaan data operasional, sistem menerapkan aturan penugasan dan filter PIC sebagai berikut:
*   **Penyimpanan & Formatisasi Data:**
    *   Nama PIC disimpan secara dinamis di bagian paling awal kolom Catatan (*Notes*) menggunakan format tag header: `[PIC: Nama_PIC]` (contoh: `[PIC: Joseph] Hubungi sore hari`).
    *   **Default Fallback:** Apabila kolom Catatan tidak memuat tag `[PIC: ...]`, sistem secara otomatis menganggap/menetapkan fallback PIC peserta sebagai `Admin`.
*   **Cakupan Penyaringan per Tab (Tab-Level Scope):**
    *   Penyaringan data berdasarkan PIC **hanya aktif pada Tab Operasional** (`Tab 2: Pre-Event`, `Tab 3: Reminder`, dan `Tab 4: Reminder D-Day`).
    *   Pada **`Tab 1: Data List / Request`**, aturan penyaringan PIC **dikecualikan (tidak berlaku)**. Seluruh peserta undangan/prospek awal dapat dilihat oleh semua staf maupun Admin untuk kualifikasi awal.
*   **Pembatasan Hak Akses (Security & Role Rules):**
    *   **Staf Event / Manager (Non-Admin):** Hanya diizinkan melihat, memproses, dan memperbarui data peserta pada tab operasional yang ditugaskan kepada mereka sebagai PIC (di mana tag PIC sesuai dengan nama akun/fullName pengguna yang login). Data peserta milik PIC lain disembunyikan otomatis dari antarmuka.
    *   **Admin:** Memiliki hak akses penuh untuk melihat seluruh data peserta di semua tab, menyaring tampilan berdasarkan dropdown nama PIC tertentu, serta melakukan penugasan atau pemindahan PIC baik secara **individual** (via Modal Edit Participant) maupun **massal (*Batch Assign PIC*)** dari daftar tabel.
*   **Integrasi Ekspor Data (Custom Excel Export):**
    *   Sistem mengekstrak nama PIC dari kolom Catatan secara otomatis saat proses *Custom Excel Export*, menghasilkan kolom khusus `PIC` pada file Excel yang diunduh (serta memisahkan teks catatan bersih dari tag `[PIC: ...]`).
```

---

## 3. Perubahan pada Bab 6.1 & 6.2 — Siklus Hidup Peserta & Milestone Reminder (4 Tab)

**Modul:** System Activity Flows  
**Detail Perubahan:** Perbarui alur pengelolaan peserta event menjadi struktur **4 Tab Utama** di antarmuka (UI) beserta aturan penyaringan (*filtering*) masing-masing.

```markdown
### Alur Siklus Hidup Peserta (4-Tab Lifecycle):
Daftar peserta dalam sebuah Event dibagi ke dalam 4 tab berdasarkan status kelayakan operasionalnya:

1.  **Tab "Request" (Undangan Awal):**
    *   Menampilkan daftar peserta prospek/undangan awal.
    *   Saringan (*Filter*): Menyaring peserta dengan `Confirmation Status = Pending` atau `Decline`. Jika peserta telah memiliki status `Approve`, mereka hanya akan tetap tampil di tab ini jika memiliki catatan awal pengiriman `[Origin: Request]`.
2.  **Tab "Pre-Event" (Kualifikasi Utama):**
    *   Tempat staf lapangan melakukan kualifikasi Tele Remarks (Call, Email, WhatsApp).
    *   Saringan (*Filter*): Hanya menampilkan peserta yang memiliki `Confirmation Status = Approve`.
3.  **Tab "Reminder" (Follow-Up Milestone Berjangka):**
    *   Tempat staf menginput status tindak lanjut berjangka (H-7, H-3, H-1).
    *   Saringan (*Filter*): Hanya menampilkan peserta yang memiliki `Confirmation Status = Approve` dan `Tele Remarks / Status = Registered`.
4.  **Tab "Reminder D-Day" (Hari H):**
    *   Tempat staf menginput status kehadiran dinamis saat acara berlangsung.
    *   Saringan (*Filter*): Kriteria sama dengan Tab Reminder (Wajib `Approve` & `Registered`).

### Pilihan Status Follow-Up per Milestone:
*   **Milestone H-7, H-3, H-1:**
    Pilihan status respons: `- None`, `Not respond yet`, `Not respond 2x`, `Tentative`, `Confirm`, dan `Unable to attend`.
*   **Milestone Hari H:**
    Pilihan status respons diperluas untuk mencatat kondisi kedatangan:
    *   `On Location` (Tiba di lokasi)
    *   `On The Way` (Di perjalanan)
    *   `Not Respond Yet` (Belum merespons)
    *   `Not Respond 2x` s/d `Not Respond 9x` (Tingkat nihil respons pada Hari-H)
    *   `Unable Attend` (Batal hadir di Hari-H)
```

---

## 4. Perbaikan pada Bab 6.5 — Tikus (Fraud) Auto-Flagging Logic

**Modul:** Tikus (Fraud) Detection  
**Detail Perubahan:** Hapus skema perhitungan poin (skor 0-100) dan sederhanakan menjadi alur deteksi langsung (*Direct Flagging*).

```markdown
### Logika Deteksi Duplikasi Otomatis (Tikus):
Evaluasi integritas data dilakukan secara langsung tanpa menggunakan akumulasi poin numerik:
*   **Aturan 1 (Duplikasi Nomor Telepon):** Jika nomor HP yang sama digunakan oleh kontak dengan nama yang berbeda, sistem akan otomatis membuat entri di direktori Tikus dengan status `suspected` (Tersangka) pada kedua kontak tersebut.
*   **Aturan-2 (Duplikasi Email):** Jika alamat email yang sama digunakan oleh kontak dengan nama yang berbeda, sistem akan otomatis menandainya sebagai status `suspected` (Tersangka).

### Status Siklus Flag (Tikus):
Setiap temuan fraud memiliki tahapan status berikut:
1.  **Suspected (Tersangka):** Status awal/default yang diberikan otomatis oleh sistem saat mendeteksi duplikasi telepon/email.
2.  **Confirmed:** Terkonfirmasi sebagai fraud oleh Admin. Kontak otomatis dinonaktifkan (`isActive = false`) dan disembunyikan dari direktori utama.
3.  **Cleared:** Dinyatakan bersih (false positive) oleh Admin. Peringatan status suspected dihapus dan kontak kembali aktif normal.
4.  **Deleted:** Menghapus entri flag sepenuhnya dari daftar pantau.
```
