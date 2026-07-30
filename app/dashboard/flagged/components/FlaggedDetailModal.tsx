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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl shrink-0 mt-0.5">
            <UserX className="w-6 h-6" />
          </div>
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl font-extrabold text-slate-900">{displayName}</h3>
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${getRiskBadge(flag.status)}`}>
                {flag.status === 'confirmed' ? 'Confirmed (Tikus)' : flag.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Flagged identity profile audit details & linked CRM records.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Alert & Evidence Card */}
          <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-red-800 font-extrabold text-sm">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
              <span>Reason: {flag.flagReason?.replace(/_/g, ' ') || 'Suspicious Activity'}</span>
            </div>
            {flag.evidenceNotes ? (
              <p className="text-xs text-red-900/90 italic bg-white/80 border border-red-200/80 p-3 rounded-xl whitespace-pre-line leading-relaxed">
                "{flag.evidenceNotes}"
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">No additional evidence notes provided.</p>
            )}
          </div>

          {/* Profile & Contact Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Contact Information
              </h4>
              
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Phone Number</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-slate-800 font-mono">{phone}</span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors"
                      >
                        WhatsApp <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block">Email Used</span>
                  <span className="font-bold text-slate-800 font-mono mt-0.5 block">{flag.emailUsed || database?.emails?.[0]?.email || '-'}</span>
                </div>

                {flag.nameUsed && (
                  <div>
                    <span className="text-slate-400 font-medium block">Name Used</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{flag.nameUsed}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Company & Database Record */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Linked CRM Profile
              </h4>

              {database ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Full Name</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
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
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
              <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Associated Event
              </h4>
              <div className="text-xs text-blue-950 font-bold">
                {flag.event.name}
              </div>
            </div>
          )}

          {/* Linked Database Emails List */}
          {database && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
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
                    <div key={e.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                      <span className="font-mono text-slate-800 font-semibold truncate">{e.email}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-200 rounded-md">
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
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
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
                    <div key={ep.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3">
                      <div>
                        <h5 className="font-bold text-slate-900">{ep.event?.name || `Event #${ep.event?.id}`}</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Attendance: <span className="font-semibold text-slate-700">{ep.attendanceStatus}</span>
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase ${getStatusBadgeStyle(ep.participantStatus)}`}>
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
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
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
              className="px-4 py-2 bg-red-600 hover:bg-red-550 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/10 transition-colors"
            >
              Edit Flagged Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
