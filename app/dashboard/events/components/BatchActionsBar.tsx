import React from 'react';
import { Check, X } from 'lucide-react';
import { AppUser } from '../../../../lib/types';

interface BatchActionsBarProps {
  selectedParticipantIds: number[];
  setSelectedParticipantIds: (ids: number[]) => void;
  activeTab: string;
  usersList: AppUser[];
  handleBatchUpdateConfirmationStatus: (status: string) => void;
  handleBatchUpdateParticipantStatus: (status: string) => void;
  handleBatchAssignPic: (pic: string) => void;
  handleBatchUpdateReminderHariH: (status: string) => void;
}

export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
  selectedParticipantIds,
  setSelectedParticipantIds,
  activeTab,
  usersList,
  handleBatchUpdateConfirmationStatus,
  handleBatchUpdateParticipantStatus,
  handleBatchAssignPic,
  handleBatchUpdateReminderHariH,
}) => {
  if (selectedParticipantIds.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-100 rounded-2xl px-5 py-3.5 flex flex-row items-center justify-between flex-wrap gap-4 mb-6 shadow-[0_10px_25px_rgba(59,130,246,0.04)] animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center bg-blue-600 text-white font-bold text-xs w-6 h-6 rounded-full ring-4 ring-blue-100 shrink-0">
          {selectedParticipantIds.length}
        </span>
        <span className="text-xs font-extrabold text-slate-800 tracking-tight">Participants selected for batch update</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-3.5">
        {activeTab === 'request' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBatchUpdateConfirmationStatus('approve')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Approve Selected
            </button>
            <button
              onClick={() => handleBatchUpdateConfirmationStatus('decline')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              Take Out Selected
            </button>
          </div>
        )}

        {activeTab === 'pre_event' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Remarks</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchUpdateParticipantStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all duration-200"
              >
                <option value="">- Change Status -</option>
                <option value="not_respon_yet">Not respond yet</option>
                <option value="not_respond_2x">Not respond 2x</option>
                <option value="registered">Registered</option>
                <option value="tentative">Tentative</option>
                <option value="not_interest">Not Interest</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Confirmation</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchUpdateConfirmationStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all duration-200"
              >
                <option value="">- Change Confirmation -</option>
                <option value="pending">Pending</option>
                <option value="approve">Approve</option>
                <option value="decline">Decline</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Assign PIC</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchAssignPic(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all duration-200"
              >
                <option value="">- Choose PIC -</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.fullName || u.username}>
                    {u.fullName || u.username}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'reminder_dday' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hari H</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBatchUpdateReminderHariH(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all duration-200"
            >
              <option value="">- Change Dday Status -</option>
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
        )}

        <button
          onClick={() => setSelectedParticipantIds([])}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 active:bg-slate-300 text-slate-600 text-xs font-black rounded-xl border border-slate-200 transition-all duration-200"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
};
