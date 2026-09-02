'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { FlaggedIdentity, Database } from '../../../lib/types';
import { Plus, Search, Loader2, Edit2, Trash2, AlertTriangle, CheckCircle, RefreshCw, UserX, Eye, ShieldCheck, ShieldX, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { AddFlaggedModal } from './components/AddFlaggedModal';
import { EditFlaggedModal } from './components/EditFlaggedModal';
import { DeleteFlaggedConfirmModal } from './components/DeleteFlaggedConfirmModal';
import { FlaggedDetailModal } from './components/FlaggedDetailModal';

export default function FlaggedPage() {
  const { isAdmin, isManager, isUser } = useAuth();
  const [flags, setFlags] = useState<FlaggedIdentity[]>([]);
  const [allFlags, setAllFlags] = useState<FlaggedIdentity[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [flagReasonOptions, setFlagReasonOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFlagReason, setFilterFlagReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Selected for edit/delete/detail
  const [editingFlag, setEditingFlag] = useState<FlaggedIdentity | null>(null);
  const [deletingFlag, setDeletingFlag] = useState<FlaggedIdentity | null>(null);

  // Detail Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailFlag, setDetailFlag] = useState<FlaggedIdentity | null>(null);
  const [detailDatabase, setDetailDatabase] = useState<Database | null>(null);
  const [detailEmails, setDetailEmails] = useState<any[]>([]);
  const [detailEvents, setDetailEvents] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenDetail = async (flg: FlaggedIdentity, linkedDb?: Database) => {
    setDetailFlag(flg);
    setDetailDatabase(linkedDb || flg.database || null);
    setIsDetailModalOpen(true);

    const targetDb = linkedDb || flg.database;
    if (targetDb) {
      setLoadingDetail(true);
      try {
        const [emails, eventsList] = await Promise.all([
          crmService.getDatabaseEmails(targetDb.id),
          crmService.getDatabaseEventParticipants(targetDb.id)
        ]);
        setDetailEmails(emails);
        setDetailEvents(eventsList);
      } catch (err) {
        console.error('Failed to load database details', err);
      } finally {
        setLoadingDetail(false);
      }
    } else {
      setDetailEmails([]);
      setDetailEvents([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, filterStatus, filterFlagReason, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterFlagReason]);

  async function loadData() {
    setLoading(true);
    try {
      const [flagList, databaseList, filterOptions] = await Promise.all([
        crmService.getFlaggedIdentitiesList({
          search: searchQuery || undefined,
          status: filterStatus || undefined,
          flagReason: filterFlagReason || undefined,
          page: currentPage,
          size: pageSize
        }),
        crmService.getDatabases(),
        crmService.getFlaggedIdentitiesFilterOptions()
      ]);
      const allFlagItems = await crmService.getFlaggedIdentities().catch(() => flagList.items);
      setFlags(flagList.items);
      setAllFlags(allFlagItems);
      setTotalItems(flagList.total);
      setTotalPages(flagList.totalPages);
      setDatabases(databaseList);
      setStatusOptions(filterOptions.statuses || []);
      setFlagReasonOptions(filterOptions.flagReasons || []);
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

  const getPrimaryFlagInfo = (flag: FlaggedIdentity) => {
    const reason = flag.flagReason || '';
    if (reason === 'duplicate_phone') {
      return { label: 'Duplicate Phone', value: flag.phoneUsed || '-' };
    }
    if (reason === 'duplicate_email') {
      return { label: 'Duplicate Email', value: flag.emailUsed || '-' };
    }
    if (flag.emailUsed) {
      return { label: 'Email', value: flag.emailUsed };
    }
    if (flag.phoneUsed) {
      return { label: 'Phone', value: flag.phoneUsed };
    }
    return { label: 'Identity', value: flag.nameUsed || '-' };
  };

  const extractMatchedName = (notes?: string) => {
    const match = notes?.match(/matches database record\s+(.+?)\s+\(ID:/i);
    return match?.[1]?.trim() || '';
  };

  const startIndex = (currentPage - 1) * pageSize;
  const summaryFlags = allFlags.length > 0 ? allFlags : flags;
  const suspectedCount = summaryFlags.filter((flag) => flag.status === 'suspected').length;
  const confirmedCount = summaryFlags.filter((flag) => flag.status === 'confirmed').length;
  const clearedCount = summaryFlags.filter((flag) => flag.status === 'cleared').length;
  const summaryCards = [
    { label: 'Total Flagged', value: summaryFlags.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Suspected', value: suspectedCount, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Confirmed', value: confirmedCount, icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'Cleared', value: clearedCount, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
  ];
  const modalEvents = [
    ...flags
      .map((flag) => flag.event)
      .filter((event): event is NonNullable<FlaggedIdentity['event']> => Boolean(event?.id)),
    ...(editingFlag?.event ? [editingFlag.event] : [])
  ].filter((event, index, array) => array.findIndex((item) => item.id === event.id) === index);

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="rounded-2xl bg-white border border-blue-100 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </span>
              Flagged Identities
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">Monitor suspected and confirmed duplicate identities across events, phones, emails, and CRM records.</p>
          </div>
          {(isAdmin || isManager) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/15 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Flag New Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white border ${card.border} rounded-2xl p-4 shadow-sm`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-2xl font-black text-slate-950 mt-1">{card.value.toLocaleString()}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Control / Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-blue-100 p-3 rounded-2xl shadow-sm">
        <div className="flex items-center flex-1 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-blue-400 mr-2" />
          <input
            type="text"
            placeholder="Search name, email, phone, evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-blue-50/60 border border-blue-100 focus:border-blue-500 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none transition-all focus:bg-white"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === 'confirmed' ? 'Confirmed' : status === 'cleared' ? 'Cleared' : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={filterFlagReason}
          onChange={(e) => setFilterFlagReason(e.target.value)}
          className="px-3 py-2 bg-blue-50/60 border border-blue-100 focus:border-blue-500 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none transition-all focus:bg-white"
        >
          <option value="">All Reasons</option>
          {flagReasonOptions.map((reason) => (
            <option key={reason} value={reason}>
              {reason.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {(searchQuery || filterStatus || filterFlagReason) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('');
              setFilterFlagReason('');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* List content */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : flags.length === 0 ? (
        <div className="p-12 text-center border border-blue-100 rounded-2xl bg-white shadow-sm">
          <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No flagged identities found</h3>
          <p className="text-xs text-slate-500 mt-1">Database health is currently clear. No suspicious duplications are active.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {flags.map((flg) => {
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
              <div key={flg.id} className="p-4 bg-white border border-blue-100 rounded-2xl flex flex-col gap-3 relative overflow-hidden shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                
                {/* Badge & Top Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4
                      onClick={() => handleOpenDetail(flg, linkedDb)}
                      className="font-black text-slate-950 text-base hover:text-blue-600 cursor-pointer transition-colors truncate"
                    >
                      {flg.nameUsed || <span className="text-slate-400 italic">No Name Specified</span>}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      Linked Profile:{' '}
                      {linkedDb ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(flg, linkedDb)}
                          className="font-bold text-blue-600 hover:underline text-left"
                        >
                          {linkedDb.firstName} {linkedDb.lastName} {linkedDb.company?.name ? `(${linkedDb.company.name})` : ''}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">No direct link</span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider shrink-0 ${getRiskColor(flg.status)}`}>
                    {flg.status}
                  </span>
                </div>

                {/* Contextual Details */}
                {(() => {
                  const primaryInfo = getPrimaryFlagInfo(flg);
                  const matchedName = extractMatchedName(flg.evidenceNotes);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">{primaryInfo.label}</p>
                        <p className="text-slate-900 font-black truncate mt-1">{primaryInfo.value}</p>
                      </div>
                      {matchedName && (
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Matched With</p>
                          <p className="text-slate-900 font-black truncate mt-1">{matchedName}</p>
                        </div>
                      )}
                      {flg.event && (
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 min-w-0 sm:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Event</p>
                          <p className="text-slate-800 font-semibold truncate mt-1">{flg.event.name}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Evidence & Action Buttons */}
                <div className="space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Alert: {flg.flagReason?.replace(/_/g, ' ') || 'suspicious profile'}</span>
                    </div>
                    {flg.evidenceNotes && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 border border-slate-200 p-2 rounded-xl whitespace-pre-line">
                        "{flg.evidenceNotes}"
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                    <button
                      onClick={() => handleOpenDetail(flg, linkedDb)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      View Details
                    </button>

                    {(isAdmin || isManager) && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditingFlag(flg);
                            setIsEditModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
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

              </div>
            );
          })}
        </div>

        {/* Pagination Bar */}
        {flags.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-blue-100 p-3.5 rounded-2xl shadow-sm text-xs text-slate-600 font-medium">
            <div>
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
              <span className="font-bold text-slate-900">{totalItems}</span> entries
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-xl border border-blue-100 font-bold hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-slate-800">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-xl border border-blue-100 font-bold hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </>
    )}

      {/* Flag Manual Profile Modal */}
      <AddFlaggedModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        databases={databases}
        events={modalEvents}
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
          events={modalEvents}
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

      {/* Flagged Identity Detail Modal */}
      <FlaggedDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailFlag(null);
          setDetailDatabase(null);
        }}
        flag={detailFlag}
        database={detailDatabase}
        emails={detailEmails}
        events={detailEvents}
        loadingDetails={loadingDetail}
        onEdit={(flg) => {
          setEditingFlag(flg);
          setIsEditModalOpen(true);
        }}
      />
    </div>
  );
}
