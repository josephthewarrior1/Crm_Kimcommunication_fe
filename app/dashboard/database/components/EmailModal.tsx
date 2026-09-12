import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Database, DatabaseEmail } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

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

  if (!isOpen) return null;

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailStr.trim()) return;

    setSubmittingEmail(true);
    try {
      await crmService.addDatabaseEmail(database.id, {
        email: newEmailStr.trim(),
        emailType,
        isPrimary,
        isVerified: false,
        isCorporate: emailType === 'company'
      });

      toast.success('Email added successfully!');
      setNewEmailStr('');
      setIsPrimary(false);
      onEmailAdded();
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
          onClick={onClose}
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
                {em.isPrimary && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold border border-blue-100 rounded-md">
                    Primary
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add new email form */}
          <h4 className="font-bold text-sm text-slate-900">Add New Email Address</h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={newEmailStr}
              onChange={(e) => setNewEmailStr(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm font-mono focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Type</label>
              <select
                value={emailType}
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
              onClick={onClose}
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
              Add Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
