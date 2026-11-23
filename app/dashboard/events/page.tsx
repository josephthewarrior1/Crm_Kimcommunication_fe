'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { crmService } from '../../../lib/services/crmService';
import { Event, EmsSource, EventParticipant, Database, AppUser } from '../../../lib/types';
import { CalendarDays, Plus, Loader2, UserPlus, Users, Edit2, Trash2, Download, ArrowLeft, Search, Eye, CheckCircle, Upload, RefreshCw, Columns } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import * as XLSX from 'xlsx';
import { RequestPreEventTable } from './components/RequestPreEventTable';
import { ReminderTable } from './components/ReminderTable';
import { ReminderDdayTable } from './components/ReminderDdayTable';
import { CreateEventModal } from './components/CreateEventModal';
import { EmsSyncDialog } from './components/EmsSyncDialog';
import { PmsSyncDialog } from './components/PmsSyncDialog';
import type { SyncDestination } from './components/SyncDestinationField';
import { EditEventModal } from './components/EditEventModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { DeleteEventConfirmModal } from './components/DeleteEventConfirmModal';
import { DeleteParticipantConfirmModal } from './components/DeleteParticipantConfirmModal';
import { AddParticipantModal } from './components/AddParticipantModal';
import { UpdateParticipantModal } from './components/UpdateParticipantModal';
import { TakeoutModal } from '../database/components/TakeoutModal';
import { EngagementModal } from './components/EngagementModal';
import { EventStatistics } from './components/EventStatistics';
import { ManageEventPicsModal } from './components/ManageEventPicsModal';
import { EventPicPanel } from './components/EventPicPanel';
import { ParticipantToolbar } from './components/ParticipantToolbar';
import { BatchActionsBar } from './components/BatchActionsBar';
import { ManageUserColumnsModal } from '../users/components/ManageUserColumnsModal';
import { extractPicFromNotes, setPreEventApprovalStatus, isEmsApprovalEvent } from './utils/notesHelper';
import { getStatusBadgeStyle, getConfirmationStatusBadgeStyle } from './utils/statusHelper';
import { checkDatabaseCompleteness } from '../database/utils/validationHelper';
import { getEventColumnConfig } from './utils/columnConfigHelper';

const EVENT_TABS = ['request', 'pre_event', 'declined', 'reminder', 'reminder_dday'] as const;
type EventTab = typeof EVENT_TABS[number];

const EVENT_CACHE_TTL = 30_000;
const EVENT_CACHE_LIMIT = 20;

function useSearchAfterTyping(value: string) {
  const search = value.trim();
  const [settled, setSettled] = useState(search);
  useEffect(() => {
    if (search === settled) return;
    if (!search) {
      setSettled('');
      return;
    }
    const timer = setTimeout(() => setSettled(search), 250);
    return () => clearTimeout(timer);
  }, [search, settled]);
  return search ? settled : '';
}

