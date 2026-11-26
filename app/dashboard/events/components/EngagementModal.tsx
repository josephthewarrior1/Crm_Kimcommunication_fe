import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Phone, Mail, MessageSquare, X, Loader2, CheckCircle2, History, Users, Settings2, ChevronDown, SquarePen } from 'lucide-react';
import type { Database, EventParticipant, EventParticipantActivity } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { useAuth } from '../../../../lib/context/AuthContext';
import { toast } from 'sonner';
import { getPreEventApprovalStatus, setPreEventApprovalStatus, isEmsApprovalManaged } from '../utils/notesHelper';
import { getContactOrganization } from '../../../../lib/utils/companyBranch';
import { splitContactEmails } from '../../database/utils/emailInput';
import { isValidContactEmail, isValidContactPhone } from '../../database/utils/emailCategory';
import { normalizePhone } from '../../database/utils/phoneHelper';
import { EventContactEditor } from './EventContactEditor';
import { ParticipantNotesCell } from './ParticipantInlineEdit';
import { ParticipantLogCell } from './ParticipantLogCell';

interface EngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: EventParticipant | null;
  onActivityLogged?: () => void;
  onContactUpdated?: (database: Database) => void;
  onNotesUpdated?: (participantId: number, notes: string) => void;
  showLogForm?: boolean;
  emsApprovalManaged?: boolean;
}

type TargetStage = 'preEventApproval' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH' | 'none';
type ActivityTab = 'compose' | 'history';

