import { Database, DatabaseEmail, Company, CompanyBranch } from '../../../../lib/types';
import { getContactOffice } from '../../../../lib/utils/companyBranch';
import { isCompanyContactEmail, isParticipantProfile, isPersonalContactEmail, isValidContactEmail, isValidContactPhone } from './emailCategory';

export const getStoredEmailIssue = (email: DatabaseEmail, destination: 'company' | 'participant' = 'company'): string => {
  if (!email.email?.trim()) return 'Alamat email belum diisi.';
  if (!isValidContactEmail(email.email)) return (email.email.match(/@/g) || []).length > 1
    ? 'Beberapa alamat tersimpan dalam satu entri email. Pisahkan setiap alamat menjadi entri email tersendiri.'
    : 'Format alamat email tidak valid.';
  if (destination === 'participant') return '';
  const corporate = email.isCorporate || email.emailType?.toLowerCase() === 'company';
  if (corporate && isPersonalContactEmail(email.email)) return 'Email pribadi tidak memenuhi Company Email. Gunakan email perusahaan atau institusi.';
  if (!corporate && !isPersonalContactEmail(email.email)) return 'Email domain kantor belum ditandai sebagai Company Email.';
  return '';
};

export const checkDatabaseCompleteness = (c: Database, destination?: 'company' | 'participant') => {
  const missing: string[] = [];
  const fieldMessages: Record<string, string> = {};
  const office = getContactOffice(c);

  if (isParticipantProfile(c, destination)) {
    if (![c.firstName, c.lastName].some(name => name?.trim())) missing.push('Nama peserta');
    if (!c.emails?.some(email => email && isValidContactEmail(email.email)) && !isValidContactPhone(c.mobilePhone)) missing.push('Email atau HP/WhatsApp valid');
    return { isIncomplete: missing.length > 0, missingFields: missing, fieldMessages };
  }

  if (!c.company?.group?.name?.trim()) missing.push("Nama Group Holding");
  if (!c.company?.brandName?.trim()) missing.push("Nama Brand");
  if (!c.company?.name?.trim()) missing.push("Company Name");
  if (!c.salutation?.trim()) missing.push("Salutation");
  if (!c.firstName?.trim()) missing.push("First Name");
  if (!c.lastName?.trim()) missing.push("Last Name");
  if (!c.positionLevel || !c.positionLevel.trim()) missing.push("Position");
  if (!c.jobTitle?.trim()) missing.push("Job Title");
  if (!office?.address?.trim()) missing.push("Address");
  if (!office?.officePhone?.trim()) missing.push("Office Phone");
  if (!c.mobilePhone?.trim()) missing.push("Mobile Phone");

  const emails = c.emails || [];
  const hasCompanyEmail = emails.some(isCompanyContactEmail);

  if (!hasCompanyEmail) {
    missing.push("Company Email");
    const companyEmails = emails.filter(email => email.email?.trim() && (email.isCorporate || email.emailType?.toLowerCase() === 'company'));
    const candidates = companyEmails.length ? companyEmails : emails.filter(email => isValidContactEmail(email.email) && !isPersonalContactEmail(email.email));
    const messages = Array.from(new Set(candidates.map(email => getStoredEmailIssue(email)).filter(Boolean)));
    if (messages.length) fieldMessages['Company Email'] = messages.join(' ');
  }

  if (!c.company?.industry?.trim()) missing.push("Industry");
  if (!office?.city?.trim()) missing.push("City");
  if (!c.company?.website?.trim()) missing.push("Company Website");

  return {
    isIncomplete: missing.length > 0,
    missingFields: missing,
    fieldMessages
  };
};

export const getDatabaseCompletenessTitle = (completeness: ReturnType<typeof checkDatabaseCompleteness>): string =>
  `Data belum lengkap.\n\nKolom wajib perlu diperiksa:\n• ${completeness.missingFields.map(field =>
    completeness.fieldMessages[field] ? `${field}: ${completeness.fieldMessages[field]}` : field).join('\n• ')}`;

export const checkFormCompleteness = (
  salutationVal: string,
  firstNameVal: string,
  lastNameVal: string,
  positionVal: string,
  jobTitleVal: string,
  mobilePhoneVal: string,
  companyEmailVal: string,
  personalEmailVal: string,
  linkedinUrlVal: string,
  compSelectedId: string,
  companiesList: Company[],
  branch?: CompanyBranch | null,
  destination: 'company' | 'participant' = 'company'
) => {
  const selectedComp = companiesList.find(comp => comp.id.toString() === compSelectedId);
  const mockDb: any = {
    databaseDestination: destination,
    salutation: salutationVal,
    firstName: firstNameVal,
    lastName: lastNameVal,
    positionLevel: positionVal,
    jobTitle: jobTitleVal,
    mobilePhone: mobilePhoneVal,
    linkedinUrl: linkedinUrlVal,
    company: selectedComp,
    branch,
    emails: [
      { email: companyEmailVal, emailType: 'company', isCorporate: true },
      { email: personalEmailVal, emailType: 'personal', isCorporate: false }
    ]
  };
  return checkDatabaseCompleteness(mockDb);
};
