import React from 'react';
import { Clock, X, Calendar, CheckCircle, CheckCircle2, TrendingUp, Users, UserCheck, ArrowLeft, Plus, UserMinus, History, Phone, Loader2, Shuffle, RotateCw, GitBranch } from 'lucide-react';
import { PicDailyReport } from './PicDailyReport';
import { PicParticipantsPanel } from './PicParticipantsPanel';
import { EventParticipant, AppUser, EventParticipantStatisticsResponse, EventActivitySummaryResponse, EventParticipantPicSummaryResponse } from '../../../../lib/types';
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
  allParticipants?: EventParticipant[];
  statistics?: EventParticipantStatisticsResponse | null;
  usersList: AppUser[];
  isAdmin: boolean;
  adminName: string;
  eventId?: number;
  onAssignPic?: (participantIds: number[], picName: string) => Promise<void>;
  onAutoSplit?: (payload: { mode: 'all' | 'unassigned'; managerNames: string[] }) => Promise<void>;
  onOpenEngagementModal?: (participant: EventParticipant) => void;
  currentUser?: AppUser | null;
  isViewer?: boolean;
  participantFilters?: {
    tab?: string;
    pic?: string;
    company?: string;
    position?: string;
    industry?: string;
    confirmationStatus?: string;
    reminderHariH?: string;
    search?: string;
  };
}

