'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../lib/context/AuthContext';
import { crmService } from '../../../lib/services/crmService';
import { DatabaseUploadTargetsResponse } from '../../../lib/types';

export default function DatabaseTargetWarning() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [data, setData] = useState<DatabaseUploadTargetsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    setData(null);
    setError(false);
    async function refresh() {
      if (document.visibilityState === 'hidden') return;
      const request = ++latestRequest;
      try {
        const result = await crmService.getMyDatabaseUploadTarget();
        if (active && request === latestRequest) { setData(result); setError(false); }
      } catch {
        if (active && request === latestRequest) { setData(null); setError(true); }
      }
    }
    void refresh();
    // Refresh after input/target changes and across tabs or server-day rollover.
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('database-targets-updated', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('database-targets-updated', refresh);
    };
  }, [user?.id, pathname]);

  if (error) return <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Status target input belum bisa diperiksa. Coba muat ulang halaman atau hubungi admin.</p>;
  const target = data?.items.find(row => row.userId === user?.id);
  if (!data || !target || target.targetCount === 0 || target.remainingCount <= 0) return null;
  const daily = target.targetMode === 'DAILY';

  return (
    <section role="status" aria-label="Peringatan target input database" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold">Target {daily ? 'hari ini' : 'bulan ini'} belum tercapai · kurang {target.remainingCount.toLocaleString()} data</p>
          <p className="mt-1 text-xs text-amber-800">Sudah masuk {target.progressCount.toLocaleString()} dari {target.targetCount.toLocaleString()} kontak baru lewat Excel / Add Database. {daily ? data.date : data.month} · {data.timeZone}</p>
        </div>
      </div>
      <Link href="/dashboard/database" className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">Isi database</Link>
    </section>
  );
}
