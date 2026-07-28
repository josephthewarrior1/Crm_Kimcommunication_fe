'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { FlaggedIdentity, Database, Event } from '../../../lib/types';
import { Plus, Search, Loader2, Edit2, Trash2, AlertTriangle, CheckCircle, RefreshCw, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { AddFlaggedModal } from './components/AddFlaggedModal';
import { EditFlaggedModal } from './components/EditFlaggedModal';
import { DeleteFlaggedConfirmModal } from './components/DeleteFlaggedConfirmModal';

export default function FlaggedPage() {
  const { isAdmin, isManager, isUser } = useAuth();
  const [flags, setFlags] = useState<FlaggedIdentity[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Selected for edit/delete
  const [editingFlag, setEditingFlag] = useState<FlaggedIdentity | null>(null);
  const [deletingFlag, setDeletingFlag] = useState<FlaggedIdentity | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [flagList, databaseList, eventList] = await Promise.all([
        crmService.getFlaggedIdentities(),
        crmService.getDatabases(),
        crmService.getEvents()
      ]);
      setFlags(flagList);
      setDatabases(databaseList);
      setEvents(eventList);
    } catch (err) {
      toast.error('Failed to load flagged data');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateFlag = async (data: any) => {
    if (!data.nameUsed && !data.emailUsed && !data.phoneUsed) {
      toast.error('At least one of Name, Email, or Phone is required');
      return;
    }
    setSubmitting(true);
    try {
      await crmService.createFlaggedIdentity(data);
      toast.success('Suspicious profile flagged successfully.');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create flagged entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFlag = async (data: any) => {
    if (!editingFlag) return;
    setSubmitting(true);
    try {
      await crmService.updateFlaggedIdentity(editingFlag.id, data);
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
              {(() => {
                const linkedDb = flg.database || databases.find(db => {
                  if (flg.phoneUsed && db.mobilePhone) {
                    const fDigits = flg.phoneUsed.replace(/[^0-9]/g, '').replace(/^62|^0/, '');
                    const dbDigits = db.mobilePhone.replace(/[^0-9]/g, '').replace(/^62|^0/, '');
                    if (fDigits && fDigits === dbDigits) return true;
                  }
                  if (flg.emailUsed && db.emails) {
                    const fEmail = flg.emailUsed.trim().toLowerCase();
                    if (db.emails.some(e => e.email && e.email.trim().toLowerCase() === fEmail)) return true;
                  }
                  return false;
                });

                return (
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{flg.nameUsed || <span className="text-slate-400 italic">No Name Specified</span>}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Linked Profile:{' '}
                        {linkedDb ? (
                          <span className="font-bold text-blue-600">
                            {linkedDb.firstName} {linkedDb.lastName} {linkedDb.company?.name ? `(${linkedDb.company.name})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No direct link</span>
                        )}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded-full uppercase tracking-wider ${getRiskColor(flg.status)}`}>
                      {flg.status}
                    </span>
                  </div>
                );
              })()}

              {/* Duplicate Details */}
              <div className="space-y-1 text-xs border-y border-slate-100 py-2 font-mono bg-slate-50/50 -mx-3.5 px-3.5">
                <p className="text-slate-700 truncate">
                  <span className="text-slate-400 font-semibold inline-block w-10">Email:</span> {flg.emailUsed || '-'}
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-400 font-semibold inline-block w-10">Phone:</span> {flg.phoneUsed || '-'}
                </p>
                {flg.event && (
                  <p className="text-slate-700 truncate">
                    <span className="text-slate-400 font-semibold inline-block w-10">Event:</span> {flg.event.name}
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
                      onClick={() => {
                        setEditingFlag(flg);
                        setIsEditModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Status
                    </button>
                    <button
                      onClick={() => {
                        setDeletingFlag(flg);
                        setIsDeleteConfirmOpen(true);
                      }}
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
      <AddFlaggedModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        databases={databases}
        events={events}
        onSubmit={handleCreateFlag}
        submitting={submitting}
      />

      {/* Edit Flagged Identity Modal */}
      {editingFlag && (
        <EditFlaggedModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingFlag(null);
          }}
          databases={databases}
          events={events}
          flag={editingFlag}
          onSubmit={handleUpdateFlag}
          submitting={submitting}
        />
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deletingFlag && (
        <DeleteFlaggedConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletingFlag(null);
          }}
          flag={deletingFlag}
          onConfirm={handleDeleteFlag}
          submitting={submitting}
        />
      )}
    </div>
  );
}
