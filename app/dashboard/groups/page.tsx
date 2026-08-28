'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Group, Company } from '../../../lib/types';
import { FolderTree, Search, Plus, Loader2, Edit2, Trash2, Building2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { AddGroupModal } from './components/AddGroupModal';
import { EditGroupModal } from './components/EditGroupModal';
import { DeleteGroupConfirmModal } from './components/DeleteGroupConfirmModal';
import { GroupDetailModal } from './components/GroupDetailModal';

export default function GroupsPage() {
  const router = useRouter();
  const { isAdmin, isManager, isUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [detailCompanies, setDetailCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Reset current page when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    loadGroups();
  }, [searchQuery, currentPage, sortBy, sortOrder]);

  async function loadGroups() {
    setLoading(true);
    try {
      const groupsData = await crmService.getGroupsList({
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        size: itemsPerPage
      });
      setGroups(groupsData.items);
      setTotalItems(groupsData.total);
      setTotalPages(groupsData.totalPages);
    } catch (err) {
      toast.error('Failed to load groups data');
    } finally {
      setLoading(false);
    }
  }

  async function openGroupDetail(group: Group) {
    setDetailGroup(group);
    setDetailCompanies([]);
    setIsDetailModalOpen(true);
    try {
      const companiesData = await crmService.getCompaniesList({
        groupId: String(group.id),
        page: 1,
        size: 100
      });
      setDetailCompanies(companiesData.items);
    } catch {
      setDetailCompanies([]);
    }
  }

  const handleCreateGroup = async (data: { name: string; notes?: string }) => {
    setSubmitting(true);
    try {
      await crmService.createGroup(data);
      toast.success('Group created successfully!');
      setIsModalOpen(false);
      loadGroups(); // Reload list
    } catch (err: any) {
      toast.error(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGroup = async (data: { name: string; notes?: string }) => {
    if (!editingGroup) return;
    setSubmitting(true);
    try {
      await crmService.updateGroup(editingGroup.id, data);
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = groups;

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
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="flex items-center flex-1 max-w-md bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search groups by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Sort Order Dropdown */}
        <div className="w-full sm:w-56">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [b, o] = e.target.value.split('-');
              setSortBy(b);
              setSortOrder(o as 'asc' | 'desc');
            }}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            <option value="id-asc">Urutkan: ID Terlama</option>
            <option value="id-desc">Urutkan: ID Terbaru</option>
            <option value="name-asc">Urutkan: Nama Group (A-Z)</option>
            <option value="name-desc">Urutkan: Nama Group (Z-A)</option>
            <option value="companies-desc">Urutkan: Perusahaan (Terbanyak)</option>
            <option value="companies-asc">Urutkan: Perusahaan (Tersedikit)</option>
            <option value="created_at-desc">Urutkan: Tanggal Dibuat (Terbaru)</option>
            <option value="created_at-asc">Urutkan: Tanggal Dibuat (Terlama)</option>
          </select>
        </div>

        {(sortBy !== 'id' || sortOrder !== 'asc') && (
          <button
            onClick={() => {
              setSortBy('id');
              setSortOrder('asc');
            }}
            className="px-3.5 py-2.5 text-xs font-bold text-red-650 hover:text-red-500 bg-red-50 hover:bg-red-100/55 rounded-xl border border-red-200 transition-all self-start sm:self-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Groups List Table */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : groups.length === 0 ? (
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
                <tr className="border-b border-slate-200 bg-slate-50/50 text-left">
                  <th onClick={() => handleSort('name')} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-all">
                    <div className="flex items-center gap-1.5">
                      <span>Group Name</span>
                      {sortBy === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('companies')} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-all">
                    <div className="flex items-center gap-1.5">
                      <span>Group Company</span>
                      {sortBy === 'companies' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                  <th onClick={() => handleSort('created_at')} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-all">
                    <div className="flex items-center gap-1.5">
                      <span>Created At</span>
                      {sortBy === 'created_at' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentGroups.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => openGroupDetail(g)}
                    className="hover:bg-slate-50/80 transition-all cursor-pointer group/row"
                  >
                    <td className="py-4 px-6 text-sm font-bold text-slate-900 group-hover/row:text-blue-600 transition-colors">{g.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-50 border border-blue-100 text-blue-600 rounded-lg">
                        <Building2 className="w-3.5 h-3.5" />
                        {g.companyCount || 0} Companies
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
                        {!isUser && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroup(g);
                              setIsEditModalOpen(true);
                            }}
                            className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                            title="Edit Group"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setDeletingGroup(g);
                               setIsDeleteConfirmOpen(true);
                             }}
                             className="inline-flex p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-55 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
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
          {/* Integrated Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4">
              {/* Left Side: Info */}
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-500">
                  Showing <span className="font-extrabold text-slate-800">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-extrabold text-slate-800">
                    {Math.min(indexOfLastItem, totalItems)}
                  </span>{' '}
                  of <span className="font-extrabold text-slate-800">{totalItems}</span> groups
                </p>
              </div>

              {/* Right Side: Flat Controls */}
              <div className="flex flex-1 sm:flex-initial items-center justify-between sm:justify-end gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNumber = i + 1;
                    if (totalPages > 6 && Math.abs(currentPage - pageNumber) > 2 && pageNumber !== 1 && pageNumber !== totalPages) {
                      if (pageNumber === 2 || pageNumber === totalPages - 1) {
                        return <span key={pageNumber} className="text-xs font-bold text-slate-400 px-1">...</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`min-w-[28px] h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Group Modal Overlay */}
      <AddGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGroup}
        submitting={submitting}
      />

      {/* Edit Group Modal Overlay */}
      {editingGroup && (
        <EditGroupModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingGroup(null);
          }}
          group={editingGroup}
          onSubmit={handleUpdateGroup}
          submitting={submitting}
        />
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deletingGroup && (
        <DeleteGroupConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletingGroup(null);
          }}
          group={deletingGroup}
          onConfirm={handleDeleteGroup}
          submitting={submitting}
        />
      )}

      {/* Detail Modal Overlay */}
      {detailGroup && (
        <GroupDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setDetailGroup(null);
          }}
          group={detailGroup}
          companies={detailCompanies}
          onGoToCompanyDetails={(companyName) => {
            router.push(`/dashboard/companies?search=${encodeURIComponent(companyName)}`);
          }}
        />
      )}
    </div>
  );
}

