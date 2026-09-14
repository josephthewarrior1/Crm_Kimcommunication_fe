import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Building2, Check, Loader2, MapPin, Pencil, Phone, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyBranch, Database } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { useAuth } from '../../../../lib/context/AuthContext';

interface CompanyBranchesPanelProps {
  companyId: number;
  companyName: string;
  contacts: Database[];
  contactsLoading?: boolean;
  contactsError?: boolean;
  onBranchesChange: (branches: CompanyBranch[]) => void;
}

const emptyForm = { name: '', address: '', city: '', postalCode: '', officePhone: '' };
const fieldClass = 'mt-1.5 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

export const CompanyBranchesPanel = ({ companyId, companyName, contacts, contactsLoading = false, contactsError = false, onBranchesChange }: CompanyBranchesPanelProps) => {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    crmService.getCompanyBranches(companyId, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        setBranches(data);
        onBranchesChange(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError('Data cabang belum dapat diakses. Silakan coba lagi dalam beberapa saat.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, retry, onBranchesChange]);

  const openForm = (branch?: CompanyBranch) => {
    setEditingId(branch?.id ?? null);
    setForm({ name: branch?.name || '', address: branch?.address || '', city: branch?.city || '', postalCode: branch?.postalCode || '', officePhone: branch?.officePhone || '' });
    setActionError('');
    setDeletingId(null);
    setFormOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || saving) return;
    const data = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as typeof emptyForm;
    if (!data.name) { setActionError('Nama cabang/kantor wajib diisi.'); return; }
    setSaving(true);
    setActionError('');
    try {
      const branch = editingId === null
        ? await crmService.createCompanyBranch(companyId, data)
        : await crmService.updateCompanyBranch(companyId, editingId, data);
      if (!mounted.current) return;
      const nextBranches = editingId === null ? [...branches, branch] : branches.map(item => item.id === editingId ? branch : item);
      setBranches(nextBranches);
      onBranchesChange(nextBranches);
      setFormOpen(false);
      toast.success(editingId === null ? 'Cabang berhasil ditambahkan.' : 'Cabang berhasil diperbarui.');
    } catch (error) {
      if (mounted.current) setActionError(error instanceof Error ? error.message : 'Cabang gagal disimpan. Coba lagi.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const handleDelete = async (branch: CompanyBranch) => {
    if (!canManage || saving || contacts.some(contact => contact.branch?.id === branch.id)) return;
    setSaving(true);
    setActionError('');
    try {
      await crmService.deleteCompanyBranch(companyId, branch.id);
      if (!mounted.current) return;
      const nextBranches = branches.filter(item => item.id !== branch.id);
      setBranches(nextBranches);
      onBranchesChange(nextBranches);
      setDeletingId(null);
      toast.success('Cabang berhasil dihapus.');
    } catch (error) {
      if (mounted.current) setActionError(error instanceof Error ? error.message : 'Cabang gagal dihapus. Coba lagi.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <section aria-labelledby="company-branches-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 id="company-branches-title" className="text-base font-semibold text-slate-900">Cabang & kantor</h3>
            {!loading && !loadError && <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs tabular-nums text-slate-600">{branches.length} lokasi</span>}
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">Kelola lokasi kantor {companyName}. Setiap cabang memiliki alamat dan kontak kantornya sendiri.</p>
        </div>
        {canManage && !formOpen && !loading && !loadError && (
          <button type="button" disabled={saving} onClick={() => openForm()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus aria-hidden="true" className="h-4 w-4" />Tambah cabang
          </button>
        )}
      </div>

      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-12 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-blue-600" />Memuat cabang...</div>
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div><p className="text-sm font-semibold text-slate-900">Cabang belum bisa dimuat</p><p className="mt-1.5 text-xs leading-5 text-slate-500">{loadError}</p></div>
          </div>
          <button type="button" onClick={() => setRetry(value => value + 1)} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-blue-600"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />Coba lagi</button>
        </div>
      ) : (
        <>
          {formOpen && canManage && (
            <form onSubmit={handleSave} className="overflow-hidden rounded-xl border border-blue-200 bg-white">
              <div className="flex items-start gap-3 border-b border-blue-100 bg-blue-50/50 px-4 py-4 sm:px-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-blue-100 bg-white text-blue-600">{editingId === null ? <Plus aria-hidden="true" className="h-4 w-4" /> : <Pencil aria-hidden="true" className="h-4 w-4" />}</span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900">{editingId === null ? 'Tambah cabang/kantor' : 'Edit cabang/kantor'}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Nama cabang wajib diisi. Detail lokasi dapat dilengkapi nanti.</p>
                </div>
              </div>
              <fieldset disabled={saving} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <label className="text-xs font-medium text-slate-700 sm:col-span-2">Nama cabang/kantor <span className="text-red-600">*</span>
                  <input required autoFocus maxLength={255} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Pademangan atau Bandung" className={fieldClass} />
                </label>
                <label className="text-xs font-medium text-slate-700 sm:col-span-2">Alamat
                  <textarea rows={2} value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} placeholder="Alamat lengkap kantor ini" className={`${fieldClass} resize-y`} />
                </label>
                <label className="text-xs font-medium text-slate-700">Kota
                  <input maxLength={100} value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} placeholder="Contoh: Jakarta Utara" className={fieldClass} />
                </label>
                <label className="text-xs font-medium text-slate-700">Kode pos
                  <input maxLength={20} value={form.postalCode} onChange={event => setForm({ ...form, postalCode: event.target.value })} inputMode="numeric" placeholder="Opsional" className={fieldClass} />
                </label>
                <label className="text-xs font-medium text-slate-700 sm:col-span-2">Telepon kantor
                  <input type="tel" maxLength={50} value={form.officePhone} onChange={event => setForm({ ...form, officePhone: event.target.value })} placeholder="Opsional" className={fieldClass} />
                </label>
              </fieldset>
              {actionError && <p role="alert" className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 sm:mx-5">{actionError}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                <button type="button" disabled={saving} onClick={() => { setFormOpen(false); setActionError(''); }} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-50">Batal</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-blue-600 disabled:opacity-50">
                  {saving ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Check aria-hidden="true" className="h-3.5 w-3.5" />}{saving ? 'Menyimpan...' : 'Simpan cabang'}
                </button>
              </div>
            </form>
          )}
          {branches.length === 0 && !formOpen ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-slate-50 text-slate-400"><Building2 aria-hidden="true" className="h-6 w-6" strokeWidth={1.5} /></span>
              <p className="text-sm font-semibold text-slate-700">Belum ada cabang/kantor</p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">Tambahkan cabang jika perusahaan memiliki beberapa lokasi. Kontak tetap bisa ditautkan langsung ke perusahaan.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {branches.map(branch => {
                const contactCount = contacts.filter(contact => contact.branch?.id === branch.id).length;
                return (
                  <article key={branch.id} className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white ${formOpen && editingId === branch.id ? 'border-blue-300' : 'border-slate-200'}`}>
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500"><Building2 aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} /></span>
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-semibold leading-6 text-slate-900">{branch.name}</h4>
                          <p className="mt-0.5 flex items-start gap-1 text-xs leading-5 text-slate-500"><MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{branch.city || 'Kota belum diisi'}</span></p>
                        </div>
                      </div>
                      <dl className="mt-5 space-y-4">
                        <div><dt className="mb-1 text-xs text-slate-500">Alamat kantor</dt><dd className={`whitespace-pre-wrap break-words text-sm leading-6 ${branch.address ? 'text-slate-700' : 'text-slate-400'}`}>{branch.address || 'Belum diisi'}{branch.postalCode && <span className="mt-1 block text-xs text-slate-500">Kode pos {branch.postalCode}</span>}</dd></div>
                        <div><dt className="mb-1 text-xs text-slate-500">Telepon kantor</dt><dd className={`flex items-start gap-2 text-sm leading-6 ${branch.officePhone ? 'text-slate-700' : 'text-slate-400'}`}><Phone aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="break-all tabular-nums">{branch.officePhone || 'Belum diisi'}</span></dd></div>
                      </dl>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                      <p className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{contactsLoading ? 'Memuat kontak...' : contactsError ? 'Jumlah kontak belum tersedia' : <><span className="font-semibold tabular-nums text-slate-700">{contactCount}</span> kontak aktif</>}</p>
                      {canManage && !formOpen && (
                        <div className="ml-auto flex shrink-0 items-center gap-1.5">
                          <button type="button" disabled={saving} onClick={() => openForm(branch)} aria-label={`Edit cabang ${branch.name}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-blue-600 disabled:opacity-40"><Pencil aria-hidden="true" className="h-3.5 w-3.5" />Edit</button>
                          <button type="button" disabled={saving || contactCount > 0} onClick={() => { setDeletingId(branch.id); setActionError(''); }} aria-label={`Hapus cabang ${branch.name}`} title={contactCount > 0 ? 'Pindahkan kontak dari cabang ini sebelum menghapus.' : 'Hapus cabang'} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                    {deletingId === branch.id && canManage && (
                      <div role="group" aria-label={`Konfirmasi hapus cabang ${branch.name}`} className="m-4 mt-0 rounded-lg border border-red-200 bg-red-50 p-3 sm:mx-5">
                        <p className="text-xs font-semibold leading-5 text-red-900">Hapus cabang {branch.name}?</p>
                        <p className="mt-1 text-xs leading-5 text-red-700">Cabang yang masih terhubung ke kontak tidak bisa dihapus.</p>
                        {actionError && <p role="alert" className="mt-2 text-xs leading-5 text-red-700">{actionError}</p>}
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button type="button" disabled={saving} onClick={() => { setDeletingId(null); setActionError(''); }} className="rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">Batal</button>
                          <button type="button" disabled={saving} onClick={() => handleDelete(branch)} className="inline-flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">{saving && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Hapus cabang</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};
