/**
 * Projects Hook
 * 
 * Custom React hook for managing project state and operations.
 * Provides a clean interface for project management with proper state handling.
 * 
 * @author Juan
 * @version 1.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { projectApiService, Project, CreateProjectData } from '../services/projectApiService';
import { workflowApiService, WorkflowStage, TimelineEvent } from '../services/workflowApiService';
import { contactApiService, Contact, Document } from '../services/contactApiService';
import { toast } from 'sonner';

/**
 * Projects hook return type
 */
interface UseProjectsReturn {
  projects: Project[];
  selectedProject: Project | null;
  loading: boolean;
  error: string | null;
  setSelectedProject: (project: Project | null) => void;
  updateProjectLocally: (updatedProject: Project) => void;
  createProject: (projectData: CreateProjectData) => Promise<void>;
  updateProject: (projectId: string, projectData: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  checkDelayedProjects: () => Promise<void>;
  
  // Workflow management
  getWorkflowStages: (projectId: string) => Promise<WorkflowStage[]>;
  addWorkflowStage: (projectId: string, stageData: any) => Promise<WorkflowStage>;
  updateWorkflowStage: (stageId: string, stageData: any) => Promise<WorkflowStage>;
  deleteWorkflowStage: (stageId: string) => Promise<void>;
  
  // Timeline management
  getTimelineEvents: (projectId: string) => Promise<TimelineEvent[]>;
  addTimelineEvent: (projectId: string, eventData: any) => Promise<TimelineEvent>;
  updateTimelineEvent: (eventId: string, eventData: any) => Promise<TimelineEvent>;
  deleteTimelineEvent: (eventId: string) => Promise<void>;
  
  // Contact management
  getContacts: (projectId: string) => Promise<Contact[]>;
  addContact: (projectId: string, contactData: any) => Promise<Contact>;
  updateContact: (contactId: string, contactData: any) => Promise<Contact>;
  deleteContact: (contactId: string) => Promise<void>;
  
  // Document management
  getDocuments: (projectId: string) => Promise<Document[]>;
  uploadDocument: (projectId: string, documentData: any) => Promise<Document>;
  updateDocument: (documentId: string, documentData: any) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
}

/**
 * Custom hook for managing projects
 * 
 * @returns Projects hook interface
 */
export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const delayedCheckInFlightRef = useRef(false);

  /**
   * Update a project in the local state without an API call.
   * Useful for updating derived values (e.g. progress) that are calculated client-side.
   */
  const updateProjectLocally = useCallback((updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (selectedProject?.id === updatedProject.id) {
      setSelectedProject(updatedProject);
    }
  }, [selectedProject]);

  /**
   * Load projects from the API
   */
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const projectsData = await projectApiService.getAllProjects();
      const nextProjects = [...projectsData];

      if (!delayedCheckInFlightRef.current) {
        delayedCheckInFlightRef.current = true;
        try {
          for (let i = 0; i < nextProjects.length; i++) {
            const updatedProject = await projectApiService.checkAndUpdateDelayedStatus(nextProjects[i]);
            if (updatedProject) {
              nextProjects[i] = updatedProject;
              toast.warning(`Project "${updatedProject.name}" marked as delayed - deadline has passed`);
            }
          }
        } finally {
          delayedCheckInFlightRef.current = false;
        }
      }

      setProjects(nextProjects);
      
