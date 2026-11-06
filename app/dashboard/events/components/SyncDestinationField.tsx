import React from 'react';

export type SyncDestination = 'company' | 'participant' | '';

export function SyncDestinationField({ value, onChange, required = true, disabled = false }: {
  value: SyncDestination;
  onChange: (value: SyncDestination) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return <div>
    <label htmlFor="event-sync-destination" className="mb-1.5 block text-sm font-semibold text-slate-700">Jenis event {required ? '*' : ''}</label>
    <select id="event-sync-destination" aria-describedby="event-sync-destination-help" value={value} onChange={event => onChange(event.target.value as SyncDestination)} required={required} disabled={disabled}
      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:text-slate-500">
      <option value="">Pilih jenis event</option>
      <option value="company">Korporat — Database Perusahaan</option>
      <option value="participant">Peserta / Publik — Database Peserta</option>
    </select>
    <p id="event-sync-destination-help" className="mt-1.5 text-xs leading-5 text-slate-500">Tentukan sejak awal. Semua import dan sync mengikuti jenis event ini, bukan domain email. Jenis event tidak bisa diganti setelah ada kontak.</p>
  </div>;
}
