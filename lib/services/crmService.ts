import { ApiService } from './apiService';
import {
  Group,
  Company,
  Database,
  DatabaseEmail,
  Event,
  EventLead,
  EventLeadActivity,
  RemovalRequest,
  PersonalEmailDomain,
  FlaggedIdentity,
  AppUser
} from '../types';

export class CrmService extends ApiService {
  constructor() {
    super();
  }

  // --- GROUPS ---
  async getGroups(): Promise<Group[]> {
    return this.get<Group[]>('/api/groups');
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

  async getDatabaseEventLeads(databaseId: number): Promise<EventLead[]> {
    return this.get<EventLead[]>(`/api/databases/${databaseId}/event-leads`);
  }

  // --- EVENTS ---
  async getEvents(): Promise<Event[]> {
    return this.get<Event[]>('/api/events');
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

  // --- EVENT LEADS ---
  async getEventLeads(): Promise<EventLead[]> {
    return this.get<EventLead[]>('/api/event-leads');
  }

  async createEventLead(lead: {
    eventId: number;
    databaseId?: number;
    databaseIds?: number[];
    leadStatus?: string;
    attendanceStatus?: string;
    confirmationStatus?: string;
    notes?: string;
  }): Promise<any> {
    return this.post<any>('/api/event-leads', lead);
  }

  async updateLeadStatus(
    leadId: number,
    leadStatus?: string,
    attendanceStatus?: string,
    notes?: string,
    leadCategory?: string,
    callStatus?: string,
    emailStatus?: string,
    whatsappStatus?: string,
    meetingStatus?: string,
    businessChallenges?: string,
    projectInfo?: string,
    timeline?: string,
    reminderH7?: string,
    reminderH3?: string,
    reminderH1?: string,
    reminderHariH?: string,
    confirmationStatus?: string
  ): Promise<EventLead> {
    const params = new URLSearchParams();
    if (leadStatus) params.append('leadStatus', leadStatus);
    if (attendanceStatus) params.append('attendanceStatus', attendanceStatus);
    if (notes) params.append('notes', notes);
    if (leadCategory) params.append('leadCategory', leadCategory);
    if (callStatus) params.append('callStatus', callStatus);
    if (emailStatus) params.append('emailStatus', emailStatus);
    if (whatsappStatus) params.append('whatsappStatus', whatsappStatus);
    if (meetingStatus) params.append('meetingStatus', meetingStatus);
    if (businessChallenges) params.append('businessChallenges', businessChallenges);
    if (projectInfo) params.append('projectInfo', projectInfo);
    if (timeline) params.append('timeline', timeline);
    if (reminderH7) params.append('reminderH7', reminderH7);
    if (reminderH3) params.append('reminderH3', reminderH3);
    if (reminderH1) params.append('reminderH1', reminderH1);
    if (reminderHariH) params.append('reminderHariH', reminderHariH);
    if (confirmationStatus) params.append('confirmationStatus', confirmationStatus);

    return this.put<EventLead>(`/api/event-leads/${leadId}/status?${params.toString()}`);
  }

  async addEventLeadActivity(
    leadId: number,
    activity: { activityType: string; status: string; notes?: string }
  ): Promise<EventLeadActivity> {
    return this.post<EventLeadActivity>(`/api/event-leads/${leadId}/activities`, activity);
  }

  async getEventLeadActivities(leadId: number): Promise<EventLeadActivity[]> {
    return this.get<EventLeadActivity[]>(`/api/event-leads/${leadId}/activities`);
  }

  async getEventReport(eventId: number): Promise<any> {
    return this.get<any>(`/api/event-leads/report/${eventId}`);
  }

  async deleteEventLead(id: number): Promise<void> {
    return this.delete<void>(`/api/event-leads/${id}`);
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

  async updateUserRole(id: number, role: string): Promise<AppUser> {
    return this.put<AppUser>(`/api/users/${id}/role?role=${encodeURIComponent(role)}`);
  }

  async updateUserPassword(id: number, password: string): Promise<AppUser> {
    return this.put<AppUser>(`/api/users/${id}/password`, { password });
  }

  async deleteUser(id: number): Promise<void> {
    return this.delete<void>(`/api/users/${id}`);
  }
}

export const crmService = new CrmService();
