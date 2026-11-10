import type { DatabaseEmail } from '../../../../lib/types';
import { isPersonalContactEmail, isValidContactEmail } from './emailCategory';

export const splitContactEmails = (value: string): string[] =>
  Array.from(new Set(value.trim().split(/[,;/\s]+/).map(address => address.toLowerCase()).filter(Boolean)));

export const getEmailInputError = (value: string, emailType: string, destination: 'company' | 'participant'): string => {
  if (!value.trim()) return '';
  const addresses = splitContactEmails(value);
  if (!addresses.length || addresses.some(address => !isValidContactEmail(address))) {
    return 'Format email tidak valid. Pisahkan setiap alamat dengan koma, titik koma, atau spasi.';
  }
  if (destination === 'company' && emailType === 'company' && addresses.some(isPersonalContactEmail)) {
    return 'Company Email wajib memakai domain perusahaan/institusi. Simpan email pribadi sebagai Personal Email.';
  }
  return '';
};

export const prepareContactEmailEntries = (
  value: string,
  metadata: Omit<Partial<DatabaseEmail>, 'email'>,
  destination: 'company' | 'participant',
): Partial<DatabaseEmail>[] => {
  const error = getEmailInputError(value, metadata.isCorporate ? 'company' : metadata.emailType || 'other', destination);
  if (error) throw new Error(error);
  return splitContactEmails(value).map((email, index) => ({
    ...metadata,
    id: index === 0 ? metadata.id : undefined,
    email,
    ...(metadata.isPrimary === undefined ? {} : { isPrimary: metadata.isPrimary && index === 0 }),
  }));
};
