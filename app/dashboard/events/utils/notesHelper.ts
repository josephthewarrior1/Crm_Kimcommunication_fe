import type { EventParticipant } from '../../../../lib/types';

export const extractPicFromNotes = (notes: string | null | undefined): { pic: string; cleanNotes: string } => {
  if (!notes) return { pic: 'Admin', cleanNotes: '-' };
  let clean = notes;
  
  // Clean origin tags from display
  clean = clean.replace(/\[Origin:\s*Request\]/gi, '').replace(/\[Origin:\s*EMS Sync\]/gi, '').replace(/\[EMS\]/gi, '').trim();
  clean = clean.replace(/\[PreEventApproval:\s*[^\]]+\]/gi, '').trim();

  const picRegex = /^\[PIC:\s*([^\]]+)\]/;
  const match = clean.match(picRegex);
  if (match) {
    const pic = match[1].trim();
    const cleanNotes = clean.replace(picRegex, '').trim();
    return { pic, cleanNotes: cleanNotes || '-' };
  }
  return { pic: 'Admin', cleanNotes: clean || '-' };
};

export const extractPreEventApprovalStatus = (notes: string | null | undefined): string => {
  const match = notes?.match(/\[PreEventApproval:\s*([^\]]+)\]/i);
  const status = match?.[1]?.trim().toLowerCase();
  return status === 'approve' || status === 'decline' ? status : 'pending';
};

export const getPreEventApprovalStatus = (participant: Pick<EventParticipant, 'notes' | 'preEventApprovalStatus'> | null | undefined): string => {
  const status = participant?.preEventApprovalStatus?.trim().toLowerCase();
  return status === 'approve' || status === 'decline' || status === 'pending'
    ? status
    : extractPreEventApprovalStatus(participant?.notes);
};

export const setPreEventApprovalStatus = (notes: string | null | undefined, status: string): string => {
  const cleanStatus = status === 'approve' || status === 'decline' ? status : 'pending';
  const cleanNotes = (notes || '').replace(/\[PreEventApproval:\s*[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim();
  return `[PreEventApproval: ${cleanStatus}] ${cleanNotes}`.replace(/\s+/g, ' ').trim();
};

export const setPicInNotes = (notes: string | null | undefined, picName: string): string => {
  const current = (notes || '').trim();
  if (/\[PIC:\s*[^\]]+\]/i.test(current)) {
    return current.replace(/\[PIC:\s*[^\]]+\]/gi, `[PIC: ${picName}]`);
  }
  return `[PIC: ${picName}] ${current}`.trim();
};

export const isPublicPersonalEmail = (email: string): boolean => {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase().trim();
  const publicDomains = [
    'gmail.com', 'yahoo.com', 'yahoo.co.id', 'hotmail.com', 'outlook.com',
    'icloud.com', 'ymail.com', 'live.com', 'rocketmail.com', 'aol.com', 'me.com', 'msn.com'
  ];
  return publicDomains.includes(domain);
};

export const getOfficeEmail = (emails?: { id?: number; email: string; emailType?: string; isCorporate?: boolean; isPrimary?: boolean }[] | null): string => {
  if (!emails || emails.length === 0) return '-';
  const companyEmails = emails.filter(e => e.emailType === 'company' || e.isCorporate);
  if (companyEmails.length > 0) {
    const latest = [...companyEmails].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
    if (latest?.email) return latest.email;
  }
  const firstEmail = emails[0];
  if (firstEmail?.email && firstEmail.emailType !== 'personal' && !isPublicPersonalEmail(firstEmail.email)) {
    return firstEmail.email;
  }
  return '-';
};

export const getPersonalEmail = (emails?: { id?: number; email: string; emailType?: string; isCorporate?: boolean; isPrimary?: boolean }[] | null): string => {
  if (!emails || emails.length === 0) return '-';
  const personalEmails = emails.filter(e => e.emailType === 'personal' && !e.isCorporate);
  if (personalEmails.length > 0) {
    const latest = [...personalEmails].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
    if (latest?.email) return latest.email;
  }
  const firstEmail = emails[0];
  if (firstEmail?.email && isPublicPersonalEmail(firstEmail.email)) {
    return firstEmail.email;
  }
  return '-';
};
