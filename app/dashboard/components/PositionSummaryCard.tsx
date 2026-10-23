'use client';

import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PositionSummary } from '../../../lib/types';

export default function PositionSummaryCard({ data }: { data: PositionSummary | null }) {
  const valid = data && [data.total, data.cLevel, data.managerial, data.staff, data.other]
    .every((value) => Number.isSafeInteger(value) && value >= 0)
    && data.cLevel + data.managerial + data.staff + data.other === data.total;
  const otherPositions = data?.otherPositions;
  const validBreakdown = valid && Array.isArray(otherPositions) && otherPositions.every(item =>
    item && (item.position === null || typeof item.position === 'string') && Number.isSafeInteger(item.count) && item.count > 0)
    && new Set(otherPositions.map(item => item.position)).size === otherPositions.length
    && otherPositions.reduce((sum, item) => sum + item.count, 0) === data.other;
  const unknownCount = validBreakdown ? otherPositions.find(item => item.position === 'unknown')?.count ?? 0 : null;
  const categories = valid ? [
    { name: 'C-Level', count: data.cLevel, description: 'Termasuk GM / Director', color: '#0C66E4' },
    { name: 'Managerial Level', count: data.managerial, description: 'Manager / Head', color: '#579DFF' },
    { name: 'Staff', count: data.staff, description: 'Semua kontak dengan level Staff', color: '#B3D4FF' },
    ...(unknownCount !== null ? [{ name: 'Others', count: unknownCount, description: 'Position belum terklasifikasi', color: '#8590A2' }] : []),
  ] : [];

  return <section aria-labelledby="position-summary-title" className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2.5"><Users aria-hidden="true" className="h-4 w-4 text-slate-500" /><h2 id="position-summary-title" className="text-sm font-semibold text-slate-900">Ringkasan Position</h2></div>
      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">Kontak aktif</span>
    </div>
    {!valid ? <p role="status" className="px-5 py-12 text-sm text-slate-500 sm:px-6">Ringkasan level jabatan belum tersedia.</p> : <>
      <div className="p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-5 sm:grid-cols-4">
          {categories.map((item) => <div key={item.name} className="min-w-0"><dt className="flex items-center gap-2 text-xs font-medium text-slate-600"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />{item.name}</dt><dd className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{item.count.toLocaleString('id-ID')}</dd><p className="mt-1 text-[11px] leading-5 text-slate-500">{item.description}</p></div>)}
        </dl>
        <p className="mb-2 mt-5 text-xs text-slate-500">Jumlah kontak per kategori</p>
        {data.total > 0 ? <div className="h-44 min-w-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={categories} margin={{ top: 24, right: 8, left: -24, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 11, fill: '#626F86' }} tickMargin={10} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8590A2' }} />
            <Tooltip cursor={{ fill: '#F4F5F7' }} formatter={(value: number) => [value.toLocaleString('id-ID'), 'Kontak']} contentStyle={{ border: '1px solid #DFE1E6', borderRadius: 8, fontSize: 12, color: '#172B4D' }} />
            <Bar dataKey="count" name="Kontak" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
              {categories.map((item) => <Cell key={item.name} fill={item.color} />)}
              <LabelList dataKey="count" position="top" formatter={(value: number) => value.toLocaleString('id-ID')} style={{ fontSize: 11, fill: '#44546F' }} />
            </Bar>
          </BarChart></ResponsiveContainer>
        </div> : <p className="py-10 text-center text-sm text-slate-500">Belum ada kontak aktif.</p>}
        <p className="mt-3 text-[11px] leading-5 text-slate-500">{unknownCount !== null ? <>Others mewakili Position <code>unknown</code>. {data.other > unknownCount && <>{(data.other - unknownCount).toLocaleString('id-ID')} kontak di luar grafik dirinci di bawah.</>}</> : 'Rincian kategori Others belum tersedia.'}</p>
        {data.other > 0 && <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3"><h3 className="text-xs font-semibold text-slate-700">Rincian posisi belum terklasifikasi</h3><span className="text-xs text-slate-500">{data.other.toLocaleString('id-ID')} kontak</span></div>
          {validBreakdown ? <>
            <dl className="divide-y divide-slate-100">{otherPositions.map(item => <div key={JSON.stringify(item.position)} className="flex items-center justify-between gap-4 px-4 py-3"><dt className="min-w-0 break-words text-xs text-slate-600">{item.position === 'unknown' ? 'Others' : item.position === null ? 'Kosong / belum diisi' : item.position === '' ? 'Teks kosong' : !item.position.trim() ? 'Spasi saja' : item.position}</dt><dd className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{item.count.toLocaleString('id-ID')}</dd></div>)}</dl>
            <p className="border-t border-slate-100 px-4 py-3 text-[11px] leading-5 text-slate-500">Others ditampilkan untuk Position <code>unknown</code>. Position kosong tetap ditampilkan terpisah.</p>
          </> : <p className="px-4 py-3 text-xs text-slate-500">Rincian Position belum tersedia.</p>}
        </div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6"><p className="text-xs text-slate-500">Dari {data.total.toLocaleString('id-ID')} kontak aktif di CRM</p><Link href="/dashboard/database" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">Lihat database<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link></div>
    </>}
  </section>;
}
