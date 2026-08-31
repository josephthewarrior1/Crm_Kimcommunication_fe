import { ApiService } from './apiService';
import {
  Group,
  GroupListResponse,
  GroupSummaryResponse,
  Company,
  CompanyFilterOptionsResponse,
  CompanyListResponse,
  DashboardSummaryResponse,
  Database,
  DatabaseFilterOptionsResponse,
  DatabaseListResponse,
  DatabaseEmail,
  Event,
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

export class CrmService extends ApiService {
  constructor() {
    super();
  }

  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    return this.get<DashboardSummaryResponse>('/api/dashboard/summary');
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

  // --- DATABASES ---
  async getDatabases(): Promise<Database[]> {
    return this.get<Database[]>('/api/databases');
  }

  async getDatabasesList(params?: {
    search?: string;
    groupId?: string;
    companyId?: string;
    positionLevel?: string;
    industry?: string;
    city?: string;
    tab?: 'all' | 'clean' | 'dirty';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    size?: number;
  }): Promise<DatabaseListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.companyId) searchParams.set('companyId', params.companyId);
    if (params?.positionLevel) searchParams.set('positionLevel', params.positionLevel);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.tab) searchParams.set('tab', params.tab);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    return this.get<DatabaseListResponse>(`/api/databases/list${query ? `?${query}` : ''}`);
  }

  async getDatabaseFilterOptions(params?: {
    search?: string;
    groupId?: string;
    companyId?: string;
    positionLevel?: string;
    industry?: string;
    city?: string;
    tab?: 'all' | 'clean' | 'dirty';
  }): Promise<DatabaseFilterOptionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.companyId) searchParams.set('companyId', params.companyId);
    if (params?.positionLevel) searchParams.set('positionLevel', params.positionLevel);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.tab) searchParams.set('tab', params.tab);
    const query = searchParams.toString();
    return this.get<DatabaseFilterOptionsResponse>(`/api/databases/filter-options${query ? `?${query}` : ''}`);
  }

  async createDatabase(database: Partial<Database>, companyId?: number): Promise<Database> {
    const url = companyId ? `/api/databases?companyId=${companyId}` : '/api/databases';
    return this.post<Database>(url, database);
  }

  async updateDatabase(id: number, database: Partial<Database>, companyId?: number): Promise<Database> {
    const url = companyId ? `/api/databases/${id}?companyId=${companyId}` : `/api/databases/${id}`;
    return this.put<Database>(url, database);
  }

  async deleteDatabase(id: number): Promise<void> {
    return this.delete<void>(`/api/databases/${id}`);
  }

  async addDatabaseEmail(databaseId: number, email: Partial<DatabaseEmail>): Promise<DatabaseEmail> {
    return this.post<DatabaseEmail>(`/api/databases/${databaseId}/emails`, email);
  }

  async getDatabaseEmails(databaseId: number): Promise<DatabaseEmail[]> {
    return this.get<DatabaseEmail[]>(`/api/databases/${databaseId}/emails`);
  }

  async updateDatabaseEmail(databaseId: number, emailId: number, email: Partial<DatabaseEmail>): Promise<DatabaseEmail> {
    return this.put<DatabaseEmail>(`/api/databases/${databaseId}/emails/${emailId}`, email);
  }

  async deleteDatabaseEmail(databaseId: number, emailId: number): Promise<void> {
    return this.delete<void>(`/api/databases/${databaseId}/emails/${emailId}`);
  }

  async getDatabaseEventParticipants(databaseId: number): Promise<EventParticipant[]> {
    return this.get<EventParticipant[]>(`/api/databases/${databaseId}/event-participants`);
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
    if (params?.reminderHariH) searchParams.set('reminderHariH', params.reminderHariH);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return this.get<EventParticipantsExportResponse>(`/api/events/${eventId}/participants/export${query ? `?${query}` : ''}`);
  }

  async validateEventParticipantsImport(
    eventId: number,
    file: File,
    tab?: string
  ): Promise<EventParticipantsImportValidationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (tab) formData.append('tab', tab);
    return this.postFormData<EventParticipantsImportValidationResponse>(`/api/events/${eventId}/participants/import/validate`, formData);
  }

  async importEventParticipants(
    eventId: number,
    file: File,
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

  async syncPmsEvents(): Promise<{ syncedCount: number; totalCount: number }> {
    // ponytail: manual on-demand sync from PMS endpoint (configurable via NEXT_PUBLIC_PMS_URL) to local CRM DB
    const pmsUrl = process.env.NEXT_PUBLIC_PMS_URL || 'https://pms.kimcommunication.com/api/public/events';
    const response = await fetch(pmsUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`PMS server returned status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return { syncedCount: 0, totalCount: 0 };
    }

    const crmEvents = await this.getEvents();
    let syncedCount = 0;

    for (const item of data) {
      const pmsEvId = item.id;
      const pmsName = item.name || 'Untitled Event';
      const addOn = item.addOn || item.add_on || item.package || item.packageName || item.package_name || item.addOnPackage || item.add_on_package || item.servicePackage || item.service_package || null;

      const existingEv = crmEvents.find(
        (crmEv) =>
          (crmEv.pmsEventId && crmEv.pmsEventId === pmsEvId) ||
          (crmEv.name && pmsName && crmEv.name.trim().toLowerCase() === pmsName.trim().toLowerCase())
      );

      if (!existingEv) {
        try {
          const eventType = ['partner', 'end_user', 'internal', 'other'].includes((item.eventType || '').toLowerCase())
            ? (item.eventType || '').toLowerCase()
            : 'partner';

          const notesText = item.description || item.notes || item.venueName || '';
          const finalNotes = addOn ? (notesText ? `${notesText} | Package: ${addOn}` : `Package: ${addOn}`) : notesText;

          await this.createEvent({
            name: pmsName,
            eventType,
            clientName: item.client || item.clientName || '',
            dateStart: item.startDate || item.dateStart || '',
            dateEnd: item.endDate || item.dateEnd || '',
            notes: finalNotes,
            addOn: addOn,
            targetParticipants: item.targetPax || item.targetParticipants || 0,
            pmsEventId: pmsEvId,
          });
          syncedCount++;
        } catch (err) {
          console.error(`Failed to sync PMS event "${pmsName}":`, err);
        }
      } else {
        // Sync addOn / package info to existing event if missing
        if (addOn && (!existingEv.addOn || !existingEv.notes?.includes(addOn))) {
          try {
            const updatedNotes = existingEv.notes 
              ? (existingEv.notes.includes('Package:') ? existingEv.notes : `${existingEv.notes} | Package: ${addOn}`) 
              : `Package: ${addOn}`;
            await this.updateEvent(existingEv.id, {
              ...existingEv,
              addOn: addOn,
              notes: updatedNotes
            });
            syncedCount++;
          } catch (err) {
            console.error(`Failed to update addOn for existing event "${pmsName}":`, err);
          }
        }
      }
    }

    return { syncedCount, totalCount: data.length };
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
  async getEmsEvents(): Promise<{ id: number; name: string }[]> {
    try {
      const json: any = await this.get('/api/events/ems-upcoming');
      const list = Array.isArray(json) ? json : (json?.data || []);
      return list.map((item: any) => ({
        id: item.id,
        name: item.name || `EMS Event #${item.id}`
      }));
    } catch (error) {
      console.error('Error fetching EMS events from backend:', error);
      return [];
    }
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
  async syncEmsParticipants(eventId: number): Promise<{ message: string; count: number }> {
    return this.post<{ message: string; count: number }>(`/api/events/${eventId}/sync-ems`, {});
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
  async previewDatabasesExcel(file: File): Promise<{
    totalRows: number;
    newCount: number;
    duplicateCount: number;
    rows: Array<{
      rowNum: number;
      groupName: string;
      companyName: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      email: string;
      status: 'NEW' | 'DUPLICATE';
      message: string;
    }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${this.baseUrl}/api/databases/import/preview`, {
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

  async importDatabasesExcel(file: File): Promise<{ message: string; count: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${this.baseUrl}/api/databases/import`, {
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
