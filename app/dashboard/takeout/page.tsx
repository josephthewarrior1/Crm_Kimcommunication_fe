'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { RemovalRequest } from '../../../lib/types';
import { Loader2, RotateCcw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [removals, setRemovals] = useState<RemovalRequest[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadTabDetails();
    }
  }, [isAdmin]);

  async function loadTabDetails() {
    setLoading(true);
    try {
      const data = await crmService.getRemovalRequests();
      setRemovals(data);
    } catch (err) {
      toast.error('Failed to load takeout requests');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateRemovalStatus = async (id: number, status: string) => {
    try {
      await crmService.updateRemovalRequestStatus(id, status);
      toast.success(`Request status updated to ${status}.`);
      loadTabDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update removal status');
    }
  };

  const handleRestoreContact = async (rem: RemovalRequest) => {
    try {
      if (rem.database?.id) {
        // Reactivate soft-deleted contact in local CRM database (send both isActive & active for Jackson compatibility)
        await crmService.updateDatabase(rem.database.id, {
          isActive: true,
          active: true,
        } as any);
      }
      await crmService.updateRemovalRequestStatus(rem.id, 'rejected');
      toast.success(`Kontak ID ${rem.database?.id} berhasil dipulihkan / diaktifkan kembali!`);
      loadTabDetails();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memulihkan kontak');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 font-extrabold text-2xl mb-4 animate-bounce">
          🛇
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Only users with the <span className="font-bold text-red-600">ADMIN</span> role have permissions to audit takeout requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Takeout Requests</h2>
        <p className="text-sm text-slate-500 mt-1">Audit, approve or reject takeout requests, and manage active database record deletions.</p>
      </div>

      {/* Main Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="h-[40vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Takeout Requests</h3>

            {removals.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No takeout requests have been logged.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Database Record</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Requested By</th>
                      <th className="py-3 px-4">Audit Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {removals.map((rem) => {
                      const statusColors: Record<string, string> = {
                        pending: 'bg-amber-50 border-amber-100 text-amber-600',
                        approved: 'bg-blue-50 border-blue-100 text-blue-600',
                        done: 'bg-emerald-50 border-emerald-100 text-emerald-600',
                        rejected: 'bg-slate-100 border-slate-200 text-slate-500'
                      };

                      return (
                        <tr key={rem.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <p className="font-bold text-slate-900">
                              {rem.database?.firstName || rem.database?.lastName
                                ? `${rem.database.firstName || ''} ${rem.database.lastName || ''}`.trim()
                                : `Record #${rem.database?.id || '-'}`}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {rem.database?.id}</p>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700 capitalize">{rem.reason.replace(/_/g, ' ')}</td>
                          <td className="py-4 px-4 text-slate-600">{rem.requestedBy || '-'}</td>
                          <td className="py-4 px-4 text-slate-500">
                            <p>DB: {rem.sourceDb || 'Unknown'}</p>
                            {rem.notes && <p className="italic">"{rem.notes}"</p>}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 font-bold rounded-md border uppercase ${statusColors[rem.status] || statusColors.pending}`}>
                              {rem.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {rem.status === 'pending' ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateRemovalStatus(rem.id, 'done')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                                  title="Approve Takeout & Soft-Delete Contact"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRestoreContact(rem)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all cursor-pointer"
                                  title="Reject Request & Keep Active"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </div>
                            ) : rem.status === 'done' || rem.status === 'approved' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRestoreContact(rem)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-extrabold rounded-lg shadow-sm transition-all cursor-pointer"
                                  title="Restore / Reactivate Contact back to Database directory"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Restore Contact
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                Contact Active
                              </span>
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
        )}
      </div>
    </div>
  );
}
