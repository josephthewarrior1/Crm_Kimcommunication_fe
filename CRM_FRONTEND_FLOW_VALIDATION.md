# CRM Frontend Flow & Validasi Per Tab

Dokumen ini merangkum flow utama dan validasi penting yang terjadi di frontend CRM KIM Communication.

## Global Flow

- User masuk lewat halaman login, lalu diarahkan ke dashboard jika sesi valid.
- Dashboard memakai layout sidebar untuk navigasi tab: Overview, Groups, Companies, Contacts, Events, Flagged Identities, Removal Requests, dan User Management.
- Role dipakai untuk membatasi akses:
  - `USER`: umumnya hanya lihat data.
  - `MANAGER`: bisa create/update data operasional.
  - `ADMIN`: punya akses penuh, termasuk delete, removal audit, dan user management.
- Semua proses create/update/delete memakai toast untuk feedback sukses/gagal.
- Setelah aksi berhasil, frontend reload data tab terkait supaya table/list langsung sinkron dengan backend.

## 1. Overview

Flow:

- Saat tab dibuka, frontend mengambil data Groups, Companies, Contacts, Events, Flagged Identities, dan Event Leads secara paralel.
- Data dipakai untuk menampilkan summary card, chart industry company, chart attendance event, dan alert suspicious identity.

Validasi penting:

- Jika load data gagal, muncul toast error bahwa dashboard gagal dimuat.
- Total contacts hanya menghitung contact aktif, yaitu `isActive !== false`.
- Alert suspicious identity hanya menampilkan data dengan status `suspected` atau `confirmed`.
- Event attendance chart menghitung invited vs attended dari leads milik event tersebut.

## 2. Groups

Flow:

- User melihat list holding group.
- User bisa search group berdasarkan nama.
- Non-USER bisa tambah dan edit group.
- ADMIN bisa delete group.
- Create/update/delete akan reload list setelah sukses.

Validasi penting:

- `Group Name` wajib diisi saat create dan edit.
- Input nama di-trim sebelum dikirim.
- `Notes` optional; jika kosong dikirim sebagai `undefined`.
- Delete memakai confirmation modal.
- Saat delete group, frontend memberi warning bahwa company yang terkait akan kehilangan reference group.

API utama:

- `GET /api/groups`
- `POST /api/groups`
- `PUT /api/groups/{id}`
- `DELETE /api/groups/{id}`

## 3. Companies

Flow:

- User melihat list company dan dapat search/filter.
- Data company dimuat bersama Groups dan Contacts agar table bisa menampilkan relasi group serta jumlah active contact.
- Non-USER bisa tambah/edit company.
- ADMIN bisa delete company.
- Detail modal menampilkan profil company dan daftar contact aktif yang terhubung.

Validasi penting:

- `Company Name` wajib diisi saat create dan edit.
- Field lain optional: brand name, group, address, office phone, website, industry, revenue size, employee size, hardware, city.
- Semua string di-trim sebelum dikirim.
- `Group` optional; jika dipilih dikirim sebagai `groupId`.
- Delete memakai confirmation modal.
- Saat delete company, frontend memberi warning bahwa contact terkait akan kehilangan reference company.

API utama:

- `GET /api/companies`
- `POST /api/companies?groupId={id}`
- `PUT /api/companies/{id}?groupId={id}`
- `DELETE /api/companies/{id}`

## 4. Contacts

Flow:

- User melihat list contact aktif, dengan filter/search dan indikator completeness/suspicious flag.
- Data yang dimuat: Contacts, Companies, Groups, dan Flagged Identities.
- Non-USER bisa create/edit contact.
- ADMIN bisa delete contact.
- User bisa melihat detail contact, email list, dan event participation history.
- User bisa bulk import contact dari Excel melalui preview terlebih dahulu, lalu confirm import.
- User bisa membuat takeout/opt-out request dari contact; flow ini menandai contact menjadi inactive melalui removal request.

Validasi create/edit manual:

- Field wajib contact:
  - Salutation
  - First Name
  - Last Name
  - Position Level, tidak boleh `unknown`
  - Job Title
  - Mobile Phone
  - Company Email
  - Personal Email
  - LinkedIn Profile URL
  - Associated Company
- Jika ada field wajib kosong, frontend menampilkan toast berisi daftar field yang belum diisi.
- Mobile phone dinormalisasi ke format `+62...` dengan mengganti awalan `0`.
- Company email disimpan sebagai email type `company`, `isCorporate: true`, `isPrimary: true`.
- Personal email disimpan sebagai email type `personal`, `isCorporate: false`.
- Saat edit, email company/personal akan update existing email jika ID sudah ada, create baru jika belum ada, atau delete email jika field dikosongkan.

Validasi completeness indicator:

- Contact dianggap incomplete jika data berikut tidak lengkap:
  - Nama Group Holding
  - Nama Brand
  - Company Name
  - Salutation
  - First Name
  - Last Name
  - Position
  - Job Title
  - Address
  - Office Phone
  - Mobile Phone
  - Company Email
  - Personal Email
  - Industry
  - LinkedIn Link
  - City
  - Company Website

Validasi Excel import:

- User wajib memilih file Excel sebelum preview/import.
- Preview memanggil backend untuk menghitung total rows, data baru, dan duplicate.
- Jika duplicate terdeteksi, UI menjelaskan bahwa data duplicate akan disinkronkan/update, bukan dibuat sebagai duplicate baru.
- Import baru bisa dilakukan setelah file dipilih dan user confirm.

