# User Roles & Permission Matrix Workflow

Dokumen ini menjelaskan pembagian hak akses (*authorization*) dalam sistem CRM Kim Communication baik di sisi Frontend (React/Next.js) maupun Backend (Spring Boot).

---

## 1. Definisi Role Pengguna

Sistem saat ini mendefinisikan tiga tingkatan *role* utama yang tersimpan dalam database (`Role` enum):

| Role Name | Scope | Deskripsi Umum |
| :--- | :--- | :--- |
| **`ADMIN`** | System & Security | Pengendali penuh sistem. Mengelola user account, settings, pembersihan data sensitif (*takeout request*), dan eksekusi tindak lanjut temuan fraud ("Tikus"). |
| **`MANAGER`**| Event & Operations | Pengelola operasional harian. Menangani data kontak, perusahaan, grup, pembuatan event, penugasan lead, dan follow-up telemarketing / reminder. |
| **`USER`**   | Viewer / Read-Only | Pembaca data umum. Hanya diperbolehkan memantau daftar kontak, perusahaan, dan event tanpa memiliki hak edit atau impor/ekspor data. |

---

## 2. Matriks Akses Fitur & Halaman (UI)

Berikut adalah pemetaan akses visual di Next.js Dashboard (`app/dashboard/layout.tsx`):

| Menu Navigasi / Aksi | `ADMIN` | `MANAGER` | `USER` | Lokasi Komponen UI |
| :--- | :---: | :---: | :---: | :--- |
| **Dashboard Overview** | Yes | Yes | Yes | `app/dashboard/page.tsx` |
| **Groups (View)** | Yes | Yes | Yes | `app/dashboard/groups/page.tsx` |
| **Groups (Create/Edit/Delete)** | Yes | Yes | No | `app/dashboard/groups/page.tsx` |
| **Companies (View)** | Yes | Yes | Yes | `app/dashboard/companies/page.tsx` |
| **Companies (Create/Edit/Delete)** | Yes | Yes | No | `app/dashboard/companies/page.tsx` |
| **Contacts (View)** | Yes | Yes | Yes | `app/dashboard/contacts/page.tsx` |
| **Contacts (Create/Edit/Delete)** | Yes | Yes | No | `app/dashboard/contacts/page.tsx` |
| **Import Excel & Template Download** | Yes | Yes | No | `app/dashboard/contacts/page.tsx` |
| **Export Excel Contacts** | Yes | Yes | No | `app/dashboard/contacts/page.tsx` |
| **Events (View)** | Yes | Yes | Yes | `app/dashboard/events/page.tsx` |
| **Events (Create/Edit/Delete)** | Yes | Yes | No | `app/dashboard/events/page.tsx` |
| **Add Lead to Event** | Yes | Yes | Yes | `app/dashboard/events/page.tsx` |
| **Update Lead Remarks & Reminders** | Yes | Yes | Yes | `app/dashboard/events/page.tsx` |
| **Remove Lead from Event** | Yes | Yes | No | `app/dashboard/events/page.tsx` |
| **Export Excel Event Leads** | Yes | Yes | Yes | `app/dashboard/events/page.tsx` |
| **Flagged Identities Directory (View)**| Yes | Yes | Yes | `app/dashboard/flagged/page.tsx` |
| **Flagged Identities (Create/Resolve)**| Yes | No | No | `app/dashboard/flagged/page.tsx` |
| **Removal Requests (Settings)** | Yes | No | No | `app/dashboard/settings/page.tsx` |
| **User Management** | Yes | No | No | `app/dashboard/users/page.tsx` |

---

## 3. Implementasi Kontrol Akses (Security)

### 3.1. Frontend (Next.js)
Kontrol di frontend dikelola melalui **`AuthContext`** (`lib/context/AuthContext.tsx`) yang mengekspos variabel status boolean:
* `isAdmin`: `user.roles.includes('ADMIN')`
* `isManager`: `user.roles.includes('MANAGER')`
* `isUser`: `user.roles.includes('USER')`

**Contoh Proteksi Elemen UI:**
```tsx
const { isAdmin, isManager, isUser } = useAuth();

// Tombol impor hanya tampil bagi Admin dan Manager
{!isUser && (
  <button onClick={handleImportClick}>Import Excel</button>
)}

// Menu User Management hanya di-render untuk Admin
{isAdmin && (
  <Link href="/dashboard/users">User Management</Link>
)}
```

### 3.2. Backend (Spring Boot / SecurityHelper)
Setiap endpoint API memverifikasi kredensial JWT dan memeriksa role pengguna menggunakan komponen pembantu `SecurityHelper.java`:
```java
@Autowired
private SecurityHelper securityHelper;

@PostMapping("/import")
public ResponseEntity<?> importContacts(
        @RequestParam("file") MultipartFile file,
        @RequestHeader("Authorization") String authHeader) {
    
    AppUser currentUser = securityHelper.getAuthenticatedUser(authHeader);
    if (currentUser == null) {
        return ResponseEntity.status(401).body("Unauthorized");
    }
    
    // Membatasi akses agar hanya ADMIN atau MANAGER yang dapat mengimpor
    if (!securityHelper.hasAnyRole(currentUser, Role.ADMIN, Role.MANAGER)) {
        return ResponseEntity.status(403).body("Forbidden: Only ADMIN or MANAGER can import");
    }
    
    // Jalankan logika import...
}
```

---

## 4. Alur Kerja Perubahan Role
1. Hanya user dengan role **`ADMIN`** yang dapat membuat user baru atau mengubah role user lain.
2. Perubahan role langsung tersimpan di tabel database `app_users` (atau tabel relasi user-roles) dan akan langsung berdampak pada sesi berikutnya setelah user memperbarui token JWT mereka (re-login / verify session).
