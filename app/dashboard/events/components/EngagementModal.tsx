import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Phone, Mail, MessageSquare, Clock, X, Loader2, CheckCircle2, UserCheck, History, Users, Settings2 } from 'lucide-react';
import { EventParticipant, EventParticipantActivity } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { useAuth } from '../../../../lib/context/AuthContext';
import { toast } from 'sonner';
import { getPreEventApprovalStatus, setPreEventApprovalStatus } from '../utils/notesHelper';

interface EngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: EventParticipant | null;
  onActivityLogged?: () => void;
}

export const EngagementModal: React.FC<EngagementModalProps> = ({
  isOpen,
  onClose,
  participant,
  onActivityLogged
}) => {
  const { isAdmin, isManager, isUser } = useAuth();
  const isViewer = isUser || (!isAdmin && !isManager);

  const [activities, setActivities] = useState<EventParticipantActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const requestIdRef = useRef(0);
  type TargetStage = 'preEventApproval' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH' | 'none';
  const [targetStage, setTargetStage] = useState<TargetStage>('preEventApproval');
  const [outcomeStatus, setOutcomeStatus] = useState<string>('confirm');

  const getStageStatus = (stage: string, p: EventParticipant) => {
    if (stage === 'preEventApproval') return getPreEventApprovalStatus(p);
    if (stage === 'reminderH7') return p.reminderH7 || '';
    if (stage === 'reminderH3') return p.reminderH3 || '';
    if (stage === 'reminderH1') return p.reminderH1 || '';
    if (stage === 'reminderHariH') return p.reminderHariH || '';
    return '';
  };

  const getStageDefaultOutcome = (stage: string, p: EventParticipant) => {
    const existing = getStageStatus(stage, p);
    if (existing) return existing;
    if (stage === 'preEventApproval') return 'pending';
    if (stage === 'reminderHariH') return 'on_location';
    return 'confirm';
  };

  useLayoutEffect(() => {
    if (!isOpen || !participant) {
      requestIdRef.current += 1;
      setActivities(null);
      setLoading(false);
      setNotes('');
    }
  }, [isOpen, participant?.id]);

  useEffect(() => {
    if (isOpen && participant) {
      loadActivities();

      // Auto-select stage: pick next uncompleted stage or default to Pre Event
      let initialStage: TargetStage = 'preEventApproval';
      if (getPreEventApprovalStatus(participant) !== 'approve') {
        initialStage = 'preEventApproval';
      } else if (!participant.reminderH7) {
        initialStage = 'reminderH7';
      } else if (participant.reminderH7 && !participant.reminderH3) {
        initialStage = 'reminderH3';
      } else if (participant.reminderH7 && participant.reminderH3 && !participant.reminderH1) {
        initialStage = 'reminderH1';
      } else if (participant.reminderH7 && participant.reminderH3 && participant.reminderH1 && !participant.reminderHariH) {
        initialStage = 'reminderHariH';
      }

      setTargetStage(initialStage);
      setOutcomeStatus(getStageDefaultOutcome(initialStage, participant));
    } else {
      setActivities(null);
      setNotes('');
    }
  }, [isOpen, participant]);

  const handleStageSelect = (stage: TargetStage) => {
    setTargetStage(stage);
    if (participant && stage !== 'none') {
      setOutcomeStatus(getStageDefaultOutcome(stage, participant));
    }
  };

  const loadActivities = async () => {
    if (!participant) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await crmService.getEventParticipantActivities(participant.id);
      if (requestId === requestIdRef.current) {
        setActivities(data || []);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setActivities([]);
      }
      toast.error('Failed to load engagement history');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleLogActivity = async (type: 'CALL' | 'EMAIL' | 'WHATSAPP') => {
    if (!participant) return;
    setSubmitting(true);
    try {
      const defaultNoteMap: Record<string, string> = {
        CALL: 'Call log added',
        EMAIL: 'Email log added',
        WHATSAPP: 'WhatsApp log added'
      };
      const finalNote = notes.trim() || defaultNoteMap[type];

      // Add Telemarketing activity log ONLY (does not alter milestone statuses)
      await crmService.addEventParticipantActivity(participant.id, {
        activityType: type,
        status: 'COMPLETED',
        notes: finalNote
      });

      toast.success(`Berhasil mencatat log ${type} untuk ${participant.database.firstName}!`);

      setNotes('');
      await loadActivities();
      if (onActivityLogged) onActivityLogged();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencatat riwayat engagement');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !participant) return null;

  const fullName = `${participant.database.firstName || ''} ${participant.database.lastName || ''}`.trim() || 'Participant';
  const companyName = participant.database.company?.name || 'No Company';

  // Calculate counts and last timestamps per activity type
  const callLogs = (activities || []).filter(a => a.activityType?.toUpperCase() === 'CALL');
  const emailLogs = (activities || []).filter(a => a.activityType?.toUpperCase() === 'EMAIL');
  const waLogs = (activities || []).filter(a => a.activityType?.toUpperCase() === 'WHATSAPP');
  const isInitialLoading = loading && activities === null;

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

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
      e.nativeEvent.stopImmediatePropagation();
    }
    onClose();
  };

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
          e.nativeEvent.stopImmediatePropagation();
        }
        if (e.target === e.currentTarget) handleClose(e);
      }}
      className="ms-modal-overlay z-[99999] pointer-events-auto"
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
            e.nativeEvent.stopImmediatePropagation();
          }
        }}
        className="ms-modal max-w-2xl w-full relative z-10 pointer-events-auto"
      >
        {/* Header */}
        <div className="ms-modal-header pr-14">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#626F86]">
              <History className="h-4 w-4 text-[#0C66E4]" aria-hidden="true" />
              Aktivitas peserta
            </p>
            <h3 className="ms-modal-title break-words">{fullName}</h3>
            <p className="ms-modal-description mt-1 break-words">{companyName} &middot; {participant.database.jobTitle || 'No Title'}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup aktivitas peserta"
            className="ms-modal-close z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="ms-modal-body space-y-4 bg-[#F4F5F7]">
          {/* Log activity */}
          {!isViewer && (
            <section className="rounded-lg border border-[#DFE1E6] bg-white p-4">
              <h4 className="text-sm font-semibold text-[#172B4D]">Catat aktivitas</h4>
              <p className="mt-1 text-xs leading-5 text-[#626F86]">Tambahkan catatan, lalu pilih saluran untuk menyimpan aktivitas.</p>
              <label htmlFor="engagement-notes" className="mb-1.5 mt-4 block">Catatan <span className="font-normal text-[#626F86]">(opsional)</span></label>
              <textarea
                id="engagement-notes"
                rows={2}
                placeholder="Tulis hasil percakapan atau tindak lanjut..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-y px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C66E4]/20 placeholder:text-[#8590A2]"
              />
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleLogActivity('CALL')}
                  className="flex items-center justify-center gap-2 border border-[#B3BAC5] bg-white px-3 py-2.5 text-sm font-medium text-[#172B4D] transition-colors hover:border-[#0C66E4] hover:bg-[#E9F2FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4] disabled:opacity-50"
                >
                  <Phone className="h-4 w-4 text-[#0C66E4]" aria-hidden="true" />
                  <span>Telepon</span>
                  <span className="ml-auto text-xs text-[#626F86]">{callLogs.length}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleLogActivity('EMAIL')}
                  className="flex items-center justify-center gap-2 border border-[#B3BAC5] bg-white px-3 py-2.5 text-sm font-medium text-[#172B4D] transition-colors hover:border-[#0C66E4] hover:bg-[#E9F2FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4] disabled:opacity-50"
                >
                  <Mail className="h-4 w-4 text-[#0C66E4]" aria-hidden="true" />
                  <span>Email</span>
                  <span className="ml-auto text-xs text-[#626F86]">{emailLogs.length}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleLogActivity('WHATSAPP')}
                  className="flex items-center justify-center gap-2 border border-[#B3BAC5] bg-white px-3 py-2.5 text-sm font-medium text-[#172B4D] transition-colors hover:border-[#0C66E4] hover:bg-[#E9F2FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4] disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4 text-[#1F845A]" aria-hidden="true" />
                  <span>WhatsApp</span>
                  <span className="ml-auto text-xs text-[#626F86]">{waLogs.length}</span>
                </button>
              </div>
            </section>
          )}

          {/* Status Milestone - Compact */}
          {!isViewer && (
            <section className="rounded-lg border border-[#DFE1E6] bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#172B4D]">
                <UserCheck className="h-4 w-4 text-[#0C66E4]" aria-hidden="true" />
                Status follow-up
              </h4>
              {/* Status Chips */}
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
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
                      className={`border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4] ${
                        isSelected
                          ? 'border-[#0C66E4] bg-[#E9F2FF] text-[#0C66E4]'
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
                  disabled={submitting || targetStage === 'none'}
                  onClick={async () => {
                    if (!participant || targetStage === 'none') return;
                    setSubmitting(true);
                    try {
                      const isReminderStage = targetStage.startsWith('reminder');
                      const autoApproveConf = (isReminderStage && participant.confirmationStatus !== 'approve' && participant.confirmationStatus !== 'confirmed')
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

                      if (onActivityLogged) onActivityLogged();
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
            </section>
          )}

          {/* Activity History */}
          <section className="rounded-lg border border-[#DFE1E6] bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[#172B4D]">
                <History className="h-4 w-4 text-[#626F86]" aria-hidden="true" />
                Riwayat aktivitas
              </h4>
              <span className="rounded bg-[#F4F5F7] px-2 py-1 text-xs font-medium text-[#626F86]">{activities?.length ?? 0} log</span>
            </div>

            {isInitialLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="p-2 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-2 animate-pulse">
                    <span className="h-4 w-12 rounded bg-slate-200 shrink-0" />
                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="py-6 flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#0C66E4]" />
              </div>
            ) : (activities?.length ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed border-[#DFE1E6] bg-[#FAFBFC] px-4 py-6 text-center">
                <History className="mx-auto mb-3 h-6 w-6 text-[#8590A2]" aria-hidden="true" />
                <p className="text-sm font-medium text-[#44546F]">Belum ada aktivitas</p>
                <p className="mt-1 text-xs leading-5 text-[#626F86]">Riwayat telepon, WhatsApp, dan email peserta akan tampil di sini.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#DFE1E6]">
                {activities!.map((act) => {
                  const typeUpper = act.activityType?.toUpperCase();
                  const typeColorMap: Record<string, string> = {
                    CALL: 'bg-blue-50 text-blue-600',
                    EMAIL: 'bg-blue-50 text-blue-600',
                    WHATSAPP: 'bg-emerald-50 text-emerald-600',
                    MEETING: 'bg-cyan-50 text-cyan-700',
                    SYSTEM: 'bg-slate-100 text-slate-500'
                  };
                  const badgeStyle = typeColorMap[typeUpper] || 'bg-slate-100 text-slate-500';
                  const ActivityIcon = typeUpper === 'CALL' ? Phone : typeUpper === 'EMAIL' ? Mail : typeUpper === 'WHATSAPP' ? MessageSquare : typeUpper === 'MEETING' ? Users : Settings2;

                  return (
                    <div key={act.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${badgeStyle}`}>
                        <ActivityIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="text-xs font-semibold text-[#44546F]">{act.activityType}</span>
                          <span className="flex items-center gap-1 text-xs text-[#626F86]">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {formatTimestamp(act.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-[#44546F]">{act.notes || '-'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="ms-modal-footer">
          <button
            type="button"
            onClick={handleClose}
            className="ms-modal-secondary relative z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C66E4]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
export default EngagementModal;
