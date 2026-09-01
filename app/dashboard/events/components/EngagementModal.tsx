import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Phone, Mail, MessageSquare, Clock, Plus, X, Loader2, CheckCircle2, UserCheck } from 'lucide-react';
import { EventParticipant, EventParticipantActivity } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { useAuth } from '../../../../lib/context/AuthContext';
import { toast } from 'sonner';
import { getPreEventApprovalStatus, setPreEventApprovalStatus } from '../utils/notesHelper';

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.528 2.017 14.077.99 11.457.99c-5.442 0-9.869 4.37-9.872 9.799-.001 1.764.475 3.486 1.38 5.03l-.996 3.639 3.733-.974h-.055zm11.367-7.39c-.3-.15-1.772-.875-2.046-.975-.276-.1-.476-.15-.676.15-.2.3-.776.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.485-.893-.797-1.496-1.783-1.672-2.083-.176-.3-.019-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.625-.926-2.225-.244-.589-.493-.51-.676-.519-.174-.009-.373-.01-.572-.01-.2 0-.525.075-.8.375-.276.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.27.495 1.703.63.717.228 1.368.196 1.884.12.573-.085 1.772-.725 2.022-1.425.25-.7.25-1.3 0-1.425-.075-.15-.275-.225-.575-.375z"/>
  </svg>
);

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
  const [selectedType, setSelectedType] = useState<'CALL' | 'EMAIL' | 'WHATSAPP'>('CALL');
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
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto"
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
            e.nativeEvent.stopImmediatePropagation();
          }
        }}
        className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] relative z-10 pointer-events-auto"
      >
        {/* Header */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate">{fullName}</h3>
            <p className="text-xs text-slate-400 truncate">{companyName} • {participant.database.jobTitle || 'No Title'}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all cursor-pointer relative z-20 shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-slate-900">
          {/* Quick Log Buttons - Compact Row */}
          {!isViewer && (
            <div className="flex items-center gap-2">
              <button
                disabled={submitting}
                onClick={() => handleLogActivity('CALL')}
                className="flex-1 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span>Call ({callLogs.length})</span>
              </button>
              <button
                disabled={submitting}
                onClick={() => handleLogActivity('EMAIL')}
                className="flex-1 py-2 bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span>Email ({emailLogs.length})</span>
              </button>
              <button
                disabled={submitting}
                onClick={() => handleLogActivity('WHATSAPP')}
                className="flex-1 py-2 bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>WA ({waLogs.length})</span>
              </button>
            </div>
          )}

          {/* Quick Notes */}
          {!isViewer && (
            <div>
              <input
                type="text"
                placeholder="Catatan (opsional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          )}

          {/* Status Milestone - Compact */}
          {!isViewer && (
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-medium text-slate-600">Update Status</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Auto-Sync</span>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { id: 'preEventApproval', label: 'Pre Event', val: getPreEventApprovalStatus(participant) },
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
                      onClick={() => handleStageSelect(chip.id as any)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : hasValue
                          ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {chip.label}: {chip.val || '-'}
                    </button>
                  );
                })}
              </div>

              {/* Selects */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <select
                  value={targetStage}
                  onChange={(e) => handleStageSelect(e.target.value as any)}
                  className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="preEventApproval">Pre Event</option>
                  <option value="reminderH7">Reminder H-7</option>
                  <option value="reminderH3">Reminder H-3</option>
                  <option value="reminderH1">Reminder H-1</option>
                  <option value="reminderHariH">Hari H</option>
                  <option value="none">Hanya Log</option>
                </select>
                <select
                  value={outcomeStatus}
                  disabled={targetStage === 'none'}
                  onChange={(e) => setOutcomeStatus(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
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
              </div>

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
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Simpan & Sync</span>
              </button>
            </div>
          )}

          {/* Activity History */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 mb-2">History ({activities?.length ?? 0})</h4>

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
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : (activities?.length ?? 0) === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                <p className="text-xs text-slate-400">Belum ada riwayat</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {activities!.map((act) => {
                  const typeUpper = act.activityType?.toUpperCase();
                  const typeColorMap: Record<string, string> = {
                    CALL: 'bg-blue-50 text-blue-600',
                    EMAIL: 'bg-emerald-50 text-emerald-600',
                    WHATSAPP: 'bg-emerald-50 text-emerald-600',
                    MEETING: 'bg-purple-50 text-purple-600',
                    SYSTEM: 'bg-slate-100 text-slate-500'
                  };
                  const badgeStyle = typeColorMap[typeUpper] || 'bg-slate-100 text-slate-500';

                  return (
                    <div key={act.id} className="py-2 px-2.5 bg-white border border-slate-200 rounded-md flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeStyle} shrink-0`}>
                          {act.activityType}
                        </span>
                        <span className="text-slate-600 truncate">{act.notes || '-'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimestamp(act.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-md transition-all cursor-pointer relative z-20"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
export default EngagementModal;
