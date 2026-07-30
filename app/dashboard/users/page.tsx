'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { authService } from '../../../lib/services/authService';
import { AppUser } from '../../../lib/types';
import { useAuth } from '../../../lib/context/AuthContext';
import { Users, Loader2, Trash2, Shield, UserPlus, AlertCircle, Lock, Calendar, Edit3, Columns } from 'lucide-react';
import { toast } from 'sonner';
import { AddUserModal } from './components/AddUserModal';
import { EditUserModal } from './components/EditUserModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DeleteUserConfirmModal } from './components/DeleteUserConfirmModal';
import { ManageViewerEventsModal } from './components/ManageViewerEventsModal';
import { ManageUserColumnsModal } from './components/ManageUserColumnsModal';

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);

  const [changingPasswordUser, setChangingPasswordUser] = useState<AppUser | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [managingViewerEventsUser, setManagingViewerEventsUser] = useState<AppUser | null>(null);
  const [managingColumnsUser, setManagingColumnsUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await crmService.getUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load user accounts list');
    } finally {
      setLoading(false);
    }
  }

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

  const handleEditUserSubmit = async (id: number, data: { fullName: string; email: string }) => {
    setEditLoading(true);
    try {
      await crmService.updateUserProfile(id, data);
      toast.success('User details updated successfully');
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (password: string) => {
    if (!changingPasswordUser) return;
    setResetLoading(true);
    try {
      await crmService.updateUserPassword(changingPasswordUser.id, password);
      toast.success(`Password for user "${changingPasswordUser.username}" changed successfully!`);
      setChangingPasswordUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setResetLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-650 font-extrabold text-2xl mb-4 animate-bounce">
          🛇
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Only system administrators have permission to access the User Management panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-650" />
            User Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage corporate CRM users, audit privileges, and assign roles.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Users List Table */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No users found</h3>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Username</th>
                  <th className="py-3.5 px-6">Full Name</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">Assigned Role</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const currentRole = u.roles?.[0] || 'USER';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-500 font-bold">{u.id}</td>
                      <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-1.5">
                        {u.username}
                        {isSelf && (
                          <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-semibold">{u.fullName || '-'}</td>
                      <td className="py-4 px-6 text-slate-600 font-medium">{u.email}</td>
                      <td className="py-4 px-6">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 font-bold rounded-lg uppercase text-[10px] border border-slate-200">
                            <Shield className="w-3 h-3 text-slate-400" />
                            {currentRole}
                          </span>
                        ) : (
                          <div className="relative inline-block w-40">
                            <select
                              value={currentRole}
                              disabled={submittingId === u.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-slate-700 focus:outline-none transition-all py-1 px-2.5 font-bold text-[10px] uppercase cursor-pointer"
                            >
                              <option value="USER">USER</option>
                              <option value="MANAGER">MANAGER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {currentRole === 'USER' && (
                            <>
                              <button
                                onClick={() => setManagingColumnsUser(u)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold rounded-lg transition-colors shadow-2xs bg-white cursor-pointer"
                                title="Manage custom table columns visibility"
                              >
                                <Columns className="w-3.5 h-3.5 text-blue-600" />
                                <span>Custom Columns</span>
                              </button>
                              <button
                                onClick={() => setManagingViewerEventsUser(u)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors shadow-2xs bg-white"
                                title="Manage allowed events for Viewer"
                              >
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span>Events Access</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 text-slate-400 rounded-lg transition-colors shadow-sm bg-white"
                            title="Edit User Info"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setChangingPasswordUser(u)}
                            className="inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 text-slate-400 rounded-lg transition-colors shadow-sm bg-white"
                            title="Change Password"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => openDeleteConfirm(u)}
                              disabled={submittingId !== null}
                              className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 text-slate-400 rounded-lg transition-colors shadow-sm bg-white"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

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

      {/* Change Password Modal */}
      {changingPasswordUser && (
        <ChangePasswordModal
          isOpen={changingPasswordUser !== null}
          onClose={() => setChangingPasswordUser(null)}
          targetUser={changingPasswordUser}
          onSubmit={handleChangePasswordSubmit}
          loading={resetLoading}
        />
      )}

      {/* Manage Viewer Allowed Events Modal */}
      <ManageViewerEventsModal
        isOpen={managingViewerEventsUser !== null}
        onClose={() => setManagingViewerEventsUser(null)}
        targetUser={managingViewerEventsUser}
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
