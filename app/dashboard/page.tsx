'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { crmService } from '../../lib/services/crmService';
import { DashboardSummaryResponse, Event, IndustrySummaryResponse } from '../../lib/types';
import { ArrowRight, BarChart3, Building2, CalendarDays, Database as DatabaseIcon, FolderTree, MapPin, RefreshCw, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardSummaryResponse | null>(null);
  const [industrySummary, setIndustrySummary] = useState<IndustrySummaryResponse | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, eventItems, industries] = await Promise.all([
          crmService.getDashboardSummary(),
          crmService.getEvents().catch(() => null),
          crmService.getIndustrySummary().catch(() => null),
        ]);
        setDashboard(summary);
        setEvents(eventItems);
        setIndustrySummary(industries);
      } catch {
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  if (loading) {
    return (
      <div role="status" className="space-y-6">
        <p className="text-sm text-slate-500">Loading your overview...</p>
        <div aria-hidden="true" className="grid animate-pulse grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 rounded-xl border border-slate-200 bg-white" />)}
        </div>
        <div aria-hidden="true" className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div role="alert" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Overview is unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">We couldn&apos;t load your workspace data. Please try again.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />Reload overview
        </button>
      </div>
    );
  }

  const { metrics, eventAttendancePerformance: attendance } = dashboard;
  const industries = industrySummary?.items || [];
  const totalInvited = attendance.reduce((sum, item) => sum + (item.Invited || 0), 0);
  const totalAttended = attendance.reduce((sum, item) => sum + (item.Attended || 0), 0);
  const attendanceRate = totalInvited > 0 ? (totalAttended / totalInvited) * 100 : 0;
  const industryTotal = industrySummary?.totals.databases || 0;
  const stats = [
    { name: 'Contacts', value: metrics.totalDatabase, description: 'Records in your database', href: '/dashboard/database', icon: DatabaseIcon, color: 'bg-blue-50 text-blue-600' },
    { name: 'Companies', value: metrics.totalCompanies, description: 'Companies in your workspace', href: '/dashboard/companies', icon: Building2, color: 'bg-teal-50 text-teal-700' },
    { name: 'Groups', value: metrics.totalGroups, description: 'Company groups', href: '/dashboard/groups', icon: FolderTree, color: 'bg-slate-100 text-slate-600' },
    { name: 'Events', value: metrics.totalEvents, description: 'Events in your workspace', href: '/dashboard/events', icon: CalendarDays, color: 'bg-sky-50 text-sky-700' },
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = (events || [])
    .filter((event) => new Date(event.dateStart || event.startDate || '').getTime() >= today.getTime())
    .sort((a, b) => new Date(a.dateStart || a.startDate || '').getTime() - new Date(b.dateStart || b.startDate || '').getTime())
    .slice(0, 4);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-900">Overview</h1>
          <p className="mt-2 text-sm text-slate-500">A clear view of your contacts, companies, and events.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/events" className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />View events
          </Link>
          <Link href="/dashboard/database" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
            Open database<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <section aria-label="Workspace totals" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(({ name, value, description, href, icon: Icon, color }) => (
          <Link key={name} href={href} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 sm:p-5">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <span className="text-sm font-medium text-slate-600">{name}</span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 ${color}`}><Icon aria-hidden="true" className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 break-all text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value.toLocaleString()}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs leading-5 text-slate-500">{description}</span>
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600" />
            </div>
          </Link>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <section aria-labelledby="attendance-title" className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <BarChart3 aria-hidden="true" className="h-4 w-4 text-slate-500" />
              <h2 id="attendance-title" className="text-sm font-semibold text-slate-900">Event performance</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">All reported events</span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-5 sm:grid-cols-[1.3fr_1fr_1fr]">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs font-medium text-slate-500">Attendance rate</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">{attendanceRate.toFixed(1)}<span className="ml-0.5 text-2xl text-slate-400">%</span></p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Invited</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 tabular-nums">{totalInvited.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Attended</p>
                <p className="mt-3 text-2xl font-semibold text-blue-600 tabular-nums">{totalAttended.toLocaleString()}</p>
              </div>
            </div>
            <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">Participants by event</p>
              <div className="flex gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue-200" />Invited</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue-600" />Attended</span>
              </div>
            </div>
            <div className="h-60 min-w-0">
              {attendance.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
                  <Users aria-hidden="true" className="mb-3 h-6 w-6 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">No attendance data yet</p>
                  <p className="mt-1 text-xs text-slate-500">Event attendance will appear here as participants are recorded.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart accessibilityLayer data={attendance} margin={{ top: 12, right: 0, left: -20, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DFE1E6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#626F86' }} tickMargin={10} tickFormatter={(name: string) => name.length > 16 ? `${name.slice(0, 14)}…` : name} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#626F86' }} />
                    <ChartTooltip cursor={{ fill: '#F4F5F7' }} contentStyle={{ border: '1px solid #DFE1E6', borderRadius: 8, color: '#172B4D', fontSize: 12, boxShadow: '0 4px 12px rgb(9 30 66 / 0.1)' }} />
                    <Bar dataKey="Invited" fill="#B3D4FF" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="Attended" fill="#0C66E4" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
            <p className="text-xs text-slate-500">Attendance across {attendance.length.toLocaleString()} reported events</p>
            <Link href="/dashboard/events" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">View events<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
          </div>
        </section>

        <section aria-labelledby="upcoming-title" className="min-w-0 rounded-xl border border-slate-200 bg-slate-200/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div>
              <h2 id="upcoming-title" className="text-sm font-semibold text-slate-900">Upcoming events</h2>
              <p className="mt-1 text-xs text-slate-500">What&apos;s next on your schedule</p>
            </div>
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-slate-500" />
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const date = new Date(event.dateStart || event.startDate || '');
              return (
                <Link key={event.id} href={`/dashboard/events?eventId=${event.id}`} className="group block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300">
                  <div className="flex items-start gap-3">
                    <div className="w-11 shrink-0 rounded-md bg-blue-50 py-1.5 text-center text-blue-700">
                      <p className="text-[10px] font-semibold uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</p>
                      <p className="text-xl font-semibold leading-6 tabular-nums">{date.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-[13px] font-semibold leading-5 text-slate-900 group-hover:text-blue-600">{event.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.venueName || event.venueCity || 'Location to be confirmed'}</span></span>
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </Link>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white px-5 py-9 text-center">
                <CalendarDays aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">{events ? 'No upcoming events' : 'Schedule unavailable'}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{events ? 'Your next scheduled events will appear here. Open Events to plan your next one.' : 'The event schedule could not be loaded. Try reloading the page.'}</p>
              </div>
            )}
          </div>
          <Link href="/dashboard/events" className="mt-3 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-blue-600">View all events<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
        </section>
      </div>

      <section aria-labelledby="industry-records-title" className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="industry-records-title" className="text-sm font-semibold text-slate-900">Contacts by industry</h2>
            <p className="mt-1 text-xs text-slate-500">Understand where your network is strongest.</p>
          </div>
          {industrySummary && <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{industrySummary.totals.industries.toLocaleString()} industries</span>}
        </div>
        {industrySummary ? (
          <>
            <div className="max-h-[440px] overflow-auto" role="region" aria-label="Industry contact records" tabIndex={0}>
              <table className="w-full min-w-[720px] text-left text-xs tabular-nums">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium sm:pl-6">Industry</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Companies</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Total contacts</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Active</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Inactive</th>
                    <th scope="col" className="px-5 py-3 font-medium sm:pr-6">Contact share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {industries.map((item) => {
                    const share = industryTotal > 0 ? (item.databaseCount / industryTotal) * 100 : 0;
                    return (
                      <tr key={item.industry} className="hover:bg-slate-50">
                        <th scope="row" className="px-5 py-4 font-medium text-slate-900 sm:pl-6">{item.industry}</th>
                        <td className="px-4 py-4 text-right text-slate-600">{item.companyCount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-900">{item.databaseCount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-slate-600">{item.activeDatabaseCount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-slate-500">{item.inactiveDatabaseCount.toLocaleString()}</td>
                        <td className="px-5 py-4 sm:pr-6">
                          <div className="flex items-center gap-3">
                            <div aria-hidden="true" className="h-1.5 w-20 overflow-hidden rounded-full bg-blue-50"><div className="h-full rounded-full bg-blue-600" style={{ width: `${share}%` }} /></div>
                            <span className="w-10 text-right text-slate-600">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <tr>
                    <th scope="row" className="px-5 py-3.5 sm:pl-6">Total</th>
                    <td className="px-4 py-3.5 text-right">{industrySummary.totals.companies.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">{industryTotal.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">{industrySummary.totals.activeDatabases.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">{industrySummary.totals.inactiveDatabases.toLocaleString()}</td>
                    <td className="px-5 py-3.5 sm:pr-6">{industryTotal > 0 ? '100%' : '0%'}</td>
                  </tr>
                </tfoot>
              </table>
              {industries.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No industry records yet. Add company and contact details to see your distribution.</p>}
            </div>
            <p className="border-t border-slate-200 px-5 py-3.5 text-xs leading-5 text-slate-500 sm:px-6">Includes active and inactive contacts. Contact share is calculated from all {industryTotal.toLocaleString()} contacts.</p>
          </>
        ) : <p role="alert" className="px-5 py-8 text-sm text-slate-600 sm:px-6">Industry records could not be loaded. Please reload the page to try again.</p>}
      </section>
    </div>
  );
}
