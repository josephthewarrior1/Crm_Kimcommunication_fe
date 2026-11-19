export interface RegistrationTimestampFields {
  readonly sourceRegisteredAt?: string | null;
  readonly requestedAt?: string | null;
  readonly createdAt?: string | null;
}

export interface RegistrationDateParts {
  date: string;
  time: string;
}

const SOURCE_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
const WIB = 'Asia/Jakarta';

function sourceInstant(value: string | null | undefined): Date | null {
  if (typeof value !== 'string') return null;
  const match = SOURCE_INSTANT.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || Number(hourText) > 23 || Number(minuteText) > 59 || Number(secondText) > 59
    || zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)) return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** Existing native CRM display, kept for rows without valid TAGTOG source provenance. */
function legacyRegistrationDate(dateStr?: string | null): RegistrationDateParts {
  if (!dateStr) return { date: '-', time: '' };
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return { date: dateStr.split('T')[0] || '-', time: '' };
  return {
    date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
  };
}

/** Render the original EMS instant once in WIB; never rewrite legacy CRM date fields. */
export function formatRegistrationDate(participant: RegistrationTimestampFields): RegistrationDateParts {
  const instant = sourceInstant(participant.sourceRegisteredAt);
  if (!instant) return legacyRegistrationDate(participant.requestedAt || participant.createdAt);
  return {
    date: new Intl.DateTimeFormat('id-ID', { timeZone: WIB, day: '2-digit', month: 'short', year: 'numeric' }).format(instant),
    time: new Intl.DateTimeFormat('id-ID', { timeZone: WIB, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant) + ' WIB',
  };
}
