import React from 'react';
import {
  Activity, CalendarDays, CheckCircle2, Clock, History, Loader2, Mail,
  MessageSquare, Phone, Sliders, UserCheck, Users, XCircle,
} from 'lucide-react';
import { EventActivitySummaryResponse } from '../../../../lib/types';

interface PicDailyReportProps {
  selectedPic: string;
  startDate: string;
  endDate: string;
  datePreset: 'today' | '7days' | '30days' | 'all' | 'custom';
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPresetChange: (preset: 'today' | '7days' | '30days' | 'all') => void;
  loading: boolean;
  summary: EventActivitySummaryResponse | null;
  activities: any[];
}

const presets = [
  { value: 'today', label: 'Hari ini' },
  { value: '7days', label: '7 hari terakhir' },
  { value: '30days', label: '30 hari terakhir' },
  { value: 'all', label: 'Semua periode' },
] as const;

function formatWib(value?: string) {
  if (!value) return '-';
  let dateString = value.trim();
  if (!dateString.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateString)) {
    dateString = dateString.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? value : `${date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  })} WIB`;
}

export function PicDailyReport({
  selectedPic, startDate, endDate, datePreset, onStartDateChange, onEndDateChange,
  onPresetChange, loading, summary, activities,
}: PicDailyReportProps) {
  const participantSummary = summary?.participantsSummary;
  const metrics = [
    { label: 'Telepon', value: summary?.byType?.call, Icon: Phone, color: 'bg-blue-50 text-blue-600' },
    { label: 'WhatsApp', value: summary?.byType?.whatsapp, Icon: MessageSquare, color: 'bg-teal-50 text-teal-700' },
    { label: 'Email', value: summary?.byType?.email, Icon: Mail, color: 'bg-sky-50 text-sky-700' },
    { label: 'Total aktivitas', value: summary?.totalActivities, Icon: Activity, color: 'bg-blue-100 text-blue-700' },
  ];
  const remarks = [
    { label: 'Registered', value: participantSummary?.registered, Icon: UserCheck, color: 'text-teal-700' },
    { label: 'Tentative', value: participantSummary?.tentative, Icon: Clock, color: 'text-blue-600' },
    { label: 'Not Respond', value: participantSummary?.notRespond, Icon: Phone, color: 'text-slate-500' },
    { label: 'Not Interest', value: participantSummary?.notInterest, Icon: XCircle, color: 'text-slate-500' },
  ];

  return (
    <section className="min-w-0 space-y-5" aria-label={`Laporan aktivitas ${selectedPic}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <History className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">Laporan aktivitas</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Aktivitas follow-up dan hasil peserta yang dikelola <span className="font-medium text-slate-700">{selectedPic}</span>.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Periode laporan
          </h4>
          {datePreset === 'custom' && <span className="text-xs font-medium text-blue-700">Rentang pilihan</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Pilih periode laporan">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              aria-pressed={datePreset === preset.value}
              onClick={() => onPresetChange(preset.value)}
              className={`min-h-9 cursor-pointer border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                datePreset === preset.value
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1.5 text-xs font-medium text-slate-600">
            <span>Tanggal mulai</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="block w-full min-w-0 px-3 py-2"
            />
          </label>
          <label className="block min-w-0 space-y-1.5 text-xs font-medium text-slate-600">
            <span>Tanggal selesai</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="block w-full min-w-0 px-3 py-2"
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
          Memuat laporan aktivitas...
        </div>
      ) : (
        <>
          {summary ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metrics.map(({ label, value, Icon, color }) => (
                <div key={label} className={`rounded-lg border p-4 ${label === 'Total aktivitas' ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${color}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{value ?? '-'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Ringkasan aktivitas belum tersedia.</p>
          )}

          {participantSummary && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5" aria-label="Ringkasan hasil peserta">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Hasil follow-up</h4>
                  <p className="mt-1 text-xs text-slate-500">{participantSummary.totalParticipants} peserta pada periode ini</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {participantSummary.totalAssignedParticipants} peserta ditugaskan
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {remarks.map(({ label, value, Icon, color }) => (
                  <div key={label} className="rounded-md bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} aria-hidden="true" />
                      {label}
                    </div>
                    <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">{value ?? '-'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-label="Riwayat aktivitas">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
              <h4 className="text-sm font-semibold text-slate-800">Riwayat aktivitas</h4>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium tabular-nums text-slate-600">{activities.length} aktivitas</span>
            </div>
            {activities.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <History className="mb-3 h-6 w-6 text-slate-400" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700">Belum ada aktivitas</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Pilih periode lain untuk melihat aktivitas follow-up yang sudah dicatat.</p>
              </div>
            ) : (
              <ol className="divide-y divide-slate-100">
                {activities.map((activity) => {
                  const type = (activity.activityType || '').toUpperCase();
                  const database = activity.eventParticipant?.database;
                  const targetName = activity.participantName || `${database?.firstName || ''} ${database?.lastName || ''}`.trim() || 'Peserta event';
                  const targetCompany = activity.companyName || database?.company?.name;
                  const targetPhone = activity.mobilePhone || database?.mobilePhone;
                  const Icon = type === 'CALL' ? Phone : type === 'WHATSAPP' ? MessageSquare : type === 'EMAIL' ? Mail : type === 'MEETING' ? Users : Sliders;
                  const typeLabel = type === 'CALL' ? 'Telepon' : type === 'WHATSAPP' ? 'WhatsApp' : type === 'EMAIL' ? 'Email' : type === 'SYSTEM' ? 'Sistem' : type === 'MEETING' ? 'Meeting' : type || 'Aktivitas';
                  const color = type === 'CALL' ? 'bg-blue-50 text-blue-600' : type === 'WHATSAPP' ? 'bg-teal-50 text-teal-700' : type === 'EMAIL' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600';
                  const status = activity.status || 'COMPLETED';
                  const normalizedStatus = status.toLowerCase();
                  const positive = ['approve', 'approved', 'completed', 'done', 'registered'].includes(normalizedStatus);
                  const pending = ['pending', 'tentative'].includes(normalizedStatus);

                  return (
                    <li key={activity.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="break-words text-sm font-semibold text-slate-800">{targetName}</p>
                              <span className="text-xs text-slate-500">{typeLabel}</span>
                            </div>
                            {(targetCompany || targetPhone) && <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">{[targetCompany, targetPhone].filter(Boolean).join(' · ')}</p>}
                          </div>
                          <time className="shrink-0 text-xs leading-5 text-slate-400">{formatWib(activity.createdAt)}</time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{activity.notes || 'Aktivitas dicatat.'}</p>
                        <span className={`mt-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${positive ? 'bg-teal-50 text-teal-700' : pending ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {positive ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : pending ? <Clock className="h-3 w-3" aria-hidden="true" /> : null}
                          {status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
