/**
 * Contact API Service
 * 
 * Service for handling contact and document operations.
 * Extends the base API service with contact-specific functionality.
 * 
 * @author Juan
 * @version 1.0
 */

import { ApiService } from './apiService';

/**
 * Contact interface
 */
export interface Contact {
  id: string;
  name: string;
  role: string;
  company: string;
  category: 'client' | 'vendor' | 'internal' | 'talent' | 'venue';
  email: string;
  phone: string;
  phoneCode?: string;
  address: string;
  notes: string;
  isActive: boolean;
}

/**
 * Document interface
 */
export interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  version: string;
  lastModified: string;
  modifiedBy: string;
  size: string;
  url?: string;
  description?: string;
  folderId?: string | null;
}

export interface DocumentFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  childFolderCount: number;
  documentCount: number;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface FolderContents {
  currentFolderId: string | null;
  currentFolderName: string | null;
  breadcrumbs: BreadcrumbItem[];
  folders: DocumentFolder[];
  documents: any[];
  inheritedShares?: { userId: number; userName: string; permission: string }[];
}

export interface FolderTreeNode {
  id: string;
  name: string;
  children: FolderTreeNode[];
}

export type ClientFolderPermission = 'VIEW_ONLY' | 'VIEW_UPLOAD' | 'FULL_CRUD';

export interface FolderShare {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  permission: ClientFolderPermission;
  sharedByName: string | null;
  createdAt: string;
}

export interface SharedFolderGroup {
  projectId: number;
  projectName: string;
  folders: {
    folderId: number;
    folderName: string;
    permission: ClientFolderPermission;
    sharedAt: string;
  }[];
}

export interface ClientUser {
  id: number;
  name: string;
  email: string;
  username?: string;
  clientId?: number | null;
  clientName?: string | null;
  active: boolean;
  approved: boolean;
}

/**
 * Contact API Service Class
 * 
 * Handles all contact and document-related API operations with proper error handling
 * and data transformation.
 */
export class ContactApiService extends ApiService {
  
