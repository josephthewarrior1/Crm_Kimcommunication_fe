import React from 'react';
import { ArrowRight, Building2, History, Phone, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import type { EventParticipant } from '../../../../lib/types';
import { extractPicFromNotes } from '../utils/notesHelper';

interface PicParticipantsPanelProps {
  participants: EventParticipant[];
  selectedPic: string;
  adminName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAssignPic?: (participantIds: number[], picName: string) => Promise<void>;
  onOpenEngagementModal?: (participant: EventParticipant) => void;
}

export function PicParticipantsPanel({
  participants,
  selectedPic,
  adminName,
  searchQuery,
  onSearchChange,
  onAssignPic,
  onOpenEngagementModal,
}: PicParticipantsPanelProps) {
  const isSelectedPic = (participant: EventParticipant) => {
    const pic = extractPicFromNotes(participant.notes).pic.toLowerCase();
    return pic === selectedPic.toLowerCase() || (pic === 'admin' && selectedPic.toLowerCase() === adminName.toLowerCase());
  };
  const assigned = participants.filter(isSelectedPic);
  const others = participants.filter(participant => !isSelectedPic(participant));
  const query = searchQuery.toLowerCase();
  const available = others.filter(participant => [
    `${participant.database.firstName} ${participant.database.lastName}`,
    participant.database.company?.name || '',
    participant.database.mobilePhone || '',
    participant.database.emails?.[0]?.email || '',
  ].some(value => value.toLowerCase().includes(query)));

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100/80">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-slate-900">Dikelola {selectedPic}</h4>
            <span className="ml-auto rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{assigned.length}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Peserta yang menjadi tanggung jawab PIC ini.</p>
        </div>

        <div className="max-h-[52vh] min-h-56 overflow-y-auto p-3 sm:p-4">
          {assigned.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
              <Users className="mb-3 h-7 w-7 text-slate-400" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">Belum ada peserta</p>
              <p className="mt-1 max-w-64 text-xs leading-5 text-slate-500">{onAssignPic ? 'Pilih peserta dari daftar yang tersedia untuk ditugaskan ke PIC ini.' : 'Peserta yang ditugaskan ke PIC ini akan tampil di sini.'}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {assigned.map(participant => {
                const name = `${participant.database.firstName} ${participant.database.lastName}`.trim();
                const approved = participant.confirmationStatus === 'approve' || participant.confirmationStatus === 'confirmed';
                const declined = participant.confirmationStatus === 'decline' || participant.confirmationStatus === 'declined';
                return (
                  <li key={participant.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="break-words text-sm font-semibold leading-5 text-slate-900">{name}</p>
                    <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 break-words">{participant.database.company?.name || '-'}</span>
                    </div>
                    <div className="mt-1 flex items-start gap-2 text-xs leading-5 text-slate-500">
                      <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 break-words">{participant.database.mobilePhone || '-'}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${approved ? 'bg-emerald-50 text-emerald-700' : declined ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {approved ? 'Approve' : declined ? 'Declined' : 'Pending'}
                        </span>
                        {participant.participantStatus?.toLowerCase() === 'registered' && (
                          <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Registered</span>
                        )}
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        {onOpenEngagementModal && (
                          <button
                            type="button"
                            onClick={() => onOpenEngagementModal(participant)}
                            aria-label={`Lihat aktivitas ${name}`}
                            title="Lihat aktivitas telepon, WhatsApp, dan email"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          >
                            <History className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        {onAssignPic && (
                          <button
                            type="button"
                            onClick={() => onAssignPic([participant.id], 'not set')}
                            aria-label={`Lepas ${name} dari PIC ${selectedPic}`}
                            title="Lepas dari PIC ini"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          >
                            <UserMinus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100/80">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <UserPlus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-slate-900">Tugaskan peserta</h4>
            <span className="ml-auto rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-600">{available.length}{query && ` / ${others.length}`}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Peserta yang belum dialokasikan atau dikelola PIC lain.</p>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              aria-label="Cari peserta untuk ditugaskan"
              placeholder="Cari nama, perusahaan, telepon, email"
              className="h-10 w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="max-h-[52vh] min-h-56 overflow-y-auto p-3 sm:p-4">
          {available.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
              <Search className="mb-3 h-7 w-7 text-slate-400" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">{others.length === 0 ? 'Semua peserta sudah ditugaskan' : 'Peserta tidak ditemukan'}</p>
              <p className="mt-1 max-w-64 text-xs leading-5 text-slate-500">{others.length === 0 ? 'Seluruh peserta pada daftar ini dikelola oleh PIC yang dipilih.' : 'Coba nama, perusahaan, nomor telepon, atau email lainnya.'}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {available.map(participant => {
                const name = `${participant.database.firstName} ${participant.database.lastName}`.trim();
                const currentPic = extractPicFromNotes(participant.notes).pic;
                const unassigned = !currentPic || currentPic.trim() === '' || currentPic.toLowerCase() === 'not set';
                return (
                  <li key={participant.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="break-words text-sm font-semibold leading-5 text-slate-900">{name}</p>
                    <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 break-words">{participant.database.company?.name || '-'}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className={`min-w-0 break-words rounded px-2 py-1 text-xs font-medium ${unassigned ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>
                        {unassigned ? 'Belum dialokasikan' : `PIC: ${currentPic}`}
                      </span>
                      {onAssignPic && (
                        <button
                          type="button"
                          onClick={() => onAssignPic([participant.id], selectedPic)}
                          aria-label={`Tugaskan ${name} ke PIC ${selectedPic}`}
                          className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                          {unassigned ? <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
                          {unassigned ? 'Tugaskan' : 'Pindahkan'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
