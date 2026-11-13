import React, { useState } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Database, DatabaseEmail } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { getContactOrganization } from '../../../../lib/utils/companyBranch';
import { prepareContactEmailEntries } from '../../database/utils/emailInput';

interface EventContactEditorProps {
  database: Database;
  onSaved: (database: Database) => void;
  onSavingChange?: (saving: boolean) => void;
  onEditingChange?: (editing: boolean) => void;
}

const contactFields = [
  ['salutation', 'Salutation', 50], ['firstName', 'First Name', 255],
  ['lastName', 'Last Name', 255], ['positionLevel', 'Position', 100],
  ['specialityDivision', 'Division', 100], ['jobTitle', 'Job Title', 255],
] as const;
type ContactDraft = Record<typeof contactFields[number][0], string> & { mobilePhone: string };
const draftFrom = (database: Database): ContactDraft => ({
  salutation: database.salutation || '', firstName: database.firstName || '',
  lastName: database.lastName || '', positionLevel: database.positionLevel || '',
  specialityDivision: database.specialityDivision || '', jobTitle: database.jobTitle || '',
  mobilePhone: database.mobilePhone || '',
});

export const EventContactEditor: React.FC<EventContactEditorProps> = ({ database, onSaved, onSavingChange, onEditingChange }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(() => draftFrom(database));
  const [originalContact, setOriginalContact] = useState(() => draftFrom(database));
  const [emails, setEmails] = useState<Partial<DatabaseEmail>[]>([]);
  const [originalEmails, setOriginalEmails] = useState<DatabaseEmail[]>([]);

  const openEditor = async () => {
    setLoading(true);
    setError('');
    try {
      const savedEmails = await crmService.getDatabaseEmails(database.id);
      setDraft(draftFrom(database));
      setOriginalContact(draftFrom(database));
      setOriginalEmails(savedEmails);
      setEmails(savedEmails.map(email => ({ ...email })));
      setEditing(true);
      onEditingChange?.(true);
    } catch {
      setError('Data email belum berhasil dimuat. Coba buka editor lagi.');
    } finally { setLoading(false); }
  };

  const saveContact = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    onSavingChange?.(true);
    try {
      const destination = database.databaseDestination === 'participant' ? 'participant' : 'company';
      const changedEmails = emails.filter(email => {
        const original = originalEmails.find(saved => saved.id === email.id);
        return original ? email.email !== original.email || email.emailType !== original.emailType
          : Boolean(email.email?.trim());
      }).flatMap(email => prepareContactEmailEntries(email.email || '', {
        id: email.id, emailType: email.emailType || 'personal',
        isCorporate: email.emailType === 'company',
        isPrimary: email.isPrimary ?? false, isVerified: email.isVerified ?? false,
      }, destination));
      // Email removal stays in Database; an empty field must not silently delete an address.
      if (emails.some(email => email.id && !email.email?.trim())) throw new Error('Email tersimpan tidak boleh dikosongkan. Penghapusan email dilakukan dari menu Database.');
      const changes: Partial<ContactDraft> = {};
      for (const field of Object.keys(draft) as (keyof ContactDraft)[]) {
        if (draft[field] !== originalContact[field]) changes[field] = draft[field];
      }
      if (changes.mobilePhone !== undefined) {
        changes.mobilePhone = changes.mobilePhone.trim();
      }
      const updated = await crmService.updateDatabaseContact(database.id, { ...changes, emails: changedEmails });
      setEditing(false);
      onEditingChange?.(false);
      onSaved(updated);
      toast.success('Data kontak berhasil disimpan.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Data kontak gagal disimpan. Coba lagi.');
    } finally { setSaving(false); onSavingChange?.(false); }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-slate-900 text-sm">Data kontak</h4>
        {!editing && <button type="button" onClick={openEditor} disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />} Edit data kontak
        </button>}
      </div>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 break-words">{error}</p>}
      {editing && <form onSubmit={saveContact} className="space-y-3">
        <p className="text-xs text-slate-600">Tersimpan ke profil Database yang terhubung, termasuk event lain yang memakai profil ini. Status event disimpan terpisah.</p>
        <p className="text-xs text-slate-600 break-words"><strong>Perusahaan / institusi:</strong> {getContactOrganization(database).companyName || '-'} <span className="block text-slate-500">Perubahan perusahaan/cabang melalui menu Database.</span></p>
        <fieldset disabled={saving} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contactFields.map(([field, label, maxLength]) => <label key={field} className="text-xs text-slate-600">
              {label}{field === 'positionLevel' ? <select value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-slate-900">
                <option value="">Belum diisi</option><option value="C-level//GM/Director">C-level / GM / Director</option>
                <option value="Manajerial/Head">Manajerial / Head</option><option value="Staff">Staff</option><option value="unknown">Unknown</option>
              </select> : <input value={draft[field]} maxLength={maxLength} onChange={event => setDraft({ ...draft, [field]: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-slate-900" />}
            </label>)}
          </div>
          <label className="block text-xs text-slate-600">HP / WhatsApp
            <input value={draft.mobilePhone} onChange={event => setDraft({ ...draft, mobilePhone: event.target.value })}
              placeholder="081234567890, 081298765432" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-slate-900" />
            <span className="mt-1 block text-slate-500">Pisahkan dua nomor dengan koma. Kolom yang belum lengkap boleh diisi nanti.</span>
          </label>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Email</p>
            {emails.map((email, index) => <div key={email.id ?? `new-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
              <input aria-label={`Email ${index + 1}`} value={email.email || ''} onChange={event => setEmails(emails.map((item, i) => i === index ? { ...item, email: event.target.value } : item))}
                className="min-w-0 rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900" />
              <select aria-label={`Tipe email ${index + 1}`} value={email.emailType || 'other'} onChange={event => setEmails(emails.map((item, i) => i === index ? { ...item, emailType: event.target.value } : item))}
                className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900">
                <option value="company">Company</option><option value="personal">Personal</option><option value="other">Other</option>
              </select>
            </div>)}
            <button type="button" onClick={() => setEmails([...emails, { email: '', emailType: 'personal' }])} className="flex items-center gap-1 text-xs font-semibold text-blue-700"><Plus className="w-3.5 h-3.5" /> Tambah email</button>
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={() => { setEditing(false); setError(''); onEditingChange?.(false); }} className="ms-modal-secondary text-xs">Batal edit kontak</button>
          <button type="submit" disabled={saving} className="ms-modal-primary flex items-center gap-1.5 text-xs disabled:opacity-50">{saving && <Loader2 className="w-3 h-3 animate-spin" />} Simpan data kontak</button>
        </div>
      </form>}
    </section>
  );
};
