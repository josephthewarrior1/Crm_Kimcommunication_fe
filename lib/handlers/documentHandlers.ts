/**
 * Document Handlers
 * 
 * Handler functions for document operations (upload, update, delete, replace file).
 * These handlers encapsulate the business logic for document management.
 * 
 * @author Juan
 * @version 1.0
 */

import { toast } from 'sonner';
import { contactApiService, Document } from '../services/contactApiService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

const authHeaders = (extra?: Record<string, string>): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export interface DocumentHandlers {
  handleDocumentUpload: (projectId: string, docData?: any) => Promise<Document | null>;
  handleDocumentUploadFile: (projectId: string, file: File, meta?: { name?: string; type?: string; status?: string; description?: string; folderId?: string | null }) => Promise<Document | null>;
  handleDocumentEdit: (projectId: string, doc: Document) => Promise<Document | null>;
  handleDocumentReplaceFile: (projectId: string, docId: string, file: File, meta?: { name?: string; type?: string; description?: string }) => Promise<Document | null>;
  handleDocumentDelete: (projectId: string, doc: Document) => Promise<void>;
  reloadDocuments: (projectId: string) => Promise<Document[]>;
}

/**
 * Create document handlers
 * 
 * @param onDocumentsChange - Callback when documents change
 * @returns Document handlers
 */
