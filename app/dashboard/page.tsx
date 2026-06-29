'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../lib/services/crmService';
import { Group, Company, Contact, Event, FlaggedIdentity, EventLead } from '../../lib/types';
import { FolderTree, Building2, Users, CalendarDays, ShieldAlert, Loader2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend as ChartLegend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [flagged, setFlagged] = useState<FlaggedIdentity[]>([]);
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [gList, cList, conList, eList, fList, leadList] = await Promise.all([
          crmService.getGroups(),
          crmService.getCompanies(),
          crmService.getContacts(),
          crmService.getEvents(),
          crmService.getFlaggedIdentities(),
          crmService.getEventLeads().catch(() => []) // fallback
        ]);

        setGroups(gList);
        setCompanies(cList);
        setContacts(conList);
        setEvents(eList);
        setFlagged(fList);
        setLeads(leadList);
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

  // Compute Industry Distribution Chart Data
  const industryCounts = companies.reduce((acc, c) => {
    const ind = c.industry?.trim() || 'Unspecified';
    acc[ind] = (acc[ind] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedIndustries = Object.entries(industryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topIndustries = sortedIndustries.slice(0, 5);
  const otherCount = sortedIndustries.slice(5).reduce((sum, item) => sum + item.value, 0);
  if (otherCount > 0) {
    topIndustries.push({ name: 'Others', value: otherCount });
  }

  const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8'];

  // Compute Event Attendance Performance Data
  const eventAttendanceData = events.slice(0, 5).map(evt => {
    const evtLeads = leads.filter(l => l.event.id === evt.id);
    const total = evtLeads.length;
    const attended = evtLeads.filter(l => l.attendanceStatus === 'attended').length;
    return {
      name: evt.name.length > 20 ? evt.name.substring(0, 20) + '...' : evt.name,
      'Invited': total,
      'Attended': attended
    };
  });

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

      {/* Analytics Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Industry Distribution Chart (Pie) */}
        <div className="lg:col-span-1 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[380px]">
          <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Company Industries
          </h3>
          <div className="flex-1 min-h-0 relative">
            {companies.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No industry data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topIndustries}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {topIndustries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <ChartLegend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Event Attendance Ratio Chart (Bar) */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[380px]">
          <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            Event Attendance Performance
          </h3>
          <div className="flex-1 min-h-0">
            {events.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No event data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#64748b' }} />
                  <ChartTooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <ChartLegend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Invited" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Attended" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
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

