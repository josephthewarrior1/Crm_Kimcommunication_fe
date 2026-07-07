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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
        <h3 className="text-lg font-extrabold text-slate-900 mb-2">Delete User Account?</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to delete user account <span className="font-bold text-slate-800">"{deletingUser.username}"</span>? This will permanently revoke their access credentials. This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-slate-105 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/10 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};
