import React from 'react';
import { Clock, X, Calendar, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { EventParticipant, AppUser } from '../../../../lib/types';
import { extractPicFromNotes } from '../utils/notesHelper';

interface EventStatisticsProps {
  activeTab: string;
  participants: EventParticipant[];
  usersList: AppUser[];
  isAdmin: boolean;
  adminName: string;
}

export const EventStatistics: React.FC<EventStatisticsProps> = ({
  activeTab,
  participants,
  usersList,
  isAdmin,
  adminName,
}) => {
  return (
    <>
      {activeTab === 'request' && (
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Request Vetting Overview</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50/40 border border-blue-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-500 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total Request</span>
                  <span className="text-xl font-extrabold text-blue-900">
                    {participants.filter(p => !p.confirmationStatus || p.confirmationStatus === 'pending' || p.confirmationStatus === 'decline').length}
                  </span>
                </div>
              </div>
              
              <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-amber-650 uppercase tracking-wider">Pending Approval</span>
                  <span className="text-xl font-extrabold text-amber-900">
                    {participants.filter(p => !p.confirmationStatus || p.confirmationStatus === 'pending').length}
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-500 text-white rounded-xl">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Taken Out (Decline)</span>
                  <span className="text-xl font-extrabold text-rose-900">
                    {participants.filter(p => p.confirmationStatus === 'decline').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pre_event' && (
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registration Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Register</span>
                  <span className="text-xl font-extrabold text-emerald-900">
                    {participants.filter(p => p.participantStatus === 'registered' || p.participantStatus === 'green').length}
                  </span>
                </div>
              </div>
              
              <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-amber-650 uppercase tracking-wider font-semibold">Interested (Follow-up)</span>
                  <span className="text-xl font-extrabold text-amber-900">
                    {participants.filter(p => p.participantStatus === 'tentative' || p.participantStatus === 'yellow').length}
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-500 text-white rounded-xl">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Not Interest</span>
                  <span className="text-xl font-extrabold text-rose-900">
                    {participants.filter(p => p.participantStatus === 'not_interest' || p.participantStatus === 'red').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirmation Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Approved</span>
                  <span className="text-xl font-extrabold text-emerald-900">
                    {participants.filter(p => p.confirmationStatus === 'approve').length}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-50/40 border border-blue-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-500 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider">Pending</span>
                  <span className="text-xl font-extrabold text-blue-900">
                    {participants.filter(p => !p.confirmationStatus || p.confirmationStatus === 'pending').length}
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-500 text-white rounded-xl">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Declined</span>
                  <span className="text-xl font-extrabold text-rose-900">
                    {participants.filter(p => p.confirmationStatus === 'decline').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reminder' && (
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reminder Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50/40 border border-blue-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-500 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider">Approved Register Total</span>
                  <span className="text-xl font-extrabold text-blue-900">
                    {participants.filter(p => p.confirmationStatus === 'approve' && (p.participantStatus === 'registered' || p.participantStatus === 'green')).length}
                  </span>
                </div>
              </div>
              
              <div className="bg-emerald-55/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Confirm to Attend</span>
                  <span className="text-xl font-extrabold text-emerald-900">
                    {participants.filter(p => p.reminderH7 === 'confirm' || p.reminderH3 === 'confirm' || p.reminderH1 === 'confirm').length}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-amber-650 uppercase tracking-wider font-semibold">Tentative</span>
                  <span className="text-xl font-extrabold text-amber-900">
                    {participants.filter(p => p.reminderH7 === 'tentative' || p.reminderH3 === 'tentative' || p.reminderH1 === 'tentative').length}
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-500 text-white rounded-xl">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Unable to Attend</span>
                  <span className="text-xl font-extrabold text-rose-900">
                    {participants.filter(p => p.reminderH7 === 'unable_to_attend' || p.reminderH3 === 'unable_to_attend' || p.reminderH1 === 'unable_to_attend').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reminder_dday' && (
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reminder D-Day Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">On Location</span>
                  <span className="text-xl font-extrabold text-emerald-900">
                    {participants.filter(p => p.reminderHariH === 'on_location').length}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-50/40 border border-blue-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-500 text-white rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider">On The Way</span>
                  <span className="text-xl font-extrabold text-blue-900">
                    {participants.filter(p => p.reminderHariH === 'on_the_way').length}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-amber-650 uppercase tracking-wider font-semibold">Not Respond Yet</span>
                  <span className="text-xl font-extrabold text-amber-900">
                    {participants.filter(p => !p.reminderHariH || p.reminderHariH === 'not_respon_yet').length}
                  </span>
                </div>
              </div>

              <div className="bg-rose-55/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-500 text-white rounded-xl">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Unable Attend</span>
                  <span className="text-xl font-extrabold text-rose-900">
                    {participants.filter(p => p.reminderHariH === 'unable_to_attend').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participant Assignment & Distribution Overview (Admin only) */}
      {isAdmin && activeTab !== 'request' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Participant Assignment & Distribution Overview</h4>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 bg-blue-600 border border-blue-700 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-sm">
              <Users className="w-3.5 h-3.5" />
              Total Participants: {participants.length}
            </div>
            {usersList.map((usr) => {
              const name = usr.fullName || usr.username;
              const count = participants.filter(p => {
                const pic = extractPicFromNotes(p.notes).pic;
                return pic.toLowerCase() === name.toLowerCase() || 
                       (pic.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
              }).length;
              return (
                <div key={usr.id} className={`px-3.5 py-2 border rounded-xl text-xs flex items-center gap-1.5 ${
                  count > 0 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-800 font-extrabold' 
                    : 'bg-white border-slate-200 text-slate-400 font-medium'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${count > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  {name}: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
