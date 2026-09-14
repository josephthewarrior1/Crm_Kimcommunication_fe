import React, { useRef, useState } from 'react';
import { ShieldAlert, User, FileText, Link2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../components/ui/dialog';
import { Database, Event } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { normalizePhone } from '../../database/utils/phoneHelper';

interface AddFlaggedModalProps {
  isOpen: boolean;
  onClose: () => void;
  databases: Database[];
  events: Event[];
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

export const AddFlaggedModal: React.FC<AddFlaggedModalProps> = ({
  isOpen,
  onClose,
  databases,
  events,
  onSubmit,
  submitting
}) => {
  const openerRef = useRef<HTMLElement | null>(null);
  const [nameUsed, setNameUsed] = useState('');
  const [emailUsed, setEmailUsed] = useState('');
  const [phoneUsed, setPhoneUsed] = useState('');
  const [flagReason, setFlagReason] = useState('multiple_identity');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [status, setStatus] = useState('suspected');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

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
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !submitting) onClose(); }}>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={event => event.preventDefault()}
        onOpenAutoFocus={() => { openerRef.current = document.activeElement as HTMLElement | null; }}
        onCloseAutoFocus={event => { event.preventDefault(); openerRef.current?.focus(); }}
      >
        <div aria-hidden="true" className="h-1.5 shrink-0 bg-blue-600" />
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><ShieldAlert aria-hidden="true" className="h-5 w-5" /></span>
            <div className="min-w-0">
              <DialogTitle>Flag an identity</DialogTitle>
              <DialogDescription>Record the identity and supporting information for your team to review.</DialogDescription>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="ms-modal-form">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-white p-4 sm:p-6">
            <fieldset className="min-w-0 space-y-4">
              <legend className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><User aria-hidden="true" className="h-4 w-4 text-slate-500" /> Identity information</legend>
              <div>
                <label htmlFor="add-flagged-name" className="mb-1.5 block text-sm font-medium text-slate-700">Name used</label>
                <input id="add-flagged-name" type="text" placeholder="Enter the name used" value={nameUsed} onChange={event => setNameUsed(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-flagged-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email used</label>
                  <input id="add-flagged-email" type="email" placeholder="email@example.com" value={emailUsed} onChange={event => setEmailUsed(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label htmlFor="add-flagged-phone" className="mb-1.5 block text-sm font-medium text-slate-700">Phone used</label>
                  <input id="add-flagged-phone" type="tel" placeholder="0812 3456 7890" value={phoneUsed} onChange={event => setPhoneUsed(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
            </fieldset>

            <fieldset className="min-w-0 space-y-4 border-t border-slate-200 pt-5">
              <legend className="float-left mb-4 flex w-full items-center gap-2 text-sm font-semibold text-slate-900"><FileText aria-hidden="true" className="h-4 w-4 text-slate-500" /> Review details</legend>
              <div className="clear-both grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-flagged-status" className="mb-1.5 block text-sm font-medium text-slate-700">Flag status</label>
                  <select id="add-flagged-status" value={status} onChange={event => setStatus(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    <option value="suspected">Suspected</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cleared">Cleared</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="add-flagged-reason" className="mb-1.5 block text-sm font-medium text-slate-700">Reason</label>
                  <select id="add-flagged-reason" value={flagReason} onChange={event => setFlagReason(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    <option value="multiple_identity">Multiple Identity</option>
                    <option value="fake_company">Fake Company Name</option>
                    <option value="no_corporate_email">No Corporate Email Address</option>
                    <option value="duplicate_phone">Duplicate Phone Number</option>
                    <option value="duplicate_email">Duplicate Email Address</option>
                    <option value="suspicious_repeated_attendance">Repeated Attendance Warning</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="add-flagged-notes" className="mb-1.5 block text-sm font-medium text-slate-700">Supporting notes</label>
                <textarea id="add-flagged-notes" placeholder="Describe what needs review and any supporting evidence..." value={evidenceNotes} onChange={event => setEvidenceNotes(event.target.value)} rows={4} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 resize-y" />
              </div>
            </fieldset>

            <fieldset className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <legend className="float-left mb-1 flex w-full items-center gap-2 text-sm font-semibold text-slate-900"><Link2 aria-hidden="true" className="h-4 w-4 text-slate-500" /> Linked records <span className="font-normal text-slate-500">Optional</span></legend>
              <p id="add-flagged-database-hint" className="clear-both mb-4 text-xs leading-5 text-slate-500">Selecting a CRM profile fills in its contact information.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-flagged-database" className="mb-1.5 block text-sm font-medium text-slate-700">CRM profile</label>
                  <select id="add-flagged-database" aria-describedby="add-flagged-database-hint" value={selectedDatabaseId} onChange={event => handleSelectDatabaseChange(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    <option value="">No linked profile</option>
                    {databases.map(database => <option key={database.id} value={database.id}>{database.firstName} {database.lastName} {database.company?.name ? `(${database.company.name})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="add-flagged-event" className="mb-1.5 block text-sm font-medium text-slate-700">Event</label>
                  <select id="add-flagged-event" value={selectedEventId} onChange={event => setSelectedEventId(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                    <option value="">No linked event</option>
                    {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>
          </div>
          <footer className="ms-modal-footer">
            <button type="button" onClick={onClose} disabled={submitting} className="ms-modal-secondary disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="ms-modal-primary disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ShieldAlert aria-hidden="true" className="h-4 w-4" />}
              {submitting ? 'Saving...' : 'Flag identity'}
            </button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
};
