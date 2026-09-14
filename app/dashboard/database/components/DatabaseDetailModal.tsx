import React, { useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, Briefcase, Building2, CalendarDays, CheckCircle2, ChevronDown, Clock, FileText, Loader2, Mail, MapPin, Phone, RefreshCw, User, Users } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../../../../components/ui/dialog';
import { Database, DatabaseEmail, EventParticipant, Company } from '../../../../lib/types';
import { checkDatabaseCompleteness } from '../utils/validationHelper';
import { getContactOffice } from '../../../../lib/utils/companyBranch';
import { getStatusLabel } from '../../events/utils/statusHelper';
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
  emailsError?: string;
  eventsError?: string;
  onRetry?: () => void;
}

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  return <div className="min-w-0"><dt className="mb-1.5 text-xs text-slate-500">{label}</dt><dd className="break-words text-sm font-medium leading-6 text-slate-800">{children || <span className="font-normal text-slate-400">Belum diisi</span>}</dd></div>;
}

function formatDate(value?: string, withTime = false) {
  if (!value) return 'Belum diisi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum diisi';
  return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } as const : {}) });
}

function websiteUrl(value?: string) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

function StatusBadge({ status }: { status?: string }) {
  const value = status?.toLowerCase() || '';
  const color = ['registered', 'confirm', 'green', 'on_location'].includes(value) ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : ['tentative', 'yellow'].includes(value) ? 'border-amber-200 bg-amber-50 text-amber-800'
    : ['not_interest', 'red', 'unable_to_attend'].includes(value) ? 'border-rose-200 bg-rose-50 text-rose-700'
    : value === 'on_the_way' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600';
  const label = getStatusLabel(value);
  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${color}`}>{label === '- None' ? status?.replace(/_/g, ' ') || 'Belum ada status' : label}</span>;
}

function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-start gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-100 focus-visible:outline-blue-600"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />Coba lagi</button>}</div>;
}

// Reset the selected tab when opening another contact or reopening the dialog.
export const DatabaseDetailModal: React.FC<DatabaseDetailModalProps> = props =>
  props.isOpen && props.database ? <DatabaseDetailContent key={props.database.id} {...props} /> : null;

function DatabaseDetailContent({ isOpen, onClose, database, emails, loadingEmails, events, loadingEvents, emailsError, eventsError, onRetry }: DatabaseDetailModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const openerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fullName = `${database.firstName || ''} ${database.lastName || ''}`.trim() || 'Kontak tanpa nama';
  const initials = [database.firstName, database.lastName].filter(Boolean).map(name => name[0]).join('').slice(0, 2).toUpperCase();
  const company = database.company;
  const office = getContactOffice(database);
  const completeness = !loadingEmails && !emailsError ? checkDatabaseCompleteness({ ...database, emails }) : null;
  const website = websiteUrl(company?.website);
  const linkedin = websiteUrl(database.linkedinUrl);
  const databaseType = ({ partner_it: 'Partner IT', partner_marketing: 'Partner marketing', end_user: 'End user', unknown: 'Belum ditentukan' } as Record<string, string>)[database.databaseType] || database.databaseType?.replace(/_/g, ' ');
  const tabs = [
    { id: 'profile', label: 'Profil kontak', icon: User },
    { id: 'company', label: 'Company & kantor', icon: Building2 },
    { id: 'events', label: 'Riwayat event', icon: CalendarDays },
  ];
  const selectTab = (id: string) => { setActiveTab(id); if (contentRef.current) contentRef.current.scrollTop = 0; };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="h-[min(820px,calc(100dvh-32px))] max-w-5xl" onOpenAutoFocus={() => { openerRef.current = document.activeElement as HTMLElement | null; }} onCloseAutoFocus={event => { event.preventDefault(); openerRef.current?.focus(); }}>
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3 pr-8 sm:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-lg font-semibold text-blue-700 sm:h-14 sm:w-14">{initials || <User aria-hidden="true" className="h-6 w-6" />}</span>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs text-slate-500">Database / Detail kontak</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <DialogTitle className="break-words">{fullName}</DialogTitle>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${database.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{database.isActive !== false ? 'Aktif' : 'Nonaktif / opt-out'}</span>
              </div>
              <DialogDescription className="mt-1.5 break-words">{database.jobTitle || 'Jabatan belum diisi'}{database.specialityDivision ? ` · ${database.specialityDivision}` : ''}</DialogDescription>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                <span className="inline-flex min-w-0 items-center gap-1.5"><Building2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{company?.name || 'Company belum diisi'}</span></span>
                {database.branch && <span className="inline-flex min-w-0 items-center gap-1.5 text-blue-700"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{database.branch.name}</span></span>}
              </div>
            </div>
          </div>
        </header>

        <div role="tablist" aria-label="Bagian detail kontak" className="flex shrink-0 gap-4 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:gap-6 sm:px-6">
          {tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`database-detail-${tab.id}-tab`} aria-controls={`database-detail-${tab.id}-panel`} aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => selectTab(tab.id)} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            selectTab(tabs[next].id);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }} className={`inline-flex shrink-0 items-center gap-2 border-b-2 py-3.5 text-xs font-medium outline-offset-[-3px] focus-visible:outline-blue-600 sm:text-sm ${activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}>
            <tab.icon aria-hidden="true" className="hidden h-4 w-4 sm:block" />{tab.label}
            {tab.id === 'events' && (loadingEvents ? <Loader2 aria-label="Memuat event" className="h-3.5 w-3.5 animate-spin" /> : !eventsError && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">{events.length}</span>)}
          </button>)}
        </div>

        <div ref={contentRef} role="tabpanel" id={`database-detail-${activeTab}-panel`} aria-labelledby={`database-detail-${activeTab}-tab`} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain break-words bg-slate-50 p-4 outline-offset-[-3px] focus-visible:outline-blue-600 sm:p-6">
          {activeTab === 'profile' && <div className="space-y-5">
            {completeness?.isIncomplete ? <details className="group rounded-lg border border-amber-200 bg-amber-50 text-amber-900"><summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-xs font-medium [&::-webkit-details-marker]:hidden"><AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="flex-1">{completeness.missingFields.length} kolom wajib belum lengkap</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="flex flex-wrap gap-2 px-4 pb-4">{completeness.missingFields.map(field => <span key={field} className="rounded border border-amber-200 bg-white px-2 py-1 text-xs">{field}</span>)}</div></details>
              : completeness ? <p className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Data wajib kontak sudah lengkap</p>
              : loadingEmails ? <p role="status" className="flex items-center gap-2 text-xs text-slate-500"><Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />Memeriksa kelengkapan kontak...</p> : null}
            <div className="grid items-start gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><Phone aria-hidden="true" className="h-4 w-4 text-slate-400" />Kontak & email</h3>
                <dl className="space-y-4">
                  <Field label="Nomor handphone"><span className="tabular-nums">{database.mobilePhone || 'Belum diisi'}</span></Field>
                  <Field label="LinkedIn">{linkedin ? <a href={linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline">Lihat profil LinkedIn<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></a> : database.linkedinUrl}</Field>
                </dl>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-2"><h4 className="text-xs font-medium text-slate-500">Alamat email</h4>{!loadingEmails && !emailsError && <span className="text-xs tabular-nums text-slate-500">{emails.length} email</span>}</div>
                  {loadingEmails ? <p role="status" className="flex items-center gap-2 py-5 text-xs text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-blue-600" />Memuat email...</p>
                    : emailsError ? <LoadError message={emailsError} onRetry={onRetry} />
                    : !emails.length ? <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center"><Mail aria-hidden="true" className="mx-auto mb-2 h-5 w-5 text-slate-400" /><p className="text-xs text-slate-500">Belum ada email tersimpan.</p></div>
                    : <ul className="space-y-2.5">{emails.map(email => {
                      const corporate = email.isCorporate || email.emailType?.toLowerCase() === 'company';
                      const personal = email.emailType?.toLowerCase() === 'personal';
                      return <li key={email.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"><div className="mb-2 flex flex-wrap items-center gap-2 text-xs"><span className="text-slate-500">{corporate ? 'Email kantor' : personal ? 'Email personal' : 'Email lainnya'}</span>{email.isPrimary && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">Utama</span>}</div><a href={`mailto:${encodeURIComponent(email.email)}`} className="break-all text-sm font-medium text-slate-800 hover:text-blue-700 hover:underline">{email.email}</a>{!corporate && personal && !isPublicPersonalEmail(email.email) && <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700"><AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />Domain kantor tercatat sebagai email personal.</p>}</li>;
                    })}</ul>}
                </div>
              </aside>
              <div className="min-w-0 space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><User aria-hidden="true" className="h-4 w-4 text-slate-400" />Informasi kontak</h3>
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2"><Field label="Salutation">{database.salutation}</Field><Field label="Position level">{database.positionLevel}</Field><Field label="Nama depan">{database.firstName}</Field><Field label="Nama belakang">{database.lastName}</Field><Field label="Jabatan">{database.jobTitle}</Field><Field label="Divisi">{database.specialityDivision}</Field></dl>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText aria-hidden="true" className="h-4 w-4 text-slate-400" />Informasi database</h3>
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2"><Field label="Tipe database">{databaseType}</Field><Field label="Sumber data"><span className="capitalize">{database.source?.replace(/_/g, ' ') || 'Belum diisi'}</span></Field><Field label="Ditambahkan">{formatDate(database.createdAt, true)}</Field><Field label="Terakhir diperbarui">{formatDate(database.updatedAt, true)}</Field></dl>
                </section>
              </div>
            </div>
          </div>}

          {activeTab === 'company' && <div className="grid items-start gap-5 md:grid-cols-2">
            <div className="min-w-0 space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><Building2 aria-hidden="true" className="h-4 w-4 text-slate-400" />Company & holding group</h3>
                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2"><Field label="Company name">{company?.name}</Field><Field label="Brand">{company?.brandName}</Field><Field label="Industri">{company?.industry}</Field><Field label="Website">{website ? <a href={website} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-start gap-1 text-blue-700 hover:underline"><span className="min-w-0 break-all">{company?.website}</span><ArrowUpRight aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0" /></a> : company?.website}</Field></dl>
                <dl className="mt-5 space-y-4 border-t border-slate-100 pt-5"><Field label="Holding group">{company?.group?.name}</Field><Field label="Catatan holding group"><span className="whitespace-pre-wrap font-normal">{company?.group?.notes || 'Belum diisi'}</span></Field></dl>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900"><Briefcase aria-hidden="true" className="h-4 w-4 text-slate-400" />Profil perusahaan</h3>
                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2"><Field label="Company size (revenue)">{company?.companySizeRevenue}</Field><Field label="Jumlah karyawan">{company?.companySizeEmployee}</Field><div className="sm:col-span-2"><Field label="Hardware & infrastruktur"><span className="whitespace-pre-wrap font-normal">{company?.companyHardware || 'Belum diisi'}</span></Field></div></dl>
              </section>
            </div>
            <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-blue-100 bg-blue-50/70 p-4 sm:p-5"><p className="mb-2 flex items-center gap-2 text-xs font-medium text-blue-700"><MapPin aria-hidden="true" className="h-4 w-4" />Lokasi kontak</p><h3 className="break-words text-lg font-semibold text-slate-900">{database.branch ? `Cabang ${database.branch.name}` : 'Kantor perusahaan'}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{database.branch ? 'Alamat dan telepon di bawah mengikuti cabang yang terhubung ke kontak ini.' : 'Kontak terhubung langsung ke company, tanpa cabang khusus.'}</p></div>
              <dl className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-5"><div className="sm:col-span-2"><Field label="Alamat"><span className="whitespace-pre-wrap font-normal">{office?.address || 'Belum diisi'}</span></Field></div><Field label="Kota">{office?.city}</Field><Field label="Kode pos">{office?.postalCode}</Field><div className="sm:col-span-2"><Field label="Telepon kantor"><span className="tabular-nums">{office?.officePhone || 'Belum diisi'}</span></Field></div></dl>
            </section>
          </div>}

          {activeTab === 'events' && <div>
            <div className="mb-5"><h3 className="text-sm font-semibold text-slate-900">Riwayat keikutsertaan</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Event yang diikuti kontak ini, beserta status peserta dan tindak lanjut hari H.</p></div>
            {loadingEvents ? <p role="status" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-600" />Memuat riwayat event...</p>
              : eventsError ? <LoadError message={eventsError} onRetry={onRetry} />
              : !events.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><CalendarDays aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">Belum ada riwayat event</h4><p className="mt-2 text-xs text-slate-500">Keikutsertaan kontak akan muncul di sini setelah ditambahkan ke event.</p></div>
              : <div className="space-y-3">{events.map(participant => {
                const event = participant.event;
                const start = event?.dateStart || event?.startDate;
                const end = event?.dateEnd || event?.endDate;
                return <article key={participant.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><CalendarDays aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h4 className="break-words text-sm font-semibold text-slate-900">{event?.name || 'Event tanpa nama'}</h4>{event?.eventType && <p className="mt-1 text-xs capitalize text-slate-500">{event.eventType.replace(/_/g, ' ')}</p>}<p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><Clock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{formatDate(start)}{end && end !== start ? ` – ${formatDate(end)}` : ''}</p><p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><Users aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{event?.clientName || event?.client || 'Client belum diisi'}</p></div></div>
                    <dl className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-3 sm:min-w-[240px]"><div><dt className="mb-2 text-xs text-slate-500">Status peserta</dt><dd><StatusBadge status={participant.participantStatus} /></dd></div><div><dt className="mb-2 text-xs text-slate-500">Status hari H</dt><dd><StatusBadge status={participant.reminderHariH || 'not_respon_yet'} /></dd></div></dl>
                  </div>
                  {participant.notes && <details className="group mt-4 border-t border-slate-100 pt-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-600 [&::-webkit-details-marker]:hidden"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Catatan peserta<ChevronDown aria-hidden="true" className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{participant.notes}</p></details>}
                </article>;
              })}</div>}
          </div>}
        </div>

        <footer className="flex shrink-0 items-center justify-end border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6"><DialogClose asChild><button type="button" className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Tutup detail</button></DialogClose></footer>
      </DialogContent>
    </Dialog>
  );
}
