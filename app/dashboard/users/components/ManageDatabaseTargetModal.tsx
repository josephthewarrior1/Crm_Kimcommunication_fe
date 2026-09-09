'use client';

import React, { useEffect, useState } from 'react';
import { Target, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { useAuth } from '../../../../lib/context/AuthContext';
import { crmService } from '../../../../lib/services/crmService';
import { AppUser, DatabaseUploadTarget, DatabaseUploadTargetsResponse } from '../../../../lib/types';

export default function ManageDatabaseTargetModal({ targetUser, onClose }: {
  targetUser: AppUser;
  onClose: () => void;
}) {
  const { isAdmin } = useAuth();
  const [returnFocus] = useState(() => typeof document !== 'undefined' ? document.activeElement as HTMLElement : null);
  const [month, setMonth] = useState('');
  const [date, setDate] = useState('');
  const [data, setData] = useState<DatabaseUploadTargetsResponse | null>(null);
  const [value, setValue] = useState('0');
  const [mode, setMode] = useState<DatabaseUploadTarget['targetMode']>('DAILY');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const row = data?.items.find(item => item.userId === targetUser.id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError('');
    crmService.getDatabaseUploadTargets(month || undefined, date || undefined).then(result => {
      if (!active) return;
      setData(result);
      const selected = result.items.find(item => item.userId === targetUser.id);
      if (selected) { setValue(String(selected.targetCount)); setMode(selected.targetMode); }
    }).catch(() => {
      if (active) setError('Target belum bisa dimuat. Periksa koneksi atau backend, lalu coba lagi.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, date, refresh, targetUser.id]);

  async function saveTarget(event: React.FormEvent) {
    event.preventDefault();
    if (!isAdmin || !data || !row || loading || saving) return;
    const count = Number(value);
    if (!value.trim() || !Number.isInteger(count) || count < 0 || count > 2147483647) {
      toast.error('Target harus bilangan bulat mulai dari 0.');
      return;
    }
    setSaving(true);
    try {
      await crmService.setDatabaseUploadTarget(targetUser.id, data.month, count, mode);
      toast.success(count === 0 ? 'Target bulan ini dinonaktifkan.' : 'Target berhasil disimpan.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Target gagal disimpan.');
    } finally { setSaving(false); }
  }

  const percentage = row && row.targetCount > 0 ? Math.round(row.progressCount / row.targetCount * 100) : 0;
  const fieldClass = 'mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';

  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl border-slate-200 bg-white text-slate-900 dark:bg-white dark:text-slate-900 dark:border-slate-200 sm:max-w-lg motion-reduce:animate-none"
        onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus(); }}>
        <DialogHeader className="border-b border-slate-100 pb-4 pr-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold"><Target className="h-5 w-5 text-blue-600" />Target Input Database</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">Atur target untuk <strong className="text-slate-800">{targetUser.fullName || targetUser.username}</strong> · @{targetUser.username}</DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">Bulan target
            <input type="month" value={month || data?.month || ''} disabled={loading || saving}
              onChange={event => { if (event.target.value) { setMonth(event.target.value); setDate(''); } }} className={fieldClass} />
          </label>
          <button type="button" onClick={() => setRefresh(current => current + 1)} disabled={loading || saving}
            aria-label="Refresh target upload" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? <p role="status" className="flex justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Memuat target...</p>
          : error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</p>
          : !row || !data ? <p role="status" className="py-6 text-sm text-slate-500">Akun ini belum bisa diberi target input database.</p>
          : <>
            <form id="user-upload-target-form" onSubmit={saveTarget} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-500">Jenis target
                <select value={mode} disabled={saving} onChange={event => setMode(event.target.value as DatabaseUploadTarget['targetMode'])} className={fieldClass}>
                  <option value="DAILY">Per hari · berlaku sebulan</option>
                  <option value="MONTHLY">Total sebulan</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-500">Jumlah target
                <input type="number" min="0" max="2147483647" step="1" required value={value} disabled={saving}
                  onChange={event => setValue(event.target.value)} className={fieldClass} />
              </label>
              <p className="text-xs text-slate-500">{mode === 'DAILY'
                ? `${Number(value || 0).toLocaleString()} per hari × ${data.daysInMonth} hari = ${(Number(value || 0) * data.daysInMonth).toLocaleString()} sebulan`
                : 'Total kontak baru dalam bulan terpilih.'} Isi 0 untuk menonaktifkan.</p>
            </form>

            <section aria-label="Capaian tersimpan" className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800">Capaian tersimpan</h3>
                <span className="text-[11px] text-slate-500">{row.targetMode === 'DAILY' ? 'Target harian' : 'Target bulanan'}</span>
              </div>
              <label className="block text-xs text-slate-500">Tanggal capaian harian
                <input type="date" value={date || data.date} disabled={saving} min={`${data.month}-01`} max={`${data.month}-${data.daysInMonth}`}
                  onChange={event => { if (event.target.value) setDate(event.target.value); }} className={fieldClass} />
              </label>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-slate-500">Input tanggal terpilih</dt><dd className="mt-1 font-bold tabular-nums text-blue-600">{row.dailyCount.toLocaleString()} kontak</dd></div>
                <div><dt className="text-slate-500">Total bulan ini</dt><dd className="mt-1 font-bold tabular-nums">{row.totalCount.toLocaleString()} kontak</dd></div>
              </dl>
              <p className="text-[11px] text-slate-500">Bulan ini: {row.excelCount.toLocaleString()} Excel · {row.manualCount.toLocaleString()} Add Database</p>
              {row.targetCount > 0 ? <>
                <div className="flex justify-between gap-2 text-xs">
                  <span className={row.remainingCount === 0 ? 'text-emerald-700' : 'text-amber-700'}>{row.remainingCount === 0 ? 'Tercapai' : `Kurang ${row.remainingCount.toLocaleString()}`} · {row.progressCount.toLocaleString()} / {row.targetCount.toLocaleString()}</span>
                  <span className="font-semibold">{percentage}%</span>
                </div>
                <div role="progressbar" aria-label="Capaian target" aria-valuenow={Math.min(percentage, 100)} aria-valuemin={0} aria-valuemax={100}
                  aria-valuetext={`${row.progressCount} dari ${row.targetCount} kontak (${percentage}%)`} className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                  <div className={`h-full rounded-full ${row.remainingCount === 0 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                </div>
              </> : <p className="text-xs text-slate-500">Belum ditetapkan</p>}
            </section>
            <details className="text-xs leading-relaxed text-slate-500">
              <summary className="cursor-pointer font-semibold">Aturan perhitungan</summary>
              <p className="mt-2">Target harian berlaku setiap hari termasuk Sabtu–Minggu selama bulan terpilih, tanpa membawa kelebihan dari hari lain. Target bulanan memakai total sebulan. Target tidak otomatis diteruskan ke bulan berikutnya.</p>
              <p className="mt-2">Hanya kontak baru yang masih tersimpan dari Excel / Add Database sejak fitur aktif. Update/import ulang tidak menambah capaian; kontak terhapus dan data lama tanpa pembuat tidak dihitung. Waktu server: {data.timeZone}.</p>
            </details>
          </>}

        <DialogFooter className="border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500">Batal</button>
          <button type="submit" form="user-upload-target-form" disabled={!isAdmin || loading || saving || !row || (value === String(row.targetCount) && mode === row.targetMode)}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}Simpan Target
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
