'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { FlaggedIdentity, Contact, Event } from '../../../lib/types';
import { ShieldAlert, Plus, Search, X, Loader2, Edit2, Trash2, AlertTriangle, CheckCircle, RefreshCw, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';

export default function FlaggedPage() {
  const { isAdmin, isManager, isUser } = useAuth();
  const [flags, setFlags] = useState<FlaggedIdentity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form states for Create
  const [nameUsed, setNameUsed] = useState('');
  const [emailUsed, setEmailUsed] = useState('');
  const [phoneUsed, setPhoneUsed] = useState('');
  const [flagReason, setFlagReason] = useState('multiple_identity');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [status, setStatus] = useState('suspected');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states for Edit
  const [editingFlag, setEditingFlag] = useState<FlaggedIdentity | null>(null);
  const [editNameUsed, setEditNameUsed] = useState('');
  const [editEmailUsed, setEditEmailUsed] = useState('');
  const [editPhoneUsed, setEditPhoneUsed] = useState('');
  const [editFlagReason, setEditFlagReason] = useState('multiple_identity');
  const [editEvidenceNotes, setEditEvidenceNotes] = useState('');
  const [editStatus, setEditStatus] = useState('suspected');
  const [editSelectedContactId, setEditSelectedContactId] = useState('');
  const [editSelectedEventId, setEditSelectedEventId] = useState('');

  // Delete state
  const [deletingFlag, setDeletingFlag] = useState<FlaggedIdentity | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [flagList, contactList, eventList] = await Promise.all([
        crmService.getFlaggedIdentities(),
        crmService.getContacts(),
        crmService.getEvents()
      ]);
      setFlags(flagList);
      setContacts(contactList);
      setEvents(eventList);
    } catch (err) {
      toast.error('Failed to load flagged data');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameUsed.trim() && !emailUsed.trim() && !phoneUsed.trim()) {
      toast.error('At least one of Name, Email, or Phone is required');
      return;
    }

    setSubmitting(true);
    try {
      const contactObj = selectedContactId ? { id: selectedContactId } : null;
      const eventObj = selectedEventId ? { id: selectedEventId } : null;

      await crmService.createFlaggedIdentity({
        nameUsed: nameUsed.trim() || undefined,
        emailUsed: emailUsed.trim() || undefined,
        phoneUsed: phoneUsed.trim() || undefined,
        flagReason,
        evidenceNotes: evidenceNotes.trim() || undefined,
        status,
        contact: contactObj as any,
        event: eventObj as any
      });

      toast.success('Suspicious profile flagged successfully.');
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create flagged entry');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNameUsed('');
    setEmailUsed('');
    setPhoneUsed('');
    setFlagReason('multiple_identity');
    setEvidenceNotes('');
    setStatus('suspected');
    setSelectedContactId('');
    setSelectedEventId('');
  };

  const openEditModal = (flg: FlaggedIdentity) => {
    setEditingFlag(flg);
    setEditNameUsed(flg.nameUsed || '');
    setEditEmailUsed(flg.emailUsed || '');
    setEditPhoneUsed(flg.phoneUsed || '');
    setEditFlagReason(flg.flagReason || 'multiple_identity');
    setEditEvidenceNotes(flg.evidenceNotes || '');
    setEditStatus(flg.status || 'suspected');
    setEditSelectedContactId(flg.contact?.id?.toString() || '');
    setEditSelectedEventId(flg.event?.id?.toString() || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlag) return;

    setSubmitting(true);
    try {
      const contactObj = editSelectedContactId ? { id: editSelectedContactId } : null;
      const eventObj = editSelectedEventId ? { id: editSelectedEventId } : null;

      await crmService.updateFlaggedIdentity(editingFlag.id, {
        nameUsed: editNameUsed.trim() || undefined,
        emailUsed: editEmailUsed.trim() || undefined,
        phoneUsed: editPhoneUsed.trim() || undefined,
        flagReason: editFlagReason,
        evidenceNotes: editEvidenceNotes.trim() || undefined,
        status: editStatus,
        contact: contactObj as any,
        event: eventObj as any
      });

      toast.success('Flagged identity details updated.');
      setIsEditModalOpen(false);
      setEditingFlag(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update flagged details');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteConfirm = (flg: FlaggedIdentity) => {
    setDeletingFlag(flg);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteFlag = async () => {
    if (!deletingFlag) return;
    setSubmitting(true);
    try {
      await crmService.deleteFlaggedIdentity(deletingFlag.id);
      toast.success('Identity removed from spam list.');
      setIsDeleteConfirmOpen(false);
      setDeletingFlag(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete flagged identity');
    } finally {
      setSubmitting(false);
    }
  };

  // Risk colors helper
  const getRiskColor = (st: string) => {
    switch (st) {
      case 'confirmed':
        return 'bg-red-50 border border-red-100 text-red-600';
      case 'suspected':
        return 'bg-amber-50 border border-amber-100 text-amber-600';
      case 'cleared':
        return 'bg-emerald-50 border border-emerald-100 text-emerald-600';
      default:
        return 'bg-slate-100 border border-slate-200 text-slate-500';
    }
  };

  // Filtering logic
  const filteredFlags = flags.filter((f) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      (f.nameUsed && f.nameUsed.toLowerCase().includes(query)) ||
      (f.emailUsed && f.emailUsed.toLowerCase().includes(query)) ||
      (f.phoneUsed && f.phoneUsed.includes(query)) ||
      (f.flagReason && f.flagReason.toLowerCase().includes(query)) ||
      (f.evidenceNotes && f.evidenceNotes.toLowerCase().includes(query));

    const matchesStatus = !filterStatus || f.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-600" />
            Flagged Identities ("Tikus" Directory)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Audit and manage flagged fraudulent attendees, fake company representations, and phone/email duplications.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-550 active:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/10 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Flag New Profile
          </button>
        )}
      </div>

      {/* Control / Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        <div className="flex items-center flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name, email, phone, evidence notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
        >
          <option value="">All Statuses</option>
          <option value="suspected">Suspected</option>
          <option value="confirmed">Confirmed (Tikus)</option>
          <option value="cleared">Cleared (Legitimate)</option>
        </select>

        {(searchQuery || filterStatus) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* List content */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      ) : filteredFlags.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm">
          <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No flagged identities found</h3>
          <p className="text-xs text-slate-500 mt-1">Database health is currently clear. No suspicious duplications are active.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFlags.map((flg) => (
            <div key={flg.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-3 relative overflow-hidden shadow-sm hover:border-slate-300 transition-all">
              
              {/* Badge & Top Row */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{flg.nameUsed || <span className="text-slate-400 italic">No Name Specified</span>}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Linked Profile: {flg.contact ? `${flg.contact.firstName} ${flg.contact.lastName}` : 'No direct link'}</p>
                </div>
                <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded-full uppercase tracking-wider ${getRiskColor(flg.status)}`}>
                  {flg.status}
                </span>
              </div>

              {/* Duplicate Details */}
              <div className="space-y-1 text-xs border-y border-slate-100 py-2 font-mono bg-slate-50/50 -mx-3.5 px-3.5">
                <p className="text-slate-700 truncate">
                  <span className="text-slate-400 font-sans font-semibold inline-block w-10">Email:</span> {flg.emailUsed || '-'}
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-400 font-sans font-semibold inline-block w-10">Phone:</span> {flg.phoneUsed || '-'}
                </p>
                {flg.event && (
                  <p className="text-slate-700 truncate">
                    <span className="text-slate-400 font-sans font-semibold inline-block w-10">Event:</span> {flg.event.name}
                  </p>
                )}
              </div>

              {/* Evidence & Action Buttons */}
              <div className="space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-red-600 font-bold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span>Alert: {flg.flagReason?.replace(/_/g, ' ') || 'suspicious profile'}</span>
                  </div>
                  {flg.evidenceNotes && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 border border-slate-200 p-2 rounded-xl whitespace-pre-line">
                      "{flg.evidenceNotes}"
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 mt-1">
                    <button
                      onClick={() => openEditModal(flg)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Status
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(flg)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Flag Manual Profile Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Flag Suspected Identity</h3>

            <form onSubmit={handleCreateFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Name Used</label>
                <input
                  type="text"
                  placeholder="e.g. Joseph W"
                  value={nameUsed}
                  onChange={(e) => setNameUsed(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Used</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={emailUsed}
                    onChange={(e) => setEmailUsed(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Used</label>
                  <input
                    type="text"
                    placeholder="0812..."
                    value={phoneUsed}
                    onChange={(e) => setPhoneUsed(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Flag Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="suspected">Suspected</option>
                    <option value="confirmed">Confirmed (Tikus)</option>
                    <option value="cleared">Cleared (Legitimate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alert Reason</label>
                  <select
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="multiple_identity">Multiple Identity</option>
                    <option value="fake_company">Fake Company Name</option>
                    <option value="no_corporate_email">No Corporate Email Address</option>
                    <option value="duplicate_phone">Duplicate Phone Number</option>
                    <option value="duplicate_email">Duplicate Email Address</option>
                    <option value="suspicious_repeated_attendance">Repeated Attendance Warning</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Contact (Optional)</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-[10px] focus:outline-none focus:bg-white"
                  >
                    <option value="">-- No linked contact --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} {c.company?.name ? `(${c.company.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Event (Optional)</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-[10px] focus:outline-none focus:bg-white"
                  >
                    <option value="">-- No linked event --</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Evidence Description</label>
                <textarea
                  placeholder="Explain why this profile is flagged..."
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs placeholder-slate-400 focus:outline-none resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Flag Identity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Flagged Identity Modal */}
      {isEditModalOpen && editingFlag && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingFlag(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Edit Flagged Details</h3>

            <form onSubmit={handleUpdateFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Name Used</label>
                <input
                  type="text"
                  placeholder="e.g. Joseph W"
                  value={editNameUsed}
                  onChange={(e) => setEditNameUsed(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Used</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={editEmailUsed}
                    onChange={(e) => setEditEmailUsed(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Used</label>
                  <input
                    type="text"
                    placeholder="0812..."
                    value={editPhoneUsed}
                    onChange={(e) => setEditPhoneUsed(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Flag Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="suspected">Suspected</option>
                    <option value="confirmed">Confirmed (Tikus)</option>
                    <option value="cleared">Cleared (Legitimate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alert Reason</label>
                  <select
                    value={editFlagReason}
                    onChange={(e) => setEditFlagReason(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="multiple_identity">Multiple Identity</option>
                    <option value="fake_company">Fake Company Name</option>
                    <option value="no_corporate_email">No Corporate Email Address</option>
                    <option value="duplicate_phone">Duplicate Phone Number</option>
                    <option value="duplicate_email">Duplicate Email Address</option>
                    <option value="suspicious_repeated_attendance">Repeated Attendance Warning</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Contact (Optional)</label>
                  <select
                    value={editSelectedContactId}
                    onChange={(e) => setEditSelectedContactId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-[10px] focus:outline-none focus:bg-white"
                  >
                    <option value="">-- No linked contact --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} {c.company?.name ? `(${c.company.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Event (Optional)</label>
                  <select
                    value={editSelectedEventId}
                    onChange={(e) => setEditSelectedEventId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-[10px] focus:outline-none focus:bg-white"
                  >
                    <option value="">-- No linked event --</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Evidence Description</label>
                <textarea
                  placeholder="Explain why this profile is flagged..."
                  value={editEvidenceNotes}
                  onChange={(e) => setEditEvidenceNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs placeholder-slate-400 focus:outline-none resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingFlag(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {isDeleteConfirmOpen && deletingFlag && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Flagged Identity</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to permanently clear/remove flagged entry <span className="font-semibold text-slate-800">"{deletingFlag.nameUsed || 'this item'}"</span>? 
              This will completely delete this record from the flagged tikus database list. This action is irreversible.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingFlag(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFlag}
                disabled={submitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

