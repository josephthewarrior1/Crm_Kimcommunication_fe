/**
 * Project Resources Hook
 * 
 * Custom React hook for managing project-related resources (stages, events, contacts, documents, team members).
 * Provides a clean interface for loading and managing project resources.
 * 
 * @author Juan
 * @version 1.0
 */

import { useState, useEffect, useCallback } from 'react';
import { workflowApiService, WorkflowStage, TimelineEvent } from '../services/workflowApiService';
import { contactApiService, Contact, Document } from '../services/contactApiService';

interface UseProjectResourcesReturn {
  // Workflow stages
  workflowStages: WorkflowStage[];
  loadingStages: boolean;
  loadStages: () => Promise<void>;

  // Timeline events
  timelineEvents: TimelineEvent[];
  loadingEvents: boolean;
  loadEvents: () => Promise<void>;

  // Contacts
  contacts: Contact[];
  loadingContacts: boolean;
  loadContacts: () => Promise<void>;

  // Documents
  documents: Document[];
  loadingDocuments: boolean;
  loadDocuments: () => Promise<void>;

  // Team members
  teamMembers: any[];
  loadingTeam: boolean;
  loadTeam: () => Promise<void>;

  // Project users
  projectUsers: any[];
  loadingUsers: boolean;
  loadProjectUsers: () => Promise<void>;

  // All users (for assignment)
  allUsers: any[];
  loadingAllUsers: boolean;
  loadAllUsers: () => Promise<void>;
}

/**
 * Custom hook for managing project resources
 * 
 * @param projectId - Project ID to load resources for
 * @returns Project resources hook interface
 */
export function useProjectResources(projectId: string | null): UseProjectResourcesReturn {
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [loadingStages, setLoadingStages] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);

  const loadStages = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingStages(true);
      const data = await workflowApiService.getWorkflowStages(projectId);
      setWorkflowStages(data);
    } catch (error) {
      console.error('Failed to load workflow stages:', error);
      setWorkflowStages([]);
    } finally {
      setLoadingStages(false);
    }
  }, [projectId]);

  const loadEvents = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingEvents(true);
      const data = await workflowApiService.getTimelineEvents(projectId);
      setTimelineEvents(data);
    } catch (error) {
      console.error('Failed to load timeline events:', error);
      setTimelineEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [projectId]);

  const loadContacts = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingContacts(true);
      const data = await contactApiService.getContacts(projectId);
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [projectId]);

  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingDocuments(true);
      const data = await contactApiService.getDocuments(projectId);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, [projectId]);

  const loadTeam = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingTeam(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081'}/api/projects/${projectId}/team-members`,
        {
          headers: {
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('session') : null}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setTeamMembers((data || []).map((m: any) => ({
          id: String(m.id),
          name: m.name,
          role: m.role,
          email: m.email,
          userId: m.user ? String(m.user.id) : undefined,
          username: m.user ? m.user.username : undefined
        })));
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  }, [projectId]);

  const loadProjectUsers = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingUsers(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081'}/api/projects/${projectId}/users`,
        {
          headers: {
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('session') : null}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProjectUsers((data || []).map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          roles: u.roles || []
        })));
      }
    } catch (error) {
      console.error('Failed to load project users:', error);
      setProjectUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [projectId]);

  const loadAllUsers = useCallback(async () => {
    try {
      setLoadingAllUsers(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081'}/api/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('session') : null}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAllUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load all users:', error);
      setAllUsers([]);
    } finally {
      setLoadingAllUsers(false);
    }
  }, []);

  return {
    workflowStages,
    loadingStages,
    loadStages,
    timelineEvents,
    loadingEvents,
    loadEvents,
    contacts,
    loadingContacts,
    loadContacts,
    documents,
    loadingDocuments,
    loadDocuments,
    teamMembers,
    loadingTeam,
    loadTeam,
    projectUsers,
    loadingUsers,
    loadProjectUsers,
    allUsers,
    loadingAllUsers,
    loadAllUsers
  };
}

