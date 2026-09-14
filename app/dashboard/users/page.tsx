'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { authService } from '../../../lib/services/authService';
import { AppUser } from '../../../lib/types';
import { useAuth } from '../../../lib/context/AuthContext';
import { Users, Loader2, Trash2, Shield, ShieldCheck, UserPlus, AlertCircle, CalendarDays, Edit3, Columns, Search, ArrowRight, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { getUserAllowedEventIds } from '../../../lib/utils/viewerAccessHelper';
import { toast } from 'sonner';
import { AddUserModal } from './components/AddUserModal';
import { EditUserModal } from './components/EditUserModal';
import { DeleteUserConfirmModal } from './components/DeleteUserConfirmModal';
import { ManageViewerEventsModal } from './components/ManageViewerEventsModal';
import { ManageUserColumnsModal } from './components/ManageUserColumnsModal';

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const usersRequest = useRef(0);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);

  const [managingViewerEventsUser, setManagingViewerEventsUser] = useState<AppUser | null>(null);
  const [managingColumnsUser, setManagingColumnsUser] = useState<AppUser | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    const requestId = ++usersRequest.current;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await crmService.getUsersList({
        search: searchQuery || undefined,
        role: filterRole !== 'ALL' ? filterRole : undefined,
        page: currentPage,
        size: itemsPerPage
      });
      if (requestId !== usersRequest.current) return;
      setUsers(data.items);
      setTotalItems(data.total);
      setTotalPages(Math.max(1, data.totalPages));
    } catch {
      if (requestId !== usersRequest.current) return;
      setLoadError(true);
      setUsers([]);
    } finally {
      if (requestId === usersRequest.current) setLoading(false);
    }
  }, [isAdmin, searchQuery, filterRole, currentPage]);

  useEffect(() => {
    void loadUsers();
    return () => { usersRequest.current += 1; };
  }, [loadUsers]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setSubmittingId(userId);
    try {
      await crmService.updateUserRole(userId, newRole);
      toast.success('User role updated successfully');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role');
    } finally {
      setSubmittingId(null);
    }
  };

  const openDeleteConfirm = (targetUser: AppUser) => {
    if (currentUser?.id === targetUser.id) {
      toast.error('You cannot delete your own account.');
      return;
    }
    setDeletingUser(targetUser);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setSubmittingId(deletingUser.id);
    try {
      await crmService.deleteUser(deletingUser.id);
      toast.success(`Account for "${deletingUser.username}" has been deleted.`);
      setIsDeleteConfirmOpen(false);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user account');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCreateUserSubmit = async (data: {
    username: string;
    email: string;
    fullName: string;
    password: string;
    role: string;
  }) => {
    setCreateLoading(true);
    try {
      await authService.register({
        username: data.username,
        email: data.email,
        fullName: data.fullName || undefined,
        password: data.password,
        roles: [data.role]
      });

      toast.success(`User account for "${data.username}" created successfully!`);
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user account.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUserSubmit = async (id: number, data: { username: string; fullName: string; email: string; password?: string }) => {
    setEditLoading(true);
    try {
      await crmService.updateUserProfile(id, {
        username: data.username,
        fullName: data.fullName,
        email: data.email
      });
      if (data.password) {
        await crmService.updateUserPassword(id, data.password);
      }
      toast.success('User details updated successfully');
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user profile');
    } finally {
      setEditLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Shield aria-hidden="true" className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-semibold text-slate-900">Akses terbatas</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Halaman User Management hanya dapat diakses oleh admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Users aria-hidden="true" className="h-4 w-4" />Workspace / Anggota & akses
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">User Management</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Kelola anggota tim, peran, dan event yang mereka tangani.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:self-auto"
        >
          <UserPlus aria-hidden="true" className="h-4 w-4" />Tambah user
        </button>
      </div>

      <section aria-labelledby="workspace-members-title" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 pt-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="workspace-members-title" className="text-base font-semibold text-slate-900">Anggota workspace</h2>
                {!loading && !loadError && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">{totalItems}</span>}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Buka Event Access pada tiap anggota untuk mengatur akses atau penugasan PIC.</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Cari user"
                value={searchQuery}
                onChange={event => { setSearchQuery(event.target.value); setCurrentPage(1); }}
                placeholder="Cari nama, username, atau email"
                className="h-10 w-full min-w-0 rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="-mb-px mt-5 flex flex-wrap gap-1" aria-label="Filter peran user">
            {[{ value: 'ALL', label: 'Semua anggota' }, { value: 'ADMIN', label: 'Admin' }, { value: 'MANAGER', label: 'PIC' }, { value: 'USER', label: 'User' }].map(role => (
              <button
                key={role.value}
                type="button"
                aria-pressed={filterRole === role.value}
                onClick={() => { setFilterRole(role.value); setCurrentPage(1); }}
                className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-4 ${filterRole === role.value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-blue-600" />
            Memuat anggota workspace...
          </div>
        ) : loadError ? (
          <div role="alert" className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
            <AlertCircle aria-hidden="true" className="mb-3 h-7 w-7 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Daftar user belum berhasil dimuat</h3>
            <p className="mt-1 text-sm text-slate-500">Coba muat ulang untuk melihat anggota workspace.</p>
            <button type="button" onClick={() => { void loadUsers(); }} className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><RotateCw aria-hidden="true" className="h-4 w-4" />Coba lagi</button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center">
            <Users aria-hidden="true" className="mb-3 h-7 w-7 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Tidak ada user yang ditemukan</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{searchQuery || filterRole !== 'ALL' ? 'Coba kata kunci lain atau tampilkan semua peran.' : 'Tambahkan user untuk mulai mengatur anggota tim.'}</p>
            {(searchQuery || filterRole !== 'ALL') && <button type="button" onClick={() => { setSearchQuery(''); setFilterRole('ALL'); setCurrentPage(1); }} className="mt-4 text-sm font-medium text-blue-700 hover:underline">Reset filter</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">Daftar user, peran, dan pengaturan akses event</caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium sm:px-6">Anggota</th>
                    <th scope="col" className="px-4 py-3 font-medium">Peran</th>
                    <th scope="col" className="px-4 py-3 font-medium">Event Access</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium sm:px-6">Pengaturan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => {
                    const isSelf = currentUser?.id === user.id;
                    const currentRole = user.roles?.[0] || 'USER';
                    const displayName = user.fullName || user.username;
                    const eventCount = getUserAllowedEventIds(user).length;
                    const initials = displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
                    return (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-5 sm:px-6">
                          <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{initials}</span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="break-words font-semibold text-slate-900">{displayName}</span>
                                {isSelf && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Anda</span>}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">@{user.username}</p>
                              <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          {isSelf ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2 text-xs font-medium text-blue-700">
                              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />{currentRole === 'ADMIN' ? 'Admin' : currentRole === 'MANAGER' ? 'PIC' : 'User'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                aria-label={`Peran ${displayName}`}
                                value={currentRole}
                                disabled={submittingId === user.id}
                                onChange={event => handleRoleChange(user.id, event.target.value)}
                                className="min-h-9 w-28 cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                              >
                                <option value="USER">User</option>
                                <option value="MANAGER">PIC</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                              {submittingId === user.id && <Loader2 aria-label="Menyimpan perubahan" className="h-4 w-4 animate-spin text-blue-600" />}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-5">
                          {(currentRole === 'USER' || currentRole === 'MANAGER' || currentRole === 'ADMIN') && (
                            <button
                              type="button"
                              onClick={() => setManagingViewerEventsUser(user)}
                              aria-label={`Kelola ${currentRole === 'ADMIN' ? 'penugasan PIC' : 'akses event'} ${displayName}, ${eventCount} event dipilih`}
                              className="group rounded-md px-2 py-2 text-left transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <span className="flex items-center gap-2 font-semibold text-blue-700">
                                <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
                                <span className="tabular-nums">{currentRole === 'ADMIN' ? 'Semua event' : `${eventCount} event`}</span>
                                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
                              </span>
                              <span className="mt-1 block pl-6 text-xs text-slate-500">{currentRole === 'ADMIN' ? `PIC di ${eventCount} event` : 'Kelola akses'}</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-5 sm:px-6">
                          <div className="flex items-center justify-end gap-1">
                            {currentRole === 'USER' && (
                              <button type="button" onClick={() => setManagingColumnsUser(user)} aria-label={`Atur kolom tabel ${displayName}`} title="Atur kolom tabel" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                <Columns aria-hidden="true" className="h-4 w-4" />
                              </button>
                            )}
                            <button type="button" onClick={() => setEditingUser(user)} aria-label={`Edit user ${displayName}`} title="Edit user" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                              <Edit3 aria-hidden="true" className="h-4 w-4" />
                            </button>
                            {!isSelf && (
                              <button type="button" onClick={() => openDeleteConfirm(user)} disabled={submittingId !== null} aria-label={`Hapus user ${displayName}`} title="Hapus user" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40">
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-4 text-xs text-slate-500 sm:px-6">
              <p><span className="font-medium tabular-nums text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari {totalItems} anggota</p>
              <nav aria-label="Halaman daftar user" className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentPage(previous => Math.max(previous - 1, 1))} disabled={currentPage === 1} aria-label="Halaman sebelumnya" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <span className="px-2 tabular-nums">Halaman {currentPage} / {totalPages}</span>
                <button type="button" onClick={() => setCurrentPage(previous => Math.min(previous + 1, totalPages))} disabled={currentPage >= totalPages} aria-label="Halaman berikutnya" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </>
        )}
      </section>

      {/* Provision New User Modal */}
      <AddUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUserSubmit}
        loading={createLoading}
      />

      {/* Edit User Profile Details Modal */}
      <EditUserModal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        targetUser={editingUser}
        onSubmit={handleEditUserSubmit}
        loading={editLoading}
      />

      {/* Delete User Account Confirmation Modal */}
      {deletingUser && (
        <DeleteUserConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletingUser(null);
          }}
          deletingUser={deletingUser}
          onConfirm={handleDeleteUser}
          loading={submittingId !== null}
        />
      )}

      {/* Manage Viewer Allowed Events Modal */}
      <ManageViewerEventsModal
        isOpen={managingViewerEventsUser !== null}
        onClose={() => setManagingViewerEventsUser(null)}
        targetUser={managingViewerEventsUser}
        onSaved={(userId, eventIds) => setUsers(previous => previous.map(user => user.id === userId ? { ...user, allowedEventIds: eventIds } : user))}
      />

      {/* Custom Event Columns Modal */}
      <ManageUserColumnsModal
        isOpen={managingColumnsUser !== null}
        onClose={() => setManagingColumnsUser(null)}
        user={managingColumnsUser}
      />
    </div>
  );
}
