export interface AppUser {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  roles?: string[];
  allowedEventIds?: number[];
  createdAt?: string;
}

export interface UserListResponse {
  items: AppUser[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
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
  companyCount?: number;
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
  contactCount?: number;
}

export interface CompanyListResponse {
  items: Company[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface CompanyBranch {
  id: number;
  companyId: number;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  officePhone?: string;
}

export interface CompanyFilterOptionsResponse {
  groups: Array<{ id: number; name: string }>;
  industries: string[];
}

export interface GroupListResponse {
  items: Group[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface GroupSummaryResponse {
  totalGroups: number;
  totalCompanies: number;
  groupedCompanies: number;
  ungroupedCompanies: number;
}

export interface PositionSummary {
  total: number;
  cLevel: number;
  managerial: number;
  staff: number;
  other: number;
  otherPositions?: Array<{ position: string | null; count: number }>;
}

export interface DashboardSummaryResponse {
  metrics: {
    totalGroups: number;
    totalCompanies: number;
    totalDatabase: number;
    totalEvents: number;
    suspectedTikus: number;
  };
  industryDistribution: Array<{ name: string; value: number }>;
  eventAttendancePerformance: Array<{ name: string; Invited: number; Attended: number }>;
  flaggedAlerts: FlaggedIdentity[];
  positionSummary?: PositionSummary;
}

export interface DatabaseUploadTarget {
  userId: number;
  username: string;
  fullName: string;
  targetCount: number;
  targetMode: 'DAILY' | 'MONTHLY';
  dailyCount: number;
  progressCount: number;
  remainingCount: number;
  monthlyTargetCount: number;
  excelCount: number;
  manualCount: number;
  totalCount: number;
}

export interface DatabaseUploadTargetsResponse {
  month: string;
  date: string;
  daysInMonth: number;
  timeZone: string;
  items: DatabaseUploadTarget[];
}

export interface IndustrySummaryResponse {
  totals: {
    industries: number;
    companies: number;
    databases: number;
    activeDatabases: number;
    inactiveDatabases: number;
  };
  items: Array<{
    industry: string;
    companyCount: number;
    databaseCount: number;
    activeDatabaseCount: number;
    inactiveDatabaseCount: number;
  }>;
}

export type DatabaseDestination = 'company' | 'participant' | 'both';

export interface Database {
  id: number;
  databaseDestination?: DatabaseDestination;
  participantCategory?: string;
  institutionName?: string;
  organizationGroupName?: string;
  organizationBrandName?: string;
  organizationAddress?: string;
  organizationOfficePhone?: string;
  organizationIndustry?: string;
  organizationSizeRevenue?: string;
  organizationSizeEmployee?: string;
  organizationBranchName?: string;
  organizationPostalCode?: string;
  organizationWebsite?: string;
  company?: Company | null;
  branch?: CompanyBranch | null;
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

export interface DatabaseAnalytics {
  total: number;
  clean: number;
  dirty: number;
  industries: Array<{ name: string; count: number }>;
  otherIndustries?: Array<{ name: string; count: number }>;
}

export interface DatabaseListResponse {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  items: Database[];
  analytics?: DatabaseAnalytics;
  destinations?: { company: number; participant: number };
  summary: {
    all: number;
    clean: number;
    dirty: number;
  };
}

export interface DatabaseExportResponse {
  total: number;
  items: Database[];
}

export interface DatabaseFilterOptionsResponse {
  cities: Array<{ value: string; label: string }>;
  groups: Array<{ id: number; name: string }>;
  companies: Array<{ id: number; name: string }>;
  branches?: Array<{ id: number; companyId: number; name: string }>;
  industries: string[];
  positionLevels: string[];
}

export type EmsSource = 'LEGACY' | 'V2';

export interface EmsSyncPreview {
  destination: 'company' | 'participant';
  totalRows: number;
  newCount: number;
  existingCount: number;
  rejectedCount: number;
  companyReviewCount?: number;
  uniqueContactCount?: number;
  contactUpdateCount?: number;
  previewToken: string;
  rows: Array<{
    rowNum: number; name: string; email: string; phone?: string;
    emsStatus?: string; emsApprovalStatus?: string;
    status: 'NEW' | 'EXISTING' | 'REJECTED'; existingDatabaseId?: number; message: string;
    companyReviewRequired?: boolean; crmCompanyName?: string | null; emsCompanyName?: string | null;
    identityReviewMessage?: string | null; clientDeclineReviewRequired?: boolean | null;
    crmPreEventApprovalStatus?: string; crmClientApprovalStatus?: string;
    crmMatches?: Array<{ databaseId: number; name: string; mobilePhone: string; companyName: string; matchedBy: string[] }>;
    approvalConflictRows?: number[]; approvalConflictStatuses?: string[];
    contactUpdates?: Array<{ field: string; before: string; after: string }>;
  }>;
}

export interface EmsSyncResult extends EmsSyncPreview {
  count: number;
  message: string;
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
  emsEventId?: number | null;
  emsSource?: EmsSource;
  syncDestination?: 'company' | 'participant' | null;
  createdAt?: string;
  updatedAt?: string;
  registeredCount?: number;
  onLocationCount?: number;
  targetAchieved?: boolean;
}

export interface EventListResponse {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  items: Event[];
  summary: {
    total: number;
    upcoming: number;
    ongoing: number;
    past: number;
  };
}

export interface EventFilterOptionsResponse {
  clients: string[];
  eventTypes: string[];
  cities: string[];
  years: number[];
}

export interface EventAvailableDatabaseOption {
  id: number;
  name: string;
}

export interface EventAvailableDatabaseItem {
  database: Database;
  invitedEvents: EventAvailableDatabaseOption[];
}

export interface EventAvailableDatabasesResponse {
  eventId: number;
  total: number;
  items: EventAvailableDatabaseItem[];
  filterOptions: {
    companies: string[];
    positions: string[];
    industries: string[];
    cities: string[];
    invitedEvents: EventAvailableDatabaseOption[];
  };
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
  preEventApprovalStatus?: string; // pending | approve | decline
  emsApprovalStatus?: string | null; // last sync snapshot; current manual choice is preEventApprovalStatus
  emsCompanyName?: string | null;
  emsCompanyReviewRequired?: boolean | null;
  emsIdentityReviewMessage?: string | null;
  emsClientDeclineReviewRequired?: boolean | null;
  approvalSource?: 'ems' | 'crm';
  createdAt?: string;
  updatedAt?: string;
}

export interface EventParticipantStatisticsScope {
  [key: string]: number;
}

export interface EventParticipantStatisticsResponse {
  eventId: number;
  tab: 'request' | 'pre_event' | 'declined' | 'reminder' | 'reminder_dday';
  scopes: {
    all: EventParticipantStatisticsScope;
    mine: EventParticipantStatisticsScope;
  };
}

export interface EventParticipantFilterOptions {
  eventId: number;
  tab: string;
  companies: string[];
  positions: string[];
  industries: string[];
  pics: string[];
}

export interface EventParticipantPicSummaryItem {
  userId?: number;
  name: string;
  roleLabel?: string;
  totalAssigned: number;
  approveCount: number;
  pendingCount: number;
  registeredCount: number;
  tentativeCount: number;
  notRespondCount: number;
  notInterestCount: number;
}

export interface EventParticipantPicSummaryResponse {
  eventId: number;
  tab: string;
  totalParticipants: number;
  totalAssigned: number;
  unassignedCount: number;
  activePicsCount: number;
  items: EventParticipantPicSummaryItem[];
}

export interface EventParticipantsExportResponse {
  eventId: number;
  eventName: string;
  tab: string;
  sheetName: string;
  fileName: string;
  total: number;
  rows: Array<Record<string, string | number | boolean | null>>;
}

export interface EventParticipantsImportValidationRow {
  rowNumber: number;
  status: 'valid' | 'duplicate' | 'error' | 'conflict';
  firstName: string;
  lastName: string;
  companyName: string;
  mobilePhone: string;
  companyEmail: string;
  personalEmail: string;
  salutation: string;
  position: string;
  jobTitle: string;
  existingDatabaseId?: number | null;
  existingParticipantId?: number | null;
  issues: string[];
  warnings?: string[];
  missingFields?: string[];
}

export interface EventParticipantsImportValidationResponse {
  destination: 'company' | 'participant';
  eventId: number;
  eventName: string;
  tab?: string;
  fileName?: string;
  summary: {
    validCount: number;
    duplicateCount: number;
    errorCount: number;
    blankCount: number;
    conflictCount?: number;
    totalRows: number;
  };
  rows: EventParticipantsImportValidationRow[];
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

export interface EventActivitySummaryResponse {
  eventId: number;
  pic?: string;
  startDate?: string;
  endDate?: string;
  totalActivities: number;
  byType: {
    call: number;
    whatsapp: number;
    email: number;
    meeting: number;
  };
  participantsSummary?: {
    totalParticipants: number;
    totalAssignedParticipants: number;
    registered: number;
    tentative: number;
    notRespond: number;
    notInterest: number;
  };
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

export interface AuditLog {
  id: number;
  userId?: number | null;
  username: string;
  userFullName?: string;
  userRole?: string;
  module: 'DATABASE' | 'COMPANIES' | 'GROUPS' | 'EVENTS' | 'PARTICIPANTS' | 'EVENT_PARTICIPANT' | 'FLAGGED' | 'TAKEOUT' | 'USER_MANAGEMENT' | 'AUTH';
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT_EXCEL' | 'STATUS_CHANGE' | 'APPROVE_TAKEOUT' | 'REJECT_TAKEOUT' | 'FLAG_TIKUS' | 'LOGIN' | 'LOGOUT';
  targetId?: string | number | null;
  targetName?: string | null;
  description: string;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AuditLogSummary {
  total: number;
  today: number;
  topUser: string;
  topUserCount: number;
  critical: number;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface AuditLogFilterOptions {
  users: string[];
  modules: string[];
  actionTypes: string[];
}

export interface FlaggedIdentityListResponse {
  items: FlaggedIdentity[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface FlaggedIdentityFilterOptionsResponse {
  statuses: string[];
  flagReasons: string[];
}
export interface DatabaseImportResult {
  message: string;
  count: number;
  newCount: number;
  updatedCount: number;
  totalRows: number;
  skippedCount: number;
  skippedRows: Array<{
    rowNum: number;
    firstName: string;
    lastName: string;
    companyName: string;
    branchName?: string;
    status: string;
    message: string;
  }>;
}
