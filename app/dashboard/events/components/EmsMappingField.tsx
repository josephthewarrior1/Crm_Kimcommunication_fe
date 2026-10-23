'use client';

import { useEffect, useId, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { crmService } from '../../../../lib/services/crmService';
import type { EmsSource } from '../../../../lib/types';
import { EmsEventSelector } from './EmsEventSelector';

export function EmsMappingField({ source, onSourceChange, eventId, onEventIdChange }: {
  source: EmsSource; onSourceChange: (value: EmsSource) => void;
  eventId: number; onEventIdChange: (value: number) => void;
}) {
  const sourceId = useId();
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<{ source: EmsSource; items: { id: number; name: string }[]; status: 'loading' | 'ready' | 'error'; error: string }>({ source, items: [], status: 'loading', error: '' });
  useEffect(() => {
    let active = true;
    setList({ source, items: [], status: 'loading', error: '' });
    crmService.getEmsEvents(source).then(items => {
      if (active) setList({ source, items, status: 'ready', error: '' });
    }).catch(error => {
      const message = error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Backend CRM belum dapat dihubungi. Daftar event akan dimuat setelah backend terhubung.';
      if (active) setList({ source, items: [], status: 'error', error: message });
    });
    return () => { active = false; };
  }, [source, revision]);
  const current = list.source === source;
  const ready = current && list.status === 'ready';
  const loading = !current || list.status === 'loading';
  return <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
    <legend className="px-1 text-sm font-semibold text-slate-700">Hubungkan ke EMS</legend>
    <div><label htmlFor={sourceId} className="mb-1.5 block text-xs font-medium text-slate-600">Sumber EMS</label>
      <select id={sourceId} value={source} onChange={event => { onEventIdChange(0); onSourceChange(event.target.value as EmsSource); }} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none">
        <option value="LEGACY">EMS Lama</option><option value="V2">EMS Baru (v2)</option>
      </select>
    </div>
    <EmsEventSelector key={source} events={ready ? list.items : []} value={eventId} onChange={onEventIdChange} disabled={source === 'V2' && !ready} ariaLabel={source === 'V2' ? 'Event EMS Baru' : 'Event EMS Lama'} />
    {loading && <p role="status" className="text-xs text-slate-500">Memuat event {source === 'V2' ? 'EMS Baru' : 'EMS Lama'}…</p>}
    {ready && list.items.length === 0 && <p role="status" className="text-xs text-slate-500">Belum ada event yang tersedia dari sumber ini.</p>}
    {current && list.status === 'error' && <div role="alert" className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800"><p>{list.error}</p><button type="button" onClick={() => setRevision(value => value + 1)} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw aria-hidden="true" className="h-3 w-3" />Coba lagi</button></div>}
    <p className="text-[11px] leading-5 text-slate-500">Sumber dipilih per event. Saat sumber diganti, pilih ulang event yang akan dihubungkan.</p>
  </fieldset>;
}
