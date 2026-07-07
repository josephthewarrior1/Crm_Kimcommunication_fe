# Tikus (Suspicious Identity) Detection Logic

Dokumen ini menjelaskan alur kerja deteksi "Tikus" (fraud/spam) dalam CRM Kim Communication.

---

## 1. Alur Deteksi Duplikasi Otomatis

Sistem mendeteksi potensi fraud secara otomatis saat kontak disimpan atau diimpor dari Excel dengan aturan:
1. **`duplicate_phone`**: Jika nomor HP yang sama didaftarkan oleh kontak dengan nama depan/belakang yang berbeda. Status diatur ke `suspected`.
2. **`duplicate_email`**: Jika alamat email yang sama digunakan oleh kontak dengan nama yang berbeda. Status diatur ke `suspected`.

## 2. Penyelesaian Status Flag oleh Admin

Hanya user dengan role **`ADMIN`** yang diizinkan untuk melihat menu ini dan mengubah status atau menghapus entri di Tikus Directory:
* **Confirmed**: Terkonfirmasi sebagai fraud/identitas palsu (disembunyikan dari direktori utama).
* **Cleared**: Dinyatakan aman (false positive), tanda peringatan dihapus.
* **Deleted**: Menghapus entri flag sepenuhnya dari daftar pantau.

