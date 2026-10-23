import React, { useEffect, useId, useState } from 'react';

interface EmsEventSelectorProps {
  events: { id: number; name: string }[];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const formatOptionLabel = (event: { id: number; name: string }) => `[ID: ${event.id}] ${event.name}`;

export function resolveEmsEventId(rawValue: string, events: { id: number; name: string }[]): number {
  const trimmed = rawValue.trim();
  const matchedByLabel = events.find(event => formatOptionLabel(event).toLowerCase() === trimmed.toLowerCase());
  if (matchedByLabel) return matchedByLabel.id;
  const matchedByName = events.filter(event => event.name.toLowerCase() === trimmed.toLowerCase());
  if (matchedByName.length === 1) return matchedByName[0].id;
  const numericValue = /^[1-9]\d*$/.test(trimmed) ? Number(trimmed) : 0;
  return Number.isSafeInteger(numericValue) ? numericValue : 0;
}

export const EmsEventSelector: React.FC<EmsEventSelectorProps> = ({
  events,
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Event EMS'
}) => {
  const listId = useId();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!value) {
      return;
    }

    const matchedEvent = events.find((event) => event.id === value);
    setInputValue(matchedEvent ? formatOptionLabel(matchedEvent) : String(value));
  }, [events, value]);

  return (
    <div className="space-y-1.5">
      <input
        list={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        type="text"
        placeholder="Cari nama event EMS atau ketik ID..."
        value={inputValue}
        onChange={(event) => {
          const rawValue = event.currentTarget.value;
          const id = resolveEmsEventId(rawValue, events);
          event.currentTarget.setCustomValidity(rawValue.trim() && !id ? 'Pilih event dari daftar atau isi ID berupa angka positif.' : '');
          setInputValue(rawValue);
          onChange(id);
        }}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
      />
      <datalist id={listId}>
        {events.map((event) => (
          <option key={event.id} value={formatOptionLabel(event)} />
        ))}
      </datalist>
      <p className="text-[11px] text-slate-500">
        Ketik nama event EMS untuk search cepat, atau isi ID langsung kalau sudah tahu.
      </p>
    </div>
  );
};
