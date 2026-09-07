'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { crmService } from '../../../lib/services/crmService';

type CleanerItem = {
  rule: string;
  id?: number | string;
  ids?: Array<number | string>;
  names?: string[];
  email?: string;
  from?: unknown;
  to?: unknown;
  groupIds?: Array<number | string>;
  sampleCompanies?: string[];
};

type CleanerResult = {
  mode: 'preview' | 'apply';
  fixCount: number;
  reviewCount: number;
  fixes: CleanerItem[];
  reviews: CleanerItem[];
};

const ruleLabels: Record<string, string> = {
  group_name_trim: 'Rapihin nama group',
  company_name_trim: 'Rapihin nama company',
  brand_name_trim: 'Rapihin brand',
  industry_trim: 'Rapihin industry',
  city_trim: 'Rapihin city',
  website_trim: 'Rapihin website',
  email_lower_trim: 'Lowercase email',
  email_domain_fill: 'Isi domain email',
  public_email_type_personal: 'Email public jadi personal',
  public_email_not_corporate: 'Email public bukan corporate',
  corporate_email_type_company: 'Email kantor jadi company',
  corporate_email_is_corporate: 'Email kantor jadi corporate',
  email_case_duplicate_needs_manual_merge: 'Duplicate email beda kapital',
  possible_duplicate_groups: 'Kemungkinan duplicate group',
  placeholder_group_needs_manual_grouping: 'Group placeholder perlu dibagi',
};

export default function DataCleanerPage() {
  const [result, setResult] = useState<CleanerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const groupedFixes = useMemo(() => {
    const counts = new Map<string, number>();
    result?.fixes?.forEach((item) => counts.set(item.rule, (counts.get(item.rule) || 0) + 1));
    return Array.from(counts.entries()).map(([rule, count]) => ({ rule, count }));
  }, [result]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(await crmService.previewDataCleaner());
    } catch (err: any) {
      setError(err?.message || 'Gagal load preview cleaner');
    } finally {
      setLoading(false);
    }
  };

  const applyCleaner = async () => {
    if (!confirm('Apply cleaner ke database local sekarang?')) return;
    try {
      setApplying(true);
      setError('');
      const applied = await crmService.applyDataCleaner();
      setResult(applied);
      await loadPreview();
    } catch (err: any) {
      setError(err?.message || 'Gagal apply cleaner');
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Maintenance</p>
          <h1 className="mt-2 text-3xl font-black text-blue-950">Data Cleaner</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Preview dulu perubahan aman, lalu apply ke database local.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPreview}
            disabled={loading || applying}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={applyCleaner}
            disabled={loading || applying || !result || result.fixCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Apply Cleaner
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Auto Fix" value={result?.fixCount ?? 0} icon={<Wand2 className="h-5 w-5" />} tone="blue" />
        <SummaryCard label="Manual Review" value={result?.reviewCount ?? 0} icon={<AlertTriangle className="h-5 w-5" />} tone="amber" />
        <SummaryCard label="Status" value={result?.fixCount === 0 ? 'Clean' : 'Need Apply'} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-blue-100 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-blue-950">Auto Fix Preview</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Perubahan ini aman untuk di-apply otomatis.</p>
            <div className="mt-5 space-y-3">
              {groupedFixes.length === 0 ? (
                <EmptyState text="Tidak ada auto-fix tersisa." />
              ) : (
                groupedFixes.map((item) => (
                  <div key={item.rule} className="flex items-center justify-between rounded-xl border border-blue-50 bg-blue-50/40 px-4 py-3">
                    <span className="text-sm font-bold text-slate-800">{ruleLabels[item.rule] || item.rule}</span>
                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-black text-white">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-blue-950">Manual Review</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Ini sengaja tidak diubah otomatis karena perlu keputusan.</p>
            <div className="mt-5 space-y-3">
              {result?.reviews?.length ? result.reviews.map((item, index) => (
                <ReviewRow key={`${item.rule}-${index}`} item={item} onChanged={loadPreview} />
              )) : <EmptyState text="Tidak ada review manual." />}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone: 'blue' | 'amber' | 'green' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-blue-950">{value}</p>
    </div>
  );
}

function ReviewRow({ item, onChanged }: { item: CleanerItem; onChanged: () => Promise<void> }) {
  const [targetId, setTargetId] = useState<string>(() => String(item.ids?.[0] || ''));
  const [merging, setMerging] = useState(false);
  const title = ruleLabels[item.rule] || item.rule;
  const detail = item.names?.join(', ') || item.email || item.sampleCompanies?.join(', ') || '-';
  const ids = item.ids || item.groupIds || (item.id ? [item.id] : []);
  const canMergeGroups = item.rule === 'possible_duplicate_groups' && item.ids && item.ids.length > 1;

  const mergeGroups = async () => {
    const numericTarget = Number(targetId);
    const sourceIds = (item.ids || []).map(Number).filter((id) => id !== numericTarget);
    if (!numericTarget || sourceIds.length === 0) return;
    if (!confirm(`Merge group lain ke target ID ${numericTarget}?`)) return;

    try {
      setMerging(true);
      await crmService.mergeCleanerGroups(numericTarget, sourceIds);
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Gagal merge group');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-black text-slate-900">{title}</p>
          <p className="mt-1 break-words text-sm font-medium text-slate-600">{detail}</p>
        </div>
        {ids.length > 0 && (
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
            ID {ids.join(', ')}
          </span>
        )}
      </div>
      {canMergeGroups && (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
          <select
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="min-h-10 flex-1 rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
          >
            {item.ids!.map((id, index) => (
              <option key={String(id)} value={String(id)}>
                Jadikan utama: {item.names?.[index] || `Group ${id}`} (ID {id})
              </option>
            ))}
          </select>
          <button
            onClick={mergeGroups}
            disabled={merging}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {merging ? 'Merging...' : 'Merge Group'}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-blue-100 bg-blue-50/30 px-4 py-8 text-center text-sm font-bold text-slate-400">
      {text}
    </div>
  );
}
