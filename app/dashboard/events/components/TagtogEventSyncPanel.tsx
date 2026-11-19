'use client';

import { useEffect, useId, useState } from 'react';
import { Link2, RefreshCw } from 'lucide-react';
import { crmService } from '../../../../lib/services/crmService';
import type { CrmTagtogEventContext } from '../../../../lib/utils/tagtogDataSync';

type LoadState = { eventId: number; revision: number } & (
  { status: 'loading' | 'error' } | { status: 'ready'; value: CrmTagtogEventContext }
);

export function TagtogEventSyncPanel({ eventId, canManage }: { eventId: number; canManage: boolean }) {
  const titleId = useId();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<LoadState>({ eventId, revision: 0, status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    crmService.getTagtogEventContext(eventId, controller.signal).then(value => {
      if (!controller.signal.aborted) setState({ eventId, revision, status: 'ready', value });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ eventId, revision, status: 'error' });
    });
    return () => controller.abort();
  }, [eventId, revision]);
  const current = state.eventId === eventId && state.revision === revision;
  const loading = !current || state.status === 'loading';
  const context = current && state.status === 'ready' ? state.value : null;
  const changedAt = context?.linked ? new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta',
  }).format(new Date(context.updatedAt)) + ' WIB' : null;

  return <section aria-labelledby={titleId} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id={titleId} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Link2 aria-hidden="true" className="h-4 w-4 text-blue-600" />Hubungan data TAGTOG</h3>
      <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-wait disabled:opacity-50">
        <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />Muat ulang hubungan
      </button>
    </div>
    {loading ? <p role="status" className="mt-3 text-xs text-slate-500">Memuat sumber proyek dan event…</p>
      : current && state.status === 'error' ? <p role="alert" className="mt-3 text-xs leading-5 text-amber-800">Hubungan data belum dapat dimuat. Pilih Muat ulang hubungan untuk mencoba lagi.</p>
      : context?.linked ? <>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3"><dt className="text-slate-500">Proyek PMS asal</dt><dd className="mt-1 font-semibold text-slate-800">PMS #{context.pmsProjectId}</dd></div>
          <div className="rounded-lg bg-slate-50 p-3"><dt className="text-slate-500">Event dan peserta EMS</dt><dd className="mt-1 font-semibold text-slate-800">EMS #{context.emsEventId}</dd></div>
          <div className="rounded-lg bg-slate-50 p-3"><dt className="text-slate-500">Event CRM ini</dt><dd className="mt-1 font-semibold text-slate-800">CRM #{context.eventId}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">Data terhubung diperbarui: <strong className="font-medium text-slate-600">{changedAt}</strong>. Waktu ini menunjukkan perubahan terakhir pada hubungan data.</p>
      </> : <p className="mt-3 text-xs leading-5 text-slate-600">Event ini belum terhubung ke proyek PMS dan event EMS melalui TAGTOG. {canManage ? 'Pilih Sync melalui TAGTOG, lalu pilih proyek PMS dan tinjau tujuan event sebelum menyimpan.' : 'Minta admin kantor menghubungkan proyek dan event yang sesuai.'}</p>}
  </section>;
}
