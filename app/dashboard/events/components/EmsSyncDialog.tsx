'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Event, EmsSyncPreview } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { toast } from 'sonner';

type Destination = 'company' | 'participant';
const label = (destination: Destination) => destination === 'company' ? 'Database Perusahaan' : 'Database Peserta';
interface Props {
  isOpen: boolean;
  event: Event | null;
  onClose: () => void;
  onConfigureEvent?: () => void;
  onSynced: () => Promise<void>;
}

export function EmsSyncDialog(props: Props) {
  return props.isOpen && props.event ? <SyncContent key={`${props.event.id}:${props.event.syncDestination || ''}`} {...props} event={props.event} /> : null;
}

function SyncContent({ event, onClose, onConfigureEvent, onSynced }: Props & { event: Event }) {
  const destination = event.syncDestination === 'company' || event.syncDestination === 'participant' ? event.syncDestination : '';
  const [preview, setPreview] = useState<EmsSyncPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const loadPreview = async () => {
    if (!destination || loading || syncing) return;
    setLoading(true); setError(''); setPreview(null);
    try {
      const result = await crmService.previewEmsParticipants(event.id);
      if (result.destination !== destination) throw new Error('Tujuan event berubah. Periksa pengaturan, lalu muat preview ulang.');
      setPreview(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal memuat preview EMS.');
    } finally { setLoading(false); }
  };

  const sync = async () => {
    if (!preview || syncing || loading || preview.destination !== destination) return;
    setSyncing(true); setError('');
    try {
      const result = await crmService.syncEmsParticipants(event.id, { previewToken: preview.previewToken });
      toast.success(`${result.count} registrasi disinkronkan ke ${label(preview.destination)}.`);
      setPreview(null);
      try { await onSynced(); } catch { toast.warning('Sync selesai, tetapi tampilan belum diperbarui. Muat ulang daftar sebelum sync lagi.'); }
      onClose();
    } catch (failure) {
      setPreview(null);
      setError(failure instanceof Error ? failure.message : 'Sync gagal. Muat preview ulang sebelum mencoba lagi.');
    } finally { setSyncing(false); }
  };

  const accepted = preview ? preview.newCount + preview.existingCount : 0;
  return <Dialog open onOpenChange={open => { if (!open && !loading && !syncing) onClose(); }}>
    <DialogContent className="max-w-3xl" aria-describedby="ems-sync-description">
      <DialogHeader>
        <DialogTitle>Preview sync EMS</DialogTitle>
        <DialogDescription id="ems-sync-description">{event.name}. Sync mengikuti jenis event. Periksa ringkasan sebelum menyimpan data CRM.</DialogDescription>
      </DialogHeader>
      <div className="ms-modal-body space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Jenis event: {destination === 'company' ? 'Korporat' : destination === 'participant' ? 'Peserta / Publik' : 'Belum ditentukan'}</p>
          {destination ? <p className="mt-1 text-sm text-slate-600">Tujuan sync: {label(destination)}</p> : (
            <div role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Tentukan jenis event melalui Edit Event sebelum sync.
              {onConfigureEvent && <button type="button" onClick={onConfigureEvent} className="mt-2 block font-semibold underline">Atur jenis event</button>}
            </div>
          )}
          <p className="mt-2 text-xs leading-5 text-slate-500">Tujuan mengikuti jenis event sejak dibuat. Email kampus atau kantor tetap masuk Peserta pada event Peserta / Publik.</p>
        </div>
        <button type="button" disabled={!destination || loading || syncing} onClick={loadPreview} className="ms-modal-secondary inline-flex items-center gap-2 disabled:opacity-50">
          {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          Muat ulang preview
        </button>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {preview && <section aria-label="Ringkasan sync" className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">Tujuan sync: {label(preview.destination)}</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <p className="rounded-lg bg-blue-50 p-3">Baru <strong className="block text-lg">{preview.newCount}</strong></p>
            <p className="rounded-lg bg-emerald-50 p-3">Sudah ada <strong className="block text-lg">{preview.existingCount}</strong></p>
            <p className="rounded-lg bg-amber-50 p-3">Ditolak <strong className="block text-lg">{preview.rejectedCount}</strong></p>
          </div>
          <p className="text-xs leading-5 text-slate-500">Profil yang sudah ada dipakai kembali dan riwayat event tetap disimpan. Baris ditolak tidak dipindahkan ke tujuan lain.</p>
          {preview.rows.length > 0 && <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Nama / email</th><th className="p-2">Hasil</th><th className="p-2">Keterangan</th></tr></thead>
              <tbody>{preview.rows.slice(0, 100).map(row => <tr key={row.rowNum} className="border-t border-slate-100"><td className="p-2"><span className="block font-medium">{row.name || 'Nama belum tersedia'}</span><span className="break-all text-slate-500">{row.email}</span></td><td className="p-2">{row.status === 'NEW' ? 'Baru' : row.status === 'EXISTING' ? 'Sudah ada' : 'Ditolak'}</td><td className="p-2">{row.message}</td></tr>)}</tbody>
            </table>
          </div>}
          {preview.rows.length > 100 && <p className="text-xs text-slate-500">Menampilkan 100 dari {preview.totalRows} baris. Seluruh baris tetap divalidasi.</p>}
        </section>}
      </div>
      <div className="ms-modal-footer">
        <button type="button" disabled={loading || syncing} onClick={onClose} className="ms-modal-secondary">Tutup</button>
        <button type="button" disabled={!preview || preview.destination !== destination || !accepted || loading || syncing} onClick={sync} className="ms-modal-primary inline-flex items-center gap-2 disabled:opacity-50">
          {syncing && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {syncing ? 'Menyimpan sync...' : `Konfirmasi sync ${accepted} registrasi`}
        </button>
      </div>
    </DialogContent>
  </Dialog>;
}
