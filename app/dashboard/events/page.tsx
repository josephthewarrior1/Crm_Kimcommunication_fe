'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Event, EventLead, Database, AppUser } from '../../../lib/types';
import { CalendarDays, Plus, Loader2, UserPlus, Users, Edit2, Trash2, Download, ArrowLeft, Search, Eye } from 'lucide-react';
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
import { DeleteLeadConfirmModal } from './components/DeleteLeadConfirmModal';
import { AddLeadModal } from './components/AddLeadModal';
import { UpdateLeadModal } from './components/UpdateLeadModal';
import { EventStatistics } from './components/EventStatistics';
import { LeadToolbar } from './components/LeadToolbar';
import { BatchActionsBar } from './components/BatchActionsBar';
import { extractPicFromNotes } from './utils/notesHelper';
import { getStatusBadgeStyle, getConfirmationStatusBadgeStyle } from './utils/statusHelper';
import { checkDatabaseCompleteness } from '../database/utils/validationHelper';
import { exportLeadsToExcel } from './utils/exportHelper';
import { importLeadsFromExcel } from './utils/importHelper';

export default function EventsPage() {
  const { isAdmin, isManager, isUser, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Event & Leads state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [filterLeadCompany, setFilterLeadCompany] = useState('');
  const [filterLeadPosition, setFilterLeadPosition] = useState('');
  const [filterLeadIndustry, setFilterLeadIndustry] = useState('');
  const [filterLeadCity, setFilterLeadCity] = useState('');

  const setLeadsSorted = (leadsList: EventLead[]) => {
    const sorted = [...leadsList].sort((a, b) => a.id - b.id);
    setLeads(sorted);
  };

  // Modals state
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isDeleteEventConfirmOpen, setIsDeleteEventConfirmOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isUpdateLeadModalOpen, setIsUpdateLeadModalOpen] = useState(false);
  const [isDeleteLeadConfirmOpen, setIsDeleteLeadConfirmOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState<EventLead | null>(null);
  const [submittingLeadDelete, setSubmittingLeadDelete] = useState(false);

  // Form inputs for Event creation
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('partner');
  const [clientName, setClientName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Form inputs for Event editing
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editName, setEditName] = useState('');
  const [editEventType, setEditEventType] = useState('partner');
  const [editClientName, setEditClientName] = useState('');
  const [editDateStart, setEditDateStart] = useState('');
  const [editDateEnd, setEditDateEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete event confirmation target
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  // Form states for adding/updating leads
  const [submittingLead, setSubmittingLead] = useState(false);
  const [activeLead, setActiveLead] = useState<EventLead | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'pre_event' | 'reminder' | 'reminder_dday'>('request');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [filterLeadPic, setFilterLeadPic] = useState('');
  
  // Excel Import states for Event Leads
  const [isImportLeadsModalOpen, setIsImportLeadsModalOpen] = useState(false);
  const [importLeadsFile, setImportLeadsFile] = useState<File | null>(null);
  const [importLeadsProgress, setImportLeadsProgress] = useState(0);
  const [isImportingLeads, setIsImportingLeads] = useState(false);

  const [submittingLeadUpdate, setSubmittingLeadUpdate] = useState(false);

  const [allEventLeads, setAllEventLeads] = useState<EventLead[]>([]);

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
        crmService.getEventLeads(),
        crmService.getUsers().catch(() => [])
      ]);
      setEvents(eList);
      setDatabases(cList.filter(c => c.isActive)); // only active databases
      setAllEventLeads(lList);
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
        notes: notes.trim() || undefined
      });

      toast.success('Event created successfully!');
      setIsCreateEventModalOpen(false);
      setName('');
      setClientName('');
      setDateStart('');
      setDateEnd('');
      setNotes('');
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
        notes: editNotes.trim() || undefined
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
      setLeads([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleSelectEvent = async (event: Event) => {
    setSelectedEvent(event);
    setLoadingLeads(true);
    setSelectedLeadIds([]); // reset selection
    try {
      const allLeads = await crmService.getEventLeads();
      setAllEventLeads(allLeads);
      const filteredLeads = allLeads.filter((l) => l.event.id === event.id);
      setLeadsSorted(filteredLeads);
    } catch (err) {
      toast.error('Failed to fetch leads for this event');
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleExportLeads = () => {
    if (!selectedEvent || filteredLeads.length === 0) {
      toast.error("Tidak ada data lead untuk di-export.");
      return;
    }
    try {
      exportLeadsToExcel(selectedEvent, filteredLeads, activeTab, adminName);
      toast.success('Daftar leads berhasil di-export ke Excel!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export leads');
    }
  };

  const handleBatchUpdateAttendance = async (status: string) => {
    if (selectedLeadIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    // Lakukan update untuk status attendance secara massal
    await Promise.all(selectedLeadIds.map(async (leadId) => {
      try {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          await crmService.updateLeadStatus(
            leadId,
            lead.leadStatus,
            status,
            lead.notes || undefined,
            undefined, // leadCategory (removed)
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
    setSelectedLeadIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} leads, gagal ${failCount} leads.`);
    } else {
      toast.success(`Berhasil mengupdate status attendance ${successCount} leads!`);
    }

    if (selectedEvent) {
      handleSelectEvent(selectedEvent); // Reload list leads
    }
  };

  const handleBatchUpdateLeadStatus = async (status: string) => {
    if (selectedLeadIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    // Lakukan update untuk lead status secara massal
    await Promise.all(selectedLeadIds.map(async (leadId) => {
      try {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          await crmService.updateLeadStatus(
            leadId,
            status,
            lead.attendanceStatus,
            lead.notes || undefined,
            undefined, // leadCategory (removed)
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
    setSelectedLeadIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} leads, gagal ${failCount} leads.`);
    } else {
      toast.success(`Berhasil mengupdate lead status ${successCount} leads!`);
    }

    if (selectedEvent) {
      handleSelectEvent(selectedEvent); // Reload list leads
    }
  };

  const handleBatchUpdateConfirmationStatus = async (status: string) => {
    if (selectedLeadIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    // Lakukan update untuk status confirmation secara massal
    await Promise.all(selectedLeadIds.map(async (leadId) => {
      try {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          await crmService.updateLeadStatus(
            leadId,
            lead.leadStatus,
            lead.attendanceStatus,
            lead.notes || undefined,
            undefined, // leadCategory (removed)
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
    setSelectedLeadIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} leads, gagal ${failCount} leads.`);
    } else {
      toast.success(`Berhasil mengupdate status konfirmasi ${successCount} leads!`);
    }

    if (selectedEvent) {
      handleSelectEvent(selectedEvent); // Reload list leads
    }
  };

  const handleBatchUpdateReminderHariH = async (status: string) => {
    if (selectedLeadIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    await Promise.all(selectedLeadIds.map(async (leadId) => {
      try {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          await crmService.updateLeadStatus(
            leadId,
            lead.leadStatus,
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
    setSelectedLeadIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil mengupdate ${successCount} leads, gagal ${failCount} leads.`);
    } else {
      toast.success(`Berhasil mengupdate status Hari H ${successCount} leads!`);
    }

    if (selectedEvent) {
      handleSelectEvent(selectedEvent);
    }
  };

  const handleResetLeadFilters = () => {
    setLeadSearchQuery('');
    setFilterLeadCompany('');
    setFilterLeadPosition('');
    setFilterLeadIndustry('');
    setFilterLeadCity('');
    setFilterLeadPic('');
  };

  const handleAddLead = async (databaseIds: number[], leadNotes: string) => {
    if (!selectedEvent || databaseIds.length === 0) {
      toast.error('Please select at least one database');
      return;
    }

    setSubmittingLead(true);
    try {
      await crmService.createEventLead({
        eventId: selectedEvent.id,
        databaseIds,
        leadStatus: 'white',
        attendanceStatus: 'invited',
        confirmationStatus: activeTab === 'pre_event' ? 'approve' : 'pending',
        notes: activeTab === 'request'
          ? `[Origin: Request] ${leadNotes.trim()}`.trim()
          : leadNotes.trim() || undefined
      });

      toast.success(`Successfully added ${databaseIds.length} database(s) as lead(s)!`);
      setIsAddLeadModalOpen(false);
      
      // Reload leads
      handleSelectEvent(selectedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add database(s) to event');
    } finally {
      setSubmittingLead(false);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Leads');

    worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 15) }));

    XLSX.writeFile(workbook, 'Event_Leads_Import_Template.xlsx');
    toast.success('Template Excel berhasil diunduh!');
  };

  const handleImportLeadsExcel = async () => {
    if (!importLeadsFile || !selectedEvent) return;
    setIsImportingLeads(true);

    try {
      const { successCount, errorCount } = await importLeadsFromExcel(
        importLeadsFile,
        selectedEvent.id,
        activeTab,
        leads,
        setImportLeadsProgress,
        crmService
      );
      toast.success(`Impor selesai! Berhasil: ${successCount} baris. Gagal/Skip: ${errorCount} baris.`);
      setIsImportLeadsModalOpen(false);
      setImportLeadsFile(null);
      handleSelectEvent(selectedEvent);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses file Excel.');
    } finally {
      setIsImportingLeads(false);
      setImportLeadsProgress(0);
    }
  };

  const handleBatchAssignPic = async (picName: string) => {
    if (selectedLeadIds.length === 0) return;
    setIsBatchUpdating(true);
    
    let successCount = 0;
    let failCount = 0;
    
    await Promise.all(selectedLeadIds.map(async (leadId) => {
      try {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          const { cleanNotes } = extractPicFromNotes(lead.notes);
          const newNotes = `[PIC: ${picName}] ${cleanNotes === '-' ? '' : cleanNotes}`.trim();
          
          await crmService.updateLeadStatus(
            leadId,
            lead.leadStatus,
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
    setSelectedLeadIds([]);
    
    if (failCount > 0) {
      toast.warning(`Berhasil menugaskan ${successCount} leads ke ${picName}, gagal ${failCount} leads.`);
    } else {
      toast.success(`Berhasil menugaskan ${successCount} leads ke ${picName}!`);
    }

    if (selectedEvent) {
      handleSelectEvent(selectedEvent);
    }
  };



  const handleOpenUpdateLeadModal = (lead: EventLead) => {
    setActiveLead(lead);
    setIsUpdateLeadModalOpen(true);
  };

  const handleUpdateLeadStatus = async (data: {
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
  }) => {
    if (!selectedEvent || !activeLead) return;

    setSubmittingLeadUpdate(true);
    try {
      await crmService.updateLeadStatus(
        activeLead.id,
        data.leadStatus,
        data.attendanceStatus,
        data.notes || undefined,
        undefined, // leadCategory (removed)
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
      await crmService.addEventLeadActivity(activeLead.id, {
        activityType: 'CALL',
        status: data.leadStatus,
        notes: `Updated status and qualification details.`
      });

      toast.success('Lead status and qualification updated successfully!');
      setIsUpdateLeadModalOpen(false);
      setActiveLead(null);
      
      // Reload leads
      handleSelectEvent(selectedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    } finally {
      setSubmittingLeadUpdate(false);
    }
  };

  const handleToggleEngagement = async (lead: EventLead, type: 'CALL' | 'EMAIL' | 'WHATSAPP') => {
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
      await crmService.updateLeadStatus(
        lead.id,
        lead.leadStatus,
        lead.attendanceStatus,
        lead.notes || undefined,
        undefined, // leadCategory (removed)
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
      await crmService.addEventLeadActivity(lead.id, {
        activityType: type,
        status: nextStatus,
        notes: `Toggled ${type} status to ${nextStatus} via double-click.`
      });

      toast.success(`Updated ${type} status to ${nextStatus === 'CONNECTED' || nextStatus === 'SENT' ? 'ACTIVE' : 'INACTIVE'}!`);

      // Reload leads list
      if (selectedEvent) {
        const allLeads = await crmService.getEventLeads();
        setAllEventLeads(allLeads);
        const filteredLeads = allLeads.filter((l) => l.event.id === selectedEvent.id);
        setLeadsSorted(filteredLeads);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to toggle ${type} status`);
    }
  };

  const handleDirectUpdateLead = async (
    lead: EventLead,
    field: 'remarks' | 'attendance' | 'confirmationStatus' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH',
    value: string
  ) => {
    let leadStatus = lead.leadStatus;
    let attendanceStatus = lead.attendanceStatus;
    let confirmationStatus = lead.confirmationStatus;
    let reminderH7 = lead.reminderH7;
    let reminderH3 = lead.reminderH3;
    let reminderH1 = lead.reminderH1;
    let reminderHariH = lead.reminderHariH;

    if (field === 'remarks') {
      leadStatus = value;
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
      await crmService.updateLeadStatus(
        lead.id,
        leadStatus,
        attendanceStatus,
        lead.notes || undefined,
        undefined, // leadCategory (removed)
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
      await crmService.addEventLeadActivity(lead.id, {
        activityType: 'CALL',
        status: value,
        notes: `Directly updated ${field} to ${value || 'None'} from the leads list table.`
      });

      toast.success(`Updated ${field} successfully!`);

      // Reload leads list
      if (selectedEvent) {
        const allLeads = await crmService.getEventLeads();
        setAllEventLeads(allLeads);
        const filteredLeads = allLeads.filter((l) => l.event.id === selectedEvent.id);
        setLeadsSorted(filteredLeads);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to update ${field}`);
    }
  };





  const openDeleteLeadConfirm = (lead: EventLead) => {
    setDeletingLead(lead);
    setIsDeleteLeadConfirmOpen(true);
  };

  const handleDeleteLead = async () => {
    if (!selectedEvent || !deletingLead) return;
    setSubmittingLeadDelete(true);

    try {
      await crmService.deleteEventLead(deletingLead.id);
      toast.success('Participant removed from event successfully!');
      setIsDeleteLeadConfirmOpen(false);
      setDeletingLead(null);
      handleSelectEvent(selectedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove participant');
    } finally {
      setSubmittingLeadDelete(false);
    }
  };



  // Filter events based on search
  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.clientName && e.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
  );



  const filteredLeads = leads.filter((l) => {
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
      const leadStatus = l.leadStatus?.toLowerCase();
      if (confStatus !== 'approve' || leadStatus !== 'registered') {
        return false;
      }
    }

    // PIC filter (only apply for non-request tabs)
    if (activeTab !== 'request') {
      const { pic } = extractPicFromNotes(l.notes);
      if (!isAdmin && user) {
        // Regular staff (non-admin) only sees their own assigned leads
        const myName = user.fullName || user.username;
        const isMyPic = pic.toLowerCase() === myName.toLowerCase() || 
                        (pic.toLowerCase() === 'admin' && myName.toLowerCase() === adminName.toLowerCase());
        if (!isMyPic) {
          return false;
        }
      } else {
        // Admin/Manager filters by the dropdown selection
        if (filterLeadPic) {
          const isMatch = pic.toLowerCase() === filterLeadPic.toLowerCase() || 
                          (pic.toLowerCase() === 'admin' && filterLeadPic.toLowerCase() === adminName.toLowerCase());
          if (!isMatch) return false;
        }
      }
    }

    // 1. General search query
    if (leadSearchQuery) {
      const term = leadSearchQuery.toLowerCase();
      const fullName = `${l.database.firstName} ${l.database.lastName}`.toLowerCase();
      const companyName = l.database.company?.name?.toLowerCase() || '';
      const jobTitle = l.database.jobTitle?.toLowerCase() || '';
      const matchesSearch = fullName.includes(term) || companyName.includes(term) || jobTitle.includes(term);
      if (!matchesSearch) return false;
    }

    // 2. Company filter
    if (filterLeadCompany && l.database.company?.name !== filterLeadCompany) {
      return false;
    }

    // 3. Position level filter
    if (filterLeadPosition && l.database.positionLevel !== filterLeadPosition) {
      return false;
    }

    // 4. Industry filter
    if (filterLeadIndustry && l.database.company?.industry !== filterLeadIndustry) {
      return false;
    }

    // 5. City filter
    if (filterLeadCity && l.database.company?.city !== filterLeadCity) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Events & Lead Tracking</h2>
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
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => handleSelectEvent(evt)}
                  className="group p-5 rounded-2xl border bg-white border-slate-200 hover:border-blue-500 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between h-48"
                >
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
                    <p className="text-xs text-slate-500 mt-1.5">Client: <strong className="text-slate-700">{evt.clientName || 'Independent'}</strong></p>
                    <p className="text-xs text-slate-555 text-slate-500 mt-2.5 flex items-center gap-1.5 font-bold">
                      <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{allEventLeads.filter((l) => l.event.id === evt.id).length} orang</span>
                    </p>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-slate-50 border border-slate-200 text-slate-600 rounded-md uppercase tracking-wider">
                      {evt.eventType}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {evt.dateStart ? new Date(evt.dateStart).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col w-full text-slate-900">
          <button
            onClick={() => {
              setSelectedEvent(null);
              setLeads([]);
            }}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-950 font-bold text-xs mb-5 transition-all self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events List
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
            <div>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-50 border border-blue-100 text-blue-600 rounded-md uppercase">
                {selectedEvent.eventType} Event
              </span>
              <h3 className="font-extrabold text-2xl text-slate-900 mt-1.5">{selectedEvent.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Client Target: <strong className="text-slate-700">{selectedEvent.clientName || '-'}</strong>
                {selectedEvent.dateStart && ` | Duration: ${new Date(selectedEvent.dateStart).toLocaleDateString()} - ${selectedEvent.dateEnd ? new Date(selectedEvent.dateEnd).toLocaleDateString() : 'End'}`}
              </p>
              
              {selectedEvent.notes && (
                <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic max-w-2xl">
                  "{selectedEvent.notes}"
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
              {leads.length > 0 && (
                <button
                  onClick={handleExportLeads}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Excel
                </button>
              )}
              {!isUser && (
                <>
                  <button
                    onClick={() => openEditEventModal(selectedEvent)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-all shadow-sm"
                    title="Edit Event details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Event
                  </button>
                  <button
                    onClick={() => openDeleteEventConfirm(selectedEvent)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 border border-red-100 hover:bg-red-100/70 text-red-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                    title="Delete Event permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Event
                  </button>
                </>
              )}
              {!isUser && (activeTab === 'request' || activeTab === 'pre_event') && (
                <>
                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                    title="Unduh Template Excel untuk Impor Leads"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    Template
                  </button>
                  <button
                    onClick={() => setIsImportLeadsModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                    title="Impor Peserta Baru via Excel"
                  >
                    <Plus className="w-3.5 h-3.5 text-green-600" />
                    Import Excel
                  </button>
                </>
              )}
              <button
                onClick={() => setIsAddLeadModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Lead
              </button>
            </div>
          </div>

          <EventStatistics
            activeTab={activeTab}
            leads={leads}
            usersList={usersList}
            isAdmin={isAdmin}
            adminName={adminName}
          />

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 mb-6 gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab('request');
                setSelectedLeadIds([]);
              }}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'request'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Request
            </button>
            <button
              onClick={() => {
                setActiveTab('pre_event');
                setSelectedLeadIds([]);
              }}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
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
                setSelectedLeadIds([]);
              }}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
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
                setSelectedLeadIds([]);
              }}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'reminder_dday'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Reminder Dday
            </button>
          </div>

          {/* Batch Actions Status Bar */}
          <BatchActionsBar
            selectedLeadIds={selectedLeadIds}
            setSelectedLeadIds={setSelectedLeadIds}
            activeTab={activeTab}
            usersList={usersList}
            handleBatchUpdateConfirmationStatus={handleBatchUpdateConfirmationStatus}
            handleBatchUpdateLeadStatus={handleBatchUpdateLeadStatus}
            handleBatchAssignPic={handleBatchAssignPic}
            handleBatchUpdateReminderHariH={handleBatchUpdateReminderHariH}
          />

          {/* Toolbar with Search & Advanced Filters */}
          {leads.length > 0 && (
            <LeadToolbar
              leads={leads}
              usersList={usersList}
              leadSearchQuery={leadSearchQuery}
              setLeadSearchQuery={setLeadSearchQuery}
              filterLeadCompany={filterLeadCompany}
              setFilterLeadCompany={setFilterLeadCompany}
              filterLeadPosition={filterLeadPosition}
              setFilterLeadPosition={setFilterLeadPosition}
              filterLeadIndustry={filterLeadIndustry}
              setFilterLeadIndustry={setFilterLeadIndustry}
              filterLeadCity={filterLeadCity}
              setFilterLeadCity={setFilterLeadCity}
              filterLeadPic={filterLeadPic}
              setFilterLeadPic={setFilterLeadPic}
              activeTab={activeTab}
              isAdmin={isAdmin}
              handleResetLeadFilters={handleResetLeadFilters}
            />
          )}

          {/* Leads Table */}
          {loadingLeads ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Eye className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No leads registered for this event</p>
              <p className="text-xs text-slate-400 mt-1">Start by clicking "Add Lead" to register a database.</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Search className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No matching leads found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms.</p>
            </div>
          ) : activeTab === 'request' || activeTab === 'pre_event' ? (
            <RequestPreEventTable
              filteredLeads={filteredLeads}
              selectedLeadIds={selectedLeadIds}
              setSelectedLeadIds={setSelectedLeadIds}
              activeTab={activeTab}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleToggleEngagement={handleToggleEngagement}
              handleDirectUpdateLead={handleDirectUpdateLead}
              handleOpenUpdateLeadModal={handleOpenUpdateLeadModal}
              openDeleteLeadConfirm={openDeleteLeadConfirm}
              isUser={isUser}
              isAdmin={isAdmin}
              adminName={adminName}
              extractPicFromNotes={extractPicFromNotes}
              getStatusBadgeStyle={getStatusBadgeStyle}
              getConfirmationStatusBadgeStyle={getConfirmationStatusBadgeStyle}
            />
          ) : activeTab === 'reminder' ? (
            <ReminderTable
              filteredLeads={filteredLeads}
              selectedLeadIds={selectedLeadIds}
              setSelectedLeadIds={setSelectedLeadIds}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleDirectUpdateLead={handleDirectUpdateLead}
              handleOpenUpdateLeadModal={handleOpenUpdateLeadModal}
              openDeleteLeadConfirm={openDeleteLeadConfirm}
              isUser={isUser}
              getStatusBadgeStyle={getStatusBadgeStyle}
            />
          ) : (
            <ReminderDdayTable
              filteredLeads={filteredLeads}
              selectedLeadIds={selectedLeadIds}
              setSelectedLeadIds={setSelectedLeadIds}
              checkDatabaseCompleteness={checkDatabaseCompleteness}
              handleDirectUpdateLead={handleDirectUpdateLead}
              handleOpenUpdateLeadModal={handleOpenUpdateLeadModal}
              openDeleteLeadConfirm={openDeleteLeadConfirm}
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
        <AddLeadModal
          isOpen={isAddLeadModalOpen}
          onClose={() => setIsAddLeadModalOpen(false)}
          selectedEvent={selectedEvent}
          databases={databases}
          leads={leads}
          allEventLeads={allEventLeads}
          events={events}
          onAddLead={handleAddLead}
          submittingLead={submittingLead}
        />
      )}

      {/* Lead Details & Qualification Drawer Modal Overlay */}
      {activeLead && (
        <UpdateLeadModal
          isOpen={isUpdateLeadModalOpen}
          onClose={() => {
            setIsUpdateLeadModalOpen(false);
            setActiveLead(null);
          }}
          activeLead={activeLead}
          onSubmit={handleUpdateLeadStatus}
          submittingLeadUpdate={submittingLeadUpdate}
        />
      )}



      {/* Delete Lead Confirm Modal */}
      <DeleteLeadConfirmModal
        isOpen={isDeleteLeadConfirmOpen}
        deletingLead={deletingLead}
        onClose={() => {
          setIsDeleteLeadConfirmOpen(false);
          setDeletingLead(null);
        }}
        onConfirm={handleDeleteLead}
        submittingLeadDelete={submittingLeadDelete}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportLeadsModalOpen}
        onClose={() => {
          setIsImportLeadsModalOpen(false);
          setImportLeadsFile(null);
        }}
        importLeadsFile={importLeadsFile}
        setImportLeadsFile={setImportLeadsFile}
        isImportingLeads={isImportingLeads}
        importLeadsProgress={importLeadsProgress}
        activeTab={activeTab}
        onImport={handleImportLeadsExcel}
      />
    </div>
  );
}

