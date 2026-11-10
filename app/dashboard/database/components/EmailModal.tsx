import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Database, DatabaseEmail } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';
import { getEmailInputError, prepareContactEmailEntries } from '../utils/emailInput';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: Database;
  emails: DatabaseEmail[];
  loadingEmails: boolean;
  onEmailAdded: () => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  database,
  emails,
  loadingEmails,
  onEmailAdded
}) => {
  const [newEmailStr, setNewEmailStr] = useState('');
  const [emailType, setEmailType] = useState('company');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);

  if (!isOpen) return null;

  const destination = database.databaseDestination === 'participant' ? 'participant' : 'company';
  const effectiveEmailType = destination === 'participant' ? 'personal' : emailType;
  const resetEmailForm = () => {
    setNewEmailStr('');
    setIsPrimary(false);
    setEmailType('company');
    setEditingEmailId(null);
  };
  const handleClose = () => { resetEmailForm(); onClose(); };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingEmail || !newEmailStr.trim()) return;
    const error = getEmailInputError(newEmailStr, effectiveEmailType, destination);
    if (error) { toast.error(error); return; }

    setSubmittingEmail(true);
    try {
      const result = await crmService.saveDatabaseEmails(database.id, prepareContactEmailEntries(newEmailStr, {
        ...(editingEmailId == null ? {} : { id: editingEmailId }),
        emailType: effectiveEmailType,
        isPrimary,
        ...(editingEmailId == null ? { isVerified: false } : {}),
        isCorporate: effectiveEmailType === 'company'
      }, destination));

      toast.success(`${result.createdCount} email ditambahkan, ${result.updatedCount} diperbarui, ${result.existingCount} sudah tersimpan.`);
      resetEmailForm();
      await onEmailAdded();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add email address');
    } finally {
      setSubmittingEmail(false);
    }
  };

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-lg">
        <div className="ms-modal-header">
        <button
          onClick={handleClose}
          disabled={submittingEmail}
          aria-label="Tutup pengelolaan email"
          className="ms-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="ms-modal-title">Emails for {database.firstName}</h3>
        <p className="ms-modal-description">Manage company or personal emails for lead targeting.</p>
        </div>

        <form onSubmit={handleAddEmail} className="ms-modal-form">
        <div className="ms-modal-body space-y-4">

        {/* List of current emails */}
        <div className="ms-modal-section space-y-3">
          {loadingEmails ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : emails.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-4">No email addresses added yet.</p>
          ) : (
            emails.map((em) => (
              <div key={em.id} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-md text-xs">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-slate-900 font-semibold break-all">{em.email}</p>
                  <p className="text-[10px] text-slate-500">
                    Type: <span className="capitalize">{em.emailType}</span> |{' '}
                    {em.isCorporate ? (
                      <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px]">Corporate Email</span>
                    ) : (
                      <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px]">Personal Domain Email</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">{em.isPrimary && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold border border-blue-100 rounded-md">
                    Primary
                  </span>
                )}<button type="button" disabled={submittingEmail} className="rounded border border-slate-200 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50" aria-label={`Edit email ${em.email}`} onClick={() => {
                  setEditingEmailId(em.id); setNewEmailStr(em.email); setEmailType(em.isCorporate ? 'company' : em.emailType || 'other'); setIsPrimary(Boolean(em.isPrimary));
                }}>Edit</button></div>
              </div>
            ))
          )}
        </div>

        {/* Add new email form */}
          <h4 className="font-bold text-sm text-slate-900">{editingEmailId == null ? 'Add New Email Address' : 'Edit Email Address'}</h4>

          <div>
            <label htmlFor="database-email-addresses" className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input
              id="database-email-addresses"
              type="text"
              inputMode="email"
              aria-describedby="database-email-input-help"
              disabled={submittingEmail}
              placeholder="name@company.com, other@company.com"
              value={newEmailStr}
              onChange={(e) => setNewEmailStr(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm font-mono focus:bg-white"
              required
            />
            <p id="database-email-input-help" className="mt-1 text-xs text-slate-500">Boleh lebih dari satu alamat. Pisahkan dengan koma, titik koma, atau spasi; setiap alamat disimpan terpisah.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="database-email-type" className="block text-xs font-semibold text-slate-700 mb-1.5">Email Type</label>
              <select
                id="database-email-type"
                value={effectiveEmailType}
                disabled={submittingEmail || destination === 'participant'}
                onChange={(e) => setEmailType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
              >
                <option value="company">Company</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-2 sm:pt-6">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                disabled={submittingEmail}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPrimary" className="text-xs font-semibold text-slate-700">
                Set as Primary Email
              </label>
            </div>
          </div>

        </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={handleClose}
              disabled={submittingEmail}
              className="ms-modal-secondary"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submittingEmail}
              className="ms-modal-primary"
            >
              {submittingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {editingEmailId == null ? 'Add Email' : 'Save Email'}
            </button>
            {editingEmailId != null && <button type="button" disabled={submittingEmail} onClick={resetEmailForm} className="ms-modal-secondary">Batal edit email</button>}
          </div>
        </form>
      </div>
    </div>
  );
};
