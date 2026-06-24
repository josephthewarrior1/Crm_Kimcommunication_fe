'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { PersonalEmailDomain, FlaggedIdentity, RemovalRequest } from '../../../lib/types';
import { ShieldCheck, Mail, ShieldAlert, History, Trash2, Plus, Loader2, X, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'domains' | 'removal'>('domains');
  const [loading, setLoading] = useState(true);

  // States for lists
  const [domains, setDomains] = useState<PersonalEmailDomain[]>([]);
  const [removals, setRemovals] = useState<RemovalRequest[]>([]);

  // Create Domain state
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [newDomainStr, setNewDomainStr] = useState('');
  const [newDomainRisk, setNewDomainRisk] = useState('high');
  const [newDomainNotes, setNewDomainNotes] = useState('');
  const [submittingDomain, setSubmittingDomain] = useState(false);

  useEffect(() => {
    loadTabDetails(activeTab);
  }, [activeTab]);

  async function loadTabDetails(tab: string) {
    setLoading(true);
    try {
      if (tab === 'domains') {
        const data = await crmService.getPersonalEmailDomains();
        setDomains(data);
      } else if (tab === 'removal') {
        const data = await crmService.getRemovalRequests();
        setRemovals(data);
      }
    } catch (err) {
      toast.error(`Failed to load ${tab} settings`);
    } finally {
      setLoading(false);
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainStr.trim()) {
      toast.error('Domain is required');
      return;
    }

    setSubmittingDomain(true);
    try {
      await crmService.createPersonalEmailDomain({
        domain: newDomainStr.trim().toLowerCase(),
        riskLevel: newDomainRisk,
        notes: newDomainNotes.trim() || undefined
      });

      toast.success('Personal email domain registered.');
      setNewDomainStr('');
      setNewDomainNotes('');
      setIsDomainModalOpen(false);
      loadTabDetails('domains');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add domain');
    } finally {
      setSubmittingDomain(false);
    }
  };

  const handleUpdateRemovalStatus = async (id: string, status: string) => {
    try {
      await crmService.updateRemovalRequestStatus(id, status);
      toast.success(`Request status updated to ${status}.`);
      loadTabDetails('removal');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update removal status');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Settings & Data Integrity</h2>
        <p className="text-sm text-slate-500 mt-1">Configure spam validation domains, audit takeout requests, and manage database integrity.</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('domains')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === 'domains'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          Personal Email Domains
        </button>

        <button
          onClick={() => setActiveTab('removal')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeTab === 'removal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-550 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Removal Requests (Opt-Out)
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="h-[40vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : activeTab === 'domains' ? (
          /* personal email domains */
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Personal Domains Directory</h3>
              <button
                onClick={() => setIsDomainModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Domain
              </button>
            </div>

            {domains.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No personal domains registered yet.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Domain</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {domains.map((dom) => (
                      <tr key={dom.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">@{dom.domain}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border uppercase ${
                            dom.riskLevel === 'high'
                              ? 'bg-red-50 border-red-100 text-red-600'
                              : 'bg-amber-50 border-amber-100 text-amber-600'
                          }`}>
                            {dom.riskLevel || 'medium'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{dom.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* removal request table */
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Removal / Opt-out Requests</h3>

            {removals.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No opt-out requests have been logged.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Contact</th>
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
                              {rem.contact.firstName} {rem.contact.lastName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{rem.contact.id.substring(0, 8)}</p>
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
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateRemovalStatus(rem.id, 'rejected')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-md"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-medium">Archived</span>
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

      {/* Add Domain Modal Overlay */}
      {isDomainModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <button
              onClick={() => setIsDomainModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Register Personal Domain</h3>

            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Domain Name *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-mono text-sm">@</span>
                  <input
                    type="text"
                    placeholder="gmail.com"
                    value={newDomainStr}
                    onChange={(e) => setNewDomainStr(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-mono text-sm focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Risk Level</label>
                <select
                  value={newDomainRisk}
                  onChange={(e) => setNewDomainRisk(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
                >
                  <option value="high">High Risk (Block Corporate Events)</option>
                  <option value="medium">Medium Risk (Flag Warning)</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Domain Notes</label>
                <textarea
                  placeholder="Notes about domain..."
                  value={newDomainNotes}
                  onChange={(e) => setNewDomainNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none text-xs focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDomainModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDomain}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

