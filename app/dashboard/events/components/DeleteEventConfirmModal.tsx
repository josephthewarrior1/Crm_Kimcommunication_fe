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
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
          <h3 className="ms-modal-title">Delete Event</h3>
        </div>
        <div className="ms-modal-body">
        <p className="ms-modal-description">
          Are you sure you want to permanently delete the event <span className="font-semibold text-slate-800">"{deletingEvent.name}"</span>? 
          This will completely erase the event and all associated event lead tracking logs. This action is irreversible.
        </p>

        </div>
        <div className="ms-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="ms-modal-secondary px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-all"
            disabled={submittingEvent}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submittingEvent}
            className="ms-modal-danger px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submittingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Yes, Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
