import apiClient from './apiClient';

/**
 * Backend API surface for the borrower portal.
 *
 * Auth: every call is automatically attached a Bearer token by apiClient's request
 * interceptor (read from sessionStorage where react-oidc-context stores the user).
 *
 * Document upload: Phase 2B switched from the old multipart upload endpoint to a
 * presigned-URL flow. The new sequence is documented on the methods below.
 */
const mortgageService = {
  // ────────────────── Loan applications ──────────────────

  /** Create a fresh loan application. Backend stamps the assigned LO if the JWT belongs to one. */
  createApplication: async (applicationData) => {
    try {
      const { data } = await apiClient.post('/loan-applications', applicationData);
      return data;
    } catch (error) {
      const fieldErrors = error.response?.data?.fieldErrors;
      if (fieldErrors) console.error('Field validation errors:', fieldErrors);
      const msg = error.response?.data?.message || error.response?.data?.error || error.response?.data || 'Failed to create application';
      throw new Error(typeof msg === 'string' ? msg : 'Request validation failed');
    }
  },

  /**
   * Paged loan list backing the pipeline page. Accepts a backend-ready
   * query string (see useFilterUrlState.toQueryString()).
   *
   * @param {string} [queryString]
   * @returns {Promise<{ content: any[], totalElements: number, totalPages: number, page: number, size: number }>}
   */
  getApplications: async (queryString = '') => {
    const url = queryString
      ? `/loan-applications?${queryString}`
      : '/loan-applications';
    const { data } = await apiClient.get(url);
    // Defensive: if a caller still expects an array (legacy callers during
    // the cutover window), return content[]. After Phase 3 this branch goes.
    if (Array.isArray(data)) return { content: data, totalElements: data.length, totalPages: 1, page: 0, size: data.length };
    return data;
  },

  /**
   * Typeahead for the global TopBar search. Returns up to `limit` ranked hits.
   * Uses an AbortController so rapid retypes cancel in-flight requests.
   *
   * @param {string} q
   * @param {{ limit?: number, signal?: AbortSignal }} [opts]
   */
  searchLoans: async (q, opts = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (opts.limit) params.set('limit', String(opts.limit));
    const { data } = await apiClient.get(
      `/loan-applications/search?${params.toString()}`,
      { signal: opts.signal },
    );
    return Array.isArray(data) ? data : [];
  },

  getApplication: async (id) => {
    const { data } = await apiClient.get(`/loan-applications/${id}`);
    return data;
  },

  updateApplication: async (id, applicationData) => {
    const { data } = await apiClient.put(`/loan-applications/${id}`, applicationData);
    return data;
  },

  deleteApplication: async (id) => {
    await apiClient.delete(`/loan-applications/${id}`);
  },

  /**
   * Server-side clone — creates a new application carrying forward the source's
   * loan basics, property, every borrower (with employment / income / residences
   * / declaration / assets / REO), and top-level liabilities. Returns
   * { id, applicationNumber }. SSNs and unique identifiers are NOT carried.
   */
  cloneApplication: async (sourceId) => {
    const { data } = await apiClient.post(`/loan-applications/${sourceId}/clone`);
    return data;
  },

  /** Status timeline for the borrower portal's progress view. */
  getStatusHistory: async (id) => {
    const { data } = await apiClient.get(`/loan-applications/${id}/status-history`);
    return data;
  },

  // ────────────────── MISMO export / import ──────────────────

  /**
   * Download a MISMO 3.4 XML file for the loan and trigger a browser save dialog.
   * Returns the suggested filename so the caller can show a confirmation toast.
   */
  exportMismo: async (loanId) => {
    const response = await apiClient.get(`/loan-applications/${loanId}/export/mismo`, {
      responseType: 'blob',
    });
    // Filename comes back via Content-Disposition; parse it (apiClient exposes it)
    const cd = response.headers?.['content-disposition'] || '';
    const m = /filename="?([^"]+)"?/.exec(cd);
    const filename = m ? m[1] : `MSFG-loan-${loanId}.xml`;
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return filename;
  },

  /**
   * Create a brand-new loan application by importing a MISMO XML file. Used by the "Start from
   * MISMO" entry point on /applications. Returns { ok, id, applicationNumber, changeCount, ... }.
   */
  createFromMismo: async (file) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await apiClient.post('/loan-applications/from-mismo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (e) {
      throw new Error(e.response?.data?.message || e.response?.data?.error || 'Create-from-MISMO failed');
    }
  },

  /**
   * Upload a MISMO XML file. Returns the parsed result on success ({ ok, changeCount, changes, ... }).
   *
   * If the file's CreatedDatetime is older than the application's last-update time, the backend
   * returns 409 with drift details. Throw a special DriftError so the caller can prompt and
   * optionally retry with force=true.
   */
  importMismo: async (loanId, file, { force = false } = {}) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await apiClient.post(
        `/loan-applications/${loanId}/import/mismo${force ? '?force=true' : ''}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    } catch (e) {
      if (e.response?.status === 409 && e.response.data?.error === 'drift_detected') {
        const err = new Error('drift_detected');
        err.drift = e.response.data;
        throw err;
      }
      throw new Error(e.response?.data?.message || e.response?.data?.error || 'MISMO import failed');
    }
  },

  /** Update status (LO/Admin only). Note: the backend uses PATCH and a `status` query param. */
  updateApplicationStatus: async (id, status) => {
    const { data } = await apiClient.patch(`/loan-applications/${id}/status?status=${encodeURIComponent(status)}`);
    return data;
  },

  // ────────────────── "Me" (user-scoped) ──────────────────

  getMe: async () => {
    const { data } = await apiClient.get('/me');
    return data;
  },

  getMyLoans: async () => {
    const { data } = await apiClient.get('/me/loans');
    return data;
  },

  // ────────────────── Documents (Phase 2B presigned URL flow) ──────────────────

  /**
   * Step 1: ask the backend for a presigned PUT URL.
   * Returns: { documentId, docUuid, s3Key, bucket, uploadUrl, contentType, expiresInSeconds }
   */
  getDocumentUploadUrl: async (loanId, { fileName, documentType, partyRole, contentType, folderId }) => {
    const { data } = await apiClient.post(`/loan-applications/${loanId}/documents/upload-url`, {
      fileName, documentType, partyRole,
      contentType: contentType || 'application/octet-stream',
      folderId: folderId ?? null,
    });
    return data;
  },

  /**
   * Step 2: upload directly to S3 using the presigned URL. No auth header — the URL itself
   * is the credential. Content-Type must match what we asked for.
   */
  uploadFileToS3: async (uploadUrl, file) => {
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    }).then(r => {
      if (!r.ok) throw new Error(`S3 upload failed: HTTP ${r.status}`);
    });
  },

  /** Step 3: tell the backend the upload finished. Backend HEADs S3, applies tags, flips status. */
  confirmDocumentUpload: async (loanId, docUuid) => {
    const { data } = await apiClient.put(`/loan-applications/${loanId}/documents/${docUuid}/confirm`);
    return data;
  },

  getApplicationDocuments: async (loanId) => {
    const { data } = await apiClient.get(`/loan-applications/${loanId}/documents`);
    // Backend returns { count, documents: [...] }; callers want the array.
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.documents)) return data.documents;
    return [];
  },

  /** Returns a presigned GET URL good for ~15 min. Caller can window.location.href to it. */
  getDocumentDownloadUrl: async (loanId, docUuid) => {
    const { data } = await apiClient.get(`/loan-applications/${loanId}/documents/${docUuid}/download-url`);
    return data; // { downloadUrl, expiresInSeconds }
  },

  /** Convenience: full upload sequence. Returns the saved document record. */
  uploadDocument: async (loanId, { file, documentType, partyRole = 'borrower', folderId = null }) => {
    const slot = await mortgageService.getDocumentUploadUrl(loanId, {
      fileName: file.name,
      documentType,
      partyRole,
      contentType: file.type,
      folderId,
    });
    await mortgageService.uploadFileToS3(slot.uploadUrl, file);
    return mortgageService.confirmDocumentUpload(loanId, slot.docUuid);
  },

  // ────────────────── Folder AI evaluation ──────────────────

  /** Public flag — every signed-in user can read. Returns { aiEvalEnabled: boolean }. */
  getAppSettingsPublic: async () => {
    const { data } = await apiClient.get('/app-settings/public');
    return data;
  },

  /** Fire the eval for one folder. Returns the new folder_evaluations row. */
  evaluateFolder: async (loanId, folderTemplateId) => {
    const { data } = await apiClient.post(
      `/loan-applications/${loanId}/folders/${folderTemplateId}/evaluate`);
    return data;
  },

  /** Latest eval row for this (loan, folder), or null when none exists. */
  getFolderEvaluation: async (loanId, folderTemplateId) => {
    try {
      const { data } = await apiClient.get(
        `/loan-applications/${loanId}/folders/${folderTemplateId}/evaluation`);
      return data;
    } catch (e) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },
};

export default mortgageService;
