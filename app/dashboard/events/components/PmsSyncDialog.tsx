'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { crmService } from '../../../../lib/services/crmService';
import type { PmsDestination, PmsEventSyncPreview, PmsEventSyncResult } from '../../../../lib/services/crmService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';

interface Props { isOpen: boolean; onClose: () => void; onSynced: () => Promise<void> }
const destinationLabel = (value: PmsDestination) => value === 'company' ? 'Database Perusahaan' : 'Database Peserta';

export function PmsSyncDialog(props: Props) {
  return props.isOpen ? <SyncContent {...props} /> : null;
}

function SyncContent({ onClose, onSynced }: Props) {
  const [preview, setPreview] = useState<PmsEventSyncPreview | null>(null);
  const [choices, setChoices] = useState<Record<number, PmsDestination>>({});
  const [result, setResult] = useState<PmsEventSyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    if (saving) return;
    setLoading(true); setError(''); setPreview(null); setChoices({});
    try { setPreview(await crmService.previewPmsEvents()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Gagal memuat event PMS.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const ready = preview?.rows.filter(row => row.status !== 'CONFLICT') || [];
  const missingChoice = ready.some(row => !row.existingEvent?.syncDestination && !choices[row.pmsEventId]);
  const save = async () => {
    if (!preview || saving || loading || missingChoice || !ready.length) return;
    setSaving(true); setError('');
    try {
      setResult(await crmService.syncPmsEvents(preview, choices));
      setPreview(null); setChoices({});
      try { await onSynced(); }
      catch { setError('Sync selesai, tetapi daftar CRM belum diperbarui. Muat ulang daftar event.'); }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sync PMS gagal. Muat preview ulang.');
    } finally { setSaving(false); }
  };

  return <Dialog open onOpenChange={open => { if (!open && !saving && !loading) onClose(); }}>
    <DialogContent className="max-w-4xl" aria-describedby="pms-sync-description">
      <DialogHeader>
        <DialogTitle>Preview event dari PMS</DialogTitle>
        <DialogDescription id="pms-sync-description">Pilih tujuan data setiap event baru sebelum disimpan ke CRM. Sync PMS hanya mengambil informasi event, bukan kontak peserta.</DialogDescription>
      </DialogHeader>
      <div className="ms-modal-body space-y-4">
        <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">Jenis event yang sudah tersimpan tetap dipakai saat sync ulang. Setelah dipilih, import Excel dan sync EMS mengikuti tujuan event tersebut.</p>
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Memuat event PMS...</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {result && <section aria-label="Hasil sync PMS" className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <p><strong>{result.createdCount}</strong> event dibuat, <strong>{result.updatedCount}</strong> diperbarui, <strong>{result.unchangedCount}</strong> sudah sesuai, <strong>{result.failedCount}</strong> tertahan/gagal.</p>
          {result.errors.map(item => <p key={item.pmsEventId} role="alert" className="text-red-700">{item.name} (PMS #{item.pmsEventId}): {item.message}</p>)}
          <p className="text-xs text-slate-500">Muat preview ulang sebelum mencoba baris yang tertahan. Event yang sudah berhasil dikenali melalui ID PMS.</p>
        </section>}
        {preview && <>
          <p className="text-sm text-slate-700">{preview.totalCount} event dari PMS; {preview.rows.filter(row => row.status === 'NEW').length} baru, {preview.rows.filter(row => row.status === 'EXISTING').length} sudah dikenal, {preview.rows.filter(row => row.status === 'CONFLICT').length} perlu ditinjau.</p>
          {!preview.rows.length ? <p className="text-sm text-slate-500">Tidak ada event dari PMS.</p> : <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3">Event PMS</th><th className="p-3">Hasil pencocokan</th><th className="p-3">Tujuan data</th></tr></thead>
              <tbody>{preview.rows.map(row => <tr key={row.pmsEventId} className="border-t border-slate-100 align-top">
                <td className="p-3"><span className="block font-semibold text-slate-800">{row.event.name}</span><span className="text-xs text-slate-500">PMS #{row.pmsEventId}</span></td>
                <td className="p-3 text-slate-600">{row.status === 'NEW' ? 'Event baru' : row.status === 'EXISTING' ? `Gunakan event CRM: ${row.existingEvent?.name}` : <span className="text-red-700">{row.message}</span>}</td>
                <td className="min-w-56 p-3">{row.status === 'CONFLICT' ? <span className="text-red-700">Tinjau pemetaan terlebih dahulu</span>
                  : row.existingEvent?.syncDestination ? <span className="font-semibold text-slate-700">{destinationLabel(row.existingEvent.syncDestination)}</span>
                  : <><label htmlFor={`pms-destination-${row.pmsEventId}`} className="mb-1 block text-xs text-slate-600">Jenis event {row.event.name}</label>
                    <select id={`pms-destination-${row.pmsEventId}`} value={choices[row.pmsEventId] || ''} disabled={saving} required
                      onChange={event => { const value = event.target.value; setChoices(previous => { const next = { ...previous }; if (value === 'company' || value === 'participant') next[row.pmsEventId] = value; else delete next[row.pmsEventId]; return next; }); }}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900">
                      <option value="">Pilih jenis event</option><option value="company">Perusahaan</option><option value="participant">Peserta / Publik</option>
                    </select></>}
                </td>
              </tr>)}</tbody>
            </table>
          </div>}
          {missingChoice && <p className="text-sm text-amber-800">Pilih jenis setiap event baru atau event lama yang belum ditentukan. Tujuan tidak ditentukan otomatis dari nama event atau email.</p>}
        </>}
      </div>
      <div className="ms-modal-footer">
        <button type="button" disabled={saving || loading} onClick={onClose} className="ms-modal-secondary">Tutup</button>
        <button type="button" disabled={saving || loading} onClick={() => void load()} className="ms-modal-secondary">Muat preview ulang</button>
        <button type="button" disabled={!preview || saving || loading || missingChoice || !ready.length} onClick={() => void save()} className="ms-modal-primary inline-flex items-center gap-2 disabled:opacity-50">{saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{saving ? 'Menyimpan event...' : 'Simpan event ke CRM'}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