const activityAppearance = {
  CALL: { icon: Phone, label: 'Telepon', color: 'bg-blue-100 text-blue-700' },
  EMAIL: { icon: Mail, label: 'Email', color: 'bg-indigo-100 text-indigo-700' },
  WHATSAPP: { icon: MessageSquare, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700' },
  MEETING: { icon: Users, label: 'Meeting', color: 'bg-cyan-100 text-cyan-800' },
  SYSTEM: { icon: Settings2, label: 'Sistem', color: 'bg-slate-200 text-slate-700' },
};

const detailsSummary = 'flex cursor-pointer list-none items-center justify-between gap-3 rounded-md py-2 text-sm font-semibold text-slate-800 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden';
const detailsChevron = 'size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180';
const contactCard = 'rounded-2xl border border-[#E3E9F2] bg-white p-3.5 shadow-[0_2px_8px_rgba(30,58,110,0.045)]';

function getInitialStage(participant: EventParticipant | null): TargetStage {
  if (!participant || getPreEventApprovalStatus(participant) !== 'approve') return 'preEventApproval';
  for (const stage of ['reminderH7', 'reminderH3', 'reminderH1', 'reminderHariH'] as const) {
    if (!participant[stage]) return stage;
  }
  return 'preEventApproval';
}

function getStageDefaultOutcome(stage: TargetStage, participant: EventParticipant) {
  if (stage === 'preEventApproval') return getPreEventApprovalStatus(participant) || 'pending';
  if (stage === 'none') return 'confirm';
  return participant[stage] || (stage === 'reminderHariH' ? 'on_location' : 'confirm');
}

export const EngagementModal: React.FC<EngagementModalProps> = ({
  isOpen,
  onClose,
  participant,
  onActivityLogged,
  onContactUpdated,
  onNotesUpdated,
  showLogForm = true,
  emsApprovalManaged = false
}) => {
  const { isAdmin, isManager, isUser } = useAuth();
  const isViewer = isUser || (!isAdmin && !isManager);
  const emsManaged = emsApprovalManaged || isEmsApprovalManaged(participant);

  const [activities, setActivities] = useState<EventParticipantActivity[] | null>(null);
  const [activityTab, setActivityTab] = useState<ActivityTab>('compose');
  const [submitting, setSubmitting] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const requestIdRef = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const busy = submitting || savingContact || savingNotes || savingLog;
  const participantId = participant?.id;
  const [targetStage, setTargetStage] = useState<TargetStage>(() => getInitialStage(participant));
  const [outcomeStatus, setOutcomeStatus] = useState(() => participant ? getStageDefaultOutcome(targetStage, participant) : 'confirm');

  const handleStageSelect = (stage: TargetStage) => {
    setTargetStage(stage);
    if (participant && stage !== 'none') {
      setOutcomeStatus(getStageDefaultOutcome(stage, participant));
    }
  };

  const loadActivities = useCallback(async (id: number) => {
    const requestId = ++requestIdRef.current;
    try {
      const data = await crmService.getEventParticipantActivities(id);
      if (requestId === requestIdRef.current) {
        setActivities(data || []);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setActivities(current => current ?? []);
        toast.error('Failed to load engagement history');
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen || participantId === undefined) return;
    void loadActivities(participantId);
    return () => { requestIdRef.current += 1; };
  }, [isOpen, participantId, loadActivities]);

  if (!isOpen || !participant) return null;

  const fullName = `${participant.database.firstName || ''} ${participant.database.lastName || ''}`.trim() || 'Peserta';
  const organization = getContactOrganization(participant.database);
  const initials = fullName.split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase('id-ID');
  const mobilePhone = participant.database.mobilePhone?.trim();
  const officePhone = organization.officePhone?.trim();
  const emailEntries = participant.database.emails || [];
  const emails = Array.from(new Set(emailEntries.flatMap(({ email }) => splitContactEmails(email || ''))));
  const emailAddress = emailEntries.filter(entry => entry.isPrimary).flatMap(entry => splitContactEmails(entry.email || '')).find(isValidContactEmail)
    || emails.find(isValidContactEmail);
  const mobileNumber = normalizePhone(mobilePhone);
  const officeNumber = normalizePhone(officePhone);
  const validMobile = isValidContactPhone(mobileNumber) ? mobileNumber : '';
  const callNumber = validMobile || (isValidContactPhone(officeNumber) ? officeNumber : '');
  const contactLinks = [
    { label: 'Telepon', icon: Phone, color: 'text-blue-300', href: callNumber && `tel:${callNumber}` },
    { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-300', href: validMobile && `https://wa.me/${validMobile.slice(1)}` },
    { label: 'Email', icon: Mail, color: 'text-indigo-300', href: emailAddress && `mailto:${encodeURIComponent(emailAddress)}` },
  ];

  const canLogActivity = !isViewer && showLogForm;
  const activeActivityTab = canLogActivity ? activityTab : 'history';
  const activityId = `participant-activity-${participant.id}`;
  const activityTabs = [
    { id: 'compose', label: 'Catat aktivitas', icon: SquarePen },
    { id: 'history', label: 'Riwayat aktivitas', icon: History },
  ] as const;

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      let str = dateStr.trim();
      if (!str.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
        str = str.replace(' ', 'T') + 'Z';
      } else if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
      }
      const d = new Date(str);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[99999] grid place-items-center bg-slate-950/45 p-2.5 sm:p-3">
      <Dialog.Content
        className="ms-modal relative w-full max-w-[27.5rem] !max-h-[calc(100dvh-1.5rem)] !rounded-[20px] !border-slate-900/10 !shadow-2xl md:max-w-[57.5rem]"
        onOpenAutoFocus={(event) => {
          openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          event.preventDefault();
          titleRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          if (!openerRef.current?.isConnected) return;
          event.preventDefault();
          openerRef.current.focus({ preventScroll: true });
        }}
      >
        <header className="relative shrink-0 bg-gradient-to-b from-[#4A5264] via-[#1D293C] to-[#0E1728] px-4 pb-4 pt-3 text-white sm:px-5">
          <p className="pr-10 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">Detail kontak</p>
          <Dialog.Close
            type="button"
            disabled={busy}
            aria-label="Tutup detail peserta"
            className="absolute right-3 top-1.5 grid size-9 place-items-center !rounded-full text-slate-100 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 disabled:opacity-50 sm:right-4"
          >
            <X className="size-4" aria-hidden="true" />
          </Dialog.Close>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#6879F9] to-[#3C45DB] text-[16px] font-bold text-white shadow-sm">{initials}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Dialog.Title ref={titleRef} tabIndex={-1} className="break-words text-[19px] font-bold leading-tight tracking-tight outline-none">{fullName}</Dialog.Title>
                <span className="rounded border border-blue-300/35 bg-blue-300/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-100">Peserta Event</span>
              </div>
              <Dialog.Description className="mt-1 text-xs leading-snug text-blue-100">{organization.companyName || organization.branchName || 'Perusahaan belum diisi'}</Dialog.Description>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:w-80 md:shrink-0">
            {contactLinks.map(({ label, href, icon: Icon, color }) => {
              const classes = 'flex min-h-8 min-w-0 items-center justify-center gap-1.5 !rounded-lg border border-white/5 bg-white/[0.07] px-1 text-[11px] font-semibold text-slate-100';
              const content = <><Icon className={`size-3.5 shrink-0 ${color}`} aria-hidden="true" />{label}</>;
              return href ? (
                <a key={label} href={href} target={label === 'WhatsApp' ? '_blank' : undefined} rel={label === 'WhatsApp' ? 'noopener noreferrer' : undefined}
                  className={`${classes} transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300`}>{content}</a>
              ) : <span key={label} aria-disabled="true" title={`${label} belum tersedia`} className={`${classes} opacity-45`}>{content}</span>;
            })}
          </div>
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain bg-[#F6F8FC] [scrollbar-width:thin] md:grid md:grid-cols-[minmax(0,1.26fr)_minmax(0,1fr)] md:items-start">
          <div className="min-w-0">
          {canLogActivity && (
            <div className="sticky top-0 z-10 border-b border-[#E3E9F2] bg-white px-4 py-2 sm:px-5 md:static md:mx-4 md:mt-4 md:rounded-xl md:border md:px-1.5 md:py-1.5">
              <div role="tablist" aria-label="Aktivitas peserta" className="grid grid-cols-2 gap-1 rounded-xl bg-[#EFF3F9] p-1"
                onKeyDown={event => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === 'Home' ? 'compose' : event.key === 'End' ? 'history' : activityTab === 'compose' ? 'history' : 'compose';
                  setActivityTab(next);
                  event.currentTarget.querySelector<HTMLButtonElement>(`[data-activity-tab="${next}"]`)?.focus();
                }}>
                {activityTabs.map(({ id, label, icon: Icon }) => {
                  const selected = activeActivityTab === id;
                  return (
                    <button key={id} type="button" role="tab" id={`${activityId}-${id}-tab`} data-activity-tab={id}
                      aria-label={label} aria-selected={selected} aria-controls={`${activityId}-${id}`} tabIndex={selected ? 0 : -1}
                      className={`flex min-h-8 min-w-0 items-center justify-center gap-1.5 !rounded-lg px-1.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:text-xs ${selected ? 'bg-white text-slate-900 !shadow-[0_1px_3px_rgba(31,53,90,0.10)]' : 'text-slate-600 hover:text-slate-950'}`}
                      onClick={() => setActivityTab(id)}>
                      <Icon className={`size-3.5 shrink-0 ${selected ? 'text-blue-600' : 'text-slate-500'}`} aria-hidden="true" />
                      <span>{label}</span>
                      {id === 'history' && activities !== null && <span aria-hidden="true" className="rounded-full bg-[#DFE7F4] px-1.5 text-[10px] tabular-nums text-slate-700">{activities.length}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-2.5 px-3 py-3 sm:px-4 md:pb-4">
              {canLogActivity && (
                <section id={`${activityId}-compose`} role="tabpanel" aria-labelledby={`${activityId}-compose-tab`}
                  hidden={activeActivityTab !== 'compose'} className={contactCard}>
                  <ParticipantLogCell participant={participant} disabled={busy && !savingLog} onSavingChange={setSavingLog}
                    onLogged={() => {
                      void loadActivities(participant.id);
                      onActivityLogged?.();
                    }} />
                </section>
              )}
              <section id={`${activityId}-history`} role={canLogActivity ? 'tabpanel' : undefined}
                aria-labelledby={canLogActivity ? `${activityId}-history-tab` : undefined}
                hidden={activeActivityTab !== 'history'} className={contactCard}>
                {!canLogActivity && <h3 className="mb-2 text-sm font-semibold text-slate-900">Riwayat aktivitas</h3>}

                {activities === null ? (
                  <div role="status" aria-label="Memuat riwayat aktivitas" className="motion-safe:animate-pulse">
                    {[0, 1].map((item) => (
                      <div key={item} aria-hidden="true" className="flex items-center gap-2.5 py-2">
                        <span className="size-6 shrink-0 rounded-md bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex items-center gap-2.5 py-2 text-sm text-slate-600">
                    <History className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <p>Belum ada aktivitas</p>
                  </div>
                ) : (
                  <ol aria-label="Daftar aktivitas peserta" tabIndex={0}
                    className="max-h-64 divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-md pr-2 [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                    {activities.map((act) => {
                      const type = act.activityType?.toUpperCase() as keyof typeof activityAppearance;
                      const appearance = activityAppearance[type] || activityAppearance.SYSTEM;
                      const ActivityIcon = appearance.icon;
                      return (
                        <li key={act.id} className="grid grid-cols-[1.625rem_minmax(0,1fr)] gap-2.5 py-2">
                          <span className={`grid size-[26px] place-items-center rounded-md ${appearance.color}`}>
                            <ActivityIcon className="size-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <span className="text-sm font-semibold text-slate-900">{activityAppearance[type]?.label || act.activityType || 'Aktivitas'}</span>
                              <time className="text-xs tabular-nums text-slate-500">{formatTimestamp(act.createdAt)}</time>
                            </div>
                            {act.notes && <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-slate-600">{act.notes}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
          </div>
          </div>
          <aside aria-label="Kontak dan follow-up" className="min-w-0 space-y-2.5 px-3 pb-3 sm:px-4 md:border-l md:border-[#E3E9F2] md:py-4">
              <section className={contactCard}>
                {!isViewer && onContactUpdated ? (
                  <EventContactEditor key={participant.database.id} database={participant.database}
                    onSaved={onContactUpdated} onSavingChange={setSavingContact} className="min-w-0" compact />
                ) : <h3 className="text-sm font-semibold text-slate-900">Data kontak</h3>}
                <dl className="mt-2.5 divide-y divide-slate-100 border-t border-slate-100 text-xs">
                  <div className="grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] gap-2.5 py-2">
                    <dt className="text-slate-500">Nomor telepon</dt>
                    <dd className="text-right font-medium text-slate-800 [overflow-wrap:anywhere]">{mobilePhone || 'Belum diisi'}</dd>
                  </div>
                  {officePhone && (
                    <div className="grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] gap-2.5 py-2">
                      <dt className="text-slate-500">Telepon kantor</dt>
                      <dd className="text-right font-medium text-slate-800 [overflow-wrap:anywhere]">{officePhone}</dd>
                    </div>
                  )}
                  <div className="grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] gap-2.5 py-2">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="text-right font-medium text-slate-800 [overflow-wrap:anywhere]">
                      {emails.length ? <ul className="space-y-0.5">{emails.map(email => <li key={email}>{email}</li>)}</ul> : 'Belum diisi'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] gap-2.5 pt-2">
                    <dt className="text-slate-500">Jabatan</dt>
                    <dd className="text-right font-medium text-slate-800 [overflow-wrap:anywhere]">{participant.database.jobTitle || 'Belum diisi'}</dd>
                  </div>
                </dl>
              </section>
              <div className={contactCard}>
                <ParticipantNotesCell participant={participant} onSaved={isViewer ? undefined : onNotesUpdated}
                  disabled={busy && !savingNotes} onSavingChange={setSavingNotes} />
              </div>
                {!isViewer && (
                  <details className={`${contactCard} group`}>
                    <summary className={`${detailsSummary} !py-0`}>
                      <span className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" /></span>
                        Status follow-up
                      </span>
                      <ChevronDown aria-hidden="true" className={detailsChevron} />
                    </summary>
                  {/* Status Chips */}
                  <div className="my-3 flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'preEventApproval', label: 'Pre', val: getPreEventApprovalStatus(participant) },
                      { id: 'reminderH7', label: 'H-7', val: participant.reminderH7 },
                      { id: 'reminderH3', label: 'H-3', val: participant.reminderH3 },
                      { id: 'reminderH1', label: 'H-1', val: participant.reminderH1 },
                      { id: 'reminderHariH', label: 'Hari H', val: participant.reminderHariH }
                    ].map((chip) => {
                      const isSelected = targetStage === chip.id;
                      const hasValue = Boolean(chip.val);
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => handleStageSelect(chip.id as TargetStage)}
                          aria-pressed={isSelected}
                          className={`!rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4] ${
                            isSelected
                              ? 'border-[#234DDD] bg-[#234DDD] text-white'
                              : hasValue
                              ? 'border-[#DFE1E6] bg-[#F4F5F7] text-[#44546F] hover:bg-[#DCDFE4]'
                              : 'border-[#DFE1E6] bg-white text-[#626F86] hover:bg-[#F4F5F7]'
                          }`}
                        >
                          {chip.label}{chip.val ? `: ${chip.val.replace(/_/g, ' ')}` : ''}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selects + Button */}
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-0 basis-36 flex-1">
                      <span className="mb-1.5 block">Tahap</span>
                      <select
                        value={targetStage}
                        onChange={(e) => handleStageSelect(e.target.value as TargetStage)}
                        className="w-full cursor-pointer px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C66E4]/20"
                      >
                        <option value="preEventApproval">Pre Event</option>
                        <option value="reminderH7">Reminder H-7</option>
                        <option value="reminderH3">Reminder H-3</option>
                        <option value="reminderH1">Reminder H-1</option>
                        <option value="reminderHariH">Hari H</option>
                        <option value="none">Hanya Log</option>
                      </select>
                    </label>
                    <label className="min-w-0 basis-36 flex-1">
                      <span className="mb-1.5 block">Hasil</span>
                      <select
                        value={outcomeStatus}
                        disabled={targetStage === 'none'}
                        onChange={(e) => setOutcomeStatus(e.target.value)}
                        className="w-full cursor-pointer px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C66E4]/20 disabled:opacity-50"
                      >
                        {targetStage === 'preEventApproval' ? (
                          <>
                            <option value="pending">Pending</option>
                            <option value="approve">Approve</option>
                            <option value="decline">Decline</option>
                          </>
                        ) : targetStage === 'reminderHariH' ? (
                          <>
                            <option value="on_location">On Location</option>
                            <option value="on_the_way">On The Way</option>
                            <option value="not_respon_yet">Not Respond</option>
                            <option value="not_respond_2x">Not Respond 2x</option>
                            <option value="unable_to_attend">Unable</option>
                          </>
                        ) : (
                          <>
                            <option value="confirm">Confirm</option>
                            <option value="tentative">Tentative</option>
                            <option value="unable_to_attend">Unable</option>
                            <option value="not_respon_yet">Not Respond</option>
                          </>
                        )}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busy || targetStage === 'none'}
                      onClick={async () => {
                        if (!participant || busy || isViewer || targetStage === 'none') return;
                        setSubmitting(true);
                        try {
                          const isReminderStage = targetStage.startsWith('reminder');
                          const autoApproveConf = (!emsManaged && isReminderStage && participant.confirmationStatus !== 'approve' && participant.confirmationStatus !== 'confirmed')
                            ? 'approve'
                            : undefined;
                          const nextNotes = targetStage === 'preEventApproval'
                            ? setPreEventApprovalStatus(participant.notes, outcomeStatus)
                            : undefined;

                          if (targetStage === 'preEventApproval') {
                            await crmService.updatePreEventApprovalStatus(participant.id, nextNotes, outcomeStatus);
                          } else {
                            await crmService.updateParticipantStatus(
                              participant.id,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              targetStage === 'reminderH7' ? outcomeStatus : undefined,
                              targetStage === 'reminderH3' ? outcomeStatus : undefined,
                              targetStage === 'reminderH1' ? outcomeStatus : undefined,
                              targetStage === 'reminderHariH' ? outcomeStatus : undefined,
                              autoApproveConf
                            );
                          }

                          if (targetStage === 'reminderH7') participant.reminderH7 = outcomeStatus;
                          if (targetStage === 'reminderH3') participant.reminderH3 = outcomeStatus;
                          if (targetStage === 'reminderH1') participant.reminderH1 = outcomeStatus;
                          if (targetStage === 'reminderHariH') participant.reminderHariH = outcomeStatus;
                          if (nextNotes) participant.notes = nextNotes;
                          if (targetStage === 'preEventApproval') participant.preEventApprovalStatus = outcomeStatus;
                          if (autoApproveConf) participant.confirmationStatus = autoApproveConf;

                          const stageLabel = targetStage === 'preEventApproval' ? 'Pre Event' : targetStage === 'reminderH7' ? 'H-7' : targetStage === 'reminderH3' ? 'H-3' : targetStage === 'reminderH1' ? 'H-1' : targetStage === 'reminderHariH' ? 'Hari H' : 'Milestone';
                          toast.success(`Berhasil menyimpan status ${stageLabel} ke ${outcomeStatus.toUpperCase()}!`);

                          onActivityLogged?.();
                        } catch (err) {
                          console.error(err);
                          toast.error('Gagal memperbarui status peserta');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="ms-modal-primary shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4] disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                      <span>Simpan status</span>
                    </button>
                  </div>
                  </details>
                )}
          </aside>
        </div>
      </Dialog.Content>
      </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
export default EngagementModal;
