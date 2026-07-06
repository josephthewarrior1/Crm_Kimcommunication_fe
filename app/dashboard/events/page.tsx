'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Event, EventLead, Database, EventLeadActivity, AppUser } from '../../../lib/types';
import { CalendarDays, Plus, Search, X, Loader2, UserPlus, Users, Eye, Edit2, Trash2, Download, Check, Square, CheckSquare, RefreshCw, CheckCircle, Phone, Mail, MessageSquare, Calendar, Award, TrendingUp, BarChart3, Copy, Flame, Sun, Snowflake, ArrowLeft, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { RequestPreEventTable } from './components/RequestPreEventTable';
import { ReminderTable } from './components/ReminderTable';
import { ReminderDdayTable } from './components/ReminderDdayTable';
import { CreateEventModal } from './components/CreateEventModal';
import { EditEventModal } from './components/EditEventModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { DeleteEventConfirmModal } from './components/DeleteEventConfirmModal';
import { DeleteLeadConfirmModal } from './components/DeleteLeadConfirmModal';
import { extractPicFromNotes } from './utils/notesHelper';

const checkDatabaseCompleteness = (c: Database) => {
  const missing: string[] = [];

  if (!c.company?.group?.name?.trim()) missing.push("Nama Group Holding");
  if (!c.company?.brandName?.trim()) missing.push("Nama Brand");
  if (!c.company?.name?.trim()) missing.push("Company Name");
  if (!c.salutation?.trim()) missing.push("Salutation");
  if (!c.firstName?.trim()) missing.push("First Name");
  if (!c.lastName?.trim()) missing.push("Last Name");
  if (!c.positionLevel || c.positionLevel === 'unknown' || !c.positionLevel.trim()) missing.push("Position");
  if (!c.jobTitle?.trim()) missing.push("Job Title");
  if (!c.company?.address?.trim()) missing.push("Address");
  if (!c.company?.officePhone?.trim()) missing.push("Office Phone");
  if (!c.mobilePhone?.trim()) missing.push("Mobile Phone");

  const emails = c.emails || [];
  const hasCompanyEmail = emails.some(e => e.isCorporate || e.emailType === 'company');
  const hasPersonalEmail = emails.some(e => !e.isCorporate && e.emailType === 'personal');

  if (!hasCompanyEmail) missing.push("Company Email");
  if (!hasPersonalEmail) missing.push("Personal Email");

  if (!c.company?.industry?.trim()) missing.push("Industry");
  if (!c.linkedinUrl?.trim()) missing.push("LinkedIn Link");
  if (!c.company?.city?.trim()) missing.push("City");
  if (!c.company?.website?.trim()) missing.push("Company Website");

  return {
    isIncomplete: missing.length > 0,
    missingFields: missing
  };
};

const getStatusBadgeStyle = (status: string) => {
  const s = status ? status.toLowerCase() : '';
  if (s === 'registered' || s === 'confirm' || s === 'green' || s === 'on_location') {
    return 'text-emerald-700 bg-emerald-50 border-emerald-250';
  }
  if (s === 'on_the_way') {
    return 'text-blue-700 bg-blue-50 border-blue-250';
  }
  if (s === 'tentative' || s === 'yellow') {
    return 'text-amber-700 bg-amber-50 border-amber-250';
  }
  if (s === 'not_respon_yet' || s === 'not_respond_yet' || s === 'white') {
    return 'text-slate-600 bg-slate-50 border-slate-250';
  }
  if (s === 'not_respond_2x') {
    return 'text-slate-700 bg-slate-100 border-slate-300';
  }
  if (s.startsWith('not_respond_') || s.startsWith('not_respon_')) {
    return 'text-slate-800 bg-slate-200/80 border-slate-350';
  }
  if (s === 'not_interest' || s === 'unable_to_attend' || s === 'red') {
    return 'text-rose-700 bg-rose-50 border-rose-250';
  }
  return 'text-slate-500 bg-slate-50 border-slate-250';
};

const getStatusLabel = (status: string) => {
  const s = status ? status.toLowerCase() : '';
  if (s === 'on_location') return 'On Location';
  if (s === 'on_the_way') return 'On The Way';
  if (s === 'registered' || s === 'green') return 'Registered';
  if (s === 'confirm') return 'Confirm';
  if (s === 'tentative' || s === 'yellow') return 'Tentative';
  if (s === 'not_respon_yet' || s === 'not_respond_yet' || s === 'white') return 'Not respond yet';
  if (s === 'not_respond_2x') return 'Not respond yet 2x';
  if (s === 'not_respond_3x') return 'Not respond yet 3x';
  if (s === 'not_respond_4x') return 'Not respond yet 4x';
  if (s === 'not_respond_5x') return 'Not respond yet 5x';
  if (s === 'not_respond_6x') return 'Not respond yet 6x';
  if (s === 'not_respond_7x') return 'Not respond yet 7x';
  if (s === 'not_respond_8x') return 'Not respond yet 8x';
  if (s === 'not_respond_9x') return 'Not respond yet 9x';
  if (s === 'not_interest' || s === 'red') return 'Not Interest';
  if (s === 'unable_to_attend') return 'Unable to attend';
  return '- None';
};

const getConfirmationStatusBadgeStyle = (status: string) => {
  const s = status ? status.toLowerCase() : 'pending';
  if (s === 'approve') {
    return 'text-emerald-700 bg-emerald-50 border-emerald-250';
  }
  if (s === 'decline') {
    return 'text-rose-700 bg-rose-50 border-rose-250';
  }
  return 'text-blue-700 bg-blue-50 border-blue-250'; // pending
};

const getConfirmationStatusLabel = (status: string) => {
  const s = status ? status.toLowerCase() : 'pending';
  if (s === 'approve') return 'Approve';
  if (s === 'decline') return 'Decline';
  return 'Pending';
};




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

  // Form inputs for adding a Lead
  const [selectedDatabaseIds, setSelectedDatabaseIds] = useState<number[]>([]);
  const [leadDatabaseSearch, setLeadDatabaseSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState('white');
  const [attendanceStatus, setAttendanceStatus] = useState('pending');
  const [leadNotes, setLeadNotes] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);

  // Form inputs for updating a Lead status
  const [activeLead, setActiveLead] = useState<EventLead | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'pre_event' | 'reminder' | 'reminder_dday'>('request');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [filterLeadPic, setFilterLeadPic] = useState('');
  
  // Excel Import states for Event Leads
  const [isImportLeadsModalOpen, setIsImportLeadsModalOpen] = useState(false);
  const [importLeadsFile, setImportLeadsFile] = useState<File | null>(null);
  const [importLeadsProgress, setImportLeadsProgress] = useState(0);
  const [isImportingLeads, setIsImportingLeads] = useState(false);

  const [updateLeadStatusStr, setUpdateLeadStatusStr] = useState('white');
  const [updateAttendanceStatusStr, setUpdateAttendanceStatusStr] = useState('invited');
  const [updateConfirmationStatusStr, setUpdateConfirmationStatusStr] = useState('pending');
  const [updateLeadNotes, setUpdateLeadNotes] = useState('');
  const [submittingLeadUpdate, setSubmittingLeadUpdate] = useState(false);
  const [updateReminderH7, setUpdateReminderH7] = useState('');
  const [updateReminderH3, setUpdateReminderH3] = useState('');
  const [updateReminderH1, setUpdateReminderH1] = useState('');
  const [updateReminderHariH, setUpdateReminderHariH] = useState('');
  const [updateCallStatusStr, setUpdateCallStatusStr] = useState('NOT_CONTACTED');
  const [updateEmailStatusStr, setUpdateEmailStatusStr] = useState('NOT_SENT');
  const [updateWhatsappStatusStr, setUpdateWhatsappStatusStr] = useState('NOT_SENT');
  const [updateMeetingStatusStr, setUpdateMeetingStatusStr] = useState('NONE');
  const [updateBusinessChallengesStr, setUpdateBusinessChallengesStr] = useState('');
  const [updateProjectInfoStr, setUpdateProjectInfoStr] = useState('');
  const [updateTimelineStr, setUpdateTimelineStr] = useState('');

  // Activity Log states
  const [activities, setActivities] = useState<EventLeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newActivityType, setNewActivityType] = useState('CALL');
  const [newActivityStatus, setNewActivityStatus] = useState('CONNECTED');
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);





  // Add Lead Modal filter states
  const [allEventLeads, setAllEventLeads] = useState<EventLead[]>([]);
  const [filterAddLeadCompany, setFilterAddLeadCompany] = useState('');
  const [filterAddLeadPosition, setFilterAddLeadPosition] = useState('');
  const [filterAddLeadIndustry, setFilterAddLeadIndustry] = useState('');
  const [filterAddLeadCity, setFilterAddLeadCity] = useState('');
  const [filterAddLeadEventId, setFilterAddLeadEventId] = useState('');
  const [filterAddLeadOnlyAttended, setFilterAddLeadOnlyAttended] = useState(false);

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

    let dataToExport: any[] = [];
    let sheetName = 'Leads Handover';
    let fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Handover_Report.xlsx`;

    const getReminderLabel = (status: string | null | undefined) => {
      if (!status) return '-';
      if (status === 'not_respon_yet') return 'Not respond yet';
      if (status === 'not_respond_2x') return 'Not respond 2x';
      if (status === 'tentative') return 'Tentative';
      if (status === 'confirm') return 'Confirm';
      if (status === 'unable_to_attend') return 'Unable to attend';
      return status;
    };

    if (activeTab === 'request' || activeTab === 'pre_event') {
      sheetName = activeTab === 'request' ? 'Request Leads' : 'Pre-Event Leads';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_${activeTab === 'request' ? 'Request' : 'PreEvent'}_Report.xlsx`;
      
      dataToExport = filteredLeads.map((l, index) => {
        // Map Call Status label
        let callLabel = 'Belum Telpon';
        if (l.callStatus === 'CONNECTED') callLabel = 'Sudah Telpon';
        else if (l.callStatus === 'NO_ANSWER') callLabel = 'Tidak Diangkat';
        else if (l.callStatus === 'BUSY') callLabel = 'Sibuk';

        // Map Confirmation Status Label
        const confirmationLabels: Record<string, string> = {
          pending: 'Pending',
          approve: 'Approve',
          decline: 'Decline',
        };
        const confirmationLabel = confirmationLabels[l.confirmationStatus || 'pending'] || l.confirmationStatus;

        const { pic, cleanNotes } = extractPicFromNotes(l.notes);

        return {
          'No': index + 1,
          'Company Name': l.database.company?.name || '-',
          'Salutation': l.database.salutation || '-',
          'First Name': l.database.firstName || '-',
          'Last Name': l.database.lastName || '-',
          'Position': l.database.positionLevel || '-',
          'Job Title': l.database.jobTitle || '-',
          'Office Phone': l.database.company?.officePhone || '-',
          'Mobile Phone': l.database.mobilePhone || '-',
          'Office Email': l.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-',
          'Personal Email': l.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-',
          'Call Status': callLabel,
          'WhatsApp Status': l.whatsappStatus === 'SENT' ? 'Sudah WhatsApp' : 'Belum WhatsApp',
          'Email Status': l.emailStatus === 'SENT' ? 'Sudah Email' : 'Belum Email',
          'Tele Remarks': getStatusLabel(l.leadStatus),
          'Confirmation Status': confirmationLabel,
          'PIC': pic,
          'Notes': cleanNotes
        };
      });
    } else if (activeTab === 'reminder') {
      sheetName = 'Reminder Status';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Reminder_Report.xlsx`;

      dataToExport = filteredLeads.map((l, index) => {
        return {
          'No': index + 1,
          'Company Name': l.database.company?.name || '-',
          'Salutation': l.database.salutation || '-',
          'First Name': l.database.firstName || '-',
          'Last Name': l.database.lastName || '-',
          'Position': l.database.positionLevel || '-',
          'Job Title': l.database.jobTitle || '-',
          'Office Phone': l.database.company?.officePhone || '-',
          'Mobile Phone': l.database.mobilePhone || '-',
          'Office Email': l.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-',
          'Personal Email': l.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-',
          'Industry': l.database.company?.industry || '-',
          'H-7 Reminder': getReminderLabel(l.reminderH7),
          'H-3 Reminder': getReminderLabel(l.reminderH3),
          'H-1 Reminder': getReminderLabel(l.reminderH1),
          'Notes': l.notes || '-'
        };
      });
    } else {
      sheetName = 'Reminder Dday Status';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Reminder_Dday_Report.xlsx`;

      dataToExport = filteredLeads.map((l, index) => {
        return {
          'No': index + 1,
          'Company Name': l.database.company?.name || '-',
          'Salutation': l.database.salutation || '-',
          'First Name': l.database.firstName || '-',
          'Last Name': l.database.lastName || '-',
          'Position': l.database.positionLevel || '-',
          'Job Title': l.database.jobTitle || '-',
          'Office Phone': l.database.company?.officePhone || '-',
          'Mobile Phone': l.database.mobilePhone || '-',
          'Office Email': l.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-',
          'Personal Email': l.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-',
          'Industry': l.database.company?.industry || '-',
          'Hari H Reminder': getReminderLabel(l.reminderHariH),
          'Notes': l.notes || '-'
        };
      });
    }

    // Generate Sheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Auto fit column width
    const maxLens = dataToExport.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const valStr = String(row[key as keyof typeof row]);
        acc[key] = Math.max(acc[key] || 10, valStr.length);
      });
      return acc;
    }, {} as Record<string, number>);
    
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({
      wch: maxLens[key] + 3
    }));

    // Trigger Download
    XLSX.writeFile(workbook, fileName);
    toast.success('Daftar leads berhasil di-export ke Excel!');
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

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || selectedDatabaseIds.length === 0) {
      toast.error('Please select at least one database');
      return;
    }

    setSubmittingLead(true);
    try {
      await crmService.createEventLead({
        eventId: selectedEvent.id,
        databaseIds: selectedDatabaseIds,
        leadStatus,
        attendanceStatus,
        confirmationStatus: activeTab === 'pre_event' ? 'approve' : 'pending',
        notes: activeTab === 'request'
          ? `[Origin: Request] ${leadNotes.trim()}`.trim()
          : leadNotes.trim() || undefined
      });

      toast.success(`Successfully added ${selectedDatabaseIds.length} database(s) as lead(s)!`);
      setIsAddLeadModalOpen(false);
      setSelectedDatabaseIds([]);
      setLeadDatabaseSearch('');
      setLeadNotes('');
      
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
    setImportLeadsProgress(5);

    try {
      const reader = new FileReader();
      
      const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) resolve(e.target.result as ArrayBuffer);
          else reject(new Error('Failed to read file'));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(importLeadsFile);
      });

      const workbook = XLSX.read(fileData, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet);

      if (rows.length === 0) {
        throw new Error('File Excel kosong atau tidak terbaca.');
      }

      setImportLeadsProgress(20);

      const [allCompanies, allDbContacts] = await Promise.all([
        crmService.getCompanies(),
        crmService.getDatabases()
      ]);

      setImportLeadsProgress(40);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const firstName = String(row['First Name'] || '').trim();
        const lastName = String(row['Last Name'] || '').trim();
        
        if (!firstName || !lastName) {
          errorCount++;
          continue;
        }

        const companyNameRaw = String(row['Company Name'] || '').trim();
        
        try {
          let resolvedCompanyId: number | undefined = undefined;
          if (companyNameRaw) {
            let companyName = companyNameRaw;
            if (companyName.toUpperCase().endsWith(' PT')) {
              companyName = 'PT ' + companyName.slice(0, -3).trim();
            } else if (companyName.toUpperCase().endsWith(' PT.')) {
              companyName = 'PT ' + companyName.slice(0, -4).trim();
            }
            
            const existingCompany = allCompanies.find(c => 
              c.name.toLowerCase().trim() === companyName.toLowerCase().trim()
            );

            if (existingCompany) {
              resolvedCompanyId = existingCompany.id;
            } else {
              const newCompany = await crmService.createCompany({
                name: companyName,
                brandName: String(row['Nama Brand'] || '').trim() || undefined,
                address: String(row['Address'] || '').trim() || undefined,
                officePhone: String(row['Office Phone'] || '').trim() || undefined,
                website: String(row['Company Website'] || '').trim() || undefined,
                industry: String(row['Industry'] || '').trim() || undefined,
                companySizeRevenue: String(row['Company Size (Revenue)'] || '').trim() || undefined,
                companySizeEmployee: String(row['Company Size (Employee)'] || '').trim() || undefined,
                companyHardware: String(row['Company Hardware'] || '').trim() || undefined,
                city: String(row['City'] || '').trim() || undefined
              });
              resolvedCompanyId = newCompany.id;
              allCompanies.push(newCompany);
            }
          }

          let resolvedContactId: number;
          const existingContact = allDbContacts.find(c => 
            c.firstName.toLowerCase().trim() === firstName.toLowerCase() &&
            c.lastName.toLowerCase().trim() === lastName.toLowerCase()
          );

          if (existingContact) {
            resolvedContactId = existingContact.id;
          } else {
            const newContact = await crmService.createDatabase({
              firstName,
              lastName,
              salutation: String(row['Salutation'] || 'Mr').trim(),
              positionLevel: String(row['Position'] || 'unknown').trim().toLowerCase(),
              specialityDivision: String(row['Speciality/Division'] || '').trim() || undefined,
              jobTitle: String(row['Jobtitle'] || '').trim() || undefined,
              mobilePhone: String(row['Mobile Phone'] || '').trim() || undefined,
              linkedinUrl: String(row['Linkedin Link'] || '').trim() || undefined,
              databaseType: 'unknown',
              source: 'excel_import',
              isActive: true
            }, resolvedCompanyId);
            
            resolvedContactId = newContact.id;
            allDbContacts.push(newContact);

            const companyEmail = String(row['Company Email Address'] || '').trim().toLowerCase();
            const personalEmail = String(row['Personal Email Address'] || '').trim().toLowerCase();

            if (companyEmail) {
              await crmService.addDatabaseEmail(newContact.id, {
                email: companyEmail,
                emailType: 'company',
                isPrimary: true,
                isVerified: true,
                isCorporate: true
              });
            }
            if (personalEmail) {
              await crmService.addDatabaseEmail(newContact.id, {
                email: personalEmail,
                emailType: 'personal',
                isPrimary: !companyEmail,
                isVerified: true,
                isCorporate: false
              });
            }
          }
          const isAlreadyLead = leads.some(l => l.database.id === resolvedContactId);
          if (!isAlreadyLead) {
            await crmService.createEventLead({
              eventId: selectedEvent.id,
              databaseId: resolvedContactId,
              leadStatus: 'white',
              attendanceStatus: 'invited',
              confirmationStatus: activeTab === 'pre_event' ? 'approve' : 'pending',
              notes: activeTab === 'request' ? '[Origin: Request]' : undefined
            });
          }
          
          successCount++;
        } catch (rowErr) {
          console.error(`Error processing row ${i + 1}`, rowErr);
          errorCount++;
        }

        setImportLeadsProgress(Math.floor(40 + (50 * (i + 1) / rows.length)));
      }

      setImportLeadsProgress(100);
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



  const loadLeadActivities = async (leadId: number) => {
    setLoadingActivities(true);
    try {
      const data = await crmService.getEventLeadActivities(leadId);
      setActivities(data);
    } catch (err) {
      toast.error('Failed to load lead activities');
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleOpenUpdateLeadModal = (lead: EventLead) => {
    setActiveLead(lead);
    setUpdateLeadStatusStr(lead.leadStatus);
    setUpdateAttendanceStatusStr(lead.attendanceStatus);
    setUpdateConfirmationStatusStr(lead.confirmationStatus || 'pending');
    setUpdateLeadNotes(lead.notes || '');
    
    // Set qualification fields
    setUpdateReminderH7(lead.reminderH7 || '');
    setUpdateReminderH3(lead.reminderH3 || '');
    setUpdateReminderH1(lead.reminderH1 || '');
    setUpdateReminderHariH(lead.reminderHariH || '');
    setUpdateCallStatusStr(lead.callStatus || 'NOT_CONTACTED');
    setUpdateEmailStatusStr(lead.emailStatus || 'NOT_SENT');
    setUpdateWhatsappStatusStr(lead.whatsappStatus || 'NOT_SENT');
    setUpdateMeetingStatusStr(lead.meetingStatus || 'NONE');
    setUpdateBusinessChallengesStr(lead.businessChallenges || '');
    setUpdateProjectInfoStr(lead.projectInfo || '');
    setUpdateTimelineStr(lead.timeline || '');

    // Reset logging inputs
    setNewActivityType('CALL');
    setNewActivityStatus('CONNECTED');
    setNewActivityNotes('');

    setIsUpdateLeadModalOpen(true);
    loadLeadActivities(lead.id);
  };

  const handleUpdateLeadStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !activeLead) return;

    setSubmittingLeadUpdate(true);
    try {
      await crmService.updateLeadStatus(
        activeLead.id,
        updateLeadStatusStr,
        updateAttendanceStatusStr,
        updateLeadNotes.trim() || undefined,
        undefined, // leadCategory (removed)
        updateCallStatusStr || undefined,
        updateEmailStatusStr || undefined,
        updateWhatsappStatusStr || undefined,
        updateMeetingStatusStr || undefined,
        updateBusinessChallengesStr.trim() || undefined,
        updateProjectInfoStr.trim() || undefined,
        updateTimelineStr.trim() || undefined,
        updateReminderH7 || undefined,
        updateReminderH3 || undefined,
        updateReminderH1 || undefined,
        updateReminderHariH || undefined,
        updateConfirmationStatusStr || undefined
      );

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

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;

    setIsLoggingActivity(true);
    try {
      await crmService.addEventLeadActivity(activeLead.id, {
        activityType: newActivityType,
        status: newActivityStatus,
        notes: newActivityNotes.trim() || undefined
      });

      toast.success('Activity logged successfully!');
      setNewActivityNotes('');
      
      // Reload activities history
      loadLeadActivities(activeLead.id);
      
      // Update local states
      if (newActivityType === 'CALL') setUpdateCallStatusStr(newActivityStatus);
      else if (newActivityType === 'EMAIL') setUpdateEmailStatusStr(newActivityStatus);
      else if (newActivityType === 'WHATSAPP') setUpdateWhatsappStatusStr(newActivityStatus);
      else if (newActivityType === 'MEETING') setUpdateMeetingStatusStr(newActivityStatus);
      
      // Reload main lead list
      if (selectedEvent) {
        const allLeads = await crmService.getEventLeads();
        setAllEventLeads(allLeads);
        const filteredLeads = allLeads.filter((l) => l.event.id === selectedEvent.id);
        setLeadsSorted(filteredLeads);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to log activity');
    } finally {
      setIsLoggingActivity(false);
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

  // Filter active databases not currently leads in the selected event
  const databasesNotInEvent = databases.filter(
    (c) => !leads.some((l) => l.database.id === c.id)
  );

  const visibleDatabases = databasesNotInEvent.filter((c) => {
    // 1. Search Query
    if (leadDatabaseSearch) {
      const term = leadDatabaseSearch.toLowerCase();
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const companyName = c.company?.name?.toLowerCase() || '';
      if (!fullName.includes(term) && !companyName.includes(term)) {
        return false;
      }
    }

    // 2. Company filter
    if (filterAddLeadCompany && c.company?.name !== filterAddLeadCompany) {
      return false;
    }

    // 3. Position Level filter
    if (filterAddLeadPosition && c.positionLevel !== filterAddLeadPosition) {
      return false;
    }

    // 4. Industry filter
    if (filterAddLeadIndustry && c.company?.industry !== filterAddLeadIndustry) {
      return false;
    }

    // 5. City filter
    if (filterAddLeadCity && c.company?.city !== filterAddLeadCity) {
      return false;
    }

    // 6. Event Participation history filter
    if (filterAddLeadEventId) {
      const isInvited = allEventLeads.some(
        (l) => l.database.id === c.id && l.event.id === Number(filterAddLeadEventId)
      );
      if (!isInvited) return false;
    }

    return true;
  });

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
        if (pic !== myName) {
          return false;
        }
      } else {
        // Admin/Manager filters by the dropdown selection
        if (filterLeadPic) {
          if (filterLeadPic === '-' && pic !== '-') return false;
          if (filterLeadPic !== '-' && pic !== filterLeadPic) return false;
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

          {/* Dynamic Statistics Box Cards */}
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
                        {leads.filter(l => !l.confirmationStatus || l.confirmationStatus === 'pending' || l.confirmationStatus === 'decline').length}
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
                        {leads.filter(l => !l.confirmationStatus || l.confirmationStatus === 'pending').length}
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
                        {leads.filter(l => l.confirmationStatus === 'decline').length}
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
                        {leads.filter(l => l.leadStatus === 'registered' || l.leadStatus === 'green').length}
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
                        {leads.filter(l => l.leadStatus === 'tentative' || l.leadStatus === 'yellow').length}
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
                        {leads.filter(l => l.leadStatus === 'not_interest' || l.leadStatus === 'red').length}
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
                        {leads.filter(l => l.confirmationStatus === 'approve').length}
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
                        {leads.filter(l => !l.confirmationStatus || l.confirmationStatus === 'pending').length}
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
                        {leads.filter(l => l.confirmationStatus === 'decline').length}
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
                        {leads.filter(l => l.confirmationStatus === 'approve' && (l.leadStatus === 'registered' || l.leadStatus === 'green')).length}
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
                        {leads.filter(l => l.reminderH7 === 'confirm' || l.reminderH3 === 'confirm' || l.reminderH1 === 'confirm').length}
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
                        {leads.filter(l => l.reminderH7 === 'tentative' || l.reminderH3 === 'tentative' || l.reminderH1 === 'tentative').length}
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
                        {leads.filter(l => l.reminderH7 === 'unable_to_attend' || l.reminderH3 === 'unable_to_attend' || l.reminderH1 === 'unable_to_attend').length}
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
                        {leads.filter(l => l.reminderHariH === 'on_location').length}
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
                        {leads.filter(l => l.reminderHariH === 'on_the_way').length}
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
                        {leads.filter(l => !l.reminderHariH || l.reminderHariH === 'not_respon_yet').length}
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
                        {leads.filter(l => l.reminderHariH === 'unable_to_attend').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          {selectedLeadIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-sm animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center bg-blue-600 text-white font-bold text-xs w-6 h-6 rounded-full shrink-0">
                  {selectedLeadIds.length}
                </span>
                <span className="text-xs font-bold text-slate-700">Leads selected for batch update</span>
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
                            handleBatchUpdateLeadStatus(e.target.value);
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
                  onClick={() => setSelectedLeadIds([])}
                  className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Toolbar with Search & Advanced Filters */}
          {leads.length > 0 && (
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-4 mb-6 shrink-0 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:max-w-xs shadow-sm">
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search leads by name, title, company..."
                    value={leadSearchQuery}
                    onChange={(e) => setLeadSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                {(leadSearchQuery || filterLeadCompany || filterLeadPosition || filterLeadIndustry || filterLeadCity) && (
                  <button
                    onClick={handleResetLeadFilters}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all self-start md:self-auto shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by Company</label>
                  <select
                    value={filterLeadCompany}
                    onChange={(e) => setFilterLeadCompany(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">All Companies</option>
                    {Array.from(new Set(leads.map(l => l.database.company?.name).filter(Boolean))).sort().map((compName) => (
                      <option key={compName} value={compName}>{compName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Position Level</label>
                  <select
                    value={filterLeadPosition}
                    onChange={(e) => setFilterLeadPosition(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">All Levels</option>
                    {Array.from(new Set(leads.map(l => l.database.positionLevel).filter(Boolean))).sort().map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Industry</label>
                  <select
                    value={filterLeadIndustry}
                    onChange={(e) => setFilterLeadIndustry(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">All Industries</option>
                    {Array.from(new Set(leads.map(l => l.database.company?.industry).filter(Boolean))).sort().map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
                  <select
                    value={filterLeadCity}
                    onChange={(e) => setFilterLeadCity(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">All Cities</option>
                    {Array.from(new Set(leads.map(l => l.database.company?.city).filter(Boolean))).sort().map((cty) => (
                      <option key={cty} value={cty}>{cty}</option>
                    ))}
                  </select>
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by PIC</label>
                    <select
                      value={filterLeadPic}
                      onChange={(e) => setFilterLeadPic(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">All PICs</option>
                      <option value="-">Unassigned</option>
                      {usersList.map((user) => {
                        const name = user.fullName || user.username;
                        return <option key={user.id} value={name}>{name}</option>;
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>
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
      {isAddLeadModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsAddLeadModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-4 shrink-0">Add Database as Lead</h3>

            <form onSubmit={handleAddLead} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Databases</label>
                
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    placeholder="Search databases by name or company..."
                    value={leadDatabaseSearch}
                    onChange={(e) => setLeadDatabaseSearch(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
                  />

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Advanced Filters</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Company</label>
                        <select
                          value={filterAddLeadCompany}
                          onChange={(e) => setFilterAddLeadCompany(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                        >
                          <option value="">All Companies</option>
                          {Array.from(new Set(databases.map(c => c.company?.name).filter(Boolean))).sort().map((compName) => (
                            <option key={compName} value={compName}>{compName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Position</label>
                        <select
                          value={filterAddLeadPosition}
                          onChange={(e) => setFilterAddLeadPosition(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                        >
                          <option value="">All Levels</option>
                          {Array.from(new Set(databases.map(c => c.positionLevel).filter(Boolean))).sort().map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Industry</label>
                        <select
                          value={filterAddLeadIndustry}
                          onChange={(e) => setFilterAddLeadIndustry(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                        >
                          <option value="">All Industries</option>
                          {Array.from(new Set(databases.map(c => c.company?.industry).filter(Boolean))).sort().map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">City</label>
                        <select
                          value={filterAddLeadCity}
                          onChange={(e) => setFilterAddLeadCity(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                        >
                          <option value="">All Cities</option>
                          {Array.from(new Set(databases.map(c => c.company?.city).filter(Boolean))).sort().map((cty) => (
                            <option key={cty} value={cty}>{cty}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
                        <label className="block text-[9px] font-bold text-slate-455 uppercase mb-0.5">Pernah diundang ke Event</label>
                        <select
                          value={filterAddLeadEventId}
                          onChange={(e) => setFilterAddLeadEventId(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                        >
                          <option value="">- Select Event -</option>
                          {events.filter(e => e.id !== selectedEvent.id).map((evt) => (
                            <option key={evt.id} value={evt.id}>{evt.name}</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {(filterAddLeadCompany || filterAddLeadPosition || filterAddLeadIndustry || filterAddLeadCity || filterAddLeadEventId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterAddLeadCompany('');
                          setFilterAddLeadPosition('');
                          setFilterAddLeadIndustry('');
                          setFilterAddLeadCity('');
                          setFilterAddLeadEventId('');
                        }}
                        className="text-[10px] font-extrabold text-red-600 hover:text-red-700 transition-colors uppercase pt-1"
                      >
                        Clear Modal Filters
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 max-h-[180px] overflow-y-auto">
                  {visibleDatabases.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">No available databases found.</p>
                  ) : (
                    visibleDatabases.map((c) => {
                      const isChecked = selectedDatabaseIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedDatabaseIds(selectedDatabaseIds.filter((id) => id !== c.id));
                              } else {
                                setSelectedDatabaseIds([...selectedDatabaseIds, c.id]);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500"
                          />
                          <div className="text-xs flex-1">
                            <p className="font-bold text-slate-900">{c.firstName} {c.lastName}</p>
                            {c.company?.name && (
                              <p className="text-[10px] text-slate-500 font-medium">{c.company.name}</p>
                            )}
                            
                            {/* Past Events History Badges */}
                            {(() => {
                              const databaseLeads = allEventLeads.filter(l => l.database.id === c.id);
                              if (databaseLeads.length === 0) return null;
                              return (
                                <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                  <span className="text-[9px] font-bold text-slate-400">Invited to:</span>
                                  {databaseLeads.map(l => (
                                    <span 
                                      key={l.id} 
                                      className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 border border-slate-200 text-slate-600 uppercase tracking-wide"
                                    >
                                      {l.event.name}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {visibleDatabases.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] mt-2 px-1 text-blue-600 font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        const allVisibleIds = visibleDatabases.map((c) => c.id);
                        const uniqueIds = Array.from(new Set([...selectedDatabaseIds, ...allVisibleIds]));
                        setSelectedDatabaseIds(uniqueIds);
                      }}
                      className="hover:text-blue-550 transition-colors"
                    >
                      Select All Matches
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allVisibleIds = visibleDatabases.map((c) => c.id);
                        setSelectedDatabaseIds(selectedDatabaseIds.filter((id) => !allVisibleIds.includes(id)));
                      }}
                      className="hover:text-slate-700 text-slate-500 transition-colors"
                    >
                      Deselect All Matches
                    </button>
                  </div>
                )}
                
                <p className="text-[10px] text-slate-500 mt-2 px-1 font-bold">
                  {selectedDatabaseIds.length} database(s) selected to add
                </p>
              </div>


              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lead Notes</label>
                <textarea
                  placeholder="Notes about invitation..."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLead}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Details & Qualification Drawer Modal Overlay */}
      {isUpdateLeadModalOpen && activeLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-5 shadow-xl relative animate-in scale-in duration-200 text-slate-900 my-4">
            <button
              onClick={() => {
                setIsUpdateLeadModalOpen(false);
                setActiveLead(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-base font-extrabold text-slate-900">Lead Detail & Qualification</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Manage database: <strong className="text-slate-700">{activeLead.database.firstName} {activeLead.database.lastName}</strong> ({activeLead.database.company?.name || 'No Company'})
              </p>
            </div>

            <div className="space-y-3">
              {/* Profile Info */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[10px] grid grid-cols-4 gap-2 mb-2">
                <div>
                  <span className="text-slate-400 font-bold block">Job Title</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.database.jobTitle || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Industry</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.database.company?.industry || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Mobile Phone</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.database.mobilePhone || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Email</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.database.emails?.[0]?.email || '-'}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateLeadStatus} className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-1">Lead Qualification</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      Tele Remarks (Status)
                    </label>
                    <select
                      value={updateLeadStatusStr}
                      onChange={(e) => setUpdateLeadStatusStr(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                    >
                      <option value="not_respon_yet">Not respond yet</option>
                      <option value="not_respond_2x">Not respond 2x</option>
                      <option value="not_respond_3x">Not respond 3x</option>
                      <option value="not_respond_4x">Not respond 4x</option>
                      <option value="not_respond_5x">Not respond 5x</option>
                      <option value="not_respond_6x">Not respond 6x</option>
                      <option value="not_respond_7x">Not respond 7x</option>
                      <option value="not_respond_8x">Not respond 8x</option>
                      <option value="not_respond_9x">Not respond 9x</option>
                      <option value="registered">Registered</option>
                      <option value="confirm">Confirm</option>
                      <option value="tentative">Tentative</option>
                      <option value="not_interest">Not Interest</option>
                      <option value="unable_to_attend">Unable to attend</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                      Confirmation Status
                    </label>
                    <select
                      value={updateConfirmationStatusStr}
                      onChange={(e) => setUpdateConfirmationStatusStr(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="approve">Approve</option>
                      <option value="decline">Decline</option>
                    </select>
                  </div>
                </div>

                <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-1 pt-1">Reminders</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      H-7 Reminder
                    </label>
                    <select
                      value={updateReminderH7}
                      onChange={(e) => setUpdateReminderH7(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                    >
                      <option value="">- None</option>
                      <option value="not_respon_yet">Not respond yet</option>
                      <option value="not_respond_2x">Not respond 2x</option>
                      <option value="tentative">Tentative</option>
                      <option value="confirm">Confirm</option>
                      <option value="unable_to_attend">Unable to attend</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      H-3 Reminder
                    </label>
                    <select
                      value={updateReminderH3}
                      onChange={(e) => setUpdateReminderH3(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                    >
                      <option value="">- None</option>
                      <option value="not_respon_yet">Not respond yet</option>
                      <option value="not_respond_2x">Not respond 2x</option>
                      <option value="tentative">Tentative</option>
                      <option value="confirm">Confirm</option>
                      <option value="unable_to_attend">Unable to attend</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      H-1 Reminder
                    </label>
                    <select
                      value={updateReminderH1}
                      onChange={(e) => setUpdateReminderH1(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                    >
                      <option value="">- None</option>
                      <option value="not_respon_yet">Not respond yet</option>
                      <option value="not_respond_2x">Not respond 2x</option>
                      <option value="tentative">Tentative</option>
                      <option value="confirm">Confirm</option>
                      <option value="unable_to_attend">Unable to attend</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <Calendar className="w-3 h-3 text-rose-500" />
                      Hari H Reminder
                    </label>
                    <select
                      value={updateReminderHariH}
                      onChange={(e) => setUpdateReminderHariH(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[10px] focus:outline-none"
                    >
                      <option value="">- None</option>
                      <option value="on_location">On Location</option>
                      <option value="on_the_way">On The Way</option>
                      <option value="not_respon_yet">Not Respond Yet</option>
                      <option value="unable_to_attend">Unable Attend</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <Phone className="w-3 h-3 text-sky-500" />
                      Call Status
                    </label>
                    <select
                      value={updateCallStatusStr}
                      onChange={(e) => setUpdateCallStatusStr(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                    >
                      <option value="NOT_CONTACTED">Belum Telpon</option>
                      <option value="CONNECTED">Sudah Telpon</option>
                      <option value="NO_ANSWER">Tidak Diangkat</option>
                      <option value="BUSY">Sibuk</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <MessageSquare className="w-3 h-3 text-emerald-500" />
                      WhatsApp Status
                    </label>
                    <select
                      value={updateWhatsappStatusStr}
                      onChange={(e) => setUpdateWhatsappStatusStr(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                    >
                      <option value="NOT_SENT">Belum WA</option>
                      <option value="SENT">Sudah WA</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <Mail className="w-3 h-3 text-amber-500" />
                      Email Status
                    </label>
                    <select
                      value={updateEmailStatusStr}
                      onChange={(e) => setUpdateEmailStatusStr(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                    >
                      <option value="NOT_SENT">Belum Email</option>
                      <option value="SENT">Sudah Email</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Follow-up Notes</label>
                  <textarea
                    placeholder="Details on status update..."
                    value={updateLeadNotes}
                    onChange={(e) => setUpdateLeadNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 mt-4">
                  <button
                    type="submit"
                    disabled={submittingLeadUpdate}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {submittingLeadUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Save Qualification Info
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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

