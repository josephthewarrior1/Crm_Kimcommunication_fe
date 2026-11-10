import { ApiService } from './apiService';
import {
  Group,
  GroupListResponse,
  GroupSummaryResponse,
  Company,
  CompanyBranch,
  CompanyFilterOptionsResponse,
  CompanyListResponse,
  DashboardSummaryResponse,
  IndustrySummaryResponse,
  DatabaseUploadTarget,
  DatabaseUploadTargetsResponse,
  Database,
  DatabaseImportResult,
  DatabaseExportResponse,
  DatabaseFilterOptionsResponse,
  DatabaseListResponse,
  DatabaseEmail,
  Event,
  EmsSource,
  EmsSyncPreview,
  EmsSyncResult,
  EventAvailableDatabasesResponse,
  EventActivitySummaryResponse,
  EventFilterOptionsResponse,
  EventListResponse,
  EventParticipant,
  EventParticipantPicSummaryResponse,
  EventParticipantFilterOptions,
  EventParticipantActivity,
  EventParticipantsExportResponse,
  EventParticipantsImportValidationResponse,
  EventParticipantStatisticsResponse,
  RemovalRequest,
  PersonalEmailDomain,
  FlaggedIdentity,
  FlaggedIdentityListResponse,
  FlaggedIdentityFilterOptionsResponse,
  AppUser,
  UserListResponse
} from '../types';

function notifyDatabaseTargetChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new window.Event('database-targets-updated'));
}

export type PmsDestination = 'company' | 'participant';
export interface PmsEventSyncRow {
  pmsEventId: number;
  event: Partial<Event>;
  packageName: string;
  existingEvent?: Event;
  status: 'NEW' | 'EXISTING' | 'CONFLICT';
  message: string;
}
export interface PmsEventSyncPreview { rows: PmsEventSyncRow[]; totalCount: number }
export interface PmsEventSyncResult {
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  failedCount: number;
  totalCount: number;
  errors: Array<{ pmsEventId: number; name: string; message: string }>;
}

const pmsDestination = (value: unknown): value is PmsDestination => value === 'company' || value === 'participant';
const pmsNameKey = (value: string | undefined) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

function planPmsEvents(source: PmsEventSyncRow[], events: Event[]): PmsEventSyncPreview {
  // ponytail: compare one PMS/CRM snapshot directly; index IDs and names if event lists become large.
  return { totalCount: source.length, rows: source.map(row => {
    const mapped = events.filter(event => event.pmsEventId === row.pmsEventId);
    const sameName = events.filter(event => pmsNameKey(event.name) === pmsNameKey(row.event.name));
    const legacy = sameName.filter(event => !event.pmsEventId);
    const repeatedName = source.filter(other => pmsNameKey(other.event.name) === pmsNameKey(row.event.name)).length > 1;
    const conflict = mapped.length > 1 ? 'ID PMS cocok dengan beberapa event CRM. Tinjau pemetaan event.'
      : !mapped.length && repeatedName ? 'Beberapa ID PMS memakai nama event yang sama. Periksa nama event sebelum menghubungkan.'
      : !mapped.length && legacy.length > 1 ? 'Nama cocok dengan beberapa event CRM lama. Tinjau pemetaan event.'
      : !mapped.length && sameName.some(event => event.pmsEventId) ? 'Nama event sudah dipakai oleh ID PMS lain. Periksa pemetaan; event tidak digabung otomatis.' : '';
    const existingEvent = mapped.length === 1 ? mapped[0] : legacy.length === 1 ? legacy[0] : undefined;
    return { ...row, existingEvent, status: conflict ? 'CONFLICT' : existingEvent ? 'EXISTING' : 'NEW', message: conflict };
  }) };
}

export class CrmService extends ApiService {
  constructor() {
    super();
  }

  async previewDataCleaner(): Promise<any> {
    return this.get<any>('/api/data-cleaner/preview');
  }

  async applyDataCleaner(previewToken: string, destination: 'company' | 'participant' = 'company'): Promise<any> {
    const query = new URLSearchParams({ destination, previewToken });
    return this.post<any>(`/api/data-cleaner/apply?${query}`, {});
  }

  async mergeCleanerGroups(targetGroupId: number, sourceGroupIds: number[]): Promise<any> {
    return this.post<any>('/api/data-cleaner/merge-groups', { targetGroupId, sourceGroupIds });
  }

