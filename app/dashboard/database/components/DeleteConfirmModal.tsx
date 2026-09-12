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
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
        <h3 className="ms-modal-title">Hard Delete Database</h3>
        </div>
        <div className="ms-modal-body">
        <p className="text-sm leading-6 text-slate-600">
          Are you sure you want to permanently delete database <span className="font-semibold text-slate-800">"{database.firstName} {database.lastName}"</span>?
          This will completely erase the database and all associated emails, event leads, and removal request logs. This action is irreversible.
        </p>

        </div>
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
            onClick={handleDeleteDatabase}
            disabled={submitting}
            className="ms-modal-danger"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Yes, Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
