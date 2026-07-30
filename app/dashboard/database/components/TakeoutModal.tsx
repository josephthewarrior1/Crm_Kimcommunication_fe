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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl mb-3">
            <UserX className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">Request Data Takeout</h3>
          <p className="text-xs text-slate-500 mt-1">
            Proceeding will mark <strong>{database.firstName} {database.lastName}</strong> as inactive.
          </p>
        </div>

        <form onSubmit={handleCreateTakeout} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 text-xs font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingTakeout}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
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
