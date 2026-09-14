import React, { useState } from 'react';
import { AlertCircle, Building2, Loader2, User, UserX } from 'lucide-react';
import { Database } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';

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
    if (submittingTakeout) return;
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !submittingTakeout) onClose(); }}>
      <DialogContent
        className={`sm:max-w-xl ${submittingTakeout ? '[&>.ms-modal-close]:pointer-events-none [&>.ms-modal-close]:opacity-40' : ''}`}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => { if (submittingTakeout) event.preventDefault(); }}
      >
        <div className="h-1.5 shrink-0 bg-blue-600" />
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-600">
            <UserX aria-hidden="true" className="h-4 w-4" />
            Database management
          </div>
          <DialogTitle>Request Data Takeout</DialogTitle>
          <DialogDescription>Ajukan penonaktifan kontak untuk ditinjau Admin.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateTakeout} className="ms-modal-form" aria-busy={submittingTakeout}>
          <div className="ms-modal-body space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">
                <User aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Kontak yang diajukan</p>
                <p className="mt-0.5 break-words text-base font-semibold text-slate-900">{database.firstName} {database.lastName}</p>
                {database.company?.name && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                    <Building2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="break-words">{database.company.name}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="takeout-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">Alasan takeout</label>
              <select
                id="takeout-reason"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                disabled={submittingTakeout}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="resign">Resign</option>
                <option value="pensiun">Pensiun</option>
                <option value="meninggal">Meninggal</option>
                <option value="requested_takeout">Requested Takeout</option>
                <option value="pindah_kerja">Pindah Kerja</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="takeout-requested-by" className="mb-1.5 block text-sm font-semibold text-slate-700">Diminta oleh <span className="font-normal text-slate-500">(opsional)</span></label>
                <input
                  id="takeout-requested-by"
                  type="text"
                  placeholder="Nama pemohon"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  disabled={submittingTakeout}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label htmlFor="takeout-source" className="mb-1.5 block text-sm font-semibold text-slate-700">Sumber database <span className="font-normal text-slate-500">(opsional)</span></label>
                <input
                  id="takeout-source"
                  type="text"
                  placeholder="Contoh: old_pms"
                  value={sourceDb}
                  onChange={(e) => setSourceDb(e.target.value)}
                  disabled={submittingTakeout}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="takeout-notes" className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan <span className="font-normal text-slate-500">(opsional)</span></label>
              <textarea
                id="takeout-notes"
                placeholder="Tambahkan konteks agar Admin dapat meninjau permintaan ini."
                value={takeoutNotes}
                onChange={(e) => setTakeoutNotes(e.target.value)}
                rows={3}
                disabled={submittingTakeout}
                className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Setelah dikirim, kontak langsung ditandai <strong className="font-semibold">tidak aktif</strong> selama permintaan menunggu persetujuan Admin.</p>
            </div>
          </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={submittingTakeout}
              className="ms-modal-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingTakeout}
              className="ms-modal-danger"
            >
              {submittingTakeout ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <UserX aria-hidden="true" className="h-4 w-4" />}
              {submittingTakeout ? 'Mengirim...' : 'Kirim takeout'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
