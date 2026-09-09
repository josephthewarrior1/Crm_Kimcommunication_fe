import React from 'react';
import { X, Loader2, Building2, Users, Calendar, Mail, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Database, DatabaseEmail, EventParticipant, Company } from '../../../../lib/types';
import { checkFormCompleteness } from '../utils/validationHelper';
import { getStatusLabel, getStatusBadgeStyle } from '../../events/utils/statusHelper';
import { isPublicPersonalEmail } from '../../events/utils/notesHelper';

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

  const fullName = `${database.firstName || ''} ${database.lastName || ''}`.trim() || 'Unnamed contact';
  const initials = [database.firstName, database.lastName]
    .filter(Boolean)
    .map(name => name![0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="database-detail-title"
        className="workspace-record relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-white text-slate-900 shadow-2xl shadow-slate-950/25 animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          className="workspace-record-close absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
          type="button"
          aria-label="Close database details"
        >
          <X className="w-5 h-5" />
        </button>

        <header className="workspace-record-header relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-cyan-500/20 to-transparent" />
          <div className="absolute -right-8 -top-24 h-60 w-60 rounded-full border border-cyan-300/15" />
          <div className="relative flex items-start gap-4 pr-12 sm:gap-5">
            <div className="workspace-record-icon grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950 shadow-lg shadow-cyan-950/30 sm:h-16 sm:w-16 sm:text-xl">
              {initials || <Users className="h-8 w-8" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Database profile · #{database.id}</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="database-detail-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{fullName}</h2>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${database.isActive !== false ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {database.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {database.jobTitle || 'Role not recorded'}
                {database.company?.name ? <span className="text-slate-500"> · </span> : null}
                {database.company?.name && <span className="font-semibold text-white">{database.company.name}</span>}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{emails.length} email{emails.length === 1 ? '' : 's'}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">{events.length} event{events.length === 1 ? '' : 's'}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 capitalize">{database.databaseType || 'Type not set'}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-5 sm:p-8">
          {completeness.isIncomplete && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">Profile ini belum lengkap</h4>
                <p className="mt-1 text-xs text-amber-800">
                  Kolom kosong:{" "}
                  <span className="font-semibold">{completeness.missingFields.join(", ")}</span>
                </p>
              </div>
            </div>
          )}

          {/* SECTION A: Holding Group & Company Info */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <h4 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-900">
              <Building2 className="h-4 w-4 text-cyan-600" />
              Company & group
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h4 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-900">
              <Users className="h-4 w-4 text-cyan-600" />
              Contact information
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-900">
                <Mail className="h-4 w-4 text-cyan-600" />
                Email addresses
              </h4>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{emails.length} total</span>
            </div>
            {loadingEmails ? (
              <div className="py-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : emails.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No email addresses saved for this database profile.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {emails.map((em) => (
                  <div key={em.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="min-w-0 space-y-1">
                      <p className="break-all font-mono text-sm font-bold text-slate-900">{em.email}</p>
                      <p className="text-[10px] text-slate-500">
                        Type: <span className="capitalize">{em.emailType}</span> |{' '}
                        {em.isCorporate ? (
                          <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px]">Corporate Email</span>
                        ) : !isPublicPersonalEmail(em.email) ? (
                          <span className="text-amber-700 font-bold bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded text-[9px]" title="Domain kantor terdaftar sebagai email personal">
                            ⚠️ Personal (Domain Kantor)
                          </span>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-900">
                <Calendar className="h-4 w-4 text-cyan-600" />
                Event participation
              </h4>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{events.length} total</span>
            </div>
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

        <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-150 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
};
