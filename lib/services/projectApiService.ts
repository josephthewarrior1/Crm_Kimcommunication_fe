/**
 * Project API Service
 * 
 * Service for handling project-related API operations.
 * Extends the base API service with project-specific functionality.
 * 
 * @author Juan
 * @version 1.0
 */

import { ApiService } from './apiService';

/**
 * Project data interface matching backend FrontendProjectDto
 */
export interface Project {
  id: string;
  name: string;
  client?: string;
  clientName?: string;
  clientId?: number;
  startDate?: string;
  endDate?: string;
  eventDate?: string; // derived from endDate
  status: 'PENDING' | 'PITCHING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';
  statusLabel?: string; // User-friendly status label from backend
  progress: number;
  daysUntilEvent?: number;
  currentStage?: string; // ENUM VALUE
  currentStageLabel?: string; // DISPLAY LABEL
  target?: number;
  accountManager?: string;
  accountManagerUserId?: number;
  picName?: string;
  picUserId?: number;
  venueName?: string;
  venueCity?: string;
  venueId?: number;
  venueRoomId?: number;
  venueRoomName?: string;
  venueAddress?: string;
  venueProvince?: string;
  venueGoogleMapsLink?: string;
  remarks?: string;
  hedging?: number;
  qtnNo?: string;
  poNo?: string;
  invoiceNo?: string;
}

/**
 * Project status enum
 */
export enum ProjectStatus {
  PENDING = 'PENDING',
  PITCHING = 'PITCHING',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Brand alliance data interface
 */
export interface FundingSourceItem {
  id?: number;
  source: string;
  amount: number;
}

export interface BrandAlliance {
  id?: number;
  clientId?: number;
  clientName: string;
  fundingAmount: number;
  fundingSources?: FundingSourceItem[];
}

/**
 * Project creation data interface
 */
export interface CreateProjectData {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  eventDate?: Date;
  target?: number;
  // Client
  clientId?: number;
  clientName?: string;
  contactId?: number;
  contactName?: string;
  // Venue
  venueId?: number;
  venueRoomId?: number;
  venueName?: string;
  venueCity?: string;
  venueProvince?: string;
  venueAddress?: string;
  venueGoogleMapsLink?: string;
  // Hedging
  hedging?: number;
  // Brand alliances (optional)
  brandAlliances?: { clientId?: number; clientName?: string; fundingAmount: number }[];
  // Team member user IDs
  picUserId?: number;
  accountManagerUserId?: number;
  adminUserId?: number;
  productionUserId?: number;
  designUserId?: number;
  financeUserId?: number;
}

/**
 * Project API Service Class
 * 
 * Handles all project-related API operations with proper error handling
 * and data transformation.
 */
export class ProjectApiService extends ApiService {

  /**
   * Get all projects from the backend
   * 
   * @returns Promise<Project[]> List of all projects
   */
  async getAllProjects(): Promise<Project[]> {
    try {
      const data = await this.get<Project[]>('/api/frontend/projects');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('Failed to fetch projects from backend:', error);
      return [];
    }
  }

