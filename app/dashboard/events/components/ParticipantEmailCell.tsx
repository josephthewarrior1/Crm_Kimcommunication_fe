import type { DatabaseEmail } from '../../../../lib/types';
import type { EventColumnConfig } from '../utils/columnConfigHelper';
import { getOfficeEmail, getPersonalEmail } from '../utils/notesHelper';

interface ParticipantEmailCellProps {
  emails?: DatabaseEmail[] | null;
  columnConfig: Pick<EventColumnConfig, 'officeEmail' | 'personalEmail'>;
}

export function ParticipantEmailCell({ emails, columnConfig }: ParticipantEmailCellProps) {
  const showOffice = columnConfig.officeEmail !== false;
  const showPersonal = columnConfig.personalEmail !== false;
  if (!showOffice && !showPersonal) return null;

  const office = showOffice ? getOfficeEmail(emails).split(',')[0].trim() : '';
  const personal = showPersonal ? getPersonalEmail(emails).split(',')[0].trim() : '';
  const hasOffice = Boolean(office && office !== '-');
  const showPersonalLabel = !hasOffice && Boolean(personal && personal !== '-');

  return (
    <td className="w-[13%] min-w-28 px-3 py-2.5 text-[13px] text-slate-600 [overflow-wrap:anywhere]">
      {hasOffice ? office : personal || '-'}
      {showPersonalLabel && <span className="ml-1.5 text-xs font-medium text-slate-500">Personal</span>}
    </td>
  );
}
