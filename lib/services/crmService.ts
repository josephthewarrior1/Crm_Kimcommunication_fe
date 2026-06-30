import { ApiService } from './apiService';
import {
  Group,
  Company,
  Contact,
  ContactEmail,
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

  // --- CONTACTS ---
  async getContacts(): Promise<Contact[]> {
    return this.get<Contact[]>('/api/contacts');
  }

  async createContact(contact: Partial<Contact>, companyId?: number): Promise<Contact> {
    const url = companyId ? `/api/contacts?companyId=${companyId}` : '/api/contacts';
    return this.post<Contact>(url, contact);
  }

  async updateContact(id: number, contact: Partial<Contact>, companyId?: number): Promise<Contact> {
    const url = companyId ? `/api/contacts/${id}?companyId=${companyId}` : `/api/contacts/${id}`;
    return this.put<Contact>(url, contact);
  }

  async deleteContact(id: number): Promise<void> {
    return this.delete<void>(`/api/contacts/${id}`);
  }

  async addContactEmail(contactId: number, email: Partial<ContactEmail>): Promise<ContactEmail> {
    return this.post<ContactEmail>(`/api/contacts/${contactId}/emails`, email);
  }

  async getContactEmails(contactId: number): Promise<ContactEmail[]> {
    return this.get<ContactEmail[]>(`/api/contacts/${contactId}/emails`);
  }

  async updateContactEmail(contactId: number, emailId: number, email: Partial<ContactEmail>): Promise<ContactEmail> {
    return this.put<ContactEmail>(`/api/contacts/${contactId}/emails/${emailId}`, email);
  }

  async deleteContactEmail(contactId: number, emailId: number): Promise<void> {
    return this.delete<void>(`/api/contacts/${contactId}/emails/${emailId}`);
  }

  async getContactEventLeads(contactId: number): Promise<EventLead[]> {
    return this.get<EventLead[]>(`/api/contacts/${contactId}/event-leads`);
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
    contactId?: number;
    contactIds?: number[];
    leadStatus?: string;
    attendanceStatus?: string;
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
    timeline?: string
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
    contactId: number;
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
  async previewContactsExcel(file: File): Promise<{
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

    const response = await fetch(`${this.baseUrl}/api/contacts/import/preview`, {
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

  async importContactsExcel(file: File): Promise<{ message: string; count: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${this.baseUrl}/api/contacts/import`, {
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

  async deleteUser(id: number): Promise<void> {
    return this.delete<void>(`/api/users/${id}`);
  }
}

export const crmService = new CrmService();
