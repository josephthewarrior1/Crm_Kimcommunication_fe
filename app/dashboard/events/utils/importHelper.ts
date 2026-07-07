import * as XLSX from 'xlsx';
import { EventLead } from '../../../../lib/types';

export const importLeadsFromExcel = async (
  importLeadsFile: File,
  selectedEventId: number,
  activeTab: string,
  leads: EventLead[],
  setProgress: (p: number) => void,
  crmService: any
): Promise<{ successCount: number; errorCount: number }> => {
  setProgress(5);

  const reader = new FileReader();
  
  const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = (e) => {
      if (e.target?.result) resolve(e.target.result as ArrayBuffer);
      else reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(importLeadsFile);
  });

  const workbook = XLSX.read(fileData, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any>(worksheet);

  if (rows.length === 0) {
    throw new Error('File Excel kosong atau tidak terbaca.');
  }

  setProgress(20);

  const [allCompanies, allDbContacts] = await Promise.all([
    crmService.getCompanies(),
    crmService.getDatabases()
  ]);

  setProgress(40);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstName = String(row['First Name'] || '').trim();
    const lastName = String(row['Last Name'] || '').trim();
    
    if (!firstName || !lastName) {
      errorCount++;
      continue;
    }

    const companyNameRaw = String(row['Company Name'] || '').trim();
    
    try {
      let resolvedCompanyId: number | undefined = undefined;
      if (companyNameRaw) {
        let companyName = companyNameRaw;
        if (companyName.toUpperCase().endsWith(' PT')) {
          companyName = 'PT ' + companyName.slice(0, -3).trim();
        } else if (companyName.toUpperCase().endsWith(' PT.')) {
          companyName = 'PT ' + companyName.slice(0, -4).trim();
        }
        
        const existingCompany = allCompanies.find((c: any) => 
          c.name.toLowerCase().trim() === companyName.toLowerCase().trim()
        );

        if (existingCompany) {
          resolvedCompanyId = existingCompany.id;
        } else {
          const newCompany = await crmService.createCompany({
            name: companyName,
            brandName: String(row['Nama Brand'] || '').trim() || undefined,
            address: String(row['Address'] || '').trim() || undefined,
            officePhone: String(row['Office Phone'] || '').trim() || undefined,
            website: String(row['Company Website'] || '').trim() || undefined,
            industry: String(row['Industry'] || '').trim() || undefined,
            companySizeRevenue: String(row['Company Size (Revenue)'] || '').trim() || undefined,
            companySizeEmployee: String(row['Company Size (Employee)'] || '').trim() || undefined,
            companyHardware: String(row['Company Hardware'] || '').trim() || undefined,
            city: String(row['City'] || '').trim() || undefined
          });
          resolvedCompanyId = newCompany.id;
          allCompanies.push(newCompany);
        }
      }

      let resolvedContactId: number;
      const existingContact = allDbContacts.find((c: any) => 
        c.firstName.toLowerCase().trim() === firstName.toLowerCase() &&
        c.lastName.toLowerCase().trim() === lastName.toLowerCase()
      );

      if (existingContact) {
        resolvedContactId = existingContact.id;
      } else {
        const newContact = await crmService.createDatabase({
          firstName,
          lastName,
          salutation: String(row['Salutation'] || 'Mr').trim(),
          positionLevel: String(row['Position'] || 'unknown').trim().toLowerCase(),
          specialityDivision: String(row['Speciality/Division'] || '').trim() || undefined,
          jobTitle: String(row['Jobtitle'] || '').trim() || undefined,
          mobilePhone: String(row['Mobile Phone'] || '').trim() || undefined,
          linkedinUrl: String(row['Linkedin Link'] || '').trim() || undefined,
          databaseType: 'unknown',
          source: 'excel_import',
          isActive: true
        }, resolvedCompanyId);
        
        resolvedContactId = newContact.id;
        allDbContacts.push(newContact);

        const companyEmail = String(row['Company Email Address'] || '').trim().toLowerCase();
        const personalEmail = String(row['Personal Email Address'] || '').trim().toLowerCase();

        if (companyEmail) {
          await crmService.addDatabaseEmail(newContact.id, {
            email: companyEmail,
            emailType: 'company',
            isPrimary: true,
            isVerified: true,
            isCorporate: true
          });
        }
        if (personalEmail) {
          await crmService.addDatabaseEmail(newContact.id, {
            email: personalEmail,
            emailType: 'personal',
            isPrimary: !companyEmail,
            isVerified: true,
            isCorporate: false
          });
        }
      }
      
      const isAlreadyLead = leads.some(l => l.database.id === resolvedContactId);
      if (!isAlreadyLead) {
        await crmService.createEventLead({
          eventId: selectedEventId,
          databaseId: resolvedContactId,
          leadStatus: 'white',
          attendanceStatus: 'invited',
          confirmationStatus: activeTab === 'pre_event' ? 'approve' : 'pending',
          notes: activeTab === 'request' ? '[Origin: Request]' : undefined
        });
      }
      
      successCount++;
    } catch (rowErr) {
      console.error(`Error processing row ${i + 1}`, rowErr);
      errorCount++;
    }

    setProgress(Math.floor(40 + (50 * (i + 1) / rows.length)));
  }

  setProgress(100);
  return { successCount, errorCount };
};
