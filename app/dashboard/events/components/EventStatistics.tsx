import React from 'react';
import { Clock, X, Calendar, CheckCircle, TrendingUp, Users, ArrowLeft, Plus, Search, UserMinus, History, Phone, Mail, MessageSquare, Loader2, Calendar as CalendarIcon, Sliders } from 'lucide-react';
import { EventParticipant, AppUser } from '../../../../lib/types';
import { extractPicFromNotes, getPreEventApprovalStatus } from '../utils/notesHelper';
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
  currentUser?: AppUser | null;
  isViewer?: boolean;
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
  currentUser,
  isViewer = false,
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

  // Auto Split Selected PICs States
  const [isSplitModalOpen, setIsSplitModalOpen] = React.useState(false);
  const [selectedSplitPics, setSelectedSplitPics] = React.useState<string[]>([]);
  const [splitMode, setSplitMode] = React.useState<'all' | 'unassigned'>('all');

  const toggleSplitPic = (picName: string) => {
    setSelectedSplitPics(prev => 
      prev.includes(picName) ? prev.filter(p => p !== picName) : [...prev, picName]
    );
  };

  const handleExecuteSplitSelected = async () => {
    if (selectedSplitPics.length === 0) {
      toast.error('Silakan pilih minimal 1 PIC untuk pembagian peserta');
      return;
    }

    if (eventId) {
      try {
        await crmService.syncEmsParticipants(eventId);
      } catch (err) {
        console.warn('Auto EMS Sync during split warning:', err);
      }
    }

    let targetList = participants;
    if (activeTab === 'request') {
      targetList = participants.filter(p => {
        const notes = p.notes || '';
        const isEms = notes.includes('[Origin: EMS Sync]') || notes.includes('[EMS]');
        const isPublicEms = isEms && !p.confirmationStatus;
        return !isPublicEms;
      });
    }

    if (splitMode === 'unassigned') {
      targetList = targetList.filter(p => {
        const notes = p.notes || '';
        if (!notes.includes('[PIC:')) return true;
        const picName = extractPicFromNotes(notes).pic;
        return !picName || picName.trim() === '' || picName.toLowerCase() === 'not set';
      });
    }

    if (targetList.length === 0) {
      toast.info('Tidak ada peserta yang memenuhi kriteria pembagian');
      return;
    }

    const groupings: { [picName: string]: number[] } = {};
    selectedSplitPics.forEach(pic => groupings[pic] = []);

    targetList.forEach((p, idx) => {
      const assignedPic = selectedSplitPics[idx % selectedSplitPics.length];
      groupings[assignedPic].push(p.id);
    });

    if (onAssignPic) {
      for (const picName of Object.keys(groupings)) {
        if (groupings[picName].length > 0) {
          await onAssignPic(groupings[picName], picName);
        }
      }
    }

    toast.success(`Berhasil membagi rata ${targetList.length} peserta ke ${selectedSplitPics.length} PIC terpilih (${selectedSplitPics.join(', ')})!`);
    setIsSplitModalOpen(false);
  };

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
    const targetPicName = selectedPic || currentUser?.fullName || currentUser?.username || adminName;
    if (!targetPicName) return [];
    
    const selLower = targetPicName.toLowerCase().trim();
    const validPicNames = new Set<string>();
    validPicNames.add(selLower);

    if (currentUser) {
      if (currentUser.username) validPicNames.add(currentUser.username.toLowerCase().trim());
      if (currentUser.fullName) validPicNames.add(currentUser.fullName.toLowerCase().trim());
    }

    // Look up user in usersList to match both username and fullName
    const matchedUser = usersList.find(u => 
      (u.fullName || '').toLowerCase().trim() === selLower ||
      (u.username || '').toLowerCase().trim() === selLower
    );
    if (matchedUser) {
      if (matchedUser.fullName) validPicNames.add(matchedUser.fullName.toLowerCase().trim());
      if (matchedUser.username) validPicNames.add(matchedUser.username.toLowerCase().trim());
    }

    if (selLower === 'admin' || selLower === (adminName || '').toLowerCase().trim()) {
      validPicNames.add('admin');
      if (adminName) validPicNames.add(adminName.toLowerCase().trim());
    }

    return activitiesReport.filter(a => {
      const creator = (a.createdBy || '').toLowerCase().trim();
      if (creator && validPicNames.has(creator)) return true;

      // Also check participant PIC from notes if creator was admin or matched user
      if (a.eventParticipant?.notes) {
        const participantPic = extractPicFromNotes(a.eventParticipant.notes).pic.toLowerCase().trim();
        if (participantPic && validPicNames.has(participantPic)) return true;
      }

      return false;
    });
  }, [activitiesReport, selectedPic, currentUser, adminName, usersList]);

  const normalizeStatus = (str?: string) => {
    if (!str) return '';
    const normalized = str.toLowerCase().trim().replace(/[\s_-]+/g, '');
    return normalized === 'null' || normalized === 'undefined' ? '' : normalized;
  };

  const getLatestReminderStatus = (p: typeof participants[0]) => {
    const norm = [p.reminderH1, p.reminderH3, p.reminderH7]
      .map(normalizeStatus)
      .find(Boolean) || '';

    if (norm === 'confirm' || norm === 'confirmed') return 'confirm';
    if (norm === 'tentative') return 'tentative';
    if (norm === 'unabletoattend' || norm === 'notinterest' || norm === 'unableattend' || norm === 'decline' || norm === 'declined') return 'unable_to_attend';
    return 'not_respond_yet';
  };

  const cleanStatusValue = (value?: string | null) => {
    if (!value || value === 'null' || value === 'undefined') return '';
    return value.toLowerCase();
  };

  const getHariHStatus = (p: typeof participants[0]) => {
    const attendance = cleanStatusValue(p.attendanceStatus);
    if (attendance === 'attended') return 'on_location';
    return cleanStatusValue(p.reminderHariH);
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Register</span>
                  <span className="text-xl font-extrabold text-emerald-900">
                    {participants.filter(p => {
                      const ps = (p.participantStatus || '').toLowerCase();
                      const att = (p.attendanceStatus || '').toLowerCase();
                      return ps === 'registered' || ps === 'green' || ps === 'confirm' || ps === 'confirmed' || att === 'registered';
                    }).length}
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
                    {participants.filter(p => p.participantStatus === 'tentative' || p.participantStatus === 'yellow').length}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-slate-600 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider font-semibold">Not Respond Yet</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {participants.filter(p => {
                      const ps = (p.participantStatus || '').toLowerCase();
                      return !ps || ps === 'not_respond_yet' || ps === 'not_respon_yet' || ps.startsWith('not_respond_');
                    }).length}
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
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pre Event Approval</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Approve</span>
                  <span className="text-xl font-extrabold text-emerald-900">
                    {participants.filter(p => getPreEventApprovalStatus(p) === 'approve').length}
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
                    {participants.filter(p => getPreEventApprovalStatus(p) === 'pending').length}
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
                    {participants.filter(p => p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined' || getPreEventApprovalStatus(p) === 'decline').length}
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
                  <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider font-semibold">Declined from Pre-Event</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {participants.filter(p => getPreEventApprovalStatus(p) === 'decline').length}
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
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="bg-blue-50/40 border border-blue-100/70 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-500 text-white rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider">Approved Register Total</span>
                  <span className="text-xl font-extrabold text-blue-900">
                    {participants.filter(p => {
                      const ps = (p.participantStatus || '').toLowerCase();
                      const att = (p.attendanceStatus || '').toLowerCase();
                      const conf = (p.confirmationStatus || '').toLowerCase();
                      const isConfApprove = conf === 'approve' || conf === 'confirmed';
                      const isReg = ps === 'registered' || ps === 'green' || ps === 'confirm' || ps === 'confirmed' || att === 'registered';
                      return isConfApprove && isReg;
                    }).length}
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
                    {participants.filter(p => getLatestReminderStatus(p) === 'confirm').length}
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
                    {participants.filter(p => getLatestReminderStatus(p) === 'tentative').length}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-slate-600 text-white rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider font-semibold">Not Respond Yet</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {participants.filter(p => getLatestReminderStatus(p) === 'not_respond_yet').length}
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
                    {participants.filter(p => getLatestReminderStatus(p) === 'unable_to_attend').length}
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
                    {participants.filter(p => getHariHStatus(p) === 'on_location').length}
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
                    {participants.filter(p => getHariHStatus(p) === 'on_the_way').length}
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
                    {participants.filter(p => {
                      const status = getHariHStatus(p);
                      return !status || status === 'not_respon_yet' || status.startsWith('not_respond_');
                    }).length}
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
                    {participants.filter(p => getHariHStatus(p) === 'unable_to_attend').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participant Assignment & Distribution Overview */}
      {activeTab !== 'request' && !isViewer && (() => {
        const myPicName = currentUser?.fullName || currentUser?.username || adminName;

        return (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                {isAdmin ? <Users className="w-5 h-5" /> : <History className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  {isAdmin ? 'PIC Assignment & Distribution' : 'Log Aktivitas Saya Hari Ini'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isAdmin ? (() => {
                    const activePicsCount = usersList.filter((usr) => {
                      const uname = (usr.username || '').toLowerCase();
                      const fname = (usr.fullName || '').toLowerCase();
                      if (uname === 'kevin' || fname.includes('kevin')) return false;
                      const name = usr.fullName || usr.username;
                      return participants.some(p => {
                        const pic = extractPicFromNotes(p.notes).pic;
                        return pic.toLowerCase() === name.toLowerCase() || 
                               (pic.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
                      });
                    }).length;
                    return `${activePicsCount} PIC aktif bertugas`;
                  })() : `Ringkasan aktivitas telepon, WA, dan email yang dikerjakan oleh ${myPicName}`}
                </p>
              </div>
            </div>

            <Dialog onOpenChange={(open) => {
              if (open) {
                if (!isAdmin) {
                  setSelectedPic(myPicName);
                  handleSetPreset('today');
                  setPicViewTab('report');
                }
                loadActivitiesReport();
              } else {
                if (isAdmin) setSelectedPic(null);
                setSearchQuery('');
              }
            }}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm flex items-center gap-2 cursor-pointer">
                  <History className="w-4 h-4 text-blue-300" />
                  <span>{isAdmin ? 'View PIC Workload & Balance' : 'Lihat Log Aktivitas Saya'}</span>
                </button>
              </DialogTrigger>
              <DialogContent 
                onInteractOutside={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                className="sm:max-w-4xl max-h-[85vh] overflow-y-auto bg-white p-6 rounded-2xl border border-slate-200 text-slate-900"
              >
                <DialogHeader>
                  <DialogTitle className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {isAdmin ? 'PIC Assignment & Distribution' : `Laporan Aktivitas Follow-Up — ${myPicName}`}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    {isAdmin ? 'Alokasi pembagian tugas follow-up antar PIC aktif.' : 'Riwayat aktivitas telepon, WhatsApp, dan email yang kamu kerjakan hari ini.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {selectedPic ? (
                    <div className="space-y-4">
                      {/* Header/Back button */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                        {isAdmin ? (
                          <button 
                            onClick={() => { setSelectedPic(null); setSearchQuery(''); setPicViewTab('report'); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider font-semibold cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Kembali ke Daftar PIC
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                              <History className="w-4 h-4" />
                            </span>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Laporan Work Log Saya</span>
                          </div>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PIC Terpilih</span>
                          <h4 className="text-sm font-black text-slate-900">{selectedPic}</h4>
                        </div>
                      </div>

                      {/* Sub-tab Switcher for Selected PIC */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => setPicViewTab('report')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              picViewTab === 'report' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <History className="w-4 h-4 text-blue-100" />
                            <span>Daily Report (Telemarketing Logs)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPicViewTab('participants')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              picViewTab === 'participants' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Users className="w-4 h-4 text-emerald-100" />
                            <span>Kelola Peserta ({participants.filter(p => {
                              const pic = extractPicFromNotes(p.notes).pic;
                              return pic.toLowerCase() === selectedPic.toLowerCase() || 
                                     (pic.toLowerCase() === 'admin' && selectedPic.toLowerCase() === adminName.toLowerCase());
                            }).length})</span>
                          </button>
                        </div>
                      )}

                    {picViewTab === 'report' ? (
                      /* Daily Telemarketing & Activity Report Bar */
                      <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs mb-4">
                        {/* Header & Controls Toolbar */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/80 shrink-0">
                              <History className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
                                Daily Telemarketing Report — <span className="text-blue-600">{selectedPic}</span>
                              </h5>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                Laporan lengkap aktivitas telepon, WhatsApp, dan email PIC {selectedPic}.
                              </p>
                            </div>
                          </div>

                          {/* Filter Controls: Date Range & Preset Dropdown */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs text-xs">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Filter Date:</span>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                                className="bg-slate-50 border border-slate-200 text-slate-800 px-2 py-0.5 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                              />
                              <span className="text-slate-400 font-bold text-[10px]">s/d</span>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                                className="bg-slate-50 border border-slate-200 text-slate-800 px-2 py-0.5 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                              />
                              {loadingReport && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />}
                            </div>

                            <select
                              value={datePreset}
                              onChange={(e) => {
                                const val = e.target.value as 'today' | '7days' | '30days' | 'all';
                                handleSetPreset(val);
                              }}
                              className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs hover:bg-slate-50 transition-colors"
                            >
                              <option value="today">Hari Ini (Today)</option>
                              <option value="7days">7 Hari Terakhir</option>
                              <option value="30days">30 Hari Terakhir</option>
                              <option value="all">Semua Periode</option>
                              {datePreset === 'custom' && <option value="custom">Custom Date</option>}
                            </select>
                          </div>
                        </div>

                        {/* Activity Metrics Cards */}
                        {(() => {
                          const callsCount = filteredPicActivities.filter(a => (a.activityType || '').toUpperCase() === 'CALL').length;
                          const waCount = filteredPicActivities.filter(a => (a.activityType || '').toUpperCase() === 'WHATSAPP').length;
                          const emailCount = filteredPicActivities.filter(a => (a.activityType || '').toUpperCase() === 'EMAIL').length;
                          const totalActivities = filteredPicActivities.length;

                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="bg-blue-50/80 border border-blue-200/70 p-2.5 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-blue-900 font-bold">
                                  <Phone className="w-4 h-4 text-blue-600" />
                                  <span>Telepon</span>
                                </div>
                                <strong className="text-base font-black text-blue-700">{callsCount}</strong>
                              </div>

                              <div className="bg-emerald-50/80 border border-emerald-200/70 p-2.5 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-bold">
                                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </div>
                                <strong className="text-base font-black text-emerald-700">{waCount}</strong>
                              </div>

                              <div className="bg-purple-50/80 border border-purple-200/70 p-2.5 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-purple-900 font-bold">
                                  <Mail className="w-4 h-4 text-purple-600" />
                                  <span>Email</span>
                                </div>
                                <strong className="text-base font-black text-purple-700">{emailCount}</strong>
                              </div>

                              <div className="bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-between shadow-2xs">
                                <span className="text-xs font-bold text-white/90">Total Activity</span>
                                <strong className="text-base font-black text-white">{totalActivities}</strong>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Summary Remarks Row (Filtered by Date Range) */}
                        {(() => {
                          const isDateInRange = (dateStr?: string) => {
                            if (!dateStr) return false;
                            let s = dateStr.trim();
                            if (!s.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(' ', 'T');
                            const dt = new Date(s);
                            if (isNaN(dt.getTime())) return false;
                            const year = dt.getFullYear();
                            const month = String(dt.getMonth() + 1).padStart(2, '0');
                            const day = String(dt.getDate()).padStart(2, '0');
                            const ymd = `${year}-${month}-${day}`;

                            if (startDate && ymd < startDate) return false;
                            if (endDate && ymd > endDate) return false;
                            return true;
                          };

                          const allPicParticipants = participants.filter(p => {
                            const pic = extractPicFromNotes(p.notes).pic;
                            return pic.toLowerCase() === selectedPic.toLowerCase() || 
                                   (pic.toLowerCase() === 'admin' && selectedPic.toLowerCase() === adminName.toLowerCase());
                          });

                          const picParticipants = (!startDate && !endDate) ? allPicParticipants : allPicParticipants.filter(p => {
                            if (isDateInRange(p.createdAt) || isDateInRange(p.updatedAt) || isDateInRange(p.requestedAt) || isDateInRange(p.respondedAt)) {
                              return true;
                            }
                            const hasAct = filteredPicActivities.some(a => 
                              a.eventParticipant?.id === p.id || 
                              (a.participantName && a.participantName.toLowerCase() === `${p.database?.firstName || ''} ${p.database?.lastName || ''}`.trim().toLowerCase())
                            );
                            return hasAct;
                          });

                          const regCount = picParticipants.filter(p => {
                            const ps = (p.participantStatus || '').toLowerCase();
                            const att = (p.attendanceStatus || '').toLowerCase();
                            return ps === 'registered' || ps === 'green' || ps === 'confirm' || ps === 'confirmed' || att === 'registered';
                          }).length;
                          const tentCount = picParticipants.filter(p => p.participantStatus?.toLowerCase() === 'tentative' || p.participantStatus?.toLowerCase() === 'yellow').length;
                          const notRespCount = picParticipants.filter(p => {
                            const ps = (p.participantStatus || '').toLowerCase();
                            return !ps || ps === 'not_respond_yet' || ps === 'not_respon_yet' || ps.startsWith('not_respond_');
                          }).length;
                          const notIntCount = picParticipants.filter(p => p.participantStatus?.toLowerCase() === 'not_interest' || p.participantStatus?.toLowerCase() === 'red').length;

                          return (
                            <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                  Summary Remarks Periode Ini ({picParticipants.length} Peserta)
                                </span>
                                {(startDate || endDate) && (
                                  <span className="text-[9px] font-bold text-slate-400">
                                    Total Assigned PIC: {allPicParticipants.length}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                                <div className="px-3 py-1.5 bg-indigo-50/80 text-indigo-950 border border-indigo-200/80 rounded-xl flex items-center justify-between">
                                  <span>Registered</span>
                                  <span className="text-sm font-black text-indigo-700">{regCount}</span>
                                </div>
                                <div className="px-3 py-1.5 bg-amber-50/80 text-amber-950 border border-amber-200/80 rounded-xl flex items-center justify-between">
                                  <span>Tentative</span>
                                  <span className="text-sm font-black text-amber-700">{tentCount}</span>
                                </div>
                                <div className="px-3 py-1.5 bg-slate-100 text-slate-900 border border-slate-200/80 rounded-xl flex items-center justify-between">
                                  <span>Not Respond</span>
                                  <span className="text-sm font-black text-slate-900">{notRespCount}</span>
                                </div>
                                <div className="px-3 py-1.5 bg-rose-50/80 text-rose-950 border border-rose-200/80 rounded-xl flex items-center justify-between">
                                  <span>Not Interest</span>
                                  <span className="text-sm font-black text-rose-700">{notIntCount}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Activity History Stream Details */}
                        <div className="pt-2">
                          <div className="flex justify-between items-center mb-2">
                            <h6 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <span>Riwayat Log Telemarketing Dalam Periode Ini ({filteredPicActivities.length})</span>
                            </h6>
                          </div>

                          {filteredPicActivities.length === 0 ? (
                            <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-center">
                              <p className="text-xs text-slate-400 italic">Belum ada aktivitas telepon, WA, atau email yang tercatat pada periode ini.</p>
                            </div>
                          ) : (
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                              {filteredPicActivities.map((act) => {
                                  const formatWib = (ds?: string) => {
                                    if (!ds) return '-';
                                    let s = ds.trim();
                                    if (!s.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z';
                                    const dt = new Date(s);
                                    return isNaN(dt.getTime()) ? ds : dt.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                  };
                                  const timeStr = formatWib(act.createdAt);
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
                                  <div key={act.id} className="bg-white border border-slate-200/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 shadow-2xs transition-colors">
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className={`p-2 rounded-xl shrink-0 ${
                                        type === 'CALL' ? 'bg-blue-50 text-blue-600' :
                                        type === 'WHATSAPP' ? 'bg-emerald-50 text-emerald-600' :
                                        type === 'EMAIL' ? 'bg-purple-50 text-purple-600' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {type === 'CALL' && <Phone className="w-4 h-4" />}
                                        {type === 'WHATSAPP' && <MessageSquare className="w-4 h-4" />}
                                        {type === 'EMAIL' && <Mail className="w-4 h-4" />}
                                        {type === 'SYSTEM' && <Sliders className="w-4 h-4" />}
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider ${
                                            type === 'CALL' ? 'bg-blue-100 text-blue-700' :
                                            type === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-700' :
                                            type === 'EMAIL' ? 'bg-purple-100 text-purple-700' :
                                            'bg-slate-200 text-slate-700 border border-slate-300'
                                          }`}>
                                            {type}
                                          </span>
                                          <h6 className="text-xs font-bold text-slate-900 truncate">
                                            {targetName || 'Peserta Event'}
                                          </h6>
                                          {targetCompany && (
                                            <span className="text-[10px] text-slate-500 font-medium truncate">
                                              • {targetCompany}
                                            </span>
                                          )}
                                          {targetPhone && (
                                            <span className="text-[10px] text-slate-500 font-mono">
                                              ({targetPhone})
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-600 mt-1 italic bg-slate-50 p-1.5 rounded-lg border border-slate-200/70">
                                          "{act.notes || 'Activity logged'}"
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0 self-end sm:self-center">
                                      <span className="text-[10px] text-slate-500 font-mono block">
                                        {timeStr}
                                      </span>
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-200/80">
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
                              let unassigned = participants.filter(p => {
                                const notes = p.notes || '';
                                if (!notes.includes('[PIC:')) return true;
                                const picName = extractPicFromNotes(notes).pic;
                                return !picName || picName.trim() === '' || picName.toLowerCase() === 'not set';
                              });
                              if (activeTab === 'request') {
                                unassigned = unassigned.filter(p => {
                                  const notes = p.notes || '';
                                  const isEms = notes.includes('[Origin: EMS Sync]') || notes.includes('[EMS]');
                                  return !(isEms && !p.confirmationStatus);
                                });
                              }
                              if (unassigned.length === 0) {
                                toast.info('Semua peserta sudah memiliki PIC!');
                                return;
                              }

                              setConfirmConfig({
                                title: "Konfirmasi Bagi Rata Sisa",
                                description: `Apakah Anda yakin ingin membagi ${unassigned.length} peserta sisa (belum ada PIC) ke seluruh PIC secara merata?`,
                                onConfirm: async () => {
                                  if (eventId) {
                                    try { await crmService.syncEmsParticipants(eventId); } catch (e) {}
                                  }
                                  const eligibleUsers = usersList.filter(u => {
                                    const uname = (u.username || '').toLowerCase();
                                    const fname = (u.fullName || '').toLowerCase();
                                    return uname !== 'kevin' && !fname.includes('kevin');
                                  });
                                  const targetPics = eligibleUsers.length > 0 ? eligibleUsers : [{ username: adminName, fullName: adminName }];
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
                                description: `PERINGATAN: Apakah Anda yakin ingin membagi ulang peserta secara merata? Tindakan ini akan mengocok ulang alokasi PIC.`,
                                onConfirm: async () => {
                                  if (eventId) {
                                    try { await crmService.syncEmsParticipants(eventId); } catch (e) {}
                                  }
                                  let targetAll = participants;
                                  if (activeTab === 'request') {
                                    targetAll = participants.filter(p => {
                                      const notes = p.notes || '';
                                      const isEms = notes.includes('[Origin: EMS Sync]') || notes.includes('[EMS]');
                                      return !(isEms && !p.confirmationStatus);
                                    });
                                  }
                                  const eligibleUsers = usersList.filter(u => {
                                    const uname = (u.username || '').toLowerCase();
                                    const fname = (u.fullName || '').toLowerCase();
                                    return uname !== 'kevin' && !fname.includes('kevin');
                                  });
                                  const targetPics = eligibleUsers.length > 0 ? eligibleUsers : [{ username: adminName, fullName: adminName }];
                                  const groupings: { [picName: string]: number[] } = {};
                                  targetPics.forEach(u => groupings[u.fullName || u.username] = []);
                                  targetAll.forEach((lead, idx) => {
                                    const pic = targetPics[idx % targetPics.length];
                                    groupings[pic.fullName || pic.username].push(lead.id);
                                  });
                                  for (const picName of Object.keys(groupings)) {
                                    if (groupings[picName].length > 0) await onAssignPic(groupings[picName], picName);
                                  }
                                  toast.success(`Berhasil membagi ulang seluruh ${targetAll.length} peserta ke ${targetPics.length} PIC!`);
                                }
                              });
                            }}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all duration-150 shadow-sm"
                          >
                            Bagi Ulang Semua Peserta
                          </button>
                          <button
                            onClick={() => setIsSplitModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black transition-all duration-150 shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <span>⚡ Auto Split PIC Event</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Allocation Balance Stacked Bar */}
                    {(() => {
                      const activePics = usersList.filter(usr => {
                        const uname = (usr.username || '').toLowerCase();
                        const fname = (usr.fullName || '').toLowerCase();
                        return uname !== 'kevin' && !fname.includes('kevin');
                      }).map((usr) => {
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

                          const activePics = usersList.filter(usr => {
                            const uname = (usr.username || '').toLowerCase();
                            const fname = (usr.fullName || '').toLowerCase();
                            return uname !== 'kevin' && !fname.includes('kevin');
                          }).map((usr) => {
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

                            const approveCount = picParticipants.filter(p => getPreEventApprovalStatus(p) === 'approve').length;
                            const pendingCount = picParticipants.filter(p => getPreEventApprovalStatus(p) === 'pending').length;
                            
                            // Pre-Event Remarks (Participant Status) breakdown
                            const registeredCount = picParticipants.filter(p => {
                              const ps = (p.participantStatus || '').toLowerCase();
                              const att = (p.attendanceStatus || '').toLowerCase();
                              return ps === 'registered' || ps === 'green' || ps === 'confirm' || ps === 'confirmed' || att === 'registered';
                            }).length;

                            const tentativeCount = picParticipants.filter(p => {
                              const ps = (p.participantStatus || '').toLowerCase();
                              return ps === 'tentative' || ps === 'yellow';
                            }).length;

                            const notRespondCount = picParticipants.filter(p => {
                              const ps = (p.participantStatus || '').toLowerCase();
                              return !ps || ps === 'not_respond_yet' || ps === 'not_respon_yet' || ps.startsWith('not_respond_');
                            }).length;

                            const notInterestCount = picParticipants.filter(p => {
                              const ps = (p.participantStatus || '').toLowerCase();
                              return ps === 'not_interest' || ps === 'red';
                            }).length;

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

                                  {/* Pre Event Approval Breakdown Grid */}
                                  <div className="space-y-1 mb-2">
                                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Approval Status</span>
                                    <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-50/80 rounded-xl border border-slate-100">
                                      <div className="text-center p-1 bg-emerald-50/60 border border-emerald-100/50 rounded-lg">
                                        <span className="block text-[8px] font-extrabold text-emerald-700 uppercase">Approve</span>
                                        <span className="text-xs font-black text-emerald-800">{approveCount}</span>
                                      </div>
                                      <div className="text-center p-1 bg-amber-50/60 border border-amber-100/50 rounded-lg">
                                        <span className="block text-[8px] font-extrabold text-amber-700 uppercase">Pending</span>
                                        <span className="text-xs font-black text-amber-800">{pendingCount}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Pre Event Summary Remarks Grid */}
                                  <div className="space-y-1 mb-1">
                                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Summary Remarks</span>
                                    <div className="grid grid-cols-2 gap-1 text-[9px] font-bold">
                                      <div className="flex items-center justify-between px-2 py-1 bg-indigo-50/80 border border-indigo-100/70 rounded-lg">
                                        <span className="text-indigo-800">Registered</span>
                                        <span className="font-black text-indigo-950">{registeredCount}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-2 py-1 bg-amber-50/80 border border-amber-100/70 rounded-lg">
                                        <span className="text-amber-800">Tentative</span>
                                        <span className="font-black text-amber-950">{tentativeCount}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-2 py-1 bg-slate-100/80 border border-slate-200/80 rounded-lg">
                                        <span className="text-slate-600">Not Respond</span>
                                        <span className="font-black text-slate-900">{notRespondCount}</span>
                                      </div>
                                      <div className="flex items-center justify-between px-2 py-1 bg-rose-50/80 border border-rose-100/70 rounded-lg">
                                        <span className="text-rose-800">Not Interest</span>
                                        <span className="font-black text-rose-950">{notInterestCount}</span>
                                      </div>
                                    </div>
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
      );
    })()}

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
      {/* Auto Split Selected PICs Dialog Modal */}
      <Dialog open={isSplitModalOpen} onOpenChange={setIsSplitModalOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl border border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>⚡ Auto Split PIC Event</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
              Pilih PIC mana saja yang akan menangani event ini. Sistem akan membagi rata peserta ke PIC terpilih secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">
                  Pilih Tim PIC Bertugas ({selectedSplitPics.length} Terpilih)
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const allEligible = usersList.filter(u => {
                        const uname = (u.username || '').toLowerCase();
                        const fname = (u.fullName || '').toLowerCase();
                        return uname !== 'kevin' && !fname.includes('kevin');
                      }).map(u => u.fullName || u.username);
                      setSelectedSplitPics(allEligible);
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSplitPics([])}
                    className="text-slate-500 font-bold hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1.5 bg-slate-50/50">
                {usersList.filter(u => {
                  const uname = (u.username || '').toLowerCase();
                  const fname = (u.fullName || '').toLowerCase();
                  return uname !== 'kevin' && !fname.includes('kevin');
                }).map(u => {
                  const name = u.fullName || u.username;
                  const isChecked = selectedSplitPics.includes(name);
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none ${
                        isChecked
                          ? 'bg-blue-50/80 text-blue-900 border-blue-200 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSplitPic(name)}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{name}</span>
                      </span>
                      {isChecked && (
                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md">
                          PIC Event
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Peserta Yang Dibagi</label>
              <select
                value={splitMode}
                onChange={(e) => setSplitMode(e.target.value as 'all' | 'unassigned')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Bagi Seluruh Peserta Event ({participants.length} pax)</option>
                <option value="unassigned">Hanya Bagi Peserta Sisa / Belum Ada PIC</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSplitSelected}
                disabled={selectedSplitPics.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                Jalankan Auto Split ({selectedSplitPics.length} PIC)
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
