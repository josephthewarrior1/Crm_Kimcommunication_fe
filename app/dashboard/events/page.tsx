'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Event, EventLead, Contact } from '../../../lib/types';
import { CalendarDays, Plus, Search, X, Loader2, UserPlus, Eye, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Event & Leads state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

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
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
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

  const handleOpenUpdateLeadModal = (lead: EventLead) => {
    setActiveLead(lead);
    setUpdateLeadStatusStr(lead.leadStatus);
    setUpdateAttendanceStatusStr(lead.attendanceStatus);
    setUpdateLeadNotes(lead.notes || '');
    setIsUpdateLeadModalOpen(true);
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
        updateLeadNotes.trim() || undefined
      );

      toast.success('Lead status updated successfully!');
      setIsUpdateLeadModalOpen(false);
      setActiveLead(null);
      
      // Reload leads
      handleSelectEvent(selectedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead status');
    } finally {
      setSubmittingLeadUpdate(false);
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
        <button
          onClick={() => setIsCreateEventModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
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
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-500/50 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900 truncate">{evt.name}</p>
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
                  <button
                    onClick={() => openEditEventModal(selectedEvent)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteEventConfirm(selectedEvent)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={() => setIsAddLeadModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Lead
                  </button>
                </div>
              </div>

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
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Company</th>
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
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {l.contact.firstName} {l.contact.lastName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {l.contact.company?.name || '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 font-bold rounded-md border uppercase ${statusColors[l.leadStatus] || statusColors.white}`}>
                                {l.leadStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-semibold capitalize">
                              {l.attendanceStatus}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 max-w-[150px] truncate" title={l.notes}>
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
                              <button
                                onClick={() => openDeleteLeadConfirm(l)}
                                className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 hover:text-red-650 transition-all"
                                title="Remove Participant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* Update Lead Status Modal Overlay */}
      {isUpdateLeadModalOpen && activeLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <button
              onClick={() => setIsUpdateLeadModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Update Lead Status</h3>
            <p className="text-xs text-slate-500 mb-4">
              Updating status for: <strong>{activeLead.contact.firstName} {activeLead.contact.lastName}</strong>
            </p>

            <form onSubmit={handleUpdateLeadStatus} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmation Status</label>
                  <select
                    value={updateLeadStatusStr}
                    onChange={(e) => setUpdateLeadStatusStr(e.target.value)}
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
                    value={updateAttendanceStatusStr}
                    onChange={(e) => setUpdateAttendanceStatusStr(e.target.value)}
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Follow-up Notes</label>
                <textarea
                  placeholder="Details on status update..."
                  value={updateLeadNotes}
                  onChange={(e) => setUpdateLeadNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsUpdateLeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeadUpdate}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingLeadUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Update Status
                </button>
              </div>
            </form>
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

