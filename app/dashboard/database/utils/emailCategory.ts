import type { Database, DatabaseEmail } from '../../../../lib/types';
import { isPublicPersonalEmail } from '../../events/utils/notesHelper';

export const isValidContactEmail = (address?: string | null): boolean =>
  /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/.test(address?.trim() || '');

export const isPersonalContactEmail = (address?: string | null): boolean =>
  isValidContactEmail(address) && isPublicPersonalEmail(address?.trim() || '');

export const isParticipantProfile = (contact: Pick<Database, 'databaseDestination'>, destination?: 'company' | 'participant'): boolean =>
  destination ? destination === 'participant' : contact.databaseDestination === 'participant';

export const isCompanyContactEmail = (email: DatabaseEmail): boolean =>
  isValidContactEmail(email.email) && !isPersonalContactEmail(email.email)
  && (email.isCorporate || email.emailType?.toLowerCase() === 'company');
