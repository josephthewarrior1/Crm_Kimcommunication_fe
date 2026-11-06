import { Database, Company, CompanyBranch } from '../../../../lib/types';
import { getContactOffice } from '../../../../lib/utils/companyBranch';
import { isCompanyContactEmail, isParticipantProfile, isValidContactEmail } from './emailCategory';

export const checkDatabaseCompleteness = (c: Database, destination?: 'company' | 'participant') => {
  const missing: string[] = [];
  const office = getContactOffice(c);

  if (isParticipantProfile(c, destination)) {
    if (!c.firstName?.trim()) missing.push('First Name');
    if (!c.emails?.some(email => email && isValidContactEmail(email.email))) missing.push('Email Peserta');
    return { isIncomplete: missing.length > 0, missingFields: missing };
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

  if (!hasCompanyEmail) missing.push("Company Email");

  if (!c.company?.industry?.trim()) missing.push("Industry");
  if (!office?.city?.trim()) missing.push("City");
  if (!c.company?.website?.trim()) missing.push("Company Website");

  return {
    isIncomplete: missing.length > 0,
    missingFields: missing
  };
};

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
