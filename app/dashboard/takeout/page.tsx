'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { auditLogService } from '../../../lib/services/auditLogService';
import { RemovalRequest } from '../../../lib/types';
import { Loader2, RotateCcw, Check, X, UserMinus, Search, Clock, CheckCircle2, Shield, AlertCircle, Database, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';

const statusOptions = [
  { value: 'all', label: 'Semua', icon: UserMinus },
  { value: 'pending', label: 'Menunggu', icon: Clock },
  { value: 'completed', label: 'Disetujui', icon: CheckCircle2 },
  { value: 'rejected', label: 'Ditolak', icon: X },
];

const statusLabels: Record<string, string> = {
  pending: 'Menunggu', approved: 'Disetujui', done: 'Selesai', rejected: 'Ditolak',
};

function matchesStatus(request: RemovalRequest, status: string) {
  return status === 'all' || (status === 'completed' ? ['approved', 'done'].includes(request.status) : request.status === status);
}

function formatRequestDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TakeoutRequestsPage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [removals, setRemovals] = useState<RemovalRequest[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const loadRequest = useRef(0);

  const loadTabDetails = useCallback(async () => {
    if (!isAdmin) return;
    const requestId = ++loadRequest.current;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await crmService.getRemovalRequests();
      if (requestId === loadRequest.current) setRemovals(data);
    } catch {
      if (requestId !== loadRequest.current) return;
      setRemovals([]);
      setLoadError(true);
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadTabDetails();
    return () => { loadRequest.current += 1; };
  }, [loadTabDetails]);

  const handleUpdateRemovalStatus = async (id: number, status: string, targetName?: string) => {
    if (!isAdmin || submittingId !== null) return;
    setSubmittingId(id);
    try {
      await crmService.updateRemovalRequestStatus(id, status);
      
      if (user) {
        auditLogService.recordLog({
          userId: user.id,
          username: user.username,
          userFullName: user.fullName,
          userRole: user.roles?.[0] || 'ADMIN',
          module: 'TAKEOUT',
          actionType: status === 'approved' || status === 'done' ? 'APPROVE_TAKEOUT' : 'REJECT_TAKEOUT',
          targetId: id,
          targetName: targetName || `Takeout #${id}`,
          description: `Mengubah status Takeout Request #${id} (${targetName || 'Kontak'}) menjadi '${status.toUpperCase()}'.`
        });
      }

      toast.success('Permintaan takeout berhasil disetujui.');
      loadTabDetails();
    } catch (err: any) {
      toast.error(err.message || 'Status permintaan belum berhasil diperbarui.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRestoreContact = async (rem: RemovalRequest) => {
    if (!isAdmin || submittingId !== null) return;
    setSubmittingId(rem.id);
    try {
      if (rem.database?.id) {
        // Reactivate soft-deleted contact in local CRM database (send both isActive & active for Jackson compatibility)
        await crmService.updateDatabase(rem.database.id, {
          isActive: true,
          active: true,
        } as any);
      }
      await crmService.updateRemovalRequestStatus(rem.id, 'rejected');

      if (user) {
        const contactName = `${rem.database?.firstName || ''} ${rem.database?.lastName || ''}`.trim();
        auditLogService.recordLog({
          userId: user.id,
          username: user.username,
          userFullName: user.fullName,
          userRole: user.roles?.[0] || 'ADMIN',
          module: 'TAKEOUT',
          actionType: 'REJECT_TAKEOUT',
          targetId: rem.id,
          targetName: contactName || `Kontak #${rem.database?.id}`,
          description: `Memulihkan kontak '${contactName || rem.database?.id}' dan menolak takeout request.`
        });
      }

      toast.success(`Kontak ID ${rem.database?.id} berhasil dipulihkan / diaktifkan kembali!`);
      loadTabDetails();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memulihkan kontak');
    } finally {
      setSubmittingId(null);
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const visibleRemovals = removals.filter(request => matchesStatus(request, filterStatus) && [
    `${request.database?.firstName || ''} ${request.database?.lastName || ''}`,
    request.database?.company?.name, String(request.database?.id || ''), request.requestedBy,
    request.sourceDb, request.reason?.replace(/_/g, ' '), request.notes,
  ].some(value => (value || '').toLowerCase().includes(query)));

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Shield aria-hidden="true" className="h-6 w-6" /></span>
        <h2 className="text-xl font-semibold text-slate-900">Akses terbatas</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Hanya admin yang dapat meninjau permintaan takeout.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500"><UserMinus aria-hidden="true" className="h-4 w-4" />Management / Takeout</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Takeout Requests</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Tinjau alasan takeout, putuskan permintaan, atau pulihkan kontak ke database.</p>
        </div>
        <button type="button" onClick={() => { void loadTabDetails(); }} disabled={loading || submittingId !== null} className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 sm:self-auto">
          <RotateCcw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang
        </button>
      </div>

      <section aria-labelledby="takeout-requests-title" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 pt-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 id="takeout-requests-title" className="text-base font-semibold text-slate-900">Daftar permintaan</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Setujui takeout atau tolak untuk mengaktifkan kembali kontak.</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" aria-label="Cari permintaan takeout" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Cari kontak, pengaju, atau alasan" className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div className="-mb-px mt-5 flex flex-wrap gap-1" aria-label="Filter status permintaan">
            {statusOptions.map(({ value, label, icon: Icon }) => (
              <button type="button" key={value} aria-pressed={filterStatus === value} onClick={() => setFilterStatus(value)} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-4 ${filterStatus === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <Icon aria-hidden="true" className="h-4 w-4" />{label}
                {!loading && !loadError && <span className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${filterStatus === value ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{removals.filter(request => matchesStatus(request, value)).length}</span>}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-blue-600" />Memuat permintaan takeout...</div>
        ) : loadError ? (
          <div role="alert" className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
            <AlertCircle aria-hidden="true" className="mb-3 h-7 w-7 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Permintaan belum berhasil dimuat</h3>
            <p className="mt-1 text-sm text-slate-500">Coba muat ulang untuk melihat daftar permintaan.</p>
            <button type="button" onClick={() => { void loadTabDetails(); }} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline"><RotateCcw aria-hidden="true" className="h-4 w-4" />Coba lagi</button>
          </div>
        ) : visibleRemovals.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
            <UserMinus aria-hidden="true" className="mb-3 h-7 w-7 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">{removals.length === 0 ? 'Belum ada permintaan takeout' : 'Tidak ada permintaan yang sesuai'}</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{removals.length === 0 ? 'Permintaan dari halaman Database atau Event akan muncul di sini.' : 'Coba kata kunci lain atau tampilkan semua status.'}</p>
            {(query || filterStatus !== 'all') && <button type="button" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }} className="mt-4 text-sm font-medium text-blue-700 hover:underline">Reset filter</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <caption className="sr-only">Permintaan takeout kontak dan tindakan peninjauan admin</caption>
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th scope="col" className="px-4 py-3 font-medium sm:px-6">Kontak</th>
                  <th scope="col" className="px-4 py-3 font-medium">Alasan & catatan</th>
                  <th scope="col" className="px-4 py-3 font-medium">Pengajuan</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-6">Tindakan</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRemovals.map(request => {
                    const contactName = `${request.database?.firstName || ''} ${request.database?.lastName || ''}`.trim() || `Kontak #${request.database?.id || '-'}`;
                    const busy = submittingId === request.id;
                    const completed = request.status === 'done' || request.status === 'approved';
                    const statusStyle = request.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-700' : completed ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-100 text-slate-600';
                    const StatusIcon = request.status === 'pending' ? Clock : completed ? CheckCircle2 : X;
                    return (
                      <tr key={request.id} className="align-top transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-5 sm:px-6">
                          <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><UserMinus className="h-4 w-4" /></span>
                            <div className="min-w-0">
                              <p className="max-w-56 break-words font-semibold text-slate-900">{contactName}</p>
                              {request.database?.company?.name && <p className="mt-1 max-w-56 break-words text-xs leading-5 text-slate-500">{request.database.company.name}</p>}
                              <p className="mt-1 text-xs tabular-nums text-slate-400">Kontak #{request.database?.id || '-'} · Request #{request.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-medium capitalize text-slate-700">{request.reason?.replace(/_/g, ' ') || 'Tidak disebutkan'}</p>
                          <p className="mt-2 max-w-sm whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">{request.notes || 'Tidak ada catatan tambahan.'}</p>
                        </td>
                        <td className="px-4 py-5">
                          <p className="break-words text-sm font-medium text-slate-700">{request.requestedBy || 'Tidak disebutkan'}</p>
                          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><Database aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="max-w-40 break-words">{request.sourceDb || 'Sumber tidak dicatat'}</span></p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-slate-500"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{formatRequestDate(request.requestDate || request.createdAt)}</p>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${statusStyle}`}><StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />{statusLabels[request.status] || request.status}</span>
                        </td>
                        <td className="px-4 py-5 sm:px-6">
                          {request.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => handleUpdateRemovalStatus(request.id, 'done', contactName)} disabled={submittingId !== null} aria-label={`Setujui takeout ${contactName}`} title="Setujui takeout; kontak tetap nonaktif" className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50">
                                {busy ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Check aria-hidden="true" className="h-3.5 w-3.5" />}Setujui
                              </button>
                              <button type="button" onClick={() => handleRestoreContact(request)} disabled={submittingId !== null} aria-label={`Tolak takeout ${contactName} dan aktifkan kontak`} title="Tolak permintaan dan aktifkan kembali kontak" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"><X aria-hidden="true" className="h-3.5 w-3.5" />Tolak</button>
                            </div>
                          ) : completed ? (
                            <div className="flex justify-end">
                              <button type="button" onClick={() => handleRestoreContact(request)} disabled={submittingId !== null} aria-label={`Pulihkan kontak ${contactName}`} className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
                                {busy ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />}Pulihkan kontak
                              </button>
                            </div>
                          ) : request.status === 'rejected' ? (
                            <span className="flex items-center justify-end gap-1.5 py-2 text-xs text-slate-500"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />Kontak aktif</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-4 text-xs text-slate-500 sm:px-6">
              <p>Menampilkan <span className="font-medium tabular-nums text-slate-700">{visibleRemovals.length}</span> dari {removals.length} permintaan</p>
              <span className="inline-flex items-center gap-1.5"><Shield aria-hidden="true" className="h-3.5 w-3.5" />Peninjauan oleh admin</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
