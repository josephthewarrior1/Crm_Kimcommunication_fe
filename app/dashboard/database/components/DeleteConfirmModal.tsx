import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Database } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: Database;
  onConfirmSuccess: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  database,
  onConfirmSuccess
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDeleteDatabase = async () => {
    setSubmitting(true);
    try {
      await crmService.deleteDatabase(database.id);
      toast.success('Database deleted successfully!');
      onConfirmSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete database');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Hard Delete Database</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to permanently delete database <span className="font-semibold text-slate-800">"{database.firstName} {database.lastName}"</span>?
          This will completely erase the database and all associated emails, event leads, and removal request logs. This action is irreversible.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteDatabase}
            disabled={submitting}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Yes, Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
