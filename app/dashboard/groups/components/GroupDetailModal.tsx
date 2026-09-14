import React, { useRef } from 'react';
import { ArrowRight, Building2, CalendarDays, FileText, FolderTree, Globe, Hash, Loader2, MapPin } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../../../../components/ui/dialog';
import { Group, Company } from '../../../../lib/types';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  companies: Company[];
  loading?: boolean;
  error?: boolean;
  onGoToCompanyDetails: (companyName: string) => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  isOpen,
  onClose,
  group,
  companies,
  loading = false,
  error = false,
  onGoToCompanyDetails,
}) => {
  const openerRef = useRef<HTMLElement | null>(null);
  const groupCompanies = companies.filter(company => company.group?.id === group.id);
  const companyCount = group.companyCount ?? (loading || error ? null : groupCompanies.length);

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-4xl"
        onOpenAutoFocus={() => { openerRef.current = document.activeElement as HTMLElement | null; }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          openerRef.current?.focus();
        }}
      >
        <div aria-hidden="true" className="h-1.5 shrink-0 bg-blue-600" />
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 sm:h-12 sm:w-12">
              <FolderTree aria-hidden="true" className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 pr-8 text-xs font-medium text-slate-500">Groups / Group details</p>
              <DialogTitle>{group.name}</DialogTitle>
              <DialogDescription>Company portfolio and notes for this holding group.</DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  <Building2 aria-hidden="true" className="h-3.5 w-3.5" />
                  {companyCount === null ? 'Companies' : `${companyCount.toLocaleString()} ${companyCount === 1 ? 'company' : 'companies'}`}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Holding group</span>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-100 p-4 sm:p-6">
          <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
            <section aria-labelledby="group-companies-title" className="min-w-0">
              <div className="mb-4">
                <h3 id="group-companies-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Building2 aria-hidden="true" className="h-4 w-4 text-slate-500" />Linked companies
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">Open a company to explore its record.</p>
              </div>

              {loading ? (
                <div role="status" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-12 text-sm text-slate-500">
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-blue-600" />Loading companies...
                </div>
              ) : error ? (
                <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-900">Companies could not be loaded</p>
                  <p className="mt-2 text-xs leading-5 text-amber-800">Close and reopen this group to try again.</p>
                </div>
              ) : groupCompanies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
                  <p className="text-sm font-semibold text-slate-700">No companies linked yet</p>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">Assign this holding group to a company to see it here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupCompanies.map(company => (
                    <article key={company.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"><Building2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.7} /></span>
                        <div className="min-w-0 flex-1">
                          <h4 className="break-words text-sm font-semibold leading-5 text-slate-900">{company.name}</h4>
                          {company.brandName && <p className="mt-1 text-xs leading-5 text-slate-500">{company.brandName}</p>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {company.industry && <span className="max-w-full break-words rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">{company.industry}</span>}
                        <span className="inline-flex min-w-0 items-center gap-1 text-xs text-slate-500"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{company.city || 'Location not added'}</span></span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        {company.website && (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 py-1 text-xs text-slate-600 hover:text-blue-600 hover:underline"
                          >
                            <Globe aria-hidden="true" className="h-3.5 w-3.5" />Website<span className="sr-only"> for {company.name} (opens in a new tab)</span>
                          </a>
                        )}
                        <button type="button" onClick={() => onGoToCompanyDetails(company.name)} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                          View company<span className="sr-only"> {company.name}</span><ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                  {companyCount !== null && groupCompanies.length < companyCount && <p className="px-1 text-xs leading-5 text-slate-500">Showing {groupCompanies.length.toLocaleString()} of {companyCount.toLocaleString()} companies.</p>}
                </div>
              )}
            </section>

            <aside className="min-w-0 space-y-4">
              <section aria-labelledby="group-notes-title" className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 id="group-notes-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText aria-hidden="true" className="h-4 w-4 text-slate-500" />Group notes</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-600">{group.notes || 'No notes have been added to this group yet.'}</p>
              </section>

              <section aria-labelledby="group-info-title" className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 id="group-info-title" className="mb-4 text-sm font-semibold text-slate-900">Group information</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-slate-500"><Hash aria-hidden="true" className="h-3.5 w-3.5" />Group ID</dt>
                    <dd className="mt-1.5 text-[13px] font-medium text-slate-700">#{group.id}</dd>
                  </div>
                  {[{ label: 'Created', value: group.createdAt }, { label: 'Last updated', value: group.updatedAt }].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />{label}</dt>
                      <dd className="mt-1.5 text-[13px] font-medium text-slate-700">{value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </aside>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <DialogClose asChild>
            <button type="button" className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">Done</button>
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
};