Validasi takeout/opt-out:

- Takeout membutuhkan selected contact.
- Request dikirim dengan reason, requested by, source database, notes, dan status `done`.
- Setelah sukses, contact ditandai inactive dan list di-reload.

API utama:

- `GET /api/contacts`
- `POST /api/contacts?companyId={id}`
- `PUT /api/contacts/{id}?companyId={id}`
- `DELETE /api/contacts/{id}`
- `GET /api/contacts/{id}/emails`
- `POST /api/contacts/{id}/emails`
- `PUT /api/contacts/{contactId}/emails/{emailId}`
- `DELETE /api/contacts/{contactId}/emails/{emailId}`
- `GET /api/contacts/{id}/event-leads`
- `POST /api/contacts/import/preview`
- `POST /api/contacts/import`
- `POST /api/removal-requests`

## 5. Events

Flow:

- User melihat list event dan bisa search event.
- Non-USER bisa create/edit event.
- ADMIN bisa delete event.
- Saat event dipilih, frontend mengambil semua event leads lalu filter berdasarkan selected event.
- User bisa add contact sebagai lead event.
- User bisa update status lead, attendance, category, call/email/WhatsApp/meeting status, business challenges, project info, timeline, dan notes.
- User bisa batch update attendance atau lead status untuk selected leads.
- User bisa export leads event ke Excel.
- User bisa buka report performance event.
- User bisa log activity per lead.

Validasi event:

- `Event Name` wajib diisi saat create dan edit.
- Event type wajib punya value dari state form.
- Client name, date start, date end, dan notes optional.
- Delete event memakai confirmation modal.

Validasi add lead:

- Harus ada selected event.
- Minimal satu contact harus dipilih.
- Contact yang sudah masuk event difilter dari list available contact.
- Hanya contact aktif yang dimuat untuk pilihan lead.

Validasi export:

- Export hanya bisa jika selected event ada dan leads tidak kosong.
- Jika tidak ada data, frontend menampilkan toast: tidak ada data lead untuk export.
- Nama file Excel dibersihkan dari karakter non-alfanumerik.

Validasi lead update:

- Update lead hanya berjalan jika selected event dan active lead tersedia.
- Status yang dikirim mempertahankan field lama jika field lain hanya diubah sebagian.
- Batch update di-skip jika tidak ada selected lead.
- Toggle call/email/WhatsApp juga membuat activity log otomatis.
- Trigger WhatsApp membutuhkan nomor phone.
- Trigger email membutuhkan email contact.

API utama:

- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/{id}`
- `DELETE /api/events/{id}`
- `GET /api/event-leads`
- `POST /api/event-leads`
- `PUT /api/event-leads/{id}/status`
- `POST /api/event-leads/{id}/activities`
- `GET /api/event-leads/{id}/activities`
- `GET /api/event-leads/report/{eventId}`
- `DELETE /api/event-leads/{id}`

## 6. Flagged Identities

Flow:

- User melihat list suspicious identity dan bisa filter/search.
- User bisa create flagged identity, optional link ke contact dan event.
- User bisa edit detail flag.
- User bisa delete/clear record dari flagged list.

Validasi penting:

- Minimal salah satu dari `Name`, `Email`, atau `Phone` wajib diisi saat create.
- `Flag Reason` punya default `multiple_identity`.
- `Status` punya default `suspected`.
- Evidence notes optional.
- Contact dan event relation optional.
- Delete memakai confirmation modal karena record dihapus permanen dari list.

Status:

- `suspected`
- `confirmed`
- `cleared`

API utama:

- `GET /api/flagged-identities`
- `POST /api/flagged-identities`
- `PUT /api/flagged-identities/{id}`
- `DELETE /api/flagged-identities/{id}`

## 7. Removal Requests

Flow:

- Tab ini hanya untuk ADMIN.
- ADMIN melihat daftar opt-out/takeout request.
- Jika status masih `pending`, ADMIN bisa approve atau reject.
- Request yang bukan pending ditampilkan sebagai archived.

Validasi penting:

- Jika user bukan ADMIN, frontend menampilkan Access Denied.
- Update status hanya dilakukan dari action button.
- Approve mengirim status `done`.
- Reject mengirim status `rejected`.
- Setelah update status berhasil, list request di-reload.

API utama:

- `GET /api/removal-requests`
- `PUT /api/removal-requests/{id}/status?status={status}`

## 8. User Management

Flow:

- Tab ini hanya untuk ADMIN.
- ADMIN bisa melihat user list, mengubah role, membuat user baru, mengganti password user, dan delete account.

Validasi create user:

- Field wajib:
  - Username
  - Email
  - Password
  - Confirm Password
- Password dan Confirm Password harus sama.
- Full name optional.
- Role default adalah `USER`.

Validasi change password:

- Password dan confirm password wajib diisi.
- Password dan confirm password harus sama.

Validasi delete user:

- ADMIN tidak bisa delete account sendiri.
- Delete memakai confirmation modal.

Validasi akses:

- Jika user bukan ADMIN, frontend menampilkan Access Denied.
- Sidebar hanya menampilkan User Management untuk ADMIN.

API utama:

- `GET /api/users`
- `PUT /api/users/{id}/role?role={role}`
- `PUT /api/users/{id}/password`
- `DELETE /api/users/{id}`
- `POST /api/auth/register`
