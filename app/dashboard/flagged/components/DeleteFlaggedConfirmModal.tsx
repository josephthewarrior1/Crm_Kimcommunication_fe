import React, { useRef } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../components/ui/dialog';
import { FlaggedIdentity } from '../../../../lib/types';

interface DeleteFlaggedConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  flag: FlaggedIdentity;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export const DeleteFlaggedConfirmModal: React.FC<DeleteFlaggedConfirmModalProps> = ({
  isOpen,
  onClose,
  flag,
  onConfirm,
  submitting
}) => {
  const openerRef = useRef<HTMLElement | null>(null);
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !submitting) onClose(); }}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={event => event.preventDefault()}
        onOpenAutoFocus={() => { openerRef.current = document.activeElement as HTMLElement | null; }}
        onCloseAutoFocus={event => { event.preventDefault(); openerRef.current?.focus(); }}
      >
        <header className="shrink-0 border-b border-slate-200 px-4 py-5 sm:px-6">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600"><Trash2 aria-hidden="true" className="h-5 w-5" /></span>
          <DialogTitle>Delete flagged identity?</DialogTitle>
          <DialogDescription>This permanently removes the flag from the review list.</DialogDescription>
        </header>
        <div className="ms-modal-body space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="break-words text-sm font-semibold text-slate-900">{flag.nameUsed || flag.emailUsed || flag.phoneUsed || 'Unnamed identity'}</p>
            <p className="mt-1 text-xs text-slate-500">Flagged record #{flag.id}</p>
          </div>
          <p className="text-sm leading-6 text-slate-600">This action cannot be undone.</p>
        </div>
        <footer className="ms-modal-footer">
          <button type="button" onClick={onClose} disabled={submitting} className="ms-modal-secondary disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="ms-modal-danger disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
            {submitting ? 'Deleting...' : 'Delete flag'}
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
};
