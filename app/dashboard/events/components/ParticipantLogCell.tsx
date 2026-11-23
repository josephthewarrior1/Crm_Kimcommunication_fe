import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, ChevronDown, Mail, MessageCircle, Phone, Plus } from 'lucide-react';
import { crmService } from '../../../../lib/services/crmService';
import type { EventParticipant } from '../../../../lib/types';

const channels = {
  CALL: { label: 'Call', name: 'Call Log', defaultNote: 'Call log added', icon: Phone },
  EMAIL: { label: 'Email', name: 'Email Log', defaultNote: 'Email log added', icon: Mail },
  WHATSAPP: { label: 'WhatsApp', name: 'WhatsApp Log', defaultNote: 'WhatsApp log added', icon: MessageCircle },
} as const;

type Channel = keyof typeof channels;
const channelTypes = Object.keys(channels) as Channel[];

interface ParticipantLogCellProps {
  participant: EventParticipant;
  onLogged?: () => void;
  onSavingChange?: (saving: boolean) => void;
  disabled?: boolean;
}

export function ParticipantLogCell({ participant, onLogged, onSavingChange, disabled = false }: ParticipantLogCellProps) {
  const [channel, setChannel] = useState<Channel>('CALL');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ saved: boolean; message: string } | null>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const ChannelIcon = channels[channel].icon;

  const { firstName, lastName } = participant.database;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'peserta';

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || disabled) return;
    const { name: channelName, defaultNote } = channels[channel];
    setSaving(true);
    onSavingChange?.(true);
    setResult(null);

    try {
      await crmService.addEventParticipantActivity(participant.id, {
        activityType: channel,
        status: 'COMPLETED',
        notes: note.trim() || defaultNote,
      });
    } catch (error) {
      setResult({ saved: false, message: error instanceof Error ? error.message : 'Log gagal disimpan. Coba lagi.' });
      return;
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }

    setNote('');
    setResult({ saved: true, message: `${channelName} tersimpan.` });
    noteInput.current?.focus({ preventScroll: true });
    onLogged?.();
  };

  return (
    <form aria-label={`Catat aktivitas ${name}`} aria-busy={saving} onSubmit={save} className="grid gap-4 lg:grid-cols-[minmax(8rem,0.62fr)_minmax(0,1.38fr)] lg:gap-x-3">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Jenis log</span>
        <span className="relative mt-1.5 block">
          <ChannelIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#2454df]" />
          <select
            value={channel}
            disabled={saving || disabled}
            onChange={event => {
              setChannel(event.target.value as Channel);
              setResult(null);
            }}
            className="block w-full cursor-pointer appearance-none !min-h-11 !rounded-xl !border-slate-200 !bg-[#f5f8fc] !pl-9 !pr-9 !text-[13px] !font-medium !text-slate-900 focus:!border-[#2454df] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454df] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {channelTypes.map(type => <option key={type} value={type}>{channels[type].label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500" />
        </span>
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Catatan</span>{' '}
        <span className="text-xs font-normal text-slate-500">(opsional)</span>
        <textarea
          ref={noteInput}
          rows={3}
          value={note}
          placeholder="Misalnya, tertarik dan minta dikirim undangan."
          readOnly={saving || disabled}
          onChange={event => {
            setNote(event.target.value);
            if (result) setResult(null);
          }}
          className="mt-1.5 block w-full resize-y !min-h-[90px] !rounded-xl !border-slate-200 !bg-[#f5f8fc] !px-3 !py-2.5 !text-[13px] !font-normal !leading-5 placeholder:text-slate-500 focus:!border-[#2454df] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454df]"
        />
      </label>
      <div className="space-y-2 lg:col-span-2">
        <button type="submit" disabled={saving || disabled} className="inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-xl bg-[#2454df] px-4 text-sm font-semibold text-white !shadow-md !shadow-blue-700/20 hover:bg-[#1d46bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2454df] disabled:opacity-60">
          {!saving && <Plus aria-hidden="true" className="size-4 shrink-0" />}
          {saving ? 'Menyimpan…' : 'Simpan log'}
        </button>
        {result && <p role={result.saved ? 'status' : 'alert'} className={`flex min-w-0 items-center justify-center gap-1.5 text-xs font-medium ${result.saved ? 'text-emerald-800' : 'text-red-700'}`}>
          {result.saved && <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />}
          {result.message}
        </p>}
      </div>
    </form>
  );
}
