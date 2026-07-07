import * as XLSX from 'xlsx';
import { Event, EventLead } from '../../../../lib/types';
import { extractPicFromNotes } from './notesHelper';
import { getStatusLabel } from './statusHelper';

export const exportLeadsToExcel = (
  selectedEvent: Event,
  filteredLeads: EventLead[],
  activeTab: string,
  adminName: string
) => {
  let dataToExport: any[] = [];
  let sheetName = 'Leads Handover';
  let fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Handover_Report.xlsx`;

  const getReminderLabel = (status: string | null | undefined) => {
    if (!status) return '-';
    if (status === 'not_respon_yet') return 'Not respond yet';
    if (status === 'not_respond_2x') return 'Not respond 2x';
    if (status === 'tentative') return 'Tentative';
    if (status === 'confirm') return 'Confirm';
    if (status === 'unable_to_attend') return 'Unable to attend';
    return status;
  };

  if (activeTab === 'request' || activeTab === 'pre_event') {
    sheetName = activeTab === 'request' ? 'Request Leads' : 'Pre-Event Leads';
    fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_${activeTab === 'request' ? 'Request' : 'PreEvent'}_Report.xlsx`;
    
    dataToExport = filteredLeads.map((l, index) => {
      // Map Call Status label
      let callLabel = 'Belum Telpon';
      if (l.callStatus === 'CONNECTED') callLabel = 'Sudah Telpon';
      else if (l.callStatus === 'NO_ANSWER') callLabel = 'Tidak Diangkat';
      else if (l.callStatus === 'BUSY') callLabel = 'Sibuk';

      // Map Confirmation Status Label
      const confirmationLabels: Record<string, string> = {
        pending: 'Pending',
        approve: 'Approve',
        decline: 'Decline',
      };
      const confirmationLabel = confirmationLabels[l.confirmationStatus || 'pending'] || l.confirmationStatus;

      const { pic, cleanNotes } = extractPicFromNotes(l.notes);

      const exportObj: Record<string, any> = {
        'No': index + 1,
        'Company Name': l.database.company?.name || '-',
        'Salutation': l.database.salutation || '-',
        'First Name': l.database.firstName || '-',
        'Last Name': l.database.lastName || '-',
        'Position': l.database.positionLevel || '-',
        'Job Title': l.database.jobTitle || '-',
        'Office Phone': l.database.company?.officePhone || '-',
        'Mobile Phone': l.database.mobilePhone || '-',
        'Office Email': l.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-',
        'Personal Email': l.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-',
        'Call Status': callLabel,
        'WhatsApp Status': l.whatsappStatus === 'SENT' ? 'Sudah WhatsApp' : 'Belum WhatsApp',
        'Email Status': l.emailStatus === 'SENT' ? 'Sudah Email' : 'Belum Email',
        'Tele Remarks': getStatusLabel(l.leadStatus),
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

    dataToExport = filteredLeads.map((l, index) => {
      return {
        'No': index + 1,
        'Company Name': l.database.company?.name || '-',
        'Salutation': l.database.salutation || '-',
        'First Name': l.database.firstName || '-',
        'Last Name': l.database.lastName || '-',
        'Position': l.database.positionLevel || '-',
        'Job Title': l.database.jobTitle || '-',
        'Office Phone': l.database.company?.officePhone || '-',
        'Mobile Phone': l.database.mobilePhone || '-',
        'Office Email': l.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-',
        'Personal Email': l.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-',
        'Industry': l.database.company?.industry || '-',
        'H-7 Reminder': getReminderLabel(l.reminderH7),
        'H-3 Reminder': getReminderLabel(l.reminderH3),
        'H-1 Reminder': getReminderLabel(l.reminderH1),
        'Notes': l.notes || '-'
      };
    });
  } else {
    sheetName = 'Reminder Dday Status';
    fileName = `${selectedEvent.name.replace(/[^a-z0-9]/gi, '_')}_Reminder_Dday_Report.xlsx`;

    dataToExport = filteredLeads.map((l, index) => {
      return {
        'No': index + 1,
        'Company Name': l.database.company?.name || '-',
        'Salutation': l.database.salutation || '-',
        'First Name': l.database.firstName || '-',
        'Last Name': l.database.lastName || '-',
        'Position': l.database.positionLevel || '-',
        'Job Title': l.database.jobTitle || '-',
        'Office Phone': l.database.company?.officePhone || '-',
        'Mobile Phone': l.database.mobilePhone || '-',
        'Office Email': l.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-',
        'Personal Email': l.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-',
        'Industry': l.database.company?.industry || '-',
        'Hari H Reminder': getReminderLabel(l.reminderHariH),
        'Notes': l.notes || '-'
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