  async getDataCleanerGroupAudit(onlyIssues = false): Promise<any> {
    return this.get<any>(`/api/data-cleaner/group-audit${onlyIssues ? '?onlyIssues=true' : ''}`);
  }

  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    return this.get<DashboardSummaryResponse>('/api/dashboard/summary');
  }

  async getIndustrySummary(): Promise<IndustrySummaryResponse> {
    return this.get<IndustrySummaryResponse>('/api/dashboard/industry-summary');
  }

  async getDatabaseUploadTargets(month?: string, date?: string): Promise<DatabaseUploadTargetsResponse> {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (date) params.set('date', date);
    return this.get<DatabaseUploadTargetsResponse>(`/api/database-targets?${params}`);
  }

  async getMyDatabaseUploadTarget(): Promise<DatabaseUploadTargetsResponse> {
    return this.get<DatabaseUploadTargetsResponse>('/api/database-targets/me');
  }

  async setDatabaseUploadTarget(userId: number, month: string, targetCount: number, targetMode: DatabaseUploadTarget['targetMode']): Promise<void> {
    await this.put(`/api/database-targets/${userId}?month=${encodeURIComponent(month)}`, { targetCount, targetMode });
    notifyDatabaseTargetChange();
  }

  // --- GROUPS ---
  async getGroups(): Promise<Group[]> {
    return this.get<Group[]>('/api/groups');
  }

  async getGroupsList(params?: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    size?: number;
  }): Promise<GroupListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<GroupListResponse>(`/api/groups/list${query ? `?${query}` : ''}`);
  }

  async getGroupsSummary(): Promise<GroupSummaryResponse> {
    return this.get<GroupSummaryResponse>('/api/groups/summary');
  }

  async createGroup(group: Partial<Group>): Promise<Group> {
    return this.post<Group>('/api/groups', group);
  }

  async updateGroup(id: number, group: Partial<Group>): Promise<Group> {
    return this.put<Group>(`/api/groups/${id}`, group);
  }

  async deleteGroup(id: number): Promise<void> {
    return this.delete<void>(`/api/groups/${id}`);
  }

  // --- COMPANIES ---
  async getCompanies(): Promise<Company[]> {
    return this.get<Company[]>('/api/companies');
  }

  async getCompaniesList(params?: {
    search?: string;
    groupId?: string;
    industry?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    size?: number;
  }): Promise<CompanyListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<CompanyListResponse>(`/api/companies/list${query ? `?${query}` : ''}`);
  }

  async getCompanyFilterOptions(): Promise<CompanyFilterOptionsResponse> {
    return this.get<CompanyFilterOptionsResponse>('/api/companies/filter-options');
  }

  async createCompany(company: Partial<Company>, groupId?: number): Promise<Company> {
    const url = groupId ? `/api/companies?groupId=${groupId}` : '/api/companies';
    return this.post<Company>(url, company);
  }

  async updateCompany(id: number, company: Partial<Company>, groupId?: number): Promise<Company> {
    const url = groupId ? `/api/companies/${id}?groupId=${groupId}` : `/api/companies/${id}`;
    return this.put<Company>(url, company);
  }

  async deleteCompany(id: number): Promise<void> {
    return this.delete<void>(`/api/companies/${id}`);
  }

  async getCompanyBranches(companyId: number, signal?: AbortSignal): Promise<CompanyBranch[]> {
    return this.get<CompanyBranch[]>(`/api/companies/${companyId}/branches`, { signal });
  }

  async createCompanyBranch(companyId: number, branch: Partial<CompanyBranch>): Promise<CompanyBranch> {
    return this.post<CompanyBranch>(`/api/companies/${companyId}/branches`, branch);
  }

  async updateCompanyBranch(companyId: number, branchId: number, branch: Partial<CompanyBranch>): Promise<CompanyBranch> {
    return this.put<CompanyBranch>(`/api/companies/${companyId}/branches/${branchId}`, branch);
  }

  async deleteCompanyBranch(companyId: number, branchId: number): Promise<void> {
    return this.delete<void>(`/api/companies/${companyId}/branches/${branchId}`);
  }

  // --- DATABASES ---
  async getDatabases(): Promise<Database[]> {
    return this.get<Database[]>('/api/databases');
  }

  async getDatabasesList(params?: {
    destination?: 'all' | 'company' | 'participant';
    search?: string;
    groupId?: string;
    companyId?: string;
    branchId?: string;
    positionLevel?: string;
    industry?: string;
    city?: string;
    tab?: 'all' | 'clean' | 'dirty';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    size?: number;
  }, signal?: AbortSignal): Promise<DatabaseListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.destination) searchParams.set('destination', params.destination);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.companyId) searchParams.set('companyId', params.companyId);
    if (params?.branchId) searchParams.set('branchId', params.branchId);
    if (params?.positionLevel) searchParams.set('positionLevel', params.positionLevel);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<DatabaseListResponse>(`/api/databases/list${query ? `?${query}` : ''}`, { signal });
  }

  async exportDatabases(params?: {
    destination?: 'all' | 'company' | 'participant';
    search?: string;
    groupId?: string;
    companyId?: string;
    branchId?: string;
    positionLevel?: string;
    industry?: string;
    city?: string;
    tab?: 'all' | 'clean' | 'dirty';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }, signal?: AbortSignal): Promise<DatabaseExportResponse> {
    const searchParams = new URLSearchParams();
    if (params?.destination) searchParams.set('destination', params.destination);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.companyId) searchParams.set('companyId', params.companyId);
    if (params?.branchId) searchParams.set('branchId', params.branchId);
    if (params?.positionLevel) searchParams.set('positionLevel', params.positionLevel);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    const query = searchParams.toString();
    return this.get<DatabaseExportResponse>(`/api/databases/export${query ? `?${query}` : ''}`, { signal });
  }

  async getDatabaseFilterOptions(params?: {
    destination?: 'all' | 'company' | 'participant';
    search?: string;
    groupId?: string;
    companyId?: string;
    branchId?: string;
    positionLevel?: string;
    industry?: string;
    city?: string;
    tab?: 'all' | 'clean' | 'dirty';
  }, signal?: AbortSignal): Promise<DatabaseFilterOptionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.destination) searchParams.set('destination', params.destination);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.companyId) searchParams.set('companyId', params.companyId);
    if (params?.branchId) searchParams.set('branchId', params.branchId);
    if (params?.positionLevel) searchParams.set('positionLevel', params.positionLevel);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.tab) searchParams.set('tab', params.tab);
    const query = searchParams.toString();
    return this.get<DatabaseFilterOptionsResponse>(`/api/databases/filter-options${query ? `?${query}` : ''}`, { signal });
  }

  async createDatabase(database: Omit<Partial<Database>, 'emails'> & { emails?: Partial<DatabaseEmail>[] }, companyId?: number, branchId?: number | null): Promise<Database> {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', String(companyId));
    if (branchId != null) params.set('branchId', String(branchId));
    if (branchId === null) params.set('clearBranch', 'true');
    const url = `/api/databases${params.size ? `?${params}` : ''}`;
    const result = await this.post<Database>(url, database);
    notifyDatabaseTargetChange();
    return result;
  }

  async updateDatabase(id: number, database: Partial<Database>, companyId?: number, branchId?: number | null): Promise<Database> {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', String(companyId));
    if (branchId != null) params.set('branchId', String(branchId));
    if (branchId === null) params.set('clearBranch', 'true');
    const url = `/api/databases/${id}${params.size ? `?${params}` : ''}`;
    return this.put<Database>(url, database);
  }

  async deleteDatabase(id: number): Promise<void> {
    await this.delete<void>(`/api/databases/${id}`);
    notifyDatabaseTargetChange();
  }

  async addDatabaseEmail(databaseId: number, email: Partial<DatabaseEmail>): Promise<DatabaseEmail> {
    return this.post<DatabaseEmail>(`/api/databases/${databaseId}/emails`, email);
  }

  async getDatabaseEmails(databaseId: number, signal?: AbortSignal): Promise<DatabaseEmail[]> {
    return this.get<DatabaseEmail[]>(`/api/databases/${databaseId}/emails`, { signal });
  }

  async updateDatabaseEmail(databaseId: number, emailId: number, email: Partial<DatabaseEmail>): Promise<DatabaseEmail> {
    return this.put<DatabaseEmail>(`/api/databases/${databaseId}/emails/${emailId}`, email);
  }

  async deleteDatabaseEmail(databaseId: number, emailId: number): Promise<void> {
    return this.delete<void>(`/api/databases/${databaseId}/emails/${emailId}`);
  }

  async getDatabaseEventParticipants(databaseId: number, signal?: AbortSignal): Promise<EventParticipant[]> {
    return this.get<EventParticipant[]>(`/api/databases/${databaseId}/event-participants`, { signal });
  }

  // --- EVENTS ---
  async getEvents(): Promise<Event[]> {
    return this.get<Event[]>('/api/events');
  }

  async getEventsList(params?: {
    search?: string;
    page?: number;
    size?: number;
  }): Promise<EventListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<EventListResponse>(`/api/events/list${query ? `?${query}` : ''}`);
  }

  async getEventFilterOptions(): Promise<EventFilterOptionsResponse> {
    return this.get<EventFilterOptionsResponse>('/api/events/filter-options');
  }

  async getEventById(id: number): Promise<Event> {
    return this.get<Event>(`/api/events/${id}`);
  }

  async getAvailableDatabasesForEvent(
    eventId: number,
    params?: {
      search?: string;
      company?: string;
      position?: string;
      industry?: string;
      city?: string;
      invitedEventId?: string;
    }
  ): Promise<EventAvailableDatabasesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.company) searchParams.set('company', params.company);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.invitedEventId) searchParams.set('invitedEventId', params.invitedEventId);
    const query = searchParams.toString();
    return this.get<EventAvailableDatabasesResponse>(`/api/events/${eventId}/available-databases${query ? `?${query}` : ''}`);
  }

  async getEligibleManagersForEvent(eventId: number): Promise<AppUser[]> {
    return this.get<AppUser[]>(`/api/events/${eventId}/eligible-managers`);
  }

  async getEventParticipantsByEvent(
    eventId: number,
    params?: {
      tab?: string;
      pic?: string;
      company?: string;
      position?: string;
      industry?: string;
      confirmationStatus?: string;
      remarks?: string;
      reminderHariH?: string;
      search?: string;
      page?: number;
      size?: number;
    }
  ): Promise<{ eventId: number; page: number; size: number; total: number; totalPages: number; items: EventParticipant[] }> {
    const searchParams = new URLSearchParams();
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.pic) searchParams.set('pic', params.pic);
    if (params?.company) searchParams.set('company', params.company);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.confirmationStatus) searchParams.set('confirmationStatus', params.confirmationStatus);
    if (params?.remarks && params.tab === 'pre_event') searchParams.set('remarks', params.remarks);
    if (params?.reminderHariH) searchParams.set('reminderHariH', params.reminderHariH);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<{ eventId: number; page: number; size: number; total: number; totalPages: number; items: EventParticipant[] }>(
      `/api/events/${eventId}/participants${query ? `?${query}` : ''}`
    );
  }

  async getEventParticipantsSummary(
    eventId: number,
    params?: {
      tab?: string;
      pic?: string;
      company?: string;
      position?: string;
      industry?: string;
      confirmationStatus?: string;
      remarks?: string;
      reminderHariH?: string;
      search?: string;
    }
  ): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.pic) searchParams.set('pic', params.pic);
    if (params?.company) searchParams.set('company', params.company);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.confirmationStatus) searchParams.set('confirmationStatus', params.confirmationStatus);
    if (params?.remarks && params.tab === 'pre_event') searchParams.set('remarks', params.remarks);
    if (params?.reminderHariH) searchParams.set('reminderHariH', params.reminderHariH);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return this.get<any>(`/api/events/${eventId}/participants/summary${query ? `?${query}` : ''}`);
  }

  async exportEventParticipants(
    eventId: number,
    params?: {
      tab?: string;
      pic?: string;
      company?: string;
      position?: string;
      industry?: string;
      confirmationStatus?: string;
      remarks?: string;
      reminderHariH?: string;
      search?: string;
    }
  ): Promise<EventParticipantsExportResponse> {
    const searchParams = new URLSearchParams();
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.pic) searchParams.set('pic', params.pic);
    if (params?.company) searchParams.set('company', params.company);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.confirmationStatus) searchParams.set('confirmationStatus', params.confirmationStatus);
    if (params?.remarks && params.tab === 'pre_event') searchParams.set('remarks', params.remarks);
    if (params?.reminderHariH) searchParams.set('reminderHariH', params.reminderHariH);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return this.get<EventParticipantsExportResponse>(`/api/events/${eventId}/participants/export${query ? `?${query}` : ''}`);
  }

  async validateEventParticipantsImport(
    eventId: number,
    file: File,
    destination: 'company' | 'participant',
    tab?: string
  ): Promise<EventParticipantsImportValidationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destination', destination);
    if (tab) formData.append('tab', tab);
    return this.postFormData<EventParticipantsImportValidationResponse>(`/api/events/${eventId}/participants/import/validate`, formData);
  }

  async importEventParticipants(
    eventId: number,
    file: File,
    destination: 'company' | 'participant',
    tab?: string
  ): Promise<{
    message: string;
    eventId: number;
    eventName: string;
    addedParticipants: number;
    skippedParticipants: number;
    createdContacts: number;
    updatedContacts: number;
    totalRows: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destination', destination);
    if (tab) formData.append('tab', tab);
    return this.postFormData<{
      message: string;
      eventId: number;
      eventName: string;
      addedParticipants: number;
      skippedParticipants: number;
      createdContacts: number;
      updatedContacts: number;
      totalRows: number;
    }>(`/api/events/${eventId}/participants/import`, formData);
  }

  async getEventParticipantsSummaryByPic(
    eventId: number,
    params?: {
      tab?: string;
      pic?: string;
      company?: string;
      position?: string;
      industry?: string;
      confirmationStatus?: string;
      remarks?: string;
      reminderHariH?: string;
      search?: string;
    }
  ): Promise<EventParticipantPicSummaryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.pic) searchParams.set('pic', params.pic);
    if (params?.company) searchParams.set('company', params.company);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.confirmationStatus) searchParams.set('confirmationStatus', params.confirmationStatus);
    if (params?.remarks && params.tab === 'pre_event') searchParams.set('remarks', params.remarks);
    if (params?.reminderHariH) searchParams.set('reminderHariH', params.reminderHariH);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return this.get<EventParticipantPicSummaryResponse>(`/api/events/${eventId}/participants/summary-by-pic${query ? `?${query}` : ''}`);
  }

  async getEventStatistics(
    eventId: number,
    params?: {
      tab?: string;
      pic?: string;
      company?: string;
      position?: string;
      industry?: string;
      confirmationStatus?: string;
      remarks?: string;
      reminderHariH?: string;
      search?: string;
    }
  ): Promise<EventParticipantStatisticsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.pic) searchParams.set('pic', params.pic);
    if (params?.company) searchParams.set('company', params.company);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.confirmationStatus) searchParams.set('confirmationStatus', params.confirmationStatus);
    if (params?.remarks && params.tab === 'pre_event') searchParams.set('remarks', params.remarks);
    if (params?.reminderHariH) searchParams.set('reminderHariH', params.reminderHariH);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return this.get<EventParticipantStatisticsResponse>(`/api/events/${eventId}/statistics${query ? `?${query}` : ''}`);
  }

  async getEventParticipantFilterOptions(
    eventId: number,
    params?: {
      tab?: string;
      pic?: string;
      company?: string;
      position?: string;
      industry?: string;
      confirmationStatus?: string;
      remarks?: string;
      reminderHariH?: string;
      search?: string;
    }
  ): Promise<EventParticipantFilterOptions> {
    const searchParams = new URLSearchParams();
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.pic) searchParams.set('pic', params.pic);
    if (params?.company) searchParams.set('company', params.company);
    if (params?.position) searchParams.set('position', params.position);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.confirmationStatus) searchParams.set('confirmationStatus', params.confirmationStatus);
    if (params?.remarks && params.tab === 'pre_event') searchParams.set('remarks', params.remarks);
    if (params?.reminderHariH) searchParams.set('reminderHariH', params.reminderHariH);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return this.get<EventParticipantFilterOptions>(`/api/events/${eventId}/participants/filter-options${query ? `?${query}` : ''}`);
  }

  async autoSplitEventAssignments(
    eventId: number,
    payload: { mode?: 'all' | 'unassigned'; managerIds?: number[] }
  ): Promise<{ eventId: number; updatedCount: number; managerCount: number; mode: string }> {
    return this.post<{ eventId: number; updatedCount: number; managerCount: number; mode: string }>(
      `/api/events/${eventId}/assignments/auto-split`,
      payload
    );
  }

  async previewPmsEvents(): Promise<PmsEventSyncPreview> {
    const pmsUrl = process.env.NEXT_PUBLIC_PMS_URL || 'https://pms.kimcommunication.com/api/public/events';
    const response = await fetch(pmsUrl, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!response.ok) throw new Error(`PMS server returned status ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Daftar event PMS tidak valid. Muat preview ulang.');
    const ids = new Set<number>();
    const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
    const source = data.map((item): PmsEventSyncRow => {
      if (!item || typeof item !== 'object') throw new Error('Baris event PMS tidak valid.');
      const id = typeof item.id === 'string' && /^[1-9]\d*$/.test(item.id) ? Number(item.id) : item.id;
      if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id)) throw new Error('ID event PMS tidak valid atau berulang. Periksa sumber PMS.');
      ids.add(id);
      const name = text(item.name);
      if (!name) throw new Error(`Nama event PMS #${id} kosong. Perbaiki di PMS sebelum sync.`);
      const packageName = text(item.addOn || item.add_on || item.package || item.packageName || item.package_name || item.addOnPackage || item.add_on_package || item.servicePackage || item.service_package);
      const notes = text(item.description || item.notes || item.venueName);
      const eventType = text(item.eventType).toLowerCase();
      return { pmsEventId: id, packageName, status: 'NEW', message: '', event: {
        pmsEventId: id, name, eventType: ['partner', 'end_user', 'internal', 'other'].includes(eventType) ? eventType : 'other',
        clientName: text(item.client || item.clientName), dateStart: text(item.startDate || item.dateStart).slice(0, 10),
        dateEnd: text(item.endDate || item.dateEnd).slice(0, 10),
        targetParticipants: Number.isSafeInteger(item.targetPax || item.targetParticipants) ? (item.targetPax || item.targetParticipants) : 0,
        notes: packageName ? [notes, `Package: ${packageName}`].filter(Boolean).join(' | ') : notes,
      } };
    });
    return planPmsEvents(source, await this.getEvents());
  }

  async syncPmsEvents(preview: PmsEventSyncPreview, choices: Record<number, PmsDestination>): Promise<PmsEventSyncResult> {
    const current = planPmsEvents(preview.rows, await this.getEvents());
    const missing = current.rows.find(row => row.status !== 'CONFLICT'
      && !pmsDestination(row.existingEvent?.syncDestination) && !pmsDestination(choices[row.pmsEventId]));
    if (missing) throw new Error(`Pilih jenis event untuk "${missing.event.name}" sebelum menyimpan.`);
    const result: PmsEventSyncResult = { createdCount: 0, updatedCount: 0, unchangedCount: 0, failedCount: 0, totalCount: current.totalCount, errors: [] };
    for (const row of current.rows) {
      try {
        if (row.status === 'CONFLICT') throw new Error(row.message);
        const previous = preview.rows.find(item => item.pmsEventId === row.pmsEventId);
        const existing = row.existingEvent;
        if (previous?.existingEvent?.id !== existing?.id || previous?.existingEvent?.syncDestination !== existing?.syncDestination) {
          throw new Error('Pemetaan atau jenis event berubah sejak preview. Muat preview ulang.');
        }
        if (!existing) {
          await this.createEvent({ ...row.event, syncDestination: choices[row.pmsEventId] });
          result.createdCount++;
          continue;
        }
        const packageText = row.packageName ? `Package: ${row.packageName}` : '';
        const notes = packageText && !existing.notes?.split(' | ').some(part => part.trim() === packageText)
          ? [existing.notes, packageText].filter(Boolean).join(' | ') : existing.notes;
        const needsKind = !pmsDestination(existing.syncDestination);
        if (!existing.pmsEventId || notes !== existing.notes || needsKind) {
          // PUT requires the persisted event fields; do not send participant data or replace an existing destination.
          await this.updateEvent(existing.id, {
            name: existing.name, eventType: existing.eventType, clientName: existing.clientName,
            dateStart: existing.dateStart, dateEnd: existing.dateEnd, notes,
            targetParticipants: existing.targetParticipants, emsEventId: existing.emsEventId, emsSource: existing.emsSource,
            pmsEventId: row.pmsEventId, ...(needsKind ? { syncDestination: choices[row.pmsEventId] } : {}),
          });
          result.updatedCount++;
        } else result.unchangedCount++;
      } catch (failure) {
        result.failedCount++;
        result.errors.push({ pmsEventId: row.pmsEventId, name: row.event.name || '',
          message: failure instanceof Error ? failure.message : 'Event gagal disinkronkan.' });
      }
    }
    return result;
  }

  async createEvent(event: Partial<Event>): Promise<Event> {
    return this.post<Event>('/api/events', event);
  }

  async updateEvent(id: number, event: Partial<Event>): Promise<Event> {
    return this.put<Event>(`/api/events/${id}`, event);
  }

  async deleteEvent(id: number): Promise<void> {
    return this.delete<void>(`/api/events/${id}`);
  }

  // ponytail: fetch upcoming EMS events for dropdown mapping via backend proxy
  async getEmsEvents(source: EmsSource = 'LEGACY'): Promise<{ id: number; name: string }[]> {
    const json: any = await this.get(`/api/events/ems-upcoming?source=${source}`);
    if (source === 'V2' && json?.source !== 'V2') throw new Error('Backend CRM belum mendukung EMS baru. Perbarui backend sebelum menghubungkan event.');
    const list = Array.isArray(json) ? json : json?.data;
    if (!Array.isArray(list)) throw new Error('Daftar event EMS tidak valid. Coba muat ulang.');
    const seen = new Set<number>();
    return list.map((item: any) => {
      const id = typeof item?.id === 'string' && /^[1-9]\d*$/.test(item.id) ? Number(item.id) : item?.id;
      if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) throw new Error('ID pada daftar event EMS tidak valid.');
      seen.add(id);
      return { id, name: typeof item.name === 'string' && item.name.trim() ? item.name : `EMS Event #${id}` };
    });
  }

  // ponytail: fetch participants for a specific EMS event
  async getEmsEventParticipants(emsEventId: number): Promise<any[]> {
    try {
      const json: any = await this.get(`/api/events/ems-participants/${emsEventId}`);
      return Array.isArray(json) ? json : (json?.data || []);
    } catch (error) {
      console.error('Error fetching EMS event participants:', error);
      return [];
    }
  }

  // ponytail: trigger EMS participant sync for a CRM event
  async previewEmsParticipants(eventId: number): Promise<EmsSyncPreview> {
    return this.post<EmsSyncPreview>(`/api/events/${eventId}/sync-ems/preview`, {});
  }

  async setEventSyncDestination(eventId: number, destination: 'company' | 'participant'): Promise<Event> {
    return this.patch<Event>(`/api/events/${eventId}/sync-destination`, { destination });
  }

  async syncEmsParticipants(eventId: number, confirmation: { previewToken: string }): Promise<EmsSyncResult> {
    return this.post<EmsSyncResult>(`/api/events/${eventId}/sync-ems`, confirmation);
  }

  // --- EVENT PARTICIPANTS ---
  async getEventParticipants(): Promise<EventParticipant[]> {
    return this.get<EventParticipant[]>('/api/event-participants');
  }

  async createEventParticipant(participant: {
    eventId: number;
    databaseId?: number;
    databaseIds?: number[];
    participantStatus?: string;
    attendanceStatus?: string;
    confirmationStatus?: string;
    preEventApprovalStatus?: string;
    notes?: string;
  }): Promise<any> {
    return this.post<any>('/api/event-participants', participant);
  }

  async updateParticipantStatus(
    participantId: number,
    participantStatus?: string | null,
    attendanceStatus?: string | null,
    notes?: string | null,
    participantCategory?: string | null,
    callStatus?: string | null,
    emailStatus?: string | null,
    whatsappStatus?: string | null,
    meetingStatus?: string | null,
    businessChallenges?: string | null,
    projectInfo?: string | null,
    timeline?: string | null,
    reminderH7?: string | null,
    reminderH3?: string | null,
    reminderH1?: string | null,
    reminderHariH?: string | null,
    confirmationStatus?: string | null,
    preEventApprovalStatus?: string | null
  ): Promise<EventParticipant> {
    const params = new URLSearchParams();
    const appendParam = (key: string, value?: string | null, allowEmpty = false) => {
      if (value === undefined || value === null || value === 'null' || value === 'undefined') return;
      if (!allowEmpty && value === '') return;
      params.append(key, value);
    };

    appendParam('participantStatus', participantStatus);
    appendParam('attendanceStatus', attendanceStatus);
    appendParam('notes', notes);
    appendParam('participantCategory', participantCategory);
    appendParam('callStatus', callStatus);
    appendParam('emailStatus', emailStatus);
    appendParam('whatsappStatus', whatsappStatus);
    appendParam('meetingStatus', meetingStatus);
    appendParam('businessChallenges', businessChallenges);
    appendParam('projectInfo', projectInfo);
    appendParam('timeline', timeline);
    appendParam('reminderH7', reminderH7, true);
    appendParam('reminderH3', reminderH3, true);
    appendParam('reminderH1', reminderH1, true);
    appendParam('reminderHariH', reminderHariH, true);
    appendParam('confirmationStatus', confirmationStatus);
    appendParam('preEventApprovalStatus', preEventApprovalStatus);

    return this.put<EventParticipant>(`/api/event-participants/${participantId}/status?${params.toString()}`);
  }

  async updatePreEventApprovalStatus(
    participantId: number,
    notes: string | undefined,
    preEventApprovalStatus: string
  ): Promise<EventParticipant> {
    const params = new URLSearchParams();
    if (notes) params.append('notes', notes);
    params.append('preEventApprovalStatus', preEventApprovalStatus);
    return this.put<EventParticipant>(`/api/event-participants/${participantId}/status?${params.toString()}`);
  }

  async addEventParticipantActivity(
    participantId: number,
    activity: { activityType: string; status: string; notes?: string }
  ): Promise<EventParticipantActivity> {
    return this.post<EventParticipantActivity>(`/api/event-participants/${participantId}/activities`, activity);
  }

  async getEventParticipantActivities(participantId: number): Promise<EventParticipantActivity[]> {
    return this.get<EventParticipantActivity[]>(`/api/event-participants/${participantId}/activities`);
  }

  async getAllEventActivities(eventId: number, startDate?: string, endDate?: string): Promise<EventParticipantActivity[]> {
    let url = `/api/event-participants/event/${eventId}/activities`;
    if (startDate && endDate) {
      url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    }
    return this.get<EventParticipantActivity[]>(url);
  }

  async getEventActivitySummary(
    eventId: number,
    params?: {
      startDate?: string;
      endDate?: string;
      pic?: string;
    }
  ): Promise<EventActivitySummaryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.pic) searchParams.set('pic', params.pic);
    const query = searchParams.toString();
    return this.get<EventActivitySummaryResponse>(`/api/event-participants/event/${eventId}/activity-summary${query ? `?${query}` : ''}`);
  }

  async getEventReport(eventId: number): Promise<any> {
    return this.get<any>(`/api/event-participants/report/${eventId}`);
  }

  async deleteEventParticipant(id: number): Promise<void> {
    return this.delete<void>(`/api/event-participants/${id}`);
  }

  // --- REMOVAL REQUESTS ---
  async getRemovalRequests(): Promise<RemovalRequest[]> {
    return this.get<RemovalRequest[]>('/api/removal-requests');
  }

  async createRemovalRequest(request: {
    databaseId: number;
    reason?: string;
    requestedBy?: string;
    sourceDb?: string;
    notes?: string;
    status?: string;
  }): Promise<RemovalRequest> {
    return this.post<RemovalRequest>('/api/removal-requests', request);
  }

  async updateRemovalRequestStatus(id: number, status: string): Promise<RemovalRequest> {
    return this.put<RemovalRequest>(`/api/removal-requests/${id}/status?status=${encodeURIComponent(status)}`);
  }

  // --- PERSONAL EMAIL DOMAINS ---
  async getPersonalEmailDomains(): Promise<PersonalEmailDomain[]> {
    return this.get<PersonalEmailDomain[]>('/api/personal-email-domains');
  }

  async createPersonalEmailDomain(domain: Partial<PersonalEmailDomain>): Promise<PersonalEmailDomain> {
    return this.post<PersonalEmailDomain>('/api/personal-email-domains', domain);
  }

  // --- FLAGGED IDENTITIES ("TIKUS" DETECTION) ---
  async getFlaggedIdentities(): Promise<FlaggedIdentity[]> {
    return this.get<FlaggedIdentity[]>('/api/flagged-identities');
  }

  async getFlaggedIdentitiesList(params?: {
    search?: string;
    status?: string;
    flagReason?: string;
    page?: number;
    size?: number;
  }): Promise<FlaggedIdentityListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.flagReason) searchParams.set('flagReason', params.flagReason);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<FlaggedIdentityListResponse>(`/api/flagged-identities/list${query ? `?${query}` : ''}`);
  }

  async getFlaggedIdentitiesFilterOptions(): Promise<FlaggedIdentityFilterOptionsResponse> {
    return this.get<FlaggedIdentityFilterOptionsResponse>('/api/flagged-identities/filter-options');
  }

  async createFlaggedIdentity(identity: Partial<FlaggedIdentity>): Promise<FlaggedIdentity> {
    return this.post<FlaggedIdentity>('/api/flagged-identities', identity);
  }

  async updateFlaggedIdentity(id: number, identity: Partial<FlaggedIdentity>): Promise<FlaggedIdentity> {
    return this.put<FlaggedIdentity>(`/api/flagged-identities/${id}`, identity);
  }

  async deleteFlaggedIdentity(id: number): Promise<void> {
    return this.delete<void>(`/api/flagged-identities/${id}`);
  }

  // --- EXCEL IMPORT ---
  async previewDatabasesExcel(file: File, destination: 'company' | 'participant'): Promise<{
    destination: 'company' | 'participant';
    totalRows: number;
    newCount: number;
    duplicateCount: number;
    incompleteCount: number;
    conflictCount: number;
    rows: Array<{
      rowNum: number;
      groupName: string;
      companyName: string;
      branchName?: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      email: string;
      status: 'NEW' | 'DUPLICATE' | 'INCOMPLETE' | 'CONFLICT' | 'ERROR';
      companyEmail?: string;
      personalEmail?: string;
      mobilePhone?: string;
      existingDatabaseId?: number;
      message: string;
    }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${this.baseUrl}/api/databases/import/preview?destination=${destination}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          message = errorData.message;
        }
      } catch {}
      throw new Error(message);
    }

    return response.json();
  }

  async importDatabasesExcel(file: File, destination: 'company' | 'participant'): Promise<DatabaseImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${this.baseUrl}/api/databases/import?destination=${destination}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          message = errorData.message;
        }
      } catch {}
      throw new Error(message);
    }

    const result = await response.json();
    notifyDatabaseTargetChange();
    return result;
  }

  // --- USER MANAGEMENT ---
  async getUsers(): Promise<AppUser[]> {
    return this.get<AppUser[]>('/api/users');
  }

  async getUsersList(params?: {
    search?: string;
    role?: string;
    page?: number;
    size?: number;
  }): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.role) searchParams.set('role', params.role);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<UserListResponse>(`/api/users/list${query ? `?${query}` : ''}`);
  }

  async updateUserRole(id: number, role: string): Promise<AppUser> {
    return this.put<AppUser>(`/api/users/${id}/role?role=${encodeURIComponent(role)}`);
  }

  async updateUserPassword(id: number, password: string): Promise<AppUser> {
    return this.put<AppUser>(`/api/users/${id}/password`, { password });
  }

  async updateUserAllowedEvents(id: number, eventIds: number[]): Promise<AppUser> {
    return this.put<AppUser>(`/api/users/${id}/allowed-events`, eventIds);
  }

  async updateUserProfile(id: number, data: { username?: string; fullName?: string; email?: string }): Promise<AppUser> {
    return this.put<AppUser>(`/api/users/${id}/profile`, data);
  }

  async getUserById(id: number): Promise<AppUser> {
    return this.get<AppUser>(`/api/users/${id}`);
  }

  async bulkUpdateEventParticipants(payload: {
    participantIds: number[];
    participantStatus?: string;
    attendanceStatus?: string;
    confirmationStatus?: string;
    preEventApprovalStatus?: string;
    reminderH7?: string;
    reminderH3?: string;
    reminderH1?: string;
    reminderHariH?: string;
    callStatus?: string;
    emailStatus?: string;
    whatsappStatus?: string;
    meetingStatus?: string;
    participantCategory?: string;
    businessChallenges?: string;
    projectInfo?: string;
    timeline?: string;
    notes?: string;
    picName?: string;
  }): Promise<{ updatedCount: number; skippedCount: number; items: EventParticipant[] }> {
    return this.patch<{ updatedCount: number; skippedCount: number; items: EventParticipant[] }>(
      '/api/event-participants/bulk',
      payload
    );
  }

  async deleteUser(id: number): Promise<void> {
    return this.delete<void>(`/api/users/${id}`);
  }
}

export const crmService = new CrmService();
