'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, RefreshCw, Search, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { crmService } from '../../../lib/services/crmService';
import type { DatabaseUploadTargetsResponse } from '../../../lib/types';
import { targetChanged, targetCount, targetDraft, type TargetDraft } from './targetDraft';

const fieldClass = 'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';
const buttonClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40';

function TargetSwitch({ enabled, disabled, label, onChange }: {
  enabled: boolean; disabled: boolean; label: string; onChange: () => void;
}) {
  return <button type="button" role="switch" aria-checked={enabled} aria-label={label} disabled={disabled} onClick={onChange}
    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
    <span className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${enabled ? 'translate-x-4' : ''}`} />
    </span>
    <span className={enabled ? 'text-blue-700' : 'text-slate-500'}>{enabled ? 'On' : 'Off'}</span>
  </button>;
}

export default function TargetsPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<DatabaseUploadTargetsResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<number, TargetDraft>>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [bulk, setBulk] = useState<TargetDraft>({ count: '50', mode: 'DAILY', enabled: true });
  const [month, setMonth] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const selectAll = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setLoading(true);
    setError('');
    crmService.getDatabaseUploadTargets(month || undefined, date || undefined).then(result => {
      if (!active) return;
      setData(result);
      setDrafts(Object.fromEntries(result.items.map(row => [row.userId, targetDraft(row)])));
      setSelected([]);
      setSaveError('');
    }).catch(() => {
      if (active) setError('Target belum bisa dimuat. Periksa koneksi, lalu coba lagi.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAdmin, month, date, refresh]);

  const rows = data?.items || [];
  const visible = rows.filter(row => `${row.fullName} ${row.username}`.toLowerCase().includes(search.trim().toLowerCase()));
  const changed = rows.filter(row => drafts[row.userId] && targetChanged(row, drafts[row.userId]));
  const selectedVisible = visible.filter(row => selected.includes(row.userId)).length;
  const allSelected = visible.length > 0 && selectedVisible === visible.length;
  const busy = loading || saving;

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selectedVisible > 0 && !allSelected;
  }, [selectedVisible, allSelected, loading]);

  useEffect(() => {
    if (!changed.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  function edit(id: number, patch: Partial<TargetDraft>) {
    setDrafts(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function applyBulk() {
    try { targetCount(bulk); } catch (err) { toast.error((err as Error).message); return; }
    setDrafts(current => {
      const next = { ...current };
      selected.forEach(id => {
        // Keep the previous amount when switching off so it can be re-enabled before leaving this page.
        next[id] = bulk.enabled ? { ...bulk } : { ...current[id], enabled: false };
      });
      return next;
    });
    toast.success(`Pengaturan diterapkan ke ${selected.length} akun. Klik Simpan perubahan untuk menyimpan.`);
  }

  async function save() {
    if (!isAdmin || !data || busy || savingRef.current || !changed.length) return;
    let updates;
    try {
      updates = changed.map(row => ({ userId: row.userId, count: targetCount(drafts[row.userId]), mode: drafts[row.userId].mode }));
    } catch (err) { toast.error((err as Error).message); return; }
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    const succeeded: number[] = [];
    const failed: string[] = [];
    try {
      // ponytail: use the existing per-account endpoint sequentially; add a bulk endpoint if team size makes saving slow.
      for (const update of updates) {
        try {
          await crmService.setDatabaseUploadTarget(update.userId, data.month, update.count, update.mode);
          succeeded.push(update.userId);
        } catch {
          const row = rows.find(item => item.userId === update.userId)!;
          failed.push(row.fullName || row.username);
        }
      }
      setData(current => current && ({ ...current, items: current.items.map(row => {
        const update = updates.find(item => item.userId === row.userId && succeeded.includes(item.userId));
        if (!update) return row;
        const progressCount = update.mode === 'DAILY' ? row.dailyCount : row.totalCount;
        return { ...row, targetCount: update.count, targetMode: update.mode, progressCount,
          remainingCount: Math.max(0, update.count - progressCount),
          monthlyTargetCount: update.count * (update.mode === 'DAILY' ? data.daysInMonth : 1) };
      }) }));
      if (succeeded.length) toast.success(`Target ${succeeded.length} akun berhasil disimpan.`);
      if (failed.length) setSaveError(`Gagal menyimpan ${failed.join(', ')}. Perubahan akun ini tetap tersedia; klik Simpan perubahan untuk mencoba lagi.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!isAdmin) return <p className="py-16 text-center text-sm text-slate-500">Hanya admin yang dapat mengatur target.</p>;

  return <div className="space-y-6 text-slate-900">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Target className="h-6 w-6 text-blue-600" />Target input database</h2>
        <p className="mt-1 text-sm text-slate-500">Atur target tim, sekaligus atau per akun.</p>
      </div>
      <div className="flex items-end gap-2">
        <label className="text-xs font-semibold text-slate-500">Bulan target
          <input type="month" aria-label="Bulan target" value={month || data?.month || ''} disabled={busy || changed.length > 0}
            onChange={event => { if (event.target.value) { setMonth(event.target.value); setDate(''); } }} className={`${fieldClass} mt-1 block w-full`} />
        </label>
        <button type="button" aria-label="Muat ulang target" onClick={() => setRefresh(value => value + 1)} disabled={busy || changed.length > 0} className={`${buttonClass} p-2.5`}><RefreshCw className="h-4 w-4" /></button>
      </div>
    </header>

    {loading ? <p role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Memuat target...</p>
      : error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error}<button type="button" onClick={() => setRefresh(value => value + 1)} className={`${buttonClass} ml-3`}>Coba lagi</button></div>
      : data && <>
        <section aria-label="Atur target sekaligus" className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-blue-950">Atur sekaligus</h3>
            <p className="text-xs text-blue-700">Pilih akun di tabel, lalu terapkan pengaturan.</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex-1 text-xs font-semibold text-slate-600 sm:flex-none">Jumlah target
              <input type="number" min="1" max="2147483647" step="1" value={bulk.count} disabled={busy || !bulk.enabled}
                onChange={event => setBulk(current => ({ ...current, count: event.target.value }))}
                className={`${fieldClass} mt-1 block h-12 w-full font-mono text-2xl font-semibold sm:w-32`} />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-600 sm:flex-none">Jenis target
              <select value={bulk.mode} disabled={busy || !bulk.enabled} onChange={event => setBulk(current => ({ ...current, mode: event.target.value as TargetDraft['mode'] }))} className={`${fieldClass} mt-1 block h-12 w-full`}>
                <option value="DAILY">Per hari</option><option value="MONTHLY">Per bulan</option>
              </select>
            </label>
            <div className="sm:mr-auto"><p className="text-xs font-semibold text-slate-600">Status target</p>
              <TargetSwitch enabled={bulk.enabled} disabled={busy} label="Aktifkan target sekaligus" onChange={() => setBulk(current => ({ ...current, enabled: !current.enabled }))} />
            </div>
            <button type="button" disabled={busy || !selected.length} onClick={applyBulk} className="h-12 w-full rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-40 sm:w-auto">
              Terapkan ke {selected.length} akun
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">{bulk.enabled ? (bulk.mode === 'DAILY' ? 'Target per hari berlaku setiap hari selama bulan terpilih.' : 'Target per bulan dihitung dari total input selama bulan terpilih.') : 'Off menonaktifkan target dan peringatan untuk akun terpilih.'}</p>
        </section>

        <section aria-label="Daftar target akun" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <label className="flex w-full items-center gap-2 sm:max-w-xs"><Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input aria-label="Cari akun" placeholder="Cari nama atau username..." value={search} disabled={saving}
                onChange={event => { setSearch(event.target.value); setSelected([]); }} className="w-full rounded-md bg-transparent py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500">Capaian harian
              <input type="date" aria-label="Tanggal capaian" value={date || data.date} min={`${data.month}-01`} max={`${data.month}-${data.daysInMonth}`} disabled={busy || changed.length > 0}
                onChange={event => { if (event.target.value) setDate(event.target.value); }} className={fieldClass} />
            </label>
          </div>
          <div className="flex min-h-[48px] flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            <span>{selected.length} dari {visible.length} akun dipilih</span>
            <button type="button" disabled={busy || !visible.length} onClick={() => setSelected(allSelected ? [] : visible.map(row => row.userId))} className="rounded py-1 font-semibold text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40">{allSelected ? 'Batal pilih semua' : search.trim() ? 'Pilih semua hasil' : 'Pilih semua akun'}</button>
            <span className="sm:ml-auto">Off = target & peringatan nonaktif</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500"><tr>
                <th className="w-12 px-4 py-3"><input ref={selectAll} type="checkbox" aria-label="Pilih semua akun yang ditampilkan" checked={allSelected} disabled={busy || !visible.length} onChange={() => setSelected(allSelected ? [] : visible.map(row => row.userId))} className="h-4 w-4 accent-blue-600" /></th>
                <th className="px-3 py-3 font-medium">Akun</th><th className="px-3 py-3 font-medium">Target</th><th className="px-3 py-3 font-medium">Periode</th><th className="px-3 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Capaian tersimpan</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">{visible.map(row => {
                const draft = drafts[row.userId];
                const name = row.fullName || row.username;
                const dirty = targetChanged(row, draft);
                const percentage = row.targetCount ? Math.min(100, Math.round(row.progressCount / row.targetCount * 100)) : 0;
                return <tr key={row.userId} className={selected.includes(row.userId) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}>
                  <td className="px-4 py-4"><input type="checkbox" aria-label={`Pilih ${name}`} checked={selected.includes(row.userId)} disabled={busy}
                    onChange={event => setSelected(current => event.target.checked ? [...current, row.userId] : current.filter(id => id !== row.userId))} className="h-4 w-4 accent-blue-600" /></td>
                  <td className="px-3 py-4"><p className="font-semibold">{name}</p><p className="mt-0.5 text-xs text-slate-400">@{row.username}</p>{dirty && <p className="mt-1 text-xs text-amber-700">Belum disimpan</p>}</td>
                  <td className="px-3 py-4"><input type="number" min="1" max="2147483647" step="1" aria-label={`Jumlah target ${name}`} value={draft.count} disabled={busy || !draft.enabled}
                    onChange={event => edit(row.userId, { count: event.target.value })} className={`${fieldClass} w-24 font-mono font-semibold`} /></td>
                  <td className="px-3 py-4"><select aria-label={`Periode target ${name}`} value={draft.mode} disabled={busy || !draft.enabled}
                    onChange={event => edit(row.userId, { mode: event.target.value as TargetDraft['mode'] })} className={fieldClass}>
                    <option value="DAILY">Per hari</option><option value="MONTHLY">Per bulan</option>
                  </select></td>
                  <td className="px-3 py-4"><TargetSwitch enabled={draft.enabled} disabled={busy} label={`Aktifkan target ${name}`} onChange={() => edit(row.userId, { enabled: !draft.enabled })} /></td>
                  <td className="w-48 px-4 py-4">{row.targetCount > 0 ? <>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs"><span className="tabular-nums">{row.progressCount.toLocaleString('id-ID')} / {row.targetCount.toLocaleString('id-ID')}</span>{row.remainingCount === 0 && <Check aria-label="Tercapai" className="h-4 w-4 text-emerald-600" />}</div>
                    <div role="progressbar" aria-label={`Capaian ${name}`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${row.remainingCount === 0 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }} /></div>
                    <p className="mt-1.5 text-[11px] text-slate-400">{row.targetMode === 'DAILY' ? data.date : data.month}</p>
                  </> : <span className="text-xs text-slate-400">Target nonaktif</span>}
                    <p className="mt-1 text-[11px] text-slate-500">Bulan ini: {row.totalCount.toLocaleString('id-ID')} input</p>
                  </td>
                </tr>;
              })}</tbody>
            </table>
            {!visible.length && <p role="status" className="px-5 py-14 text-center text-sm text-slate-500">{search ? 'Tidak ada akun yang cocok. Coba nama lain.' : 'Belum ada akun yang bisa diberi target.'}</p>}
          </div>
        </section>

        {saveError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{saveError}</p>}
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5">
          <div aria-live="polite"><p className="text-sm font-semibold">{saving ? 'Menyimpan target...' : changed.length ? `${changed.length} akun belum disimpan` : 'Semua perubahan tersimpan'}</p>
            <p className="mt-0.5 text-xs text-slate-500">{changed.length ? 'Simpan atau batalkan sebelum mengganti bulan / tanggal.' : 'Pilih beberapa akun atau ubah target langsung di tabel.'}</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" disabled={busy || !changed.length} onClick={() => { setDrafts(Object.fromEntries(rows.map(row => [row.userId, targetDraft(row)]))); setSaveError(''); }} className={buttonClass}>Batalkan</button>
            <button type="button" disabled={busy || !changed.length} onClick={save} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-40">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Simpan perubahan
            </button>
          </div>
        </div>
        <details className="text-xs leading-relaxed text-slate-500"><summary className="cursor-pointer font-semibold">Cara target dihitung</summary>
          <p className="mt-2">Target harian berlaku setiap hari termasuk Sabtu–Minggu, tanpa membawa kelebihan dari hari lain. Target bulanan memakai total sebulan. Target tidak otomatis diteruskan ke bulan berikutnya.</p>
          <p className="mt-2">Hanya kontak baru yang masih tersimpan dari Excel / Add Database sejak fitur aktif. Update atau import ulang, kontak terhapus, dan data lama tanpa pembuat tidak dihitung. Waktu server: {data.timeZone}.</p>
        </details>
      </>}
  </div>;
}
