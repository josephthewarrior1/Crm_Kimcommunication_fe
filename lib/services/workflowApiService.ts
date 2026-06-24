/**
 * Workflow API Service
 * 
 * Service for handling workflow stage and timeline event operations.
 * Extends the base API service with workflow-specific functionality.
 * 
 * @author Juan
 * @version 1.0
 */

import { ApiService } from './apiService';

/**
 * Workflow stage interface
 */
export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  orderPosition: number;
  createdAt?: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress' | 'cancelled';
  dueDate?: string;
  pic?: string;
  deliverables: string[];
  dependencies: string[];
  orderSequence?: number;
  previousStageName?: string;
  nextStageName?: string;
  relatedDocuments?: any[];
  approvedBy?: { id: number; name: string } | null;
  approvedAt?: string | null;
  checklistItems?: ChecklistItem[];
  teamId?: number | null;
  teamName?: string | null;
}

/**
 * Timeline event interface
 */
export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: string;
  status: string;
  participants: string[];
  description: string;
  notes?: string;
}

/**
 * Workflow API Service Class
 * 
 * Handles all workflow-related API operations with proper error handling
 * and data transformation.
 */
export class WorkflowApiService extends ApiService {

  /**
   * Get workflow stages for a project
   * 
   * @param projectId - Project ID
   * @returns Promise<WorkflowStage[]> List of workflow stages
   */
  async getWorkflowStages(projectId: string): Promise<WorkflowStage[]> {
    try {
      const data = await this.get<any[]>(`/api/projects/${projectId}/stages`);
      return (data || []).map((s: any) => ({
        id: String(s.id),
        name: s.name,
        description: s.description,
        status: this.fromStageEnum(s.status),
        dueDate: s.dueDate,
        pic: s.pic || s.assignee,
        deliverables: s.deliverables || [],
        dependencies: s.dependencies || [],
        orderSequence: s.orderSequence || 0,
        previousStageName: s.previousStageName || '',
        nextStageName: s.nextStageName || '',
        relatedDocuments: s.relatedDocuments || [],
        approvedBy: s.approvedBy ? { id: s.approvedBy.id, name: s.approvedBy.name } : null,
        approvedAt: s.approvedAt || null,
        checklistItems: (s.checklistItems || []).map((c: any) => ({
          id: String(c.id),
          label: c.label,
          completed: c.completed,
          orderPosition: c.orderPosition,
          createdAt: c.createdAt,
        })),
        teamId: s.team?.id || null,
        teamName: s.team?.name || null,
      }));
    } catch (error: any) {
      console.error(`Failed to fetch workflow stages for project ${projectId}:`, error);
      throw error; // Surface actual issue
    }
  }

