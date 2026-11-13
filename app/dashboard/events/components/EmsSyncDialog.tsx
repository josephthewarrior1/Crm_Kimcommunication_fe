'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Event, EmsSyncPreview } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { toast } from 'sonner';
import { SYNC_APPROVAL_HELP } from '../utils/notesHelper';
import { EmsCompanyReviewNotice } from './EmsCompanyReviewNotice';

type Destination = 'company' | 'participant';
const label = (destination: Destination) => destination === 'company' ? 'Database Perusahaan' : 'Database Peserta';
type PreviewRow = EmsSyncPreview['rows'][number];
type RowFilter = 'ALL' | 'REJECTED' | 'NEW' | 'EXISTING' | 'REVIEW';
const heldForClient = (row: PreviewRow) => Boolean(row.clientDeclineReviewRequired || ['decline', 'declined'].includes((row.crmClientApprovalStatus || '').trim().toLowerCase()));
const needsReview = (row: PreviewRow) => Boolean(row.companyReviewRequired || row.identityReviewMessage || heldForClient(row));
const approvalLabel = (status?: string) => ({ approve: 'Approve', decline: 'Decline', pending: 'Pending' }[status || ''] || status || 'Belum tersedia');
const sourceLabel = (row: PreviewRow) => row.emsStatus || ({ approve: 'Accepted', decline: 'Declined', pending: 'Pending' }[row.emsApprovalStatus || ''] || 'Belum tersedia');
const contactFieldLabel: Record<string, string> = {
  name: 'Nama lengkap', fullName: 'Nama lengkap', firstName: 'First Name', lastName: 'Last Name',
  salutation: 'Sapaan', jobTitle: 'Job title', positionLevel: 'Position', specialityDivision: 'Division',
  phone: 'HP / WhatsApp', mobilePhone: 'HP / WhatsApp', email: 'Email', emails: 'Email',
};
const rowMatches = (row: PreviewRow, query: string) => [row.name, row.email, row.phone, row.message,
  row.emsCompanyName, row.crmCompanyName, row.emsStatus, row.emsApprovalStatus,
  row.identityReviewMessage, String(row.rowNum), ...(row.contactUpdates || []).flatMap(update => [update.before, update.after]), ...(row.crmMatches || []).flatMap(profile =>
    [profile.name, profile.mobilePhone, profile.companyName, String(profile.databaseId)]),
].some(value => value?.toLowerCase().includes(query));
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
  const [filter, setFilter] = useState<RowFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadPreview = async () => {
    if (!destination || loading || syncing) return;
    setLoading(true); setError(''); setPreview(null);
    try {
      const result = await crmService.previewEmsParticipants(event.id);
      if (result.destination !== destination) throw new Error('Tujuan event berubah. Periksa pengaturan, lalu muat preview ulang.');
      setPreview(result);
      setFilter(result.rejectedCount > 0 ? 'REJECTED' : 'ALL');
      setSearch(''); setPage(1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal memuat preview EMS.');
    } finally { setLoading(false); }
  };

  const sync = async () => {
    if (!preview || syncing || loading || preview.destination !== destination) return;
    setSyncing(true); setError('');
    try {
      const result = await crmService.syncEmsParticipants(event.id, { previewToken: preview.previewToken });
      toast.success(`${result.count} registrasi disinkronkan ke ${label(preview.destination)}.${result.rejectedCount ? ` ${result.rejectedCount} registrasi tidak disync. Buka Preview Sync lagi untuk melihat keterangannya.` : ''}`);
      setPreview(null);
      try { await onSynced(); } catch { toast.warning('Sync selesai, tetapi tampilan belum diperbarui. Muat ulang daftar sebelum sync lagi.'); }
      onClose();
    } catch (failure) {
      setPreview(null);
      setError(failure instanceof Error ? failure.message : 'Sync gagal. Muat preview ulang sebelum mencoba lagi.');
    } finally { setSyncing(false); }
  };

  const accepted = preview ? preview.newCount + preview.existingCount : 0;
  const clientDeclineReviews = preview?.rows.filter(row => row.status !== 'REJECTED' && heldForClient(row)).length || 0;
  const reviewCount = preview?.rows.filter(needsReview).length || 0;
  const query = search.trim().toLowerCase();
  const filteredRows = (preview?.rows || []).filter(row =>
    (filter === 'ALL' || (filter === 'REVIEW' ? needsReview(row) : row.status === filter)) && (!query || rowMatches(row, query)));
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / 50));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * 50, currentPage * 50);
  const filters: Array<{ key: RowFilter; name: string; count: number; color: string }> = [
    { key: 'ALL', name: 'Semua', count: preview?.totalRows || 0, color: 'border-slate-200 bg-slate-50 text-slate-700' },
    { key: 'REJECTED', name: 'Tidak bisa disync', count: preview?.rejectedCount || 0, color: 'border-red-200 bg-red-50 text-red-700' },
    { key: 'NEW', name: 'Baru', count: preview?.newCount || 0, color: 'border-blue-200 bg-blue-50 text-blue-700' },
    { key: 'EXISTING', name: 'Sudah ada', count: preview?.existingCount || 0, color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { key: 'REVIEW', name: 'Perlu review', count: reviewCount, color: 'border-amber-200 bg-amber-50 text-amber-800' },
  ];
  return <Dialog open onOpenChange={open => { if (!open && !loading && !syncing) onClose(); }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-[1440px] h-[92dvh]" aria-describedby="ems-sync-description">
      <DialogHeader>
        <DialogTitle>Hasil Analisis &amp; Preview Sync</DialogTitle>
        <DialogDescription id="ems-sync-description"><strong className="font-semibold text-slate-700">{event.name}</strong>. Data kontak yang terisi di EMS memperbarui profil CRM yang cocok. Periksa perubahan sebelum sync.</DialogDescription>
      </DialogHeader>
      <div className="ms-modal-body space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div>
          <p className="text-sm font-semibold text-slate-700">Tujuan sync: {destination ? label(destination) : 'Belum ditentukan'}</p>
          {!destination && (
            <div role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Tentukan jenis event melalui Edit Event sebelum sync.
              {onConfigureEvent && <button type="button" onClick={onConfigureEvent} className="mt-2 block font-semibold underline">Atur jenis event</button>}
            </div>
          )}
          </div>
          <button type="button" disabled={!destination || loading || syncing} onClick={loadPreview} className="ms-modal-secondary inline-flex items-center gap-2 disabled:opacity-50">
            {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />} Muat ulang preview
          </button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p role="status" className="py-6 text-center text-sm text-slate-500">Memuat registrasi dan memeriksa profil CRM...</p>}
        {!preview && !loading && !error && <p className="py-10 text-center text-sm text-slate-500">Muat preview untuk melihat registrasi, hasil pencocokan, dan alasan baris yang tertahan.</p>}
        {preview && <section aria-label="Ringkasan sync" className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Filter hasil sync">
            {filters.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key}
              onClick={() => { setFilter(item.key); setPage(1); }}
              className={`rounded-lg border p-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${item.color} ${filter === item.key ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}>
              <strong className="block text-xl leading-7">{item.count}</strong><span className="text-xs font-semibold">{item.name}</span>
            </button>)}
          </div>
          <div className={`rounded-lg border p-3 text-sm leading-6 ${preview.rejectedCount ? 'border-red-200 bg-red-50 text-red-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`} role="status">
            <p><strong>{accepted} dari {preview.totalRows} registrasi siap disync.</strong>{preview.rejectedCount > 0 && ` ${preview.rejectedCount} registrasi tidak bisa disync dan akan dilewati. Lihat alasan serta profil yang cocok pada tabel.`}</p>
            <p className="mt-1 text-xs">“Tidak bisa disync” adalah hasil pemeriksaan CRM. Status Accepted / Pending / Declined dari EMS ditampilkan pada kolom tersendiri.</p>
            {!!preview.contactUpdateCount && <p className="mt-1 text-xs font-semibold">{preview.contactUpdateCount} profil kontak akan diperbarui sesuai data EMS. Buka rincian perubahan pada baris terkait.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500" aria-live="polite">Menampilkan {filteredRows.length ? (currentPage - 1) * 50 + 1 : 0}–{Math.min(currentPage * 50, filteredRows.length)} dari {filteredRows.length} registrasi{filter !== 'ALL' || query ? ' sesuai filter' : ''}.</p>
            <input type="search" aria-label="Cari registrasi sync" placeholder="Cari nama, email, HP, perusahaan, atau keterangan..." value={search}
              onChange={event => { setSearch(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 sm:max-w-md" />
          </div>
          <div className="max-h-[52dvh] overflow-auto rounded-lg border border-slate-200" role="region" aria-label="Rincian hasil sync" tabIndex={0}>
            <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-600"><tr>
                <th className="w-[5%] p-3">Baris</th><th className="w-[22%] p-3">Registrasi EMS</th><th className="w-[13%] p-3">Status EMS</th>
                <th className="w-[21%] p-3">Profil CRM yang cocok</th><th className="w-[12%] p-3">Hasil sync CRM</th><th className="w-[27%] p-3">Alasan / keterangan</th>
              </tr></thead>
              <tbody>{pageRows.map(row => <tr key={row.rowNum} className={`border-t border-slate-200 align-top ${row.status === 'REJECTED' ? 'bg-red-50/40' : ''}`}>
                <td className="p-3 text-xs text-slate-500">#{row.rowNum}</td>
                <td className="space-y-1 p-3 [overflow-wrap:anywhere]"><p className="font-semibold text-slate-900">{row.name || 'Nama belum tersedia'}</p><p className="text-xs text-slate-600">{row.emsCompanyName || 'Perusahaan belum diisi'}</p><p className="text-xs text-slate-600">{row.email || 'Email belum diisi'}</p><p className="text-xs text-slate-600">HP: {row.phone || 'Belum tersedia'}</p></td>
                <td className="p-3 [overflow-wrap:anywhere]"><p className="font-semibold">{sourceLabel(row)}</p>{row.status !== 'REJECTED' && row.emsApprovalStatus && <p className="mt-2 text-xs text-slate-500">Pre-Event setelah sync: <strong>{approvalLabel(row.emsApprovalStatus)}</strong></p>}</td>
                <td className="space-y-3 p-3 [overflow-wrap:anywhere]">{row.crmMatches?.length ? row.crmMatches.map(profile => <div key={profile.databaseId}>
                  <p className="font-medium text-slate-800">{profile.name || 'Nama belum diisi'}</p>{row.status !== 'REJECTED' && profile.databaseId === row.existingDatabaseId && <p className="text-xs font-semibold text-emerald-700">Profil dipakai</p>}<p className="text-xs text-slate-500">Profil #{profile.databaseId} · {profile.companyName || 'Perusahaan belum diisi'}</p><p className="text-xs text-slate-600">HP: {profile.mobilePhone || 'Belum diisi'}</p><p className="text-xs text-slate-500">Cocok via {profile.matchedBy.map(value => value === 'phone' ? 'HP' : 'email').join(' + ') || 'identitas'}</p>
                </div>) : <p className="text-xs text-slate-500">{row.status === 'NEW' ? 'Profil baru akan dibuat' : row.existingDatabaseId ? `Profil #${row.existingDatabaseId}` : 'Rincian profil belum tersedia'}{row.crmCompanyName && <span className="mt-1 block">{row.crmCompanyName}</span>}</p>}
                  {row.crmClientApprovalStatus && <p className="text-xs text-slate-600">Client Approval: <strong>{approvalLabel(row.crmClientApprovalStatus)}</strong></p>}
                </td>
                <td className="p-3"><span className={`inline-block rounded-md border px-2 py-1 text-xs font-semibold ${row.status === 'REJECTED' ? 'border-red-200 bg-red-100 text-red-800' : row.status === 'NEW' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{row.status === 'NEW' ? 'Baru' : row.status === 'EXISTING' ? 'Sudah ada' : 'Tidak bisa disync'}</span>{row.status !== 'REJECTED' && <><p className="mt-2 text-xs text-slate-500">{heldForClient(row) ? 'Tertahan dari Pre-Event dan Reminder' : needsReview(row) ? 'Bisa disync; perlu review' : 'Siap disync'}</p>{!!row.contactUpdates?.length && <p className="mt-2 text-xs font-semibold text-blue-700">Kontak mengikuti EMS</p>}</>}</td>
                <td className="space-y-2 p-3 leading-6 [overflow-wrap:anywhere]"><p className={row.status === 'REJECTED' ? 'text-red-800' : 'text-slate-700'}>{row.message}</p>
                  {!!row.approvalConflictRows?.length && <p className="rounded-md border border-red-200 bg-white p-2 text-xs text-red-800">Bandingkan baris {row.approvalConflictRows.map(number => `#${number}`).join(', ')}. Status Pre-Event bertentangan: {row.approvalConflictStatuses?.map(approvalLabel).join(' / ')}. Periksa registrasi mana yang benar di EMS, lalu muat ulang preview.</p>}
                  {row.status !== 'REJECTED' && !!row.contactUpdates?.length && <details className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-slate-700">
                    <summary className="cursor-pointer font-semibold text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600">{row.contactUpdates.length} kolom kontak akan diperbarui</summary>
                    <dl className="mt-2 space-y-3">{row.contactUpdates.map(update => <div key={update.field}>
                      <dt className="font-semibold">{contactFieldLabel[update.field] || update.field}</dt>
                      <dd className="mt-1 whitespace-pre-line"><span className="text-slate-500">CRM:</span> {update.before || 'Belum diisi'}</dd>
                      <dd className="whitespace-pre-line font-medium text-blue-900"><span>Setelah sync:</span> {update.after || 'Kosong sesuai nama lengkap EMS'}</dd>
                    </div>)}</dl>
                  </details>}
                  <EmsCompanyReviewNotice companyReviewRequired={row.companyReviewRequired} crmCompanyName={row.crmCompanyName} emsCompanyName={row.emsCompanyName} identityReviewMessage={row.identityReviewMessage} clientDeclineReviewRequired={row.clientDeclineReviewRequired} />
                </td>
              </tr>)}
              {!pageRows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Tidak ada registrasi yang sesuai filter. Coba kata kunci atau filter lain.</td></tr>}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-3 text-xs text-slate-600"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="ms-modal-secondary disabled:opacity-40">Prev</button><span>Halaman {currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className="ms-modal-secondary disabled:opacity-40">Next</button></div>
          <p className="text-xs leading-5 text-slate-600">Jumlah di atas menghitung registrasi EMS. Satu profil CRM bisa memiliki beberapa registrasi.{preview.uniqueContactCount !== undefined && ` ${accepted} registrasi yang siap disync mewakili ${preview.uniqueContactCount} profil kontak.`} Filter hanya menyaring tampilan; tombol konfirmasi memproses seluruh registrasi yang siap.</p>
          {clientDeclineReviews > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{clientDeclineReviews} registrasi bisa disync tetapi tetap tertahan dari Pre-Event dan Reminder untuk review keputusan client. Status registrasi diperbarui; keputusan Client Decline pada profil terkait tetap dipertahankan.</p>}
          <p className="text-xs leading-5 text-slate-500">{SYNC_APPROVAL_HELP} Data kontak memakai isian terbaru dari EMS; nilai kosong mempertahankan isian CRM dan email lama tetap disimpan. Perubahan berlaku pada profil Database yang sama, termasuk event lain yang memakai profil tersebut. Master perusahaan dan tujuan database tetap dipertahankan.</p>
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
