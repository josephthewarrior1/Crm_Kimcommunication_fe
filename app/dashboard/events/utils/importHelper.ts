import * as XLSX from 'xlsx';
import { EventParticipant } from '../../../../lib/types';

export const importParticipantsFromExcel = async (
  importLeadsFile: File,
  selectedEventId: number,
  activeTab: string,
  participants: EventParticipant[],
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
    let firstName = String(row['First Name'] || row['FirstName'] || row['First_Name'] || row['Nama Depan'] || row['Name'] || row['Nama'] || '').trim();
    let lastName = String(row['Last Name'] || row['LastName'] || row['Last_Name'] || row['Nama Belakang'] || '').trim();
    
    if (!firstName && !lastName) {
      errorCount++;
      continue;
    }

    if (!lastName && firstName.includes(' ')) {
      const parts = firstName.split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    } else if (!lastName) {
      lastName = '-';
    }

    const companyNameRaw = String(row['Company Name'] || row['CompanyName'] || row['Company'] || row['Perusahaan'] || '').trim();
    
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
          c.name && c.name.toLowerCase().trim() === companyName.toLowerCase().trim()
        );

        if (existingCompany) {
          resolvedCompanyId = existingCompany.id;
        } else {
          const newCompany = await crmService.createCompany({
            name: companyName,
            brandName: String(row['Nama Brand'] || row['Brand Name'] || row['Brand'] || '').trim() || undefined,
            address: String(row['Address'] || row['Alamat'] || '').trim() || undefined,
            officePhone: String(row['Office Phone'] || row['Telepon Kantor'] || '').trim() || undefined,
            website: String(row['Company Website'] || row['Website'] || '').trim() || undefined,
            industry: String(row['Industry'] || row['Industri'] || '').trim() || undefined,
            companySizeRevenue: String(row['Company Size (Revenue)'] || '').trim() || undefined,
            companySizeEmployee: String(row['Company Size (Employee)'] || '').trim() || undefined,
            companyHardware: String(row['Company Hardware'] || '').trim() || undefined,
            city: String(row['City'] || row['Kota'] || '').trim() || undefined
          });
          resolvedCompanyId = newCompany.id;
          allCompanies.push(newCompany);
        }
      }

      let resolvedContactId: number;
      const existingContact = allDbContacts.find((c: any) => 
        c.firstName && c.lastName &&
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
          positionLevel: String(row['Position'] || row['Position Level'] || 'unknown').trim().toLowerCase(),
          specialityDivision: String(row['Speciality/Division'] || row['Division'] || '').trim() || undefined,
          jobTitle: String(row['Jobtitle'] || row['Job Title'] || row['Jabatan'] || '').trim() || undefined,
          mobilePhone: String(row['Mobile Phone'] || row['Phone'] || row['No HP'] || row['Whatsapp'] || '').trim() || undefined,
          linkedinUrl: String(row['Linkedin Link'] || row['LinkedIn'] || row['Linkedin'] || '').trim() || undefined,
          databaseType: 'unknown',
          source: 'excel_import',
          isActive: true
        }, resolvedCompanyId);
        
        resolvedContactId = newContact.id;
        allDbContacts.push(newContact);

        const companyEmail = String(row['Company Email Address'] || row['Company Email'] || row['Email'] || '').trim().toLowerCase();
        const personalEmail = String(row['Personal Email Address'] || row['Personal Email'] || '').trim().toLowerCase();

        if (companyEmail) {
          await crmService.addDatabaseEmail(newContact.id, {
            email: companyEmail,
            emailType: 'company',
            isPrimary: true,
            isVerified: true,
            isCorporate: true
          });
        }
        if (personalEmail && personalEmail !== companyEmail) {
          await crmService.addDatabaseEmail(newContact.id, {
            email: personalEmail,
            emailType: 'personal',
            isPrimary: !companyEmail,
            isVerified: true,
            isCorporate: false
          });
        }
      }
      
      const isAlreadyParticipant = participants.some(p => p.database && p.database.id === resolvedContactId);
      if (!isAlreadyParticipant) {
        await crmService.createEventParticipant({
          eventId: selectedEventId,
          databaseId: resolvedContactId,
          participantStatus: 'white',
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
