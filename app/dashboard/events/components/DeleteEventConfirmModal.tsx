import React from 'react';
import { Loader2 } from 'lucide-react';
import { Event } from '../../../../lib/types';

interface DeleteEventConfirmModalProps {
  isOpen: boolean;
  deletingEvent: Event | null;
  onClose: () => void;
  onConfirm: () => void;
  submittingEvent: boolean;
}

export const DeleteEventConfirmModal: React.FC<DeleteEventConfirmModalProps> = ({
  isOpen,
  deletingEvent,
  onClose,
  onConfirm,
  submittingEvent
}) => {
  if (!isOpen || !deletingEvent) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Event</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to permanently delete the event <span className="font-semibold text-slate-800">"{deletingEvent.name}"</span>? 
          This will completely erase the event and all associated event lead tracking logs. This action is irreversible.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            disabled={submittingEvent}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submittingEvent}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submittingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Yes, Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
