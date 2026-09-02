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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 flex flex-col text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 mb-1">Emails for {database.firstName}</h3>
        <p className="text-xs text-slate-500 mb-6">Manage company or personal emails for lead targeting.</p>

        {/* List of current emails */}
        <div className="space-y-3 mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-[200px] overflow-y-auto">
          {loadingEmails ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : emails.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-4">No email addresses added yet.</p>
          ) : (
            emails.map((em) => (
              <div key={em.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono">
                <div className="space-y-0.5">
                  <p className="text-slate-900 font-bold">{em.email}</p>
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
        <form onSubmit={handleAddEmail} className="space-y-4 border-t border-slate-100 pt-4">
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

          <div className="grid grid-cols-2 gap-4">
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

            <div className="flex items-center gap-2 pt-6">
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

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submittingEmail}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
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
