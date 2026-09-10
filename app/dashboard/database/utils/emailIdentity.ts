import type { Database, DatabaseEmail } from '../../../../lib/types';

export function findPersonalEmailConflicts(contact: Database, email: DatabaseEmail, contacts: Database[]): Database[] {
  const address = email.email?.trim().toLowerCase();
  if (!address) return [];
  const personal = email.emailType?.toLowerCase() === 'personal';
  return contacts.filter(other => other.id !== contact.id && other.isActive
    && (other.firstName !== contact.firstName || other.lastName !== contact.lastName)
    && other.emails?.some(candidate => candidate.email?.trim().toLowerCase() === address
      && (personal || candidate.emailType?.toLowerCase() === 'personal')));
}