  async getProject(projectId: string): Promise<Project> {
    try {
      return await this.get<Project>(`/api/projects/${projectId}`);
    } catch (error) {
      console.warn(`Failed to fetch project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new project
   * 
   * @param projectData - Project creation data
   * @returns Promise<Project> Created project
   */
  async createProject(projectData: CreateProjectData): Promise<Project> {
    // Calculate days until event
    const startDate = projectData.startDate;
    const endDate = projectData.endDate ?? projectData.eventDate ?? projectData.startDate;
    const today = new Date();
    let daysUntilEvent = 0;
    let formattedStartDate = "";
    let formattedEndDate = "";

    if (startDate && startDate instanceof Date) {
      formattedStartDate = startDate.toISOString().split('T')[0];
    }

    if (endDate && endDate instanceof Date) {
      const timeDiff = endDate.getTime() - today.getTime();
      daysUntilEvent = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      formattedEndDate = endDate.toISOString().split('T')[0];
    }

    const payload = {
      name: projectData.name,
      description: projectData.description || '',
      target: projectData.target || undefined,
      startDate: formattedStartDate || undefined,
      endDate: formattedEndDate || undefined,
      eventDate: formattedEndDate || undefined,
      // Client
      clientId: projectData.clientId || undefined,
      clientName: projectData.clientName || undefined,
      contactId: projectData.contactId || undefined,
      contactName: projectData.contactName || undefined,
      // Venue
      venueId: projectData.venueId || undefined,
      venueRoomId: projectData.venueRoomId || undefined,
      venueName: projectData.venueName || undefined,
      venueCity: projectData.venueCity || undefined,
      venueProvince: projectData.venueProvince || undefined,
      venueAddress: projectData.venueAddress || undefined,
      venueGoogleMapsLink: projectData.venueGoogleMapsLink || undefined,
      // Hedging
      hedging: projectData.hedging || undefined,
      // Brand alliances
      brandAlliances: projectData.brandAlliances?.length ? projectData.brandAlliances : undefined,
      // Team member user IDs
      picUserId: projectData.picUserId || undefined,
      accountManagerUserId: projectData.accountManagerUserId || undefined,
      adminUserId: projectData.adminUserId || undefined,
      productionUserId: projectData.productionUserId || undefined,
      designUserId: projectData.designUserId || undefined,
      financeUserId: projectData.financeUserId || undefined,
    };

    try {
      const response = await this.post<Project>('/api/projects', payload);

      return {
        ...response,
        startDate: response.startDate || formattedStartDate || undefined,
        endDate: response.endDate || formattedEndDate || undefined,
        eventDate: response.eventDate || response.endDate || formattedEndDate || undefined,
        daysUntilEvent,
        currentStage: 'Client Brief'
      };
    } catch (error) {
      console.warn('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Update an existing project
   * 
   * @param projectId - Project ID to update
   * @param projectData - Updated project data
   * @returns Promise<Project> Updated project
   */
  async updateProject(projectId: string, projectData: Partial<Project> & Record<string, unknown>): Promise<Project> {
    try {
      // Validate project ID
      if (!projectId || projectId === 'undefined' || projectId === 'null') {
        throw new Error('Invalid project ID');
      }

      return await this.put<Project>(`/api/projects/${projectId}`, projectData);
    } catch (error) {
      console.warn(`Failed to update project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project
   * 
   * @param projectId - Project ID to delete
   * @returns Promise<void>
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.delete(`/api/projects/${projectId}`);
    } catch (error) {
      console.warn(`Failed to delete project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Check and update delayed project status
   * 
   * @param project - Project to check
   * @returns Promise<Project | null> Updated project if status changed, null otherwise
   */
  async checkAndUpdateDelayedStatus(project: Project): Promise<Project | null> {
    return null;
  }

  /**
   * Update project status
   * 
   * @param projectId - Project ID
   * @param status - New status
   * @returns Promise<Project> Updated project
   */
  async updateProjectStatus(projectId: string, status: 'PENDING' | 'PITCHING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED'): Promise<Project> {
    try {
      return await this.updateProject(projectId, { status });
    } catch (error) {
      console.warn(`Failed to update project status for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update project progress
   * 
   * @param projectId - Project ID
   * @param progress - New progress percentage
   * @returns Promise<Project> Updated project
   */
  async updateProjectProgress(projectId: string, progress: number): Promise<Project> {
    try {
      return await this.updateProject(projectId, { progress });
    } catch (error) {
      console.warn(`Failed to update project progress for ${projectId}:`, error);
      throw error;
    }
  }
  /**
   * Get brand alliances for a project
   */
  async getBrandAlliances(projectId: string): Promise<BrandAlliance[]> {
    try {
      return await this.get<BrandAlliance[]>(`/api/projects/${projectId}/brand-alliances`);
    } catch (error) {
      console.warn(`Failed to fetch brand alliances for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Save (bulk upsert) brand alliances for a project
   */
  async saveBrandAlliances(projectId: string, alliances: { id?: number; clientId?: number; clientName?: string; fundingAmount: number; fundingSources?: { id?: number; source: string; amount: number }[] }[]): Promise<BrandAlliance[]> {
    try {
      return await this.put<BrandAlliance[]>(`/api/projects/${projectId}/brand-alliances`, alliances);
    } catch (error) {
      console.warn(`Failed to save brand alliances for project ${projectId}:`, error);
      throw error;
    }
  }
}

/**
 * Default project API service instance
 */
export const projectApiService = new ProjectApiService();
