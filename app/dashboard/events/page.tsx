'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Event, EventLead, Contact, EventLeadActivity } from '../../../lib/types';
import { CalendarDays, Plus, Search, X, Loader2, UserPlus, Eye, Edit2, Trash2, Download, Check, Square, CheckSquare, RefreshCw, CheckCircle, Phone, Mail, MessageSquare, Calendar, Award, TrendingUp, BarChart3, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

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
  const [attendanceStatus, setAttendanceStatus] = useState('invited');
  const [leadNotes, setLeadNotes] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);

  // Form inputs for updating a Lead status
  const [activeLead, setActiveLead] = useState<EventLead | null>(null);
  const [updateLeadStatusStr, setUpdateLeadStatusStr] = useState('white');
  const [updateAttendanceStatusStr, setUpdateAttendanceStatusStr] = useState('invited');
  const [updateLeadNotes, setUpdateLeadNotes] = useState('');
  const [submittingLeadUpdate, setSubmittingLeadUpdate] = useState(false);

  // Lead qualification fields
  const [updateLeadCategoryStr, setUpdateLeadCategoryStr] = useState('');
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
      setLeads(filteredLeads);
    } catch (err) {
      toast.error('Failed to fetch leads for this event');
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleExportLeads = () => {
    if (!selectedEvent || leads.length === 0) {
      toast.error("Tidak ada data lead untuk di-export.");
      return;
    }
    
    // Format data leads untuk Excel sesuai Phase 7 Handover Ingram Micro
    const dataToExport = leads.map((l, index) => ({
      'No': index + 1,
      'Company Name': l.contact.company?.name || '',
      'Contact Name': `${l.contact.salutation ? l.contact.salutation + ' ' : ''}${l.contact.firstName} ${l.contact.lastName}`,
      'Job Title': l.contact.jobTitle || '',
      'Email Address': l.contact.emails?.[0]?.email || '',
      'Mobile Number': l.contact.mobilePhone || '',
      'Industry': l.contact.company?.industry || '',
      'Call Status': l.callStatus || 'NOT_CONTACTED',
      'Email Status': l.emailStatus || 'NOT_SENT',
      'WhatsApp Status': l.whatsappStatus || 'NOT_SENT',
      'Lead Category': l.leadCategory || '-',
      'Business Challenges': l.businessChallenges || '',
      'Project Information': l.projectInfo || '',
      'Timeline': l.timeline || '',
      'Meeting Status': l.meetingStatus || 'NONE',
      'Lead Status (Color)': l.leadStatus.toUpperCase(),
      'Attendance Status': l.attendanceStatus.toUpperCase(),
      'Notes': l.notes || ''
    }));

    // Generate Sheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Handover');
    
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
    const fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Handover_Report.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Daftar leads berhasil di-export ke Excel dalam format Handover!');
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
            lead.notes
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
      toast.success(`Berhasil mengupdate status ${successCount} leads!`);
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
            lead.notes
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
    setUpdateLeadNotes(lead.notes || '');
    
    // Set qualification fields
    setUpdateLeadCategoryStr(lead.leadCategory || '');
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
        updateLeadCategoryStr || undefined,
        updateCallStatusStr || undefined,
        updateEmailStatusStr || undefined,
        updateWhatsappStatusStr || undefined,
        updateMeetingStatusStr || undefined,
        updateBusinessChallengesStr.trim() || undefined,
        updateProjectInfoStr.trim() || undefined,
        updateTimelineStr.trim() || undefined
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
        setLeads(filteredLeads);
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
        setLeads(filteredLeads);
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
        setLeads(filteredLeads);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Events & Lead Tracking</h2>
          <p className="text-sm text-slate-500 mt-1">Track event attendance, confirmation color statuses, and client targets.</p>
        </div>
        {!isUser && (
          <button
            onClick={() => setIsCreateEventModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Events List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No events found.</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredEvents.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt)}
                    className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-500/50 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate flex-1">{evt.name}</p>
                      {!isUser && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEventModal(evt);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-all"
                            title="Edit Event"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteEventConfirm(evt);
                            }}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-all"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Client: {evt.clientName || 'Independent'}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md border border-slate-200 capitalize">
                        {evt.eventType}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {evt.dateStart ? new Date(evt.dateStart).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Event Detail & Lead Tracker */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[400px] flex flex-col">
          {selectedEvent ? (
            <div className="flex-1 flex flex-col">
              {/* Event title section */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-50 border border-blue-100 text-blue-600 rounded-md uppercase">
                    {selectedEvent.eventType} Event
                  </span>
                  <h3 className="font-extrabold text-xl text-slate-900 mt-1.5">{selectedEvent.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Client Target: <strong className="text-slate-700">{selectedEvent.clientName || '-'}</strong>
                    {selectedEvent.dateStart && ` | Duration: ${new Date(selectedEvent.dateStart).toLocaleDateString()} - ${selectedEvent.dateEnd ? new Date(selectedEvent.dateEnd).toLocaleDateString() : 'End'}`}
                  </p>
                  
                  {/* Attendance Statistics */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center min-w-[80px]">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</span>
                      <span className="text-sm font-extrabold text-slate-700">{leads.length}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 text-center min-w-[80px]">
                      <span className="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Hadir</span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        {leads.filter(l => l.attendanceStatus === 'attended').length}
                      </span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 text-center min-w-[80px]">
                      <span className="block text-[9px] font-bold text-amber-500 uppercase tracking-wider">Belum Hadir</span>
                      <span className="text-sm font-extrabold text-amber-700">
                        {leads.filter(l => l.attendanceStatus !== 'attended').length}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.notes && (
                    <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
                      "{selectedEvent.notes}"
                    </p>
                  )}
                </div>
                
                 <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {leads.length > 0 && (
                    <>
                      <button
                        onClick={handleOpenReportModal}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/70 text-indigo-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        Campaign Stats
                      </button>
                      <button
                        onClick={handleExportLeads}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export Excel
                      </button>
                    </>
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
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Lead
                  </button>
                </div>
              </div>

              {/* Batch Action Panel */}
              {selectedLeadIds.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-150 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-extrabold text-blue-800">
                      {selectedLeadIds.length} lead(s) terpilih
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={isBatchUpdating}
                      onClick={() => handleBatchUpdateAttendance('attended')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all"
                    >
                      {isBatchUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Set Attended
                    </button>
                    <button
                      disabled={isBatchUpdating}
                      onClick={() => handleBatchUpdateAttendance('no_show')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all"
                    >
                      {isBatchUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Set No Show
                    </button>
                    <select
                      disabled={isBatchUpdating}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBatchUpdateLeadStatus(e.target.value);
                          e.target.value = ''; // reset dropdown
                        }
                      }}
                      className="px-2 py-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer focus:outline-none"
                    >
                      <option value="">Set Lead Status...</option>
                      <option value="white">WHITE</option>
                      <option value="yellow">YELLOW</option>
                      <option value="green">GREEN</option>
                      <option value="red">RED</option>
                    </select>
                    <button
                      disabled={isBatchUpdating}
                      onClick={() => setSelectedLeadIds([])}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold rounded-lg transition-all"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              )}

              {/* Leads Table */}
              {loadingLeads ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : leads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Eye className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No leads registered for this event</p>
                  <p className="text-xs text-slate-400 mt-1">Start by clicking "Add Lead" to register a contact.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500 cursor-pointer"
                            checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeadIds(leads.map(l => l.id));
                              } else {
                                setSelectedLeadIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Engagement</th>
                        <th className="py-3 px-4">Lead Status</th>
                        <th className="py-3 px-4">Attendance</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.map((l) => {
                        const statusColors: Record<string, string> = {
                          white: 'bg-slate-100 border-slate-200 text-slate-700',
                          yellow: 'bg-amber-50 border-amber-100 text-amber-700',
                          green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                          red: 'bg-red-50 border-red-100 text-red-700',
                        };

                        return (
                          <tr key={l.id} className="hover:bg-slate-50/30 transition-all">
                            <td className="py-3.5 px-4 w-10">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500 cursor-pointer"
                                checked={selectedLeadIds.includes(l.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLeadIds(prev => [...prev, l.id]);
                                  } else {
                                    setSelectedLeadIds(prev => prev.filter(id => id !== l.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {l.contact.firstName} {l.contact.lastName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {l.contact.company?.name || '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              {l.leadCategory === 'HOT' ? (
                                <span className="px-2 py-0.5 font-bold rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-[10px] uppercase">
                                  🔥 HOT
                                </span>
                              ) : l.leadCategory === 'WARM' ? (
                                <span className="px-2 py-0.5 font-bold rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-[10px] uppercase">
                                  ☀️ WARM
                                </span>
                              ) : l.leadCategory === 'COLD' ? (
                                <span className="px-2 py-0.5 font-bold rounded-md bg-sky-50 border border-sky-100 text-sky-700 text-[10px] uppercase">
                                  ❄️ COLD
                                </span>
                              ) : (
                                <span className="text-slate-400 font-semibold text-[10px]">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span title={`Call: ${l.callStatus || 'NOT_CONTACTED'}`}>
                                  <Phone 
                                    className={`w-3.5 h-3.5 ${l.callStatus === 'CONNECTED' ? 'text-sky-600 font-bold' : l.callStatus && l.callStatus !== 'NOT_CONTACTED' ? 'text-slate-600' : 'text-slate-300'}`} 
                                  />
                                </span>
                                <span title={`Email: ${l.emailStatus || 'NOT_SENT'}`}>
                                  <Mail 
                                    className={`w-3.5 h-3.5 ${l.emailStatus === 'OPENED' ? 'text-emerald-500 font-bold' : l.emailStatus === 'RESPONDED' ? 'text-indigo-600 font-bold' : l.emailStatus === 'SENT' ? 'text-amber-550' : 'text-slate-300'}`} 
                                  />
                                </span>
                                <span title={`WhatsApp: ${l.whatsappStatus || 'NOT_SENT'}`}>
                                  <MessageSquare 
                                    className={`w-3.5 h-3.5 ${l.whatsappStatus === 'RESPONDED' ? 'text-emerald-500 font-bold' : l.whatsappStatus === 'SENT' ? 'text-emerald-450' : 'text-slate-300'}`} 
                                  />
                                </span>
                                <span title={`Meeting: ${l.meetingStatus || 'NONE'}`}>
                                  <Calendar 
                                    className={`w-3.5 h-3.5 ${l.meetingStatus === 'CONFIRMED' ? 'text-purple-600 font-bold' : l.meetingStatus === 'SCHEDULED' ? 'text-indigo-500' : 'text-slate-300'}`} 
                                  />
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 font-bold rounded-md border uppercase ${statusColors[l.leadStatus] || statusColors.white}`}>
                                {l.leadStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-semibold capitalize">
                              {l.attendanceStatus}
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
                                  className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 hover:text-red-650 transition-all"
                                  title="Remove Participant"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <CalendarDays className="w-12 h-12 text-slate-400 mb-3" />
              <h4 className="font-bold text-slate-700">No Event Selected</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">Select an event from the left list to track and manage lead statuses.</p>
            </div>
          )}
        </div>
      </div>

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
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900 my-8">
            <button
              onClick={() => {
                setIsUpdateLeadModalOpen(false);
                setActiveLead(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-xl font-extrabold text-slate-900">Lead Detail & Qualification</h3>
              <p className="text-xs text-slate-500 mt-1">
                Manage contact: <strong className="text-slate-700">{activeLead.contact.firstName} {activeLead.contact.lastName}</strong> ({activeLead.contact.company?.name || 'No Company'})
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Qualification & Profile Info */}
              <div className="space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs space-y-2 mb-4">
                  <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-2">Profile Information</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-medium">Job Title:</span>
                      <p className="font-semibold text-slate-700 truncate">{activeLead.contact.jobTitle || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Industry:</span>
                      <p className="font-semibold text-slate-700 truncate">{activeLead.contact.company?.industry || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Mobile Phone:</span>
                      <p className="font-semibold text-slate-700 truncate">{activeLead.contact.mobilePhone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Email:</span>
                      <p className="font-semibold text-slate-700 truncate">{activeLead.contact.emails?.[0]?.email || '-'}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateLeadStatus} className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1">Phase 5 Lead Qualification</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Category (HOT/WARM/COLD)</label>
                      <select
                        value={updateLeadCategoryStr}
                        onChange={(e) => setUpdateLeadCategoryStr(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                      >
                        <option value="">Not Categorized</option>
                        <option value="HOT">🔥 HOT LEAD</option>
                        <option value="WARM">☀️ WARM LEAD</option>
                        <option value="COLD">❄️ COLD LEAD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Status (Phase 6)</label>
                      <select
                        value={updateMeetingStatusStr}
                        onChange={(e) => setUpdateMeetingStatusStr(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                      >
                        <option value="NONE">None</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="CONFIRMED">Confirmed Meeting</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmation Status (Color)</label>
                      <select
                        value={updateLeadStatusStr}
                        onChange={(e) => setUpdateLeadStatusStr(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                      >
                        <option value="white">White (No reply)</option>
                        <option value="yellow">Yellow (Tentative)</option>
                        <option value="green">Green (Confirmed)</option>
                        <option value="red">Red (Rejected)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Status</label>
                      <select
                        value={updateAttendanceStatusStr}
                        onChange={(e) => setUpdateAttendanceStatusStr(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                      >
                        <option value="invited">Invited</option>
                        <option value="registered">Registered</option>
                        <option value="attended">Attended</option>
                        <option value="no_show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Project Information / AI Evaluation</label>
                    <textarea
                      placeholder="Evaluating what AI solutions? Project active details..."
                      value={updateProjectInfoStr}
                      onChange={(e) => setUpdateProjectInfoStr(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Business Challenges</label>
                    <textarea
                      placeholder="What business problems or challenges are they facing?"
                      value={updateBusinessChallengesStr}
                      onChange={(e) => setUpdateBusinessChallengesStr(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Project Timeline</label>
                      <input
                        type="text"
                        placeholder="e.g. Next month, Q3 2026"
                        value={updateTimelineStr}
                        onChange={(e) => setUpdateTimelineStr(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Notes</label>
                    <textarea
                      placeholder="Details on status update..."
                      value={updateLeadNotes}
                      onChange={(e) => setUpdateLeadNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-xs placeholder-slate-400 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                    <button
                      type="submit"
                      disabled={submittingLeadUpdate}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {submittingLeadUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Save Qualification Info
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Outbound Engagement & History */}
              <div className="space-y-6 flex flex-col h-full">
                {/* Outbound Quick Channels */}
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 mb-3">Outbound Interaction Channels</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={triggerWhatsApp}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={triggerEmail}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email (Tracked)
                    </button>
                  </div>
                </div>

                {/* Log Manual Activity Form */}
                <form onSubmit={handleAddActivity} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-[10px]">Log Interaction manually</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Activity Type</label>
                      <select
                        value={newActivityType}
                        onChange={(e) => {
                          setNewActivityType(e.target.value);
                          if (e.target.value === 'CALL') setNewActivityStatus('CONNECTED');
                          else if (e.target.value === 'EMAIL') setNewActivityStatus('SENT');
                          else if (e.target.value === 'WHATSAPP') setNewActivityStatus('SENT');
                          else if (e.target.value === 'MEETING') setNewActivityStatus('CONFIRMED');
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 text-xs focus:outline-none"
                      >
                        <option value="CALL">Call</option>
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="MEETING">Meeting</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Status</label>
                      {newActivityType === 'CALL' ? (
                        <select
                          value={newActivityStatus}
                          onChange={(e) => setNewActivityStatus(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 text-xs focus:outline-none"
                        >
                          <option value="CONNECTED">Connected</option>
                          <option value="BUSY">Busy</option>
                          <option value="NO_ANSWER">No Answer</option>
                          <option value="LEFT_VM">Left Voicemail</option>
                        </select>
                      ) : newActivityType === 'EMAIL' ? (
                        <select
                          value={newActivityStatus}
                          onChange={(e) => setNewActivityStatus(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 text-xs focus:outline-none"
                        >
                          <option value="SENT">Sent</option>
                          <option value="OPENED">Opened</option>
                          <option value="RESPONDED">Responded</option>
                        </select>
                      ) : newActivityType === 'WHATSAPP' ? (
                        <select
                          value={newActivityStatus}
                          onChange={(e) => setNewActivityStatus(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 text-xs focus:outline-none"
                        >
                          <option value="SENT">Sent</option>
                          <option value="RESPONDED">Responded</option>
                        </select>
                      ) : (
                        <select
                          value={newActivityStatus}
                          onChange={(e) => setNewActivityStatus(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 text-xs focus:outline-none"
                        >
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="CONFIRMED">Confirmed Meeting</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Interaction Notes</label>
                    <textarea
                      placeholder="e.g. Contact interested but busy, ask to call back next Tuesday."
                      value={newActivityNotes}
                      onChange={(e) => setNewActivityNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded text-xs placeholder-slate-400 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoggingActivity}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold rounded flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isLoggingActivity ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Log Interaction
                    </button>
                  </div>
                </form>

                {/* Activity History Timeline */}
                <div className="flex-1 flex flex-col min-h-[180px]">
                  <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1 mb-3">Interaction History Log</h4>
                  
                  {loadingActivities ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 rounded-xl py-6 bg-slate-50/50">
                      <p className="text-xs text-slate-400 font-medium">No interaction logged yet.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3 pr-1">
                      {activities.map((act) => {
                        let typeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                        if (act.activityType === 'CALL') typeColor = 'bg-sky-50 text-sky-700 border-sky-100';
                        else if (act.activityType === 'EMAIL') typeColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                        else if (act.activityType === 'WHATSAPP') typeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                        else if (act.activityType === 'MEETING') typeColor = 'bg-purple-50 text-purple-700 border-purple-100';

                        return (
                          <div key={act.id} className="p-3 border border-slate-100 bg-white hover:bg-slate-50/50 rounded-xl text-xs transition-all relative">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 font-bold rounded border text-[9px] uppercase ${typeColor}`}>
                                {act.activityType}
                              </span>
                              <span className="px-1.5 py-0.2 bg-slate-50 border border-slate-150 text-[9px] rounded font-semibold text-slate-500 capitalize">
                                Status: {act.status}
                              </span>
                            </div>
                            {act.notes && (
                              <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">{act.notes}</p>
                            )}
                            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 font-mono">
                              <span>By: {act.createdBy || 'System'}</span>
                              <span>{act.createdAt ? new Date(act.createdAt).toLocaleString() : '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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

      {/* Campaign Performance Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900 my-8">
            <button
              onClick={() => {
                setIsReportModalOpen(false);
                setEventReport(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Campaign Performance Report
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Campaign KPI metrics & statistics for: <strong className="text-slate-700">{selectedEvent?.name}</strong>
              </p>
            </div>

            {loadingReport || !eventReport ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-bold text-slate-400">Calculating KPIs report...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Metrik Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Email Terkirim</span>
                    <span className="text-xl font-extrabold text-indigo-800">{eventReport.totalEmailSent}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Email Open Rate</span>
                    <span className="text-xl font-extrabold text-emerald-800">{eventReport.emailOpenRate.toFixed(1)}%</span>
                  </div>
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider">Call Connected</span>
                    <span className="text-xl font-extrabold text-sky-800">
                      {eventReport.connectedCalls}/{eventReport.totalCallsMade}
                    </span>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                    <span className="block text-[10px] font-bold text-purple-500 uppercase tracking-wider">Meetings Confirmed</span>
                    <span className="text-xl font-extrabold text-purple-800">{eventReport.meetingsSecured}</span>
                  </div>
                </div>

                {/* Grafis Recharts */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-[10px] mb-4">Qualification & Activity Funnel</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Emails Sent', count: eventReport.totalEmailSent, color: '#6366f1' },
                          { name: 'Emails Opened', count: Math.round(eventReport.totalEmailSent * (eventReport.emailOpenRate / 100)), color: '#10b981' },
                          { name: 'WA Sent', count: eventReport.whatsappSent, color: '#34d399' },
                          { name: 'Calls Made', count: eventReport.totalCallsMade, color: '#38bdf8' },
                          { name: 'Hot Leads', count: eventReport.hotLeads, color: '#f43f5e' },
                          { name: 'Warm Leads', count: eventReport.warmLeads, color: '#fb923c' },
                          { name: 'Meetings', count: eventReport.meetingsSecured, color: '#a855f7' }
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} stroke="#cbd5e1" />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} stroke="#cbd5e1" />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {[
                            '#6366f1',
                            '#10b981',
                            '#34d399',
                            '#38bdf8',
                            '#f43f5e',
                            '#fb923c',
                            '#a855f7'
                          ].map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <h5 className="font-bold text-slate-700 mb-1.5">Communication Conversion</h5>
                    <ul className="space-y-1 text-slate-600 font-medium">
                      <li>WhatsApp Response Rate: <strong>{eventReport.whatsappResponseRate.toFixed(1)}%</strong></li>
                      <li>Email Response Rate: <strong>{eventReport.emailResponseRate.toFixed(1)}%</strong></li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-700 mb-1.5">Lead Distribution</h5>
                    <ul className="space-y-1 text-slate-600 font-medium">
                      <li>Hot Leads: <strong className="text-rose-600">{eventReport.hotLeads}</strong></li>
                      <li>Warm Leads: <strong className="text-amber-500">{eventReport.warmLeads}</strong></li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportModalOpen(false);
                      setEventReport(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    Close Report
                  </button>
                </div>
              </div>
            )}
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

