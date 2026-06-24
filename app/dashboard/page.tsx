'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../lib/services/crmService';
import { Group, Company, Contact, Event, FlaggedIdentity } from '../../lib/types';
import { FolderTree, Building2, Users, CalendarDays, ShieldAlert, Loader2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [flagged, setFlagged] = useState<FlaggedIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [gList, cList, conList, eList, fList] = await Promise.all([
          crmService.getGroups(),
          crmService.getCompanies(),
          crmService.getContacts(),
          crmService.getEvents(),
          crmService.getFlaggedIdentities()
        ]);

        setGroups(gList);
        setCompanies(cList);
        setContacts(conList);
        setEvents(eList);
        setFlagged(fList);
      } catch (err) {
        toast.error('Failed to load dashboard data. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Calculate metrics
  const stats = [
    { name: 'Total Groups', value: groups.length, icon: FolderTree, color: 'from-blue-600/20 to-blue-800/10', text: 'text-blue-400' },
    { name: 'Total Companies', value: companies.length, icon: Building2, color: 'from-cyan-600/20 to-cyan-800/10', text: 'text-cyan-400' },
    { name: 'Total Contacts', value: contacts.filter(c => c.isActive !== false).length, icon: Users, color: 'from-emerald-600/20 to-emerald-800/10', text: 'text-emerald-400' },
    { name: 'Total Events', value: events.length, icon: CalendarDays, color: 'from-blue-600/20 to-blue-800/10', text: 'text-blue-400' },
  ];

  // Active flagged tikus count
  const suspectedTikus = flagged.filter(f => f.status === 'suspected' || f.status === 'confirmed');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-2xl relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-blue-50 blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">KIM CRM Dashboard</h2>
          <p className="text-slate-500 mt-2 max-w-xl">
            Welcome to the KIM Communications Lead & Event Management panel. View holding company details, active contacts, event statuses, and track suspicious identity flags.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.name}
              className={`p-6 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-350 transition-all hover:translate-y-[-2px] shadow-sm`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.name}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${s.color} ${s.text}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Flagged Tikus Alert Card */}
      <div className="grid grid-cols-1 gap-8">
        {/* Tikus Alert Column - Full Width */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
              <h3 className="font-bold text-lg text-slate-900">Suspicious Identity Alerts ("Tikus")</h3>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-red-50 border border-red-100 text-red-600 rounded-full">
              {suspectedTikus.length} Suspected
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2">
            {suspectedTikus.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <p className="text-sm font-semibold">No alerts found</p>
                <p className="text-xs text-slate-500 mt-1">Excellent! No duplicate identities or invalid patterns flagged.</p>
              </div>
            ) : (
              suspectedTikus.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl flex items-start justify-between gap-4 transition-all"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">
                      {item.nameUsed || 'Unknown Name'}
                    </p>
                    <p className="text-xs text-slate-600">
                      Email: <span className="text-slate-800 font-mono">{item.emailUsed || '-'}</span> | Phone:{' '}
                      <span className="text-slate-800 font-mono">{item.phoneUsed || '-'}</span>
                    </p>
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Reason: {item.flagReason?.replace(/_/g, ' ')}
                    </p>
                    {item.evidenceNotes && (
                      <p className="text-[11px] text-slate-600 italic mt-1 bg-white p-2 rounded border border-slate-200">
                        "{item.evidenceNotes}"
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
                      item.status === 'confirmed'
                        ? 'bg-red-50 border-red-100 text-red-600'
                        : 'bg-amber-50 border-amber-100 text-amber-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