function useEventLookup<T>(
  session: string,
  key: string | null,
  revision: number,
  load: (signal: AbortSignal) => Promise<T>,
  errorMessage: string,
) {
  const cache = React.useRef(new Map<string, { data: T; expires: number }>());
  const cacheScope = React.useRef({ session, revision });
  const [result, setResult] = useState<{ session: string; key: string; data?: T }>();

  useEffect(() => {
    if (cacheScope.current.session !== session || cacheScope.current.revision !== revision) {
      cache.current.clear();
      cacheScope.current = { session, revision };
    }
    if (!session || !key) return;
    const cached = cache.current.get(key);
    if (cached && cached.expires > Date.now()) {
      setResult({ session, key, data: cached.data });
      return;
    }

    const controller = new AbortController();
    void load(controller.signal).then(data => {
      if (controller.signal.aborted) return;
      cache.current.delete(key);
      cache.current.set(key, { data, expires: Date.now() + EVENT_CACHE_TTL });
      if (cache.current.size > EVENT_CACHE_LIMIT) {
        const oldest = cache.current.keys().next().value;
        if (oldest !== undefined) cache.current.delete(oldest);
      }
      setResult({ session, key, data });
    }).catch(() => {
      if (controller.signal.aborted) return;
      setResult(current => ({ session, key, data: current?.session === session && current.key === key ? current.data : undefined }));
      if (errorMessage) toast.error(errorMessage);
    });
    return () => controller.abort();
    // The key includes all the query inputs used by load.
  }, [session, key, revision]);

  const current = result?.session === session && result.key === key ? result : undefined;
  const data = current?.data;
  return {
    data,
    loading: Boolean(session && key && !current),
    update: (apply: (data: T) => T) => {
      setResult(previous => previous?.session === session && previous.key === key && previous.data !== undefined
        ? { ...previous, data: apply(previous.data) } : previous);
    },
  };
}

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId') || searchParams.get('id');
  const tabParam = searchParams.get('tab');
  const activeTab: EventTab = EVENT_TABS.includes(tabParam as EventTab) ? tabParam as EventTab : 'request';

  const { isAdmin, isManager, isUser, user, token, isLoading: authLoading } = useAuth();
  const isViewer = isUser || (!isAdmin && !isManager);
  const session = !authLoading && token && user ? `${user.id}:${isAdmin}:${isViewer}:${token}` : '';
  const [searchQuery, setSearchQuery] = useState('');
  const eventSearch = useSearchAfterTyping(searchQuery);
  const [eventPage, setEventPage] = useState({ search: '', page: 1 });
  const eventListPage = eventPage.search === eventSearch ? eventPage.page : 1;
  const eventListPageSize = 12;
  const [eventListRevision, setEventListRevision] = useState(0);
  const [isPmsSyncOpen, setIsPmsSyncOpen] = useState(false);

  // Selected Event & Participants state
  const [loadedEvent, setLoadedEvent] = useState<{ session: string; event: Event } | null>(null);
  const selectedEvent = loadedEvent?.session === session && String(loadedEvent.event.id) === eventIdParam ? loadedEvent.event : null;
  const emsApprovalManaged = isEmsApprovalEvent(selectedEvent);
  const checkEventDatabaseCompleteness = (contact: Database) =>
    checkDatabaseCompleteness(contact, selectedEvent?.syncDestination || undefined);
  const [participantRevision, setParticipantRevision] = useState(0);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const participantSearch = useSearchAfterTyping(participantSearchQuery);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterConfirmationStatus, setFilterConfirmationStatus] = useState('');
  const [filterRemarks, setFilterRemarks] = useState('');
  const [filterReminderHariH, setFilterReminderHariH] = useState('');
  const [filterReminderH7, setFilterReminderH7] = useState('');
  const [filterReminderH3, setFilterReminderH3] = useState('');
  const [filterReminderH1, setFilterReminderH1] = useState('');
  const [participantPage, setParticipantPage] = useState({ scope: '', page: 1 });
  const [pageSize, setPageSize] = useState(25);

  const getEventStatus = (startDateStr: string | null | undefined, endDateStr: string | null | undefined) => {
    if (!startDateStr) return null;
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date(startDateStr);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (today < start) {
      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { status: 'future', days: diffDays };
    } else if (today >= start && today <= end) {
      return { status: 'ongoing', days: 0 };
    } else {
      return { status: 'past', days: 0 };
    }
  };

  const formatDateDMY = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Modals state
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isDeleteEventConfirmOpen, setIsDeleteEventConfirmOpen] = useState(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isUpdateParticipantModalOpen, setIsUpdateParticipantModalOpen] = useState(false);
  const [isDeleteParticipantConfirmOpen, setIsDeleteParticipantConfirmOpen] = useState(false);
  const [deletingParticipant, setDeletingParticipant] = useState<EventParticipant | null>(null);
  const [submittingParticipantDelete, setSubmittingParticipantDelete] = useState(false);
  const [submittingParticipantUpdate, setSubmittingParticipantUpdate] = useState(false);
  const [isTakeoutModalOpen, setIsTakeoutModalOpen] = useState(false);
  const [selectedTakeoutDatabase, setSelectedTakeoutDatabase] = useState<Database | null>(null);
  const [isManageColumnsModalOpen, setIsManageColumnsModalOpen] = useState(false);

  const columnConfig = getEventColumnConfig(user?.id, selectedEvent?.id);

  // Form inputs for Event creation
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('partner');
  const [clientName, setClientName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [targetParticipants, setTargetParticipants] = useState(0);
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Form inputs for Event editing
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editName, setEditName] = useState('');
  const [editEventType, setEditEventType] = useState('partner');
  const [editClientName, setEditClientName] = useState('');
  const [editDateStart, setEditDateStart] = useState('');
  const [editDateEnd, setEditDateEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTargetParticipants, setEditTargetParticipants] = useState(0);

  // ponytail: EMS event mapping state
  const [emsSource, setEmsSource] = useState<EmsSource>('LEGACY');
  const [editEmsSource, setEditEmsSource] = useState<EmsSource>('LEGACY');
  const [syncDestination, setSyncDestination] = useState<SyncDestination>('');
  const [editSyncDestination, setEditSyncDestination] = useState<SyncDestination>('');
  const [isEmsSyncOpen, setIsEmsSyncOpen] = useState(false);
  const [emsEventId, setEmsEventId] = useState<number>(0);
  const [editEmsEventId, setEditEmsEventId] = useState<number>(0);

  // Delete event confirmation target
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  // Form states for adding/updating participants
  const [submittingParticipant, setSubmittingParticipant] = useState(false);
  const [activeParticipant, setActiveParticipant] = useState<EventParticipant | null>(null);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [eligibleManagers, setEligibleManagers] = useState<AppUser[]>([]);
  const [eligibleManagersLoad, setEligibleManagersLoad] = useState<{ eventId: number; status: 'loading' | 'ready' | 'error' } | null>(null);
  const eligibleManagersRequest = React.useRef(0);
  const [filterPic, setFilterPic] = useState('');
  
  // Excel Import states for Event Participants
  const [isImportParticipantsModalOpen, setIsImportParticipantsModalOpen] = useState(false);
  const [importParticipantsFile, setImportParticipantsFile] = useState<File | null>(null);
  const [importParticipantsProgress, setImportParticipantsProgress] = useState(0);
  const [isImportingParticipants, setIsImportingParticipants] = useState(false);

  const [selectedEngagementParticipant, setSelectedEngagementParticipant] = useState<EventParticipant | null>(null);
  const [isManagePicsModalOpen, setIsManagePicsModalOpen] = useState(false);

  const handleOpenEngagementModal = (participant: EventParticipant) => {
    setSelectedEngagementParticipant(participant);
  };

  const handleManagePicsSaved = async () => {
    const [freshUsers] = await Promise.all([
      crmService.getUsers().catch(() => usersList),
      selectedEvent ? loadEligibleManagers(selectedEvent.id) : Promise.resolve()
    ]);
    setUsersList(freshUsers);
    if (selectedEvent) {
      refreshParticipants();
    }
  };

  const eligiblePicUsers = eligibleManagers.filter((candidate) => {
    const uname = (candidate.username || '').toLowerCase();
    const fname = (candidate.fullName || '').toLowerCase();
    return uname !== 'kevin' && !fname.includes('kevin');
  });

  const eligiblePicNames = eligiblePicUsers.map((candidate) => candidate.fullName || candidate.username);

  const isAllowedPicName = (picName?: string | null) => {
    if (!picName) return false;
    return eligiblePicNames.some((name) => name.toLowerCase() === picName.trim().toLowerCase());
  };

  const eventId = selectedEvent?.id;
  const scopedPic = !isAdmin && !isViewer && user && activeTab !== 'request'
    ? (user.fullName || user.username)
    : filterPic || undefined;
  const eventFilters = React.useMemo(() => ({
    tab: activeTab,
    company: filterCompany || undefined,
    position: filterPosition || undefined,
    industry: filterIndustry || undefined,
    confirmationStatus: filterConfirmationStatus || undefined,
    remarks: activeTab === 'pre_event' ? filterRemarks || undefined : undefined,
    reminderH7: activeTab === 'reminder' ? filterReminderH7 || undefined : undefined,
    reminderH3: activeTab === 'reminder' ? filterReminderH3 || undefined : undefined,
    reminderH1: activeTab === 'reminder' ? filterReminderH1 || undefined : undefined,
    reminderHariH: filterReminderHariH || undefined,
    search: participantSearch || undefined,
  }), [activeTab, filterCompany, filterPosition, filterIndustry, filterConfirmationStatus, filterRemarks,
    filterReminderH7, filterReminderH3, filterReminderH1, filterReminderHariH, participantSearch]);
  const statisticsQuery = { ...eventFilters, pic: isAdmin ? filterPic || undefined : undefined };
  const filterScope = JSON.stringify([eventIdParam, eventFilters, scopedPic]);
  const currentPage = participantPage.scope === filterScope ? participantPage.page : 1;

  const setCurrentPage = (value: React.SetStateAction<number>) => {
    setParticipantPage({ scope: filterScope, page: typeof value === 'function' ? value(currentPage) : value });
  };
  const setEventListPage = (value: (current: number) => number) => {
    setEventPage({ search: eventSearch, page: value(eventListPage) });
  };

  const getParticipantQueryParams = () => ({ ...eventFilters, pic: scopedPic, page: currentPage, size: pageSize });
  const listParams = { search: eventSearch || undefined, page: eventListPage, size: eventListPageSize };
  const list = useEventLookup(session, eventIdParam ? null : JSON.stringify(listParams), eventListRevision,
    signal => crmService.getEventsList(listParams, signal), 'Failed to load events');
  const events = list.data?.items || [];
  const eventListTotal = list.data?.total || 0;
  const eventListTotalPages = list.data?.totalPages || 1;
  const eventListSummary = list.data?.summary || { total: 0, upcoming: 0, ongoing: 0, past: 0 };
  const loading = authLoading || (eventIdParam ? !selectedEvent : list.loading);
  const tableParams = getParticipantQueryParams();
  const tableKey = eventId ? JSON.stringify([eventId, tableParams]) : null;
  const statisticsKey = eventId ? JSON.stringify([eventId, statisticsQuery]) : null;
  const table = useEventLookup(session, tableKey, participantRevision,
    signal => crmService.getEventParticipantsByEvent(eventId!, tableParams, signal), 'Failed to fetch participants for this event');
  const statistics = useEventLookup(session, statisticsKey, participantRevision,
    signal => crmService.getEventStatistics(eventId!, statisticsQuery, signal), '');
  const filterOptions = useEventLookup(session, statisticsKey, participantRevision,
    signal => crmService.getEventParticipantFilterOptions(eventId!, statisticsQuery, signal), '');
  const participants = React.useMemo(() => [...(table.data?.items || [])].sort((a, b) => a.id - b.id), [table.data]);
  const participantsTotal = table.data?.total || 0;
  const loadingParticipants = table.loading;
  const eventStatistics = statistics.data;
  const participantFilterOptions = filterOptions.data;
  const declinedCount = (isAdmin || isViewer ? eventStatistics?.scopes?.all : eventStatistics?.scopes?.mine)?.declinedCount || 0;

  const loadWorkspaceParticipants = React.useCallback(async (all: boolean, signal: AbortSignal) => {
    if (!eventId) return [];
    const params = { ...eventFilters, pic: all ? filterPic || undefined : scopedPic, size: 500 };
    const first = await crmService.getEventParticipantsByEvent(eventId, { ...params, page: 1 }, signal);
    const items = [...first.items];
    for (let page = 2; page <= first.totalPages; page++) {
      const result = await crmService.getEventParticipantsByEvent(eventId, { ...params, page }, signal);
      items.push(...result.items);
    }
    if (items.length !== first.total || new Set(items.map(participant => participant.id)).size !== items.length) {
      throw new Error('Participant list changed while loading');
    }
    return items;
  }, [eventId, eventFilters, scopedPic, filterPic, session]);

  const refreshParticipants = () => {
    setParticipantRevision(revision => revision + 1);
    setEventListRevision(revision => revision + 1);
  };
  const loadData = () => {
    if (selectedEvent) refreshParticipants();
    else setEventListRevision(revision => revision + 1);
  };

  const loadEligibleManagers = async (eventId: number, signal?: AbortSignal) => {
    const request = ++eligibleManagersRequest.current;
    setEligibleManagers([]);
    setEligibleManagersLoad({ eventId, status: 'loading' });
    try {
      const data = await crmService.getEligibleManagersForEvent(eventId, signal);
      if (signal?.aborted || request !== eligibleManagersRequest.current) return;
      setEligibleManagers(Array.isArray(data) ? data : []);
      setEligibleManagersLoad({ eventId, status: 'ready' });
    } catch {
      if (signal?.aborted || request !== eligibleManagersRequest.current) return;
      setEligibleManagers([]);
      setEligibleManagersLoad({ eventId, status: 'error' });
    }
  };

  const adminUser = usersList.find(u => u.roles?.includes('ADMIN'));
  const adminName = adminUser ? (adminUser.fullName || adminUser.username) : 'Admin';

  useEffect(() => {
    if (!session) {
      setUsersList([]);
      return;
    }
    let cancelled = false;
    void crmService.getUsers().then(users => { if (!cancelled) setUsersList(users || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session || !eventIdParam) {
      setLoadedEvent(null);
      return;
    }
    if (!/^\d+$/.test(eventIdParam)) {
      router.replace('/dashboard/events');
      return;
    }
    const controller = new AbortController();
    handleResetFilters();
    setSelectedEngagementParticipant(null);
    setActiveParticipant(null);
    void crmService.getEventById(Number(eventIdParam), controller.signal).then(event => {
      if (!controller.signal.aborted) setLoadedEvent({ session, event });
    }).catch(() => {
      if (controller.signal.aborted) return;
      toast.error('Failed to open this event');
      router.replace('/dashboard/events');
    });
    return () => controller.abort();
  }, [session, eventIdParam, router]);

  useEffect(() => {
    if (!session || !eventId) return;
    const controller = new AbortController();
    void loadEligibleManagers(eventId, controller.signal);
    return () => controller.abort();
  }, [session, eventId]);

  useEffect(() => {
    setEventPage(current => current.search === eventSearch ? current : { search: eventSearch, page: 1 });
  }, [eventSearch]);

  useEffect(() => {
    setParticipantPage(current => current.scope === filterScope ? current : { scope: filterScope, page: 1 });
  }, [filterScope]);

  useEffect(() => {
    setSelectedParticipantIds(current => current.length ? [] : current);
  }, [session, tableKey]);

  useEffect(() => {
    if (!table.data) return;
    const visible = new Set(table.data.items.map(participant => participant.id));
    setSelectedParticipantIds(current => {
      const next = current.filter(id => visible.has(id));
      return next.length === current.length ? current : next;
    });
  }, [table.data]);

  const handleSyncPmsEvents = () => setIsPmsSyncOpen(true);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Event name is required');
      return;
    }
    if (!syncDestination) {
      toast.error('Pilih jenis event Korporat atau Peserta / Publik.');
      return;
    }

    setSubmittingEvent(true);
    try {
      await crmService.createEvent({
        name: name.trim(),
        eventType,
        clientName: clientName.trim() || undefined,
        dateStart: dateStart || undefined,
        dateEnd: dateEnd || undefined,
        notes: notes.trim() || undefined,
        targetParticipants: targetParticipants || 0,
        emsEventId: emsEventId || null,
        emsSource,
        syncDestination: syncDestination || null
      });

      toast.success('Event created successfully!');
      setIsCreateEventModalOpen(false);
      setName('');
      setClientName('');
      setDateStart('');
      setDateEnd('');
      setNotes('');
      setTargetParticipants(0);
      setEmsEventId(0);
      setEmsSource('LEGACY');
      setSyncDestination('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const formatForDateInput = (dStr?: string | null) => {
    if (!dStr) return '';
    const match = dStr.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    setEditName(event.name || '');
    setEditEventType(event.eventType || 'partner');
    setEditClientName(event.clientName || event.client || '');
    setEditDateStart(formatForDateInput(event.dateStart));
    setEditDateEnd(formatForDateInput(event.dateEnd));
    setEditNotes(event.notes || event.description || '');
    setEditTargetParticipants(event.targetParticipants || event.targetPax || 0);
    setEditEmsEventId(event.emsEventId || 0);
    setEditEmsSource(event.emsSource || 'LEGACY');
    setEditSyncDestination(event.syncDestination === 'company' || event.syncDestination === 'participant' ? event.syncDestination : '');
    setIsEditEventModalOpen(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editName.trim()) {
      toast.error('Event name is required');
      return;
    }
    if (!editSyncDestination) {
      toast.error('Pilih jenis event Korporat atau Peserta / Publik.');
      return;
    }

    setSubmittingEvent(true);
    try {
      const validTypes = ['partner', 'end_user', 'internal', 'other'];
      const safeEventType = validTypes.includes((editEventType || '').toLowerCase())
        ? (editEventType || '').toLowerCase()
        : 'partner';

      const updated = await crmService.updateEvent(editingEvent.id, {
        name: editName.trim(),
        eventType: safeEventType,
        clientName: editClientName.trim() || undefined,
        dateStart: editDateStart || undefined,
        dateEnd: editDateEnd || undefined,
        notes: editNotes.trim() || undefined,
        targetParticipants: editTargetParticipants || 0,
        emsEventId: editEmsEventId || null,
        emsSource: editEmsSource,
        syncDestination: editSyncDestination || null
      });

      toast.success('Event updated successfully!');
      setIsEditEventModalOpen(false);
      setEditingEvent(null);
      setLoadedEvent(current => current?.session === session && current.event.id === updated.id ? { session, event: updated } : current);
      refreshParticipants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const openDeleteEventConfirm = (event: Event) => {
    setDeletingEvent(event);
    setIsDeleteEventConfirmOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;
    setSubmittingEvent(true);
    try {
      await crmService.deleteEvent(deletingEvent.id);
      toast.success('Event deleted successfully!');
      setIsDeleteEventConfirmOpen(false);
      setDeletingEvent(null);
      setLoadedEvent(current => current?.event.id === deletingEvent.id ? null : current);
      setEventListRevision(revision => revision + 1);
      if (eventIdParam === String(deletingEvent.id)) router.push('/dashboard/events');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleSwitchTab = (tab: EventTab) => {
    if (tab !== activeTab) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      window.history.pushState(null, '', `?${params.toString()}${window.location.hash}`);
    }
    setSelectedParticipantIds([]);
    handleResetFilters();
  };

  const handleEventActivityLogged = refreshParticipants;

  const handleEventContactUpdated = (database: Database) => {
    const updateContact = (participant: EventParticipant) => participant.database.id === database.id
      ? { ...participant, database: { ...participant.database, ...database } } : participant;
    table.update(current => ({ ...current, items: current.items.map(updateContact) }));
    setActiveParticipant(current => current && updateContact(current));
    setSelectedEngagementParticipant(current => current && updateContact(current));
    handleEventActivityLogged();
  };

  const handleEventNotesUpdated = (participantId: number, notes: string) => {
    table.update(current => ({ ...current, items: current.items.map(participant => participant.id === participantId ? { ...participant, notes } : participant) }));
    setSelectedEngagementParticipant(current => current?.id === participantId ? { ...current, notes } : current);
    handleEventActivityLogged();
  };

  const handleSelectEvent = (event: Event) => {
    router.push(`/dashboard/events?eventId=${event.id}`);
  };

  const handleExportParticipants = async () => {
    if (!selectedEvent || participantsTotal === 0) {
      toast.error("Tidak ada data lead untuk di-export.");
      return;
    }
    try {
      const result = await crmService.exportEventParticipants(selectedEvent.id, getParticipantQueryParams());
      if (!result.rows.length) {
        toast.error('Tidak ada data lead untuk di-export.');
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(result.rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, result.sheetName);
      XLSX.writeFile(workbook, result.fileName);
      toast.success('Daftar participants berhasil di-export ke Excel!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export participants');
    }
  };

  const handleBatchUpdateAttendance = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    try {
      const result = await crmService.bulkUpdateEventParticipants({
        participantIds: selectedParticipantIds,
        attendanceStatus: status
      });

      setSelectedParticipantIds([]);
      if ((result?.skippedCount || 0) > 0) {
        toast.warning(`Berhasil mengupdate ${result.updatedCount} participants, gagal ${result.skippedCount} participants.`);
      } else {
        toast.success(`Berhasil mengupdate status attendance ${result.updatedCount} participants!`);
      }
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update attendance in bulk');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleBatchUpdateParticipantStatus = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    try {
      const result = await crmService.bulkUpdateEventParticipants({
        participantIds: selectedParticipantIds,
        participantStatus: status
      });

      setSelectedParticipantIds([]);
      if ((result?.skippedCount || 0) > 0) {
        toast.warning(`Berhasil mengupdate ${result.updatedCount} participants, gagal ${result.skippedCount} participants.`);
      } else {
        toast.success(`Berhasil mengupdate lead status ${result.updatedCount} participants!`);
      }
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update participant status in bulk');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleBatchUpdateConfirmationStatus = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    try {
      const result = await crmService.bulkUpdateEventParticipants({
        participantIds: selectedParticipantIds,
        confirmationStatus: status
      });

      setSelectedParticipantIds([]);
      if ((result?.skippedCount || 0) > 0) {
        toast.warning(`Berhasil mengupdate ${result.updatedCount} participants, gagal ${result.skippedCount} participants.`);
      } else {
        toast.success(`Berhasil mengupdate status konfirmasi ${result.updatedCount} participants!`);
      }
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update confirmation status in bulk');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleBatchUpdatePreEventApprovalStatus = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    try {
      const result = await crmService.bulkUpdateEventParticipants({
        participantIds: selectedParticipantIds,
        preEventApprovalStatus: status
      });

      setSelectedParticipantIds([]);
      if ((result?.skippedCount || 0) > 0) {
        toast.warning(`Berhasil mengupdate ${result.updatedCount} participants, gagal ${result.skippedCount} participants.`);
      } else {
        toast.success(`Berhasil mengupdate Pre Event approval ${result.updatedCount} participants!`);
      }
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pre-event approval in bulk');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleBatchUpdateReminderHariH = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    try {
      const result = await crmService.bulkUpdateEventParticipants({
        participantIds: selectedParticipantIds,
        reminderHariH: status
      });

      setSelectedParticipantIds([]);
      if ((result?.skippedCount || 0) > 0) {
        toast.warning(`Berhasil mengupdate ${result.updatedCount} participants, gagal ${result.skippedCount} participants.`);
      } else {
        toast.success(`Berhasil mengupdate status Hari H ${result.updatedCount} participants!`);
      }
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Hari H in bulk');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleBatchDeleteParticipants = async () => {
    if (!selectedEvent || selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);

    let successCount = 0;
    let failCount = 0;

    await Promise.all(selectedParticipantIds.map(async (participantId) => {
      try {
        await crmService.deleteEventParticipant(participantId);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }));

    setIsBatchUpdating(false);
    setSelectedParticipantIds([]);

    if (failCount > 0) {
      toast.warning(`Berhasil menghapus ${successCount} participants dari event, gagal ${failCount} participants.`);
    } else {
      toast.success(`Berhasil menghapus ${successCount} participants dari event!`);
    }

    refreshParticipants();
  };

  const handleResetFilters = () => {
    setParticipantSearchQuery('');
    setFilterCompany('');
    setFilterPosition('');
    setFilterIndustry('');
    setFilterConfirmationStatus('');
    setFilterRemarks('');
    setFilterReminderHariH('');
    setFilterReminderH7(''); setFilterReminderH3(''); setFilterReminderH1('');
    setFilterPic('');
  };

  const handleAddParticipant = async (databaseIds: number[], notes: string) => {
    if (!selectedEvent || databaseIds.length === 0) {
      toast.error('Please select at least one database');
      return;
    }

    setSubmittingParticipant(true);
    try {
      await crmService.createEventParticipant({
        eventId: selectedEvent.id,
        databaseIds,
        participantStatus: 'white',
        attendanceStatus: 'invited',
        confirmationStatus: 'pending',
        preEventApprovalStatus: 'pending',
        notes: activeTab === 'request'
          ? `[Origin: Request] ${notes.trim()}`.trim()
          : notes.trim() || undefined
      });

      toast.success(`Successfully added ${databaseIds.length} database(s) as lead(s)!`);
      setIsAddParticipantModalOpen(false);
      
      // Reload participants & statistics immediately
      refreshParticipants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add database(s) to event');
    } finally {
      setSubmittingParticipant(false);
    }
  };

  const handleDownloadTemplate = (destination: 'company' | 'participant') => {
    const headers = destination === 'participant' ? [
      'No', 'Nama Group/Holding Company', 'Nama Brand', 'Company Name', 'Salutation',
      'First Name', 'Last Name', 'Position', 'Division', 'Jobtitle', 'Address', 'Office Phone', 'Mobile Phone',
      'Personal Email Address', 'Industry', 'Company Size (Revenue)', 'Company Size (Employee)', 'Cabang/Kantor',
      'Postal Code', 'Company Website'
    ] : [
      'Nama Group', 'Nama Brand', 'Company Name', 'Salutation', 
      'First Name', 'Last Name', 'Position', 'Division',
      'Jobtitle', 'Address', 'Office Phone', 'Mobile Phone', 
      'Company Email Address', 'Personal Email Address', 'Industry', 
      'Company Size (Revenue)', 'Company Size (Employee)', 'Company Hardware', 
      'Linkedin Link', 'City', 'Company Website'
    ];
    
    const emailHeader = destination === 'participant' ? 'Personal Email Address' : 'Company Email Address';
    const sampleData = [
      {
        ...(destination === 'participant' ? { No: 1 } : {}),
        'First Name': 'Contoh Email',
        'Last Name': 'Uji',
        [emailHeader]: 'contoh.email@example.com',
        'Mobile Phone': ''
      },
      {
        ...(destination === 'participant' ? { No: 2 } : {}),
        'First Name': 'Contoh Telepon',
        'Last Name': 'Uji',
        [emailHeader]: '',
        'Mobile Phone': '081200000001'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Participants');

    worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 15) }));

    XLSX.writeFile(workbook, destination === 'participant'
      ? 'Event_Peserta_Import_Template.xlsx'
      : 'Event_Perusahaan_Import_Template.xlsx');
    toast.success('Template Excel berhasil diunduh!');
  };

  const handleImportParticipantsExcel = async (destination: 'company' | 'participant') => {
    if (!importParticipantsFile || !selectedEvent) return;
    if (!selectedEvent.syncDestination || destination !== selectedEvent.syncDestination) {
      toast.error('Tujuan import harus mengikuti jenis event. Buka Edit Event untuk memeriksanya.');
      return;
    }
    setIsImportingParticipants(true);

    try {
      setImportParticipantsProgress(10);
      const result = await crmService.importEventParticipants(
        selectedEvent.id,
        importParticipantsFile,
        destination,
        activeTab
      );
      setImportParticipantsProgress(100);
      toast.success(`Impor selesai! Ditambahkan: ${result.addedParticipants}. Sudah ada/skip: ${result.skippedParticipants}. Total dibaca: ${result.totalRows}.`);
      setIsImportParticipantsModalOpen(false);
      setImportParticipantsFile(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses file Excel.');
    } finally {
      setIsImportingParticipants(false);
      setImportParticipantsProgress(0);
    }
  };

  const handleBatchAssignPic = async (picName: string) => {
    if (selectedParticipantIds.length === 0) return;
    if (!isAllowedPicName(picName)) {
      toast.error('PIC yang dipilih harus user yang punya akses ke event ini.');
      return;
    }
    setIsBatchUpdating(true);
    try {
      const result = await crmService.bulkUpdateEventParticipants({
        participantIds: selectedParticipantIds,
        picName
      });

      setSelectedParticipantIds([]);
      if ((result?.skippedCount || 0) > 0) {
        toast.warning(`Berhasil menugaskan ${result.updatedCount} participants ke ${picName}, gagal ${result.skippedCount} participants.`);
      } else {
        toast.success(`Berhasil menugaskan ${result.updatedCount} participants ke ${picName}!`);
      }
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign PIC in bulk');
    } finally {
      setIsBatchUpdating(false);
    }
  };



  const handleOpenUpdateParticipantModal = (lead: EventParticipant) => {
    setActiveParticipant(lead);
    setIsUpdateParticipantModalOpen(true);
  };

  const handleUpdateParticipantStatus = async (data: {
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
    preEventApprovalStatus?: string;
  }) => {
    if (!selectedEvent || !activeParticipant) return;

    const nextPicName = extractPicFromNotes(data.notes).pic;
    if (!isAllowedPicName(nextPicName)) {
      toast.error('PIC yang dipilih harus user yang punya akses ke event ini.');
      return;
    }

    setSubmittingParticipantUpdate(true);
    try {
      const nextNotes = activeTab === 'pre_event'
        ? setPreEventApprovalStatus(data.notes, data.preEventApprovalStatus || 'pending')
        : data.notes;

      await crmService.updateParticipantStatus(
        activeParticipant.id,
        data.participantStatus,
        data.attendanceStatus,
        nextNotes || undefined,
        undefined, // participantCategory (removed)
        data.callStatus || undefined,
        data.emailStatus || undefined,
        data.whatsappStatus || undefined,
        undefined, // meetingStatus
        undefined, // businessChallenges
        undefined, // projectInfo
        undefined, // timeline
        data.reminderH7 || undefined,
        data.reminderH3 || undefined,
        data.reminderH1 || undefined,
        data.reminderHariH || undefined,
        data.confirmationStatus || undefined,
        activeTab === 'pre_event' ? data.preEventApprovalStatus : undefined
      );

      // Log activity in history
      await crmService.addEventParticipantActivity(activeParticipant.id, {
        activityType: 'CALL',
        status: data.participantStatus,
        notes: `Updated status and qualification details.`
      });

      toast.success('Lead status and qualification updated successfully!');
      setIsUpdateParticipantModalOpen(false);
      setActiveParticipant(null);
      
      // Reload participants
      refreshParticipants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    } finally {
      setSubmittingParticipantUpdate(false);
    }
  };

  const handleToggleEngagement = async (lead: EventParticipant, type: 'CALL' | 'EMAIL' | 'WHATSAPP') => {
    let callStatus = lead.callStatus || 'NOT_CONTACTED';
    let emailStatus = lead.emailStatus || 'NOT_SENT';
    let whatsappStatus = lead.whatsappStatus || 'NOT_SENT';
    let nextStatus = '';

    if (type === 'CALL') {
      callStatus = callStatus === 'CONNECTED' ? 'NOT_CONTACTED' : 'CONNECTED';
      nextStatus = callStatus;
    } else if (type === 'EMAIL') {
      emailStatus = emailStatus === 'SENT' ? 'NOT_SENT' : 'SENT';
      nextStatus = emailStatus;
    } else if (type === 'WHATSAPP') {
      whatsappStatus = whatsappStatus === 'SENT' ? 'NOT_SENT' : 'SENT';
      nextStatus = whatsappStatus;
    }

    try {
      await crmService.updateParticipantStatus(
        lead.id,
        lead.participantStatus,
        lead.attendanceStatus,
        lead.notes || undefined,
        undefined, // participantCategory (removed)
        callStatus,
        emailStatus,
        whatsappStatus,
        lead.meetingStatus || undefined,
        lead.businessChallenges || undefined,
        lead.projectInfo || undefined,
        lead.timeline || undefined,
        lead.reminderH7 || undefined,
        lead.reminderH3 || undefined,
        lead.reminderH1 || undefined,
        lead.reminderHariH || undefined
      );

      // Log activity in history
      await crmService.addEventParticipantActivity(lead.id, {
        activityType: type,
        status: nextStatus,
        notes: `Toggled ${type} status to ${nextStatus} via double-click.`
      });

      toast.success(`Updated ${type} status to ${nextStatus === 'CONNECTED' || nextStatus === 'SENT' ? 'ACTIVE' : 'INACTIVE'}!`);

      // Reload participants list
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to toggle ${type} status`);
    }
  };

  const handleDirectUpdateParticipant = async (
    lead: EventParticipant,
    field: 'remarks' | 'attendance' | 'confirmationStatus' | 'preEventApprovalStatus' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH',
    value: string
  ) => {
    let participantStatus = lead.participantStatus;
    let attendanceStatus = lead.attendanceStatus;
    let confirmationStatus = lead.confirmationStatus;
    let reminderH7 = lead.reminderH7;
    let reminderH3 = lead.reminderH3;
    let reminderH1 = lead.reminderH1;
    let reminderHariH = lead.reminderHariH;

    if (field === 'remarks') {
      participantStatus = value;
    } else if (field === 'attendance') {
      attendanceStatus = value;
    } else if (field === 'confirmationStatus') {
      confirmationStatus = value;
    } else if (field === 'reminderH7') {
      reminderH7 = value;
    } else if (field === 'reminderH3') {
      reminderH3 = value;
    } else if (field === 'reminderH1') {
      reminderH1 = value;
    } else if (field === 'reminderHariH') {
      reminderHariH = value;
      if (value === 'on_location') {
        attendanceStatus = 'attended';
      } else if (attendanceStatus === 'attended') {
        attendanceStatus = 'registered';
      }
    }

    try {
      if (isViewer) {
        if (activeTab !== 'request' || field !== 'confirmationStatus') {
          toast.error('Viewer can only approve or decline from Data List');
          return;
        }
        await crmService.updateParticipantStatus(
          lead.id,
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
          undefined,
          undefined,
          undefined,
          undefined,
          confirmationStatus || undefined
        );
        toast.success('Registration status updated successfully!');
        if (selectedEvent) {
          refreshParticipants();
        }
        return;
      }

      if (field === 'preEventApprovalStatus') {
        await crmService.updatePreEventApprovalStatus(
          lead.id,
          setPreEventApprovalStatus(lead.notes, value),
          value
        );
        await crmService.addEventParticipantActivity(lead.id, {
          activityType: 'SYSTEM',
          status: value,
          notes: `Updated Pre Event Approval to ${value}`
        });
        toast.success('Pre Event approval updated successfully!');
        if (selectedEvent) {
          refreshParticipants();
        }
        return;
      }

      await crmService.updateParticipantStatus(
        lead.id,
        field === 'remarks' ? value : undefined,
        field === 'attendance' ? value : (field === 'reminderHariH' ? (value === 'on_location' ? 'attended' : (lead.attendanceStatus === 'attended' ? 'registered' : undefined)) : undefined),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        field === 'reminderH7' ? value : undefined,
        field === 'reminderH3' ? value : undefined,
        field === 'reminderH1' ? value : undefined,
        field === 'reminderHariH' ? value : undefined,
        field === 'confirmationStatus' ? value : undefined
      );

      // Log activity for remarks and field updates so it appears in telemarketing activity stream under SYSTEM badge
      const fieldLabels: Record<string, string> = {
        remarks: 'Tele Remarks',
        attendance: 'Attendance',
        confirmationStatus: 'Client Approval',
        reminderH7: 'Reminder H-7',
        reminderH3: 'Reminder H-3',
        reminderH1: 'Reminder H-1',
        reminderHariH: 'Reminder Hari-H'
      };

      const friendlyLabel = fieldLabels[field] || field;
      await crmService.addEventParticipantActivity(lead.id, {
        activityType: 'SYSTEM',
        status: value,
        notes: `Updated ${friendlyLabel} to ${value || 'None'}`
      });

      toast.success(`Updated ${field} successfully!`);

      // Reload participants list
      if (selectedEvent) {
        refreshParticipants();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to update ${field}`);
    }
  };





  const openDeleteParticipantConfirm = (lead: EventParticipant) => {
    setDeletingParticipant(lead);
    setIsDeleteParticipantConfirmOpen(true);
  };

  const handleDeleteParticipant = async () => {
    if (!selectedEvent || !deletingParticipant) return;
    setSubmittingParticipantDelete(true);

    try {
      await crmService.deleteEventParticipant(deletingParticipant.id);
      toast.success('Participant removed from event successfully!');
      setIsDeleteParticipantConfirmOpen(false);
      setDeletingParticipant(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove participant');
    } finally {
      setSubmittingParticipantDelete(false);
    }
  };

  const handleFlagAsTikus = async (p: EventParticipant) => {
    try {
      if (!p.database) return;
      const nextNotes = p.notes?.includes('[TIKUS]')
        ? p.notes
        : `[TIKUS] ${p.notes || ''}`.trim();

      const fullName = `${p.database.firstName || ''} ${p.database.lastName || ''}`.trim();
      const phone = (p.database.mobilePhone || '').slice(0, 50);
      const email = p.database.emails?.[0]?.email ? p.database.emails[0].email.slice(0, 255) : undefined;

      await crmService.createFlaggedIdentity({
        nameUsed: fullName ? fullName.slice(0, 255) : 'Unknown',
        phoneUsed: phone || undefined,
        emailUsed: email || undefined,
        flagReason: 'multiple_identity',
        status: 'confirmed',
        database: { id: p.database.id } as any,
        event: selectedEvent ? ({ id: selectedEvent.id } as any) : undefined
      });

      await crmService.updateParticipantStatus(
        p.id,
        undefined,
        undefined,
        nextNotes
      );
      toast.success(`Peserta ${p.database.firstName} berhasil ditandai sebagai Tikus!`);
      await loadData();
    } catch (err: any) {
      toast.error('Gagal menandai peserta sebagai Tikus');
    }
  };

  const handleOpenTakeoutModal = (database: Database) => {
    setSelectedTakeoutDatabase(database);
    setIsTakeoutModalOpen(true);
  };

  const handleOpenAddParticipantModal = async () => {
    if (!selectedEvent) return;
    if (!selectedEvent.syncDestination) {
      toast.error('Tentukan jenis event sebelum menambahkan kontak.');
      openEditEventModal(selectedEvent);
      return;
    }
    setIsAddParticipantModalOpen(true);
  };

  const filteredEvents = events;

  const totalPages = Math.ceil(participantsTotal / pageSize) || 1;
  const indexOfLastItem = Math.min(currentPage * pageSize, participantsTotal);
  const indexOfFirstItem = participantsTotal === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const paginatedParticipants = participants;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header - Only show when NOT in event detail */}
      {!selectedEvent && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Event & Participant Management</h2>
            <p className="text-sm text-slate-500 mt-1">Track event attendance, confirmation color statuses, and client targets.</p>
          </div>
          {!isViewer && (
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={handleSyncPmsEvents}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Sync PMS Events
              </button>
              <button
                onClick={() => setIsCreateEventModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            </div>
          )}
        </div>
      )}

      {!selectedEvent ? (
        <div className="space-y-6">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm max-w-md">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search events by name, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 space-y-2">
              <CalendarDays className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-700">
                {!isAdmin && !searchQuery && eventListSummary.total === 0 ? "You don't have access to any events" : "No events found."}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {!isAdmin && !searchQuery && eventListSummary.total === 0 
                  ? "Please contact an administrator to assign event permissions to your account."
                  : "There are no events available matching your search criteria."}
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => {
                const registeredCount = evt.registeredCount || 0;
                const onLocationCount = evt.onLocationCount || 0;
                const target = evt.targetParticipants || 0;
                const isAchieved = Boolean(evt.targetAchieved);
                
                const typeColorMap: Record<string, string> = {
                  partner: 'bg-blue-600',
                  end_user: 'bg-emerald-600',
                  internal: 'bg-violet-600',
                  other: 'bg-slate-400'
                };
                const accentColor = typeColorMap[evt.eventType || 'other'] || 'bg-slate-400';
                const packageBadge = evt.addOn || (evt.notes && evt.notes.toLowerCase().includes('package:') ? evt.notes.split(/package:/i)[1]?.split('\n')[0]?.trim() : null);

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt)}
                    className="group relative pl-6 pr-5 py-5 rounded-2xl border bg-white border-slate-200 hover:border-blue-500/60 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 pr-1">
                          <h4
                            className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2"
                            title={evt.name}
                          >
                            {evt.name}
                          </h4>
                          {packageBadge && (
                            <div className="mt-2 max-w-full">
                              <span
                                title={packageBadge}
                                className="inline-flex max-w-full px-2.5 py-1 bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 text-[10px] font-semibold rounded-lg uppercase tracking-[0.12em] shadow-2xs"
                              >
                                <span className="truncate">{packageBadge}</span>
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="px-2.5 py-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-100 font-mono font-bold rounded-lg">
                            {formatDateDMY(evt.dateStart)}
                          </span>
                          {!isViewer && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditEventModal(evt);
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-all"
                                title="Edit Event"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteEventConfirm(evt);
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-650 transition-all"
                                title="Delete Event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-550 mt-1">Client: <strong className="text-slate-700">{evt.clientName || 'Independent'}</strong></p>
                      
                      <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                        <div className="flex justify-between items-center">
                          <span className="font-bold flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Registered:</span>
                          <span className="font-bold text-slate-800">{registeredCount} pax</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> On Location:</span>
                          <span className="font-bold text-emerald-700">{onLocationCount} pax</span>
                        </div>
                        {target > 0 && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 mt-1.5">
                            <span className="font-bold">Target Size:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-700">{target} pax</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                isAchieved
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-slate-150 text-slate-400 border border-slate-200'
                              }`}>
                                {isAchieved ? 'Achieved' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-600 rounded-md uppercase tracking-wider">
                        {evt.syncDestination === 'company' ? 'Korporat' : evt.syncDestination === 'participant' ? 'Peserta / Publik' : 'Jenis event belum ditentukan'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {eventListTotal > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500">
                  Showing <strong className="text-slate-900">{((eventListPage - 1) * eventListPageSize) + 1}</strong> to{' '}
                  <strong className="text-slate-900">{Math.min(eventListPage * eventListPageSize, eventListTotal)}</strong> of{' '}
                  <strong className="text-slate-900">{eventListTotal}</strong> events
                </p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setEventListPage((prev) => Math.max(1, prev - 1))}
                    disabled={eventListPage === 1}
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold text-slate-600 min-w-[72px] text-center">
                    {eventListPage} / {eventListTotalPages}
                  </span>
                  <button
                    onClick={() => setEventListPage((prev) => Math.min(eventListTotalPages, prev + 1))}
                    disabled={eventListPage >= eventListTotalPages}
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col w-full text-slate-900">
          <button
            onClick={() => {
              router.push('/dashboard/events');
            }}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-950 hover:-translate-x-0.5 font-medium text-sm mb-6 transition-all self-start duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events List
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-8 gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="font-bold text-2xl text-slate-900">
                  {selectedEvent.name}
                </h2>
                <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {selectedEvent.syncDestination === 'company' ? 'Korporat' : selectedEvent.syncDestination === 'participant' ? 'Peserta / Publik' : 'Jenis event belum ditentukan'}
                </span>
                {(() => {
                  const eventStatusInfo = getEventStatus(selectedEvent.dateStart, selectedEvent.dateEnd);
                  if (eventStatusInfo === null) return null;
                  
                  let badgeColor = "bg-blue-50 text-blue-600";
                  let label = "";
                  
                  if (eventStatusInfo.status === 'future') {
                    badgeColor = "bg-amber-50 text-amber-600";
                    label = `Sisa ${eventStatusInfo.days} hari lagi`;
                  } else if (eventStatusInfo.status === 'ongoing') {
                    badgeColor = "bg-emerald-50 text-emerald-600 animate-pulse";
                    label = "Ongoing";
                  } else {
                    badgeColor = "bg-slate-100 text-slate-500";
                    label = "Sudah berlalu";
                  }
                  
                  return (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${badgeColor}`}>
                      {label}
                    </span>
                  );
                })()}
              </div>
              <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Client: <strong className="text-slate-700">{selectedEvent.clientName || '-'}</strong></span>
                {selectedEvent.dateStart && <span>Duration: <strong className="text-slate-700">{formatDateDMY(selectedEvent.dateStart)} - {selectedEvent.dateEnd ? formatDateDMY(selectedEvent.dateEnd) : 'End'}</strong></span>}
                {selectedEvent.targetParticipants !== undefined && selectedEvent.targetParticipants > 0 ? (
                  <span>Target: <strong className="text-slate-700">{selectedEvent.targetParticipants} pax</strong></span>
                ) : (
                  <span>Target: <strong className="text-slate-400">Not Set</strong></span>
                )}
                {(eventStatistics?.scopes?.all?.registeredCount || 0) >= (selectedEvent.targetParticipants || 0) && selectedEvent.targetParticipants && selectedEvent.targetParticipants > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600">
                    Target Achieved
                  </span>
                )}
              </div>
              
              {selectedEvent.notes && (
                <p className="text-sm text-slate-500 mt-3 italic max-w-2xl">
                  &quot;{selectedEvent.notes}&quot;
                </p>
              )}
            </div>
            
            {!isViewer && (
              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                <button
                  onClick={() => openEditEventModal(selectedEvent)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all"
                  title="Edit Event details"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Event
                </button>
                <button
                  onClick={() => openDeleteEventConfirm(selectedEvent)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition-all"
                  title="Delete Event permanently"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </button>
              </div>
            )}
          </div>

          <EventPicPanel
            users={eligiblePicUsers}
            status={eligibleManagersLoad?.eventId === selectedEvent.id ? eligibleManagersLoad.status : 'loading'}
            onRetry={() => { void loadEligibleManagers(selectedEvent.id); }}
            onManage={isAdmin && !isViewer ? () => setIsManagePicsModalOpen(true) : undefined}
          />

          {/* Tab Switcher & Participant Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 shrink-0">
            <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleSwitchTab('request')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'request'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Data List
              </button>
              <button
                onClick={() => handleSwitchTab('pre_event')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'pre_event'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pre-Event
              </button>
              <button
                onClick={() => handleSwitchTab('reminder')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'reminder'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Reminder
              </button>
              <button
                onClick={() => handleSwitchTab('reminder_dday')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'reminder_dday'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Reminder Dday
              </button>
              <button
                onClick={() => handleSwitchTab('declined')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'declined'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Declined</span>
                {declinedCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded-full">
                    {declinedCount}
                  </span>
                )}
              </button>
            </div>

            {/* Participant Management Buttons */}
            <div className="flex flex-wrap items-center gap-2 pb-2 md:pb-0 self-start md:self-auto">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Tujuan import &amp; sync: <strong>{selectedEvent.syncDestination === 'participant' ? 'Database Peserta' : selectedEvent.syncDestination === 'company' ? 'Database Perusahaan' : 'Belum ditentukan'}</strong>
              </span>
              {!isViewer && !selectedEvent.syncDestination && <button type="button" onClick={() => openEditEventModal(selectedEvent)} className="text-sm font-semibold text-blue-700 underline">Atur jenis event</button>}
              {!isViewer && selectedEvent?.emsEventId && selectedEvent.emsEventId > 0 && (
                <button
                  onClick={() => setIsEmsSyncOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all"
                  title={`Sinkronisasi data peserta dari ${selectedEvent.emsSource === 'V2' ? 'EMS Baru' : 'EMS Lama'}`}
                >
                  <Loader2 className={`w-4 h-4 ${loadingParticipants ? 'animate-spin' : ''}`} />
                  Preview & Sync {selectedEvent.emsSource === 'V2' ? 'EMS Baru' : 'EMS Lama'}
                </button>
              )}
              {participantsTotal > 0 && (
                <button
                  onClick={handleExportParticipants}
                  disabled={participantSearch !== participantSearchQuery.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all"
                  title="Export current participant list to Excel"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              )}
              {!isViewer && (activeTab === 'request' || activeTab === 'pre_event') && (
                <button
                  onClick={() => setIsImportParticipantsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all"
                  title="Impor Peserta Baru via Excel"
                >
                  <Upload className="w-4 h-4" />
                  Import Excel
                </button>
              )}
              {!isViewer && (activeTab === 'request' || activeTab === 'pre_event') && (
                <button
                  onClick={() => void handleOpenAddParticipantModal()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all"
                  title="Add Participant directly to this Event"
                >
                  <Plus className="w-4 h-4" />
                  Add Participant
                </button>
              )}
            </div>
          </div>


          <EventStatistics
            activeTab={activeTab}
            participants={participants}
            loadWorkspaceParticipants={loadWorkspaceParticipants}
            workspaceRevision={participantRevision}
            statistics={eventStatistics}
            usersList={eligiblePicUsers}
            isAdmin={isAdmin}
            adminName={adminName}
            eventId={selectedEvent?.id}
            currentUser={user}
            isViewer={isViewer}
            onAutoSplit={!isViewer ? async ({ mode, managerNames }) => {
              if (!selectedEvent) return;
              const managerIds = eligiblePicUsers
                .filter((manager) => managerNames.some((name) => name.toLowerCase() === (manager.fullName || manager.username).toLowerCase()))
                .map((manager) => manager.id);

              if (managerIds.length === 0) {
                toast.error('Pilih minimal 1 PIC yang valid untuk event ini.');
                return;
              }

              setIsBatchUpdating(true);
              try {
                const result = await crmService.autoSplitEventAssignments(selectedEvent.id, {
                  mode,
                  managerIds
                });
                toast.success(`Berhasil membagi ${result.updatedCount} peserta ke ${result.managerCount} PIC.`);
                refreshParticipants();
              } catch (err: any) {
                toast.error(err.message || 'Failed to auto split assignments');
              } finally {
                setIsBatchUpdating(false);
              }
            } : undefined}
            onAssignPic={!isViewer ? async (ids, picName) => {
              if (!isAllowedPicName(picName)) {
                toast.error('PIC yang dipilih harus user yang punya akses ke event ini.');
                return;
              }
              setIsBatchUpdating(true);
              try {
                await crmService.bulkUpdateEventParticipants({
                  participantIds: ids,
                  picName
                });
                if (selectedEvent) {
                  refreshParticipants();
                }
              } catch (err: any) {
                toast.error(err.message || 'Failed to assign PIC');
              } finally {
                setIsBatchUpdating(false);
              }
            } : undefined}
            onOpenEngagementModal={!isViewer ? handleOpenEngagementModal : undefined}
            participantFilters={statisticsQuery}
          />

          {/* Batch Actions Status Bar */}
          {!isViewer && (
            <BatchActionsBar
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              activeTab={activeTab}
              usersList={eligiblePicUsers}
              handleBatchUpdateConfirmationStatus={handleBatchUpdateConfirmationStatus}
              handleBatchUpdatePreEventApprovalStatus={handleBatchUpdatePreEventApprovalStatus}
              handleBatchUpdateParticipantStatus={handleBatchUpdateParticipantStatus}
              handleBatchAssignPic={handleBatchAssignPic}
              handleBatchUpdateReminderHariH={handleBatchUpdateReminderHariH}
              handleBatchDeleteParticipants={handleBatchDeleteParticipants}
              isBatchUpdating={isBatchUpdating}
            />
          )}

          {/* Toolbar with Search & Advanced Filters */}
          {selectedEvent && (
            <ParticipantToolbar
              participants={participants}
              usersList={eligiblePicUsers}
              searchQuery={participantSearchQuery}
              setSearchQuery={setParticipantSearchQuery}
              filterCompany={filterCompany}
              setFilterCompany={setFilterCompany}
              filterPosition={filterPosition}
              setFilterPosition={setFilterPosition}
              filterIndustry={filterIndustry}
              setFilterIndustry={setFilterIndustry}
              filterConfirmationStatus={filterConfirmationStatus}
              setFilterConfirmationStatus={setFilterConfirmationStatus}
              filterRemarks={filterRemarks}
              setFilterRemarks={setFilterRemarks}
              filterReminderHariH={filterReminderHariH}
              setFilterReminderHariH={setFilterReminderHariH}
              filterReminderH7={filterReminderH7} setFilterReminderH7={setFilterReminderH7}
              filterReminderH3={filterReminderH3} setFilterReminderH3={setFilterReminderH3}
              filterReminderH1={filterReminderH1} setFilterReminderH1={setFilterReminderH1}
              filterPic={filterPic}
              setFilterPic={setFilterPic}
              filterOptions={participantFilterOptions}
              activeTab={activeTab}
              isAdmin={isAdmin}
              handleResetFilters={handleResetFilters}
            />
          )}

          {/* Participants Table */}
          {loadingParticipants ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : participantsTotal === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Eye className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-500">
                {participantSearchQuery || filterCompany || filterPosition || filterIndustry || filterConfirmationStatus || filterRemarks || filterReminderHariH || filterReminderH7 || filterReminderH3 || filterReminderH1 || filterPic
                  ? 'No matching participants found'
                  : 'No participants registered for this event'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {participantSearchQuery || filterCompany || filterPosition || filterIndustry || filterConfirmationStatus || filterRemarks || filterReminderHariH || filterReminderH7 || filterReminderH3 || filterReminderH1 || filterPic
                  ? 'Try adjusting your search terms.'
                  : 'Start by clicking "Add Lead" to register a database.'}
              </p>
            </div>
          ) : activeTab === 'request' || activeTab === 'pre_event' || activeTab === 'declined' ? (
            <RequestPreEventTable
              emsApprovalManaged={emsApprovalManaged}
              filteredParticipants={paginatedParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              activeTab={activeTab}
              checkDatabaseCompleteness={checkEventDatabaseCompleteness}
              handleToggleEngagement={handleToggleEngagement}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isViewer}
              isAdmin={isAdmin}
              adminName={adminName}
              extractPicFromNotes={extractPicFromNotes}
              getStatusBadgeStyle={getStatusBadgeStyle}
              getConfirmationStatusBadgeStyle={getConfirmationStatusBadgeStyle}
              onOpenEngagementModal={!isViewer ? handleOpenEngagementModal : undefined}
              columnConfig={columnConfig}
            />
          ) : activeTab === 'reminder' ? (
            <ReminderTable
              filteredParticipants={paginatedParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              checkDatabaseCompleteness={checkEventDatabaseCompleteness}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isViewer}
              getStatusBadgeStyle={getStatusBadgeStyle}
              onOpenEngagementModal={!isViewer ? handleOpenEngagementModal : undefined}
              columnConfig={columnConfig}
              adminName={adminName}
            />
          ) : (
            <ReminderDdayTable
              filteredParticipants={paginatedParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              checkDatabaseCompleteness={checkEventDatabaseCompleteness}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isViewer}
              getStatusBadgeStyle={getStatusBadgeStyle}
              onOpenEngagementModal={!isViewer ? handleOpenEngagementModal : undefined}
              columnConfig={columnConfig}
              adminName={adminName}
            />
          )}

          {/* Pagination Bar */}
          {participantsTotal > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-700 font-medium px-2 py-1 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entri per halaman</span>
                <span className="text-slate-300 mx-1">|</span>
                <span>
                  Menampilkan <strong className="text-slate-900">{indexOfFirstItem}</strong> -{' '}
                  <strong className="text-slate-900">
                    {indexOfLastItem}
                  </strong>{' '}
                  dari <strong className="text-slate-900">{participantsTotal}</strong> peserta
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 hover:bg-slate-100 rounded-md font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Prev
                </button>

                <span className="px-3 py-1.5 font-semibold text-slate-900 bg-slate-100 rounded-md">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 hover:bg-slate-100 rounded-md font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        name={name}
        setName={setName}
        eventType={eventType}
        setEventType={setEventType}
        clientName={clientName}
        setClientName={setClientName}
        dateStart={dateStart}
        setDateStart={setDateStart}
        dateEnd={dateEnd}
        setDateEnd={setDateEnd}
        notes={notes}
        setNotes={setNotes}
        targetParticipants={targetParticipants}
        setTargetParticipants={setTargetParticipants}
        emsSource={emsSource}
        setEmsSource={setEmsSource}
        syncDestination={syncDestination}
        setSyncDestination={setSyncDestination}
        emsEventId={emsEventId}
        setEmsEventId={setEmsEventId}
        submittingEvent={submittingEvent}
        onSubmit={handleCreateEvent}
      />

      <EmsSyncDialog
        isOpen={isEmsSyncOpen}
        event={selectedEvent}
        onClose={() => setIsEmsSyncOpen(false)}
        onConfigureEvent={() => {
          setIsEmsSyncOpen(false);
          if (selectedEvent) openEditEventModal(selectedEvent);
        }}
        onSynced={async () => { if (selectedEvent) refreshParticipants(); }}
      />

      <PmsSyncDialog
        isOpen={isPmsSyncOpen}
        onClose={() => setIsPmsSyncOpen(false)}
        onSynced={async () => { await loadData(); }}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditEventModalOpen}
        editingEvent={editingEvent}
        hasParticipants={Boolean(editingEvent && selectedEvent?.id === editingEvent.id && (participantsTotal > 0 || (eventStatistics?.scopes?.all?.participantCount || 0) > 0))}
        onClose={() => {
          setIsEditEventModalOpen(false);
          setEditingEvent(null);
        }}
        editName={editName}
        setEditName={setEditName}
        editEventType={editEventType}
        setEditEventType={setEditEventType}
        editClientName={editClientName}
        setEditClientName={setEditClientName}
        editDateStart={editDateStart}
        setEditDateStart={setEditDateStart}
        editDateEnd={editDateEnd}
        setEditDateEnd={setEditDateEnd}
        editNotes={editNotes}
        setEditNotes={setEditNotes}
        editTargetParticipants={editTargetParticipants}
        setEditTargetParticipants={setEditTargetParticipants}
        emsSource={editEmsSource}
        setEmsSource={setEditEmsSource}
        syncDestination={editSyncDestination}
        setSyncDestination={setEditSyncDestination}
        editEmsEventId={editEmsEventId}
        setEditEmsEventId={setEditEmsEventId}
        submittingEvent={submittingEvent}
        onSubmit={handleUpdateEvent}
        onManagePics={isAdmin ? () => {
          setIsEditEventModalOpen(false);
          setIsManagePicsModalOpen(true);
        } : undefined}
      />

      {/* Delete Event Confirmation Modal */}
      <DeleteEventConfirmModal
        isOpen={isDeleteEventConfirmOpen}
        deletingEvent={deletingEvent}
        onClose={() => {
          setIsDeleteEventConfirmOpen(false);
          setDeletingEvent(null);
        }}
        onConfirm={handleDeleteEvent}
        submittingEvent={submittingEvent}
      />

      {/* Add Lead Modal Overlay */}
      {selectedEvent && (
        <AddParticipantModal
          isOpen={isAddParticipantModalOpen}
          onClose={() => setIsAddParticipantModalOpen(false)}
          selectedEvent={selectedEvent}
          participantCount={participantsTotal}
          onAddParticipant={handleAddParticipant}
          submittingParticipant={submittingParticipant}
        />
      )}

      {selectedEvent && (
        <ManageEventPicsModal
          isOpen={isManagePicsModalOpen}
          onClose={() => setIsManagePicsModalOpen(false)}
          selectedEvent={selectedEvent}
          usersList={usersList}
          onSaved={handleManagePicsSaved}
        />
      )}

      {activeParticipant && (
        <UpdateParticipantModal
          isOpen={isUpdateParticipantModalOpen}
          onClose={() => {
            setIsUpdateParticipantModalOpen(false);
            setActiveParticipant(null);
          }}
          activeParticipant={activeParticipant}
          canEditContact={(isAdmin || isManager) && !isUser}
          onContactUpdated={handleEventContactUpdated}
          activeTab={activeTab}
          usersList={eligiblePicUsers}
          onSubmit={handleUpdateParticipantStatus}
          submittingParticipantUpdate={submittingParticipantUpdate}
          onFlagAsTikus={handleFlagAsTikus}
          onRequestTakeout={handleOpenTakeoutModal}
        />
      )}

      {selectedTakeoutDatabase && (
        <TakeoutModal
          isOpen={isTakeoutModalOpen}
          onClose={() => {
            setIsTakeoutModalOpen(false);
            setSelectedTakeoutDatabase(null);
          }}
          database={selectedTakeoutDatabase}
          onSubmitSuccess={() => {
            setIsTakeoutModalOpen(false);
            setSelectedTakeoutDatabase(null);
            loadData();
          }}
        />
      )}



      {/* Delete Lead Confirm Modal */}
      <DeleteParticipantConfirmModal
        isOpen={isDeleteParticipantConfirmOpen}
        deletingParticipant={deletingParticipant}
        onClose={() => {
          setIsDeleteParticipantConfirmOpen(false);
          setDeletingParticipant(null);
        }}
        onConfirm={handleDeleteParticipant}
        submittingParticipantDelete={submittingParticipantDelete}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        key={`${selectedEvent?.id || ''}:${selectedEvent?.syncDestination || ''}:${activeTab}`}
        eventDestination={selectedEvent?.syncDestination || undefined}
        onConfigureEvent={() => {
          setIsImportParticipantsModalOpen(false);
          setImportParticipantsFile(null);
          if (selectedEvent) openEditEventModal(selectedEvent);
        }}
        isOpen={isImportParticipantsModalOpen}
        onClose={() => {
          setIsImportParticipantsModalOpen(false);
          setImportParticipantsFile(null);
        }}
        eventId={selectedEvent?.id}
        importParticipantsFile={importParticipantsFile}
        setImportParticipantsFile={setImportParticipantsFile}
        isImportingParticipants={isImportingParticipants}
        importParticipantsProgress={importParticipantsProgress}
        activeTab={activeTab}
        onImport={handleImportParticipantsExcel}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {/* Engagement History Modal */}
      {selectedEngagementParticipant && (
        <EngagementModal
          key={selectedEngagementParticipant.id}
          emsApprovalManaged={emsApprovalManaged}
          isOpen
          onClose={() => setSelectedEngagementParticipant(null)}
          participant={selectedEngagementParticipant}
          onContactUpdated={!isViewer ? handleEventContactUpdated : undefined}
          onNotesUpdated={!isViewer ? handleEventNotesUpdated : undefined}
          onActivityLogged={handleEventActivityLogged}
          showLogForm={columnConfig.telemarketingLogs !== false}
        />
      )}
    </div>
  );
}
