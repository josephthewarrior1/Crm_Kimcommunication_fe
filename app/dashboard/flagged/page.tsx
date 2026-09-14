'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { FlaggedIdentity, Database, DatabaseEmail, EventParticipant } from '../../../lib/types';
import { Plus, Search, Loader2, Edit2, Trash2, AlertTriangle, RefreshCw, UserX, Eye, ShieldCheck, ShieldX, Users, Link2, CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { AddFlaggedModal } from './components/AddFlaggedModal';
import { EditFlaggedModal } from './components/EditFlaggedModal';
import { DeleteFlaggedConfirmModal } from './components/DeleteFlaggedConfirmModal';
import { FlaggedDetailModal } from './components/FlaggedDetailModal';

export default function FlaggedPage() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;
  const [flags, setFlags] = useState<FlaggedIdentity[]>([]);
  const [allFlags, setAllFlags] = useState<FlaggedIdentity[] | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>(['suspected', 'confirmed', 'cleared']);
  const [flagReasonOptions, setFlagReasonOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFlagReason, setFilterFlagReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Selected for edit/delete/detail
  const [editingFlag, setEditingFlag] = useState<FlaggedIdentity | null>(null);
  const [deletingFlag, setDeletingFlag] = useState<FlaggedIdentity | null>(null);

  // Detail Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailFlag, setDetailFlag] = useState<FlaggedIdentity | null>(null);
  const [detailDatabase, setDetailDatabase] = useState<Database | null>(null);
  const [detailEmails, setDetailEmails] = useState<DatabaseEmail[]>([]);
  const [detailEvents, setDetailEvents] = useState<EventParticipant[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const handleOpenDetail = async (flg: FlaggedIdentity, linkedDb?: Database) => {
    const requestId = ++detailRequest.current;
    const targetDb = linkedDb || flg.database;
    setDetailFlag(flg);
    setDetailDatabase(targetDb || null);
    setDetailEmails([]);
    setDetailEvents([]);
    setDetailError('');
    setLoadingDetail(Boolean(targetDb));
    setIsDetailModalOpen(true);

    if (!targetDb) return;
    try {
      const [emails, eventsList] = await Promise.all([
        crmService.getDatabaseEmails(targetDb.id),
        crmService.getDatabaseEventParticipants(targetDb.id)
      ]);
      if (requestId !== detailRequest.current) return;
      setDetailEmails(emails);
      setDetailEvents(eventsList);
    } catch {
      if (requestId !== detailRequest.current) return;
      setDetailError('Detail profil terkait belum berhasil dimuat.');
    } finally {
      if (requestId === detailRequest.current) setLoadingDetail(false);
    }
  };

  const loadData = useCallback(async () => {
    const requestId = ++listRequest.current;
    setLoading(true);
    setLoadError(false);
    try {
      const [flagList, databaseList, filterOptions, allFlagItems] = await Promise.all([
        crmService.getFlaggedIdentitiesList({
          search: searchQuery || undefined,
          status: filterStatus || undefined,
          flagReason: filterFlagReason || undefined,
          page: currentPage,
          size: pageSize
        }),
        crmService.getDatabases(),
        crmService.getFlaggedIdentitiesFilterOptions(),
        crmService.getFlaggedIdentities().catch(() => null)
      ]);
      if (requestId !== listRequest.current) return;
      const lastPage = Math.max(flagList.totalPages, 1);
      if (currentPage > lastPage) {
        setCurrentPage(lastPage);
        return;
      }
      setFlags(flagList.items);
      setAllFlags(allFlagItems);
      setTotalItems(flagList.total);
      setTotalPages(lastPage);
      setDatabases(databaseList);
      setStatusOptions(Array.from(new Set(['suspected', 'confirmed', 'cleared', ...(filterOptions.statuses || [])])));
      setFlagReasonOptions(filterOptions.flagReasons || []);
    } catch {
      if (requestId !== listRequest.current) return;
      setLoadError(true);
    } finally {
      if (requestId === listRequest.current) setLoading(false);
    }
  }, [searchQuery, filterStatus, filterFlagReason, currentPage]);

  useEffect(() => {
    void loadData();
    return () => { listRequest.current += 1; };
  }, [loadData]);

  const handleCreateFlag = async (data: any) => {
    if (!data.nameUsed && !data.emailUsed && !data.phoneUsed) {
      toast.error('At least one of Name, Email, or Phone is required');
      return;
    }
    setSubmitting(true);
    try {
      await crmService.createFlaggedIdentity(data);
      toast.success('Suspicious profile flagged successfully.');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create flagged entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFlag = async (data: any) => {
    if (!editingFlag) return;
    setSubmitting(true);
    try {
      await crmService.updateFlaggedIdentity(editingFlag.id, data);
      toast.success('Flagged identity details updated.');
      setIsEditModalOpen(false);
      setEditingFlag(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update flagged details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFlag = async () => {
    if (!deletingFlag) return;
    setSubmitting(true);
    try {
      await crmService.deleteFlaggedIdentity(deletingFlag.id);
      toast.success('Identity removed from spam list.');
      setIsDeleteConfirmOpen(false);
      setDeletingFlag(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete flagged identity');
    } finally {
      setSubmitting(false);
    }
  };

  // Risk colors helper
  const getRiskColor = (st: string) => {
    switch (st) {
      case 'confirmed':
        return 'bg-red-50 border border-red-100 text-red-600';
      case 'suspected':
        return 'bg-amber-50 border border-amber-100 text-amber-600';
      case 'cleared':
        return 'bg-emerald-50 border border-emerald-100 text-emerald-600';
      default:
        return 'bg-slate-100 border border-slate-200 text-slate-500';
    }
  };

  const getPrimaryFlagInfo = (flag: FlaggedIdentity) => {
    const reason = flag.flagReason || '';
    if (reason === 'duplicate_phone') {
      return { label: 'Duplicate Phone', value: flag.phoneUsed || '-' };
    }
    if (reason === 'duplicate_email') {
      return { label: 'Duplicate Email', value: flag.emailUsed || '-' };
    }
    if (flag.emailUsed) {
      return { label: 'Email', value: flag.emailUsed };
    }
    if (flag.phoneUsed) {
      return { label: 'Phone', value: flag.phoneUsed };
    }
    return { label: 'Identity', value: flag.nameUsed || '-' };
  };

  const extractMatchedName = (notes?: string) => {
    const match = notes?.match(/matches database record\s+(.+?)\s+\(ID:/i);
    return match?.[1]?.trim() || '';
  };

  const startIndex = (currentPage - 1) * pageSize;
  const suspectedCount = allFlags?.filter((flag) => flag.status === 'suspected').length;
  const confirmedCount = allFlags?.filter((flag) => flag.status === 'confirmed').length;
  const clearedCount = allFlags?.filter((flag) => flag.status === 'cleared').length;
  const hasFilters = Boolean(searchQuery || filterStatus || filterFlagReason);
  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterFlagReason('');
    setCurrentPage(1);
  };
  const summaryCards = [
    { label: 'Semua identitas', status: '', value: allFlags?.length, icon: Users, color: 'text-blue-600' },
    { label: 'Suspected', status: 'suspected', value: suspectedCount, icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Confirmed', status: 'confirmed', value: confirmedCount, icon: ShieldX, color: 'text-red-600' },
    { label: 'Cleared', status: 'cleared', value: clearedCount, icon: ShieldCheck, color: 'text-emerald-600' }
  ];
  const modalEvents = [
    ...flags
      .map((flag) => flag.event)
      .filter((event): event is NonNullable<FlaggedIdentity['event']> => Boolean(event?.id)),
    ...(editingFlag?.event ? [editingFlag.event] : [])
  ].filter((event, index, array) => array.findIndex((item) => item.id === event.id) === index);

  return (
    <div className="space-y-5 text-slate-900">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Management / Pemeriksaan identitas</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Flagged Identities</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tinjau identitas yang ditandai, periksa profil terkait, dan catat hasil pemeriksaannya.</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:self-auto">
            <Plus aria-hidden="true" className="h-4 w-4" />Tandai identitas
          </button>
        )}
      </header>

      <section aria-label="Ringkasan seluruh identitas" className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} type="button" aria-pressed={filterStatus === card.status} onClick={() => { setFilterStatus(card.status); setCurrentPage(1); }} className={`min-w-0 border-b-2 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-5 ${filterStatus === card.status ? 'border-blue-600 bg-blue-50/60' : 'border-transparent hover:bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${card.color}`} />{card.label}</span>
              <span className="mt-2 block text-2xl font-semibold tabular-nums text-slate-900">{loading || loadError || card.value === undefined ? '—' : card.value.toLocaleString()}</span>
              <span className="sr-only">di seluruh daftar. Filter berdasarkan status ini.</span>
            </button>
          );
        })}
      </section>

      <section aria-label="Daftar identitas yang ditandai" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="space-y-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Daftar identitas <span className="ml-1 font-normal text-slate-500">{!loading && !loadError ? `(${totalItems.toLocaleString()})` : ''}</span></h2>
            <span className="text-xs text-slate-500">{hasFilters ? 'Hasil sesuai pencarian dan filter' : 'Seluruh status pemeriksaan'}</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Cari identitas</span>
              <span className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                <input type="search" placeholder="Cari nama, email, telepon, atau bukti..." value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
              </span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
              <label className="min-w-0">
                <span className="sr-only">Filter status</span>
                <select value={filterStatus} onChange={(event) => { setFilterStatus(event.target.value); setCurrentPage(1); }} className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 lg:w-40">
                  <option value="">Semua status</option>
                  {statusOptions.map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
                </select>
              </label>
              <label className="min-w-0">
                <span className="sr-only">Filter alasan penandaan</span>
                <select value={filterFlagReason} onChange={(event) => { setFilterFlagReason(event.target.value); setCurrentPage(1); }} className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 lg:w-52">
                  <option value="">Semua alasan</option>
                  {flagReasonOptions.map(reason => <option key={reason} value={reason}>{reason.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
            </div>
            {hasFilters && <button type="button" onClick={resetFilters} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><RefreshCw aria-hidden="true" className="h-4 w-4" />Reset</button>}
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-blue-600" />Memuat daftar identitas...</div>
        ) : loadError ? (
          <div role="alert" className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
            <AlertTriangle aria-hidden="true" className="mb-3 h-7 w-7 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Daftar identitas belum berhasil dimuat</h3>
            <p className="mt-1 text-sm text-slate-500">Muat ulang untuk melihat status pemeriksaan terbaru.</p>
            <button type="button" onClick={() => { void loadData(); }} className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><RefreshCw aria-hidden="true" className="h-4 w-4" />Coba lagi</button>
          </div>
        ) : flags.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
            {hasFilters ? <SlidersHorizontal aria-hidden="true" className="mb-3 h-7 w-7 text-slate-400" /> : <ShieldCheck aria-hidden="true" className="mb-3 h-7 w-7 text-emerald-600" />}
            <h3 className="text-sm font-semibold text-slate-800">{hasFilters ? 'Tidak ada identitas yang cocok' : 'Belum ada identitas yang ditandai'}</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{hasFilters ? 'Coba kata kunci lain atau reset filter untuk melihat daftar lainnya.' : 'Identitas yang ditandai akan muncul di sini beserta alasan dan hasil pemeriksaannya.'}</p>
            {hasFilters && <button type="button" onClick={resetFilters} className="mt-4 rounded text-sm font-medium text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Reset filter</button>}
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200">
              {flags.map((flg) => {
                const linkedDb = flg.database || databases.find(db => {
                  if (flg.phoneUsed && db.mobilePhone) {
                    const fDigits = flg.phoneUsed.replace(/[^0-9]/g, '').replace(/^62|^0/, '');
                    const dbDigits = db.mobilePhone.replace(/[^0-9]/g, '').replace(/^62|^0/, '');
                    if (fDigits && fDigits === dbDigits) return true;
                  }
                  if (flg.emailUsed && db.emails) {
                    const fEmail = flg.emailUsed.trim().toLowerCase();
                    if (db.emails.some(e => e.email && e.email.trim().toLowerCase() === fEmail)) return true;
                  }
                  return false;
                });
                const primaryInfo = getPrimaryFlagInfo(flg);
                const matchedName = extractMatchedName(flg.evidenceNotes);
                const displayName = flg.nameUsed || 'Nama belum dicatat';
                return (
                  <article key={flg.id} className="px-4 py-5 transition-colors hover:bg-slate-50/40 sm:px-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"><UserX className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <h3 className="min-w-0 text-sm font-semibold text-slate-900"><button type="button" onClick={() => { void handleOpenDetail(flg, linkedDb); }} className="rounded text-left [overflow-wrap:anywhere] hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{displayName}</button></h3>
                              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${getRiskColor(flg.status)}`}>{flg.status}</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{primaryInfo.label}</p>
                            <p className="mt-0.5 break-all text-sm text-slate-700">{primaryInfo.value}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-start gap-2 border-l-2 border-blue-200 pl-3">
                          <Link2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500">Profil CRM terkait</p>
                            {linkedDb ? (
                              <><button type="button" onClick={() => { void handleOpenDetail(flg, linkedDb); }} className="mt-1 rounded text-left text-sm font-medium text-blue-700 [overflow-wrap:anywhere] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{`${linkedDb.firstName || ''} ${linkedDb.lastName || ''}`.trim() || 'Lihat profil terkait'}</button>{linkedDb.company?.name && <p className="mt-0.5 break-words text-xs text-slate-500">{linkedDb.company.name}</p>}</>
                            ) : <p className="mt-1 text-sm text-slate-500">Belum ada profil tertaut</p>}
                            {matchedName && <p className="mt-2 break-words text-xs leading-5 text-slate-500">Tercatat cocok dengan <span className="font-medium text-slate-700">{matchedName}</span></p>}
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-600" /><span className="break-words capitalize">{flg.flagReason?.replace(/_/g, ' ') || 'Alasan belum dicatat'}</span></span>
                          {flg.event && <span className="inline-flex min-w-0 items-start gap-1.5 text-xs leading-5 text-slate-500"><CalendarDays aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{flg.event.name}</span></span>}
                        </div>
                        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                          <p className="text-xs font-medium text-slate-500">Catatan pemeriksaan</p>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{flg.evidenceNotes || 'Belum ada catatan tambahan untuk identitas ini.'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <button type="button" onClick={() => { void handleOpenDetail(flg, linkedDb); }} aria-label={`Lihat detail ${displayName}`} className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Eye aria-hidden="true" className="h-4 w-4" />Lihat detail</button>
                      {canManage && (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditingFlag(flg); setIsEditModalOpen(true); }} aria-label={`Edit identitas ${displayName}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Edit2 aria-hidden="true" className="h-3.5 w-3.5" />Edit</button>
                          <button type="button" onClick={() => { setDeletingFlag(flg); setIsDeleteConfirmOpen(true); }} aria-label={`Hapus penandaan ${displayName}`} className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" />Hapus</button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-4 text-xs text-slate-500 sm:px-5">
              <p><span className="font-medium tabular-nums text-slate-700">{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</span> dari {totalItems.toLocaleString()} identitas</p>
              <nav aria-label="Halaman daftar identitas" className="flex items-center gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(previous => Math.max(previous - 1, 1))} aria-label="Halaman sebelumnya" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
                <span className="px-2 tabular-nums">Halaman {currentPage} / {totalPages}</span>
                <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(previous => Math.min(previous + 1, totalPages))} aria-label="Halaman berikutnya" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
              </nav>
            </footer>
          </>
        )}
      </section>

      {/* Flag Manual Profile Modal */}
      <AddFlaggedModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        databases={databases}
        events={modalEvents}
        onSubmit={handleCreateFlag}
        submitting={submitting}
      />

      {/* Edit Flagged Identity Modal */}
      {editingFlag && (
        <EditFlaggedModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingFlag(null);
          }}
          databases={databases}
          events={modalEvents}
          flag={editingFlag}
          onSubmit={handleUpdateFlag}
          submitting={submitting}
        />
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deletingFlag && (
        <DeleteFlaggedConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletingFlag(null);
          }}
          flag={deletingFlag}
          onConfirm={handleDeleteFlag}
          submitting={submitting}
        />
      )}

      {/* Flagged Identity Detail Modal */}
      <FlaggedDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          detailRequest.current += 1;
          setLoadingDetail(false);
          setIsDetailModalOpen(false);
          setDetailFlag(null);
          setDetailDatabase(null);
        }}
        flag={detailFlag}
        database={detailDatabase}
        emails={detailEmails}
        events={detailEvents}
        loadingDetails={loadingDetail}
        detailError={detailError}
        onRetryDetails={() => { if (detailFlag) void handleOpenDetail(detailFlag, detailDatabase || undefined); }}
        onEdit={canManage ? (flg) => {
          setEditingFlag(flg);
          setIsEditModalOpen(true);
        } : undefined}
      />
    </div>
  );
}
