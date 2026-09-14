import React from 'react';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { AppUser } from '../../../../lib/types';

interface EventPicPanelProps {
  users: AppUser[];
  status: 'loading' | 'ready' | 'error';
  onRetry: () => void;
  onManage?: () => void;
}

export function EventPicPanel({ users, status, onRetry, onManage }: EventPicPanelProps) {
  return (
    <section aria-labelledby="event-pic-title" className="mb-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="event-pic-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users aria-hidden="true" className="h-4 w-4 text-blue-600" />PIC event
            {status === 'ready' && <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{users.length}</span>}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Tim yang ditugaskan menangani event ini.</p>
        </div>
        {onManage && (
          <button type="button" onClick={onManage} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />Kelola PIC
          </button>
        )}
      </div>

      {status === 'loading' ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-blue-600" />Memuat PIC event...</p>
      ) : status === 'error' ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2.5">
          <p className="text-sm text-amber-800">Daftar PIC belum berhasil dimuat.</p>
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />Coba lagi</button>
        </div>
      ) : users.length === 0 ? (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">Belum ada PIC yang ditugaskan.{onManage ? ' Pilih Kelola PIC untuk menambahkan penanggung jawab.' : ' Hubungi admin untuk menambahkan penanggung jawab.'}</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {users.map(person => {
            const name = person.fullName || person.username;
            return (
              <li key={person.id} className="flex min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800">{name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-900">{name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{person.roles?.includes('ADMIN') ? 'Admin' : 'PIC'}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
