import React from 'react';
import { Loader2 } from 'lucide-react';
import { AppUser } from '../../../../lib/types';

interface DeleteUserConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletingUser: AppUser;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export const DeleteUserConfirmModal: React.FC<DeleteUserConfirmModalProps> = ({
  isOpen,
  onClose,
  deletingUser,
  onConfirm,
  loading
}) => {
  if (!isOpen) return null;

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
          <h3 className="ms-modal-title">Delete User Account?</h3>
        </div>
        <p className="ms-modal-body text-sm leading-6 text-slate-600">
          Are you sure you want to delete user account <span className="font-semibold text-slate-800">"{deletingUser.username}"</span>? This will permanently revoke their access credentials. This action cannot be undone.
        </p>
        <div className="ms-modal-footer">
          <button
            onClick={onClose}
            disabled={loading}
            className="ms-modal-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="ms-modal-danger"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};
