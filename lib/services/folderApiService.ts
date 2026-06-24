import { getAuthHeaders } from './apiService';
import { FolderContents, FolderTreeNode } from './contactApiService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

export const folderApiService = {

  async getFolderContents(projectId: string, parentId?: string | null, showAll?: boolean): Promise<FolderContents> {
    const queryParts: string[] = [];
    if (parentId) queryParts.push(`parentId=${parentId}`);
    if (showAll) queryParts.push('showAll=true');
    const params = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders${params}`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to fetch folder contents: ${r.status}`);
    return r.json();
  },

  async createFolder(projectId: string, name: string, parentId?: string | null): Promise<any> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, parentId: parentId || null })
    });
    if (!r.ok) throw new Error(`Failed to create folder: ${r.status}`);
    return r.json();
  },

  async renameFolder(projectId: string, folderId: string, name: string): Promise<any> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name })
    });
    if (!r.ok) throw new Error(`Failed to rename folder: ${r.status}`);
    return r.json();
  },

  async deleteFolder(projectId: string, folderId: string): Promise<void> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to delete folder: ${r.status}`);
  },

  async moveFolder(projectId: string, folderId: string, newParentId: string | null): Promise<void> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/${folderId}/move`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ parentId: newParentId })
    });
    if (!r.ok) throw new Error(`Failed to move folder: ${r.status}`);
  },

  async moveDocument(documentId: string, folderId: string | null): Promise<void> {
    const r = await fetch(`${API_BASE}/api/documents/${documentId}/move`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ folderId })
    });
    if (!r.ok) throw new Error(`Failed to move document: ${r.status}`);
  },

  async getFolderTree(projectId: string): Promise<FolderTreeNode[]> {
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/folders/tree`, {
      headers: getAuthHeaders()
    });
    if (!r.ok) throw new Error(`Failed to fetch folder tree: ${r.status}`);
    return r.json();
  }
};
