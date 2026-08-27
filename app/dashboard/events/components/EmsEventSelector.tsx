import React, { useEffect, useId, useState } from 'react';

interface EmsEventSelectorProps {
  events: { id: number; name: string }[];
  value: number;
  onChange: (value: number) => void;
}

const formatOptionLabel = (event: { id: number; name: string }) => `[ID: ${event.id}] ${event.name}`;

export const EmsEventSelector: React.FC<EmsEventSelectorProps> = ({
  events,
  value,
  onChange
}) => {
  const listId = useId();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!value) {
      setInputValue('');
      return;
    }

    const matchedEvent = events.find((event) => event.id === value);
    setInputValue(matchedEvent ? formatOptionLabel(matchedEvent) : String(value));
  }, [events, value]);

  const syncValue = (rawValue: string) => {
    setInputValue(rawValue);

    const trimmed = rawValue.trim();
    if (!trimmed) {
      onChange(0);
      return;
    }

    const matchedByLabel = events.find((event) => formatOptionLabel(event).toLowerCase() === trimmed.toLowerCase());
    if (matchedByLabel) {
      onChange(matchedByLabel.id);
      return;
    }

    const matchedByName = events.find((event) => event.name.toLowerCase() === trimmed.toLowerCase());
    if (matchedByName) {
      onChange(matchedByName.id);
      return;
    }

    const numericValue = Number(trimmed.replace(/[^\d]/g, ''));
    if (!Number.isNaN(numericValue) && numericValue > 0) {
      onChange(numericValue);
    }
  };

  return (
    <div className="space-y-1.5">
      <input
        list={listId}
        type="text"
        placeholder="Cari nama event EMS atau ketik ID..."
        value={inputValue}
        onChange={(e) => syncValue(e.target.value)}
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
