'use client';

export default function DatabaseError({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="mx-auto my-12 max-w-xl rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Tampilan Database belum dapat dimuat</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">Jika baru selesai upload Excel, periksa daftar Database terlebih dahulu sebelum mengupload file yang sama lagi.</p>
      <button type="button" onClick={retry} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Muat ulang Database</button>
    </section>
  );
}
