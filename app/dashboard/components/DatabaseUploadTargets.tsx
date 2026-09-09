'use client';

import React, { useEffect, useState } from 'react';
import { Target, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { crmService } from '../../../lib/services/crmService';
import { DatabaseUploadTarget, DatabaseUploadTargetsResponse } from '../../../lib/types';

function TargetEditor({ row, disabled, daysInMonth, onSave }: {
  row: DatabaseUploadTarget;
  disabled: boolean;
  daysInMonth: number;
  onSave: (userId: number, count: number, mode: DatabaseUploadTarget['targetMode']) => Promise<void>;
}) {
  const [value, setValue] = useState(String(row.targetCount));
  const [mode, setMode] = useState(row.targetMode);
  return (
    <form className="space-y-2" onSubmit={(event) => {
      event.preventDefault();
      const count = Number(value);
      if (!value.trim() || !Number.isInteger(count) || count < 0 || count > 2147483647) {
        toast.error('Target harus bilangan bulat mulai dari 0.');
        return;
      }
      void onSave(row.userId, count, mode);
    }}>
      <select aria-label={`Jenis target ${row.fullName || row.username}`} value={mode} disabled={disabled}
        onChange={event => setMode(event.target.value as DatabaseUploadTarget['targetMode'])}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
        <option value="DAILY">Per hari · berlaku sebulan</option>
        <option value="MONTHLY">Total sebulan</option>
      </select>
      <div className="flex items-center gap-2">
      <input type="number" min="0" max="2147483647" step="1" required value={value}
        onChange={event => setValue(event.target.value)} disabled={disabled}
        aria-label={`Target ${row.fullName || row.username}`}
        className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
      <button type="submit" disabled={disabled || (value === String(row.targetCount) && mode === row.targetMode)}
        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        Simpan
      </button>
      </div>
      <p className="text-[11px] text-slate-500">{mode === 'DAILY' ? `${Number(value || 0).toLocaleString()} per hari × ${daysInMonth} hari = ${(Number(value || 0) * daysInMonth).toLocaleString()} sebulan` : 'Total kontak dalam bulan terpilih'}</p>
    </form>
  );
}

export default function DatabaseUploadTargets() {
  const { isAdmin, user } = useAuth();
  const [month, setMonth] = useState('');
  const [date, setDate] = useState('');
  const [data, setData] = useState<DatabaseUploadTargetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError('');
    crmService.getDatabaseUploadTargets(month || undefined, date || undefined).then(result => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setError('Target belum bisa dimuat. Pastikan backend terbaru dan migrasi target sudah terpasang, lalu coba lagi.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, date, refresh, user?.id]);

  async function saveTarget(userId: number, count: number, mode: DatabaseUploadTarget['targetMode']) {
    if (!isAdmin || !data || saving) return;
    setSaving(true);
    try {
      await crmService.setDatabaseUploadTarget(userId, data.month, count, mode);
      toast.success(count === 0 ? 'Target bulan ini dinonaktifkan.' : 'Target berhasil disimpan.');
      setRefresh(value => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Target gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="upload-target-title" className="mt-5 rounded-lg border border-slate-200 bg-white p-5 md:p-6 max-w-[1440px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="upload-target-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Target className="h-5 w-5 text-blue-600" />
            {isAdmin ? 'Target Input Database' : 'Target Input Saya'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">Pilih target per hari untuk sebulan penuh, atau target total bulanan untuk setiap orang.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-slate-500">
            Bulan target
            <input type="month" value={month || data?.month || ''} disabled={loading || saving}
              onChange={event => { if (event.target.value) { setMonth(event.target.value); setDate(''); } }}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Tanggal capaian harian
            <input type="date" value={date || data?.date || ''} disabled={loading || saving}
              min={data ? `${data.month}-01` : undefined} max={data ? `${data.month}-${data.daysInMonth}` : undefined}
              onChange={event => { if (event.target.value) setDate(event.target.value); }}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
          </label>
          <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading || saving}
            aria-label="Refresh target upload" className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5" aria-live="polite" aria-busy={loading || saving}>
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Memuat target...</p>
        ) : error ? (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</p>
        ) : !data?.items.length ? (
          <p className="py-8 text-center text-sm text-slate-500">Belum ada akun yang bisa menambah database.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="p-3">Orang</th>
                  <th scope="col" className="p-3 text-right">Excel / bulan</th>
                  <th scope="col" className="p-3 text-right">Add Database / bulan</th>
                  <th scope="col" className="p-3 text-right">Total / bulan</th>
                  <th scope="col" className="p-3 text-right">Input / tanggal terpilih</th>
                  <th scope="col" className="p-3 min-w-[220px]">Target</th>
                  <th scope="col" className="p-3 min-w-[180px]">Capaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map(row => {
                  const percentage = row.targetCount > 0 ? Math.round(row.progressCount / row.targetCount * 100) : 0;
                  const reached = row.targetCount > 0 && row.remainingCount === 0;
                  return (
                    <tr key={row.userId}>
                      <td className="p-3"><p className="font-semibold text-slate-800">{row.fullName || row.username}</p><p className="text-xs text-slate-400">@{row.username}</p></td>
                      <td className="p-3 text-right tabular-nums text-slate-600">{row.excelCount.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums text-slate-600">{row.manualCount.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-slate-900">{row.totalCount.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-blue-600">{row.dailyCount.toLocaleString()}</td>
                      <td className="p-3">{isAdmin ? (
                        <TargetEditor key={`${data.month}-${row.userId}-${row.targetCount}-${row.targetMode}`} row={row} daysInMonth={data.daysInMonth} disabled={saving || loading} onSave={saveTarget} />
                      ) : row.targetCount > 0 ? row.targetCount.toLocaleString() : 'Belum ditetapkan'}</td>
                      <td className="p-3">
                        {row.targetCount > 0 ? <>
                          <p className="mb-2 text-[11px] text-slate-500">{row.targetMode === 'DAILY' ? data.date : data.month} · {row.progressCount.toLocaleString()} / {row.targetCount.toLocaleString()} kontak</p>
                          <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className={reached ? 'text-emerald-700' : 'text-amber-700'}>{reached ? 'Tercapai' : `Kurang ${row.remainingCount.toLocaleString()}`}</span><span className="font-semibold tabular-nums">{percentage}%</span></div>
                          <div role="progressbar" aria-label={`Capaian ${row.fullName || row.username}`} aria-valuenow={Math.min(percentage, 100)} aria-valuemin={0} aria-valuemax={100}
                            aria-valuetext={`${row.progressCount} dari ${row.targetCount} kontak (${percentage}%)`}
                            className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${reached ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                          </div>
                        </> : <span className="text-xs text-slate-400">Belum ditetapkan</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Target harian berlaku setiap hari kalender (termasuk Sabtu–Minggu) pada bulan terpilih; kelebihan hari lain tidak menutup kekurangan hari tersebut. Target bulanan dihitung dari total satu bulan. Pengaturan berlaku untuk seluruh bulan terpilih, tidak otomatis diteruskan ke bulan berikutnya.{' '}
        {isAdmin && 'Target hanya untuk akun ADMIN/MANAGER yang bisa input data. Isi 0 untuk menonaktifkan target bulan tersebut. '}
        Dihitung dari kontak baru yang masih tersimpan sejak fitur ini aktif. Update/import ulang kontak lama tidak menambah capaian; kontak yang dihapus tidak dihitung. Data lama tanpa pembuat tidak dimasukkan.
        {data && ` Periode mengikuti waktu server (${data.timeZone}).`}
      </p>
    </section>
  );
}
