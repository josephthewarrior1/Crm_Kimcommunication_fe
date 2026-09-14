import React, { useRef } from 'react';
import { Building2, Phone, Mail, CalendarDays, AlertCircle, ExternalLink, ShieldAlert, FileText, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../../components/ui/dialog';
import { FlaggedIdentity, Database, DatabaseEmail, EventParticipant } from '../../../../lib/types';
import { getStatusLabel } from '../../events/utils/statusHelper';

interface FlaggedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  flag: FlaggedIdentity | null;
  database: Database | null;
  emails: DatabaseEmail[];
  events: EventParticipant[];
  loadingDetails: boolean;
  detailError?: string;
  onRetryDetails?: () => void;
  onEdit?: (flag: FlaggedIdentity) => void;
}

export const FlaggedDetailModal: React.FC<FlaggedDetailModalProps> = ({
  isOpen,
  onClose,
  flag,
  database,
  emails,
  events,
  loadingDetails,
  detailError,
  onRetryDetails,
  onEdit
}) => {
  const openerRef = useRef<HTMLElement | null>(null);
  if (!isOpen || !flag) return null;

  const riskStyle = flag.status === 'confirmed'
    ? 'border-red-200 bg-red-50 text-red-700'
    : flag.status === 'suspected'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : flag.status === 'cleared'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';
  const displayName = flag.nameUsed || (database ? `${database.firstName || ''} ${database.lastName || ''}`.trim() : '') || 'Unnamed identity';
  const phone = flag.phoneUsed || database?.mobilePhone || 'Not provided';
  const cleanPhoneDigits = phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits.startsWith('0') ? '62' + cleanPhoneDigits.slice(1) : cleanPhoneDigits}` : null;

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-4xl"
        onOpenAutoFocus={() => { openerRef.current = document.activeElement as HTMLElement | null; }}
        onCloseAutoFocus={event => { event.preventDefault(); openerRef.current?.focus(); }}
      >
        <div aria-hidden="true" className="h-1.5 shrink-0 bg-blue-600" />
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldAlert aria-hidden="true" className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 pr-8 text-xs font-medium text-slate-500">Flagged identities / Identity details</p>
              <DialogTitle>{displayName}</DialogTitle>
              <DialogDescription>Review the flag, supporting notes, and linked CRM activity.</DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${riskStyle}`}>{flag.status}</span>
                <span className="text-xs text-slate-500">Record #{flag.id}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-100 p-4 sm:p-6">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-4">
              <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">Reason for review</h4>
                <p className="mt-1 text-sm capitalize text-slate-600">{flag.flagReason?.replace(/_/g, ' ') || 'Not specified'}</p>
              </div>
            </div>
            <div className="px-4 py-4">
              <p className="mb-2 text-xs font-semibold text-slate-500">Supporting notes</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{flag.evidenceNotes || 'No supporting notes added.'}</p>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Phone aria-hidden="true" className="h-4 w-4 text-slate-500" /> Contact information
              </h4>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="mb-1 text-xs text-slate-500">Name used</dt>
                  <dd className="break-words font-medium text-slate-900">{flag.nameUsed || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs text-slate-500">Phone number</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-medium text-slate-900">{phone}</span>
                    {waUrl && <a href={waUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">WhatsApp <ExternalLink aria-hidden="true" className="h-3 w-3" /></a>}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs text-slate-500">Email used</dt>
                  <dd className="break-all font-medium text-slate-900">{flag.emailUsed || database?.emails?.[0]?.email || 'Not provided'}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building2 aria-hidden="true" className="h-4 w-4 text-slate-500" /> Linked CRM profile
              </h4>
              {loadingDetails ? (
                <div className="flex items-center gap-2 py-5 text-sm text-slate-500" role="status"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading linked profile...</div>
              ) : detailError ? (
                <p className="py-5 text-sm text-slate-500">Linked profile information is unavailable.</p>
              ) : database ? (
                <dl className="space-y-4 text-sm">
                  <div><dt className="mb-1 text-xs text-slate-500">Full name</dt><dd className="break-words font-medium text-slate-900">{database.salutation ? `${database.salutation} ` : ''}{database.firstName} {database.lastName}</dd></div>
                  <div><dt className="mb-1 text-xs text-slate-500">Company and position</dt><dd className="break-words font-medium text-slate-900">{database.company?.name || 'No company linked'}{database.jobTitle && <span className="mt-1 block font-normal text-slate-600">{database.jobTitle}</span>}</dd></div>
                  <div><dt className="mb-1 text-xs text-slate-500">Database record</dt><dd className="text-slate-700">#{database.id}<span className="ml-2 capitalize">{database.databaseType || 'Type not specified'}</span></dd></div>
                </dl>
              ) : (
                <p className="py-5 text-sm leading-6 text-slate-500">This identity is not linked to a CRM profile.</p>
              )}
            </section>
          </div>

          {flag.event && (
            <section className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0"><h4 className="text-xs font-medium text-blue-700">Linked event</h4><p className="mt-1 break-words text-sm font-semibold text-slate-900">{flag.event.name}</p></div>
            </section>
          )}

          {detailError && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
              <p className="min-w-0 flex-1 text-sm text-amber-900">{detailError}</p>
              {onRetryDetails && <button type="button" onClick={onRetryDetails} className="inline-flex items-center gap-2 rounded border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><RefreshCw aria-hidden="true" className="h-4 w-4" /> Try again</button>}
            </div>
          )}

          {database && !loadingDetails && !detailError && (
            <>
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <h4 className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"><Mail aria-hidden="true" className="h-4 w-4 text-slate-500" /> Registered emails <span className="ml-auto text-xs font-medium text-slate-500">{emails.length}</span></h4>
                {emails.length === 0 ? <p className="px-4 py-5 text-sm text-slate-500">No emails registered for this CRM profile.</p> : (
                  <ul className="divide-y divide-slate-200">
                    {emails.map(email => <li key={email.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><span className="min-w-0 break-all text-sm text-slate-900">{email.email}</span><span className="rounded bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">{email.emailType}</span></li>)}
                  </ul>
                )}
              </section>

              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <h4 className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"><CalendarDays aria-hidden="true" className="h-4 w-4 text-slate-500" /> Event participation <span className="ml-auto text-xs font-medium text-slate-500">{events.length}</span></h4>
                {events.length === 0 ? <p className="px-4 py-5 text-sm text-slate-500">No event participation recorded for this profile.</p> : (
                  <ul className="divide-y divide-slate-200">
                    {events.map(participant => (
                      <li key={participant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                        <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{participant.event?.name || `Event #${participant.event?.id}`}</p><p className="mt-1 text-xs text-slate-500">Attendance: <span className="capitalize text-slate-700">{participant.attendanceStatus?.replace(/_/g, ' ') || 'Not specified'}</span></p></div>
                        <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">{getStatusLabel(participant.participantStatus)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="ms-modal-footer">
          <button type="button" onClick={onClose} className="ms-modal-secondary">Close</button>
          {onEdit && <button type="button" onClick={() => { onClose(); onEdit(flag); }} className="ms-modal-primary"><Pencil aria-hidden="true" className="h-4 w-4" /> Edit details</button>}
        </footer>
      </DialogContent>
    </Dialog>
  );
};
