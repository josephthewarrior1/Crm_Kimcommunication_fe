export interface AppUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  createdAt?: string;
}

export interface SessionToken {
  id: string;
  user: AppUser;
  createdAt: string;
  expiresAt: string;
}

export interface Group {
  id: string;
  name: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  group?: Group | null;
  brandName?: string;
  name: string;
  address?: string;
  officePhone?: string;
  website?: string;
  industry?: string;
  companySizeRevenue?: string;
  companySizeEmployee?: string;
  companyHardware?: string;
  city?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  id: string;
  company?: Company | null;
  salutation?: string;
  firstName: string;
  lastName: string;
  positionLevel?: string;
  specialityDivision?: string;
  jobTitle?: string;
  mobilePhone?: string;
  normalizedPhone?: string;
  linkedinUrl?: string;
  contactType: string; // partner_it | partner_marketing | end_user | unknown
  source: string; // contactout | old_db | manual | excel_import | event_registration
  isActive: boolean;
  emails?: ContactEmail[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactEmail {
  id: string;
  contact?: Contact;
  email: string;
  emailType: string; // company | personal | other
  isPrimary: boolean;
  isVerified: boolean;
  isCorporate: boolean;
  domain: string;
  createdAt?: string;
}

export interface Event {
  id: string;
  name: string;
  eventType: string; // partner | end_user | internal | other
  clientName?: string;
  dateStart?: string;
  dateEnd?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventLead {
  id: string;
  event: Event;
  contact: Contact;
  leadStatus: string; // white | yellow | green | red
  requestedAt?: string;
  respondedAt?: string;
  attendanceStatus: string; // invited | registered | attended | no_show | cancelled
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RemovalRequest {
  id: string;
  contact: Contact;
  reason: string; // resign | pensiun | meninggal | requested_takeout | pindah_kerja | lainnya
  requestedBy?: string;
  requestDate?: string;
  sourceDb?: string;
  notes?: string;
  status: string; // pending | approved | rejected | done
  createdAt?: string;
}

export interface PersonalEmailDomain {
  id: string;
  domain: string;
  riskLevel?: string;
  notes?: string;
}

export interface FlaggedIdentity {
  id: string;
  contact?: Contact | null;
  event?: Event | null;
  nameUsed?: string;
  emailUsed?: string;
  phoneUsed?: string;
  flagReason?: string; // multiple_identity | fake_company | no_corporate_email | duplicate_phone | duplicate_email | suspicious_repeated_attendance
  evidenceNotes?: string;
  status: string; // suspected | confirmed | cleared
  createdAt?: string;
  updatedAt?: string;
}