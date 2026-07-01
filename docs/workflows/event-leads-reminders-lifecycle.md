# Event Leads & Reminder Lifecycle Workflow

Dokumen ini menjelaskan alur kerja pengelolaan peserta acara (*Event Leads*), metode komunikasi (*Engagement Channels*), status konfirmasi & kehadiran, serta siklus follow-up berjangka (*Milestone Reminders*) pada CRM Kim Communication.

---

## 1. Konsep Dasar Event Lead

Sebuah **Lead** adalah entri relasional yang menghubungkan satu profil **Contact** ke satu **Event** tertentu (tabel database: `event_leads`).
* **Lead Baru:** Dapat ditugaskan secara manual dari halaman detail Event melalui tombol **"Add Lead"** dengan memilih kontak aktif yang belum terdaftar di event tersebut.
* **Keamanan:** Pengecekan dilakukan di database untuk memastikan relasi unik antara `event_id` dan `contact_id` (`unique_event_contact`).

---

## 2. Struktur Pengelolaan Lead di Antarmuka (UI)

Halaman detail Event terbagi menjadi dua tab utama yang melayani fungsi operasional berbeda:

### A. Tab "Event" (Manajemen & Registrasi Utama)
Tab ini menampilkan seluruh daftar kontak yang ditugaskan ke event tersebut. Staf Event dapat mengelola detail operasional berikut:

1. **Engagement Status (Aksi Cepat Follow-up):**
   * Diwakili oleh 3 ikon indikator: **Call** 📞, **Email** ✉️, dan **WhatsApp** 💬.
   * **Logika Interaksi:** *Double-click* (klik dua kali) pada ikon di tabel untuk mengganti status keaktifannya. Status akan berubah warna (misalnya WhatsApp menjadi hijau) menandakan saluran komunikasi tersebut telah dicoba.
2. **Tele Remarks (Lead Status):**
   * Menunjukkan hasil komunikasi telemarketing. Pilihan:
     * *Not respond yet* (White) | *Not respond 2x* s/d *9x* (Gray/Slate) | *Tentative* (Yellow) | *Registered* (Green) | *Not Interest* (Red).
3. **Confirmation Status:**
   * Menunjukkan persetujuan resmi kehadiran peserta. Pilihan:
     * *Pending* (Blue) | *Approve* (Green) | *Decline* (Red).
4. **Attendance Status (Kehadiran Hari-H):**
   * Pencatatan saat acara berlangsung. Pilihan:
     * *Invited* | *Registered* | *Attended* | *No Show* | *Cancelled*.
5. **Batch Updates (Pembaruan Massal):**
   * Memungkinkan pengguna memilih beberapa baris lead sekaligus untuk memperbarui status konfirmasi, kehadiran, atau status komunikasi secara bersamaan demi efisiensi waktu.

---

### B. Tab "Reminder" (Follow-Up Milestone Berjangka)
Tab ini memiliki **logika penyaringan (filtering) yang sangat ketat**. Lead hanya akan muncul di tab ini jika memenuhi kriteria kelayakan follow-up:
$$\text{Confirmation Status} = \text{"approve"} \quad \land \quad \text{Lead Status / Remarks} = \text{"registered"}$$

Jika salah satu status di atas diubah di tab Event (misalnya status konfirmasi diubah kembali menjadi *pending*), maka lead tersebut otomatis hilang dari tab Reminder.

#### Alur Milestone Reminder:
Staf melakukan follow-up secara berkala pada empat titik waktu kritis sebelum acara dimulai:
1. **H-7 (7 Hari Sebelum Acara):** Mengingatkan peserta seminggu sebelum acara.
2. **H-3 (3 Hari Sebelum Acara):** Mengirimkan pembaruan informasi acara.
3. **H-1 (1 Hari Sebelum Acara):** Mengirimkan pengingat H-1 (biasanya berisi detail lokasi / barcode registrasi).
4. **Hari H (Hari Pelaksanaan Acara):** Tindak lanjut kehadiran akhir di lokasi.

Setiap kolom milestone memiliki dropdown status respons tersendiri untuk memantau apakah peserta tetap berkomitmen hadir (*Confirm*), ragu-ragu (*Tentative*), tidak merespons (*Not respond yet*), atau membatalkan (*Unable to attend*).

---

## 3. Ekspor Data Excel Terspesialisasi

Sistem mendukung ekspor data terpisah berdasarkan tab aktif untuk menyesuaikan kebutuhan laporan:
1. **Ekspor dari Tab "Event":** Menghasilkan file Excel berisi data demografis kontak, status komunikasi (Call/Email/WA), Tele Remarks, Confirmation Status, dan status kehadiran akhir. Cocok untuk laporan registrasi umum.
2. **Ekspor dari Tab "Reminder":** Menghasilkan file Excel terfokus yang memuat riwayat tindak lanjut berjangka (H-7, H-3, H-1, Hari H) beserta catatan khusus reminder. Cocok untuk tim operasional lapangan dalam memantau kedatangan peserta.
