import React, { useEffect, useState } from 'react';
import { AlertCircle, Building2, Loader2, MapPin, Phone, RotateCw } from 'lucide-react';
import { CompanyBranch } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';

export function useCompanyBranches(companyId: string, branchId: string) {
  const [result, setResult] = useState<{ companyId: string; items: CompanyBranch[]; status: 'loading' | 'ready' | 'error' }>({ companyId: '', items: [], status: 'ready' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController();
    setResult({ companyId, items: [], status: 'loading' });
    crmService.getCompanyBranches(Number(companyId), controller.signal).then(items => {
      if (!controller.signal.aborted) setResult({ companyId, items, status: 'ready' });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ companyId, items: [], status: 'error' });
    });
    return () => controller.abort();
  }, [companyId, attempt]);

  const current = result.companyId === companyId;
  const loading = !!companyId && (!current || result.status === 'loading');
  const error = !!companyId && current && result.status === 'error';
  const branches = companyId && current ? result.items : [];
  const selectedBranch = branches.find(branch => branch.id.toString() === branchId && branch.companyId.toString() === companyId);
  const valid = !loading && !error && (!branchId || !!selectedBranch);
  const retry = () => {
    setResult({ companyId, items: [], status: 'loading' });
    setAttempt(value => value + 1);
  };
  return { branches, selectedBranch, loading, error, valid, retry };
}

interface CompanyBranchSelectProps {
  companyId: string;
  value: string;
  onChange: (value: string) => void;
  selection: ReturnType<typeof useCompanyBranches>;
  initialBranch?: CompanyBranch | null;
  creatingCompany?: boolean;
  disabled?: boolean;
}

export function CompanyBranchSelect({ companyId, value, onChange, selection, initialBranch, creatingCompany, disabled }: CompanyBranchSelectProps) {
  const { branches, selectedBranch, loading, error, valid, retry } = selection;
  const shownBranch = selectedBranch || (initialBranch?.id.toString() === value && initialBranch.companyId.toString() === companyId ? initialBranch : undefined);
  return (
    <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label htmlFor="database-company-branch" className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Building2 className="h-4 w-4 text-slate-500" />
        Cabang / Kantor <span className="text-xs font-normal text-slate-500">(Opsional)</span>
      </label>
      <select
        id="database-company-branch"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled || !companyId || creatingCompany || loading || error}
        aria-invalid={!!value && !loading && !error && !valid}
        aria-describedby="database-company-branch-help"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-500"
      >
        <option value="">Tanpa cabang / Kantor pusat</option>
        {!!value && !selectedBranch && <option value={value}>{shownBranch?.name || 'Cabang tersimpan'}{!loading && !error ? ' (tidak tersedia)' : ''}</option>}
        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.city ? ` · ${branch.city}` : ''}</option>)}
      </select>
      <div id="database-company-branch-help" className="mt-2 text-xs text-slate-500">
        {creatingCompany ? <p>Tambahkan cabang melalui Company Details setelah perusahaan dibuat.</p>
          : !companyId ? <p>Pilih perusahaan untuk melihat cabang atau kantornya.</p>
            : loading ? <p role="status" className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat cabang perusahaan...</p>
              : error ? <div role="alert" className="flex flex-wrap items-center gap-2 text-red-600"><AlertCircle className="h-3.5 w-3.5" /><span>Cabang belum bisa dimuat. Pilihan tersimpan tetap dipertahankan.</span><button type="button" onClick={retry} disabled={disabled} className="inline-flex items-center gap-1 font-semibold underline"><RotateCw className="h-3.5 w-3.5" /> Coba lagi</button></div>
                : !valid ? <p role="alert" className="text-red-600">Cabang ini tidak tersedia untuk perusahaan yang dipilih. Pilih cabang lain atau tanpa cabang.</p>
                  : <p>{branches.length ? 'Pilih lokasi kontak. Data cabang dikelola melalui Company Details.' : 'Belum ada cabang. Kontak memakai informasi kantor pusat; cabang dapat ditambahkan di Company Details.'}</p>}
      </div>
      {shownBranch && (
        <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">{shownBranch.name}</p>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{[shownBranch.address, shownBranch.city, shownBranch.postalCode].filter(Boolean).join(', ') || 'Alamat cabang belum diisi'}</span></p>
          {shownBranch.officePhone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{shownBranch.officePhone}</p>}
        </div>
      )}
    </div>
  );
}
