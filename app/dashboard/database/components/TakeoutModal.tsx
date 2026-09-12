import React, { useState } from 'react';
import { X, Loader2, UserX } from 'lucide-react';
import { Database } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

interface TakeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: Database;
  onSubmitSuccess: () => void;
}

export const TakeoutModal: React.FC<TakeoutModalProps> = ({
  isOpen,
  onClose,
  database,
  onSubmitSuccess
}) => {
  const [removalReason, setRemovalReason] = useState('lainnya');
  const [requestedBy, setRequestedBy] = useState('');
  const [sourceDb, setSourceDb] = useState('');
  const [takeoutNotes, setTakeoutNotes] = useState('');
  const [submittingTakeout, setSubmittingTakeout] = useState(false);

  if (!isOpen) return null;

  const handleCreateTakeout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTakeout(true);
    try {
      await crmService.createRemovalRequest({
        databaseId: database.id,
        reason: removalReason,
        requestedBy: requestedBy.trim() || undefined,
        sourceDb: sourceDb.trim() || undefined,
        notes: takeoutNotes.trim() || undefined,
        status: 'pending'
      });

      toast.success(`Takeout request for ${database.firstName} submitted for Admin approval.`);
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit takeout request');
    } finally {
      setSubmittingTakeout(false);
    }
  };

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
        <button
          onClick={onClose}
          className="ms-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="inline-flex p-2 bg-blue-50 text-blue-600 rounded-md mb-3">
            <UserX className="w-6 h-6" />
          </div>
          <h3 className="ms-modal-title">Request Data Takeout</h3>
          <p className="ms-modal-description">
            Proceeding will mark <strong>{database.firstName} {database.lastName}</strong> as inactive.
          </p>
        </div>

        </div>
        <form onSubmit={handleCreateTakeout} className="ms-modal-form">
        <div className="ms-modal-body space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Removal Reason</label>
            <select
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
            >
              <option value="resign">Resign</option>
              <option value="pensiun">Pensiun</option>
              <option value="meninggal">Meninggal</option>
              <option value="requested_takeout">Requested Takeout</option>
              <option value="pindah_kerja">Pindah Kerja</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Requested By</label>
              <input
                type="text"
                placeholder="User name"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Source Database</label>
              <input
                type="text"
                placeholder="e.g. old_pms"
                value={sourceDb}
                onChange={(e) => setSourceDb(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Takeout Notes</label>
            <textarea
              placeholder="Additional removal context..."
              value={takeoutNotes}
              onChange={(e) => setTakeoutNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none resize-none focus:bg-white"
            />
          </div>

        </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="ms-modal-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingTakeout}
              className="ms-modal-danger"
            >
              {submittingTakeout ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Confirm Takeout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
