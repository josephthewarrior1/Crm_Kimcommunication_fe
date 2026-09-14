import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, ArrowUpRight, Building2, FolderTree, Globe, Loader2, MapPin, Phone, RefreshCw, Search, Server, Users } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../../../../components/ui/dialog';
import { Company, CompanyBranch, Database } from '../../../../lib/types';
import { formatCompanyName } from '../../../../lib/utils/companyName';
import { CompanyBranchesPanel } from './CompanyBranchesPanel';

interface CompanyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  databases: Database[];
  contactsLoading?: boolean;
  contactsError?: boolean;
  onRetryContacts?: () => void;
  onGoToEmployeeDetails: (fullName: string) => void;
}

function DataPoint({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1.5 text-xs text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium leading-6 text-slate-800">
        {children || <span className="font-normal text-slate-400">Belum diisi</span>}
      </dd>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'Belum diisi';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Belum diisi' : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function websiteUrl(value?: string) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = props =>
  props.isOpen ? <CompanyDetailContent key={props.company.id} {...props} /> : null;

function CompanyDetailContent({ isOpen, onClose, company, databases, contactsLoading = false, contactsError = false, onRetryContacts, onGoToEmployeeDetails }: CompanyDetailModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [branches, setBranches] = useState<CompanyBranch[] | null>(null);
  const [branchFilter, setBranchFilter] = useState('all');
  const [contactSearch, setContactSearch] = useState('');
  const openerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (branches && branchFilter !== 'all' && branchFilter !== 'unassigned' && !branches.some(branch => String(branch.id) === branchFilter)) setBranchFilter('all');
  }, [branches, branchFilter]);

  const contacts = databases.filter(database => database.company?.id === company.id && database.isActive);
  const query = contactSearch.trim().toLocaleLowerCase();
  const filteredContacts = contacts.filter(contact =>
    (branchFilter === 'all' || (branchFilter === 'unassigned' ? !contact.branch : String(contact.branch?.id) === branchFilter)) &&
    (!query || [contact.firstName, contact.lastName, contact.jobTitle, contact.mobilePhone].filter(Boolean).join(' ').toLocaleLowerCase().includes(query))
  );
  const name = formatCompanyName(company.name) || 'Company tanpa nama';
  const initials = (company.brandName || name).trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const website = websiteUrl(company.website);
  const tabs = [
    { id: 'profile', label: 'Profil company', icon: Building2 },
    { id: 'branches', label: 'Cabang & kantor', icon: MapPin },
    { id: 'contacts', label: 'Kontak', icon: Users },
  ];
  const selectTab = (id: string) => {
    setActiveTab(id);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="h-[min(820px,calc(100dvh-32px))] max-w-5xl"
        onOpenAutoFocus={() => { openerRef.current = document.activeElement as HTMLElement | null; }}
        onCloseAutoFocus={event => { event.preventDefault(); openerRef.current?.focus(); }}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3 pr-8 sm:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-lg font-semibold text-blue-700 sm:h-14 sm:w-14">
              {initials || <Building2 aria-hidden="true" className="h-6 w-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs text-slate-500">Companies / Detail company</p>
              <DialogTitle className="break-words">{name}</DialogTitle>
              <DialogDescription className="mt-1.5 break-words">
                {company.brandName || 'Brand belum diisi'}{company.industry ? ` · ${company.industry}` : ''}
              </DialogDescription>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <FolderTree aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{company.group?.name || 'Belum terhubung ke holding group'}</span>
                </span>
                {company.city && <span className="inline-flex min-w-0 items-center gap-1.5 text-blue-700"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{company.city}</span></span>}
              </div>
            </div>
          </div>
        </header>

        <div role="tablist" aria-label="Bagian detail company" className="flex shrink-0 gap-4 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:gap-6 sm:px-6">
          {tabs.map((tab, index) => (
            <button
              key={tab.id} type="button" role="tab" id={`company-detail-${tab.id}-tab`}
              aria-controls={`company-detail-${tab.id}-panel`} aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => selectTab(tab.id)}
              onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                selectTab(tabs[next].id);
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
              }}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 py-3.5 text-xs font-medium outline-offset-[-3px] focus-visible:outline-blue-600 sm:text-sm ${activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}
            >
              <tab.icon aria-hidden="true" className="hidden h-4 w-4 sm:block" />{tab.label}
              {tab.id === 'branches' && branches !== null && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">{branches.length}</span>}
              {tab.id === 'contacts' && (contactsLoading ? <Loader2 aria-label="Memuat kontak" className="h-3.5 w-3.5 animate-spin" /> : !contactsError && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">{contacts.length}</span>)}
            </button>
          ))}
        </div>

        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain break-words bg-slate-50 p-4 sm:p-6">
          <div role="tabpanel" id="company-detail-profile-panel" aria-labelledby="company-detail-profile-tab" hidden={activeTab !== 'profile'} tabIndex={0} className="outline-offset-4 focus-visible:outline-blue-600">
            <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><Building2 aria-hidden="true" className="h-4 w-4 text-slate-400" />Informasi perusahaan</h3>
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <DataPoint label="Company name">{name}</DataPoint>
                    <DataPoint label="Brand">{company.brandName}</DataPoint>
                    <DataPoint label="Industri">{company.industry}</DataPoint>
                    <DataPoint label="Holding group">{company.group?.name}</DataPoint>
                  </dl>
                  {company.group?.notes && <dl className="mt-5 border-t border-slate-100 pt-5"><DataPoint label="Catatan holding group"><span className="whitespace-pre-wrap font-normal">{company.group.notes}</span></DataPoint></dl>}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><Server aria-hidden="true" className="h-4 w-4 text-slate-400" />Skala & infrastruktur</h3>
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <DataPoint label="Jumlah karyawan">{company.companySizeEmployee}</DataPoint>
                    <DataPoint label="Company size (revenue)">{company.companySizeRevenue}</DataPoint>
                    <div className="sm:col-span-2"><DataPoint label="Hardware & infrastruktur"><span className="whitespace-pre-wrap font-normal">{company.companyHardware || 'Belum diisi'}</span></DataPoint></div>
                  </dl>
                </section>

                <dl className="grid grid-cols-2 gap-5 px-1 pb-1">
                  <DataPoint label="Ditambahkan">{formatDate(company.createdAt)}</DataPoint>
                  <DataPoint label="Terakhir diperbarui">{formatDate(company.updatedAt)}</DataPoint>
                </dl>
              </div>

              <aside className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-blue-100 bg-blue-50/70 p-4 sm:p-5">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium text-blue-700"><MapPin aria-hidden="true" className="h-4 w-4" />Alamat perusahaan</p>
                  <h3 className="break-words text-lg font-semibold text-slate-900">{company.city || 'Lokasi belum diisi'}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Lokasi untuk kontak yang terhubung langsung ke company. Lokasi cabang dikelola di tab Cabang & kantor.</p>
                </div>
                <dl className="space-y-5 p-4 sm:p-5">
                  <DataPoint label="Alamat"><span className="whitespace-pre-wrap font-normal">{company.address || 'Belum diisi'}</span></DataPoint>
                  <DataPoint label="Kode pos">{company.postalCode}</DataPoint>
                  <DataPoint label="Telepon kantor"><span className="inline-flex items-start gap-2 tabular-nums"><Phone aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-400" />{company.officePhone || 'Belum diisi'}</span></DataPoint>
                  <DataPoint label="Website">
                    {website ? <a href={website} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-start gap-1 text-blue-700 hover:underline"><Globe aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /><span className="min-w-0 break-all">{company.website}</span><ArrowUpRight aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0" /></a> : company.website}
                  </DataPoint>
                </dl>
              </aside>
            </div>
          </div>

          {/* Keep the branch form mounted so switching tabs preserves unfinished edits. */}
          <div role="tabpanel" id="company-detail-branches-panel" aria-labelledby="company-detail-branches-tab" hidden={activeTab !== 'branches'} tabIndex={0} className="outline-offset-4 focus-visible:outline-blue-600">
            <CompanyBranchesPanel companyId={company.id} companyName={company.brandName || name} contacts={contacts} contactsLoading={contactsLoading} contactsError={contactsError} onBranchesChange={setBranches} />
          </div>

          <div role="tabpanel" id="company-detail-contacts-panel" aria-labelledby="company-detail-contacts-tab" hidden={activeTab !== 'contacts'} tabIndex={0} className="outline-offset-4 focus-visible:outline-blue-600">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-slate-900">Kontak perusahaan</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Kontak aktif yang terhubung ke company dan setiap cabangnya.</p></div>
              {!contactsLoading && !contactsError && <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs tabular-nums text-slate-600">{filteredContacts.length} dari {contacts.length} kontak</span>}
            </div>
            <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_230px]">
              <div className="relative min-w-0">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="search" aria-label="Cari kontak perusahaan" placeholder="Cari nama, jabatan, atau nomor..." value={contactSearch} onChange={event => setContactSearch(event.target.value)} disabled={contactsLoading || contactsError} className="min-w-0 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50" />
              </div>
              <select aria-label="Filter cabang kontak" value={branchFilter} onChange={event => setBranchFilter(event.target.value)} disabled={contactsLoading || contactsError} className="min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50">
                <option value="all">Semua cabang/kantor</option>
                <option value="unassigned">Tanpa cabang</option>
                {branches?.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>

            {contactsLoading ? (
              <p role="status" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-600" />Memuat kontak perusahaan...</p>
            ) : contactsError ? (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="flex items-start gap-2 text-sm font-semibold text-amber-900"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Kontak perusahaan gagal dimuat</p>
                <p className="mt-2 text-xs leading-5 text-amber-800">Muat ulang untuk melihat daftar kontak dan jumlah per cabang.</p>
                {onRetryContacts && <button type="button" onClick={onRetryContacts} className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />Coba lagi</button>}
              </div>
            ) : !filteredContacts.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
                <Users aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-slate-400" />
                <h4 className="text-sm font-semibold text-slate-700">{contacts.length ? 'Tidak ada kontak yang sesuai' : 'Belum ada kontak aktif'}</h4>
                <p className="mt-2 text-xs leading-5 text-slate-500">{contacts.length ? 'Coba kata kunci lain atau pilih cabang yang berbeda.' : 'Kontak yang ditautkan ke perusahaan ini akan muncul di sini.'}</p>
                {contacts.length > 0 && <button type="button" onClick={() => { setContactSearch(''); setBranchFilter('all'); }} className="mt-4 text-xs font-semibold text-blue-700 hover:underline">Tampilkan semua kontak</button>}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredContacts.map(contact => {
                  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Kontak tanpa nama';
                  const contactInitials = [contact.firstName, contact.lastName].filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase();
                  const branchName = branches?.find(branch => branch.id === contact.branch?.id)?.name || contact.branch?.name;
                  return (
                    <article key={contact.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-700">{contactInitials || <Users aria-hidden="true" className="h-5 w-5" />}</span>
                        <div className="min-w-0"><h4 className="break-words text-sm font-semibold text-slate-900">{fullName}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{contact.jobTitle || 'Jabatan belum diisi'}</p></div>
                      </div>
                      <dl className="my-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                        <DataPoint label="Position level">{contact.positionLevel}</DataPoint>
                        <DataPoint label="Nomor handphone"><span className="tabular-nums">{contact.mobilePhone || 'Belum diisi'}</span></DataPoint>
                      </dl>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{branchName || 'Tanpa cabang'}</span></p>
                        <button type="button" aria-label={`Lihat kontak ${fullName}`} onClick={() => onGoToEmployeeDetails(fullName)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-blue-600">Lihat kontak<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6">
          <DialogClose asChild><button type="button" className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Tutup detail</button></DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
