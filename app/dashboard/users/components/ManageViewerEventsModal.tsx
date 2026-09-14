'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, Search, ShieldCheck } from 'lucide-react';
import { AppUser, Event } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { getViewerAllowedEventIds, saveViewerAllowedEventIds } from '../../../../lib/utils/viewerAccessHelper';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { toast } from 'sonner';

interface ManageViewerEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: AppUser | null;
  onSaved?: (userId: number, eventIds: number[]) => void;
}

const formatEventDate = (value?: string) => {
  if (!value) return 'Tanggal belum ditentukan';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Tanggal belum ditentukan'
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ManageViewerEventsModal: React.FC<ManageViewerEventsModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSaved,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 12;

  useEffect(() => {
    if (!isOpen || !targetUser) return;
    setSearch('');
    setCurrentPage(1);
    setSelectedIds(getViewerAllowedEventIds(targetUser));
  }, [isOpen, targetUser]);

  useEffect(() => {
    if (!isOpen || !targetUser?.id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setEvents([]);

    const loadEvents = async () => {
      try {
        const response = await crmService.getEventsList({
          search: search || undefined,
          page: currentPage,
          size: pageSize,
        });
        if (cancelled) return;
        setEvents(response.items || []);
        setTotalPages(response.totalPages || 1);
        setTotalItems(response.total || 0);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadEvents();
    return () => { cancelled = true; };
  }, [isOpen, targetUser?.id, search, currentPage, retry]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleEventIds = events.map((event) => event.id);
    setSelectedIds((prev) => {
      const allSelected = visibleEventIds.length > 0 && visibleEventIds.every((id) => prev.includes(id));
      return allSelected
        ? prev.filter((id) => !visibleEventIds.includes(id))
        : Array.from(new Set([...prev, ...visibleEventIds]));
    });
  };

  const handleSave = async () => {
    if (!targetUser || submitting) return;
    setSubmitting(true);
    try {
      await crmService.updateUserAllowedEvents(targetUser.id, selectedIds);

      // Browser storage is a cache; permissions are saved by the API first.
      try {
        saveViewerAllowedEventIds(targetUser.id, selectedIds);
        const savedUserJson = localStorage.getItem('user');
        if (savedUserJson) {
          const parsed = JSON.parse(savedUserJson);
          if (parsed.id === targetUser.id) {
            parsed.allowedEventIds = selectedIds;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
        }
      } catch {}

      onSaved?.(targetUser.id, selectedIds);
      toast.success(`Pengaturan event untuk ${targetUser.fullName || targetUser.username} tersimpan.`);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Pengaturan event belum tersimpan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!targetUser) return null;
  const isAdmin = targetUser.roles?.includes('ADMIN');
  const name = targetUser.fullName || targetUser.username;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const allVisibleSelected = events.length > 0 && events.every((event) => selectedIds.includes(event.id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent
        className="sm:max-w-2xl"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }}
        aria-busy={submitting}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-600">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            User management
          </div>
          <DialogTitle>{isAdmin ? 'Penugasan event' : 'Event access'}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Pilih event yang ditangani user ini sebagai PIC.'
              : targetUser.roles?.includes('MANAGER')
                ? 'Pilih event yang dapat diakses dan ditangani user ini sebagai PIC.'
                : 'Pilih event yang dapat diakses oleh user ini.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-4 mt-4 flex shrink-0 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:mx-6 sm:mt-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700" aria-hidden="true">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-slate-800">{name}</p>
              <p className="break-words text-xs text-slate-500">{targetUser.email || `@${targetUser.username}`}</p>
            </div>
            <div className="flex max-w-[35%] flex-wrap justify-end gap-1">
              {(targetUser.roles?.length ? targetUser.roles : ['USER']).map((role) => (
                <span key={role} className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">{role === 'MANAGER' ? 'PIC' : role}</span>
              ))}
            </div>
          </div>

          {isAdmin && (
            <p className="mx-4 mt-3 shrink-0 text-xs leading-relaxed text-slate-500 sm:mx-6">
              Admin tetap memiliki akses ke seluruh event. Pilihan ini menentukan penugasan PIC.
            </p>
          )}

          <div className="shrink-0 space-y-3 px-4 pb-3 pt-4 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                aria-label="Cari nama event"
                type="search"
                placeholder="Cari nama event..."
                value={search}
                disabled={submitting}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                className="h-10 w-full rounded border border-slate-300 bg-white pl-10 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500" aria-live="polite">
                {loading ? 'Mencari event...' : loadError ? 'Daftar event belum tersedia' : `${totalItems} event${search ? ' ditemukan' : ' tersedia'}`}
              </p>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={loading || loadError || submitting || events.length === 0}
                className="inline-flex min-h-8 items-center gap-1.5 px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {allVisibleSelected ? 'Batalkan pilihan halaman ini' : 'Pilih semua di halaman ini'}
              </button>
            </div>
          </div>

          <div className="px-4 pb-4 sm:px-6 sm:pb-5" aria-busy={loading}>
            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
                Memuat daftar event...
              </div>
            ) : loadError ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-5 text-center" role="alert">
                <AlertCircle className="h-6 w-6 text-slate-500" aria-hidden="true" />
                <p className="text-sm text-slate-600">Daftar event belum berhasil dimuat.</p>
                <button type="button" onClick={() => setRetry((value) => value + 1)} disabled={submitting} className="ms-modal-secondary disabled:opacity-50">Coba lagi</button>
              </div>
            ) : events.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <CalendarDays className="mb-1 h-6 w-6 text-slate-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-700">{search ? 'Event tidak ditemukan' : 'Belum ada event'}</p>
                <p className="text-xs text-slate-500">{search ? 'Coba nama event lain. Pilihan event di halaman lain tetap dipertahankan.' : 'Event yang sudah dibuat akan muncul di sini.'}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {events.map((event) => {
                  const checked = selectedIds.includes(event.id);
                  return (
                    <li key={event.id}>
                      <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors sm:p-3.5 ${checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'} ${submitting ? 'cursor-wait opacity-70' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(event.id)}
                          disabled={submitting}
                          aria-label={event.name}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold leading-5 text-slate-800">{event.name}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-slate-500">
                            <span className="break-words">{event.clientName || event.client || 'Tanpa client'}</span>
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              {formatEventDate(event.dateStart || event.startDate)}
                            </span>
                          </span>
                        </span>
                        {checked && <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!loading && !loadError && totalItems > 0 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-6">
              <p className="text-xs text-slate-500">
                {(currentPage - 1) * pageSize + 1}–{Math.min((currentPage - 1) * pageSize + events.length, totalItems)} dari {totalItems} event
              </p>
              <nav aria-label="Halaman daftar event" className="flex items-center gap-2">
                <button type="button" aria-label="Halaman sebelumnya" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1 || submitting} className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-12 text-center text-xs font-medium text-slate-600">{currentPage} / {totalPages}</span>
                <button type="button" aria-label="Halaman berikutnya" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages || submitting} className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <div aria-live="polite">
            <p className="text-sm font-semibold text-slate-800">{selectedIds.length} event dipilih</p>
            <p className="mt-0.5 text-xs text-slate-500">Termasuk pilihan di halaman lain.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className="ms-modal-secondary disabled:cursor-not-allowed disabled:opacity-60">Batal</button>
            <button type="button" onClick={handleSave} disabled={submitting} className="ms-modal-primary disabled:cursor-wait disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Menyimpan...' : 'Simpan pengaturan'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
