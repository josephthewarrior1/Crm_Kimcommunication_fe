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
    <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-sm animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center bg-blue-600 text-white font-bold text-xs w-6 h-6 rounded-full shrink-0">
          {selectedParticipantIds.length}
        </span>
        <span className="text-xs font-bold text-slate-700">Participants selected for batch update</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
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
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Remarks</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchUpdateParticipantStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">- Change Status -</option>
                <option value="not_respon_yet">Not respond yet</option>
                <option value="not_respond_2x">Not respond 2x</option>
                <option value="registered">Registered</option>
                <option value="tentative">Tentative</option>
                <option value="not_interest">Not Interest</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Confirmation</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchUpdateConfirmationStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">- Change Confirmation -</option>
                <option value="pending">Pending</option>
                <option value="approve">Approve</option>
                <option value="decline">Decline</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Assign PIC</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchAssignPic(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
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
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Hari H</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBatchUpdateReminderHariH(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">- Change Dday Status -</option>
              <option value="on_location">On Location</option>
              <option value="on_the_way">On The Way</option>
              <option value="not_respon_yet">Not Respond Yet</option>
              <option value="unable_to_attend">Unable Attend</option>
            </select>
          </div>
        )}

        <button
          onClick={() => setSelectedParticipantIds([])}
          className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 font-semibold"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
};
