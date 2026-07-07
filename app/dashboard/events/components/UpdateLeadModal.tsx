import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, Phone, MessageSquare, Mail, Loader2 } from 'lucide-react';
import { EventLead } from '../../../../lib/types';

interface UpdateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLead: EventLead;
  onSubmit: (data: {
    leadStatus: string;
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
  }) => Promise<void>;
  submittingLeadUpdate: boolean;
}

export const UpdateLeadModal: React.FC<UpdateLeadModalProps> = ({
  isOpen,
  onClose,
  activeLead,
  onSubmit,
  submittingLeadUpdate
}) => {
  const [updateLeadStatusStr, setUpdateLeadStatusStr] = useState('white');
  const [updateConfirmationStatusStr, setUpdateConfirmationStatusStr] = useState('pending');
  const [updateReminderH7, setUpdateReminderH7] = useState('');
  const [updateReminderH3, setUpdateReminderH3] = useState('');
  const [updateReminderH1, setUpdateReminderH1] = useState('');
  const [updateReminderHariH, setUpdateReminderHariH] = useState('');
  const [updateCallStatusStr, setUpdateCallStatusStr] = useState('NOT_CONTACTED');
  const [updateWhatsappStatusStr, setUpdateWhatsappStatusStr] = useState('NOT_SENT');
  const [updateEmailStatusStr, setUpdateEmailStatusStr] = useState('NOT_SENT');
  const [updateLeadNotes, setUpdateLeadNotes] = useState('');

  useEffect(() => {
    if (activeLead) {
      setUpdateLeadStatusStr(activeLead.leadStatus);
      setUpdateConfirmationStatusStr(activeLead.confirmationStatus || 'pending');
      setUpdateReminderH7(activeLead.reminderH7 || '');
      setUpdateReminderH3(activeLead.reminderH3 || '');
      setUpdateReminderH1(activeLead.reminderH1 || '');
      setUpdateReminderHariH(activeLead.reminderHariH || '');
      setUpdateCallStatusStr(activeLead.callStatus || 'NOT_CONTACTED');
      setUpdateWhatsappStatusStr(activeLead.whatsappStatus || 'NOT_SENT');
      setUpdateEmailStatusStr(activeLead.emailStatus || 'NOT_SENT');
      setUpdateLeadNotes(activeLead.notes || '');
    }
  }, [activeLead]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      leadStatus: updateLeadStatusStr,
      attendanceStatus: activeLead.attendanceStatus,
      notes: updateLeadNotes.trim(),
      callStatus: updateCallStatusStr,
      emailStatus: updateEmailStatusStr,
      whatsappStatus: updateWhatsappStatusStr,
      reminderH7: updateReminderH7,
      reminderH3: updateReminderH3,
      reminderH1: updateReminderH1,
      reminderHariH: updateReminderHariH,
      confirmationStatus: updateConfirmationStatusStr
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
          <h3 className="text-base font-extrabold text-slate-900">Lead Detail & Qualification</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Manage database: <strong className="text-slate-700">{activeLead.database.firstName} {activeLead.database.lastName}</strong> ({activeLead.database.company?.name || 'No Company'})
          </p>
        </div>

        <div className="space-y-3">
          {/* Profile Info */}
          <div className="bg-slate-55 p-2.5 rounded-xl border border-slate-150 text-[10px] grid grid-cols-4 gap-2 mb-2">
            <div>
              <span className="text-slate-400 font-bold block">Job Title</span>
              <p className="font-semibold text-slate-700 truncate">{activeLead.database.jobTitle || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Industry</span>
              <p className="font-semibold text-slate-700 truncate">{activeLead.database.company?.industry || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Mobile Phone</span>
              <p className="font-semibold text-slate-700 truncate">{activeLead.database.mobilePhone || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Email</span>
              <p className="font-semibold text-slate-700 truncate">{activeLead.database.emails?.[0]?.email || '-'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-1">Lead Qualification</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Tele Remarks (Status)
                </label>
                <select
                  value={updateLeadStatusStr}
                  onChange={(e) => setUpdateLeadStatusStr(e.target.value)}
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

              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <CheckCircle className="w-3 h-3 text-blue-500" />
                  Confirmation Status
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
                  <option value="unable_to_attend">Unable Attend</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <Phone className="w-3 h-3 text-sky-500" />
                  Call Status
                </label>
                <select
                  value={updateCallStatusStr}
                  onChange={(e) => setUpdateCallStatusStr(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                >
                  <option value="NOT_CONTACTED">Belum Telpon</option>
                  <option value="CONNECTED">Sudah Telpon</option>
                  <option value="NO_ANSWER">Tidak Diangkat</option>
                  <option value="BUSY">Sibuk</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <MessageSquare className="w-3 h-3 text-emerald-500" />
                  WhatsApp Status
                </label>
                <select
                  value={updateWhatsappStatusStr}
                  onChange={(e) => setUpdateWhatsappStatusStr(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                >
                  <option value="NOT_SENT">Belum WA</option>
                  <option value="SENT">Sudah WA</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                  <Mail className="w-3 h-3 text-amber-500" />
                  Email Status
                </label>
                <select
                  value={updateEmailStatusStr}
                  onChange={(e) => setUpdateEmailStatusStr(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                >
                  <option value="NOT_SENT">Belum Email</option>
                  <option value="SENT">Sudah Email</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Follow-up Notes</label>
              <textarea
                placeholder="Details on status update..."
                value={updateLeadNotes}
                onChange={(e) => setUpdateLeadNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 mt-4">
              <button
                type="submit"
                disabled={submittingLeadUpdate}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {submittingLeadUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save Qualification Info
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
