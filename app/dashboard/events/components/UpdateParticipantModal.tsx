import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, Phone, MessageSquare, Mail, Loader2, Users, ShieldAlert, UserX } from 'lucide-react';
import { EventParticipant, AppUser, Database } from '../../../../lib/types';
import { extractPicFromNotes, extractPreEventApprovalStatus } from '../utils/notesHelper';

interface UpdateParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeParticipant: EventParticipant;
  activeTab?: string;
  usersList: AppUser[];
  onSubmit: (data: {
    participantStatus: string;
    attendanceStatus: string;
    notes: string;
    callStatus: string;
    emailStatus: string;
    whatsappStatus: string;
    reminderH7: string;
    reminderH3: string;
    reminderH1: string;
    reminderHariH: string;
    confirmationStatus: string;
    preEventApprovalStatus: string;
  }) => Promise<void>;
  submittingParticipantUpdate: boolean;
  onFlagAsTikus?: (participant: EventParticipant) => void;
  onRequestTakeout?: (database: Database) => void;
}

export const UpdateParticipantModal: React.FC<UpdateParticipantModalProps> = ({
  isOpen,
  onClose,
  activeParticipant,
  activeTab,
  usersList,
  onSubmit,
  submittingParticipantUpdate,
  onFlagAsTikus,
  onRequestTakeout
}) => {
  const [updateParticipantStatusStr, setUpdateParticipantStatusStr] = useState('white');
  const [updateConfirmationStatusStr, setUpdateConfirmationStatusStr] = useState('pending');
  const [updatePreEventApprovalStatusStr, setUpdatePreEventApprovalStatusStr] = useState('pending');
  const [updateReminderH7, setUpdateReminderH7] = useState('');
  const [updateReminderH3, setUpdateReminderH3] = useState('');
  const [updateReminderH1, setUpdateReminderH1] = useState('');
  const [updateReminderHariH, setUpdateReminderHariH] = useState('');
  const [updateCallStatusStr, setUpdateCallStatusStr] = useState('NOT_CONTACTED');
  const [updateWhatsappStatusStr, setUpdateWhatsappStatusStr] = useState('NOT_SENT');
  const [updateEmailStatusStr, setUpdateEmailStatusStr] = useState('NOT_SENT');
  const [updateParticipantNotes, setUpdateParticipantNotes] = useState('');
  const [updatePic, setUpdatePic] = useState('Admin');
  const [showFlagConfirm, setShowFlagConfirm] = useState(false);

  useEffect(() => {
    if (activeParticipant) {
      setShowFlagConfirm(false);
      setUpdateParticipantStatusStr(activeParticipant.participantStatus);
      setUpdateConfirmationStatusStr(activeParticipant.confirmationStatus || 'pending');
      setUpdatePreEventApprovalStatusStr(extractPreEventApprovalStatus(activeParticipant.notes));
      setUpdateReminderH7(activeParticipant.reminderH7 || '');
      setUpdateReminderH3(activeParticipant.reminderH3 || '');
      setUpdateReminderH1(activeParticipant.reminderH1 || '');
      setUpdateReminderHariH(activeParticipant.reminderHariH || '');
      setUpdateCallStatusStr(activeParticipant.callStatus || 'NOT_CONTACTED');
      setUpdateWhatsappStatusStr(activeParticipant.whatsappStatus || 'NOT_SENT');
      setUpdateEmailStatusStr(activeParticipant.emailStatus || 'NOT_SENT');
      const { pic, cleanNotes } = extractPicFromNotes(activeParticipant.notes);
      setUpdatePic(pic);
      setUpdateParticipantNotes(cleanNotes === '-' ? '' : cleanNotes);
    }
  }, [activeParticipant]);

  if (!isOpen) return null;
  const showClientApproval = activeTab === 'request' || activeTab === 'declined';
  const showPreEventApproval = activeTab === 'pre_event';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const originTag = activeParticipant.notes?.includes('[Origin: EMS Sync]') ? '[Origin: EMS Sync]' : 
                      activeParticipant.notes?.includes('[Origin: Request]') ? '[Origin: Request]' : '';
    const preEventApprovalTag = activeParticipant.notes?.match(/\[PreEventApproval:\s*[^\]]+\]/i)?.[0] || '';
    const cleanUserText = updateParticipantNotes
      .replace(/\[Origin:\s*[^\]]+\]/gi, '')
      .replace(/\[PIC:\s*[^\]]+\]/gi, '')
      .replace(/\[PreEventApproval:\s*[^\]]+\]/gi, '')
      .trim();
    const finalNotes = `[PIC: ${updatePic}] ${preEventApprovalTag} ${originTag} ${cleanUserText}`.replace(/\s+/g, ' ').trim();
    onSubmit({
      participantStatus: updateParticipantStatusStr,
      attendanceStatus: activeParticipant.attendanceStatus,
      notes: finalNotes,
      callStatus: updateCallStatusStr,
      emailStatus: updateEmailStatusStr,
      whatsappStatus: updateWhatsappStatusStr,
      reminderH7: updateReminderH7,
      reminderH3: updateReminderH3,
      reminderH1: updateReminderH1,
      reminderHariH: updateReminderHariH,
      confirmationStatus: updateConfirmationStatusStr,
      preEventApprovalStatus: updatePreEventApprovalStatusStr
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-5 shadow-xl relative animate-in scale-in duration-200 text-slate-900 my-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="border-b border-slate-100 pb-2 mb-3">
          <h3 className="text-base font-extrabold text-slate-900">Participant Detail & Qualification</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Manage database: <strong className="text-slate-700">{activeParticipant.database.firstName} {activeParticipant.database.lastName}</strong> ({activeParticipant.database.company?.name || 'No Company'})
          </p>
        </div>

        <div className="space-y-3">
          {/* Profile Info */}
          <div className="bg-slate-55 p-2.5 rounded-xl border border-slate-150 text-[10px] grid grid-cols-4 gap-2 mb-2">
            <div>
              <span className="text-slate-400 font-bold block">Job Title</span>
              <p className="font-semibold text-slate-700 truncate">{activeParticipant.database.jobTitle || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Industry</span>
              <p className="font-semibold text-slate-700 truncate">{activeParticipant.database.company?.industry || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Mobile Phone</span>
              <p className="font-semibold text-slate-700 truncate">{activeParticipant.database.mobilePhone || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Email</span>
              <p className="font-semibold text-slate-700 truncate">{activeParticipant.database.emails?.[0]?.email || '-'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-1">Participant Qualification</h4>
            
            <div className={`grid ${showClientApproval || showPreEventApproval ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Tele Remarks (Status)
                </label>
                <select
                  value={updateParticipantStatusStr}
                  onChange={(e) => setUpdateParticipantStatusStr(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                >
                  <option value="not_respon_yet">Not respond yet</option>
                  <option value="not_respond_2x">Not respond 2x</option>
                  <option value="not_respond_3x">Not respond 3x</option>
                  <option value="not_respond_4x">Not respond 4x</option>
                  <option value="not_respond_5x">Not respond 5x</option>
                  <option value="not_respond_6x">Not respond 6x</option>
                  <option value="not_respond_7x">Not respond 7x</option>
                  <option value="not_respond_8x">Not respond 8x</option>
                  <option value="not_respond_9x">Not respond 9x</option>
                  <option value="registered">Registered</option>
                  <option value="confirm">Confirm</option>
                  <option value="tentative">Tentative</option>
                  <option value="not_interest">Not Interest</option>
                  <option value="unable_to_attend">Unable to attend</option>
                </select>
              </div>

              {showClientApproval && (
                <div>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                    <CheckCircle className="w-3 h-3 text-blue-500" />
                    Client Approval
                  </label>
                  <select
                    value={updateConfirmationStatusStr}
                    onChange={(e) => setUpdateConfirmationStatusStr(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="approve">Approve</option>
                    <option value="decline">Decline</option>
                  </select>
                </div>
              )}

              {showPreEventApproval && (
                <div>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                    <CheckCircle className="w-3 h-3 text-blue-500" />
                    Pre Event Approval
                  </label>
                  <select
                    value={updatePreEventApprovalStatusStr}
                    onChange={(e) => setUpdatePreEventApprovalStatusStr(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="approve">Approve</option>
                    <option value="decline">Decline</option>
                  </select>
                </div>
              )}

              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <Users className="w-3 h-3 text-indigo-500" />
                  Assign PIC
                </label>
                <input
                  type="text"
                  list="pic-list"
                  value={updatePic}
                  onChange={(e) => setUpdatePic(e.target.value)}
                  placeholder="Search/type PIC..."
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none placeholder-slate-400"
                />
                <datalist id="pic-list">
                  <option value="Admin" />
                  {(usersList || []).filter(u => {
                    const uname = (u.username || '').toLowerCase();
                    const fname = (u.fullName || '').toLowerCase();
                    return uname !== 'kevin' && !fname.includes('kevin');
                  }).map((u) => {
                    const name = u.fullName || u.username;
                    return <option key={u.id} value={name} />;
                  })}
                </datalist>
              </div>
            </div>

            <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-1 pt-1">Reminders</h4>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  H-7 Reminder
                </label>
                <select
                  value={updateReminderH7}
                  onChange={(e) => setUpdateReminderH7(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                >
                  <option value="">- None</option>
                  <option value="not_respon_yet">Not respond yet</option>
                  <option value="not_respond_2x">Not respond 2x</option>
                  <option value="tentative">Tentative</option>
                  <option value="confirm">Confirm</option>
                  <option value="unable_to_attend">Unable to attend</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <Calendar className="w-3 h-3 text-amber-500" />
                  H-3 Reminder
                </label>
                <select
                  value={updateReminderH3}
                  onChange={(e) => setUpdateReminderH3(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                >
                  <option value="">- None</option>
                  <option value="not_respon_yet">Not respond yet</option>
                  <option value="not_respond_2x">Not respond 2x</option>
                  <option value="tentative">Tentative</option>
                  <option value="confirm">Confirm</option>
                  <option value="unable_to_attend">Unable to attend</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  H-1 Reminder
                </label>
                <select
                  value={updateReminderH1}
                  onChange={(e) => setUpdateReminderH1(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                >
                  <option value="">- None</option>
                  <option value="not_respon_yet">Not respond yet</option>
                  <option value="not_respond_2x">Not respond 2x</option>
                  <option value="tentative">Tentative</option>
                  <option value="confirm">Confirm</option>
                  <option value="unable_to_attend">Unable to attend</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <Calendar className="w-3 h-3 text-rose-500" />
                  Hari H Reminder
                </label>
                <select
                  value={updateReminderHariH}
                  onChange={(e) => setUpdateReminderHariH(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                >
                  <option value="">- None</option>
                  <option value="on_location">On Location</option>
                  <option value="on_the_way">On The Way</option>
                  <option value="not_respon_yet">Not Respond Yet</option>
                  <option value="not_respond_2x">Not Respond 2x</option>
                  <option value="not_respond_3x">Not Respond 3x</option>
                  <option value="not_respond_4x">Not Respond 4x</option>
                  <option value="not_respond_5x">Not Respond 5x</option>
                  <option value="not_respond_6x">Not Respond 6x</option>
                  <option value="not_respond_7x">Not Respond 7x</option>
                  <option value="not_respond_8x">Not Respond 8x</option>
                  <option value="not_respond_9x">Not Respond 9x</option>
                  <option value="unable_to_attend">Unable Attend</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Follow-up Notes</label>
              <textarea
                placeholder="Details on status update..."
                value={updateParticipantNotes}
                onChange={(e) => setUpdateParticipantNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex gap-2 justify-between items-center pt-3 border-t border-slate-100 mt-4">
              <div className="flex items-center gap-2">
                {onRequestTakeout && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeParticipant.database) {
                        onRequestTakeout(activeParticipant.database);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Request Data Takeout for this contact"
                  >
                    <UserX className="w-3.5 h-3.5 text-slate-600" />
                    Request Takeout
                  </button>
                )}

                {onFlagAsTikus ? (
                  showFlagConfirm ? (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-1.5 px-3 animate-in fade-in duration-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="text-[11px] font-bold text-red-700">Yakin tandai sebagai Tikus?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onFlagAsTikus(activeParticipant);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        Ya, Flag Tikus
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFlagConfirm(false)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowFlagConfirm(true)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Tandain Tikus (Report Spam)
                    </button>
                  )
                ) : null}
              </div>

              <button
                type="submit"
                disabled={submittingParticipantUpdate}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {submittingParticipantUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save Qualification Info
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
