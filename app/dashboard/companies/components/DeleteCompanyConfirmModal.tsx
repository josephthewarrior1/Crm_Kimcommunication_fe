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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Company</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to delete the company <span className="font-semibold text-slate-800">"{company.name}"</span>? 
          This action cannot be undone. Associated databases will have their company references removed (nullified).
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-105 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-red-600/10"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};
