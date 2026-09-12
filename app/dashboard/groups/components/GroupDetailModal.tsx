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
    <div className="ms-modal-overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-detail-title"
        className="ms-modal w-full max-w-4xl"
      >
        <header className="ms-modal-header">
          <button
            onClick={onClose}
            className="ms-modal-close"
            type="button"
            aria-label="Close group details"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-blue-50 text-base font-semibold text-blue-600">
              <FolderTree className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium text-slate-500">Holding group</p>
              <h2 id="group-detail-title" className="ms-modal-title break-words">
                {group.name}
              </h2>
              <p className="ms-modal-description">Group ID #{group.id}</p>
            </div>
          </div>
        </header>

        <div className="ms-modal-body space-y-5">
        <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-slate-50 sm:grid-cols-3">
          <div className="border-r border-slate-200 px-5 py-4 sm:px-8">
            <p className="text-[10px] font-semibold normal-case tracking-normal text-slate-400">Companies</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{groupCompanies.length}</p>
          </div>
          <div className="px-5 py-4 sm:border-r sm:border-slate-200 sm:px-8">
            <p className="text-[10px] font-semibold normal-case tracking-normal text-slate-400">With location</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{withLocation}</p>
          </div>
          <div className="col-span-2 border-t border-slate-200 px-5 py-4 sm:col-span-1 sm:border-t-0 sm:px-8">
            <p className="text-[10px] font-semibold normal-case tracking-normal text-slate-400">Last updated</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {group.updatedAt ? new Date(group.updatedAt).toLocaleDateString() : 'Not recorded'}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <aside className="ms-modal-section h-fit p-4">
              <div className="mb-4 flex items-center gap-2 text-slate-900">
                <Layers3 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-semibold normal-case tracking-normal">Group notes</h3>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {group.notes || <span className="italic text-slate-400">No description has been added.</span>}
              </p>
            </aside>

            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold normal-case tracking-normal text-indigo-600">Portfolio</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">Companies in this group</h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{groupCompanies.length} total</span>
              </div>

              {groupCompanies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <Building2 className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No company is linked to this group.</p>
                  <p className="mt-1 text-xs text-slate-400">Assign a company to make it appear here.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {groupCompanies.map((company, index) => (
                    <article
                      key={company.id}
                      className={`group flex flex-col gap-4 p-4 transition hover:bg-indigo-50/40 sm:flex-row sm:items-center sm:justify-between ${index ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500 transition group-hover:bg-indigo-100 group-hover:text-indigo-700">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-950">{company.name}</h4>
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
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
        </div>
      </section>
    </div>
  );
};
