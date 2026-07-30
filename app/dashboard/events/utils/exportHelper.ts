import * as XLSX from 'xlsx';
import { Event, EventParticipant } from '../../../../lib/types';
import { extractPicFromNotes, getOfficeEmail, getPersonalEmail } from './notesHelper';
import { getStatusLabel } from './statusHelper';

export const exportParticipantsToExcel = (
  selectedEvent: Event,
  filteredParticipants: EventParticipant[],
  activeTab: string,
  adminName: string
) => {
  let dataToExport: any[] = [];
  let sheetName = 'Participants Handover';
  let fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Handover_Report.xlsx`;

  const getReminderLabel = (status: string | null | undefined) => {
    if (!status) return '-';
    if (status === 'not_respon_yet') return 'Not respond yet';
    if (status === 'not_respond_2x') return 'Not respond 2x';
    if (status === 'tentative') return 'Tentative';
    if (status === 'attending') return 'Attending';
    if (status === 'on_location') return 'On Location';
    if (status === 'not_attending') return 'Unable to attend';
    return status;
  };

  if (activeTab === 'request' || activeTab === 'pre_event' || activeTab === 'declined') {
    if (activeTab === 'request') {
      sheetName = 'Request Handover';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Request_Report.xlsx`;
    } else if (activeTab === 'pre_event') {
      sheetName = 'Pre Event Approval';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_PreEvent_Report.xlsx`;
    } else {
      sheetName = 'Declined Handover';
      fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Declined_Report.xlsx`;
    }
    
    dataToExport = filteredParticipants.map((p, index) => {
      const { pic, cleanNotes } = extractPicFromNotes(p.notes);
      
      let confirmationLabel = '-';
      if (p.confirmationStatus === 'approve') confirmationLabel = 'Approve';
      else if (p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined') confirmationLabel = 'Decline';
      else if (p.confirmationStatus === 'pending') confirmationLabel = 'Pending';

      const exportObj: Record<string, any> = {
        'No': index + 1,
        'Company Name': p.database.company?.name || '-',
        'Salutation': p.database.salutation || '-',
        'First Name': p.database.firstName || '-',
        'Last Name': p.database.lastName || '-',
        'Position': p.database.positionLevel || '-',
        'Job Title': p.database.jobTitle || '-',
        'Office Phone': p.database.company?.officePhone || '-',
        'Mobile Phone': p.database.mobilePhone || '-',
        'Office Email': getOfficeEmail(p.database.emails),
        'Personal Email': getPersonalEmail(p.database.emails),
        'Tele Remarks': getStatusLabel(p.participantStatus),
        'Confirmation Status': confirmationLabel,
      };

      if (activeTab !== 'request') {
        exportObj['PIC'] = pic.toLowerCase() === 'admin' ? adminName : pic;
      }

      exportObj['Notes'] = cleanNotes;
      return exportObj;
    });
  } else if (activeTab === 'reminder') {
    sheetName = 'Reminder Status';
    fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Reminder_Report.xlsx`;

    dataToExport = filteredParticipants.map((p, index) => {
      return {
        'No': index + 1,
        'Company Name': p.database.company?.name || '-',
        'Salutation': p.database.salutation || '-',
        'First Name': p.database.firstName || '-',
        'Last Name': p.database.lastName || '-',
        'Position': p.database.positionLevel || '-',
        'Job Title': p.database.jobTitle || '-',
        'Office Phone': p.database.company?.officePhone || '-',
        'Mobile Phone': p.database.mobilePhone || '-',
        'Office Email': getOfficeEmail(p.database.emails),
        'Personal Email': getPersonalEmail(p.database.emails),
        'Industry': p.database.company?.industry || '-',
        'H-7 Reminder': getReminderLabel(p.reminderH7),
        'H-3 Reminder': getReminderLabel(p.reminderH3),
        'H-1 Reminder': getReminderLabel(p.reminderH1),
        'Notes': p.notes || '-'
      };
    });
  } else {
    sheetName = 'Reminder Dday Status';
    fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Reminder_Dday_Report.xlsx`;

    dataToExport = filteredParticipants.map((p, index) => {
      return {
        'No': index + 1,
        'Company Name': p.database.company?.name || '-',
        'Salutation': p.database.salutation || '-',
        'First Name': p.database.firstName || '-',
        'Last Name': p.database.lastName || '-',
        'Position': p.database.positionLevel || '-',
        'Job Title': p.database.jobTitle || '-',
        'Office Phone': p.database.company?.officePhone || '-',
        'Mobile Phone': p.database.mobilePhone || '-',
        'Office Email': getOfficeEmail(p.database.emails),
        'Personal Email': getPersonalEmail(p.database.emails),
        'Industry': p.database.company?.industry || '-',
        'Hari H Reminder': getReminderLabel(p.reminderHariH),
        'Notes': p.notes || '-'
      };
    });
  }

  // Generate Sheet
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Auto fit column width
  const maxLens = dataToExport.reduce((acc, row) => {
    Object.keys(row).forEach((key) => {
      const valStr = String(row[key as keyof typeof row]);
      acc[key] = Math.max(acc[key] || 10, valStr.length);
    });
    return acc;
  }, {} as Record<string, number>);
  
  worksheet['!cols'] = Object.keys(maxLens).map(key => ({
    wch: maxLens[key] + 3
  }));

  // Trigger Download
  XLSX.writeFile(workbook, fileName);
};
