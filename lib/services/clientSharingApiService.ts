import { getAuthHeaders } from './apiService';
import {
  FolderShare,
  ClientFolderPermission,
  SharedFolderGroup,
  ClientUser,
  FolderContents,
  FolderTreeNode
} from './contactApiService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

export const clientSharingApiService = {

  // --- Share management (admin/manager) ---

  async getSharesForFolder(projectId: string, folderId: string): Promise<FolderShare[]> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}/shares`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to fetch shares: ${r.status}`);
    return r.json();
  },

  async createShare(projectId: string, folderId: string, userId: number, permission: ClientFolderPermission): Promise<FolderShare> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}/shares`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userId, permission })
    });
    if (!r.ok) throw new Error(`Failed to create share: ${r.status}`);
    return r.json();
  },

  async updateSharePermission(projectId: string, folderId: string, shareId: number, permission: ClientFolderPermission): Promise<void> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}/shares/${shareId}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ permission })
    });
    if (!r.ok) throw new Error(`Failed to update share: ${r.status}`);
  },

  async getInheritedShares(projectId: string, folderId: string): Promise<{ userId: number; userName: string; userEmail: string; permission: string; folderName: string }[]> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}/shares/inherited`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) return [];
    return r.json();
  },

  async revokeShare(projectId: string, folderId: string, shareId: number): Promise<void> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}/shares/${shareId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to revoke share: ${r.status}`);
  },

  // --- Client user management (admin/manager) ---

  async getClientUsers(): Promise<ClientUser[]> {
    const r = await fetch(`${API_BASE}/api/admin/client-users`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to fetch client users: ${r.status}`);
    return r.json();
  },

  async createClientUser(data: { name: string; email: string; password: string; username?: string; clientId?: number }): Promise<ClientUser> {
    const r = await fetch(`${API_BASE}/api/admin/client-users`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create client user: ${r.status}`);
    }
    return r.json();
  },

  async convertContactToUser(contactId: number, password: string, username?: string): Promise<ClientUser> {
    const r = await fetch(`${API_BASE}/api/admin/client-users/from-contact/${contactId}`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ password, ...(username ? { username } : {}) })
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Failed to convert contact: ${r.status}`);
    }
    return r.json();
  },

  // --- Client portal ---

  async getSharedFolders(): Promise<SharedFolderGroup[]> {
    const r = await fetch(`${API_BASE}/api/client-portal/shared-folders`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to fetch shared folders: ${r.status}`);
    return r.json();
  },

  async getClientFolderContents(projectId: string, parentId?: string | null): Promise<FolderContents & { permission?: string }> {
    const params = parentId ? `?parentId=${parentId}` : '';
    const r = await fetch(`${API_BASE}/api/client-portal/projects/${projectId}/folders${params}`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to fetch client folder contents: ${r.status}`);
    return r.json();
  },

  async getClientFolderTree(projectId: string): Promise<FolderTreeNode[]> {
    const r = await fetch(`${API_BASE}/api/client-portal/projects/${projectId}/folders/tree`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to fetch client folder tree: ${r.status}`);
    return r.json();
  }
};
