import apiClient from './apiClient';

const adminService = {
  // ── Document Types ─────────────────────────────────────────────────────────
  listDocumentTypes: async () => {
    const { data } = await apiClient.get('/admin/document-types');
    return data.documentTypes || [];
  },
  getDocumentType: async (id) => {
    const { data } = await apiClient.get(`/admin/document-types/${id}`);
    return data;
  },
  createDocumentType: async (payload) => {
    const { data } = await apiClient.post('/admin/document-types', payload);
    return data;
  },
  updateDocumentType: async (id, payload) => {
    const { data } = await apiClient.put(`/admin/document-types/${id}`, payload);
    return data;
  },
  deactivateDocumentType: async (id) => {
    const { data } = await apiClient.delete(`/admin/document-types/${id}`);
    return data;
  },

  // ── Folder Templates ───────────────────────────────────────────────────────
  listFolderTemplates: async () => {
    const { data } = await apiClient.get('/admin/folder-templates');
    return data.folderTemplates || [];
  },
  getFolderTemplate: async (id) => {
    const { data } = await apiClient.get(`/admin/folder-templates/${id}`);
    return data;
  },
  createFolderTemplate: async (payload) => {
    const { data } = await apiClient.post('/admin/folder-templates', payload);
    return data;
  },
  updateFolderTemplate: async (id, payload) => {
    const { data } = await apiClient.put(`/admin/folder-templates/${id}`, payload);
    return data;
  },
  deactivateFolderTemplate: async (id) => {
    const { data } = await apiClient.delete(`/admin/folder-templates/${id}`);
    return data;
  },
};

export default adminService;
