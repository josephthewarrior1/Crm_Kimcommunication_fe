/**
 * Task API Service
 *
 * Service for handling task CRUD and checklist operations.
 * Tasks are separate from workflow stages and displayed in a kanban board.
 *
 * @author Juan
 * @version 1.0
 */

import { ApiService } from './apiService';

/**
 * Task checklist item interface
 */
export interface TaskChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  orderPosition: number;
  createdAt?: string;
}

/**
 * Task interface
 */
export interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress' | 'cancelled';
  dueDate?: string;
  pics?: string[];
  relatedDocuments?: any[];
  approvedBy?: { id: number; name: string } | null;
  approvedAt?: string | null;
  checklistItems?: TaskChecklistItem[];
  teamId?: number | null;
  teamName?: string | null;
}

/**
 * Task API Service Class
 */
export class TaskApiService extends ApiService {

  /**
   * Get tasks for a project
   */
  async getTasks(projectId: string): Promise<Task[]> {
    try {
      const data = await this.get<any[]>(`/api/projects/${projectId}/tasks`);
      return (data || []).map((t: any) => ({
        id: String(t.id),
        name: t.name,
        description: t.description,
        status: this.fromStageEnum(t.status),
        dueDate: t.dueDate,
        pics: t.pics || [],
        relatedDocuments: t.relatedDocuments || [],
        approvedBy: t.approvedBy ? { id: t.approvedBy.id, name: t.approvedBy.name } : null,
        approvedAt: t.approvedAt || null,
        checklistItems: (t.checklistItems || []).map((c: any) => ({
          id: String(c.id),
          label: c.label,
          completed: c.completed,
          orderPosition: c.orderPosition,
          createdAt: c.createdAt,
        })),
        teamId: t.team?.id || null,
        teamName: t.team?.name || null,
      }));
    } catch (error: any) {
      console.error(`Failed to fetch tasks for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Add a new task
   */
  async addTask(projectId: string, taskData: any): Promise<Task> {
    const payload = {
      name: taskData.name,
      description: taskData.description || '',
      status: this.toStageEnum(taskData.status || 'pending'),
      dueDate: taskData.dueDate,
      pics: taskData.pics || [],
      relatedDocuments: taskData.relatedDocumentIds ? taskData.relatedDocumentIds.map((id: string) => ({ id: Number(id) })) : taskData.relatedDocuments || [],
      team: taskData.teamId ? { id: taskData.teamId } : null,
    };

    try {
      const response = await this.post<any>(`/api/projects/${projectId}/tasks`, payload);
      return {
        id: String(response.id),
        name: response.name,
        description: response.description,
        status: this.fromStageEnum(response.status),
        dueDate: response.dueDate,
        pics: response.pics || [],
        relatedDocuments: response.relatedDocuments || [],
        approvedBy: response.approvedBy ? { id: response.approvedBy.id, name: response.approvedBy.name } : null,
        approvedAt: response.approvedAt || null,
        teamId: response.team?.id || null,
        teamName: response.team?.name || null,
      };
    } catch (error) {
      console.warn(`Failed to add task for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, taskData: any): Promise<Task> {
    const payload = {
      id: Number(taskId),
      name: taskData.name,
      description: taskData.description,
      status: this.toStageEnum(taskData.status),
      dueDate: taskData.dueDate,
      pics: taskData.pics || [],
      relatedDocuments: taskData.relatedDocumentIds ? taskData.relatedDocumentIds.map((id: string) => ({ id: Number(id) })) : taskData.relatedDocuments || [],
      team: taskData.teamId !== undefined ? (taskData.teamId ? { id: taskData.teamId } : null) : undefined,
    };

    try {
      const response = await this.put<any>(`/api/tasks/${taskId}`, payload);
      return {
        id: String(response.id),
        name: response.name,
        description: response.description,
        status: this.fromStageEnum(response.status),
        dueDate: response.dueDate,
        pics: response.pics || [],
        relatedDocuments: response.relatedDocuments || [],
        approvedBy: response.approvedBy ? { id: response.approvedBy.id, name: response.approvedBy.name } : null,
        approvedAt: response.approvedAt || null,
        teamId: response.team?.id || null,
        teamName: response.team?.name || null,
      };
    } catch (error) {
      console.warn(`Failed to update task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.delete(`/api/tasks/${taskId}`);
    } catch (error) {
      console.warn(`Failed to delete task ${taskId}:`, error);
      throw error;
    }
  }

  // Checklist item methods

  async addChecklistItem(taskId: string, label: string, orderPosition: number): Promise<TaskChecklistItem> {
    const response = await this.post<any>(`/api/tasks/${taskId}/checklist`, { label, orderPosition });
    return { id: String(response.id), label: response.label, completed: response.completed, orderPosition: response.orderPosition, createdAt: response.createdAt };
  }

  async updateChecklistItem(taskId: string, itemId: string, data: { label?: string; orderPosition?: number }): Promise<TaskChecklistItem> {
    const response = await this.put<any>(`/api/tasks/${taskId}/checklist/${itemId}`, data);
    return { id: String(response.id), label: response.label, completed: response.completed, orderPosition: response.orderPosition, createdAt: response.createdAt };
  }

  async toggleChecklistItem(taskId: string, itemId: string): Promise<TaskChecklistItem> {
    const response = await this.post<any>(`/api/tasks/${taskId}/checklist/${itemId}/toggle`, {});
    return { id: String(response.id), label: response.label, completed: response.completed, orderPosition: response.orderPosition, createdAt: response.createdAt };
  }

  async deleteChecklistItem(taskId: string, itemId: string): Promise<void> {
    await this.delete(`/api/tasks/${taskId}/checklist/${itemId}`);
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
}

/**
 * Default task API service instance
 */
export const taskApiService = new TaskApiService();
