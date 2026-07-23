import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Event } from '../../../../lib/types';

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
  onSubmit
}) => {
  if (!isOpen || !editingEvent) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-slate-900 mb-6">Edit Event</h3>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name *</label>
            <input
              type="text"
              placeholder="e.g. Cloud Security Summit 2026"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
              required
            />
          </div>

          {setEditEmsEventId && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Link ke Event EMS (ID / Dropdown)</label>
              {emsEvents.length > 0 ? (
                <select
                  value={editEmsEventId}
                  onChange={(e) => setEditEmsEventId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                >
                  <option value={0}>-- Pilih Event EMS (Opsional) --</option>
                  {emsEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      [ID: {ev.id}] {ev.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  placeholder="Masukkan ID Event EMS (misal: 1, 2, 3)"
                  value={editEmsEventId || ''}
                  onChange={(e) => setEditEmsEventId(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Type</label>
              <select
                value={editEventType}
                onChange={(e) => setEditEventType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
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
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date Start</label>
              <input
                type="date"
                value={editDateStart}
                onChange={(e) => setEditDateStart(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date End</label>
              <input
                type="date"
                value={editDateEnd}
                onChange={(e) => setEditDateEnd(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
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
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              placeholder="Additional event description..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingEvent}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
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
