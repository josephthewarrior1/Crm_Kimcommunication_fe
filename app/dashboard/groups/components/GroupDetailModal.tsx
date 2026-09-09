import React from 'react';
import { X, FolderTree, Building2, MapPin, Globe, ExternalLink, Layers3 } from 'lucide-react';
import { Group, Company } from '../../../../lib/types';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  companies: Company[];
  onGoToCompanyDetails: (companyName: string) => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  isOpen,
  onClose,
  group,
  companies,
  onGoToCompanyDetails
}) => {
  if (!isOpen) return null;

  const groupCompanies = companies.filter(company => company.group?.id === group.id);
  const withLocation = groupCompanies.filter(company => company.city).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-detail-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-slate-950/25 animate-in zoom-in-95 duration-200"
      >
        <header className="relative shrink-0 overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="absolute inset-y-0 right-0 w-2/5 bg-gradient-to-l from-indigo-500/25 to-transparent" />
          <div className="absolute -right-10 -top-20 h-52 w-52 rounded-full border border-indigo-300/15" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            type="button"
            aria-label="Close group details"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative flex items-start gap-4 pr-12 sm:gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-950/30 sm:h-16 sm:w-16">
              <FolderTree className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">Holding group</p>
              <h2 id="group-detail-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {group.name}
              </h2>
              <p className="mt-2 text-sm text-slate-400">Group ID #{group.id}</p>
            </div>
          </div>
        </header>

        <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-slate-50 sm:grid-cols-3">
          <div className="border-r border-slate-200 px-5 py-4 sm:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Companies</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{groupCompanies.length}</p>
          </div>
          <div className="px-5 py-4 sm:border-r sm:border-slate-200 sm:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">With location</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{withLocation}</p>
          </div>
          <div className="col-span-2 border-t border-slate-200 px-5 py-4 sm:col-span-1 sm:border-t-0 sm:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Last updated</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {group.updatedAt ? new Date(group.updatedAt).toLocaleDateString() : 'Not recorded'}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2 text-slate-900">
                <Layers3 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-[0.14em]">Group notes</h3>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {group.notes || <span className="italic text-slate-400">No description has been added.</span>}
              </p>
            </aside>

            <div>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Portfolio</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">Companies in this group</h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{groupCompanies.length} total</span>
              </div>

              {groupCompanies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <Building2 className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No company is linked to this group.</p>
                  <p className="mt-1 text-xs text-slate-400">Assign a company to make it appear here.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {groupCompanies.map((company, index) => (
                    <article
                      key={company.id}
                      className={`group flex flex-col gap-4 p-4 transition hover:bg-indigo-50/40 sm:flex-row sm:items-center sm:justify-between ${index ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-indigo-100 group-hover:text-indigo-700">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-950">{company.name}</h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {company.brandName && <span className="font-semibold text-indigo-700">{company.brandName}</span>}
                            {company.city && (
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{company.city}</span>
                            )}
                            {company.website && (
                              <a
                                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={event => event.stopPropagation()}
                                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                              >
                                <Globe className="h-3.5 w-3.5" />Website
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onGoToCompanyDetails(company.name)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        type="button"
                      >
                        Company detail <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
