import React from 'react';
import { Loader2 } from 'lucide-react';
import { FlaggedIdentity } from '../../../../lib/types';

interface DeleteFlaggedConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  flag: FlaggedIdentity;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export const DeleteFlaggedConfirmModal: React.FC<DeleteFlaggedConfirmModalProps> = ({
  isOpen,
  onClose,
  flag,
  onConfirm,
  submitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
          <h3 className="ms-modal-title">Delete Flagged Identity</h3>
        </div>
        <p className="ms-modal-body text-sm leading-6 text-slate-600">
          Are you sure you want to permanently clear/remove flagged entry <span className="font-semibold text-slate-800">"{flag.nameUsed || 'this item'}"</span>? 
          This will completely delete this record from the flagged tikus database list. This action is irreversible.
        </p>

        <div className="ms-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="ms-modal-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="ms-modal-danger"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};
