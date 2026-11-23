import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { FileText } from 'lucide-react';
import type { EventParticipant } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';

const noteTags = /\[(?:PIC:\s*[^\]]+|Origin:\s*(?:Request|EMS Sync)|PreEventApproval:\s*[^\]]+|EMS|TIKUS|TAKEOUT|Opt-Out)\]/gi;

export function ParticipantNotesCell({ participant, onSaved, onSavingChange, disabled = false }: {
  participant: EventParticipant;
  onSaved?: (participantId: number, notes: string) => void;
  onSavingChange?: (saving: boolean) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const currentNotes = participant.notes || '';
  const value = currentNotes.replace(noteTags, '').trim();
  const { firstName, lastName } = participant.database;
  const name = [firstName, lastName].filter(Boolean).join(' ').trim() || 'peserta';
  const label = `Edit Notes — ${name}`;

  useEffect(() => {
    if (draft === null && !saving && restoreFocus.current) {
      trigger.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [draft, saving]);

  const close = () => {
    setError('');
    restoreFocus.current = true;
    setDraft(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (draft === null || saving || disabled || !onSaved) return;
    const next = draft.replace(noteTags, '').trim();
    if (next === value) {
      close();
      return;
    }
    setSaving(true);
    onSavingChange?.(true);
    setError('');
    try {
      const notes = [...(currentNotes.match(noteTags) || []), next].filter(Boolean).join(' ');
      await crmService.updateParticipantStatus(participant.id, undefined, undefined, notes);
      onSaved(participant.id, notes);
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Catatan gagal disimpan. Coba lagi.');
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          Catatan peserta
        </h4>
        {draft === null && onSaved && (
          <button type="button" ref={trigger} aria-label={label} disabled={disabled} onClick={() => setDraft(value)}
            className="min-h-8 !rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
            {value ? 'Ubah catatan' : 'Tambah catatan'}
          </button>
        )}
      </div>
      {draft === null ? (value || !onSaved) && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">{value || 'Belum ada catatan'}</p>
      ) : (
        <form aria-label={label} onSubmit={save} className="mt-3 space-y-2"
          onKeyDown={event => { if (event.key === 'Escape' && !saving) close(); }}>
          <textarea aria-label="Notes" autoFocus rows={2} value={draft} readOnly={saving || disabled}
            onChange={event => setDraft(event.target.value)}
            className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-blue-500" />
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || disabled} className="rounded-md bg-blue-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            <button type="button" disabled={saving} onClick={close} className="rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50">Batal</button>
          </div>
        </form>
      )}
    </section>
  );
}
