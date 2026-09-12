import React from 'react';
import { Loader2 } from 'lucide-react';
import { Company } from '../../../../lib/types';

interface DeleteCompanyConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export const DeleteCompanyConfirmModal: React.FC<DeleteCompanyConfirmModalProps> = ({
  isOpen,
  onClose,
  company,
  onConfirm,
  submitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
          <h3 className="ms-modal-title">Delete Company</h3>
        </div>
        <p className="ms-modal-body text-sm leading-6 text-slate-600">
          Are you sure you want to delete the company <span className="font-semibold text-slate-800">"{company.name}"</span>? 
          This action cannot be undone. Associated databases will have their company references removed (nullified).
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
