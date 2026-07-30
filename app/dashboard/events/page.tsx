'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { crmService } from '../../../lib/services/crmService';
import { Event, EventParticipant, Database, AppUser } from '../../../lib/types';
import { CalendarDays, Plus, Loader2, UserPlus, Users, Edit2, Trash2, Download, ArrowLeft, Search, Eye, CheckCircle, Upload, RefreshCw, Columns } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import * as XLSX from 'xlsx';
import { RequestPreEventTable } from './components/RequestPreEventTable';
import { ReminderTable } from './components/ReminderTable';
import { ReminderDdayTable } from './components/ReminderDdayTable';
import { CreateEventModal } from './components/CreateEventModal';
import { EditEventModal } from './components/EditEventModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { DeleteEventConfirmModal } from './components/DeleteEventConfirmModal';
import { DeleteParticipantConfirmModal } from './components/DeleteParticipantConfirmModal';
import { AddParticipantModal } from './components/AddParticipantModal';
import { UpdateParticipantModal } from './components/UpdateParticipantModal';
import { TakeoutModal } from '../database/components/TakeoutModal';
import { EngagementModal } from './components/EngagementModal';
import { EventStatistics } from './components/EventStatistics';
import { ParticipantToolbar } from './components/ParticipantToolbar';
import { BatchActionsBar } from './components/BatchActionsBar';
import { ManageUserColumnsModal } from '../users/components/ManageUserColumnsModal';
import { extractPicFromNotes, extractPreEventApprovalStatus, setPreEventApprovalStatus, setPicInNotes } from './utils/notesHelper';
import { getStatusBadgeStyle, getConfirmationStatusBadgeStyle } from './utils/statusHelper';
import { checkDatabaseCompleteness } from '../database/utils/validationHelper';
import { exportParticipantsToExcel } from './utils/exportHelper';
import { importParticipantsFromExcel } from './utils/importHelper';
import { isEventAllowedForViewer } from '../../../lib/utils/viewerAccessHelper';
import { getEventColumnConfig } from './utils/columnConfigHelper';

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId') || searchParams.get('id');

  const { isAdmin, isManager, isUser, user } = useAuth();
  const isViewer = isUser || (!isAdmin && !isManager);
  const [events, setEvents] = useState<Event[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingPms, setIsSyncingPms] = useState(false);

  // Selected Event & Participants state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterConfirmationStatus, setFilterConfirmationStatus] = useState('');
  const [filterReminderHariH, setFilterReminderHariH] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const setParticipantsSorted = (participantsList: EventParticipant[]) => {
    const sorted = [...participantsList].sort((a, b) => a.id - b.id);
    setParticipants(sorted);
  };

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
  const [emsEventsList, setEmsEventsList] = useState<{ id: number; name: string }[]>([]);
  const [emsEventId, setEmsEventId] = useState<number>(0);
  const [editEmsEventId, setEditEmsEventId] = useState<number>(0);

  // Delete event confirmation target
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  // Form states for adding/updating participants
  const [submittingParticipant, setSubmittingParticipant] = useState(false);
  const [activeParticipant, setActiveParticipant] = useState<EventParticipant | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'pre_event' | 'declined' | 'reminder' | 'reminder_dday'>('request');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [filterPic, setFilterPic] = useState('');
  
  // Excel Import states for Event Participants
  const [isImportParticipantsModalOpen, setIsImportParticipantsModalOpen] = useState(false);
  const [importParticipantsFile, setImportParticipantsFile] = useState<File | null>(null);
  const [importParticipantsProgress, setImportParticipantsProgress] = useState(0);
  const [isImportingParticipants, setIsImportingParticipants] = useState(false);

  const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false);
  const [selectedEngagementParticipant, setSelectedEngagementParticipant] = useState<EventParticipant | null>(null);

  const handleOpenEngagementModal = (participant: EventParticipant) => {
    setSelectedEngagementParticipant(participant);
    setIsEngagementModalOpen(true);
  };

  const [allEventParticipants, setAllEventParticipants] = useState<EventParticipant[]>([]);

  const adminUser = usersList.find(u => u.roles?.includes('ADMIN'));
  const adminName = adminUser ? (adminUser.fullName || adminUser.username) : 'Admin';
  const isEmsParticipant = (p: EventParticipant) => {
    const attStatus = p.attendanceStatus?.toLowerCase();
    return p.notes?.includes('[Origin: EMS Sync]') ||
      p.notes?.includes('[EMS]') ||
      p.database?.source === 'event_registration' ||
      attStatus === 'registered' ||
      attStatus === 'attended';
  };

  const isPublicEmsOnlyParticipant = (p: EventParticipant) => {
    const notes = p.notes || '';
    const hasRequestOrigin = notes.includes('[Origin: Request]');
    const hasEmsOrigin = notes.includes('[Origin: EMS Sync]') || notes.includes('[EMS]');
    return !hasRequestOrigin && (hasEmsOrigin || p.database?.source === 'event_registration');
  };

  const getEffectiveConfirmationStatus = (p: EventParticipant) => {
    const confStatus = p.confirmationStatus?.toLowerCase() || 'pending';
    const attStatus = p.attendanceStatus?.toLowerCase();
    const notes = p.notes?.toLowerCase() || '';
    const participantStatus = p.participantStatus?.toLowerCase();
    const isExplicitlyDeclined = attStatus === 'cancelled' ||
      attStatus === 'canceled' ||
      attStatus === 'no_show' ||
      notes.includes('[ems declined]') ||
      notes.includes('declined_at');
    const isActiveEms = isEmsParticipant(p) && !isExplicitlyDeclined && (
      attStatus === 'registered' ||
      attStatus === 'attended' ||
      participantStatus === 'registered' ||
      participantStatus === 'green' ||
      participantStatus === 'confirm' ||
      participantStatus === 'confirmed' ||
      p.reminderHariH === 'on_location'
    );

    if (isActiveEms && (confStatus === 'decline' || confStatus === 'declined')) {
      return 'approve';
    }
    return confStatus;
  };

  const isRegisteredParticipant = (p: EventParticipant) => {
    const ps = p.participantStatus?.toLowerCase();
    const att = p.attendanceStatus?.toLowerCase();
    return ps === 'registered' ||
      ps === 'green' ||
      ps === 'confirm' ||
      ps === 'confirmed' ||
      att === 'registered' ||
      att === 'attended';
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      if (eventIdParam) {
        const matched = events.find(
          (ev) => String(ev.id) === eventIdParam || String(ev.pmsEventId) === eventIdParam || String(ev.emsEventId) === eventIdParam || (ev.name && eventIdParam.toLowerCase() === ev.name.trim().toLowerCase())
        );
        if (matched) {
          if (!selectedEvent || selectedEvent.id !== matched.id) {
            loadParticipantsForEvent(matched);
          }
        } else {
          setSelectedEvent(null);
          setParticipants([]);
        }
      } else {
        setSelectedEvent(null);
        setParticipants([]);
      }
    }
  }, [eventIdParam, events]);

  async function loadData() {
    setLoading(true);
    try {
      const [eList, cList, lList, uList, emsList] = await Promise.all([
        crmService.getEvents(),
        crmService.getDatabases(),
        crmService.getEventParticipants(),
        crmService.getUsers().catch(() => []),
        crmService.getEmsEvents().catch(() => [])
      ]);
      setEvents(eList);
      setDatabases(cList.filter(c => c.isActive)); // only active databases
      setAllEventParticipants(lList);
      setUsersList(uList);
      setEmsEventsList(emsList);

      // Check URL query parameters for eventId or id
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlEventId = urlParams.get('eventId') || urlParams.get('id');
        if (urlEventId) {
          const matchedEvent = eList.find(
            (ev) => String(ev.id) === urlEventId || String(ev.pmsEventId) === urlEventId || String(ev.emsEventId) === urlEventId || (ev.name && urlEventId.toLowerCase() === ev.name.trim().toLowerCase())
          );
          if (matchedEvent) {
            setSelectedEvent(matchedEvent);
            const filtered = lList.filter((l) =>
              l.event && (
                l.event.id === matchedEvent.id ||
                (l.event.name && matchedEvent.name && l.event.name.trim().toLowerCase() === matchedEvent.name.trim().toLowerCase())
              )
            );
            setParticipantsSorted(filtered);
            return;
          }
        }
      }

      if (selectedEvent) {
        const updatedSel = eList.find(
          (ev) => ev.id === selectedEvent.id || (ev.name && selectedEvent.name && ev.name.trim().toLowerCase() === selectedEvent.name.trim().toLowerCase())
        );
        if (updatedSel) {
          setSelectedEvent(updatedSel);
          const filtered = lList.filter((l) =>
            l.event && (
              l.event.id === updatedSel.id ||
              (l.event.name && updatedSel.name && l.event.name.trim().toLowerCase() === updatedSel.name.trim().toLowerCase())
            )
          );
          setParticipantsSorted(filtered);
        }
      }
    } catch (err) {
      toast.error('Failed to load events or databases');
    } finally {
      setLoading(false);
    }
  }

  const handleSyncPmsEvents = async () => {
    setIsSyncingPms(true);
    try {
      const res = await crmService.syncPmsEvents();
      if (res.syncedCount > 0) {
        toast.success(`Berhasil menyinkronkan ${res.syncedCount} event baru dari PMS!`);
      } else {
        toast.info(`Semua event PMS (${res.totalCount}) sudah tersimpan di lokal CRM.`);
      }
      loadData();
    } catch (err: any) {
      toast.error('Gagal terhubung ke server PMS (pms.kimcommunication.com). Periksa koneksi/server PMS.');
    } finally {
      setIsSyncingPms(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Event name is required');
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
        emsEventId: emsEventId || undefined
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
    setIsEditEventModalOpen(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editName.trim()) {
      toast.error('Event name is required');
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
        emsEventId: editEmsEventId || undefined
      });

      toast.success('Event updated successfully!');
      setIsEditEventModalOpen(false);
      setEditingEvent(null);
      setSelectedEvent(updated);
      await loadParticipantsForEvent(updated);
      loadData();
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
      setSelectedEvent(null);
      setParticipants([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleSwitchTab = (tab: 'request' | 'pre_event' | 'reminder' | 'reminder_dday' | 'declined') => {
    setActiveTab(tab);
    setSelectedParticipantIds([]);
    handleResetFilters();
  };

  const loadParticipantsForEvent = async (event: Event, targetTab?: 'request' | 'pre_event' | 'declined' | 'reminder' | 'reminder_dday') => {
    setSelectedEvent(event);
    setLoadingParticipants(true);
    setSelectedParticipantIds([]); // reset selection
    if (targetTab) {
      setActiveTab(targetTab);
    }
    try {
      const allParticipants = await crmService.getEventParticipants();
      setAllEventParticipants(allParticipants);
      const filteredParticipants = allParticipants.filter((l) => 
        l.event && (
          l.event.id === event.id ||
          (l.event.name && event.name && l.event.name.trim().toLowerCase() === event.name.trim().toLowerCase())
        )
      );
      setParticipantsSorted(filteredParticipants);
    } catch (err) {
      toast.error('Failed to fetch participants for this event');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleSelectEvent = (event: Event) => {
    router.push(`/dashboard/events?eventId=${event.id}`);
    loadParticipantsForEvent(event);
  };

  const handleExportParticipants = () => {
    if (!selectedEvent || filteredParticipants.length === 0) {
      toast.error("Tidak ada data lead untuk di-export.");
      return;
    }
    try {
      exportParticipantsToExcel(selectedEvent, filteredParticipants, activeTab, adminName);
      toast.success('Daftar participants berhasil di-export ke Excel!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export participants');
    }
  };

  const handleBatchUpdateAttendance = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    // Lakukan update untuk status attendance secara massal
    await Promise.all(selectedParticipantIds.map(async (participantId) => {
      try {
        const lead = participants.find(l => l.id === participantId);
        if (lead) {
          await crmService.updateParticipantStatus(
            participantId,
            lead.participantStatus,
            status,
            lead.notes || undefined,
            undefined, // participantCategory (removed)
            lead.callStatus || undefined,
            lead.emailStatus || undefined,
            lead.whatsappStatus || undefined,
            lead.meetingStatus || undefined,
            lead.businessChallenges || undefined,
            lead.projectInfo || undefined,
            lead.timeline || undefined,
            lead.reminderH7 || undefined,
            lead.reminderH3 || undefined,
            lead.reminderH1 || undefined,
            lead.reminderHariH || undefined,
            lead.confirmationStatus
          );
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));

    setIsBatchUpdating(false);
    setSelectedParticipantIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} participants, gagal ${failCount} participants.`);
    } else {
      toast.success(`Berhasil mengupdate status attendance ${successCount} participants!`);
    }

    if (selectedEvent) {
      handleSelectEvent(selectedEvent); // Reload list participants
    }
  };

  const handleBatchUpdateParticipantStatus = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    // Lakukan update untuk lead status secara massal
    await Promise.all(selectedParticipantIds.map(async (participantId) => {
      try {
        const lead = participants.find(l => l.id === participantId);
        if (lead) {
          await crmService.updateParticipantStatus(
            participantId,
            status,
            lead.attendanceStatus,
            lead.notes || undefined,
            undefined, // participantCategory (removed)
            lead.callStatus || undefined,
            lead.emailStatus || undefined,
            lead.whatsappStatus || undefined,
            lead.meetingStatus || undefined,
            lead.businessChallenges || undefined,
            lead.projectInfo || undefined,
            lead.timeline || undefined,
            lead.reminderH7 || undefined,
            lead.reminderH3 || undefined,
            lead.reminderH1 || undefined,
            lead.reminderHariH || undefined,
            lead.confirmationStatus
          );
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));

    setIsBatchUpdating(false);
    setSelectedParticipantIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} participants, gagal ${failCount} participants.`);
    } else {
      toast.success(`Berhasil mengupdate lead status ${successCount} participants!`);
    }

    if (selectedEvent) {
      await loadParticipantsForEvent(selectedEvent);
    }
  };

  const handleBatchUpdateConfirmationStatus = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    // Lakukan update untuk status confirmation secara massal
    await Promise.all(selectedParticipantIds.map(async (participantId) => {
      try {
        const lead = participants.find(l => l.id === participantId);
        if (lead) {
          await crmService.updateParticipantStatus(
            participantId,
            lead.participantStatus,
            lead.attendanceStatus,
            lead.notes || undefined,
            undefined, // participantCategory (removed)
            lead.callStatus || undefined,
            lead.emailStatus || undefined,
            lead.whatsappStatus || undefined,
            lead.meetingStatus || undefined,
            lead.businessChallenges || undefined,
            lead.projectInfo || undefined,
            lead.timeline || undefined,
            lead.reminderH7 || undefined,
            lead.reminderH3 || undefined,
            lead.reminderH1 || undefined,
            lead.reminderHariH || undefined,
            status
          );
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));

    setIsBatchUpdating(false);
    setSelectedParticipantIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} participants, gagal ${failCount} participants.`);
    } else {
      toast.success(`Berhasil mengupdate status konfirmasi ${successCount} participants!`);
    }

    if (selectedEvent) {
      await loadParticipantsForEvent(selectedEvent);
    }
  };

  const handleBatchUpdatePreEventApprovalStatus = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);

    let successCount = 0;
    let failCount = 0;

    await Promise.all(selectedParticipantIds.map(async (participantId) => {
      try {
        const lead = participants.find(l => l.id === participantId);
        if (lead) {
          await crmService.updateParticipantStatus(
            participantId,
            undefined,
            undefined,
            setPreEventApprovalStatus(lead.notes, status)
          );
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));

    setIsBatchUpdating(false);
    setSelectedParticipantIds([]);

    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} participants, gagal ${failCount} participants.`);
    } else {
      toast.success(`Berhasil mengupdate Pre Event approval ${successCount} participants!`);
    }

    if (selectedEvent) {
      await loadParticipantsForEvent(selectedEvent, activeTab);
    }
  };

  const handleBatchUpdateReminderHariH = async (status: string) => {
    if (selectedParticipantIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    await Promise.all(selectedParticipantIds.map(async (participantId) => {
      try {
        const lead = participants.find(l => l.id === participantId);
        if (lead) {
          await crmService.updateParticipantStatus(
            participantId,
            lead.participantStatus,
            lead.attendanceStatus,
            lead.notes || undefined,
            undefined,
            lead.callStatus || undefined,
            lead.emailStatus || undefined,
            lead.whatsappStatus || undefined,
            lead.meetingStatus || undefined,
            lead.businessChallenges || undefined,
            lead.projectInfo || undefined,
            lead.timeline || undefined,
            lead.reminderH7 || undefined,
            lead.reminderH3 || undefined,
            lead.reminderH1 || undefined,
            status,
            lead.confirmationStatus
          );
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));

    setIsBatchUpdating(false);
    setSelectedParticipantIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} participants, gagal ${failCount} participants.`);
    } else {
      toast.success(`Berhasil mengupdate status Hari H ${successCount} participants!`);
    }

    if (selectedEvent) {
      await loadParticipantsForEvent(selectedEvent);
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

    await loadParticipantsForEvent(selectedEvent, activeTab);
  };

  const handleResetFilters = () => {
    setParticipantSearchQuery('');
    setFilterCompany('');
    setFilterPosition('');
    setFilterIndustry('');
    setFilterConfirmationStatus('');
    setFilterReminderHariH('');
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
        notes: activeTab === 'request'
          ? `[Origin: Request] ${notes.trim()}`.trim()
          : notes.trim() || undefined
      });

      toast.success(`Successfully added ${databaseIds.length} database(s) as lead(s)!`);
      setIsAddParticipantModalOpen(false);
      
      // Reload participants & statistics immediately
      await loadParticipantsForEvent(selectedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add database(s) to event');
    } finally {
      setSubmittingParticipant(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Nama Group', 'Nama Brand', 'Company Name', 'Salutation', 
      'First Name', 'Last Name', 'Position', 'Speciality/Division', 
      'Jobtitle', 'Address', 'Office Phone', 'Mobile Phone', 
      'Company Email Address', 'Personal Email Address', 'Industry', 
      'Company Size (Revenue)', 'Company Size (Employee)', 'Company Hardware', 
      'Linkedin Link', 'City', 'Company Website'
    ];
    
    const sampleData = [
      {
        'Nama Group': 'Kim Holding',
        'Nama Brand': 'Kim Comm',
        'Company Name': 'Kim Communication PT',
        'Salutation': 'Mr',
        'First Name': 'Budi',
        'Last Name': 'Anto',
        'Position': 'manager',
        'Speciality/Division': 'Marketing',
        'Jobtitle': 'Marketing Director',
        'Address': 'Jl. Merdeka No. 10',
        'Office Phone': '021-1234567',
        'Mobile Phone': '081234567890',
        'Company Email Address': 'budi.anto@kimcomm.com',
        'Personal Email Address': 'budi.anto@gmail.com',
        'Industry': 'Telecommunication',
        'Company Size (Revenue)': '10B',
        'Company Size (Employee)': '100',
        'Company Hardware': 'Cisco',
        'Linkedin Link': 'https://linkedin.com/in/budianto',
        'City': 'Jakarta',
        'Company Website': 'www.kimcomm.com'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Participants');

    worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 15) }));

    XLSX.writeFile(workbook, 'Event_Participants_Import_Template.xlsx');
    toast.success('Template Excel berhasil diunduh!');
  };

  const handleImportParticipantsExcel = async () => {
    if (!importParticipantsFile || !selectedEvent) return;
    setIsImportingParticipants(true);

    try {
      const { successCount, errorCount } = await importParticipantsFromExcel(
        importParticipantsFile,
        selectedEvent.id,
        activeTab,
        participants,
        setImportParticipantsProgress,
        crmService
      );
      toast.success(`Impor selesai! Berhasil: ${successCount} baris. Gagal/Skip: ${errorCount} baris.`);
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
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    await Promise.all(selectedParticipantIds.map(async (participantId) => {
      try {
        const lead = participants.find(l => l.id === participantId);
        if (lead) {
          const newNotes = setPicInNotes(lead.notes, picName);
          
          await crmService.updateParticipantStatus(
            participantId,
            lead.participantStatus,
            lead.attendanceStatus,
            newNotes,
            undefined,
            lead.callStatus || undefined,
            lead.emailStatus || undefined,
            lead.whatsappStatus || undefined,
            lead.meetingStatus || undefined,
            lead.businessChallenges || undefined,
            lead.projectInfo || undefined,
            lead.timeline || undefined,
            lead.reminderH7 || undefined,
            lead.reminderH3 || undefined,
            lead.reminderH1 || undefined,
            lead.reminderHariH || undefined,
            lead.confirmationStatus
          );
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));

    setIsBatchUpdating(false);
    setSelectedParticipantIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil menugaskan ${successCount} participants ke ${picName}, gagal ${failCount} participants.`);
    } else {
      toast.success(`Berhasil menugaskan ${successCount} participants ke ${picName}!`);
    }

    if (selectedEvent) {
      handleSelectEvent(selectedEvent);
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
    preEventApprovalStatus: string;
  }) => {
    if (!selectedEvent || !activeParticipant) return;

    setSubmittingParticipantUpdate(true);
    try {
      const nextNotes = activeTab === 'pre_event'
        ? setPreEventApprovalStatus(data.notes, data.preEventApprovalStatus)
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
        data.confirmationStatus || undefined
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
      await loadParticipantsForEvent(selectedEvent);
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
        const allParticipants = await crmService.getEventParticipants();
        setAllEventParticipants(allParticipants);
        const filteredParticipants = allParticipants.filter((l) => l.event.id === selectedEvent.id);
        setParticipantsSorted(filteredParticipants);
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
          const allParticipants = await crmService.getEventParticipants();
          setAllEventParticipants(allParticipants);
          const filteredParticipants = allParticipants.filter((l) => l.event.id === selectedEvent.id);
          setParticipantsSorted(filteredParticipants);
        }
        return;
      }

      if (field === 'preEventApprovalStatus') {
        await crmService.updateParticipantStatus(
          lead.id,
          undefined,
          undefined,
          setPreEventApprovalStatus(lead.notes, value)
        );
        toast.success('Pre Event approval updated successfully!');
        if (selectedEvent) {
          await loadParticipantsForEvent(selectedEvent, activeTab);
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

      // Log activity (skip for Data List fields: remarks & confirmationStatus)
      if (field !== 'remarks' && field !== 'confirmationStatus') {
        await crmService.addEventParticipantActivity(lead.id, {
          activityType: 'CALL',
          status: value,
          notes: `Directly updated ${field} to ${value || 'None'} from the participants list table.`
        });
      }

      toast.success(`Updated ${field} successfully!`);

      // Reload participants list
      if (selectedEvent) {
        const allParticipants = await crmService.getEventParticipants();
        setAllEventParticipants(allParticipants);
        const filteredParticipants = allParticipants.filter((l) => l.event.id === selectedEvent.id);
        setParticipantsSorted(filteredParticipants);
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

      await crmService.createFlaggedIdentity({
        nameUsed: `${p.database.firstName} ${p.database.lastName || ''}`.trim(),
        phoneUsed: p.database.mobilePhone || '',
        flagReason: 'multiple_identity',
        status: 'confirmed',
        database: p.database,
        event: selectedEvent || undefined
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
  const filteredEvents = events.filter((e) => {
    if (isViewer && !isEventAllowedForViewer(e.id, user)) {
      return false;
    }
    return (
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.clientName && e.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const filteredParticipants = participants.filter((l) => {
    const confStatus = getEffectiveConfirmationStatus(l);
    const attStatus = l.attendanceStatus?.toLowerCase();
    const isEms = isEmsParticipant(l);

    if (activeTab === 'request') {
      // Data List tab: Master DB candidates for lead vetting
      // Keep Data List candidates visible even if they also registered via EMS
      if (isPublicEmsOnlyParticipant(l)) {
        return false;
      }
    } else if (activeTab === 'pre_event') {
      // Pre-Event tab: EMS registrants + approved DB candidates
      if (confStatus === 'decline' || confStatus === 'declined' || extractPreEventApprovalStatus(l.notes) === 'decline') {
        return false;
      }
      if (!isEms && confStatus !== 'approve' && confStatus !== 'confirmed') {
        return false;
      }
    } else if (activeTab === 'declined') {
      // Declined tab: All declined registrants (EMS declined, DB declined, or Pre-Event declined)
      const isClientDeclined = confStatus === 'decline' || confStatus === 'declined';
      const isPreEventDeclined = extractPreEventApprovalStatus(l.notes) === 'decline';
      if (!isClientDeclined && !isPreEventDeclined) {
        return false;
      }
    } else if (activeTab === 'reminder') {
      // Reminder tab: approved and registered participants only
      if (confStatus !== 'approve' && confStatus !== 'confirmed') {
        return false;
      }
      if (!isRegisteredParticipant(l)) {
        return false;
      }
    } else if (activeTab === 'reminder_dday') {
      // Reminder D-Day tab: same approved and registered base as Reminder
      if (confStatus !== 'approve' && confStatus !== 'confirmed') {
        return false;
      }
      if (!isRegisteredParticipant(l)) {
        return false;
      }
    }

    // 1. General search query (if typed, search takes priority)
    if (participantSearchQuery) {
      const term = participantSearchQuery.toLowerCase().trim();
      const fn = l.database?.firstName || '';
      const ln = l.database?.lastName || '';
      const fullName = `${fn} ${ln}`.trim().toLowerCase();
      const companyName = l.database?.company?.name?.toLowerCase() || '';
      const jobTitle = l.database?.jobTitle?.toLowerCase() || '';
      const email = l.database?.emails?.map(e => e.email.toLowerCase()).join(' ') || '';
      const mobilePhone = l.database?.mobilePhone || '';
      const officePhone = l.database?.company?.officePhone || '';

      const combinedText = `${fullName} ${fn} ${ln} ${companyName} ${jobTitle} ${email} ${mobilePhone} ${officePhone}`.toLowerCase();
      const words = term.split(/\s+/).filter(Boolean);
      const matchesSearch = words.every(w => combinedText.includes(w));
      if (!matchesSearch) return false;

      // If non-admin manager, still enforce PIC ownership
      if (!isAdmin && !isViewer && user) {
        const { pic } = extractPicFromNotes(l.notes);
        const myName = user.fullName || user.username;
        const isMyPic = pic.toLowerCase() === myName.toLowerCase() || 
                        (pic.toLowerCase() === 'admin' && myName.toLowerCase() === adminName.toLowerCase());
        if (!isMyPic) return false;
      }

      return true; // Bypass specific dropdown filters so user can find searched lead!
    }

    // Status filter. In Pre-Event this filters its own approval stored in notes, not Data List client approval.
    if (filterConfirmationStatus) {
      const targetConf = filterConfirmationStatus.toLowerCase();
      if (activeTab === 'pre_event') {
        if (extractPreEventApprovalStatus(l.notes) !== targetConf) return false;
      } else if (confStatus !== targetConf) {
        if (targetConf === 'approve') {
          if (confStatus !== 'approve' && confStatus !== 'confirmed') return false;
        } else if (targetConf === 'decline') {
          if (confStatus !== 'decline' && confStatus !== 'declined') return false;
        } else if (targetConf === 'pending') {
          if (confStatus !== 'pending') return false;
        } else {
          return false;
        }
      }
    }

    const cleanStatusValue = (v?: string | null) => (!v || v === 'null' || v === 'undefined') ? '' : v.toLowerCase();

    // Hari H Status filter (only apply for reminder_dday tab)
    if (activeTab === 'reminder_dday' && filterReminderHariH) {
      const effectiveHariH = cleanStatusValue(l.reminderHariH) || (l.attendanceStatus?.toLowerCase() === 'attended' ? 'on_location' : '');
      const filterVal = filterReminderHariH.toLowerCase();

      if (filterVal === 'on_location') {
        if (effectiveHariH !== 'on_location') return false;
      } else if (filterVal === 'on_the_way') {
        if (effectiveHariH !== 'on_the_way') return false;
      } else if (filterVal === 'not_respond_yet') {
        if (effectiveHariH && effectiveHariH !== 'not_respon_yet' && !effectiveHariH.startsWith('not_respond_')) return false;
        if (effectiveHariH === 'on_location' || effectiveHariH === 'on_the_way' || effectiveHariH === 'unable_to_attend') return false;
      } else if (filterVal === 'unable_to_attend') {
        if (effectiveHariH !== 'unable_to_attend') return false;
      } else if (effectiveHariH !== filterVal) {
        return false;
      }
    }

    // PIC filter (only apply for non-request tabs)
    if (activeTab !== 'request') {
      const { pic } = extractPicFromNotes(l.notes);
      if (!isAdmin && !isViewer && user) {
        const myName = user.fullName || user.username;
        const isMyPic = pic.toLowerCase() === myName.toLowerCase() || 
                        (pic.toLowerCase() === 'admin' && myName.toLowerCase() === adminName.toLowerCase());
        if (!isMyPic) {
          return false;
        }
      } else {
        if (filterPic) {
          const isMatch = pic.toLowerCase() === filterPic.toLowerCase() || 
                          (pic.toLowerCase() === 'admin' && filterPic.toLowerCase() === adminName.toLowerCase());
          if (!isMatch) return false;
        }
      }
    }

    // 1. General search query
    if (participantSearchQuery) {
      const term = participantSearchQuery.toLowerCase().trim();
      const fn = l.database?.firstName || '';
      const ln = l.database?.lastName || '';
      const fullName = `${fn} ${ln}`.trim().toLowerCase();
      const companyName = l.database?.company?.name?.toLowerCase() || '';
      const jobTitle = l.database?.jobTitle?.toLowerCase() || '';
      const email = l.database?.emails?.map(e => e.email.toLowerCase()).join(' ') || '';
      const mobilePhone = l.database?.mobilePhone || '';
      const officePhone = l.database?.company?.officePhone || '';

      const combinedText = `${fullName} ${fn} ${ln} ${companyName} ${jobTitle} ${email} ${mobilePhone} ${officePhone}`.toLowerCase();
      const words = term.split(/\s+/).filter(Boolean);
      const matchesSearch = words.every(w => combinedText.includes(w));
      if (!matchesSearch) return false;
    }

    // 2. Company filter
    if (filterCompany && l.database.company?.name !== filterCompany) {
      return false;
    }

    // 3. Position level filter
    if (filterPosition && l.database.positionLevel !== filterPosition) {
      return false;
    }

    // 4. Industry filter
    if (filterIndustry && l.database.company?.industry !== filterIndustry) {
      return false;
    }

    return true;
  });

  const displayParticipants = filteredParticipants.map((p) => {
    const effectiveStatus = getEffectiveConfirmationStatus(p);
    if (effectiveStatus === p.confirmationStatus?.toLowerCase()) return p;
    return { ...p, confirmationStatus: effectiveStatus };
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedEvent?.id,
    activeTab,
    participantSearchQuery,
    filterCompany,
    filterPosition,
    filterIndustry,
    filterConfirmationStatus,
    filterReminderHariH,
    filterPic
  ]);

  const totalPages = Math.ceil(displayParticipants.length / pageSize) || 1;
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const paginatedParticipants = displayParticipants.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Event & Participant Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track event attendance, confirmation color statuses, and client targets.</p>
        </div>
        {!isViewer && !selectedEvent && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleSyncPmsEvents}
              disabled={isSyncingPms}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/10 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingPms ? 'animate-spin' : ''}`} />
              {isSyncingPms ? 'Syncing PMS...' : 'Sync PMS Events'}
            </button>
            <button
              onClick={() => setIsCreateEventModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        )}
      </div>

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
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
              <CalendarDays className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No events found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => {
                const eventParticipants = allEventParticipants.filter(
                  (l) => l.event && (
                    l.event.id === evt.id ||
                    (l.event.name && evt.name && l.event.name.trim().toLowerCase() === evt.name.trim().toLowerCase())
                  )
                );
                const registeredCount = eventParticipants.filter(p => {
                  const ps = (p.participantStatus || '').toLowerCase();
                  const att = (p.attendanceStatus || '').toLowerCase();
                  return ps === 'registered' || ps === 'green' || ps === 'confirm' || ps === 'confirmed' || att === 'registered';
                }).length;
                const onLocationCount = eventParticipants.filter(p => p.reminderHariH === 'on_location' || p.attendanceStatus?.toLowerCase() === 'attended').length;
                const target = evt.targetParticipants || 0;
                const isAchieved = target > 0 && onLocationCount >= target;
                
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 pr-1">
                          <h4 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-2">{evt.name}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {packageBadge && (
                            <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-black rounded-lg uppercase tracking-wider shadow-2xs">
                              {packageBadge}
                            </span>
                          )}
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
                          <span className="font-black text-slate-800">{registeredCount} pax</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> On Location:</span>
                          <span className="font-black text-emerald-700">{onLocationCount} pax</span>
                        </div>
                        {target > 0 && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 mt-1.5">
                            <span className="font-bold">Target Size:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-700">{target} pax</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
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
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-slate-50 border border-slate-200 text-slate-600 rounded-md uppercase tracking-wider">
                        {evt.eventType}
                      </span>
                      <span className="text-[10px] text-slate-550 font-mono">
                        {formatDateDMY(evt.dateStart)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col w-full text-slate-900 transition-all duration-300">
          <button
            onClick={() => {
              router.push('/dashboard/events');
            }}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-950 hover:-translate-x-0.5 font-bold text-xs mb-5 transition-all self-start duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events List
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
            <div>
              <h3 className="font-extrabold text-2xl text-slate-900 mt-1.5 flex flex-wrap items-center gap-2">
                <span>{selectedEvent.name}</span>
                {(() => {
                  const eventStatusInfo = getEventStatus(selectedEvent.dateStart, selectedEvent.dateEnd);
                  if (eventStatusInfo === null) return null;
                  
                  let badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                  let label = "";
                  
                  if (eventStatusInfo.status === 'future') {
                    badgeColor = "bg-amber-50 text-amber-700 border-amber-200/50";
                    label = `Sisa ${eventStatusInfo.days} hari lagi`;
                  } else if (eventStatusInfo.status === 'ongoing') {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-250/60 animate-pulse";
                    label = "Ongoing";
                  } else {
                    badgeColor = "bg-slate-100 text-slate-500 border-slate-200";
                    label = "Sudah berlalu";
                  }
                  
                  return (
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badgeColor}`}>
                      {label}
                    </span>
                  );
                })()}
              </h3>
              <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Client: <strong className="text-slate-700">{selectedEvent.clientName || '-'}</strong></span>
                {selectedEvent.dateStart && <span> | Duration: <strong className="text-slate-700">{formatDateDMY(selectedEvent.dateStart)} - {selectedEvent.dateEnd ? formatDateDMY(selectedEvent.dateEnd) : 'End'}</strong></span>}
                {selectedEvent.targetParticipants !== undefined && selectedEvent.targetParticipants > 0 ? (
                  <>
                    <span> | Target: <strong className="text-slate-700">{selectedEvent.targetParticipants} pax</strong></span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ml-1 ${
                      participants.filter(p => p.reminderHariH === 'on_location' || p.attendanceStatus?.toLowerCase() === 'attended').length >= selectedEvent.targetParticipants
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-550 border border-slate-200'
                    }`}>
                      {participants.filter(p => p.reminderHariH === 'on_location' || p.attendanceStatus?.toLowerCase() === 'attended').length >= selectedEvent.targetParticipants
                        ? 'Target Achieved'
                        : 'Not Achieved'}
                    </span>
                  </>
                ) : (
                  <span> | Target: <strong className="text-slate-400">Not Set</strong></span>
                )}
              </div>
              
              {selectedEvent.notes && (
                <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic max-w-2xl">
                  "{selectedEvent.notes}"
                </p>
              )}
            </div>
            
            {!isViewer && (
              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                <button
                  onClick={() => openEditEventModal(selectedEvent)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  title="Edit Event details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Event
                </button>
                <button
                  onClick={() => openDeleteEventConfirm(selectedEvent)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-50 border border-red-100 hover:bg-red-100/70 text-red-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  title="Delete Event permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Event
                </button>
              </div>
            )}
          </div>

          {/* Tab Switcher & Participant Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 mb-4 gap-3 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => handleSwitchTab('request')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'request'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Data List
              </button>
              <button
                onClick={() => handleSwitchTab('pre_event')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'pre_event'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Pre-Event
              </button>
              <button
                onClick={() => handleSwitchTab('reminder')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'reminder'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Reminder
              </button>
              <button
                onClick={() => handleSwitchTab('reminder_dday')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'reminder_dday'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Reminder Dday
              </button>
              <button
                onClick={() => handleSwitchTab('declined')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'declined'
                    ? 'border-rose-600 text-rose-600 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Declined</span>
                {participants.filter(p => {
                  const status = getEffectiveConfirmationStatus(p);
                  return status === 'decline' || status === 'declined' || extractPreEventApprovalStatus(p.notes) === 'decline';
                }).length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black bg-rose-100 text-rose-700 rounded-full">
                    {participants.filter(p => {
                      const status = getEffectiveConfirmationStatus(p);
                      return status === 'decline' || status === 'declined' || extractPreEventApprovalStatus(p.notes) === 'decline';
                    }).length}
                  </span>
                )}
              </button>
            </div>

            {/* Participant Management Buttons */}
            <div className="flex flex-wrap items-center gap-2 pb-2 md:pb-0 self-start md:self-auto">
              {!isViewer && selectedEvent?.emsEventId && selectedEvent.emsEventId > 0 && (
                <button
                  onClick={async () => {
                    if (selectedEvent) {
                      setLoadingParticipants(true);
                      try {
                        toast.info('Memulai sinkronisasi data EMS...');
                        const res = await crmService.syncEmsParticipants(selectedEvent.id);
                        toast.success(`Berhasil menyinkronkan ${res?.count || 0} peserta dari EMS!`);
                        // Auto-reload data and stay on the current tab
                        await loadParticipantsForEvent(selectedEvent, activeTab);
                      } catch (err: any) {
                        toast.error(err?.message || 'Gagal menyinkronkan data EMS');
                      } finally {
                        setLoadingParticipants(false);
                      }
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  title="Sinkronisasi data peserta dari EMS"
                >
                  <Loader2 className={`w-3.5 h-3.5 ${loadingParticipants ? 'animate-spin' : ''}`} />
                  Sync EMS
                </button>
              )}
              {participants.length > 0 && (
                <button
                  onClick={handleExportParticipants}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  title="Export current participant list to Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Excel
                </button>
              )}
              {!isViewer && (activeTab === 'request' || activeTab === 'pre_event') && (
                <button
                  onClick={() => setIsImportParticipantsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  title="Impor Peserta Baru via Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  Import Excel
                </button>
              )}
              {!isViewer && (activeTab === 'request' || activeTab === 'pre_event') && (
                <button
                  onClick={() => setIsAddParticipantModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  title="Add Participant directly to this Event"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Participant
                </button>
              )}
            </div>
          </div>

          <EventStatistics
            activeTab={activeTab}
            participants={displayParticipants}
            usersList={usersList}
            isAdmin={isAdmin}
            adminName={adminName}
            eventId={selectedEvent?.id}
            currentUser={user}
            isViewer={isViewer}
            onAssignPic={!isViewer ? async (ids, picName) => {
              setIsBatchUpdating(true);
              let successCount = 0;
              await Promise.all(ids.map(async (id) => {
                try {
                  const lead = participants.find(l => l.id === id);
                  if (lead) {
                    const newNotes = setPicInNotes(lead.notes, picName);
                    await crmService.updateParticipantStatus(
                      id,
                      lead.participantStatus,
                      lead.attendanceStatus,
                      newNotes,
                      undefined,
                      lead.callStatus || undefined,
                      lead.emailStatus || undefined,
                      lead.whatsappStatus || undefined,
                      lead.meetingStatus || undefined,
                      lead.businessChallenges || undefined,
                      lead.projectInfo || undefined,
                      lead.timeline || undefined,
                      lead.reminderH7 || undefined,
                      lead.reminderH3 || undefined,
                      lead.reminderH1 || undefined,
                      lead.reminderHariH || undefined,
                      lead.confirmationStatus || undefined
                    );
                    successCount++;
                  }
                } catch (err) {
                  console.error(err);
                }
              }));
              setIsBatchUpdating(false);
              if (selectedEvent) {
                await loadParticipantsForEvent(selectedEvent, activeTab);
              }
            } : undefined}
            onOpenEngagementModal={!isViewer ? handleOpenEngagementModal : undefined}
          />

          {/* Batch Actions Status Bar */}
          {!isViewer && (
            <BatchActionsBar
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              activeTab={activeTab}
              usersList={usersList}
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
          {participants.length > 0 && (
            <ParticipantToolbar
              participants={participants}
              usersList={usersList}
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
              filterReminderHariH={filterReminderHariH}
              setFilterReminderHariH={setFilterReminderHariH}
              filterPic={filterPic}
              setFilterPic={setFilterPic}
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
          ) : participants.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Eye className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No participants registered for this event</p>
              <p className="text-xs text-slate-400 mt-1">Start by clicking "Add Lead" to register a database.</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Search className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No matching participants found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms.</p>
            </div>
          ) : activeTab === 'request' || activeTab === 'pre_event' || activeTab === 'declined' ? (
            <RequestPreEventTable
              filteredParticipants={paginatedParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              activeTab={activeTab}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
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
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isViewer}
              getStatusBadgeStyle={getStatusBadgeStyle}
              onOpenEngagementModal={!isViewer ? handleOpenEngagementModal : undefined}
              columnConfig={columnConfig}
            />
          ) : (
            <ReminderDdayTable
              filteredParticipants={paginatedParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isViewer}
              getStatusBadgeStyle={getStatusBadgeStyle}
              onOpenEngagementModal={!isViewer ? handleOpenEngagementModal : undefined}
              columnConfig={columnConfig}
            />
          )}

          {/* Pagination Bar */}
          {filteredParticipants.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-2xs text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entri per halaman</span>
                <span className="text-slate-300 mx-1">|</span>
                <span>
                  Menampilkan <strong className="text-slate-900">{indexOfFirstItem + 1}</strong> -{' '}
                  <strong className="text-slate-900">
                    {Math.min(indexOfLastItem, filteredParticipants.length)}
                  </strong>{' '}
                  dari <strong className="text-slate-900">{filteredParticipants.length}</strong> peserta
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Prev
                </button>

                <span className="px-3 py-1 font-extrabold text-slate-800 bg-slate-100 rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
        emsEvents={emsEventsList}
        emsEventId={emsEventId}
        setEmsEventId={setEmsEventId}
        submittingEvent={submittingEvent}
        onSubmit={handleCreateEvent}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditEventModalOpen}
        editingEvent={editingEvent}
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
        emsEvents={emsEventsList}
        editEmsEventId={editEmsEventId}
        setEditEmsEventId={setEditEmsEventId}
        submittingEvent={submittingEvent}
        onSubmit={handleUpdateEvent}
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
          databases={databases}
          participants={participants}
          allEventParticipants={allEventParticipants}
          events={events}
          onAddParticipant={handleAddParticipant}
          submittingParticipant={submittingParticipant}
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
          activeTab={activeTab}
          usersList={usersList}
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
        isOpen={isImportParticipantsModalOpen}
        onClose={() => {
          setIsImportParticipantsModalOpen(false);
          setImportParticipantsFile(null);
        }}
        importParticipantsFile={importParticipantsFile}
        setImportParticipantsFile={setImportParticipantsFile}
        isImportingParticipants={isImportingParticipants}
        importParticipantsProgress={importParticipantsProgress}
        activeTab={activeTab}
        onImport={handleImportParticipantsExcel}
        onDownloadTemplate={handleDownloadTemplate}
        participants={participants}
      />

      {/* Engagement History Modal */}
      <EngagementModal
        isOpen={isEngagementModalOpen}
        onClose={() => {
          setIsEngagementModalOpen(false);
          setSelectedEngagementParticipant(null);
        }}
        participant={selectedEngagementParticipant}
        onActivityLogged={() => {
          if (selectedEvent) loadParticipantsForEvent(selectedEvent);
        }}
      />
    </div>
  );
}
