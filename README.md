# Crm_Kimcommunication

CRM Kim Communication: frontend Next.js dan backend Spring Boot di repository
`Crm_Kimcommunication_be`.

## Isi rilis main

- Update keamanan Next.js 16.4.2, React 19.3.1, dan Sharp 0.35.5.
- Dashboard ringkasan posisi serta grafik database.
- Integrasi EMS v2: pemilihan sumber EMS di form event, routing backend per event,
  serta migrasi kolom `events.ems_source`. Mapping lama tetap menggunakan `LEGACY`.
- EO Scout dan TAGTOG ditunda dan tidak disertakan dalam paket rilis ini.

Kode aplikasi frontend berasal dari commit `33e7d95`; backend dari `d93f41d`.
Commit frontend setelahnya menambahkan alat deploy dan dokumentasi. Paket deploy
mengambil commit tersebut, sehingga perubahan lokal yang belum dipush tidak ikut.

## Deploy rilis lengkap

Gunakan `scripts/deploy-crm-main.ps1` beserta helper
`scripts/deploy-crm-main-server.sh`. Dari PowerShell PC:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\deploy-crm-main.ps1" -ConfigureEms
```

Alur deploy: konfigurasi EMS di server, build FE/BE, backup database/unggahan/
konfigurasi, salin dan verifikasi backup di PC, lalu ganti layanan dan cek kesehatan.
Jalur web console memakai paket rilis yang disiapkan terlebih dahulu di server;
tetap perlu verifikasi salinan backup di PC sebelum melanjutkan.

**Jangan gunakan `scripts/deploy-crm-ui.ps1` atau `scripts/deploy-crm-ui-server.sh`
untuk rilis lengkap ini.** Keduanya merupakan jalur lama untuk UI saja dan tidak
memasang integrasi EMS v2 beserta migrasinya.

## Konfigurasi EMS

Lima nama variabel tersedia di `integrations/ems-v2/backend.env.example`.
Nilai privat disimpan di server pada `/var/www/crm-be/.env.ems-v2`, bukan di Git
atau variabel `NEXT_PUBLIC_*`. Isi email/password akun EMS dan biarkan
`EMS_V2_ACCESS_TOKEN` kosong untuk login IAM dan pembaruan token otomatis.

Periksa integrasi dan pengaman rollback tanpa menghubungi server:

```text
node scripts/check-ems-integration.cjs
node scripts/check-chart-dependencies.cjs
python scripts/check-crm-main-deploy.py
```
