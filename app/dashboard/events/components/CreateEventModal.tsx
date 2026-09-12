import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { EmsEventSelector } from './EmsEventSelector';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  eventType: string;
  setEventType: (v: string) => void;
  clientName: string;
  setClientName: (v: string) => void;
  dateStart: string;
  setDateStart: (v: string) => void;
  dateEnd: string;
  setDateEnd: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  targetParticipants: number;
  setTargetParticipants: (v: number) => void;
  emsEvents?: { id: number; name: string }[];
  emsEventId?: number;
  setEmsEventId?: (v: number) => void;
  submittingEvent: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  name,
  setName,
  eventType,
  setEventType,
  clientName,
  setClientName,
  dateStart,
  setDateStart,
  dateEnd,
  setDateEnd,
  notes,
  setNotes,
  targetParticipants,
  setTargetParticipants,
  emsEvents = [],
  emsEventId = 0,
  setEmsEventId,
  submittingEvent,
  onSubmit
}) => {
  if (!isOpen) return null;

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

        <h3 className="ms-modal-title pr-8">Create New Event</h3>

        </div>

        <form onSubmit={onSubmit} className="ms-modal-form">
          <div className="ms-modal-body space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name *</label>
            <input
              type="text"
              placeholder="e.g. Cloud Security Summit 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
              required
            />
          </div>

          {setEmsEventId && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Link ke Event EMS (ID / Dropdown)</label>
              {emsEvents.length > 0 ? (
                <EmsEventSelector
                  events={emsEvents}
                  value={emsEventId}
                  onChange={setEmsEventId}
                />
              ) : (
                <input
                  type="number"
                  placeholder="Masukkan ID Event EMS (misal: 1, 2, 3)"
                  value={emsEventId || ''}
                  onChange={(e) => setEmsEventId(Number(e.target.value))}
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
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
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
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>div]:min-w-0">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date Start</label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date End</label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Participants</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={targetParticipants || ''}
              onChange={(e) => setTargetParticipants(Number(e.target.value))}
              min={0}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#5b5fc7] rounded-md text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              placeholder="Additional event description..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
