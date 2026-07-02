import apiClient, { suiteClient } from './apiClient';

/**
 * Unwrap a suite ApiResponse envelope { success, data } → data.
 * Tolerates a bare payload (no envelope) for resilience.
 * (Mirrors mortgageService's unwrapEnvelope — kept local here so this service
 * doesn't take on a cross-service dependency for one helper.)
 */
function unwrapEnvelope(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload && 'success' in payload) {
    return payload.data;
  }
  return payload;
}

/**
 * Map the admin form's document-type payload → the suite's UpsertDocumentTypeRequest
 * shape. Strips `borrowerVisibleDefault` (removed — visibility is now per-document
 * sharing, not per-type) and `isActive` → `active` (verified against
 * msfg-suite UpsertDocumentTypeRequest.java).
 */
function toSuiteDocTypePayload(payload = {}) {
  const {
    borrowerVisibleDefault, // eslint-disable-line no-unused-vars
    isActive,
    active,
    ...rest
  } = payload;
  return {
    ...rest,
    active: active ?? isActive,
  };
}

/**
 * Map the admin form's folder-template payload → the suite's
 * UpsertFolderTemplateRequest shape: isOldLoanArchive→oldLoanArchive,
 * isDeleteFolder→deleteFolder, isActive→active (verified against
 * msfg-suite UpsertFolderTemplateRequest.java).
 */
function toSuiteFolderTemplatePayload(payload = {}) {
  const {
    isOldLoanArchive,
    oldLoanArchive,
    isDeleteFolder,
    deleteFolder,
    isActive,
    active,
    ...rest
  } = payload;
  return {
    ...rest,
    oldLoanArchive: oldLoanArchive ?? isOldLoanArchive,
    deleteFolder: deleteFolder ?? isDeleteFolder,
    active: active ?? isActive,
  };
}

const adminService = {
  // ── Document Types — managed on the msfg-suite (system of record) ──────────
  listDocumentTypes: async () => {
    const { data } = await suiteClient.get('/admin/document-types');
    // Admin list returns ApiResponse<List<...>> — envelope data IS the array (verified against
    // AdminDocumentTypeController). The {count, documentTypes} object view is the NON-admin
    // /api/document-types shape; tolerated here as future-proofing.
    const payload = unwrapEnvelope(data);
    return Array.isArray(payload) ? payload : (payload?.documentTypes || []);
  },
  getDocumentType: async (id) => {
    const { data } = await suiteClient.get(`/admin/document-types/${id}`);
    return unwrapEnvelope(data);
  },
  createDocumentType: async (payload) => {
    const { data } = await suiteClient.post('/admin/document-types', toSuiteDocTypePayload(payload));
    return unwrapEnvelope(data);
  },
  updateDocumentType: async (id, payload) => {
    const { data } = await suiteClient.put(`/admin/document-types/${id}`, toSuiteDocTypePayload(payload));
    return unwrapEnvelope(data);
  },
  deactivateDocumentType: async (id) => {
    const { data } = await suiteClient.delete(`/admin/document-types/${id}`);
    return unwrapEnvelope(data);
  },

  // ── Folder Templates — managed on the msfg-suite (system of record) ────────
  listFolderTemplates: async () => {
    const { data } = await suiteClient.get('/admin/folder-templates');
    // Admin list returns ApiResponse<List<...>> — envelope data IS the array (verified against
    // AdminFolderTemplateController). {count, folderTemplates} object view tolerated as future-proofing.
    const payload = unwrapEnvelope(data);
    return Array.isArray(payload) ? payload : (payload?.folderTemplates || []);
  },
  getFolderTemplate: async (id) => {
    const { data } = await suiteClient.get(`/admin/folder-templates/${id}`);
    return unwrapEnvelope(data);
  },
  createFolderTemplate: async (payload) => {
    const { data } = await suiteClient.post('/admin/folder-templates', toSuiteFolderTemplatePayload(payload));
    return unwrapEnvelope(data);
  },
  updateFolderTemplate: async (id, payload) => {
    const { data } = await suiteClient.put(`/admin/folder-templates/${id}`, toSuiteFolderTemplatePayload(payload));
    return unwrapEnvelope(data);
  },
  deactivateFolderTemplate: async (id) => {
    const { data } = await suiteClient.delete(`/admin/folder-templates/${id}`);
    return unwrapEnvelope(data);
  },

  // ── User administration (LO/Admin) — served by the suite (ApiResponse {success,data}) ───────
  createUser: async (payload) => {
    const { data } = await apiClient.post('/admin/users', payload);
    return data?.data ?? data;
  },
  resetUserPassword: async (id) => {
    await apiClient.post(`/admin/users/${id}/reset-password`);
  },

  // ── App settings (admin-only) ──────────────────────────────────────────────
  getAppSettings: async () => {
    const { data } = await apiClient.get('/admin/app-settings');
    return data;
  },
  updateAppSettings: async (patch) => {
    const { data } = await apiClient.put('/admin/app-settings', patch);
    return data;
  },
};

export default adminService;
