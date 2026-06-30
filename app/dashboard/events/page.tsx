'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Event, EventLead, Contact, EventLeadActivity } from '../../../lib/types';
import { CalendarDays, Plus, Search, X, Loader2, UserPlus, Eye, Edit2, Trash2, Download, Check, Square, CheckSquare, RefreshCw, CheckCircle, Phone, Mail, MessageSquare, Calendar, Award, TrendingUp, BarChart3, Copy, Flame, Sun, Snowflake, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

const getStatusBadgeStyle = (status: string) => {
  const s = status ? status.toLowerCase() : '';
  if (s === 'registered' || s === 'confirm' || s === 'green') {
    return 'text-emerald-700 bg-emerald-50 border-emerald-250';
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

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function EventsPage() {
  const { isAdmin, isManager, isUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Event & Leads state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

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
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [leadContactSearch, setLeadContactSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState('white');
  const [attendanceStatus, setAttendanceStatus] = useState('pending');
  const [leadNotes, setLeadNotes] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);

  // Form inputs for updating a Lead status
  const [activeLead, setActiveLead] = useState<EventLead | null>(null);
  const [activeTab, setActiveTab] = useState<'event' | 'reminder'>('event');
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

  // Email template copy states
  const [isCopyEmailModalOpen, setIsCopyEmailModalOpen] = useState(false);
  const [copiedEmailHTML, setCopiedEmailHTML] = useState('');

  // Report states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [eventReport, setEventReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [eList, cList] = await Promise.all([
        crmService.getEvents(),
        crmService.getContacts()
      ]);
      setEvents(eList);
      setContacts(cList.filter(c => c.isActive)); // only active contacts
    } catch (err) {
      toast.error('Failed to load events or contacts');
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

    if (activeTab === 'event') {
      sheetName = 'Event Leads';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Event_Report.xlsx`;
      
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

        // Map Tele Remarks Status Color label
        const colorLabels: Record<string, string> = {
          white: 'White (No reply)',
          yellow: 'Yellow (Tentative)',
          green: 'Green (Confirmed)',
          red: 'Red (Rejected)',
        };
        const statusColorLabel = colorLabels[l.leadStatus] || l.leadStatus;

        // Map Attendance Status label
        const attendanceLabels: Record<string, string> = {
          invited: 'Invited',
          registered: 'Registered',
          attended: 'Attended',
          no_show: 'No Show',
          cancelled: 'Cancelled',
        };
        const attendanceLabel = attendanceLabels[l.attendanceStatus] || l.attendanceStatus;

        return {
          'No': index + 1,
          'Company Name': l.contact.company?.name || '-',
          'Contact Name': `${l.contact.salutation ? l.contact.salutation + ' ' : ''}${l.contact.firstName} ${l.contact.lastName}`,
          'Job Title': l.contact.jobTitle || '-',
          'Email Address': l.contact.emails?.[0]?.email || '-',
          'Mobile Number': l.contact.mobilePhone || '-',
          'Industry': l.contact.company?.industry || '-',
          'Call Status': callLabel,
          'WhatsApp Status': l.whatsappStatus === 'SENT' ? 'Sudah WhatsApp' : 'Belum WhatsApp',
          'Email Status': l.emailStatus === 'SENT' ? 'Sudah Email' : 'Belum Email',
          'Tele Remarks': statusColorLabel,
          'Confirmation Status': confirmationLabel,
          'Attendance Status': attendanceLabel,
          'Notes': l.notes || '-'
        };
      });
    } else {
      sheetName = 'Reminder Status';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Reminder_Report.xlsx`;

      dataToExport = filteredLeads.map((l, index) => {
        return {
          'No': index + 1,
          'Company Name': l.contact.company?.name || '-',
          'Contact Name': `${l.contact.salutation ? l.contact.salutation + ' ' : ''}${l.contact.firstName} ${l.contact.lastName}`,
          'Job Title': l.contact.jobTitle || '-',
          'Email Address': l.contact.emails?.[0]?.email || '-',
          'Mobile Number': l.contact.mobilePhone || '-',
          'Industry': l.contact.company?.industry || '-',
          'H-7 Reminder': getReminderLabel(l.reminderH7),
          'H-3 Reminder': getReminderLabel(l.reminderH3),
          'H-1 Reminder': getReminderLabel(l.reminderH1),
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

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || selectedContactIds.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    setSubmittingLead(true);
    try {
      await crmService.createEventLead({
        eventId: selectedEvent.id,
        contactIds: selectedContactIds,
        leadStatus,
        attendanceStatus,
        notes: leadNotes.trim() || undefined
      });

      toast.success(`Successfully added ${selectedContactIds.length} contact(s) as lead(s)!`);
      setIsAddLeadModalOpen(false);
      setSelectedContactIds([]);
      setLeadContactSearch('');
      setLeadNotes('');
      
      // Reload leads
      handleSelectEvent(selectedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contact(s) to event');
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleOpenReportModal = async () => {
    if (!selectedEvent) return;
    setLoadingReport(true);
    setIsReportModalOpen(true);
    try {
      const data = await crmService.getEventReport(selectedEvent.id);
      setEventReport(data);
    } catch (err) {
      toast.error('Failed to load performance report');
    } finally {
      setLoadingReport(false);
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
        const filteredLeads = allLeads.filter((l) => l.event.id === selectedEvent.id);
        setLeadsSorted(filteredLeads);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to log activity');
    } finally {
      setIsLoggingActivity(false);
    }
  };

  const triggerWhatsApp = async () => {
    if (!activeLead) return;
    const phone = activeLead.contact.mobilePhone;
    if (!phone) {
      toast.error("Contact has no phone number");
      return;
    }
    
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    
    // Pre-filled template (Phase 6 Meeting reminder/outbound)
    const template = `Halo ${activeLead.contact.salutation ? activeLead.contact.salutation + ' ' : ''}${activeLead.contact.firstName} ${activeLead.contact.lastName},\n\nSaya dari KIM Communication. Ingin mengonfirmasi mengenai project aktif dan ketertarikan Anda untuk berdiskusi dengan Ingram Micro mengenai AI Solutions.`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(template)}`;
    
    window.open(url, '_blank');
    
    try {
      await crmService.addEventLeadActivity(activeLead.id, {
        activityType: 'WHATSAPP',
        status: 'SENT',
        notes: 'Opened WhatsApp Chat Window.'
      });
      setUpdateWhatsappStatusStr('SENT');
      loadLeadActivities(activeLead.id);
      if (selectedEvent) {
        const allLeads = await crmService.getEventLeads();
        const filteredLeads = allLeads.filter((l) => l.event.id === selectedEvent.id);
        setLeadsSorted(filteredLeads);
      }
      toast.success("WhatsApp chat opened and logged.");
    } catch (e) {
      toast.error("Failed to log WhatsApp activity");
    }
  };

  const triggerEmail = async () => {
    if (!activeLead) return;
    const emails = activeLead.contact.emails;
    if (!emails || emails.length === 0) {
      toast.error("Contact has no email address");
      return;
    }
    const emailAddr = emails[0].email;
    
    try {
      const activity = await crmService.addEventLeadActivity(activeLead.id, {
        activityType: 'EMAIL',
        status: 'SENT',
        notes: `Generated email tracking copy template.`
      });
      
      setUpdateEmailStatusStr('SENT');
      loadLeadActivities(activeLead.id);
      if (selectedEvent) {
        const allLeads = await crmService.getEventLeads();
        const filteredLeads = allLeads.filter((l) => l.event.id === selectedEvent.id);
        setLeadsSorted(filteredLeads);
      }

      // Generate tracking URL point to our backend public tracking endpoint
      const trackingPixelUrl = `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}/api/event-leads/emails/track/${activity.id}`;
      
      setCopiedEmailHTML(`<div style="font-family: sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
  <p>Halo ${activeLead.contact.salutation ? activeLead.contact.salutation + ' ' : ''}${activeLead.contact.firstName} ${activeLead.contact.lastName},</p>
  <p>Semoga pesan ini menemui Anda dalam keadaan baik.</p>
  <p>Kami dari <strong>KIM Communication</strong> ingin mendiskusikan implementasi solusi kecerdasan buatan (AI) yang sedang dievaluasi di perusahaan Anda bersama tim <strong>Ingram Micro</strong>.</p>
  <p>Apakah Anda bersedia untuk berdiskusi singkat atau melakukan meeting via Teams/Zoom?</p>
  <br/>
  <p>Salam hangat,</p>
  <p><strong>CRM Agent</strong><br/>KIM Communication</p>
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" />
</div>`);
      
      setIsCopyEmailModalOpen(true);
      toast.success("Email log created. Copy the template to send!");
    } catch (e) {
      toast.error("Failed to log Email activity");
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

  // Filter active contacts not currently leads in the selected event
  const contactsNotInEvent = contacts.filter(
    (c) => !leads.some((l) => l.contact.id === c.id)
  );

  const visibleContacts = contactsNotInEvent.filter((c) => {
    const term = leadContactSearch.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const companyName = c.company?.name?.toLowerCase() || '';
    return fullName.includes(term) || companyName.includes(term);
  });

  const filteredLeads = leads.filter((l) => {
    if (activeTab === 'reminder') {
      const confStatus = l.confirmationStatus?.toLowerCase();
      const leadStatus = l.leadStatus?.toLowerCase();
      if (confStatus !== 'approve' || leadStatus !== 'registered') {
        return false;
      }
    }

    if (!leadSearchQuery) return true;
    const term = leadSearchQuery.toLowerCase();
    const fullName = `${l.contact.firstName} ${l.contact.lastName}`.toLowerCase();
    const companyName = l.contact.company?.name?.toLowerCase() || '';
    const jobTitle = l.contact.jobTitle?.toLowerCase() || '';
    return fullName.includes(term) || companyName.includes(term) || jobTitle.includes(term);
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
              <button
                onClick={() => setIsAddLeadModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Lead
              </button>
            </div>
          </div>

          {/* Statistics Box Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50/40 border border-blue-100/70 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500 text-white rounded-xl">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total Leads</span>
                <span className="text-xl font-extrabold text-blue-900">{leads.length}</span>
              </div>
            </div>
            
            <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-600 text-white rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hadir (Attended)</span>
                <span className="text-xl font-extrabold text-emerald-900">
                  {leads.filter(l => l.attendanceStatus === 'attended').length}
                </span>
              </div>
            </div>

            <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500 text-white rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-amber-650 uppercase tracking-wider">Belum Hadir</span>
                <span className="text-xl font-extrabold text-amber-900">
                  {leads.filter(l => l.attendanceStatus !== 'attended').length}
                </span>
              </div>
            </div>

            <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-rose-500 text-white rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Registered Leads</span>
                <span className="text-xl font-extrabold text-rose-900">
                  {leads.filter(l => l.leadStatus === 'registered' || l.leadStatus === 'green').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 mb-6 gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab('event');
                setSelectedLeadIds([]);
              }}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'event'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Event
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
          </div>


          {/* Toolbar with Search */}
          {leads.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shrink-0">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:max-w-xs shadow-sm">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search leads by name, title, company..."
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
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
              <p className="text-xs text-slate-400 mt-1">Start by clicking "Add Lead" to register a contact.</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Search className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No matching leads found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms.</p>
            </div>
          ) : activeTab === 'event' ? (
            <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
              <table className="w-full min-w-[1000px] text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Job Title</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Engagement</th>
                    <th className="py-3 px-4">Tele Remarks</th>
                    <th className="py-3 px-4 text-center">Confirmation Status</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/30 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {l.contact.firstName} {l.contact.lastName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium truncate max-w-[150px]" title={l.contact.jobTitle || ''}>
                        {l.contact.jobTitle || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {l.contact.company?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 text-slate-400">
                          {/* Call Engagement */}
                          <button
                            onDoubleClick={() => handleToggleEngagement(l, 'CALL')}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            title={`Call Status: ${l.callStatus || 'NOT_CONTACTED'} (Double-click to toggle)`}
                          >
                            <Phone 
                              className={`w-4 h-4 transition-all ${
                                l.callStatus === 'CONNECTED' 
                                  ? 'text-blue-600 fill-blue-500/10 scale-110 font-bold' 
                                  : l.callStatus && l.callStatus !== 'NOT_CONTACTED' 
                                    ? 'text-slate-600' 
                                    : 'text-slate-300'
                              }`} 
                            />
                          </button>

                          {/* Email Engagement */}
                          <button
                            onDoubleClick={() => handleToggleEngagement(l, 'EMAIL')}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            title={`Email Status: ${l.emailStatus || 'NOT_SENT'} (Double-click to toggle)`}
                          >
                            <Mail 
                              className={`w-4 h-4 transition-all ${
                                l.emailStatus === 'SENT' || l.emailStatus === 'OPENED' || l.emailStatus === 'RESPONDED'
                                  ? 'text-rose-500 fill-rose-500/10 scale-110' 
                                  : 'text-slate-300'
                              }`} 
                            />
                          </button>

                          {/* WhatsApp Engagement */}
                          <button
                            onDoubleClick={() => handleToggleEngagement(l, 'WHATSAPP')}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            title={`WhatsApp Status: ${l.whatsappStatus || 'NOT_SENT'} (Double-click to toggle)`}
                          >
                            <WhatsAppIcon 
                              className={`w-4 h-4 transition-all ${
                                l.whatsappStatus === 'SENT' || l.whatsappStatus === 'RESPONDED'
                                  ? 'text-[#25D366] scale-110 filter drop-shadow-[0_1px_2px_rgba(37,211,102,0.2)]' 
                                  : 'text-slate-300'
                              }`} 
                            />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={l.leadStatus || 'not_respon_yet'}
                          onChange={(e) => handleDirectUpdateLead(l, 'remarks', e.target.value)}
                          className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.leadStatus)}`}
                        >
                          <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                          <option value="not_respond_2x" className="text-slate-750 bg-white font-semibold">Not respond 2x</option>
                          <option value="registered" className="text-emerald-700 bg-white font-extrabold">Registered</option>
                          <option value="tentative" className="text-amber-700 bg-white font-extrabold">Tentative</option>
                          <option value="not_interest" className="text-rose-700 bg-white font-extrabold">Not Interest</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center">
                          <select
                            value={l.confirmationStatus || 'pending'}
                            onChange={(e) => handleDirectUpdateLead(l, 'confirmationStatus', e.target.value)}
                            className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getConfirmationStatusBadgeStyle(l.confirmationStatus)}`}
                          >
                            <option value="pending" className="text-blue-700 bg-white font-extrabold">Pending</option>
                            <option value="approve" className="text-emerald-700 bg-white font-extrabold">Approve</option>
                            <option value="decline" className="text-rose-700 bg-white font-extrabold">Decline</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={l.attendanceStatus}
                          onChange={(e) => handleDirectUpdateLead(l, 'attendance', e.target.value)}
                          className={`text-[10px] font-bold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer capitalize transition-all ${
                            l.attendanceStatus === 'attended' 
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                              : l.attendanceStatus === 'no_show' 
                                ? 'text-amber-700 bg-amber-50 border-amber-100' 
                                : l.attendanceStatus === 'invited' 
                                  ? 'text-blue-700 bg-blue-50 border-blue-100' 
                                  : l.attendanceStatus === 'registered' 
                                    ? 'text-indigo-700 bg-indigo-50 border-indigo-100' 
                                    : l.attendanceStatus === 'cancelled' 
                                      ? 'text-rose-700 bg-rose-50 border-rose-100' 
                                      : 'text-slate-700 bg-slate-50 border-slate-200'
                          }`}
                        >
                          <option value="invited" className="text-blue-750 bg-white font-semibold">Invited</option>
                          <option value="registered" className="text-indigo-750 bg-white font-semibold">Registered</option>
                          <option value="attended" className="text-emerald-750 bg-white font-semibold">Attended</option>
                          <option value="no_show" className="text-amber-750 bg-white font-semibold">No Show</option>
                          <option value="cancelled" className="text-rose-750 bg-white font-semibold">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[120px] truncate" title={l.notes}>
                        {l.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenUpdateLeadModal(l)}
                          className="inline-flex p-1.5 hover:bg-slate-100 hover:text-blue-600 rounded-lg text-slate-500 transition-all"
                          title="Update Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isUser && (
                          <button
                            onClick={() => openDeleteLeadConfirm(l)}
                            className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-650 rounded-lg text-slate-400 hover:text-red-650 transition-all"
                            title="Remove Participant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
              <table className="w-full min-w-[1000px] text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Job Title</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4 text-center">H-7</th>
                    <th className="py-3 px-4 text-center">H-3</th>
                    <th className="py-3 px-4 text-center">H-1</th>
                    <th className="py-3 px-4 text-center">Hari H</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/30 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {l.contact.firstName} {l.contact.lastName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium truncate max-w-[150px]" title={l.contact.jobTitle || ''}>
                        {l.contact.jobTitle || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {l.contact.company?.name || '-'}
                      </td>
                      {/* H-7 Dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center">
                          <select
                            value={l.reminderH7 || ''}
                            onChange={(e) => handleDirectUpdateLead(l, 'reminderH7', e.target.value)}
                            className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.reminderH7 || '')}`}
                          >
                            <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                            <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                            <option value="not_respond_2x" className="text-slate-750 bg-white font-semibold">Not respond 2x</option>
                            <option value="tentative" className="text-amber-700 bg-white font-extrabold">Tentative</option>
                            <option value="confirm" className="text-emerald-700 bg-white font-extrabold">Confirm</option>
                            <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable to attend</option>
                          </select>
                        </div>
                      </td>
                      {/* H-3 Dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center">
                          <select
                            value={l.reminderH3 || ''}
                            onChange={(e) => handleDirectUpdateLead(l, 'reminderH3', e.target.value)}
                            className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.reminderH3 || '')}`}
                          >
                            <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                            <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                            <option value="not_respond_2x" className="text-slate-750 bg-white font-semibold">Not respond 2x</option>
                            <option value="tentative" className="text-amber-700 bg-white font-extrabold">Tentative</option>
                            <option value="confirm" className="text-emerald-700 bg-white font-extrabold">Confirm</option>
                            <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable to attend</option>
                          </select>
                        </div>
                      </td>
                      {/* H-1 Dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center">
                          <select
                            value={l.reminderH1 || ''}
                            onChange={(e) => handleDirectUpdateLead(l, 'reminderH1', e.target.value)}
                            className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.reminderH1 || '')}`}
                          >
                            <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                            <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                            <option value="not_respond_2x" className="text-slate-750 bg-white font-semibold">Not respond 2x</option>
                            <option value="tentative" className="text-amber-700 bg-white font-extrabold">Tentative</option>
                            <option value="confirm" className="text-emerald-700 bg-white font-extrabold">Confirm</option>
                            <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable to attend</option>
                          </select>
                        </div>
                      </td>
                      {/* Hari H Dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center">
                          <select
                            value={l.reminderHariH || ''}
                            onChange={(e) => handleDirectUpdateLead(l, 'reminderHariH', e.target.value)}
                            className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.reminderHariH || '')}`}
                          >
                            <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                            <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                            <option value="not_respond_2x" className="text-slate-750 bg-white font-semibold">Not respond 2x</option>
                            <option value="not_respond_3x" className="text-slate-750 bg-white font-semibold">Not respond 3x</option>
                            <option value="not_respond_4x" className="text-slate-750 bg-white font-semibold">Not respond 4x</option>
                            <option value="not_respond_5x" className="text-slate-750 bg-white font-semibold">Not respond 5x</option>
                            <option value="not_respond_6x" className="text-slate-750 bg-white font-semibold">Not respond 6x</option>
                            <option value="not_respond_7x" className="text-slate-750 bg-white font-semibold">Not respond 7x</option>
                            <option value="not_respond_8x" className="text-slate-750 bg-white font-semibold">Not respond 8x</option>
                            <option value="not_respond_9x" className="text-slate-750 bg-white font-semibold">Not respond 9x</option>
                            <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable to attend</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[120px] truncate" title={l.notes}>
                        {l.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenUpdateLeadModal(l)}
                          className="inline-flex p-1.5 hover:bg-slate-100 hover:text-blue-600 rounded-lg text-slate-500 transition-all"
                          title="Update Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isUser && (
                          <button
                            onClick={() => openDeleteLeadConfirm(l)}
                            className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-650 rounded-lg text-slate-400 hover:text-red-650 transition-all"
                            title="Remove Participant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal Overlay */}
      {isCreateEventModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <button
              onClick={() => setIsCreateEventModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Create New Event</h3>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Security Summit 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="partner">Partner</option>
                    <option value="end_user">End User</option>
                    <option value="internal">Internal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Target</label>
                  <input
                    type="text"
                    placeholder="e.g. Google Cloud"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date Start</label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date End</label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  placeholder="Additional event description..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal Overlay */}
      {isEditEventModalOpen && editingEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <button
              onClick={() => {
                setIsEditEventModalOpen(false);
                setEditingEvent(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Edit Event</h3>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Security Summit 2026"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Type</label>
                  <select
                    value={editEventType}
                    onChange={(e) => setEditEventType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="partner">Partner</option>
                    <option value="end_user">End User</option>
                    <option value="internal">Internal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Target</label>
                  <input
                    type="text"
                    placeholder="e.g. Google Cloud"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date Start</label>
                  <input
                    type="date"
                    value={editDateStart}
                    onChange={(e) => setEditDateStart(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date End</label>
                  <input
                    type="date"
                    value={editDateEnd}
                    onChange={(e) => setEditDateEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  placeholder="Additional event description..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditEventModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal Overlay */}
      {isDeleteEventConfirmOpen && deletingEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Event</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to permanently delete the event <span className="font-semibold text-slate-800">"{deletingEvent.name}"</span>? 
              This will completely erase the event and all associated event lead tracking logs. This action is irreversible.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteEventConfirmOpen(false);
                  setDeletingEvent(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                disabled={submittingEvent}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={submittingEvent}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submittingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal Overlay */}
      {isAddLeadModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <button
              onClick={() => setIsAddLeadModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Add Contact as Lead</h3>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Contacts</label>
                <input
                  type="text"
                  placeholder="Search contacts by name or company..."
                  value={leadContactSearch}
                  onChange={(e) => setLeadContactSearch(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white mb-2.5"
                />

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 max-h-[180px] overflow-y-auto">
                  {visibleContacts.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">No available contacts found.</p>
                  ) : (
                    visibleContacts.map((c) => {
                      const isChecked = selectedContactIds.includes(c.id);
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
                                setSelectedContactIds(selectedContactIds.filter((id) => id !== c.id));
                              } else {
                                setSelectedContactIds([...selectedContactIds, c.id]);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500"
                          />
                          <div className="text-xs">
                            <p className="font-bold text-slate-900">{c.firstName} {c.lastName}</p>
                            {c.company?.name && (
                              <p className="text-[10px] text-slate-500 font-medium">{c.company.name}</p>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {visibleContacts.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] mt-2 px-1 text-blue-600 font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        const allVisibleIds = visibleContacts.map((c) => c.id);
                        const uniqueIds = Array.from(new Set([...selectedContactIds, ...allVisibleIds]));
                        setSelectedContactIds(uniqueIds);
                      }}
                      className="hover:text-blue-550 transition-colors"
                    >
                      Select All Matches
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allVisibleIds = visibleContacts.map((c) => c.id);
                        setSelectedContactIds(selectedContactIds.filter((id) => !allVisibleIds.includes(id)));
                      }}
                      className="hover:text-slate-700 text-slate-500 transition-colors"
                    >
                      Deselect All Matches
                    </button>
                  </div>
                )}
                
                <p className="text-[10px] text-slate-500 mt-2 px-1 font-bold">
                  {selectedContactIds.length} contact(s) selected to add
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lead Confirmation Status</label>
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="white">White (No reply)</option>
                    <option value="yellow">Yellow (Tentative)</option>
                    <option value="green">Green (Confirmed)</option>
                    <option value="red">Red (Rejected)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Attendance Status</label>
                  <select
                    value={attendanceStatus}
                    onChange={(e) => setAttendanceStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approve">Approve</option>
                    <option value="decline">Decline</option>
                    <option value="invited">Invited</option>
                    <option value="registered">Registered</option>
                    <option value="attended">Attended</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
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

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
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
                Manage contact: <strong className="text-slate-700">{activeLead.contact.firstName} {activeLead.contact.lastName}</strong> ({activeLead.contact.company?.name || 'No Company'})
              </p>
            </div>

            <div className="space-y-3">
              {/* Profile Info */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[10px] grid grid-cols-4 gap-2 mb-2">
                <div>
                  <span className="text-slate-400 font-bold block">Job Title</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.contact.jobTitle || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Industry</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.contact.company?.industry || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Mobile Phone</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.contact.mobilePhone || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Email</span>
                  <p className="font-semibold text-slate-700 truncate">{activeLead.contact.emails?.[0]?.email || '-'}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateLeadStatus} className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-1">Lead Qualification</h4>
                
                <div className="grid grid-cols-3 gap-3">
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

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mb-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      Attendance Status
                    </label>
                    <select
                      value={updateAttendanceStatusStr}
                      onChange={(e) => setUpdateAttendanceStatusStr(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                    >
                      <option value="invited">Invited</option>
                      <option value="registered">Registered</option>
                      <option value="attended">Attended</option>
                      <option value="no_show">No Show</option>
                      <option value="cancelled">Cancelled</option>
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
                      <option value="not_respon_yet">Not respond yet</option>
                      <option value="not_respond_2x">Not respond 2x</option>
                      <option value="not_respond_3x">Not respond 3x</option>
                      <option value="not_respond_4x">Not respond 4x</option>
                      <option value="not_respond_5x">Not respond 5x</option>
                      <option value="not_respond_6x">Not respond 6x</option>
                      <option value="not_respond_7x">Not respond 7x</option>
                      <option value="not_respond_8x">Not respond 8x</option>
                      <option value="not_respond_9x">Not respond 9x</option>
                      <option value="unable_to_attend">Unable to attend</option>
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

      {/* Copy Email Template Modal */}
      {isCopyEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <button
              onClick={() => setIsCopyEmailModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-2">Copy Email Outbound Template</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pesan ini mengandung email tracking pixel rahasia untuk melacak open-rate secara otomatis. Copy kode di bawah ini lalu paste sebagai HTML/RichText di aplikasi email Anda (Outlook/Gmail).
            </p>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-[250px] overflow-y-auto font-mono text-[10px] text-slate-700 whitespace-pre-wrap select-all">
              {copiedEmailHTML}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(copiedEmailHTML);
                  toast.success("HTML template copied to clipboard!");
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy HTML Template
              </button>
              <button
                type="button"
                onClick={() => setIsCopyEmailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Lead Confirm Modal Overlay */}
      {isDeleteLeadConfirmOpen && deletingLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <button
              onClick={() => {
                setIsDeleteLeadConfirmOpen(false);
                setDeletingLead(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Remove Participant from Event</h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to remove this person from the event?
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-6 text-sm">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</span>
                <span className="font-bold text-slate-800">{deletingLead.contact.firstName} {deletingLead.contact.lastName}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Title</span>
                <span className="font-semibold text-slate-700">{deletingLead.contact.jobTitle || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
                <span className="font-semibold text-slate-700">{deletingLead.contact.company?.name || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Industry</span>
                <span className="font-semibold text-slate-700">{deletingLead.contact.company?.industry || '-'}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteLeadConfirmOpen(false);
                  setDeletingLead(null);
                }}
                className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLead}
                disabled={submittingLeadDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-750 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submittingLeadDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

