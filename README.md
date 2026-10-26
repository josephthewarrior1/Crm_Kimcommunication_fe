# Crm_Kimcommunication

CRM Kim Communication: frontend Next.js dan backend Spring Boot di repository
`Crm_Kimcommunication_be`.

## Isi rilis main

- Next.js 16.4.3, React 19.3.1, dan Sharp 0.35.5 dengan patch keamanan.
- Dashboard ringkasan posisi serta grafik database.
- Integrasi EMS v2: pemilihan sumber EMS di form event, routing backend per event,
  serta migrasi kolom `events.ems_source`. Mapping lama tetap menggunakan `LEGACY`.
- EO Scout dan TAGTOG ditunda dan tidak disertakan dalam paket rilis ini.

Deploy mengambil branch `main` frontend dan backend dari GitHub. Hash commit yang
dibangun dicatat pada folder rilis, lalu kedua repository live di-fast-forward ke
commit yang sama lewat `git pull --ff-only`.

## Deploy rilis lengkap

Gunakan satu entry point: `scripts/deploy-crm-git.sh`. Dari console server sebagai
root, unduh script dari repository lalu jalankan:

```bash
curl --fail --location --proto '=https' \
  https://raw.githubusercontent.com/josephthewarrior1/Crm_Kimcommunication_fe/main/scripts/deploy-crm-git.sh \
  -o /root/deploy-crm-git.sh
bash /root/deploy-crm-git.sh
```

Script menarik `main`, menyiapkan Node 24.22.1 LTS, membangun frontend/backend di
Git worktree terpisah, lalu membuat backup database, unggahan, dan konfigurasi.
Persiapan berjalan di background. Perintah log, status, dan kelanjutan dicetak
beserta folder rilisnya.

Setelah persiapan berhasil, jalankan perintah `continue` yang dicetak. Salin backup
ke PC dengan instruksi yang ditampilkan dan masukkan SHA256 hasil PC. Baru setelah
itu script melakukan Git pull pada kedua repository live, menjalankan migrasi EMS,
mengganti hasil build, mengaktifkan Node 24.22.1 untuk CRM, dan memeriksa layanan.

Perubahan konfigurasi lokal yang dikenali disimpan; perubahan source yang belum
ditinjau atau branch yang divergen membuat deploy berhenti. Rollback aplikasi
mempertahankan schema tambahan dan menolak downgrade jika mapping EMS baru sudah
terbentuk atau tidak dapat diperiksa.

`deploy-crm-main.ps1`, `deploy-crm-main-server.sh`, `recover-crm-main-lock.sh`, dan
`deploy-crm-ui*` merupakan jalur sebelumnya. Untuk deploy dari Git gunakan hanya
`deploy-crm-git.sh`.

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
python scripts/check-crm-git-deploy.py
```
