import { Database, Company } from '../../../../lib/types';

export const checkDatabaseCompleteness = (c: Database) => {
  const missing: string[] = [];

  if (!c.company?.group?.name?.trim()) missing.push("Nama Group Holding");
  if (!c.company?.brandName?.trim()) missing.push("Nama Brand");
  if (!c.company?.name?.trim()) missing.push("Company Name");
  if (!c.salutation?.trim()) missing.push("Salutation");
  if (!c.firstName?.trim()) missing.push("First Name");
  if (!c.lastName?.trim()) missing.push("Last Name");
  if (!c.positionLevel || c.positionLevel === 'unknown' || !c.positionLevel.trim()) missing.push("Position");
  if (!c.jobTitle?.trim()) missing.push("Job Title");
  if (!c.company?.address?.trim()) missing.push("Address");
  if (!c.company?.officePhone?.trim()) missing.push("Office Phone");
  if (!c.mobilePhone?.trim()) missing.push("Mobile Phone");

  const emails = c.emails || [];
  const hasCompanyEmail = emails.some(e => e.isCorporate || e.emailType === 'company');
  const hasPersonalEmail = emails.some(e => !e.isCorporate && e.emailType === 'personal');

  if (!hasCompanyEmail) missing.push("Company Email");
  if (!hasPersonalEmail) missing.push("Personal Email");

  if (!c.company?.industry?.trim()) missing.push("Industry");
  if (!c.company?.city?.trim()) missing.push("City");
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
  companiesList: Company[]
) => {
  const selectedComp = companiesList.find(comp => comp.id.toString() === compSelectedId);
  const mockDb: any = {
    salutation: salutationVal,
    firstName: firstNameVal,
    lastName: lastNameVal,
    positionLevel: positionVal,
    jobTitle: jobTitleVal,
    mobilePhone: mobilePhoneVal,
    linkedinUrl: linkedinUrlVal,
    company: selectedComp,
    emails: [
      { email: companyEmailVal, emailType: 'company', isCorporate: true },
      { email: personalEmailVal, emailType: 'personal', isCorporate: false }
    ]
  };
  return checkDatabaseCompleteness(mockDb);
};
