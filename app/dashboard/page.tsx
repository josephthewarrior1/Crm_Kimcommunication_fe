'use client';

import React, { useEffect, useState } from 'react';
import { crmService } from '../../lib/services/crmService';
import { DashboardSummaryResponse, Event } from '../../lib/types';
import {
  Building2,
  CalendarDays,
  Database as DatabaseIcon,
  FolderTree,
  Loader2,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';

const COLORS = {
  page: '#f4f7ff',
  card: 'rgba(255,255,255,0.82)',
  ink: '#141826',
  muted: '#7c8190',
  line: 'rgba(20,24,38,0.10)',
  blue: '#2f64e8',
  blueDark: '#183a9e',
  blueSoft: '#eaf0ff',
  track: '#dfe6f5'
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardSummaryResponse | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, eventItems] = await Promise.all([
          crmService.getDashboardSummary(),
          crmService.getEvents().catch(() => [])
        ]);
        setDashboard(summary);
        setEvents(eventItems);
      } catch (err) {
        toast.error('Failed to load dashboard data. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const metrics = dashboard?.metrics;
  const eventAttendanceData = dashboard?.eventAttendancePerformance || [];
  const topIndustries = dashboard?.industryDistribution || [];

  const totalInvited = eventAttendanceData.reduce((sum, item) => sum + (item.Invited || 0), 0);
  const totalAttended = eventAttendanceData.reduce((sum, item) => sum + (item.Attended || 0), 0);
  const attendanceRate = totalInvited > 0 ? (totalAttended / totalInvited) * 100 : 0;
  const industryTotal = topIndustries.reduce((sum, item) => sum + item.value, 0);

  const stats = [
    { name: 'Total Groups', value: metrics?.totalGroups || 0, icon: FolderTree },
    { name: 'Total Companies', value: metrics?.totalCompanies || 0, icon: Building2 },
    { name: 'Total Database', value: metrics?.totalDatabase || 0, icon: DatabaseIcon },
    { name: 'Total Events', value: metrics?.totalEvents || 0, icon: CalendarDays }
  ];

  const upcomingEvents = events
    .filter((event) => event.dateStart || event.startDate)
    .sort((a, b) => new Date(a.dateStart || a.startDate || '').getTime() - new Date(b.dateStart || b.startDate || '').getTime())
    .slice(0, 4);

  const formatEventDate = (event: Event) => {
    const value = event.dateStart || event.startDate;
    if (!value) return 'Date not set';
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.blue }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: COLORS.page }}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] gap-4 max-w-[1440px] mx-auto">
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="rounded-lg border p-4 flex items-center gap-3 backdrop-blur-md"
                  style={{ backgroundColor: COLORS.card, borderColor: 'rgba(255,255,255,0.78)' }}
                >
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className="w-4 h-4" style={{ color: COLORS.blue }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: COLORS.muted }}>{stat.name}</p>
                    <p className="text-lg font-bold leading-tight" style={{ color: COLORS.ink }}>{stat.value.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="rounded-lg border p-5 md:p-6 backdrop-blur-md"
            style={{ backgroundColor: COLORS.card, borderColor: 'rgba(255,255,255,0.78)' }}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: COLORS.ink }}>Average Attendance Score</h2>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-5xl font-light leading-none" style={{ color: COLORS.ink }}>{attendanceRate.toFixed(2)}%</span>
                  <span className="text-xs font-semibold pb-1" style={{ color: COLORS.muted }}>
                    {totalAttended.toLocaleString()} attended
                  </span>
                </div>
              </div>
              <div className="px-4 py-2 rounded-lg bg-white/70 text-[11px] font-bold" style={{ color: COLORS.ink }}>
                All events
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-5 items-stretch">
              <div className="h-[245px]">
                {eventAttendanceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm" style={{ color: COLORS.muted }}>
                    No event data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventAttendanceData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="0" vertical={false} stroke={COLORS.line} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(47,100,232,0.10)' }}
                        contentStyle={{ border: '0', borderRadius: 8, boxShadow: '0 14px 30px rgba(40,34,29,0.14)' }}
                      />
                      <Bar dataKey="Invited" fill={COLORS.track} radius={[999, 999, 0, 0]} barSize={13} />
                      <Bar dataKey="Attended" fill={COLORS.blue} radius={[999, 999, 0, 0]} barSize={13} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-lg bg-white/78 p-4">
                <p className="text-xs font-bold mb-3" style={{ color: COLORS.ink }}>Top Industries</p>
                <div className="space-y-3">
                  {topIndustries.slice(0, 5).map((item, index) => {
                    const pct = industryTotal > 0 ? Math.round((item.value / industryTotal) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ backgroundColor: COLORS.blueSoft, color: COLORS.blue }}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold truncate" style={{ color: COLORS.ink }}>{item.name}</p>
                          <p className="text-[10px]" style={{ color: COLORS.muted }}>{item.value.toLocaleString()} records</p>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: COLORS.blue }}>{pct}%</span>
                      </div>
                    );
                  })}
                  {topIndustries.length === 0 && (
                    <p className="text-xs" style={{ color: COLORS.muted }}>No industry data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg border p-5 md:p-6 backdrop-blur-md"
            style={{ backgroundColor: COLORS.card, borderColor: 'rgba(255,255,255,0.78)' }}
          >
            <h2 className="text-lg font-bold mb-5" style={{ color: COLORS.ink }}>Industry Records</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="text-left text-[11px]" style={{ color: COLORS.muted }}>
                    <th className="font-semibold pb-3">Industry</th>
                    <th className="font-semibold pb-3">Records</th>
                    <th className="font-semibold pb-3">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topIndustries.slice(0, 6).map((item) => {
                    const pct = industryTotal > 0 ? Math.round((item.value / industryTotal) * 100) : 0;
                    return (
                      <tr key={item.name} className="border-t" style={{ borderColor: COLORS.line }}>
                        <td className="py-3 text-xs font-semibold" style={{ color: COLORS.ink }}>{item.name}</td>
                        <td className="py-3 text-xs" style={{ color: COLORS.muted }}>{item.value.toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-28 h-2 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.track }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS.blue }} />
                            </div>
                            <span className="text-[11px] font-bold" style={{ color: COLORS.blue }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          <div
            className="rounded-lg p-6 text-white relative overflow-hidden min-h-[288px]"
            style={{ background: 'linear-gradient(145deg, #183a9e 0%, #111827 58%, #0b1020 100%)', boxShadow: '0 22px 38px rgba(24,58,158,0.22)' }}
          >
            <div className="absolute -right-10 -top-12 w-48 h-48 rounded-full border border-white/10 bg-white/5" />
            <div className="absolute right-9 top-4 w-36 h-36 rounded-full bg-black/25" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Upcoming Events</h2>
                <span className="text-[11px] font-bold text-white/60">{upcomingEvents.length} active</span>
              </div>
              <div className="space-y-5">
                {upcomingEvents.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-sm text-white/45">
                    No upcoming event data available
                  </div>
                ) : upcomingEvents.map((event, index) => (
                  <div key={event.id} className="grid grid-cols-[14px_1fr] gap-3">
                    <div className="flex flex-col items-center">
                      <span className="w-2 h-2 rounded-full bg-white mt-1" />
                      {index < upcomingEvents.length - 1 && <span className="w-px flex-1 bg-white/25 mt-2" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{event.name}</p>
                      <p className="text-[11px] text-white/48 mt-0.5">{formatEventDate(event)}</p>
                      <p className="text-[11px] text-white/56 mt-2 truncate">{event.venueName || event.venueCity || event.clientName || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white/45 border border-white/60 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <TrendingUp className="w-5 h-5" style={{ color: COLORS.blue }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: COLORS.muted }}>Event funnel</p>
                <p className="text-xl font-bold" style={{ color: COLORS.ink }}>
                  {totalInvited.toLocaleString()} invited
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/60 p-3">
                <CalendarDays className="w-4 h-4 mb-2" style={{ color: COLORS.blue }} />
                <p className="text-[11px]" style={{ color: COLORS.muted }}>Attended</p>
                <p className="text-lg font-bold" style={{ color: COLORS.ink }}>{totalAttended.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-white/60 p-3">
                <MapPin className="w-4 h-4 mb-2" style={{ color: COLORS.blue }} />
                <p className="text-[11px]" style={{ color: COLORS.muted }}>Events</p>
                <p className="text-lg font-bold" style={{ color: COLORS.ink }}>{(metrics?.totalEvents || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
