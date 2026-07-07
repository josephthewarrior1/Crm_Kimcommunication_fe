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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-extrabold text-slate-900 mb-1">Remove Participant from Event</h3>
        <p className="text-xs text-slate-500 mb-6">
          Are you sure you want to remove this person from the event?
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-6 text-sm">
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

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submittingParticipantDelete}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-750 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submittingParticipantDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
