'use client';

// Adapted from shadcn/ui chart-pie-donut-text and chart-bar-horizontal (MIT).
// Source and license: integrations/database-charts/LICENSE.shadcn
import { BarChart3, ChevronDown, HelpCircle, PieChart as PieChartIcon } from 'lucide-react';
import { Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DatabaseAnalytics } from '../../../../lib/types';

const number = (value: number) => value.toLocaleString('id-ID');
const tooltipStyle = { border: '1px solid #DFE1E6', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#172B4D', fontSize: 12, boxShadow: '0 4px 12px rgb(9 30 66 / 0.1)' };

export function DatabaseCharts({ data, loading = false, onRetry }: {
  data: DatabaseAnalytics | null; loading?: boolean; onRetry?: () => void;
}) {
  // ponytail: Reuse the list's server aggregates; never reconstruct totals from its 10-row page.
  const valid = data && [data.total, data.clean, data.dirty].every((value) => Number.isSafeInteger(value) && value >= 0)
    && data.clean + data.dirty === data.total && Array.isArray(data.industries)
    && data.industries.every((item) => item && typeof item.name === 'string' && Number.isSafeInteger(item.count) && item.count >= 0)
    && data.industries.reduce((sum, item) => sum + item.count, 0) === data.total;
  const quality = valid ? [
    { name: 'Database bersih', value: data.clean, fill: '#059669' },
    { name: 'Perlu dilengkapi', value: data.dirty, fill: '#D97706' },
  ] : [];
  const completeness = valid && data.total ? Math.round(data.clean / data.total * 100) : 0;
  const industryMaximum = valid ? Math.max(1, ...data.industries.map((item) => item.count)) : 1;
  const otherTotal = valid ? data.industries.find((item) => item.name === 'Lainnya')?.count || 0 : 0;
  const otherIndustries = valid && Array.isArray(data.otherIndustries)
    && data.otherIndustries.every((item) => item && typeof item.name === 'string' && Number.isSafeInteger(item.count) && item.count > 0)
    && data.otherIndustries.reduce((sum, item) => sum + item.count, 0) === otherTotal ? data.otherIndustries : [];

  return <details open className="group/charts" aria-busy={loading}>
    <summary className="mb-3 flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-md py-1 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
      <span className="flex items-center gap-2 text-sm font-semibold"><BarChart3 aria-hidden="true" className="h-4 w-4 text-blue-600" />Ringkasan database</span>
      <span className="flex items-center gap-2 text-xs text-slate-500">Seluruh hasil pencarian & filter<ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open/charts:rotate-180 motion-reduce:transition-none" /></span>
    </summary>
    {loading ? <div role="status" className="grid gap-4 xl:grid-cols-2"><span className="sr-only">Memuat ringkasan database…</span>{[0, 1].map((item) => <div key={item} aria-hidden="true" className="h-[320px] animate-pulse rounded-xl border border-slate-200 bg-white motion-reduce:animate-none" />)}</div>
      : !valid ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-500"><HelpCircle aria-hidden="true" className="h-4 w-4" />Ringkasan database belum bisa dimuat.</p>{onRetry && <button type="button" onClick={onRetry} className="rounded-md px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">Coba lagi</button>}</div>
        : <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section aria-labelledby="database-quality-title" className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 id="database-quality-title" className="text-sm font-semibold">Kelengkapan database</h3><p className="mt-1 text-xs text-slate-500">Field wajib yang sudah terisi</p></div><PieChartIcon aria-hidden="true" className="h-4 w-4 text-slate-400" /></div>
            <div className="flex min-h-[210px] flex-1 flex-col flex-wrap items-center justify-center gap-3 px-5 py-2 sm:flex-row sm:gap-5">
              {data.total ? <div className="h-[210px] w-[210px] shrink-0" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [number(value), 'Database']} />
                    <Pie data={quality} dataKey="value" nameKey="name" innerRadius={68} outerRadius={88} strokeWidth={4} stroke="#FFFFFF" paddingAngle={data.clean && data.dirty ? 2 : 0} isAnimationActive={false}>
                      <Label content={({ viewBox }) => viewBox && 'cx' in viewBox && 'cy' in viewBox ? <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle"><tspan x={viewBox.cx} className="fill-slate-900 text-[30px] font-semibold tabular-nums">{number(data.total)}</tspan><tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-slate-500 text-[11px]">Total database</tspan></text> : null} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div> : <div className="flex h-[210px] w-[210px] shrink-0 items-center justify-center"><div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border-[18px] border-slate-100"><span className="text-3xl font-semibold tabular-nums">0</span><span className="mt-1 text-[11px] text-slate-500">Total database</span></div></div>}
              <dl className="w-full min-w-[160px] space-y-4 pb-4 sm:max-w-[210px] sm:flex-1 sm:pb-0">
                {quality.map((item) => <div key={item.name} className="flex items-center justify-between gap-3"><dt className="flex items-center gap-2 text-xs text-slate-600"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.fill }} />{item.name}</dt><dd className="text-sm font-semibold tabular-nums">{number(item.value)}</dd></div>)}
                <div className="border-t border-slate-100 pt-3"><dt className="text-[11px] text-slate-500">Database bersih</dt><dd className="mt-1 text-2xl font-semibold tracking-tight text-emerald-600 tabular-nums">{completeness}%<span className="ml-1.5 text-xs font-normal text-slate-500">dari hasil filter</span></dd></div>
              </dl>
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500">Bersih berarti field wajib terisi, belum merupakan verifikasi validitas data.</p>
          </section>

          <section aria-labelledby="database-industries-title" className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 id="database-industries-title" className="text-sm font-semibold">Sebaran industri</h3><p className="mt-1 text-xs text-slate-500">Jumlah kontak per industri perusahaan</p></div><span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">6 teratas</span></div>
            {data.total ? <dl className="flex-1 space-y-4 p-5" aria-label="Jumlah kontak per industri, seluruh hasil filter">
              {data.industries.map((item) => <div key={item.name}>
                <div className="flex items-start justify-between gap-4">
                  <dt className="min-w-0 break-words text-[13px] font-medium leading-5 text-slate-600">{item.name}</dt>
                  <dd className="shrink-0 text-[13px] font-semibold leading-5 text-slate-900 tabular-nums">{number(item.count)}</dd>
                </div>
                <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.count / industryMaximum * 100}%` }} />
                </div>
              </div>)}
            </dl> : <div className="flex min-h-[210px] flex-1 items-center justify-center px-5 text-center text-sm text-slate-500">Tidak ada data sesuai filter.</div>}
            <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500">Industri di luar 6 teratas digabung ke Lainnya. Data tanpa industri ditandai Belum diisi.</p>
          </section>
          {otherIndustries.length > 0 && <details open className="col-span-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-blue-700">Rincian Lainnya <span className="ml-1 text-xs font-normal text-slate-500">{number(otherTotal)} kontak · {otherIndustries.length} industri</span></summary>
            <dl className="grid gap-x-8 border-t border-slate-100 px-5 py-2 sm:grid-cols-2 xl:grid-cols-3">
              {otherIndustries.map((item) => <div key={item.name} className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 text-[13px] leading-5">
                <dt className="min-w-0 break-words text-slate-600">{item.name}</dt>
                <dd className="shrink-0 font-semibold text-slate-900 tabular-nums">{number(item.count)}</dd>
              </div>)}
            </dl>
          </details>}
        </div>}
  </details>;
}
