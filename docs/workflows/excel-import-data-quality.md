# Excel Import & Data Quality Pipeline Workflow

Dokumen ini mendeskripsikan alur kerja impor massal (*bulk import*) data kontak dari file Excel, dilengkapi dengan tahapan pratinjau (*preview*), normalisasi pembersihan data (*data cleaning*), serta deteksi duplikasi awal di Backend (`ExcelImportController.java`).

---

## 1. Pemetaan Kolom Excel Template

Data Excel dibaca berdasarkan urutan indeks kolom (1-indexed untuk penomoran visual, 0-indexed di kode):

| Indeks Kolom | Nama Kolom Excel | Variabel Backend | Keterangan / Normalisasi |
| :---: | :--- | :--- | :--- |
| **0** | No | - | Diabaikan (hanya nomor baris) |
| **1** | Nama Group | `groupName` | Diubah menjadi entitas `Group` |
| **2** | Nama Brand | `brandName` | Atribut dari `Company` |
| **3** | Company Name | `companyName` | Dibersihkan (Normalisasi "PT") |
| **4** | Salutation | `salutation` | Default ke "Mr" jika kosong |
| **5** | First Name | `firstName` | **Wajib Diisi** (Skip baris jika kosong) |
| **6** | Last Name | `lastName` | **Wajib Diisi** (Skip baris jika kosong) |
| **7** | Position | `positionStr` | Dikonversi ke enum `PositionLevel` |
| **8** | Speciality/Division| `specialityDivision` | Detail posisi |
| **9** | Jobtitle | `jobTitle` | Deskripsi posisi |
| **10** | Address | `address` | Alamat Perusahaan |
| **11** | Office Phone | `officePhone` | Nomor telepon kantor |
| **12** | Mobile Phone | `mobilePhone` | Dibersihkan (Angka subscriber saja) |
| **13** | Company Email Address| `companyEmail` | Email berdomain korporat (Primary) |
| **14** | Personal Email Address| `personalEmail` | Email berdomain personal (Secondary) |
| **15** | Industry | `industry` | Kategori industri perusahaan |
| **16** | Company Size (Revenue)| `sizeRevenue` | Ukuran omset perusahaan |
| **17** | Company Size (Employee)| `sizeEmployee` | Jumlah karyawan |
| **18** | Company Hardware | `hardware` | Penggunaan teknologi/hardware |
| **19** | Linkedin Link | `linkedinUrl` | Tautan profil LinkedIn |
| **20** | City | `city` | Kota lokasi perusahaan |
| **21** | Company Website | `website` | URL website perusahaan |

---

## 2. Alur Proses Impor Kontak

### Langkah 1: Pengunggahan File & Preview `/api/contacts/import/preview`
Sebelum data dimasukkan ke database, frontend memanggil endpoint `/preview` untuk menampilkan analisis data awal kepada pengguna:
1. **Validasi Baris:** Jika `firstName` dan `lastName` kosong, baris dilewati (*skipped*).
2. **Identifikasi Duplikat Eksisting:**
   * Sistem mencari kesamaan nama depan & belakang di database.
   * Jika nama cocok, sistem memeriksa apakah *Company*, *Mobile Phone*, atau *Email* juga cocok. Jika iya, baris ditandai sebagai `DUPLICATE` (artinya data eksisting akan diperbarui).
3. **Deteksi Berbagi Detail (Tikus Candidate):**
   * Jika Nomor Telepon atau Email yang dimasukkan terdeteksi sudah dimiliki oleh kontak dengan **nama yang berbeda** di database, sistem memberikan peringatan (*Warning*):
     * *"Warning: Phone number is identical to contact 'Nama Lain' (Tikus candidate)."*
4. **Visualisasi:** Frontend menampilkan ringkasan berupa jumlah data baru (`NEW`) dan data yang akan diperbarui (`DUPLICATE`).

### Langkah 2: Eksekusi Impor `/api/contacts/import`
Setelah pengguna menyetujui pratinjau data, file Excel dikirim ke endpoint `/import` untuk diproses ke database dengan aturan pembersihan (*data cleaning*):

```
[Membaca Baris Excel]
         │
         ▼
[Cek Nilai Kosong / Placeholder]
(Mengabaikan: "-", "N/A", "none", "tidak ada", "kosong")
         │
         ▼
[Normalisasi Nama Perusahaan]
(Mengubah akhiran "PT" menjadi awalan "PT ", misal: "Google PT" -> "PT Google")
         │
         ▼
[Normalisasi Nomor Telepon]
(Membuang simbol non-angka, mengubah awalan "0" menjadi "+62")
         │
         ▼
[Resolusi Entitas (Group -> Company -> Contact -> Emails)]
         │
         ▼
[Auto-Flagging Suspicious Identities ("Tikus")]
(Jalankan pengecekan silang di SuspiciousIdentityService)
```

---

## 3. Aturan Pembersihan Data (Data Cleaning Rules)

Untuk menjaga kualitas data di database, sistem menerapkan aturan normalisasi berikut secara otomatis:

### A. Pengabaian Sentinel / Placeholder
Data inputan Excel sering kali mengandung isian kosong manual seperti strip atau tulisan "N/A". Metode `normalizeField()` di backend akan mengonversinya menjadi string kosong `""` sehingga tidak dianggap sebagai data nomor telepon atau email yang valid (menghindari duplikasi palsu):
* Nilai yang diabaikan: `"-"`, `"--"`, `"N/A"`, `"na"`, `"none"`, `"null"`, `"tidak ada"`, `"kosong"`.

### B. Pembersihan Nama Perusahaan (PT Suffix to Prefix)
Nama PT sering ditulis tidak konsisten di bagian belakang. Fungsi `cleanCompanyName()` menstandarkan penulisan:
* Contoh: `"Kim Communication PT"` atau `"Kim Communication PT."` -> Diformat menjadi `"PT Kim Communication"`.

### C. Pembersihan & Normalisasi Nomor Telepon
Nomor telepon dibersihkan dari karakter non-angka melalui regex `[^0-9]`.
* Jika hanya berisi kode negara tanpa nomor pelanggan (misal: `"62"`, `"0"`), maka dikosongkan.
* Untuk penyimpanan pencarian duplikat, nomor ponsel diformat menjadi kode internasional: awalan `0812...` dikonversi menjadi `+62812...` di kolom `normalized_phone`.