export const EventStatistics: React.FC<EventStatisticsProps> = ({
  activeTab,
  participants: scopedParticipants,
  allParticipants = [],
  statistics,
  usersList,
  isAdmin,
  adminName,
  eventId,
  onAssignPic,
  onAutoSplit,
  onOpenEngagementModal,
  currentUser,
  isViewer = false,
  participantFilters,
}) => {
  const [selectedPic, setSelectedPic] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [confirmConfig, setConfirmConfig] = React.useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [statsViewMode, setStatsViewMode] = React.useState<'mine' | 'all'>('mine');

  // Date Range Report States
  const [picViewTab, setPicViewTab] = React.useState<'report' | 'participants'>('report');
  const [datePreset, setDatePreset] = React.useState<'today' | '7days' | '30days' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activitiesReport, setActivitiesReport] = React.useState<any[]>([]);
  const [activitySummary, setActivitySummary] = React.useState<EventActivitySummaryResponse | null>(null);
  const [picSummary, setPicSummary] = React.useState<EventParticipantPicSummaryResponse | null>(null);
  const [loadingReport, setLoadingReport] = React.useState(false);
  const [loadingPicSummary, setLoadingPicSummary] = React.useState(false);
  const [isWorkloadDialogOpen, setIsWorkloadDialogOpen] = React.useState(false);

  // Auto Split Selected PICs States
  const [isSplitModalOpen, setIsSplitModalOpen] = React.useState(false);
  const [selectedSplitPics, setSelectedSplitPics] = React.useState<string[]>([]);
  const [splitMode, setSplitMode] = React.useState<'all' | 'unassigned'>('all');
  const canCompareScopes = !isAdmin && !isViewer && allParticipants.length > 0;
  const participants = canCompareScopes && statsViewMode === 'all' ? allParticipants : scopedParticipants;
  const currentStatistics = React.useMemo(() => {
    if (statistics?.scopes) {
      if (canCompareScopes) {
        return statsViewMode === 'all' ? statistics.scopes.all : statistics.scopes.mine;
      }
      return statistics.scopes.all;
    }
    return null;
  }, [statistics, canCompareScopes, statsViewMode]);

  const getStat = React.useCallback((key: string) => {
    const value = currentStatistics?.[key];
    return typeof value === 'number' ? value : 0;
  }, [currentStatistics]);
  const activePicSummaryItems = picSummary?.items || [];
  const selectedPicSummaryItem = selectedPic
    ? activePicSummaryItems.find((item) => item.name.toLowerCase() === selectedPic.toLowerCase())
    : null;
  const eligibleSplitUsers = usersList.filter(u => {
    const uname = (u.username || '').toLowerCase();
    const fname = (u.fullName || '').toLowerCase();
    return uname !== 'kevin' && !fname.includes('kevin');
  });

  const showMissingPicAccessWarning = () => {
    setConfirmConfig({
      title: "Belum Ada PIC Event",
      description: "Belum ada user yang ditugaskan sebagai PIC untuk event ini.\n1. Buka Dashboard > Users.\n2. Klik Event Access pada admin/PIC yang akan menangani leads.\n3. Checklist event ini, lalu simpan.",
      onConfirm: () => {}
    });
  };

  const toggleSplitPic = (picName: string) => {
    setSelectedSplitPics(prev => 
      prev.includes(picName) ? prev.filter(p => p !== picName) : [...prev, picName]
    );
  };

  const handleExecuteSplitSelected = async () => {
    if (selectedSplitPics.length === 0) {
      if (eligibleSplitUsers.length === 0) {
        showMissingPicAccessWarning();
        return;
      }
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

    if (onAutoSplit) {
      await onAutoSplit({ mode: splitMode, managerNames: selectedSplitPics });
      setIsSplitModalOpen(false);
      return;
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
  };

  React.useEffect(() => {
    if (!isWorkloadDialogOpen || !selectedPic || !eventId) return;
    let cancelled = false;
    setLoadingReport(true);
    setActivitiesReport([]);
    setActivitySummary(null);
    const loadReport = async () => {
      try {
        const [data, summary] = await Promise.all([
          crmService.getAllEventActivities(eventId, startDate, endDate),
          crmService.getEventActivitySummary(eventId, {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            pic: selectedPic
          })
        ]);
        if (cancelled) return;
        setActivitiesReport(data || []);
        setActivitySummary(summary || null);
      } catch (err) {
        if (!cancelled) console.error('Failed to load activity report:', err);
      } finally {
        if (!cancelled) setLoadingReport(false);
      }
    };
    void loadReport();
    return () => { cancelled = true; };
  }, [isWorkloadDialogOpen, selectedPic, eventId, startDate, endDate]);

  const loadPicSummary = async () => {
    if (!eventId || !isAdmin) return;
    setLoadingPicSummary(true);
    try {
      const summary = await crmService.getEventParticipantsSummaryByPic(eventId, {
        tab: participantFilters?.tab || activeTab,
        pic: participantFilters?.pic,
        company: participantFilters?.company,
        position: participantFilters?.position,
        industry: participantFilters?.industry,
        confirmationStatus: participantFilters?.confirmationStatus,
        reminderHariH: participantFilters?.reminderHariH,
        search: participantFilters?.search
      });
      setPicSummary(summary || null);
    } catch (err) {
      console.error('Failed to load PIC summary:', err);
      setPicSummary(null);
    } finally {
      setLoadingPicSummary(false);
    }
  };

  React.useEffect(() => {
    if (!isAdmin || !isWorkloadDialogOpen || selectedPic) return;
    void loadPicSummary();
  }, [
    isAdmin,
    isWorkloadDialogOpen,
    selectedPic,
    eventId,
    activeTab,
    participantFilters?.tab,
    participantFilters?.pic,
    participantFilters?.company,
    participantFilters?.position,
    participantFilters?.industry,
    participantFilters?.confirmationStatus,
    participantFilters?.reminderHariH,
    participantFilters?.search
  ]);

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
      {canCompareScopes && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-600">Statistics Scope</h4>
            <p className="text-xs text-slate-500 mt-1">
              Lihat ringkasan semua participant event atau hanya participant yang jadi tanggung jawab kamu.
            </p>
          </div>
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setStatsViewMode('mine')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                statsViewMode === 'mine'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              My Assignment
            </button>
            <button
              type="button"
              onClick={() => setStatsViewMode('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                statsViewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All Event
            </button>
          </div>
        </div>
      )}

      {activeTab === 'request' && (
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Request Vetting Overview</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Total Request</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('totalRequest')}
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Pending Approval</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('pendingApproval')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Taken Out (Decline)</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('takenOut')}
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
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Registration Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Total Register</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('totalRegister')}
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Tentative</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('tentative')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Not Respond Yet</span>
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('notRespondYet')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Not Interest</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('notInterest')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pre Event Approval</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Approve</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('approve')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Pending</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('pending')}
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
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Declined Participants Overview</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Total Declined</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('totalDeclined')}
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Declined from DB Vetting</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <UserMinus className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('declinedFromDbVetting')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Declined from Pre-Event</span>
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('declinedFromPreEvent')}
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
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Reminder Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Approved Register Total</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('approvedRegisterTotal')}
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Confirm to Attend</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('confirmToAttend')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Tentative</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('tentative')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Not Respond Yet</span>
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('notRespondYet')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Unable to Attend</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('unableToAttend')}
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
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Reminder D-Day Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">On Location</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('onLocation')}
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">On The Way</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('onTheWay')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Not Respond Yet</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('notRespondYet')}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Unable to Attend</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {getStat('unableToAttend')}
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                {isAdmin ? <Users className="w-5 h-5" /> : <History className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  {isAdmin ? 'PIC Assignment & Distribution' : 'Log Aktivitas Saya Hari Ini'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAdmin
                    ? 'Lihat pembagian peserta dan aktivitas tim PIC.'
                    : `Ringkasan aktivitas telepon, WA, dan email yang dikerjakan oleh ${myPicName}`}
                </p>
              </div>
            </div>

            <Dialog onOpenChange={(open) => {
              setIsWorkloadDialogOpen(open);
              if (open) {
                if (!isAdmin) {
                  setSelectedPic(myPicName);
                  handleSetPreset('today');
                  setPicViewTab('report');
                } else {
                  void loadPicSummary();
                }
              } else {
                if (isAdmin) setSelectedPic(null);
                setSearchQuery('');
                setActivitySummary(null);
                setPicSummary(null);
              }
            }}>
              <DialogTrigger asChild>
                <button type="button" className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                  {isAdmin ? <Users aria-hidden="true" className="h-4 w-4" /> : <History aria-hidden="true" className="h-4 w-4" />}
                  <span>{isAdmin ? 'Buka workspace PIC' : 'Lihat aktivitas saya'}</span>
                </button>
              </DialogTrigger>
              <DialogContent 
                onInteractOutside={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                className="sm:max-w-5xl"
              >
                <div aria-hidden="true" className="h-1.5 shrink-0 bg-blue-600" />
                <DialogHeader className="ms-modal-header">
                  <div className="mb-1 flex items-center gap-2 text-xs text-slate-500"><Users aria-hidden="true" className="h-4 w-4 text-blue-600" />Event workspace</div>
                  <DialogTitle className="ms-modal-title">
                    {isAdmin ? 'PIC Assignment & Distribution' : `Laporan Aktivitas Follow-Up — ${myPicName}`}
                  </DialogTitle>
                  <DialogDescription className="ms-modal-description mt-2">
                    {isAdmin ? 'Pantau beban kerja, bagi peserta, dan lihat aktivitas tim dalam satu tempat.' : 'Riwayat aktivitas telepon, WhatsApp, dan email sesuai periode yang dipilih.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-100 p-4 sm:p-6">
                  {selectedPic ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
                        {isAdmin ? (
                          <button type="button" onClick={() => { setSelectedPic(null); setSearchQuery(''); setPicViewTab('report'); }} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-700">
                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />Daftar PIC
                          </button>
                        ) : <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"><History aria-hidden="true" className="h-4 w-4 text-blue-600" />Aktivitas saya</span>}
                        <div className="flex min-w-0 items-center gap-3">
                          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">{selectedPic.charAt(0).toUpperCase()}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Penanggung jawab</p>
                            <p className="break-words text-sm font-semibold text-slate-900">{selectedPic}</p>
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Tampilan PIC">
                          <button type="button" aria-pressed={picViewTab === 'report'} onClick={() => setPicViewTab('report')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${picViewTab === 'report' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                            <History aria-hidden="true" className="h-4 w-4" />Daily report
                          </button>
                          <button type="button" aria-pressed={picViewTab === 'participants'} onClick={() => setPicViewTab('participants')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${picViewTab === 'participants' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                            <Users aria-hidden="true" className="h-4 w-4" />Kelola peserta
                            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">{selectedPicSummaryItem?.totalAssigned ?? 0}</span>
                          </button>
                        </div>
                      )}

                      {picViewTab === 'report' ? (
                        <PicDailyReport
                          selectedPic={selectedPic}
                          startDate={startDate}
                          endDate={endDate}
                          datePreset={datePreset}
                          onStartDateChange={value => { setStartDate(value); setDatePreset('custom'); }}
                          onEndDateChange={value => { setEndDate(value); setDatePreset('custom'); }}
                          onPresetChange={handleSetPreset}
                          loading={loadingReport}
                          summary={activitySummary}
                          activities={filteredPicActivities}
                        />
                      ) : (
                        <PicParticipantsPanel
                          participants={participants}
                          selectedPic={selectedPic}
                          adminName={adminName}
                          searchQuery={searchQuery}
                          onSearchChange={setSearchQuery}
                          onAssignPic={onAssignPic}
                          onOpenEngagementModal={onOpenEngagementModal}
                        />
                      )}
                    </div>
                  ) : (
                    <>
                    {/* Auto Distribution Control Panel */}
                    {onAssignPic && (
                      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                        <div>
                          <h5 className="mb-1 text-sm font-semibold text-slate-900">Bagi peserta ke tim PIC</h5>
                          <p className="text-xs leading-5 text-slate-500">Tentukan pembagian tugas untuk peserta yang belum ditangani atau atur ulang alokasi tim.</p>
                          {eligibleSplitUsers.length === 0 && (
                            <p className="mt-2 text-xs font-medium text-amber-700">
                              Tambahkan PIC melalui Kelola PIC pada detail event.
                            </p>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            disabled={eligibleSplitUsers.length === 0}
                            onClick={async () => {
                              if (eligibleSplitUsers.length === 0) {
                                showMissingPicAccessWarning();
                                return;
                              }
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
                                  const targetPics = eligibleSplitUsers;
                                  if (targetPics.length === 0) {
                                    showMissingPicAccessWarning();
                                    return;
                                  }
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
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <GitBranch aria-hidden="true" className="h-4 w-4" />Bagi sisa peserta
                          </button>
                          <button
                            disabled={participants.length === 0 || eligibleSplitUsers.length === 0}
                            onClick={async () => {
                              if (participants.length === 0) return;
                              if (eligibleSplitUsers.length === 0) {
                                showMissingPicAccessWarning();
                                return;
                              }

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
                                  const targetPics = eligibleSplitUsers;
                                  if (targetPics.length === 0) {
                                    showMissingPicAccessWarning();
                                    return;
                                  }
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
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCw aria-hidden="true" className="h-4 w-4" />Bagi ulang semua peserta
                          </button>
                          <button
                            disabled={eligibleSplitUsers.length === 0}
                            onClick={() => setIsSplitModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Shuffle aria-hidden="true" className="h-4 w-4" /><span>Auto Split PIC</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {loadingPicSummary ? (
                      <div role="status" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-10 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-600" />Memuat beban kerja PIC...</div>
                    ) : !picSummary ? (
                      <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                        <p className="text-sm font-semibold text-amber-900">Ringkasan PIC belum berhasil dimuat</p>
                        <button type="button" onClick={() => { void loadPicSummary(); }} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-900 hover:underline"><RotateCw aria-hidden="true" className="h-4 w-4" />Coba lagi</button>
                      </div>
                    ) : (
                      <>
                        <section aria-labelledby="pic-allocation-title" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                            <h3 id="pic-allocation-title" className="text-sm font-semibold text-slate-900">Ringkasan pembagian</h3>
                            <span className="text-xs text-slate-500">Sesuai tab dan filter peserta saat ini</span>
                          </div>
                          <dl className="mb-5 grid grid-cols-3 gap-3">
                            {[{ label: 'Total peserta', value: picSummary.totalParticipants }, { label: 'Sudah dibagi', value: picSummary.totalAssigned }, { label: 'Belum dibagi', value: picSummary.unassignedCount }].map(({ label, value }) => (
                              <div key={label}>
                                <dt className="text-xs leading-5 text-slate-500">{label}</dt>
                                <dd className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value.toLocaleString()}</dd>
                              </div>
                            ))}
                          </dl>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>Distribusi peserta per PIC</span>
                            <span className="font-medium text-blue-700">{Math.round((picSummary.totalAssigned / Math.max(1, picSummary.totalParticipants)) * 100)}% teralokasi</span>
                          </div>
                          <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-slate-200">
                            {activePicSummaryItems.map((pic, index) => (
                              <div key={pic.userId || pic.name} className={['bg-blue-600', 'bg-teal-500', 'bg-sky-400', 'bg-slate-500'][index % 4]} style={{ width: `${(pic.totalAssigned / Math.max(1, picSummary.totalParticipants)) * 100}%` }} />
                            ))}
                          </div>
                          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                            {activePicSummaryItems.map((pic, index) => (
                              <li key={pic.userId || pic.name} className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${['bg-blue-600', 'bg-teal-500', 'bg-sky-400', 'bg-slate-500'][index % 4]}`} />
                                <span className="break-words">{pic.name}</span><span className="font-semibold tabular-nums">{pic.totalAssigned}</span>
                              </li>
                            ))}
                            {picSummary.unassignedCount > 0 && <li className="flex items-center gap-2 text-xs text-slate-600"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-300" />Belum dibagi <span className="font-semibold tabular-nums">{picSummary.unassignedCount}</span></li>}
                          </ul>
                        </section>

                        <section aria-labelledby="pic-workloads-title" className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h3 id="pic-workloads-title" className="text-sm font-semibold text-slate-900">Beban kerja PIC</h3>
                            <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-500">{activePicSummaryItems.length} PIC</span>
                          </div>
                          {activePicSummaryItems.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                              <Users aria-hidden="true" className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                              <p className="text-sm font-medium text-slate-700">Belum ada beban kerja PIC</p>
                              <p className="mt-2 text-xs text-slate-500">Peserta yang sudah dibagikan ke PIC akan muncul di sini.</p>
                            </div>
                          )}
                          {(() => {
                            const unassignedIds = participants.filter(p => {
                              const picName = extractPicFromNotes(p.notes).pic;
                              if (!picName || picName.trim() === '' || picName.toLowerCase() === 'not set') return true;
                              return !usersList.some(usr => {
                                const name = usr.fullName || usr.username;
                                return picName.toLowerCase() === name.toLowerCase() || (picName.toLowerCase() === 'admin' && name.toLowerCase() === adminName.toLowerCase());
                              });
                            }).map(p => p.id);
                            return activePicSummaryItems.map(pic => (
                              <article key={pic.userId || pic.name} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">{pic.name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)}</span>
                                    <div className="min-w-0">
                                      <button type="button" onClick={() => { setSelectedPic(pic.name); setPicViewTab('report'); }} className="break-words text-left text-sm font-semibold text-slate-900 hover:text-blue-700 hover:underline">{pic.name}</button>
                                      <p className="mt-0.5 text-xs text-slate-500">{pic.roleLabel?.replace(/\bmanager\b/gi, 'PIC') || 'PIC'}</p>
                                    </div>
                                  </div>
                                  <div className="text-right"><span className="text-xl font-semibold text-slate-900 tabular-nums">{pic.totalAssigned.toLocaleString()}</span><span className="ml-1.5 text-xs text-slate-500">peserta ditangani</span></div>
                                </div>
                                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-100 py-4 sm:grid-cols-3 lg:grid-cols-6">
                                  {[{ label: 'Approve', value: pic.approveCount, icon: CheckCircle2, color: 'text-emerald-600' }, { label: 'Pending', value: pic.pendingCount, icon: Clock, color: 'text-amber-600' }, { label: 'Registered', value: pic.registeredCount, icon: UserCheck, color: 'text-blue-600' }, { label: 'Tentative', value: pic.tentativeCount, icon: Clock, color: 'text-slate-500' }, { label: 'Not respond', value: pic.notRespondCount, icon: Phone, color: 'text-slate-500' }, { label: 'Not interest', value: pic.notInterestCount, icon: X, color: 'text-slate-500' }].map(({ label, value, icon: Icon, color }) => (
                                    <div key={label}><dt className="flex items-center gap-1.5 text-xs text-slate-500"><Icon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${color}`} />{label}</dt><dd className="mt-1.5 text-base font-semibold text-slate-900 tabular-nums">{value.toLocaleString()}</dd></div>
                                  ))}
                                </dl>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <button type="button" onClick={() => { setSelectedPic(pic.name); setPicViewTab('report'); }} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><History aria-hidden="true" className="h-4 w-4" />Daily report</button>
                                  <button type="button" onClick={() => { setSelectedPic(pic.name); setPicViewTab('participants'); }} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Users aria-hidden="true" className="h-4 w-4" />Kelola peserta</button>
                                  {onAssignPic && unassignedIds.length > 0 && (
                                    <button type="button" onClick={() => setConfirmConfig({ title: 'Konfirmasi penugasan peserta', description: `Tugaskan ${unassignedIds.length} peserta yang belum memiliki PIC ke ${pic.name}?`, onConfirm: async () => { await onAssignPic(unassignedIds, pic.name); } })} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 sm:ml-auto"><Plus aria-hidden="true" className="h-3.5 w-3.5" />Tugaskan {unassignedIds.length} sisa peserta</button>
                                  )}
                                </div>
                              </article>
                            ));
                          })()}
                        </section>
                      </>
                    )}
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
          <AlertDialogContent className="ms-modal max-w-md">
            <AlertDialogHeader className="ms-modal-header">
              <AlertDialogTitle className="ms-modal-title">
                {confirmConfig.title}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="ms-modal-body">
              <AlertDialogDescription className="ms-modal-description whitespace-pre-line">
                {confirmConfig.description}
              </AlertDialogDescription>
            </div>
            <AlertDialogFooter className="ms-modal-footer">
              <AlertDialogCancel className="ms-modal-secondary">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="ms-modal-primary"
              >
                Konfirmasi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Auto Split Selected PICs Dialog Modal */}
      <Dialog open={isSplitModalOpen} onOpenChange={setIsSplitModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <div aria-hidden="true" className="h-1.5 shrink-0 bg-blue-600" />
          <DialogHeader className="ms-modal-header">
            <DialogTitle className="ms-modal-title flex items-center gap-2">
              <Shuffle aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-600" /><span>Auto Split PIC</span>
            </DialogTitle>
            <DialogDescription className="ms-modal-description mt-2">
              Pilih tim dan peserta yang ingin dibagi. Peserta akan dialokasikan secara merata ke PIC terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-slate-800">
                  Tim PIC <span className="ml-1.5 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{selectedSplitPics.length} terpilih</span>
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (eligibleSplitUsers.length === 0) {
                        showMissingPicAccessWarning();
                        return;
                      }
                      const allEligible = eligibleSplitUsers.map(u => u.fullName || u.username);
                      setSelectedSplitPics(allEligible);
                    }}
                    className="cursor-pointer py-1 font-medium text-blue-600 hover:underline"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSplitPics([])}
                    className="cursor-pointer py-1 font-medium text-slate-500 hover:underline"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="max-h-60 space-y-2 overflow-y-auto">
                {eligibleSplitUsers.length === 0 ? (
                  <button
                    type="button"
                    onClick={showMissingPicAccessWarning}
                    className="w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-relaxed text-amber-800"
                  >
                    Belum ada PIC untuk event ini. Atur lewat Users &gt; Events Access.
                  </button>
                ) : eligibleSplitUsers.map(u => {
                  const name = u.fullName || u.username;
                  const isChecked = selectedSplitPics.includes(name);
                  return (
                    <label
                      key={u.id}
                      className={`flex cursor-pointer select-none items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                        isChecked
                          ? 'border-blue-300 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSplitPic(name)}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-blue-600 focus:ring-blue-500"
                      />
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-medium">{name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{u.roles?.map(role => role === 'MANAGER' ? 'PIC' : role).join(' / ') || 'PIC'}</span>
                      </span>
                      {isChecked && (
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="pic-split-target" className="mb-2 block text-sm font-semibold text-slate-800">Peserta yang dibagi</label>
              <select
                id="pic-split-target"
                value={splitMode}
                onChange={(e) => setSplitMode(e.target.value as 'all' | 'unassigned')}
                className="w-full cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="all">Semua peserta event</option>
                <option value="unassigned">Hanya peserta yang belum memiliki PIC</option>
              </select>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{splitMode === 'all' ? 'Penugasan PIC sebelumnya akan diganti dengan pembagian baru.' : 'Peserta yang sudah memiliki PIC tetap pada penugasannya.'}</p>
            </div>

            </div>
            <div className="ms-modal-footer">
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(false)}
                className="ms-modal-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSplitSelected}
                disabled={selectedSplitPics.length === 0}
                className="ms-modal-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Shuffle aria-hidden="true" className="h-4 w-4" />Bagi ke {selectedSplitPics.length} PIC
              </button>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
