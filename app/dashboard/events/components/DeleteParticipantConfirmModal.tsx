import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { EventParticipant } from '../../../../lib/types';

interface DeleteParticipantConfirmModalProps {
  isOpen: boolean;
  deletingParticipant: EventParticipant | null;
  onClose: () => void;
  onConfirm: () => void;
  submittingParticipantDelete: boolean;
}

export const DeleteParticipantConfirmModal: React.FC<DeleteParticipantConfirmModalProps> = ({
  isOpen,
  deletingParticipant,
  onClose,
  onConfirm,
  submittingParticipantDelete
}) => {
  if (!isOpen || !deletingParticipant) return null;

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

        <h3 className="ms-modal-title pr-8">Remove Participant from Event</h3>
        <p className="ms-modal-description mt-2">
          Are you sure you want to remove this person from the event?
        </p>

        </div>
        <div className="ms-modal-body">
        <div className="ms-modal-section space-y-3 text-sm">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</span>
            <span className="font-bold text-slate-800">{deletingParticipant.database.firstName} {deletingParticipant.database.lastName}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Title</span>
            <span className="font-semibold text-slate-700">{deletingParticipant.database.jobTitle || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
            <span className="font-semibold text-slate-700">{deletingParticipant.database.company?.name || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Industry</span>
            <span className="font-semibold text-slate-700">{deletingParticipant.database.company?.industry || '-'}</span>
          </div>
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
            type="button"
            onClick={onConfirm}
            disabled={submittingParticipantDelete}
            className="ms-modal-danger px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-750 text-white text-sm font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submittingParticipantDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
