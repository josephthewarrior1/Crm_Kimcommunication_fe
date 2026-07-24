import React from 'react';
import { Clock, X, Calendar, CheckCircle, TrendingUp, Users, ArrowLeft, Plus, Search, UserMinus, History, Phone, Mail, MessageSquare, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { EventParticipant, AppUser } from '../../../../lib/types';
import { extractPicFromNotes } from '../utils/notesHelper';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from '../../../../components/ui/alert-dialog';

interface EventStatisticsProps {
  activeTab: string;
  participants: EventParticipant[];
  usersList: AppUser[];
  isAdmin: boolean;
  adminName: string;
  eventId?: number;
  onAssignPic?: (participantIds: number[], picName: string) => Promise<void>;
  onOpenEngagementModal?: (participant: EventParticipant) => void;
}

export const EventStatistics: React.FC<EventStatisticsProps> = ({
  activeTab,
  participants,
  usersList,
  isAdmin,
  adminName,
  eventId,
  onAssignPic,
  onOpenEngagementModal,
}) => {
  const [selectedPic, setSelectedPic] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [confirmConfig, setConfirmConfig] = React.useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Date Range Report States
  const [picViewTab, setPicViewTab] = React.useState<'report' | 'participants'>('report');
  const [datePreset, setDatePreset] = React.useState<'today' | '7days' | '30days' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activitiesReport, setActivitiesReport] = React.useState<any[]>([]);
  const [loadingReport, setLoadingReport] = React.useState(false);

  React.useEffect(() => {
    if (selectedPic && eventId) {
      loadActivitiesReport();
    }
  }, [selectedPic, eventId, startDate, endDate]);

  const loadActivitiesReport = async () => {
    if (!eventId) return;
    setLoadingReport(true);
    try {
      const data = await crmService.getAllEventActivities(eventId, startDate, endDate);
      setActivitiesReport(data || []);
    } catch (err) {
      console.error('Failed to load activity report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSetPreset = (preset: 'today' | '7days' | '30days' | 'all') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredPicActivities = React.useMemo(() => {
    if (!selectedPic) return [];
    return activitiesReport.filter(a => {
      const picName = a.createdBy || '';
      return picName.toLowerCase() === selectedPic.toLowerCase() ||
        (picName.toLowerCase() === 'admin' && selectedPic.toLowerCase() === adminName.toLowerCase());
    });
  }, [activitiesReport, selectedPic, adminName]);

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
                    {participants.filter(p => !p.confirmationStatus || p.confirmationStatus === 'pending' || p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined').length}
                  </span>
                </div>
              </div>
              
              <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending Approval</span>
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
                    {participants.filter(p => p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined').length}
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
                  <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider font-semibold">Interested (Follow-up)</span>
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
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registration Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Approved</span>
                  <span className="text-xl font-extrabold text-emerald-900">
                    {participants.filter(p => p.confirmationStatus === 'approve' || p.confirmationStatus === 'confirmed').length}
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
                    {participants.filter(p => p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'declined' && (
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Declined Participants Overview</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-600 text-white rounded-xl">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Declined</span>
                  <span className="text-xl font-extrabold text-rose-950">
                    {participants.filter(p => p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined').length}
                  </span>
                </div>
              </div>
              
              <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider">Declined from DB Vetting</span>
                  <span className="text-xl font-extrabold text-amber-950">
                    {participants.filter(p => (p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined')).length}
                  </span>
                </div>
              </div>

              <div className="bg-slate-100/60 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-slate-700 text-white rounded-xl">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider font-semibold">Taken Out (Decline)</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {participants.filter(p => p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined').length}
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
              
              <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
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
                  <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider font-semibold">Tentative</span>
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
                    {participants.filter(p => p.reminderHariH === 'on_location' || p.attendanceStatus?.toLowerCase() === 'attended').length}
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
                    {participants.filter(p => p.reminderHariH === 'on_the_way' && p.attendanceStatus?.toLowerCase() !== 'attended').length}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider font-semibold">Not Respond Yet</span>
                  <span className="text-xl font-extrabold text-amber-900">
                    {participants.filter(p => p.attendanceStatus?.toLowerCase() !== 'attended' && (!p.reminderHariH || p.reminderHariH === 'not_respon_yet')).length}
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">PIC Assignment & Distribution</h4>
              <p className="text-[11px] text-slate-555 font-medium">
                {(() => {
                  const activePicsCount = usersList.filter((usr) => {
                    const name = usr.fullName || usr.username;
                    return participants.some(p => {
                      const pic = extractPicFromNotes(p.notes).pic;
                      return pic.toLowerCase() === name.toLowerCase() || 
                             (pic.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
                    });
                  }).length;
                  return `${activePicsCount} PIC aktif bertugas`;
                })()}
              </p>
            </div>
          </div>

          <Dialog onOpenChange={(open) => { if (!open) { setSelectedPic(null); setSearchQuery(''); } }}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm flex items-center gap-2">
                <span>View PIC Workload & Balance</span>
              </button>
            </DialogTrigger>
            <DialogContent 
              onInteractOutside={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              className="sm:max-w-4xl max-h-[85vh] overflow-y-auto bg-white p-6 rounded-2xl border border-slate-200 text-slate-900"
            >
              <DialogHeader>
                <DialogTitle className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  PIC Assignment & Distribution
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Alokasi pembagian tugas follow-up antar PIC aktif.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {selectedPic ? (
                  <div className="space-y-4">
                    {/* Header/Back button */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                      <button 
                        onClick={() => { setSelectedPic(null); setSearchQuery(''); setPicViewTab('report'); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider font-semibold cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Daftar PIC
                      </button>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PIC Terpilih</span>
                        <h4 className="text-sm font-black text-slate-900">{selectedPic}</h4>
                      </div>
                    </div>

                    {/* Sub-tab Switcher for Selected PIC */}
                    <div className="flex items-center gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setPicViewTab('report')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          picViewTab === 'report' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <History className="w-4 h-4 text-blue-400" />
                        <span>Daily Report (Telemarketing Logs)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPicViewTab('participants')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          picViewTab === 'participants' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Kelola Peserta ({participants.filter(p => {
                          const pic = extractPicFromNotes(p.notes).pic;
                          return pic.toLowerCase() === selectedPic.toLowerCase() || 
                                 (pic.toLowerCase() === 'admin' && selectedPic.toLowerCase() === adminName.toLowerCase());
                        }).length})</span>
                      </button>
                    </div>

                    {picViewTab === 'report' ? (
                      /* Daily Telemarketing & Activity Report Bar */
                      <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800 shadow-xl mb-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                                <History className="w-4 h-4" />
                              </span>
                              <h5 className="text-xs font-black uppercase tracking-wider text-white">
                                Daily Telemarketing Report — <span className="text-blue-400">{selectedPic}</span>
                              </h5>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                              Laporan lengkap aktivitas telepon, WhatsApp, dan email yang dikerjakan oleh PIC {selectedPic}.
                            </p>
                          </div>

                          {/* Date Range Presets */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetPreset('today')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${datePreset === 'today' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                              Hari Ini (Today)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPreset('7days')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${datePreset === '7days' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                              7 Hari Terakhir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPreset('30days')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${datePreset === '30days' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                              30 Hari
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPreset('all')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${datePreset === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                              Semua
                            </button>
                          </div>
                        </div>

                        {/* Custom Date Pickers & Metrics */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2 flex-wrap bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Filter Date:</span>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                              className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-mono"
                            />
                            <span className="text-slate-500 font-bold">s/d</span>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                              className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-mono"
                            />
                            {loadingReport && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                          </div>

                          {/* Activity Metrics Badges */}
                          {(() => {
                            const callsCount = filteredPicActivities.filter(a => (a.activityType || '').toUpperCase() === 'CALL').length;
                            const waCount = filteredPicActivities.filter(a => (a.activityType || '').toUpperCase() === 'WHATSAPP').length;
                            const emailCount = filteredPicActivities.filter(a => (a.activityType || '').toUpperCase() === 'EMAIL').length;
                            const totalActivities = filteredPicActivities.length;

                            return (
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="bg-blue-500/10 border border-blue-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-blue-400" />
                                  <span className="text-[11px] text-slate-300 font-semibold">Telepon:</span>
                                  <strong className="text-base font-black text-blue-400">{callsCount}</strong>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                                  <span className="text-[11px] text-slate-300 font-semibold">WhatsApp:</span>
                                  <strong className="text-base font-black text-emerald-400">{waCount}</strong>
                                </div>
                                <div className="bg-purple-500/10 border border-purple-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-purple-400" />
                                  <span className="text-[11px] text-slate-300 font-semibold">Email:</span>
                                  <strong className="text-base font-black text-purple-400">{emailCount}</strong>
                                </div>
                                <div className="bg-blue-600 px-4 py-1.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-600/30">
                                  <span className="text-[11px] text-white/90">Total Activity:</span>
                                  <strong className="text-base font-black text-white">{totalActivities}</strong>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Activity History Stream Details */}
                        <div className="pt-2">
                          <div className="flex justify-between items-center mb-2">
                            <h6 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <span>Riwayat Log Telemarketing Dalam Periode Ini ({filteredPicActivities.length})</span>
                            </h6>
                          </div>

                          {filteredPicActivities.length === 0 ? (
                            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 text-center">
                              <p className="text-xs text-slate-400 italic">Belum ada aktivitas telepon, WA, atau email yang tercatat pada periode ini.</p>
                            </div>
                          ) : (
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                              {filteredPicActivities.map((act) => {
                                const timeStr = act.createdAt ? new Date(act.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
                                const type = (act.activityType || '').toUpperCase();
                                
                                let targetName = act.participantName;
                                let targetCompany = act.companyName;
                                let targetPhone = act.mobilePhone;

                                if (!targetName && act.eventParticipant?.database) {
                                  targetName = `${act.eventParticipant.database.firstName || ''} ${act.eventParticipant.database.lastName || ''}`.trim();
                                  targetCompany = act.eventParticipant.database.company?.name;
                                  targetPhone = act.eventParticipant.database.mobilePhone;
                                }

                                return (
                                  <div key={act.id} className="bg-slate-800/70 border border-slate-700/70 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-600 transition-colors">
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className={`p-2 rounded-xl shrink-0 ${
                                        type === 'CALL' ? 'bg-blue-500/20 text-blue-400' :
                                        type === 'WHATSAPP' ? 'bg-emerald-500/20 text-emerald-400' :
                                        'bg-purple-500/20 text-purple-400'
                                      }`}>
                                        {type === 'CALL' && <Phone className="w-4 h-4" />}
                                        {type === 'WHATSAPP' && <MessageSquare className="w-4 h-4" />}
                                        {type === 'EMAIL' && <Mail className="w-4 h-4" />}
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider ${
                                            type === 'CALL' ? 'bg-blue-500/30 text-blue-300' :
                                            type === 'WHATSAPP' ? 'bg-emerald-500/30 text-emerald-300' :
                                            'bg-purple-500/30 text-purple-300'
                                          }`}>
                                            {type}
                                          </span>
                                          <h6 className="text-xs font-bold text-white truncate">
                                            {targetName || 'Peserta Event'}
                                          </h6>
                                          {targetCompany && (
                                            <span className="text-[10px] text-slate-400 font-medium truncate">
                                              • {targetCompany}
                                            </span>
                                          )}
                                          {targetPhone && (
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ({targetPhone})
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-300 mt-1 italic bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/60">
                                          "{act.notes || 'Activity logged'}"
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0 self-end sm:self-center">
                                      <span className="text-[10px] text-slate-400 font-mono block">
                                        {timeStr}
                                      </span>
                                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-500/20">
                                        {act.status || 'COMPLETED'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[55vh]">
                      {/* Left Column: Managed Participants */}
                      {(() => {
                        const picParticipants = participants.filter(p => {
                          const pic = extractPicFromNotes(p.notes).pic;
                          return pic.toLowerCase() === selectedPic.toLowerCase() || 
                                 (pic.toLowerCase() === 'admin' && selectedPic.toLowerCase() === adminName.toLowerCase());
                        });

                        return (
                          <div className="flex flex-col border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 overflow-hidden">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Daftar Peserta ({picParticipants.length})
                              </h5>
                              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                Dikelola PIC Ini
                              </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                              {picParticipants.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-center p-4">
                                  <p className="text-xs text-slate-400 italic">Belum ada peserta yang ditugaskan ke PIC ini.</p>
                                </div>
                              ) : (
                                picParticipants.map(p => {
                                  const name = `${p.database.firstName} ${p.database.lastName}`.trim();
                                  const company = p.database.company?.name || '-';
                                  const phone = p.database.mobilePhone || '-';
                                  return (
                                    <div key={p.id} className="bg-white border border-slate-200/70 p-3 rounded-xl shadow-sm flex items-center justify-between gap-3 group/item">
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">
                                          {company} • {phone}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                            p.confirmationStatus === 'approve' || p.confirmationStatus === 'confirmed' 
                                              ? 'bg-emerald-50 text-emerald-700' 
                                              : p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined'
                                                ? 'bg-rose-50 text-rose-700'
                                                : 'bg-amber-50 text-amber-700'
                                          }`}>
                                            {p.confirmationStatus === 'approve' || p.confirmationStatus === 'confirmed' ? 'Approve' : p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined' ? 'Declined' : 'Pending'}
                                          </span>
                                          {p.participantStatus?.toLowerCase() === 'registered' && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                              Registered
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {onOpenEngagementModal && (
                                          <button
                                            onClick={() => onOpenEngagementModal(p)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                            title="Lihat Telemarketing Logs (Call, Email, WA)"
                                          >
                                            <History className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {onAssignPic && (
                                          <button
                                            onClick={async () => {
                                              await onAssignPic([p.id], 'not set');
                                            }}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                            title="Hapus dari PIC ini"
                                          >
                                            <UserMinus className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Right Column: Add Participants */}
                      {(() => {
                        const otherParticipants = participants.filter(p => {
                          const pic = extractPicFromNotes(p.notes).pic;
                          const isThisPic = pic.toLowerCase() === selectedPic.toLowerCase() || 
                                            (pic.toLowerCase() === 'admin' && selectedPic.toLowerCase() === adminName.toLowerCase());
                          return !isThisPic;
                        });

                        const filteredOthers = otherParticipants.filter(p => {
                          const q = searchQuery.toLowerCase();
                          const name = `${p.database.firstName} ${p.database.lastName}`.toLowerCase();
                          const company = (p.database.company?.name || '').toLowerCase();
                          const phone = (p.database.mobilePhone || '').toLowerCase();
                          const email = (p.database.emails?.[0]?.email || '').toLowerCase();
                          return (
                            name.includes(q) ||
                            company.includes(q) ||
                            phone.includes(q) ||
                            email.includes(q)
                          );
                        });

                        return (
                          <div className="flex flex-col border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 overflow-hidden">
                            <div className="mb-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Tugaskan Peserta Baru
                                </h5>
                                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                                  Tambah
                                </span>
                              </div>
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Cari nama, perusahaan, telepon..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-slate-900 transition-colors"
                                />
                              </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                              {filteredOthers.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-center p-4">
                                  <p className="text-xs text-slate-400 italic">Tidak ada peserta lain yang ditemukan.</p>
                                </div>
                              ) : (
                                filteredOthers.map(p => {
                                  const name = `${p.database.firstName} ${p.database.lastName}`.trim();
                                  const company = p.database.company?.name || '-';
                                  const currentPicName = extractPicFromNotes(p.notes).pic;
                                  const isUnassigned = !currentPicName || currentPicName.trim() === '' || currentPicName.toLowerCase() === 'not set';
                                  return (
                                    <div key={p.id} className="bg-white border border-slate-200/70 p-3 rounded-xl shadow-sm flex items-center justify-between gap-3 group/item">
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]">
                                            {company}
                                          </span>
                                          <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                            isUnassigned 
                                              ? 'bg-slate-100 text-slate-500' 
                                              : 'bg-amber-50 text-amber-600 border border-amber-100/20'
                                          }`}>
                                            {isUnassigned ? 'Belum Dialokasi' : `PIC: ${currentPicName}`}
                                          </span>
                                        </div>
                                      </div>
                                      {onAssignPic && (
                                        <button
                                          onClick={async () => {
                                            await onAssignPic([p.id], selectedPic);
                                          }}
                                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold transition-all duration-150 border border-emerald-100/30 shrink-0"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Add</span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                  <>
                    {/* Auto Distribution Control Panel */}
                    {onAssignPic && (
                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">Alokasi Cepat (Auto-Distribute)</h5>
                          <p className="text-[10px] text-slate-500">Bagi rata tugas follow-up secara otomatis ke seluruh staff PIC aktif.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              const unassigned = participants.filter(p => {
                                const notes = p.notes || '';
                                if (!notes.includes('[PIC:')) return true; // Unassigned lead!
                                const picName = extractPicFromNotes(notes).pic;
                                return !picName || picName.trim() === '' || picName.toLowerCase() === 'not set';
                              });
                              if (unassigned.length === 0) {
                                toast.info('Semua peserta sudah memiliki PIC!');
                                return;
                              }

                              setConfirmConfig({
                                title: "Konfirmasi Bagi Rata Sisa",
                                description: `Apakah Anda yakin ingin membagi ${unassigned.length} peserta sisa (belum ada PIC) ke seluruh PIC secara merata?`,
                                onConfirm: async () => {
                                  const targetPics = usersList.length > 0 ? usersList : [{ username: adminName, fullName: adminName }];
                                  const groupings: { [picName: string]: number[] } = {};
                                  targetPics.forEach(u => groupings[u.fullName || u.username] = []);
                                  unassigned.forEach((lead, idx) => {
                                    const pic = targetPics[idx % targetPics.length];
                                    groupings[pic.fullName || pic.username].push(lead.id);
                                  });
                                  for (const picName of Object.keys(groupings)) {
                                    if (groupings[picName].length > 0) await onAssignPic(groupings[picName], picName);
                                  }
                                  toast.success(`Berhasil membagi rata ${unassigned.length} peserta ke ${targetPics.length} PIC!`);
                                }
                              });
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all duration-150 shadow-sm cursor-pointer"
                          >
                            Bagi Rata Sisa Peserta
                          </button>
                          <button
                            onClick={async () => {
                              if (participants.length === 0) return;

                              setConfirmConfig({
                                title: "Peringatan Bagi Ulang Semua",
                                description: `PERINGATAN: Apakah Anda yakin ingin membagi ulang SEMUA ${participants.length} peserta secara merata? Tindakan ini akan mengocok ulang alokasi PIC.`,
                                onConfirm: async () => {
                                  const targetPics = usersList.length > 0 ? usersList : [{ username: adminName, fullName: adminName }];
                                  const groupings: { [picName: string]: number[] } = {};
                                  targetPics.forEach(u => groupings[u.fullName || u.username] = []);
                                  participants.forEach((lead, idx) => {
                                    const pic = targetPics[idx % targetPics.length];
                                    groupings[pic.fullName || pic.username].push(lead.id);
                                  });
                                  for (const picName of Object.keys(groupings)) {
                                    if (groupings[picName].length > 0) await onAssignPic(groupings[picName], picName);
                                  }
                                  toast.success(`Berhasil membagi ulang seluruh ${participants.length} peserta ke ${targetPics.length} PIC!`);
                                }
                              });
                            }}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all duration-150 shadow-sm"
                          >
                            Bagi Ulang Semua Peserta
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Allocation Balance Stacked Bar */}
                    {(() => {
                      const activePics = usersList.map((usr) => {
                        const name = usr.fullName || usr.username;
                        const count = participants.filter(p => {
                          const pic = extractPicFromNotes(p.notes).pic;
                          return pic.toLowerCase() === name.toLowerCase() || 
                                 (pic.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
                        }).length;
                        return { usr, name, count };
                      }).filter(item => item.count > 0);

                      const totalAssigned = activePics.reduce((sum, item) => sum + item.count, 0);
                      
                      const colors = [
                        'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
                        'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500'
                      ];

                      return (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                            <span>Allocation Balance</span>
                            <span className="text-slate-700 font-extrabold">{totalAssigned} / {participants.length} Assigned ({Math.round((totalAssigned / Math.max(1, participants.length)) * 100)}%)</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
                            {activePics.map((pic, idx) => {
                              const percentage = (pic.count / Math.max(1, participants.length)) * 100;
                              return (
                                <div
                                  key={pic.usr.id}
                                  className={`${colors[idx % colors.length]} transition-all duration-300 h-full`}
                                  style={{ width: `${percentage}%` }}
                                  title={`${pic.name}: ${pic.count} (${Math.round(percentage)}%)`}
                                />
                              );
                            })}
                            {participants.length > totalAssigned && (
                              <div
                                className="bg-slate-200 h-full"
                                style={{ width: `${((participants.length - totalAssigned) / participants.length) * 100}%` }}
                                title={`Unassigned: ${participants.length - totalAssigned}`}
                              />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                            {activePics.map((pic, idx) => (
                              <div key={pic.usr.id} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                                <span className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                                <span>{pic.name}</span>
                                <span className="text-slate-400 font-normal">({pic.count})</span>
                              </div>
                            ))}
                            {participants.length > totalAssigned && (
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                <span>Belum Dialokasi</span>
                                <span className="text-slate-400 font-normal">({participants.length - totalAssigned})</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Workload Cards Grid */}
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">PIC Active Workloads</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(() => {
                          const unassignedIds = participants.filter(p => {
                            const picName = extractPicFromNotes(p.notes).pic;
                            if (!picName || picName.trim() === '' || picName.toLowerCase() === 'not set') return true;
                            const isMatched = usersList.some(usr => {
                              const name = usr.fullName || usr.username;
                              return picName.toLowerCase() === name.toLowerCase() ||
                                     (picName.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
                            });
                            return !isMatched;
                          }).map(p => p.id);

                          const activePics = usersList.map((usr) => {
                            const name = usr.fullName || usr.username;
                            
                            const picParticipants = participants.filter(p => {
                              const pic = extractPicFromNotes(p.notes).pic;
                              return pic.toLowerCase() === name.toLowerCase() || 
                                     (pic.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
                            });
                            const count = picParticipants.length;

                            return { usr, name, count };
                          }).filter(item => item.usr.username !== 'admin' || item.count > 0);

                          if (activePics.length === 0) {
                            return (
                              <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                <p className="text-xs text-slate-400 italic">Belum ada PIC yang aktif bertugas</p>
                              </div>
                            );
                          }

                          return activePics.map(({ usr, name, count }) => {
                            const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '??';
                            
                            const picParticipants = participants.filter(p => {
                              const pic = extractPicFromNotes(p.notes).pic;
                              return pic.toLowerCase() === name.toLowerCase() || 
                                     (pic.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
                            });

                            const approveCount = picParticipants.filter(p => p.confirmationStatus === 'approve' || p.confirmationStatus === 'confirmed').length;
                            const pendingCount = picParticipants.filter(p => p.confirmationStatus === 'pending' || !p.confirmationStatus).length;
                            const declineCount = picParticipants.filter(p => p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined').length;
                            const registeredCount = picParticipants.filter(p => p.participantStatus?.toLowerCase() === 'registered').length;

                            return (
                              <div
                                key={usr.id}
                                onClick={() => setSelectedPic(name)}
                                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                              >
                                <div>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 min-w-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-black text-slate-900 truncate" title={name}>{name}</h4>
                                        <span className="text-[10px] text-slate-400 capitalize font-semibold block truncate">
                                          {usr.roles?.[0]?.replace('ROLE_', '') || 'PIC'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/30 self-start sm:self-center shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="text-[8px] font-black text-emerald-700 uppercase">Active</span>
                                    </div>
                                  </div>

                                  {/* Assigned Progress */}
                                  <div className="mb-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                                      <span>Total Assigned</span>
                                      <span className="text-slate-900 font-black">{count} Peserta</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                                        style={{ width: `${Math.min(100, (count / Math.max(1, participants.length)) * 100)}%` }} 
                                      />
                                    </div>
                                  </div>

                                  {/* Registration Status Breakdown Grid */}
                                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100 mb-3">
                                    <div className="text-center p-1.5 bg-emerald-50/60 border border-emerald-100/50 rounded-lg">
                                      <span className="block text-[9px] font-extrabold text-emerald-700 uppercase">Approve</span>
                                      <span className="text-xs font-black text-emerald-800">{approveCount}</span>
                                    </div>
                                    <div className="text-center p-1.5 bg-amber-50/60 border border-amber-100/50 rounded-lg">
                                      <span className="block text-[9px] font-extrabold text-amber-700 uppercase">Pending</span>
                                      <span className="text-xs font-black text-amber-800">{pendingCount}</span>
                                    </div>
                                    <div className="text-center p-1.5 bg-rose-50/60 border border-rose-100/50 rounded-lg">
                                      <span className="block text-[9px] font-extrabold text-rose-700 uppercase">Declined</span>
                                      <span className="text-xs font-black text-rose-800">{declineCount}</span>
                                    </div>
                                  </div>

                                  {/* Telemarketing Remarks Summary Pill */}
                                  <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 bg-blue-50/40 rounded-xl border border-blue-100/40 text-slate-600 font-semibold mb-1">
                                    <span>Telemarketing Registered:</span>
                                    <span className="font-black text-blue-700">{registeredCount} Peserta</span>
                                  </div>

                                  {/* Dedicated Action Buttons on PIC Card */}
                                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPic(name);
                                        setPicViewTab('report');
                                      }}
                                      className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 border border-blue-100/60 cursor-pointer shadow-2xs"
                                    >
                                      <History className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Lihat Daily Log</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPic(name);
                                        setPicViewTab('participants');
                                      }}
                                      className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <Users className="w-3.5 h-3.5 text-slate-300" />
                                      <span>Kelola Peserta</span>
                                    </button>
                                  </div>
                                </div>

                                {onAssignPic && unassignedIds.length > 0 && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setConfirmConfig({
                                        title: "Konfirmasi Penugasan Peserta",
                                        description: `Apakah Anda yakin ingin menugaskan ${unassignedIds.length} sisa peserta ke ${name}?`,
                                        onConfirm: async () => {
                                          await onAssignPic(unassignedIds, name);
                                        }
                                      });
                                    }}
                                    className="w-full mt-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold transition-all duration-150 shadow-xs cursor-pointer"
                                  >
                                    Tugaskan {unassignedIds.length} Sisa Ke {name.split(' ')[0]}
                                  </button>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {confirmConfig && (
        <AlertDialog open={!!confirmConfig} onOpenChange={(open) => { if (!open) setConfirmConfig(null); }}>
          <AlertDialogContent className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {confirmConfig.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500 font-medium mt-1">
                {confirmConfig.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 flex gap-2 justify-end">
              <AlertDialogCancel className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Konfirmasi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

