import React from 'react';
import { X, Building2, Users, Globe, Phone, MapPin, ExternalLink, Server, Landmark, BriefcaseBusiness } from 'lucide-react';
import { Company, Database } from '../../../../lib/types';
import { formatCompanyName } from '../../../../lib/utils/companyName';

interface CompanyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  databases: Database[];
  onGoToEmployeeDetails: (fullName: string) => void;
}

const DataPoint = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
    <div className="mt-1.5 text-sm font-semibold leading-5 text-slate-800">{children || '-'}</div>
  </div>
);

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  isOpen,
  onClose,
  company,
  databases,
  onGoToEmployeeDetails
}) => {
  if (!isOpen) return null;

  const contacts = databases.filter(database => database.company?.id === company.id && database.isActive);
  const initials = (company.brandName || company.name)
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-detail-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-slate-950/25 animate-in zoom-in-95 duration-200"
      >
        <header className="relative shrink-0 overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-500/25 to-transparent" />
          <div className="absolute -right-8 -top-24 h-60 w-60 rounded-full border border-blue-300/15" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            title="Close"
            type="button"
            aria-label="Close company details"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative flex items-start gap-4 pr-12 sm:gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-500 text-lg font-black tracking-tight shadow-lg shadow-blue-950/30 sm:h-16 sm:w-16 sm:text-xl">
              {initials || <Building2 className="h-8 w-8" />}
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-blue-300">Company record</p>
              <h2 id="company-detail-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {formatCompanyName(company.name)}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                {company.brandName && <span className="font-semibold text-white">{company.brandName}</span>}
                {company.brandName && company.industry && <span className="text-slate-600">/</span>}
                {company.industry && <span>{company.industry}</span>}
              </div>
            </div>
          </div>
        </header>

        <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-slate-50 sm:grid-cols-4">
          <div className="border-r border-slate-200 px-5 py-4 sm:px-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Active contacts</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{contacts.length}</p>
          </div>
          <div className="px-5 py-4 sm:border-r sm:border-slate-200 sm:px-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Holding group</p>
            <p className="mt-1 truncate text-sm font-bold text-slate-800">{company.group?.name || 'Independent'}</p>
          </div>
          <div className="border-r border-t border-slate-200 px-5 py-4 sm:border-t-0 sm:px-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Location</p>
            <p className="mt-1 truncate text-sm font-bold text-slate-800">{company.city || 'Not recorded'}</p>
          </div>
          <div className="border-t border-slate-200 px-5 py-4 sm:border-t-0 sm:px-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Company ID</p>
            <p className="mt-1 text-sm font-bold text-slate-800">#{company.id}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900">Company profile</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                <DataPoint label="Brand">{company.brandName || '-'}</DataPoint>
                <DataPoint label="Industry">{company.industry || '-'}</DataPoint>
                <DataPoint label="Employee size">{company.companySizeEmployee || '-'}</DataPoint>
                <DataPoint label="Revenue size">{company.companySizeRevenue || '-'}</DataPoint>
                <div className="col-span-2">
                  <DataPoint label="Address">
                    <span className="inline-flex gap-2 font-medium text-slate-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {company.address || company.city || '-'}{company.postalCode ? `, ${company.postalCode}` : ''}
                    </span>
                  </DataPoint>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900">Contact channels</h3>
              </div>
              <div className="space-y-5">
                <DataPoint label="Official website">
                  {company.website ? (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 break-all text-blue-600 hover:underline"
                    >
                      {company.website}<ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : '-'}
                </DataPoint>
                <DataPoint label="Office telephone">
                  <span className="inline-flex items-center gap-2 font-mono">
                    <Phone className="h-4 w-4 text-slate-400" />{company.officePhone || '-'}
                  </span>
                </DataPoint>
                <DataPoint label="Holding group">
                  <span className="inline-flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4 text-slate-400" />{company.group?.name || 'Independent'}
                  </span>
                </DataPoint>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white sm:p-6 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-200">Infrastructure & hardware</h3>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {company.companyHardware || <span className="italic text-slate-500">No infrastructure details recorded.</span>}
              </p>
            </article>
          </div>

          <div className="mt-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">People</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">Active contacts</h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{contacts.length} people</span>
            </div>

            {contacts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <Users className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No active contact is linked to this company.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                      <tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Mobile phone</th><th className="px-4 py-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {contacts.map(database => {
                        const fullName = `${database.firstName} ${database.lastName}`.trim();
                        return (
                          <tr key={database.id} className="transition hover:bg-blue-50/40">
                            <td className="px-4 py-3.5"><p className="font-bold text-slate-900">{fullName}</p><p className="mt-0.5 text-xs text-slate-400">Database #{database.id}</p></td>
                            <td className="px-4 py-3.5"><p className="font-semibold text-slate-700">{database.jobTitle || '-'}</p><p className="mt-0.5 text-xs capitalize text-slate-400">{database.positionLevel || 'Level not set'}</p></td>
                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{database.mobilePhone || '-'}</td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => onGoToEmployeeDetails(fullName)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                type="button"
                              >
                                View <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
