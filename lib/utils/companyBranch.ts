import { Database } from '../types';

// An assigned branch owns its location; blank branch fields must not show another office's address.
export const getContactOffice = (database: Pick<Database, 'company' | 'branch'>) =>
  database.branch ?? database.company;

export const getContactOrganization = (database: Database, destination?: 'company' | 'participant') => {
  if ((destination ?? database.databaseDestination) === 'participant') return {
    groupName: database.organizationGroupName, brandName: database.organizationBrandName,
    companyName: database.institutionName, address: database.organizationAddress,
    officePhone: database.organizationOfficePhone, industry: database.organizationIndustry,
    sizeRevenue: database.organizationSizeRevenue, sizeEmployee: database.organizationSizeEmployee,
    branchName: database.organizationBranchName, postalCode: database.organizationPostalCode,
    website: database.organizationWebsite,
  };
  const office = getContactOffice(database);
  return {
    groupName: database.company?.group?.name, brandName: database.company?.brandName,
    companyName: database.company?.name, address: office?.address,
    officePhone: office?.officePhone, industry: database.company?.industry,
    sizeRevenue: database.company?.companySizeRevenue, sizeEmployee: database.company?.companySizeEmployee,
    branchName: database.branch?.name, postalCode: office?.postalCode,
    website: database.company?.website,
  };
};
