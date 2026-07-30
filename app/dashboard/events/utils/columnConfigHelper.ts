export interface EventColumnConfig {
  companyName: boolean;
  salutation: boolean;
  firstName: boolean;
  lastName: boolean;
  positionLevel: boolean;
  jobTitle: boolean;
  officePhone: boolean;
  mobilePhone: boolean;
  officeEmail: boolean;
  personalEmail: boolean;
  industry: boolean;
  telemarketingLogs: boolean;
  remarks: boolean;
  approvalStatus: boolean;
  pic: boolean;
  notes: boolean;
}

export const ALL_EVENT_COLUMNS: { key: keyof EventColumnConfig; label: string }[] = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'salutation', label: 'Salutation' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'positionLevel', label: 'Position' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'officePhone', label: 'Office Phone' },
  { key: 'mobilePhone', label: 'Mobile Phone' },
  { key: 'officeEmail', label: 'Office Email' },
  { key: 'personalEmail', label: 'Personal Email' },
  { key: 'industry', label: 'Industry' },
  { key: 'telemarketingLogs', label: 'Telemarketing Logs' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'approvalStatus', label: 'Approval / Status' },
  { key: 'pic', label: 'PIC' },
  { key: 'notes', label: 'Notes' },
];

export const DEFAULT_COLUMN_CONFIG: EventColumnConfig = {
  companyName: true,
  salutation: true,
  firstName: true,
  lastName: true,
  positionLevel: true,
  jobTitle: true,
  officePhone: true,
  mobilePhone: true,
  officeEmail: true,
  personalEmail: true,
  industry: true,
  telemarketingLogs: true,
  remarks: true,
  approvalStatus: true,
  pic: true,
  notes: true,
};

export const getEventColumnConfig = (userId?: number, eventId?: number): EventColumnConfig => {
  if (typeof window === 'undefined' || !userId) return DEFAULT_COLUMN_CONFIG;

  try {
    if (eventId) {
      const specific = localStorage.getItem(`crm_user_cols_${userId}_${eventId}`);
      if (specific) return { ...DEFAULT_COLUMN_CONFIG, ...JSON.parse(specific) };
    }
    const userDefault = localStorage.getItem(`crm_user_cols_${userId}`);
    if (userDefault) return { ...DEFAULT_COLUMN_CONFIG, ...JSON.parse(userDefault) };
  } catch (err) {
    console.error('Error reading column config:', err);
  }

  return DEFAULT_COLUMN_CONFIG;
};

export const saveEventColumnConfig = (config: EventColumnConfig, userId: number, eventId?: number) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    if (eventId) {
      localStorage.setItem(`crm_user_cols_${userId}_${eventId}`, JSON.stringify(config));
    } else {
      localStorage.setItem(`crm_user_cols_${userId}`, JSON.stringify(config));
    }
  } catch (err) {
    console.error('Error saving column config:', err);
  }
};
