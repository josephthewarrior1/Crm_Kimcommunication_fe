import React from 'react';
import { AlertTriangle, BookOpen, Building2, Check, ChevronRight, Columns, ListChecks } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../../components/ui/dialog';

const requiredColumns = [
  'Nama Group/Holding Company', 'Nama Brand', 'Company Name', 'Salutation',
  'First Name', 'Last Name', 'Position', 'Jobtitle', 'Address', 'Office Phone',
  'Mobile Phone', 'Company Email Address', 'Industry', 'City', 'Company Website',
];

const optionalColumns = [
  'No', 'Division', 'Personal Email Address', 'Company Size (Revenue)',
  'Company Size (Employee)', 'Company Hardware', 'Linkedin Link', 'Cabang/Kantor', 'Postal Code',
];

export const DatabaseImportGuide = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button type="button" className="group flex w-full items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
        <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">Cara import & hal yang perlu diperhatikan</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Panduan kolom wajib, data perusahaan, dan cabang.</span>
        </span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
      </button>
    </DialogTrigger>

    <DialogContent className="max-w-4xl" aria-describedby="database-import-guide-description">
      <DialogHeader>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-600">
          <BookOpen aria-hidden="true" className="h-4 w-4" />Panduan import database
        </div>
        <DialogTitle>Cara import & hal yang perlu diperhatikan</DialogTitle>
        <DialogDescription id="database-import-guide-description">Gunakan panduan ini saat mengisi template dan memeriksa hasil preview.</DialogDescription>
      </DialogHeader>

      <div className="ms-modal-body space-y-6 text-sm leading-6 text-slate-600">
        <section aria-labelledby="import-guide-steps">
          <h3 id="import-guide-steps" className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><ListChecks aria-hidden="true" className="h-4 w-4 text-blue-600" />Langkah import</h3>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              ['Download dan isi template', 'Isi mulai baris 2, satu kontak per baris. Ganti atau hapus baris contoh. Jangan ubah nama atau urutan kolom.'],
              ['Upload file Excel', 'Simpan sebagai .xlsx atau .xls, pilih file, lalu klik “Preview & Analisis Excel”.'],
              ['Periksa hasil preview', 'Baru berarti kontak baru. Update DB berarti kontak yang cocok akan diperbarui. Periksa nama, company, dan cabangnya.'],
              ['Import data bersih', 'Perbaiki baris Belum Lengkap/Konflik lalu upload ulang, atau lanjutkan data bersih. Baris bermasalah dilewati dan dilaporkan.'],
            ].map(([title, description], index) => (
              <li key={title} className="flex gap-3 rounded-md border border-slate-200 p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</span>
                <div><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 text-xs leading-5">{description}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs leading-5">Tab preview hanya menyaring tampilan. Tombol import memproses seluruh baris bersih, termasuk yang tidak terlihat di tab aktif.</p>
        </section>

        <section aria-labelledby="import-guide-company" className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <h3 id="import-guide-company" className="flex items-center gap-2 font-semibold text-slate-900"><Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" />Company sama + cabang/kantor sama = data lokasi harus sama</h3>
          <p className="mt-2">Samakan <strong className="font-semibold text-slate-800">Address, Office Phone, City, dan Postal Code</strong> pada baris untuk lokasi yang sama. Kalau cabangnya berbeda, data lokasi boleh berbeda.</p>
          <div role="region" aria-label="Contoh alamat perusahaan dan cabang" tabIndex={0} className="mt-3 overflow-x-auto rounded-md border border-blue-100 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            <table className="w-full min-w-[480px] text-left text-xs leading-5">
              <caption className="px-3 py-2 text-left font-medium text-slate-700">Contoh pengisian untuk tiga kontak (alamat ilustrasi)</caption>
              <thead className="border-y border-slate-200 bg-slate-50 text-slate-500"><tr><th scope="col" className="px-3 py-2 font-medium">Company Name</th><th scope="col" className="px-3 py-2 font-medium">Cabang/Kantor</th><th scope="col" className="px-3 py-2 font-medium">Address</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr><td className="px-3 py-2">BCA</td><td className="px-3 py-2">Pademangan</td><td className="px-3 py-2">Alamat Pademangan</td></tr>
                <tr><td className="px-3 py-2">BCA</td><td className="px-3 py-2">Pademangan</td><td className="px-3 py-2">Alamat Pademangan</td></tr>
                <tr><td className="px-3 py-2">BCA</td><td className="px-3 py-2">Bandung</td><td className="px-3 py-2">Alamat Bandung</td></tr>
              </tbody>
            </table>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5">
            <li><strong className="font-semibold text-slate-800">Data company tetap seragam di semua cabang:</strong> Nama Group/Holding Company, Nama Brand, Industry, Company Size (Revenue/Employee), Company Hardware, dan Company Website.</li>
            <li>Satu holding boleh memiliki beberapa company dengan alamat berbeda. Nama holding yang sama saja tidak berarti alamatnya harus sama.</li>
            <li>Jika data lokasi berbeda antarbaris Excel untuk cabang yang sama, semua baris cabang itu di file ditandai konflik. Jika data company berbeda antarbaris Excel, semua baris company itu ditandai konflik.</li>
          </ul>
        </section>

        <section aria-labelledby="import-guide-columns">
          <h3 id="import-guide-columns" className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><Columns aria-hidden="true" className="h-4 w-4 text-blue-600" />Kolom yang perlu diisi</h3>
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200">
              <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">Wajib untuk kontak baru <span className="ml-1 text-xs font-normal text-slate-500">15 kolom</span></h4>
              <ul className="space-y-1.5 p-4 text-xs leading-5">{requiredColumns.map(column => <li key={column} className="flex items-start gap-2"><Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" /><span>{column}</span></li>)}</ul>
            </div>
            <div className="rounded-md border border-slate-200">
              <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">Opsional <span className="ml-1 text-xs font-normal text-slate-500">9 kolom</span></h4>
              <ul className="list-inside list-disc space-y-1.5 p-4 text-xs leading-5">{optionalColumns.map(column => <li key={column}>{column}</li>)}</ul>
              <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5">Boleh benar-benar kosong. Kolom <strong>No</strong> hanya nomor urut Excel, bukan ID kontak. Cabang/Kantor ada di kolom U, tepat setelah Linkedin Link dan sebelum City. Template lama tetap bisa digunakan.</p>
            </div>
          </div>
          <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5">
            <p><strong className="font-semibold text-slate-800">Saat memperbarui kontak:</strong> tetap isi First Name, Last Name, dan Company Name. Kolom wajib lainnya bisa memakai data tersimpan jika tersedia; jika nilai wajib itu belum tersedia, baris tetap Belum Lengkap. Email lama dipertahankan.</p>
            <p><strong className="font-semibold text-slate-800">Cabang yang sudah ada:</strong> Address, Office Phone, dan City boleh kosong jika data cabang tersebut sudah lengkap, termasuk untuk kontak baru. Data lokasi tidak diambil dari kantor pusat.</p>
            <p>Jangan isi tanda “-” untuk meloloskan kolom wajib. “-”, “n/a”, dan “tidak ada” tetap dianggap kosong.</p>
          </div>
        </section>

        <section aria-labelledby="import-guide-checks">
          <h3 id="import-guide-checks" className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-600" />Periksa sebelum upload</h3>
          <ul className="list-disc space-y-3 pl-5 text-xs leading-5">
            <li><strong className="font-semibold text-slate-800">Cabang dan alamat:</strong> isi Company Name dengan nama perusahaan saja, lalu isi cabang di Cabang/Kantor. Cabang baru dibuat otomatis di company tersebut. Kalau cabang dikosongkan, kontak lama mempertahankan cabangnya; kontak baru terhubung langsung ke company.</li>
            <li><strong className="font-semibold text-slate-800">Data yang sudah ada:</strong> Office Phone cabang diperbarui mengikuti Excel jika diisi. Nomor kosong mempertahankan nomor lama; data master lainnya hanya dilengkapi jika kosong. Alamat cabang yang berbeda dari data tersimpan ditandai konflik. Ubah lokasi lewat Company Details; pindahkan kontak yang sudah bercabang lewat Edit kontak.</li>
            <li><strong className="font-semibold text-slate-800">Satu kontak, satu baris:</strong> nama lengkap + company yang sama, Mobile Phone yang sama, atau Personal Email yang sama pada beberapa baris dapat menyebabkan konflik. Company Email dan Office Phone boleh dipakai beberapa kontak.</li>
            <li><strong className="font-semibold text-slate-800">Pisahkan jenis email:</strong> email kantor masuk Company Email Address. Personal Email Address hanya untuk domain pribadi yang didukung, misalnya Gmail, Yahoo, atau Outlook. Jangan taruh alamat email yang sama di kedua kolom. Pisahkan beberapa email dengan titik koma (;).</li>
            <li><strong className="font-semibold text-slate-800">Format telepon dan kode pos:</strong> gunakan format sel Text agar angka nol di depan tetap tersimpan. Jangan mengisi data asal hanya supaya kolom terlihat lengkap.</li>
          </ul>
        </section>
      </div>

      <div className="ms-modal-footer">
        <DialogClose asChild><button type="button" className="ms-modal-primary">Mengerti, kembali ke import</button></DialogClose>
      </div>
    </DialogContent>
  </Dialog>
);
