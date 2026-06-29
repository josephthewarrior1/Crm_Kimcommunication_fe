'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { authService } from '../../../lib/services/authService';
import { AppUser } from '../../../lib/types';
import { useAuth } from '../../../lib/context/AuthContext';
import { Users, Loader2, Trash2, Shield, UserPlus, AlertCircle, RefreshCw, X, User, Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Create User Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Delete Confirmation Dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);

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

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim() || !newPassword || !newConfirmPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (newPassword !== newConfirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setCreateLoading(true);
    try {
      await authService.register({
        username: newUsername.trim(),
        email: newEmail.trim(),
        fullName: newFullName.trim() || undefined,
        password: newPassword,
        roles: [newRole]
      });

      toast.success(`User account for "${newUsername}" created successfully!`);
      setIsCreateModalOpen(false);
      // Reset form
      setNewUsername('');
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewConfirmPassword('');
      setNewRole('USER');
      setShowPassword(false);
      setShowConfirmPassword(false);
      // Refresh list
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user account.');
    } finally {
      setCreateLoading(false);
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
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Add User Account
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="johndoe"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">User Role *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Shield className="w-4 h-4" />
                  </span>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-750 focus:outline-none transition-all text-xs uppercase font-bold cursor-pointer"
                    required
                  >
                    <option value="USER">USER (Read-only)</option>
                    <option value="MANAGER">MANAGER (Read/Write)</option>
                    <option value="ADMIN">ADMIN (Full Control)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={newConfirmPassword}
                      onChange={(e) => setNewConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/10 transition-all"
                >
                  {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Account Confirmation Modal */}
      {isDeleteConfirmOpen && deletingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">Delete User Account?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete user account <span className="font-bold text-slate-800">"{deletingUser.username}"</span>? This will permanently revoke their access credentials. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingUser(null);
                }}
                disabled={submittingId !== null}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={submittingId !== null}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/10 transition-all"
              >
                {submittingId === deletingUser.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
