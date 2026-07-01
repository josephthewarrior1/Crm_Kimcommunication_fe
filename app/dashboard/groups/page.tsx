'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Group, Company } from '../../../lib/types';
import { FolderTree, Search, Plus, X, Loader2, Edit2, Trash2, Eye, Building2, Globe, MapPin, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function GroupsPage() {
  const router = useRouter();
  const { isAdmin, isManager, isUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupNotes, setNewGroupNotes] = useState('');
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupNotes, setEditGroupNotes] = useState('');

  // Delete Confirm State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    try {
      const [groupsData, companiesData] = await Promise.all([
        crmService.getGroups(),
        crmService.getCompanies()
      ]);
      setGroups(groupsData);
      setCompanies(companiesData);
    } catch (err) {
      toast.error('Failed to load groups or companies data');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSubmitting(true);
    try {
      await crmService.createGroup({
        name: newGroupName.trim(),
        notes: newGroupNotes.trim() || undefined
      });
      toast.success('Group created successfully!');
      setNewGroupName('');
      setNewGroupNotes('');
      setIsModalOpen(false);
      loadGroups(); // Reload list
    } catch (err: any) {
      toast.error(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupNotes(group.notes || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    if (!editGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSubmitting(true);
    try {
      await crmService.updateGroup(editingGroup.id, {
        name: editGroupName.trim(),
        notes: editGroupNotes.trim() || undefined
      });
      toast.success('Group updated successfully!');
      setIsEditModalOpen(false);
      setEditingGroup(null);
      loadGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update group');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteConfirm = (group: Group) => {
    setDeletingGroup(group);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    setSubmitting(true);
    try {
      await crmService.deleteGroup(deletingGroup.id);
      toast.success('Group deleted successfully!');
      setIsDeleteConfirmOpen(false);
      setDeletingGroup(null);
      loadGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete group');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter groups based on search
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Groups (Holding Companies)</h2>
          <p className="text-sm text-slate-500 mt-1">Manage holding organizations and conglomerate groups.</p>
        </div>
        {!isUser && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Group
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex items-center max-w-md bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 mr-2" />
        <input
          type="text"
          placeholder="Search groups by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Groups List Table */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm">
          <FolderTree className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No groups found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? 'Try adjusting your search keywords.' : 'Get started by creating your first group.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Group Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Subsidiaries</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Created At</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">{g.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-50 border border-blue-100 text-blue-600 rounded-lg">
                        <Building2 className="w-3.5 h-3.5" />
                        {companies.filter(c => c.group?.id === g.id).length} Companies
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 max-w-sm truncate">
                      {g.notes || '-'}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-sm text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setDetailGroup(g);
                            setIsDetailModalOpen(true);
                          }}
                          className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                          title="View Group Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isUser && (
                          <button
                            onClick={() => openEditModal(g)}
                            className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                            title="Edit Group"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => openDeleteConfirm(g)}
                            className="inline-flex p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                            title="Delete Group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Group Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Create New Group</h3>

            <form onSubmit={handleCreateGroup} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Astra Group"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  placeholder="Additional descriptions..."
                  value={newGroupNotes}
                  onChange={(e) => setNewGroupNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal Overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingGroup(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Edit Group</h3>

            <form onSubmit={handleUpdateGroup} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Astra Group"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  placeholder="Additional descriptions..."
                  value={editGroupNotes}
                  onChange={(e) => setEditGroupNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Holding Group</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete the group <span className="font-semibold text-slate-800">"{deletingGroup?.name}"</span>? 
              This action cannot be undone. Associated companies will have their group references removed (nullified).
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingGroup(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
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

      {/* Detail Modal Overlay */}
      {isDetailModalOpen && detailGroup && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsDetailModalOpen(false);
                setDetailGroup(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-blue-600">
              <FolderTree className="w-6 h-6" />
              <h3 className="text-xl font-extrabold text-slate-900">Holding Group Details</h3>
            </div>

            <div className="space-y-6">
              {/* Group Metadata */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-[10px]">Group Name</h4>
                  <p className="text-base font-extrabold text-slate-800 mt-0.5">{detailGroup.name}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-[10px]">Notes / Descriptions</h4>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                    {detailGroup.notes || <span className="text-slate-400 italic">No notes written.</span>}
                  </p>
                </div>
              </div>

              {/* Subsidiaries List */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-[10px]">
                  Anak Perusahaan (Subsidiaries)
                </h4>
                
                {(() => {
                  const groupSubsidiaries = companies.filter(c => c.group?.id === detailGroup.id);
                  if (groupSubsidiaries.length === 0) {
                    return (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-semibold">No subsidiaries linked to this group yet.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                      {groupSubsidiaries.map((company) => (
                        <div key={company.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                          <div className="space-y-1">
                            <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-450" />
                              {company.name}
                            </h5>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                              {company.brandName && (
                                <span className="font-semibold text-blue-600">Brand: {company.brandName}</span>
                              )}
                              {company.brandName && <span className="text-slate-300">•</span>}
                              {company.city && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {company.city}
                                </span>
                              )}
                              {company.website && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <a 
                                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-0.5 text-blue-650 hover:text-blue-500 font-medium"
                                  >
                                    <Globe className="w-3.5 h-3.5" />
                                    Website
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              router.push(`/dashboard/companies?search=${encodeURIComponent(company.name)}`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg border border-blue-100 transition-all cursor-pointer shadow-sm"
                          >
                            <span>Go to Details</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setDetailGroup(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
                >
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

