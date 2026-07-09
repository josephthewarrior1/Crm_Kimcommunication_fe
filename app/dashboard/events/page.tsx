'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Event, EventParticipant, Database, AppUser } from '../../../lib/types';
import { CalendarDays, Plus, Loader2, UserPlus, Users, Edit2, Trash2, Download, ArrowLeft, Search, Eye, CheckCircle } from 'lucide-react';
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
import { EventStatistics } from './components/EventStatistics';
import { ParticipantToolbar } from './components/ParticipantToolbar';
import { BatchActionsBar } from './components/BatchActionsBar';
import { extractPicFromNotes } from './utils/notesHelper';
import { getStatusBadgeStyle, getConfirmationStatusBadgeStyle } from './utils/statusHelper';
import { checkDatabaseCompleteness } from '../database/utils/validationHelper';
import { exportParticipantsToExcel } from './utils/exportHelper';
import { importParticipantsFromExcel } from './utils/importHelper';

export default function EventsPage() {
  const { isAdmin, isManager, isUser, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
  const [filterCity, setFilterCity] = useState('');

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

  // Modals state
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isDeleteEventConfirmOpen, setIsDeleteEventConfirmOpen] = useState(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isUpdateParticipantModalOpen, setIsUpdateParticipantModalOpen] = useState(false);
  const [isDeleteParticipantConfirmOpen, setIsDeleteParticipantConfirmOpen] = useState(false);
  const [deletingParticipant, setDeletingParticipant] = useState<EventParticipant | null>(null);
  const [submittingParticipantDelete, setSubmittingParticipantDelete] = useState(false);

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

  // Delete event confirmation target
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  // Form states for adding/updating participants
  const [submittingParticipant, setSubmittingParticipant] = useState(false);
  const [activeParticipant, setActiveParticipant] = useState<EventParticipant | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'pre_event' | 'reminder' | 'reminder_dday'>('request');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [filterPic, setFilterPic] = useState('');
  
  // Excel Import states for Event Participants
  const [isImportParticipantsModalOpen, setIsImportParticipantsModalOpen] = useState(false);
  const [importParticipantsFile, setImportParticipantsFile] = useState<File | null>(null);
  const [importParticipantsProgress, setImportParticipantsProgress] = useState(0);
  const [isImportingParticipants, setIsImportingParticipants] = useState(false);

  const [submittingParticipantUpdate, setSubmittingParticipantUpdate] = useState(false);

  const [allEventParticipants, setAllEventParticipants] = useState<EventParticipant[]>([]);

  const adminUser = usersList.find(u => u.roles?.includes('ADMIN'));
  const adminName = adminUser ? (adminUser.fullName || adminUser.username) : 'Admin';
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [eList, cList, lList, uList] = await Promise.all([
        crmService.getEvents(),
        crmService.getDatabases(),
        crmService.getEventParticipants(),
        crmService.getUsers().catch(() => [])
      ]);
      setEvents(eList);
      setDatabases(cList.filter(c => c.isActive)); // only active databases
      setAllEventParticipants(lList);
      setUsersList(uList);
    } catch (err) {
      toast.error('Failed to load events or databases');
    } finally {
      setLoading(false);
    }
  }

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
        targetParticipants: targetParticipants || 0
      });

      toast.success('Event created successfully!');
      setIsCreateEventModalOpen(false);
      setName('');
      setClientName('');
      setDateStart('');
      setDateEnd('');
      setNotes('');
      setTargetParticipants(0);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    setEditName(event.name);
    setEditEventType(event.eventType);
    setEditClientName(event.clientName || '');
    setEditDateStart(event.dateStart || '');
    setEditDateEnd(event.dateEnd || '');
    setEditNotes(event.notes || '');
    setEditTargetParticipants(event.targetParticipants || 0);
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
      const updated = await crmService.updateEvent(editingEvent.id, {
        name: editName.trim(),
        eventType: editEventType,
        clientName: editClientName.trim() || undefined,
        dateStart: editDateStart || undefined,
        dateEnd: editDateEnd || undefined,
        notes: editNotes.trim() || undefined,
        targetParticipants: editTargetParticipants || 0
      });

      toast.success('Event updated successfully!');
      setIsEditEventModalOpen(false);
      setEditingEvent(null);
      setSelectedEvent(updated);
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

  const handleSelectEvent = async (event: Event) => {
    setSelectedEvent(event);
    setLoadingParticipants(true);
    setSelectedParticipantIds([]); // reset selection
    setActiveTab('request'); // default to Data List tab
    try {
      const allParticipants = await crmService.getEventParticipants();
      setAllEventParticipants(allParticipants);
      const filteredParticipants = allParticipants.filter((l) => l.event.id === event.id);
      setParticipantsSorted(filteredParticipants);
    } catch (err) {
      toast.error('Failed to fetch participants for this event');
    } finally {
      setLoadingParticipants(false);
    }
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
      handleSelectEvent(selectedEvent); // Reload list participants
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
      handleSelectEvent(selectedEvent); // Reload list participants
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
      handleSelectEvent(selectedEvent);
    }
  };

  const handleResetFilters = () => {
    setParticipantSearchQuery('');
    setFilterCompany('');
    setFilterPosition('');
    setFilterIndustry('');
    setFilterCity('');
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
        confirmationStatus: activeTab === 'pre_event' ? 'approve' : 'pending',
        notes: activeTab === 'request'
          ? `[Origin: Request] ${notes.trim()}`.trim()
          : notes.trim() || undefined
      });

      toast.success(`Successfully added ${databaseIds.length} database(s) as lead(s)!`);
      setIsAddParticipantModalOpen(false);
      
      // Reload participants
      handleSelectEvent(selectedEvent);
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
        'Company Name': 'PT Kim Communication',
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
      handleSelectEvent(selectedEvent);
      loadData();
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
          const { cleanNotes } = extractPicFromNotes(lead.notes);
          const newNotes = `[PIC: ${picName}] ${cleanNotes === '-' ? '' : cleanNotes}`.trim();
          
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
  }) => {
    if (!selectedEvent || !activeParticipant) return;

    setSubmittingParticipantUpdate(true);
    try {
      await crmService.updateParticipantStatus(
        activeParticipant.id,
        data.participantStatus,
        data.attendanceStatus,
        data.notes || undefined,
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
      handleSelectEvent(selectedEvent);
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
    field: 'remarks' | 'attendance' | 'confirmationStatus' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH',
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
      reminderH7 = value || undefined;
    } else if (field === 'reminderH3') {
      reminderH3 = value || undefined;
    } else if (field === 'reminderH1') {
      reminderH1 = value || undefined;
    } else if (field === 'reminderHariH') {
      reminderHariH = value || undefined;
    }

    try {
      await crmService.updateParticipantStatus(
        lead.id,
        participantStatus,
        attendanceStatus,
        lead.notes || undefined,
        undefined, // participantCategory (removed)
        lead.callStatus || undefined,
        lead.emailStatus || undefined,
        lead.whatsappStatus || undefined,
        lead.meetingStatus || undefined,
        lead.businessChallenges || undefined,
        lead.projectInfo || undefined,
        lead.timeline || undefined,
        reminderH7 || undefined,
        reminderH3 || undefined,
        reminderH1 || undefined,
        reminderHariH || undefined,
        confirmationStatus || undefined
      );

      // Log activity
      await crmService.addEventParticipantActivity(lead.id, {
        activityType: 'CALL',
        status: value,
        notes: `Directly updated ${field} to ${value || 'None'} from the participants list table.`
      });

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
      handleSelectEvent(selectedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove participant');
    } finally {
      setSubmittingParticipantDelete(false);
    }
  };



  // Filter events based on search
  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.clientName && e.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
  );



  const filteredParticipants = participants.filter((l) => {
    if (activeTab === 'request') {
      const confStatus = l.confirmationStatus?.toLowerCase();
      if (confStatus === 'approve') {
        const hasRequestOrigin = l.notes?.includes('[Origin: Request]');
        if (!hasRequestOrigin) {
          return false;
        }
      }
    } else if (activeTab === 'pre_event') {
      const confStatus = l.confirmationStatus?.toLowerCase();
      if (confStatus !== 'approve') {
        return false;
      }
    } else if (activeTab === 'reminder' || activeTab === 'reminder_dday') {
      const confStatus = l.confirmationStatus?.toLowerCase();
      const participantStatus = l.participantStatus?.toLowerCase();
      if (confStatus !== 'approve' || participantStatus !== 'registered') {
        return false;
      }
    }

    // PIC filter (only apply for non-request tabs)
    if (activeTab !== 'request') {
      const { pic } = extractPicFromNotes(l.notes);
      if (!isAdmin && user) {
        // Regular staff (non-admin) only sees their own assigned participants
        const myName = user.fullName || user.username;
        const isMyPic = pic.toLowerCase() === myName.toLowerCase() || 
                        (pic.toLowerCase() === 'admin' && myName.toLowerCase() === adminName.toLowerCase());
        if (!isMyPic) {
          return false;
        }
      } else {
        // Admin/Manager filters by the dropdown selection
        if (filterPic) {
          const isMatch = pic.toLowerCase() === filterPic.toLowerCase() || 
                          (pic.toLowerCase() === 'admin' && filterPic.toLowerCase() === adminName.toLowerCase());
          if (!isMatch) return false;
        }
      }
    }

    // 1. General search query
    if (participantSearchQuery) {
      const term = participantSearchQuery.toLowerCase();
      const fullName = `${l.database.firstName} ${l.database.lastName}`.toLowerCase();
      const companyName = l.database.company?.name?.toLowerCase() || '';
      const jobTitle = l.database.jobTitle?.toLowerCase() || '';
      const matchesSearch = fullName.includes(term) || companyName.includes(term) || jobTitle.includes(term);
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

    // 5. City filter
    if (filterCity && l.database.company?.city !== filterCity) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Event & Participant Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track event attendance, confirmation color statuses, and client targets.</p>
        </div>
        {!isUser && !selectedEvent && (
          <button
            onClick={() => setIsCreateEventModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
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
                const eventParticipants = allEventParticipants.filter((l) => l.event.id === evt.id);
                const registeredCount = eventParticipants.filter(p => p.participantStatus === 'registered' || p.participantStatus === 'green').length;
                const onLocationCount = eventParticipants.filter(p => p.reminderHariH === 'on_location').length;
                const target = evt.targetParticipants || 0;
                const isAchieved = target > 0 && onLocationCount >= target;
                
                const typeColorMap: Record<string, string> = {
                  partner: 'bg-blue-600',
                  end_user: 'bg-emerald-600',
                  internal: 'bg-violet-600',
                  other: 'bg-slate-400'
                };
                const accentColor = typeColorMap[evt.eventType] || 'bg-slate-400';

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt)}
                    className="group relative pl-6 pr-5 py-5 rounded-2xl border bg-white border-slate-200 hover:border-blue-500/60 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-2">{evt.name}</h4>
                        {!isUser && (
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
                        {evt.dateStart ? new Date(evt.dateStart).toLocaleDateString() : '-'}
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
              setSelectedEvent(null);
              setParticipants([]);
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
                {selectedEvent.dateStart && <span> | Duration: <strong className="text-slate-700">{new Date(selectedEvent.dateStart).toLocaleDateString()} - {selectedEvent.dateEnd ? new Date(selectedEvent.dateEnd).toLocaleDateString() : 'End'}</strong></span>}
                {selectedEvent.targetParticipants !== undefined && selectedEvent.targetParticipants > 0 ? (
                  <>
                    <span> | Target: <strong className="text-slate-700">{selectedEvent.targetParticipants} pax</strong></span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ml-1 ${
                      participants.filter(p => p.reminderHariH === 'on_location').length >= selectedEvent.targetParticipants
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-550 border border-slate-200'
                    }`}>
                      {participants.filter(p => p.reminderHariH === 'on_location').length >= selectedEvent.targetParticipants
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
            
            {!isUser && (
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
                onClick={() => {
                  setActiveTab('request');
                  setSelectedParticipantIds([]);
                }}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'request'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Data List
              </button>
              <button
                onClick={() => {
                  setActiveTab('pre_event');
                  setSelectedParticipantIds([]);
                }}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'pre_event'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Pre-Event
              </button>
              <button
                onClick={() => {
                  setActiveTab('reminder');
                  setSelectedParticipantIds([]);
                }}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'reminder'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Reminder
              </button>
              <button
                onClick={() => {
                  setActiveTab('reminder_dday');
                  setSelectedParticipantIds([]);
                }}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'reminder_dday'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Reminder Dday
              </button>
            </div>

            {/* Participant Management Buttons */}
            <div className="flex flex-wrap items-center gap-2 pb-2 md:pb-0 self-start md:self-auto">
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
              {!isUser && (activeTab === 'request' || activeTab === 'pre_event') && (
                <button
                  onClick={() => setIsImportParticipantsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  title="Impor Peserta Baru via Excel"
                >
                  <Plus className="w-3.5 h-3.5 text-green-600" />
                  Import Excel
                </button>
              )}
              {(activeTab === 'request' || activeTab === 'pre_event') && (
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
            participants={participants}
            usersList={usersList}
            isAdmin={isAdmin}
            adminName={adminName}
            onAssignPic={async (ids, picName) => {
              setIsBatchUpdating(true);
              let successCount = 0;
              await Promise.all(ids.map(async (id) => {
                try {
                  const lead = participants.find(l => l.id === id);
                  if (lead) {
                    const { cleanNotes } = extractPicFromNotes(lead.notes);
                    const newNotes = `[PIC: ${picName}] ${cleanNotes === '-' ? '' : cleanNotes}`.trim();
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
                      lead.confirmationStatus
                    );
                    successCount++;
                  }
                } catch (err) {
                  console.error(err);
                }
              }));
              setIsBatchUpdating(false);
              if (selectedEvent) {
                handleSelectEvent(selectedEvent);
              }
            }}
          />

          {/* Batch Actions Status Bar */}
          <BatchActionsBar
            selectedParticipantIds={selectedParticipantIds}
            setSelectedParticipantIds={setSelectedParticipantIds}
            activeTab={activeTab}
            usersList={usersList}
            handleBatchUpdateConfirmationStatus={handleBatchUpdateConfirmationStatus}
            handleBatchUpdateParticipantStatus={handleBatchUpdateParticipantStatus}
            handleBatchAssignPic={handleBatchAssignPic}
            handleBatchUpdateReminderHariH={handleBatchUpdateReminderHariH}
          />

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
              filterCity={filterCity}
              setFilterCity={setFilterCity}
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
          ) : activeTab === 'request' || activeTab === 'pre_event' ? (
            <RequestPreEventTable
              filteredParticipants={filteredParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              activeTab={activeTab}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleToggleEngagement={handleToggleEngagement}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isUser}
              isAdmin={isAdmin}
              adminName={adminName}
              extractPicFromNotes={extractPicFromNotes}
              getStatusBadgeStyle={getStatusBadgeStyle}
              getConfirmationStatusBadgeStyle={getConfirmationStatusBadgeStyle}
            />
          ) : activeTab === 'reminder' ? (
            <ReminderTable
              filteredParticipants={filteredParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isUser}
              getStatusBadgeStyle={getStatusBadgeStyle}
            />
          ) : (
            <ReminderDdayTable
              filteredParticipants={filteredParticipants}
              selectedParticipantIds={selectedParticipantIds}
              setSelectedParticipantIds={setSelectedParticipantIds}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleDirectUpdateParticipant={handleDirectUpdateParticipant}
              handleOpenUpdateParticipantModal={handleOpenUpdateParticipantModal}
              openDeleteParticipantConfirm={openDeleteParticipantConfirm}
              isUser={isUser}
              getStatusBadgeStyle={getStatusBadgeStyle}
            />
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
          usersList={usersList}
          onSubmit={handleUpdateParticipantStatus}
          submittingParticipantUpdate={submittingParticipantUpdate}
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
    </div>
  );
}