  /**
   * Get contacts for a project
   * 
   * @param projectId - Project ID
   * @returns Promise<Contact[]> List of contacts
   */
  async getContacts(projectId: string): Promise<Contact[]> {
    try {
      const data = await this.get<any[]>(`/api/projects/${projectId}/contacts`);
      return (data || []).map((c: any) => ({
        id: String(c.id),
        name: c.name,
        role: c.role,
        company: c.company,
        category: this.fromContactCategory(c.category),
        email: c.email,
        phone: c.phone,
        phoneCode: c.phoneCode,
        address: c.address,
        notes: c.notes,
        isActive: !!c.isActive
      }));
    } catch (error) {
      console.warn(`Failed to fetch contacts for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Add a new contact
   * 
   * @param projectId - Project ID
   * @param contactData - Contact creation data
   * @returns Promise<Contact> Created contact
   */
  async addContact(projectId: string, contactData: any): Promise<Contact> {
    const payload = {
      name: contactData.name,
      role: contactData.role,
      company: contactData.company,
      category: this.toContactCategory(contactData.category || 'client'),
      email: contactData.email,
      phone: contactData.phone,
      phoneCode: contactData.phoneCode,
      address: contactData.address,
      notes: contactData.notes,
      isActive: contactData.isActive ?? true
    };

    try {
      const response = await this.post<any>(`/api/projects/${projectId}/contacts`, payload);
      return {
        id: String(response.id),
        name: response.name,
        role: response.role,
        company: response.company,
        category: this.fromContactCategory(response.category),
        email: response.email,
        phone: response.phone,
        phoneCode: response.phoneCode,
        address: response.address,
        notes: response.notes,
        isActive: !!response.isActive
      };
    } catch (error) {
      console.warn(`Failed to add contact for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update a contact
   * 
   * @param contactId - Contact ID to update
   * @param contactData - Updated contact data
   * @returns Promise<Contact> Updated contact
   */
  async updateContact(contactId: string, contactData: any): Promise<Contact> {
    const payload = {
      id: Number(contactId),
      name: contactData.name,
      role: contactData.role,
      company: contactData.company,
      category: this.toContactCategory(contactData.category),
      email: contactData.email,
      phone: contactData.phone,
      phoneCode: contactData.phoneCode,
      address: contactData.address,
      notes: contactData.notes,
      isActive: contactData.isActive
    };

    try {
      const response = await this.put<any>(`/api/contacts/${contactId}`, payload);
      return {
        id: String(response.id),
        name: response.name,
        role: response.role,
        company: response.company,
        category: this.fromContactCategory(response.category),
        email: response.email,
        phone: response.phone,
        phoneCode: response.phoneCode,
        address: response.address,
        notes: response.notes,
        isActive: !!response.isActive
      };
    } catch (error) {
      console.warn(`Failed to update contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a contact
   * 
   * @param contactId - Contact ID to delete
   * @returns Promise<void>
   */
  async deleteContact(contactId: string): Promise<void> {
    try {
      await this.delete(`/api/contacts/${contactId}`);
    } catch (error) {
      console.warn(`Failed to delete contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Get documents for a project
   * 
   * @param projectId - Project ID
   * @returns Promise<Document[]> List of documents
   */
  async getDocuments(projectId: string): Promise<Document[]> {
    try {
      const data = await this.get<any[]>(`/api/projects/${projectId}/documents`);
      return (data || []).map((d: any) => ({
        id: String(d.id),
        name: d.name,
        type: d.type === 'budget' ? 'report' : (d.type || 'manual'),
        status: d.status || 'draft',
        version: '1.0',
        lastModified: d.uploadedAt || new Date().toISOString(),
        modifiedBy: 'System',
        size: 'n/a',
        url: d.url ? (d.url.startsWith('http') ? d.url : `${this.baseUrl}${d.url}`) : undefined,
        description: d.description || ''
      }));
    } catch (error) {
      console.warn(`Failed to fetch documents for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Upload a document
   * 
   * @param projectId - Project ID
   * @param documentData - Document creation data
   * @returns Promise<Document> Created document
   */
  async uploadDocument(projectId: string, documentData: any): Promise<Document> {
    const payload = {
      name: documentData.name || 'New Document',
      type: documentData.type || 'manual',
      url: '',
      uploadedAt: new Date().toISOString(),
      status: documentData.status || 'draft'
    };

    try {
      const response = await this.post<any>(`/api/projects/${projectId}/documents`, payload);
      return {
        id: String(response.id),
        name: response.name,
        type: response.type || 'manual',
        status: response.status || 'draft',
        version: '1.0',
        lastModified: response.uploadedAt || new Date().toISOString(),
        modifiedBy: 'System',
        size: 'n/a',
        url: response.url ? (response.url.startsWith('http') ? response.url : `${this.baseUrl}${response.url}`) : undefined
      };
    } catch (error) {
      console.warn(`Failed to upload document for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   * 
   * @param documentId - Document ID to update
   * @param documentData - Updated document data
   * @returns Promise<Document> Updated document
   */
  async updateDocument(documentId: string, documentData: any): Promise<Document> {
    const payload = {
      id: Number(documentId),
      name: documentData.name,
      type: documentData.type,
      url: documentData.url || '',
      uploadedAt: documentData.lastModified,
      status: documentData.status,
      description: documentData.description || ''
    };

    try {
      const response = await this.put<any>(`/api/documents/${documentId}`, payload);
      return {
        id: String(response.id),
        name: response.name,
        type: response.type || 'manual',
        status: response.status || 'draft',
        version: '1.0',
        lastModified: response.uploadedAt || new Date().toISOString(),
        modifiedBy: 'System',
        size: 'n/a',
        url: response.url ? (response.url.startsWith('http') ? response.url : `${this.baseUrl}${response.url}`) : undefined,
        description: response.description || ''
      };
    } catch (error) {
      console.warn(`Failed to update document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   * 
   * @param documentId - Document ID to delete
   * @returns Promise<void>
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.delete(`/api/documents/${documentId}`);
    } catch (error) {
      console.warn(`Failed to delete document ${documentId}:`, error);
      throw error;
    }
  }

  // Helper methods for data transformation
  private toContactCategory(c: string): string {
    return (c || '').toUpperCase();
  }

  private fromContactCategory(c: string): 'client' | 'vendor' | 'internal' | 'talent' | 'venue' {
    const lower = c ? c.toLowerCase() : 'client';
    if (['client', 'vendor', 'internal', 'talent', 'venue'].includes(lower)) {
      return lower as 'client' | 'vendor' | 'internal' | 'talent' | 'venue';
    }
    return 'client';
  }
}

/**
 * Default contact API service instance
 */
export const contactApiService = new ContactApiService();
