import React from 'react';
import { X, Loader2, Building2, Users, Calendar, Mail, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Database, DatabaseEmail, EventParticipant, Company } from '../../../../lib/types';
import { checkFormCompleteness } from '../utils/validationHelper';
import { getStatusLabel, getStatusBadgeStyle } from '../../events/utils/statusHelper';

interface DatabaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: Database;
  emails: DatabaseEmail[];
  loadingEmails: boolean;
  events: EventParticipant[];
  loadingEvents: boolean;
  companies: Company[];
}

export const DatabaseDetailModal: React.FC<DatabaseDetailModalProps> = ({
  isOpen,
  onClose,
  database,
  emails,
  loadingEmails,
  events,
  loadingEvents,
  companies
}) => {
  if (!isOpen) return null;

  const completeness = checkFormCompleteness(
    database.salutation || '',
    database.firstName || '',
    database.lastName || '',
    database.positionLevel || '',
    database.jobTitle || '',
    database.mobilePhone || '',
    emails.find(e => e.isCorporate || e.emailType === 'company')?.email || '',
    emails.find(e => !e.isCorporate && e.emailType === 'personal')?.email || '',
    database.linkedinUrl || '',
    database.company?.id?.toString() || '',
    companies
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Database Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">Comprehensive end-to-end data mapped from Database Template columns.</p>
          </div>
        </div>

        <div className="space-y-6">
          {completeness.isIncomplete && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-red-800">Semua kolom wajib diisi kecuali Division, Database Type, dan Data Source</h4>
                <p className="text-xs text-red-600 mt-1">
                  Kolom kosong:{" "}
                  <span className="font-semibold">{completeness.missingFields.join(", ")}</span>
                </p>
              </div>
            </div>
          )}

          {/* SECTION A: Holding Group & Company Info */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-slate-500" />
              Holding Group & Corporate Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Holding Group Name</span>
                <span className="font-bold text-slate-800">{database.company?.group?.name || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Holding Group Notes</span>
                <span className="text-slate-600 truncate block max-w-xs" title={database.company?.group?.notes}>
                  {database.company?.group?.notes || '-'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Name</span>
                <span className="font-bold text-slate-800">{database.company?.name || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Brand</span>
                <span className="font-medium text-slate-700">{database.company?.brandName || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Industry</span>
                <span className="font-medium text-slate-700">{database.company?.industry || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">City</span>
                <span className="font-medium text-slate-700">{database.company?.city || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Postal Code</span>
                <span className="font-medium text-slate-700">{database.company?.postalCode || '-'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</span>
                <span className="text-slate-600 block">{database.company?.address || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Office Phone</span>
                <span className="font-mono text-slate-700">{database.company?.officePhone || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Website URL</span>
                {database.company?.website ? (
                  <a
                    href={database.company.website.startsWith('http') ? database.company.website : `https://${database.company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1"
                  >
                    {database.company.website}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-slate-600">-</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Size (Revenue)</span>
                <span className="font-medium text-slate-700">{database.company?.companySizeRevenue || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Size (Employees)</span>
                <span className="font-medium text-slate-700">{database.company?.companySizeEmployee || '-'}</span>
              </div>
              <div className="md:col-span-3">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Hardware Infrastructure (Details)</span>
                <span className="text-slate-600 whitespace-pre-wrap block mt-0.5">{database.company?.companyHardware || '-'}</span>
              </div>
            </div>
          </div>

          {/* SECTION B: Database & Personal Info */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-500" />
              Database Profile details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Salutation</span>
                <span className="font-medium text-slate-700">{database.salutation || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">First Name</span>
                <span className="font-bold text-slate-800">{database.firstName}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Name</span>
                <span className="font-bold text-slate-800">{database.lastName}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Job Title</span>
                <span className="font-bold text-slate-800">{database.jobTitle || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Position Level</span>
                <span className="font-medium text-slate-700">{database.positionLevel || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Division</span>
                <span className="font-medium text-slate-700">{database.specialityDivision || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Phone</span>
                <span className="font-mono text-slate-700">{database.mobilePhone || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">LinkedIn URL</span>
                {database.linkedinUrl ? (
                  <a
                    href={database.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1"
                  >
                    LinkedIn Link
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-slate-600">-</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Status / Opt-out</span>
                <span className="inline-flex mt-1">
                  {database.isActive !== false ? (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-100 rounded-md flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Database Type</span>
                <span className="font-medium text-slate-750 capitalize">{database.databaseType || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Source</span>
                <span className="font-medium text-slate-750 capitalize">{database.source?.replace(/_/g, ' ') || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Created Date</span>
                <span className="text-slate-500">
                  {database.createdAt ? new Date(database.createdAt).toLocaleString() : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION C: Email List */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-slate-500" />
              Email Addresses (Excel split: Corporate & Personal)
            </h4>
            {loadingEmails ? (
              <div className="py-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : emails.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No email addresses saved for this database profile.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {emails.map((em) => (
                  <div key={em.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 font-mono">{em.email}</p>
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
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100 rounded-lg">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION D: Event Participation History */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-slate-500" />
              Event Participation History
            </h4>
            {loadingEvents ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No event participation history recorded for this database.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-550 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Event Name</th>
                      <th className="py-2.5 px-3">Client / Partner</th>
                      <th className="py-2.5 px-3">Event Dates</th>
                      <th className="py-2.5 px-3">Participant Status</th>
                      <th className="py-2.5 px-3">Hari H Status</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {events.map((p) => {
                      const statusColors: Record<string, string> = {
                        white: 'bg-slate-100 border-slate-250 text-slate-700',
                        yellow: 'bg-amber-55/70 border-amber-200 text-amber-700',
                        green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                        red: 'bg-rose-50 border-rose-200 text-rose-700',
                      };

                      const hariHColors: Record<string, string> = {
                        on_location: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                        on_the_way: 'bg-blue-50 border-blue-200 text-blue-700',
                        not_respon_yet: 'bg-slate-100 border-slate-200 text-slate-700',
                        unable_to_attend: 'bg-red-50 border-red-200 text-red-700',
                      };

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{p.event.name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{p.event.eventType} Event</span>
                          </td>
                          <td className="py-3 px-3 font-medium">
                            {p.event.clientName || '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {p.event.dateStart ? (
                              <>
                                <span>{new Date(p.event.dateStart).toLocaleDateString()}</span>
                                {p.event.dateEnd && p.event.dateEnd !== p.event.dateStart && (
                                  <span className="block text-[10px] text-slate-400">
                                    to {new Date(p.event.dateEnd).toLocaleDateString()}
                                  </span>
                                )}
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 font-bold rounded border text-[9px] uppercase ${getStatusBadgeStyle(p.participantStatus)}`}>
                              {getStatusLabel(p.participantStatus)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 font-bold rounded border uppercase text-[9px] capitalize ${hariHColors[p.reminderHariH || 'not_respon_yet'] || 'bg-slate-100 border-slate-250 text-slate-700'}`}>
                              {(p.reminderHariH || 'not_respon_yet').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-[200px] truncate" title={p.notes}>
                            {p.notes || <span className="text-slate-400 italic">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-8 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-150 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
