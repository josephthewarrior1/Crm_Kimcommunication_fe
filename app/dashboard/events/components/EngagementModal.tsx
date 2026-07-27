import React, { useState, useEffect } from 'react';
import { Phone, Mail, MessageSquare, Clock, Plus, X, Loader2, CheckCircle2, UserCheck } from 'lucide-react';
import { EventParticipant, EventParticipantActivity } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

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
  const [activities, setActivities] = useState<EventParticipantActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<'CALL' | 'EMAIL' | 'WHATSAPP'>('CALL');
  const [notes, setNotes] = useState('');
  const [targetStage, setTargetStage] = useState<'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH' | 'confirmationStatus' | 'none'>('reminderH7');
  const [outcomeStatus, setOutcomeStatus] = useState<string>('confirm');

  const getStageStatus = (stage: string, p: EventParticipant) => {
    if (stage === 'reminderH7') return p.reminderH7 || '';
    if (stage === 'reminderH3') return p.reminderH3 || '';
    if (stage === 'reminderH1') return p.reminderH1 || '';
    if (stage === 'reminderHariH') return p.reminderHariH || '';
    if (stage === 'confirmationStatus') return p.confirmationStatus || '';
    return '';
  };

  const getStageDefaultOutcome = (stage: string, p: EventParticipant) => {
    const existing = getStageStatus(stage, p);
    if (existing) return existing;
    if (stage === 'reminderHariH') return 'on_location';
    if (stage === 'confirmationStatus') return 'approve';
    return 'confirm';
  };

  useEffect(() => {
    if (isOpen && participant) {
      loadActivities();

      // Auto-select stage: pick next uncompleted stage or default to reminderH7
      let initialStage: 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH' | 'confirmationStatus' | 'none' = 'reminderH7';
      if (participant.reminderH7 && !participant.reminderH3) {
        initialStage = 'reminderH3';
      } else if (participant.reminderH7 && participant.reminderH3 && !participant.reminderH1) {
        initialStage = 'reminderH1';
      } else if (participant.reminderH7 && participant.reminderH3 && participant.reminderH1 && !participant.reminderHariH) {
        initialStage = 'reminderHariH';
      }

      setTargetStage(initialStage);
      setOutcomeStatus(getStageDefaultOutcome(initialStage, participant));
    } else {
      setActivities([]);
      setNotes('');
    }
  }, [isOpen, participant]);

  const handleStageSelect = (stage: 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH' | 'confirmationStatus' | 'none') => {
    setTargetStage(stage);
    if (participant && stage !== 'none') {
      setOutcomeStatus(getStageDefaultOutcome(stage, participant));
    }
  };

  const loadActivities = async () => {
    if (!participant) return;
    setLoading(true);
    try {
      const data = await crmService.getEventParticipantActivities(participant.id);
      setActivities(data || []);
    } catch (err) {
      toast.error('Failed to load engagement history');
    } finally {
      setLoading(false);
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
  const callLogs = activities.filter(a => a.activityType?.toUpperCase() === 'CALL');
  const emailLogs = activities.filter(a => a.activityType?.toUpperCase() === 'EMAIL');
  const waLogs = activities.filter(a => a.activityType?.toUpperCase() === 'WHATSAPP');

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] relative z-10 pointer-events-auto"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
              <h3 className="font-extrabold text-lg tracking-tight">{fullName}</h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{companyName} • {participant.database.jobTitle || 'No Title'}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer relative z-20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-900">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CALL Card */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Call Count
                </span>
                <span className="text-lg font-black text-blue-950">{callLogs.length}x</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Terakhir: <strong className="text-slate-700">{formatTimestamp(callLogs[0]?.createdAt)}</strong>
              </p>
              <button
                disabled={submitting}
                onClick={() => handleLogActivity('CALL')}
                className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> + Log Call
              </button>
            </div>

            {/* EMAIL Card */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email Count
                </span>
                <span className="text-lg font-black text-emerald-950">{emailLogs.length}x</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Terakhir: <strong className="text-slate-700">{formatTimestamp(emailLogs[0]?.createdAt)}</strong>
              </p>
              <button
                disabled={submitting}
                onClick={() => handleLogActivity('EMAIL')}
                className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> + Log Email
              </button>
            </div>

            {/* WHATSAPP Card */}
            <div className="bg-green-50/60 border border-green-100 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider flex items-center gap-1">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-green-600" /> WA Count
                </span>
                <span className="text-lg font-black text-green-950">{waLogs.length}x</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Terakhir: <strong className="text-slate-700">{formatTimestamp(waLogs[0]?.createdAt)}</strong>
              </p>
              <button
                disabled={submitting}
                onClick={() => handleLogActivity('WHATSAPP')}
                className="mt-3 w-full py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> + Log WA
              </button>
            </div>
          </div>

          {/* Auto-Sync Outcome Status Configuration */}
          <div className="bg-blue-50/50 border border-blue-100/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Hasil Follow-Up & Auto Update Status</span>
              </label>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                Auto-Sync ke Tabel
              </span>
            </div>

            {/* Current Milestone Status Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-blue-100/80">
              <span className="text-[10px] font-bold text-slate-500 mr-0.5">Status Tersimpan:</span>
              {[
                { id: 'reminderH7', label: 'H-7', val: participant.reminderH7 },
                { id: 'reminderH3', label: 'H-3', val: participant.reminderH3 },
                { id: 'reminderH1', label: 'H-1', val: participant.reminderH1 },
                { id: 'reminderHariH', label: 'Hari H', val: participant.reminderHariH },
                { id: 'confirmationStatus', label: 'Approval', val: participant.confirmationStatus }
              ].map((chip) => {
                const isSelected = targetStage === chip.id;
                const hasValue = Boolean(chip.val);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleStageSelect(chip.id as any)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : hasValue
                        ? 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200/60'
                    }`}
                    title={`Klik untuk lihat/edit ${chip.label}`}
                  >
                    {chip.label}: <span className="uppercase">{chip.val || 'Belum'}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Status Milestone</span>
                <select
                  value={targetStage}
                  onChange={(e) => handleStageSelect(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="reminderH7">Reminder H-7</option>
                  <option value="reminderH3">Reminder H-3</option>
                  <option value="reminderH1">Reminder H-1</option>
                  <option value="reminderHariH">D-Day (Hari H)</option>
                  <option value="confirmationStatus">Registration Approval</option>
                  <option value="none">- Hanya Catat Log (Jangan Update Status)</option>
                </select>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hasil Respon Peserta</span>
                <select
                  value={outcomeStatus}
                  disabled={targetStage === 'none'}
                  onChange={(e) => setOutcomeStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-extrabold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {targetStage === 'reminderHariH' ? (
                    <>
                      <option value="on_location">On Location (Hadir)</option>
                      <option value="on_the_way">On The Way (OTW)</option>
                      <option value="not_respon_yet">Not Respond Yet</option>
                      <option value="unable_to_attend">Unable to Attend (Batal)</option>
                    </>
                  ) : targetStage === 'confirmationStatus' ? (
                    <>
                      <option value="approve">Approve (Disetujui)</option>
                      <option value="pending">Pending</option>
                      <option value="decline">Decline (Ditolak)</option>
                    </>
                  ) : (
                    <>
                      <option value="confirm">Confirm (Hadir)</option>
                      <option value="tentative">Tentative (Masih Ragu)</option>
                      <option value="unable_to_attend">Unable to Attend (Batal)</option>
                      <option value="not_respon_yet">Not Respond Yet</option>
                      <option value="not_respond_2x">Not Respond 2x</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Explicit Save Status Button */}
            <div className="pt-1 flex justify-end">
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
                      : (targetStage === 'confirmationStatus' ? outcomeStatus : undefined);

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

                    if (targetStage === 'reminderH7') participant.reminderH7 = outcomeStatus;
                    if (targetStage === 'reminderH3') participant.reminderH3 = outcomeStatus;
                    if (targetStage === 'reminderH1') participant.reminderH1 = outcomeStatus;
                    if (targetStage === 'reminderHariH') participant.reminderHariH = outcomeStatus;
                    if (targetStage === 'confirmationStatus') participant.confirmationStatus = outcomeStatus;
                    if (autoApproveConf) participant.confirmationStatus = autoApproveConf;

                    const stageLabel = targetStage === 'reminderH7' ? 'H-7' : targetStage === 'reminderH3' ? 'H-3' : targetStage === 'reminderH1' ? 'H-1' : targetStage === 'reminderHariH' ? 'Hari H' : 'Registration';
                    toast.success(`Berhasil menyimpan status ${stageLabel} ke ${outcomeStatus.toUpperCase()}!`);

                    if (onActivityLogged) onActivityLogged();
                  } catch (err) {
                    console.error(err);
                    toast.error('Gagal memperbarui status peserta');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Simpan & Sync Status Ke Tabel</span>
              </button>
            </div>
          </div>

          {/* Quick Notes Input */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Catatan Engagement (Opsional)</label>
            <input
              type="text"
              placeholder="Misal: 'Sudah ditelpon, konfirmasi hadir membawa 2 rekan'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 shadow-2xs"
            />
          </div>

          {/* Activity Timeline List */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">History Engagement ({activities.length})</h4>

            {loading ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Clock className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-400">Belum ada riwayat engagement. Klik tombol di atas untuk mencatat log.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {activities.map((act) => {
                  const typeUpper = act.activityType?.toUpperCase();
                  const typeColorMap: Record<string, string> = {
                    CALL: 'bg-blue-100 text-blue-800 border-blue-200',
                    EMAIL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    WHATSAPP: 'bg-green-100 text-green-800 border-green-200',
                    MEETING: 'bg-purple-100 text-purple-800 border-purple-200'
                  };
                  const badgeStyle = typeColorMap[typeUpper] || 'bg-slate-100 text-slate-800';

                  return (
                    <div key={act.id} className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-start justify-between gap-3 text-xs shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${badgeStyle} shrink-0 mt-0.5`}>
                          {act.activityType}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">{act.notes || '-'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Oleh: <strong className="text-slate-600">{act.createdBy || 'System'}</strong></p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-450 shrink-0">
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer relative z-20"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
export default EngagementModal;