export function createDocumentHandlers(
  onDocumentsChange?: (projectId: string, documents: Document[]) => void
): DocumentHandlers {

  const reloadDocuments = async (projectId: string): Promise<Document[]> => {
    try {
      const reloadR = await fetch(`${API_BASE}/api/projects/${projectId}/documents`, {
        headers: authHeaders()
      });
      if (reloadR.ok) {
        const reloadData = await reloadR.json();
        const mapped = (reloadData || []).map((d: any) => ({
          id: String(d.id),
          name: d.name,
          type: (d.type === 'budget' ? 'report' : (d.type || 'manual')),
          status: (d.status || 'draft'),
          version: '1.0',
          lastModified: d.uploadedAt || new Date().toISOString(),
          modifiedBy: 'System',
          size: 'n/a',
          url: d.url ? (d.url.startsWith('http') ? d.url : `${API_BASE}${d.url}`) : undefined,
          description: d.description || '',
          folderId: d.folderId ? String(d.folderId) : null
        }));

        if (onDocumentsChange) {
          onDocumentsChange(projectId, mapped);
        }

        return mapped;
      }
      return [];
    } catch (error) {
      console.error('Failed to reload documents:', error);
      return [];
    }
  };

  const handleDocumentUpload = async (projectId: string, docData?: any): Promise<Document | null> => {
    const newDoc = {
      name: docData?.name || 'New Document',
      type: docData?.type || 'manual',
      url: '',
      uploadedAt: new Date().toISOString(),
      status: docData?.status || 'draft',
      description: docData?.description || ''
    };

    try {
      const r = await fetch(`${API_BASE}/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newDoc)
      });

      if (r.ok) {
        const saved = await r.json();
        const mapped: Document = {
          id: String(saved.id),
          name: saved.name,
          type: saved.type || 'manual',
          status: saved.status || 'draft',
          version: '1.0',
          lastModified: saved.uploadedAt || new Date().toISOString(),
          modifiedBy: 'System',
          size: 'n/a',
          description: saved.description || docData?.description || ''
        };

        await reloadDocuments(projectId);
        toast.success('Document uploaded.');
        return mapped;
      }
    } catch (e) {
      console.warn(e);
      toast.error('Failed to upload document');
    }

    return null;
  };

  const handleDocumentUploadFile = async (
    projectId: string,
    file: File,
    meta?: { name?: string; type?: string; status?: string; description?: string; folderId?: string | null }
  ): Promise<Document | null> => {
    try {
      const form = new FormData();
      form.append('projectId', String(projectId));
      form.append('file', file);
      if (meta?.name) form.append('name', meta.name);
      if (meta?.type) form.append('type', meta.type as any);
      if (meta?.description !== undefined) form.append('description', meta.description);
      if (meta?.folderId) form.append('folderId', meta.folderId);

      const r = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        body: form,
        headers: authHeaders()
      });

      if (r.ok) {
        const saved = await r.json();

        // Update description separately if needed
        if (meta?.description !== undefined && !saved.description) {
          try {
            const updatePayload = {
              id: Number(saved.id),
              name: saved.name,
              type: saved.type || 'manual',
              url: saved.url || '',
              uploadedAt: saved.uploadedAt || new Date().toISOString(),
              status: saved.status || 'draft',
              description: meta.description
            };
            await fetch(`${API_BASE}/api/documents/${saved.id}`, {
              method: 'PUT',
              headers: authHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify(updatePayload)
            });
          } catch (e) {
            console.warn('Failed to update description separately', e);
          }
        }

        await reloadDocuments(projectId);
        toast.success('Document uploaded.');
        const mapped: Document = {
          id: String(saved.id),
          name: saved.name,
          type: saved.type || 'manual',
          status: saved.status || 'draft',
          version: '1.0',
          lastModified: saved.uploadedAt || new Date().toISOString(),
          modifiedBy: 'System',
          size: 'n/a',
          url: saved.url ? (saved.url.startsWith('http') ? saved.url : `${API_BASE}${saved.url}`) : undefined,
          description: saved.description || meta?.description || ''
        };
        return mapped;
      }

      throw new Error('Upload failed');
    } catch (e) {
      console.warn(e);
      toast.error('Upload failed');
      return null;
    }
  };

  const handleDocumentEdit = async (projectId: string, doc: Document): Promise<Document | null> => {
    const idStr = String(doc.id || '');
    const isPersisted = /^\d+$/.test(idStr);

    if (!isPersisted) {
      toast.error('Cannot edit unsaved document');
      return null;
    }

    try {
      const payload = {
        id: Number(idStr),
        name: doc.name,
        type: doc.type,
        url: doc.url || '',
        uploadedAt: doc.lastModified,
        status: doc.status,
        description: doc.description || ''
      };

      const r = await fetch(`${API_BASE}/api/documents/${idStr}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      if (r.ok) {
        await reloadDocuments(projectId);
        toast.success(`Document "${doc.name}" updated.`);
        return null;
      }

      const errorText = await r.text();
      console.error('Failed to update document:', r.status, errorText);
      toast.error('Failed to update document');
      return null;
    } catch (e) {
      console.error('Error updating document:', e);
      toast.error('Failed to update document');
      return null;
    }
  };

  const handleDocumentReplaceFile = async (
    projectId: string,
    docId: string,
    file: File,
    meta?: { name?: string; type?: string; description?: string }
  ): Promise<Document | null> => {
    const idStr = String(docId);
    const descriptionValue = meta?.description !== undefined && meta?.description !== null
      ? String(meta.description).trim()
      : '';

    try {
      const form = new FormData();
      form.append('description', descriptionValue);
      form.append('file', file);
      if (meta?.name) form.append('name', meta.name);
      if (meta?.type) form.append('type', meta.type as any);

      const r = await fetch(`${API_BASE}/api/documents/${idStr}/upload`, {
        method: 'POST',
        body: form,
        headers: authHeaders()
      });

      if (r.ok) {
        const saved = await r.json();

        // Update description via PUT to ensure it's saved
        if (descriptionValue !== undefined) {
          try {
            const updatePayload = {
              id: Number(saved.id),
              name: saved.name,
              type: saved.type || 'manual',
              url: saved.url || '',
              uploadedAt: saved.uploadedAt || new Date().toISOString(),
              status: saved.status || 'draft',
              description: descriptionValue
            };
            await fetch(`${API_BASE}/api/documents/${idStr}`, {
              method: 'PUT',
              headers: authHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify(updatePayload)
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (e) {
            console.warn('Failed to update description separately', e);
          }
        }

        await reloadDocuments(projectId);
        toast.success('Document file replaced.');
        return null;
      }

      const errorText = await r.text();
      toast.error(`Failed to replace document file: ${r.status}`);
      return null;
    } catch (e) {
      console.error('Error replacing document file:', e);
      toast.error('Failed to replace document file: ' + (e instanceof Error ? e.message : 'Unknown error'));
      return null;
    }
  };

  const handleDocumentDelete = async (projectId: string, doc: Document): Promise<void> => {
    const idStr = String(doc.id || '');
    const isPersisted = /^\d+$/.test(idStr);

    try {
      if (isPersisted) {
        const r = await fetch(`${API_BASE}/api/documents/${idStr}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        if (!r.ok) throw new Error('Failed to delete document');
      }

      await reloadDocuments(projectId);
      toast.success(`Document "${doc.name}" deleted.`);
    } catch (e) {
      console.warn(e);
      toast.error('Failed to delete document');
    }
  };

  return {
    handleDocumentUpload,
    handleDocumentUploadFile,
    handleDocumentEdit,
    handleDocumentReplaceFile,
    handleDocumentDelete,
    reloadDocuments
  };
}

