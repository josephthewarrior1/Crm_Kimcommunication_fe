import React from 'react';
import { Loader2 } from 'lucide-react';
import { Group } from '../../../../lib/types';

interface DeleteGroupConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export const DeleteGroupConfirmModal: React.FC<DeleteGroupConfirmModalProps> = ({
  isOpen,
  onClose,
  group,
  onConfirm,
  submitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
          <h3 className="ms-modal-title">Delete Holding Group</h3>
        </div>
        <p className="ms-modal-body text-sm leading-6 text-slate-600">
          Are you sure you want to delete the group <span className="font-semibold text-slate-800">"{group.name}"</span>? 
          This action cannot be undone. Associated companies will have their group references removed (nullified).
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