      // Set first valid project as selected if available
      if (nextProjects.length > 0 && !selectedProject) {
        const validProject = nextProjects.find(p => p.id && p.id !== 'undefined' && p.id !== 'null');
        if (validProject) {
          setSelectedProject(validProject);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects. Please try again.');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  /**
   * Create a new project
   * 
   * @param projectData - Project creation data
   */
  const createProject = useCallback(async (projectData: CreateProjectData) => {
    try {
      const newProject = await projectApiService.createProject(projectData);
      
      // Refresh projects list
      await loadProjects();
      
      // Set the new project as selected
      setSelectedProject(newProject);
      
      toast.success(`New project "${projectData.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create project:', error);
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: number }).status)
        : undefined;
      const isForbidden = status === 403 || (error instanceof Error && error.message.includes('HTTP 403'));

      if (isForbidden) {
        toast.error('Only users with ADMIN or MANAGER role can create projects.');
      } else {
        toast.error('Failed to create project. Please try again.');
      }

      throw error;
    }
  }, [loadProjects]);

  /**
   * Update an existing project
   * 
   * @param projectId - Project ID to update
   * @param projectData - Updated project data
   */
  const updateProject = useCallback(async (projectId: string, projectData: Partial<Project>) => {
    try {
      // Check if project exists in our local state
      const existingProject = projects.find(p => p.id === projectId);
      if (!existingProject) {
        toast.error('Project not found. Please refresh the page.');
        await loadProjects(); // Refresh projects list
        return;
      }
      
      const updatedProject = await projectApiService.updateProject(projectId, projectData);
      
      // Update projects list
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
      
      // Update selected project if it's the one being updated
      if (selectedProject?.id === projectId) {
        setSelectedProject(updatedProject);
      }
      
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Failed to update project:', error);
      if (error instanceof Error && error.message.includes('Invalid project ID')) {
        toast.error('Invalid project ID. Please refresh the page.');
        await loadProjects(); // Refresh projects list
      } else {
        toast.error('Failed to update project. Please try again.');
      }
      throw error;
    }
  }, [selectedProject, projects, loadProjects]);

  /**
   * Delete a project
   * 
   * @param projectId - Project ID to delete
   */
  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await projectApiService.deleteProject(projectId);
      
      // Remove from projects list
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Clear selected project if it was deleted
      if (selectedProject?.id === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        setSelectedProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }
      
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project. Please try again.');
      throw error;
    }
  }, [selectedProject, projects]);

  /**
   * Refresh projects list
   */
  const refreshProjects = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  /**
   * Check for delayed projects and update their status
   */
  const checkDelayedProjects = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Workflow management methods
  const getWorkflowStages = useCallback(async (projectId: string): Promise<WorkflowStage[]> => {
    try {
      return await workflowApiService.getWorkflowStages(projectId);
    } catch (error) {
      console.error('Failed to get workflow stages:', error);
      throw error;
    }
  }, []);

  const addWorkflowStage = useCallback(async (projectId: string, stageData: any): Promise<WorkflowStage> => {
    try {
      const newStage = await workflowApiService.addWorkflowStage(projectId, stageData);
      toast.success('Workflow stage added successfully');
      return newStage;
    } catch (error) {
      console.error('Failed to add workflow stage:', error);
      toast.error('Failed to add workflow stage');
      throw error;
    }
  }, []);

  const updateWorkflowStage = useCallback(async (stageId: string, stageData: any): Promise<WorkflowStage> => {
    try {
      const updatedStage = await workflowApiService.updateWorkflowStage(stageId, stageData);
      toast.success('Workflow stage updated successfully');
      return updatedStage;
    } catch (error) {
      console.error('Failed to update workflow stage:', error);
      toast.error('Failed to update workflow stage');
      throw error;
    }
  }, []);

  const deleteWorkflowStage = useCallback(async (stageId: string): Promise<void> => {
    try {
      await workflowApiService.deleteWorkflowStage(stageId);
      toast.success('Workflow stage deleted successfully');
    } catch (error) {
      console.error('Failed to delete workflow stage:', error);
      toast.error('Failed to delete workflow stage');
      throw error;
    }
  }, []);

  // Timeline management methods
  const getTimelineEvents = useCallback(async (projectId: string): Promise<TimelineEvent[]> => {
    try {
      return await workflowApiService.getTimelineEvents(projectId);
    } catch (error) {
      console.error('Failed to get timeline events:', error);
      throw error;
    }
  }, []);

  const addTimelineEvent = useCallback(async (projectId: string, eventData: any): Promise<TimelineEvent> => {
    try {
      const newEvent = await workflowApiService.addTimelineEvent(projectId, eventData);
      toast.success('Timeline event added successfully');
      return newEvent;
    } catch (error) {
      console.error('Failed to add timeline event:', error);
      toast.error('Failed to add timeline event');
      throw error;
    }
  }, []);

  const updateTimelineEvent = useCallback(async (eventId: string, eventData: any): Promise<TimelineEvent> => {
    try {
      const updatedEvent = await workflowApiService.updateTimelineEvent(eventId, eventData);
      toast.success('Timeline event updated successfully');
      return updatedEvent;
    } catch (error) {
      console.error('Failed to update timeline event:', error);
      toast.error('Failed to update timeline event');
      throw error;
    }
  }, []);

  const deleteTimelineEvent = useCallback(async (eventId: string): Promise<void> => {
    try {
      await workflowApiService.deleteTimelineEvent(eventId);
      toast.success('Timeline event deleted successfully');
    } catch (error) {
      console.error('Failed to delete timeline event:', error);
      toast.error('Failed to delete timeline event');
      throw error;
    }
  }, []);

  // Contact management methods
  const getContacts = useCallback(async (projectId: string): Promise<Contact[]> => {
    try {
      return await contactApiService.getContacts(projectId);
    } catch (error) {
      console.error('Failed to get contacts:', error);
      throw error;
    }
  }, []);

  const addContact = useCallback(async (projectId: string, contactData: any): Promise<Contact> => {
    try {
      const newContact = await contactApiService.addContact(projectId, contactData);
      toast.success('Contact added successfully');
      return newContact;
    } catch (error) {
      console.error('Failed to add contact:', error);
      toast.error('Failed to add contact');
      throw error;
    }
  }, []);

  const updateContact = useCallback(async (contactId: string, contactData: any): Promise<Contact> => {
    try {
      const updatedContact = await contactApiService.updateContact(contactId, contactData);
      toast.success('Contact updated successfully');
      return updatedContact;
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast.error('Failed to update contact');
      throw error;
    }
  }, []);

  const deleteContact = useCallback(async (contactId: string): Promise<void> => {
    try {
      await contactApiService.deleteContact(contactId);
      toast.success('Contact deleted successfully');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('Failed to delete contact');
      throw error;
    }
  }, []);

  // Document management methods
  const getDocuments = useCallback(async (projectId: string): Promise<Document[]> => {
    try {
      return await contactApiService.getDocuments(projectId);
    } catch (error) {
      console.error('Failed to get documents:', error);
      throw error;
    }
  }, []);

  const uploadDocument = useCallback(async (projectId: string, documentData: any): Promise<Document> => {
    try {
      const newDocument = await contactApiService.uploadDocument(projectId, documentData);
      toast.success('Document uploaded successfully');
      return newDocument;
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error('Failed to upload document');
      throw error;
    }
  }, []);

  const updateDocument = useCallback(async (documentId: string, documentData: any): Promise<Document> => {
    try {
      const updatedDocument = await contactApiService.updateDocument(documentId, documentData);
      toast.success('Document updated successfully');
      return updatedDocument;
    } catch (error) {
      console.error('Failed to update document:', error);
      toast.error('Failed to update document');
      throw error;
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: string): Promise<void> => {
    try {
      await contactApiService.deleteDocument(documentId);
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
      throw error;
    }
  }, []);

  return {
    projects,
    selectedProject,
    loading,
    error,
    setSelectedProject,
    updateProjectLocally,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
    checkDelayedProjects,
    
    // Workflow management
    getWorkflowStages,
    addWorkflowStage,
    updateWorkflowStage,
    deleteWorkflowStage,
    
    // Timeline management
    getTimelineEvents,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    
    // Contact management
    getContacts,
    addContact,
    updateContact,
    deleteContact,
    
    // Document management
    getDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument
  };
}
