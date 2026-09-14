import React from 'react';
import { X, Loader2, Users } from 'lucide-react';
import { Event } from '../../../../lib/types';
import { EmsEventSelector } from './EmsEventSelector';

interface EditEventModalProps {
  isOpen: boolean;
  editingEvent: Event | null;
  onClose: () => void;
  editName: string;
  setEditName: (v: string) => void;
  editEventType: string;
  setEditEventType: (v: string) => void;
  editClientName: string;
  setEditClientName: (v: string) => void;
  editDateStart: string;
  setEditDateStart: (v: string) => void;
  editDateEnd: string;
  setEditDateEnd: (v: string) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
  editTargetParticipants: number;
  setEditTargetParticipants: (v: number) => void;
  emsEvents?: { id: number; name: string }[];
  editEmsEventId?: number;
  setEditEmsEventId?: (v: number) => void;
  submittingEvent: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onManagePics?: () => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  editingEvent,
  onClose,
  editName,
  setEditName,
  editEventType,
  setEditEventType,
  editClientName,
  setEditClientName,
  editDateStart,
  setEditDateStart,
  editDateEnd,
  setEditDateEnd,
  editNotes,
  setEditNotes,
  editTargetParticipants,
  setEditTargetParticipants,
  emsEvents = [],
  editEmsEventId = 0,
  setEditEmsEventId,
  submittingEvent,
  onSubmit,
  onManagePics
}) => {
  if (!isOpen || !editingEvent) return null;

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-lg">
        <div className="ms-modal-header">
        <button
          onClick={onClose}
          className="ms-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="ms-modal-title pr-8">Edit Event</h3>

        </div>

        <form onSubmit={onSubmit} className="ms-modal-form">
          <div className="ms-modal-body space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name *</label>
            <input
              type="text"
              placeholder="e.g. Cloud Security Summit 2026"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
              required
            />
          </div>

          {setEditEmsEventId && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Link ke Event EMS (ID / Dropdown)</label>
              {emsEvents.length > 0 ? (
                <EmsEventSelector
                  events={emsEvents}
                  value={editEmsEventId}
                  onChange={setEditEmsEventId}
                />
              ) : (
                <input
                  type="number"
                  placeholder="Masukkan ID Event EMS (misal: 1, 2, 3)"
                  value={editEmsEventId || ''}
                  onChange={(e) => setEditEmsEventId(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>div]:min-w-0">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Type</label>
              <select
                value={editEventType}
                onChange={(e) => setEditEventType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none focus:bg-white"
              >
                <option value="partner">Partner</option>
                <option value="end_user">End User</option>
                <option value="internal">Internal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Target</label>
              <input
                type="text"
                placeholder="e.g. Google Cloud"
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>div]:min-w-0">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date Start</label>
              <input
                type="date"
                value={editDateStart}
                onChange={(e) => setEditDateStart(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date End</label>
              <input
                type="date"
                value={editDateEnd}
                onChange={(e) => setEditDateEnd(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Participants</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={editTargetParticipants || ''}
              onChange={(e) => setEditTargetParticipants(Number(e.target.value))}
              min={0}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
            />
          </div>

          {onManagePics && (
            <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">PIC Event</p>
                <p className="text-xs text-slate-500 truncate">Pilih admin/PIC yang menangani leads event ini.</p>
              </div>
              <button
                type="button"
                onClick={onManagePics}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg transition-all shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                Manage PIC
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              placeholder="Additional event description..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
            />
          </div>

          </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="ms-modal-secondary px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingEvent}
              className="ms-modal-primary px-5 py-2 bg-[#5b5fc7] hover:bg-[#4f52b2] text-white text-sm font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submittingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
