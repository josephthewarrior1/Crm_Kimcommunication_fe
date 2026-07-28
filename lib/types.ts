export interface AppUser {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  roles?: string[];
  allowedEventIds?: number[];
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
  postalCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Database {
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
  databaseType: string; // partner_it | partner_marketing | end_user | unknown
  source: string; // contactout | old_db | manual | excel_import | event_registration
  isActive: boolean;
  emails?: DatabaseEmail[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseEmail {
  id: number;
  database?: Database;
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
  eventType?: string; // partner | end_user | internal | other
  clientName?: string;
  client?: string;
  dateStart?: string;
  dateEnd?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  description?: string;
  targetParticipants?: number;
  targetPax?: number;
  status?: string;
  venueName?: string;
  venueRoomName?: string;
  venueCity?: string;
  venueAddress?: string;
  progress?: number;
  budget?: number | null;
  hedgingUsd?: number | null;
  addOn?: string | null;
  pmsEventId?: number;
  emsEventId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventParticipant {
  id: number;
  event: Event;
  database: Database;
  participantStatus: string; // white | yellow | green | red
  requestedAt?: string;
  respondedAt?: string;
  attendanceStatus: string; // invited | registered | attended | no_show | cancelled
  participantCategory?: string; // HOT | WARM | COLD
  callStatus?: string;
  emailStatus?: string;
  whatsappStatus?: string;
  meetingStatus?: string;
  businessChallenges?: string;
  projectInfo?: string;
  timeline?: string;
  notes?: string;
  reminderH7?: string;
  reminderH3?: string;
  reminderH1?: string;
  reminderHariH?: string;
  confirmationStatus?: string; // pending | approve | decline
  createdAt?: string;
  updatedAt?: string;
}

export interface EventParticipantActivity {
  id: number;
  eventParticipant?: EventParticipant;
  activityType: string; // CALL | EMAIL | WHATSAPP | MEETING
  status: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface RemovalRequest {
  id: number;
  database: Database;
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
  database?: Database | null;
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