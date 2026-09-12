import React from 'react';
import { X, UserX, Building2, Phone, Mail, Calendar, AlertTriangle, ExternalLink, ShieldAlert, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { FlaggedIdentity, Database, DatabaseEmail, EventParticipant } from '../../../../lib/types';
import { getStatusBadgeStyle, getStatusLabel } from '../../events/utils/statusHelper';

interface FlaggedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  flag: FlaggedIdentity | null;
  database: Database | null;
  emails: DatabaseEmail[];
  events: EventParticipant[];
  loadingDetails: boolean;
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
  onEdit
}) => {
  if (!isOpen || !flag) return null;

  const getRiskBadge = (st: string) => {
    switch (st) {
      case 'confirmed':
        return 'bg-red-50 border border-red-200 text-red-700';
      case 'suspected':
        return 'bg-amber-50 border border-amber-200 text-amber-700';
      case 'cleared':
        return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
      default:
        return 'bg-slate-100 border border-slate-200 text-slate-600';
    }
  };

  const displayName = flag.nameUsed || (database ? `${database.firstName || ''} ${database.lastName || ''}`.trim() : 'Unknown Name');
  const phone = flag.phoneUsed || database?.mobilePhone || '-';
  const cleanPhoneDigits = phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits.startsWith('0') ? '62' + cleanPhoneDigits.slice(1) : cleanPhoneDigits}` : null;

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-3xl">
        {/* Modal Header */}
        <div className="ms-modal-header flex items-start gap-3 pr-14">
        <button
          onClick={onClose}
          className="ms-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg shrink-0 mt-0.5">
            <UserX className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="ms-modal-title break-words">{displayName}</h3>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getRiskBadge(flag.status)}`}>
                {flag.status === 'confirmed' ? 'Confirmed (Tikus)' : flag.status}
              </span>
            </div>
            <p className="ms-modal-description">
              Flagged identity profile audit details & linked CRM records.
            </p>
          </div>
        </div>

        <div className="ms-modal-body space-y-5">
          {/* Alert & Evidence Card */}
          <div className="p-4 bg-red-50/60 border border-red-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
              <span>Reason: {flag.flagReason?.replace(/_/g, ' ') || 'Suspicious Activity'}</span>
            </div>
            {flag.evidenceNotes ? (
              <p className="text-xs text-red-900/90 italic bg-white/80 border border-red-200/80 p-3 rounded-md whitespace-pre-line leading-relaxed">
                "{flag.evidenceNotes}"
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">No additional evidence notes provided.</p>
            )}
          </div>

          {/* Profile & Contact Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Details */}
            <div className="ms-modal-section p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 normal-case tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Contact Information
              </h4>
              
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Phone Number</span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-semibold text-slate-800 font-mono">{phone}</span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                      >
                        WhatsApp <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block">Email Used</span>
                  <span className="break-all font-semibold text-slate-800 font-mono mt-0.5 block">{flag.emailUsed || database?.emails?.[0]?.email || '-'}</span>
                </div>

                {flag.nameUsed && (
                  <div>
                    <span className="text-slate-400 font-medium block">Name Used</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{flag.nameUsed}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Company & Database Record */}
            <div className="ms-modal-section p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 normal-case tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Linked CRM Profile
              </h4>

              {database ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Full Name</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {database.salutation ? `${database.salutation} ` : ''}{database.firstName} {database.lastName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Company & Title</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {database.company?.name || 'No Company'} {database.jobTitle ? `• ${database.jobTitle}` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Database ID / Type</span>
                    <span className="font-mono text-slate-700 mt-0.5 block">
                      ID: #{database.id} • Type: {database.databaseType || 'unknown'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-400 italic">No direct linked database profile found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Associated Event (if any) */}
          {flag.event && (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-2">
              <h4 className="text-xs font-semibold text-blue-800 normal-case tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Associated Event
              </h4>
              <div className="text-xs text-blue-950 font-semibold">
                {flag.event.name}
              </div>
            </div>
          )}

          {/* Linked Database Emails List */}
          {database && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 normal-case tracking-wider">
                Registered Emails ({emails.length})
              </h4>
              {loadingDetails ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : emails.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No registered email list.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {emails.map((e) => (
                    <div key={e.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs flex items-center justify-between">
                      <span className="font-mono text-slate-800 font-semibold truncate">{e.email}</span>
                      <span className="text-[9px] font-semibold text-slate-500 normal-case px-1.5 py-0.5 bg-slate-200 rounded-md">
                        {e.emailType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Event Participation History */}
          {database && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 normal-case tracking-wider">
                Event Participation History ({events.length})
              </h4>
              {loadingDetails ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No event participation history found.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((ep) => (
                    <div key={ep.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h5 className="font-semibold text-slate-900">{ep.event?.name || `Event #${ep.event?.id}`}</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Attendance: <span className="font-semibold text-slate-700">{ep.attendanceStatus}</span>
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${getStatusBadgeStyle(ep.participantStatus)}`}>
                        {getStatusLabel(ep.participantStatus)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="ms-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="ms-modal-secondary"
          >
            Close
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(flag);
              }}
              className="ms-modal-danger"
            >
              Edit Flagged Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
