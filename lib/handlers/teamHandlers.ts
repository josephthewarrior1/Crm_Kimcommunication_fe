/**
 * Team Handlers
 * 
 * Handler functions for team member and project user operations.
 * 
 * @author Juan
 * @version 1.0
 */

import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

const authHeaders = (extra?: Record<string, string>): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export interface TeamHandlers {
  addProjectUser: (projectId: string, userId: string) => Promise<void>;
  removeProjectUser: (projectId: string, userId: string) => Promise<void>;
  assignTeamMember: (projectId: string, memberId: string) => Promise<void>;
  unassignTeamMember: (projectId: string, memberId: string) => Promise<void>;
  getAvailableMembers: (projectId: string, assignedMemberIds: string[]) => Promise<any[]>;
}

/**
 * Create team handlers
 * 
 * @param onTeamChange - Callback when team changes
 * @returns Team handlers
 */
export function createTeamHandlers(
  onTeamChange?: (projectId: string, teamMembers: any[]) => void,
  onUsersChange?: (projectId: string, users: any[]) => void
): TeamHandlers {

  const addProjectUser = async (projectId: string, userId: string): Promise<void> => {
    if (!projectId || !userId) return;

    try {
      const r = await fetch(`${API_BASE}/api/projects/${projectId}/users/${userId}`, {
        method: 'POST',
        headers: authHeaders()
      });

      if (!r.ok) throw new Error('Add user failed');

      // Reload project users
      const rr = await fetch(`${API_BASE}/api/projects/${projectId}/users`, {
        headers: authHeaders()
      });

      if (rr.ok) {
        const data = await rr.json();
        const mapped = (data || []).map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          roles: u.roles || []
        }));

        if (onUsersChange) {
          onUsersChange(projectId, mapped);
        }
      }

      toast.success('User added to project');
    } catch (e) {
      console.warn(e);
      toast.error('Failed to add user');
    }
  };

  const removeProjectUser = async (projectId: string, userId: string): Promise<void> => {
    if (!projectId) return;

    try {
      const r = await fetch(`${API_BASE}/api/projects/${projectId}/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (!r.ok) throw new Error('Remove user failed');

      // Reload project users
      const rr = await fetch(`${API_BASE}/api/projects/${projectId}/users`, {
        headers: authHeaders()
      });

      if (rr.ok) {
        const data = await rr.json();
        const mapped = (data || []).map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          roles: u.roles || []
        }));

        if (onUsersChange) {
          onUsersChange(projectId, mapped);
        }
      }

      toast.success('User removed from project');
    } catch (e) {
      console.warn(e);
      toast.error('Failed to remove user');
    }
  };

  const assignTeamMember = async (projectId: string, memberId: string): Promise<void> => {
    if (!memberId) return;

    try {
      const r = await fetch(`${API_BASE}/api/projects/${projectId}/team-members/${memberId}`, {
        method: 'POST',
        headers: authHeaders()
      });

      if (!r.ok) throw new Error('Assign failed');

      // Reload team members
      const rs = await fetch(`${API_BASE}/api/projects/${projectId}/team-members`, {
        headers: authHeaders()
      });

      if (rs.ok) {
        const data = await rs.json();
        const mapped = (data || []).map((m: any) => ({
          id: String(m.id),
          name: m.name,
          role: m.role,
          email: m.email
        }));

        if (onTeamChange) {
          onTeamChange(projectId, mapped);
        }
      }

      toast.success('Member assigned');
    } catch (e) {
      console.warn(e);
      toast.error('Failed to assign');
    }
  };

  const unassignTeamMember = async (projectId: string, memberId: string): Promise<void> => {
    try {
      const r = await fetch(`${API_BASE}/api/projects/${projectId}/team-members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (!r.ok) throw new Error('Unassign failed');

      // Reload team members
      const rs = await fetch(`${API_BASE}/api/projects/${projectId}/team-members`, {
        headers: authHeaders()
      });

      if (rs.ok) {
        const data = await rs.json();
        const mapped = (data || []).map((m: any) => ({
          id: String(m.id),
          name: m.name,
          role: m.role,
          email: m.email
        }));

        if (onTeamChange) {
          onTeamChange(projectId, mapped);
        }
      }

      toast.success('Member unassigned');
    } catch (e) {
      console.warn(e);
      toast.error('Failed to unassign');
    }
  };

  const getAvailableMembers = async (projectId: string, assignedMemberIds: string[]): Promise<any[]> => {
    try {
      const r = await fetch(`${API_BASE}/api/team-members`, {
        headers: authHeaders()
      });

      if (r.ok) {
        const all = await r.json();
        const assigned = new Set(assignedMemberIds);
        const avail = (all || [])
          .filter((m: any) => !assigned.has(String(m.id)))
          .map((m: any) => ({
            id: String(m.id),
            name: m.name,
            email: m.email,
            role: m.role
          }));
        return avail;
      }
    } catch (error) {
      console.error('Failed to get available members:', error);
    }

    return [];
  };

  return {
    addProjectUser,
    removeProjectUser,
    assignTeamMember,
    unassignTeamMember,
    getAvailableMembers
  };
}

