export interface AppUser {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  roles?: string[];
  createdAt?: string;
}

export interface SessionToken {
  id: number;
  user: AppUser;
  createdAt: string;
  expiresAt: string;
}

export interface Group {
  id: number;
  name: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: number;
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
  id: number;
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
  id: number;
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
  id: number;
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
  id: number;
  event: Event;
  contact: Contact;
  leadStatus: string; // white | yellow | green | red
  requestedAt?: string;
  respondedAt?: string;
  attendanceStatus: string; // invited | registered | attended | no_show | cancelled
  leadCategory?: string; // HOT | WARM | COLD
  callStatus?: string;
  emailStatus?: string;
  whatsappStatus?: string;
  meetingStatus?: string;
  businessChallenges?: string;
  projectInfo?: string;
  timeline?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventLeadActivity {
  id: number;
  eventLead?: EventLead;
  activityType: string; // CALL | EMAIL | WHATSAPP | MEETING
  status: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface RemovalRequest {
  id: number;
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
  id: number;
  domain: string;
  riskLevel?: string;
  notes?: string;
}

export interface FlaggedIdentity {
  id: number;
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