  /**
   * Add a new workflow stage
   * 
   * @param projectId - Project ID
   * @param stageData - Stage creation data
   * @returns Promise<WorkflowStage> Created stage
   */
  async addWorkflowStage(projectId: string, stageData: any): Promise<WorkflowStage> {
    const payload = {
      name: stageData.name,
      description: stageData.description || '',
      status: this.toStageEnum(stageData.status || 'pending'),
      dueDate: stageData.dueDate,
      pic: stageData.pic || stageData.assignee || 'Unassigned',
      deliverables: stageData.deliverables || [],
      dependencies: stageData.dependencies || [],
      orderSequence: stageData.orderSequence ?? 0,
      relatedDocuments: stageData.relatedDocumentIds ? stageData.relatedDocumentIds.map((id: string) => ({ id: Number(id) })) : stageData.relatedDocuments || [],
      team: stageData.teamId ? { id: stageData.teamId } : null,
    };

    try {
      const response = await this.post<any>(`/api/projects/${projectId}/stages`, payload);
      return {
        id: String(response.id),
        name: response.name,
        description: response.description,
        status: this.fromStageEnum(response.status),
        dueDate: response.dueDate,
        pic: response.pic || response.assignee,
        deliverables: response.deliverables || [],
        dependencies: response.dependencies || [],
        orderSequence: response.orderSequence || 0,
        previousStageName: response.previousStageName || '',
        nextStageName: response.nextStageName || '',
        relatedDocuments: response.relatedDocuments || [],
        approvedBy: response.approvedBy ? { id: response.approvedBy.id, name: response.approvedBy.name } : null,
        approvedAt: response.approvedAt || null,
        teamId: response.team?.id || null,
        teamName: response.team?.name || null,
      };
    } catch (error) {
      console.warn(`Failed to add workflow stage for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update a workflow stage
   * 
   * @param stageId - Stage ID to update
   * @param stageData - Updated stage data
   * @returns Promise<WorkflowStage> Updated stage
   */
  async updateWorkflowStage(stageId: string, stageData: any): Promise<WorkflowStage> {
    const payload = {
      id: Number(stageId),
      name: stageData.name,
      description: stageData.description,
      status: this.toStageEnum(stageData.status),
      dueDate: stageData.dueDate,
      pic: stageData.pic || stageData.assignee,
      deliverables: stageData.deliverables || [],
      dependencies: stageData.dependencies || [],
      orderSequence: stageData.orderSequence || 0,
      relatedDocuments: stageData.relatedDocumentIds ? stageData.relatedDocumentIds.map((id: string) => ({ id: Number(id) })) : stageData.relatedDocuments || [],
      team: stageData.teamId !== undefined ? (stageData.teamId ? { id: stageData.teamId } : null) : undefined,
    };

    try {
      const response = await this.put<any>(`/api/stages/${stageId}`, payload);
      return {
        id: String(response.id),
        name: response.name,
        description: response.description,
        status: this.fromStageEnum(response.status),
        dueDate: response.dueDate,
        pic: response.pic || response.assignee,
        deliverables: response.deliverables || [],
        dependencies: response.dependencies || [],
        orderSequence: response.orderSequence || 0,
        previousStageName: response.previousStageName || '',
        nextStageName: response.nextStageName || '',
        relatedDocuments: response.relatedDocuments || [],
        approvedBy: response.approvedBy ? { id: response.approvedBy.id, name: response.approvedBy.name } : null,
        approvedAt: response.approvedAt || null,
        teamId: response.team?.id || null,
        teamName: response.team?.name || null,
      };
    } catch (error) {
      console.warn(`Failed to update workflow stage ${stageId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a workflow stage
   * 
   * @param stageId - Stage ID to delete
   * @returns Promise<void>
   */
  async deleteWorkflowStage(stageId: string): Promise<void> {
    try {
      await this.delete(`/api/stages/${stageId}`);
    } catch (error) {
      console.warn(`Failed to delete workflow stage ${stageId}:`, error);
      throw error;
    }
  }

  /**
   * Get timeline events for a project
   * 
   * @param projectId - Project ID
   * @returns Promise<TimelineEvent[]> List of timeline events
   */
  async getTimelineEvents(projectId: string): Promise<TimelineEvent[]> {
    try {
      const data = await this.get<any[]>(`/api/projects/${projectId}/events`);
      return (data || []).map((e: any) => ({
        id: String(e.id),
        title: e.title,
        date: e.date,
        startTime: e.startTime ? String(e.startTime).slice(0, 5) : '',
        endTime: e.endTime ? String(e.endTime).slice(0, 5) : '',
        type: this.fromEventType(e.type),
        status: this.fromEventStatus(e.status),
        participants: [],
        description: e.notes || '',
        notes: e.notes || ''
      }));
    } catch (error) {
      console.warn(`Failed to fetch timeline events for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Add a new timeline event
   * 
   * @param projectId - Project ID
   * @param eventData - Event creation data
   * @returns Promise<TimelineEvent> Created event
   */
  async addTimelineEvent(projectId: string, eventData: any): Promise<TimelineEvent> {
    const payload = {
      title: eventData.title,
      date: eventData.date,
      startTime: eventData.startTime || null,
      endTime: eventData.endTime || null,
      notes: eventData.notes || eventData.description || null,
      type: this.toEventType(eventData.type || 'meeting'),
      status: this.toEventStatus(eventData.status || 'upcoming')
    };

    try {
      const response = await this.post<any>(`/api/projects/${projectId}/events`, payload);
      return {
        id: String(response.id),
        title: response.title,
        date: response.date,
        startTime: response.startTime ? String(response.startTime).slice(0, 5) : '',
        endTime: response.endTime ? String(response.endTime).slice(0, 5) : '',
        type: this.fromEventType(response.type),
        status: this.fromEventStatus(response.status),
        participants: eventData.participants || [],
        description: response.notes || eventData.notes || eventData.description || '',
        notes: response.notes || eventData.notes || eventData.description || ''
      };
    } catch (error) {
      console.warn(`Failed to add timeline event for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update a timeline event
   * 
   * @param eventId - Event ID to update
   * @param eventData - Updated event data
   * @returns Promise<TimelineEvent> Updated event
   */
  async updateTimelineEvent(eventId: string, eventData: any): Promise<TimelineEvent> {
    const payload = {
      id: Number(eventId),
      title: eventData.title,
      date: eventData.date,
      startTime: eventData.startTime || null,
      endTime: eventData.endTime || null,
      notes: eventData.notes || eventData.description || null,
      type: this.toEventType(eventData.type),
      status: this.toEventStatus(eventData.status)
    };

    try {
      const response = await this.put<any>(`/api/events/${eventId}`, payload);
      return {
        id: String(response.id),
        title: response.title,
        date: response.date,
        startTime: response.startTime ? String(response.startTime).slice(0, 5) : '',
        endTime: response.endTime ? String(response.endTime).slice(0, 5) : '',
        type: this.fromEventType(response.type),
        status: this.fromEventStatus(response.status),
        participants: eventData.participants || [],
        description: response.notes || eventData.notes || eventData.description || '',
        notes: response.notes || eventData.notes || eventData.description || ''
      };
    } catch (error) {
      console.warn(`Failed to update timeline event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a timeline event
   * 
   * @param eventId - Event ID to delete
   * @returns Promise<void>
   */
  async deleteTimelineEvent(eventId: string): Promise<void> {
    try {
      await this.delete(`/api/events/${eventId}`);
    } catch (error) {
      console.warn(`Failed to delete timeline event ${eventId}:`, error);
      throw error;
    }
  }

  // Checklist item methods

  async addChecklistItem(stageId: string, label: string, orderPosition: number): Promise<ChecklistItem> {
    const response = await this.post<any>(`/api/stages/${stageId}/checklist`, { label, orderPosition });
    return { id: String(response.id), label: response.label, completed: response.completed, orderPosition: response.orderPosition, createdAt: response.createdAt };
  }

  async updateChecklistItem(stageId: string, itemId: string, data: { label?: string; orderPosition?: number }): Promise<ChecklistItem> {
    const response = await this.put<any>(`/api/stages/${stageId}/checklist/${itemId}`, data);
    return { id: String(response.id), label: response.label, completed: response.completed, orderPosition: response.orderPosition, createdAt: response.createdAt };
  }

  async toggleChecklistItem(stageId: string, itemId: string): Promise<ChecklistItem> {
    const response = await this.post<any>(`/api/stages/${stageId}/checklist/${itemId}/toggle`, {});
    return { id: String(response.id), label: response.label, completed: response.completed, orderPosition: response.orderPosition, createdAt: response.createdAt };
  }

  async deleteChecklistItem(stageId: string, itemId: string): Promise<void> {
    await this.delete(`/api/stages/${stageId}/checklist/${itemId}`);
  }

  // Helper methods for data transformation
  private toStageEnum(s: string): string {
    switch ((s || '').toLowerCase()) {
      case 'completed': return 'COMPLETED';
      case 'in-progress': return 'IN_PROGRESS';
      case 'pending': return 'PENDING';
      case 'cancelled': return 'CANCELLED';
      default: return 'PENDING';
    }
  }

  private fromStageEnum(e: string): 'pending' | 'completed' | 'in-progress' | 'cancelled' {
    switch (e) {
      case 'COMPLETED': return 'completed';
      case 'IN_PROGRESS': return 'in-progress';
      case 'PENDING': return 'pending';
      case 'CANCELLED': return 'cancelled';
      default: return 'pending';
    }
  }

  private toEventType(t: string): string {
    switch ((t || '').toLowerCase()) {
      case 'meeting': return 'MEETING';
      case 'deadline': return 'DEADLINE';
      case 'event': return 'EVENT';
      case 'workflow': return 'WORKFLOW';
      default: return 'EVENT';
    }
  }

  private fromEventType(e: string): string {
    return e ? e.toLowerCase() : 'event';
  }

  private toEventStatus(s: string): string {
    switch ((s || '').toLowerCase()) {
      case 'completed': return 'COMPLETED';
      case 'in-progress': return 'CONFIRMED';
      case 'upcoming': return 'PENDING';
      default: return 'PENDING';
    }
  }

  private fromEventStatus(e: string): string {
    switch (e) {
      case 'COMPLETED': return 'completed';
      case 'CONFIRMED': return 'in-progress';
      case 'PENDING': return 'upcoming';
      default: return 'upcoming';
    }
  }
}

/**
 * Default workflow API service instance
 */
export const workflowApiService = new WorkflowApiService();
