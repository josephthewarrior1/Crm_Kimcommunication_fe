import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Database, Event, FlaggedIdentity } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { normalizePhone } from '../../database/utils/phoneHelper';

interface EditFlaggedModalProps {
  isOpen: boolean;
  onClose: () => void;
  databases: Database[];
  events: Event[];
  flag: FlaggedIdentity;
  onSubmit: (data: {
    nameUsed?: string;
    emailUsed?: string;
    phoneUsed?: string;
    flagReason: string;
    evidenceNotes?: string;
    status: string;
    database?: { id: string } | null;
    event?: { id: string } | null;
  }) => Promise<void>;
  submitting: boolean;
}

export const EditFlaggedModal: React.FC<EditFlaggedModalProps> = ({
  isOpen,
  onClose,
  databases,
  events,
  flag,
  onSubmit,
  submitting
}) => {
  const [nameUsed, setNameUsed] = useState('');
  const [emailUsed, setEmailUsed] = useState('');
  const [phoneUsed, setPhoneUsed] = useState('');
  const [flagReason, setFlagReason] = useState('multiple_identity');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [status, setStatus] = useState('suspected');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    if (flag) {
      setNameUsed(flag.nameUsed || '');
      setEmailUsed(flag.emailUsed || '');
      setPhoneUsed(flag.phoneUsed || '');
      setFlagReason(flag.flagReason || 'multiple_identity');
      setEvidenceNotes(flag.evidenceNotes || '');
      setStatus(flag.status || 'suspected');
      setSelectedDatabaseId(flag.database?.id?.toString() || '');
      setSelectedEventId(flag.event?.id?.toString() || '');
    }
  }, [flag]);

  if (!isOpen) return null;

  const handleSelectDatabaseChange = async (databaseIdVal: string) => {
    setSelectedDatabaseId(databaseIdVal);
    if (!databaseIdVal) return;

    const databaseObj = databases.find(c => c.id.toString() === databaseIdVal);
    if (databaseObj) {
      setNameUsed(`${databaseObj.firstName} ${databaseObj.lastName}`);
      setPhoneUsed(databaseObj.mobilePhone || '');

      try {
        const emails = await crmService.getDatabaseEmails(databaseObj.id);
        if (emails && emails.length > 0) {
          const primaryEmail = emails.find(e => e.isPrimary) || emails[0];
          setEmailUsed(primaryEmail.email);
        } else {
          setEmailUsed('');
        }
      } catch (err) {
        setEmailUsed('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPhone = phoneUsed ? normalizePhone(phoneUsed) : undefined;
    onSubmit({
      nameUsed: nameUsed.trim() || undefined,
      emailUsed: emailUsed.trim() || undefined,
      phoneUsed: formattedPhone,
      flagReason,
      evidenceNotes: evidenceNotes.trim() || undefined,
      status,
      database: selectedDatabaseId ? { id: selectedDatabaseId } : null,
      event: selectedEventId ? { id: selectedEventId } : null
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 mb-6">Edit Flagged Details</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Name Used</label>
            <input
              type="text"
              placeholder="e.g. Joseph W"
              value={nameUsed}
              onChange={(e) => setNameUsed(e.target.value)}
              className="w-full px-4 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Used</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={emailUsed}
                onChange={(e) => setEmailUsed(e.target.value)}
                className="w-full px-4 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Used</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-700 font-bold text-xs shrink-0 select-none shadow-2xs">
                  +62
                </span>
                <input
                  type="text"
                  placeholder="81934158888"
                  value={phoneUsed}
                  onChange={(e) => setPhoneUsed(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-r-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Flag Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white cursor-pointer"
              >
                <option value="suspected">Suspected</option>
                <option value="confirmed">Confirmed (Tikus)</option>
                <option value="cleared">Cleared (Legitimate)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alert Reason</label>
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full px-4 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white cursor-pointer"
              >
                <option value="multiple_identity">Multiple Identity</option>
                <option value="fake_company">Fake Company Name</option>
                <option value="no_corporate_email">No Corporate Email Address</option>
                <option value="duplicate_phone">Duplicate Phone Number</option>
                <option value="duplicate_email">Duplicate Email Address</option>
                <option value="suspicious_repeated_attendance">Repeated Attendance Warning</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Database (Optional)</label>
              <select
                value={selectedDatabaseId}
                onChange={(e) => handleSelectDatabaseChange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-[10px] focus:outline-none focus:bg-white cursor-pointer"
              >
                <option value="">-- No linked database --</option>
                {databases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} {c.company?.name ? `(${c.company.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Event (Optional)</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-[10px] focus:outline-none focus:bg-white cursor-pointer"
              >
                <option value="">-- No linked event --</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Evidence Description</label>
            <textarea
              placeholder="Explain why this profile is flagged..."
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-xs placeholder-slate-400 focus:outline-none resize-none focus:bg-white"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-blue-600/10"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
