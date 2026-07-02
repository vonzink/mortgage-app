import apiClient, { suiteClient } from './apiClient';

/**
 * Map a suite DocumentResponse to the shape the documents UI consumes (docUuid/status/uploadedAt).
 * `fromLoanTeam` is normalized to a strict boolean: true only when the suite explicitly marks a
 * document as staff-shared; absent/false both mean "the borrower's own upload".
 */
function adaptSuiteDocument(d) {
  if (!d) return d;
  return {
    ...d,
    docUuid: d.id,
    status: d.documentStatus,
    uploadedAt: d.createdAt,
    fromLoanTeam: d.fromLoanTeam === true,
  };
}

/**
 * Backend API surface for the borrower portal.
 *
 * Auth: every call is automatically attached a Bearer token by apiClient's request
 * interceptor (read from sessionStorage where react-oidc-context stores the user).
 *
 * Document upload: Phase 2B switched from the old multipart upload endpoint to a
 * presigned-URL flow. The new sequence is documented on the methods below.
 *
 * ── msfg-suite re-point (borrower slice) ──────────────────────────────────────
 * The borrower's two read screens (my-loans LIST + loan DETAIL) are re-pointed onto
 * the msfg-suite backend. Suite wraps every response in an envelope
 * ({ success, data }) and uses suite-native field names (e.g. primaryBorrowerName,
 * loanNumber, mortgageType, baseLoanAmount). The thin adapters below
 * (adaptSuiteLoanList / adaptSuiteLoanDetail) unwrap the envelope and rename/reshape
 * fields into the exact shapes the existing React components already consume, so NO
 * component or route changes are required. Fields with no source on the suite DTO are
 * left null/undefined — the components already degrade gracefully (render 0 / '—').
 */

/**
 * Unwrap a suite ApiResponse envelope { success, data } → data.
 * Tolerates a bare payload (no envelope) for resilience.
 */
function unwrapEnvelope(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload && 'success' in payload) {
    return payload.data;
  }
  return payload;
}

/**
 * Adapt one suite LoanListItemResponse → the row shape PipelineRow expects.
 * Renames: primaryBorrowerName→borrowerName, loanNumber→applicationNumber,
 * propertyCity→city, propertyState→state, updatedAt→statusChangedAt.
 * Staff-only columns (outstandingConditions, loanAmount, ltvPct, estClosingDate,
 * assignedLoName) have no source on the list item → omitted (components render 0/'—').
 */
function adaptSuiteLoanListItem(item = {}) {
  return {
    id: item.id,
    borrowerName: item.primaryBorrowerName ?? null,
    applicationNumber: item.loanNumber ?? null,
    city: item.propertyCity ?? null,
    state: item.propertyState ?? null,
    status: item.status ?? null,
    // Best-available timestamp for the "in stage Nd" age badge (not a true status-change time).
    statusChangedAt: item.updatedAt ?? null,
  };
}

/**
 * Adapt the suite paged my-loans envelope → the page shape ApplicationList expects.
 * Suite: { success, data: { items, total, totalPages, page, size } }
 *   → { content, totalElements, totalPages, page, size }
 * `size` is coalesced from data.size ?? data.pageSize (contract uses `size`; older
 * blobs mentioned `pageSize`).
 */
function adaptSuiteLoanList(payload) {
  const d = unwrapEnvelope(payload) || {};
  const items = Array.isArray(d.items) ? d.items : (Array.isArray(d) ? d : []);
  return {
    content: items.map(adaptSuiteLoanListItem),
    totalElements: d.total ?? items.length,
    totalPages: d.totalPages ?? 1,
    page: d.page ?? 0,
    size: d.size ?? d.pageSize ?? items.length,
  };
}

/**
 * Adapt one suite LoanSummaryResponse → the direct application object ApplicationDetails
 * expects. Renames mortgageType→loanType, loanNumber→applicationNumber; coalesces
 * loanAmount (baseLoanAmount ?? noteAmount) and propertyValue
 * (appraisedValue ?? estimatedValue ?? salesPrice); reshapes the flat address fields
 * into a nested property{} object. borrowers is set to [] — the suite LoanSummaryResponse
 * carries NO borrower-party data this slice, so borrowers[0] chaining yields 'Unknown'/'—'.
 */
function adaptSuiteLoanDetail(payload) {
  const d = unwrapEnvelope(payload) || {};
  const addressLine = [d.addressLine1, d.addressLine2].filter(Boolean).join(' ') || null;
  return {
    id: d.id,
    applicationNumber: d.loanNumber ?? null,
    status: d.status ?? null,
    loanPurpose: d.loanPurpose ?? null,
    loanType: d.mortgageType ?? null,
    loanAmount: d.baseLoanAmount ?? d.noteAmount ?? null,
    propertyValue: d.appraisedValue ?? d.estimatedValue ?? d.salesPrice ?? null,
    property: {
      addressLine,
      city: d.propertyCity ?? null,
      state: d.propertyState ?? null,
      zipCode: d.postalCode ?? null,
      propertyType: d.propertyType ?? null,
      // Not present on LoanSummaryResponse this slice → component renders '—'.
      constructionType: null,
      yearBuilt: null,
    },
    // No parties data on the suite loan summary this slice; keep optional chaining safe.
    borrowers: [],
  };
}
/**
 * Adapt the suite DashboardResponse envelope → the exact shape LoanDashboardPage
 * consumes (the LO-dashboard cutover onto the suite system of record).
 *
 * The suite DashboardResponse uses suite-native names; the page still reads the old
 * mortgage-app field names, so we rename in one place here (no component changes):
 *   - loanTerms.interestRate     → loanTerms.noteRatePercent
 *   - loanTerms.loanTermMonths   → loanTerms.amortizationTermMonths
 *   - loanTerms.lienPriority     → loanTerms.lienPriorityType
 *   - property.salesPrice        → property.purchasePrice
 *   - property.{appraised/estimated/sales}Value coalesce → property.propertyValue
 *   - property.numberOfUnits     → property.unitsCount
 *   - conditions.items[]         → conditions[]   (status passes through PascalCase)
 *   - statusHistory[].toStatus   → statusHistory[].status (suite LoanStatus enum)
 *   - closingInformation.consummationDate → closingInformation.closingDate
 *
 * `status` passes through as the suite LoanStatus enum (the helpers now speak it).
 * Sections with no suite source degrade to []/null (the page renders '—'/empty hints).
 * `housingExpenses` differs materially (suite = a single monthly-inputs object vs the
 * page's row array) → [] this slice; the MISMO-imported expense table stays empty.
 */
function adaptSuiteDashboard(payload) {
  const d = unwrapEnvelope(payload) || {};

  const lt = d.loanTerms || null;
  const loanTerms = lt
    ? {
        baseLoanAmount: lt.baseLoanAmount ?? null,
        noteAmount: lt.noteAmount ?? null,
        noteRatePercent: lt.interestRate ?? null,
        downPaymentAmount: lt.downPaymentAmount ?? null,
        amortizationType: lt.amortizationType ?? null,
        amortizationTermMonths: lt.loanTermMonths ?? null,
        lienPriorityType: lt.lienPriority ?? null,
        // New first-class suite fields (populated once the backend half lands).
        loanPurpose: lt.loanPurpose ?? null,
        applicationReceivedDate: lt.applicationReceivedDate ?? null,
      }
    : null;

  const p = d.property || null;
  const property = p
    ? {
        addressLine: [p.addressLine1, p.addressLine2].filter(Boolean).join(' ') || null,
        city: p.city ?? null,
        state: p.state ?? null,
        zipCode: p.postalCode ?? null,
        purchasePrice: p.salesPrice ?? null,
        propertyValue: p.appraisedValue ?? p.estimatedValue ?? p.salesPrice ?? null,
        unitsCount: p.numberOfUnits ?? null,
        // No suite source on the dashboard property this slice → page renders '—'.
        propertyUse: null,
        projectType: null,
        attachmentType: null,
        constructionType: null,
        yearBuilt: null,
        county: null,
      }
    : null;

  const conditions = Array.isArray(d.conditions?.items) ? d.conditions.items : [];

  const statusHistory = Array.isArray(d.statusHistory)
    ? d.statusHistory.map((h) => ({
        status: h.toStatus ?? null,
        fromStatus: h.fromStatus ?? null,
        transitionedAt: h.transitionedAt ?? null,
        note: h.note ?? null,
        transitionedBy: h.transitionedBy ?? null,
      }))
    : [];

  const ci = d.closingInformation || null;
  const closingInformation = ci
    ? {
        closingDate: ci.consummationDate ?? null,
        titleCompanyName: ci.titleCompany ?? null,
        escrowOfficer: ci.escrowOfficer ?? null,
        appraiserName: ci.appraiser ?? null,
      }
    : null;

  return {
    id: d.loanId ?? null,
    applicationNumber: d.applicationNumber ?? null,
    status: d.status ?? null,
    identifiers: d.identifiers ?? null,
    primaryBorrower: d.primaryBorrower ?? null,
    property,
    loanTerms,
    conditions,
    notes: Array.isArray(d.notes) ? d.notes : [],
    statusHistory,
    loanAgents: Array.isArray(d.loanAgents) ? d.loanAgents : [],
    closingInformation,
    purchaseCredits: Array.isArray(d.purchaseCredits) ? d.purchaseCredits : [],
    // Suite housing-expenses shape differs from the page's row table → empty this slice.
    housingExpenses: [],
    createdDate: d.createdAt ?? null,
    updatedDate: d.updatedAt ?? null,
  };
}

/**
 * Adapt one suite LoanSearchHit → the row shape LoanSearch renders + navigates with.
 * Renames loanNumber→applicationNumber, propertyCity→city, propertyState→state; carries
 * the suite UUID through as `id` so `/loan/{id}` lands on a valid suite dashboard.
 */
function adaptSuiteSearchHit(hit = {}) {
  return {
    id: hit.id,
    applicationNumber: hit.loanNumber ?? null,
    borrowerName: hit.borrowerName ?? null,
    city: hit.propertyCity ?? null,
    state: hit.propertyState ?? null,
    status: hit.status ?? null,
  };
}

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
   * msfg-suite re-point: now hits the suite my-loans endpoint
   * (GET /api/me/loans), which is role-scoped server-side (a borrower sees only
   * their own loans). The suite paged envelope is adapted to the page shape the
   * pipeline page already consumes. The legacy filter query string is forwarded
   * for forward-compat (page/size are honored; staff-only facets are ignored by
   * the suite endpoint this slice).
   *
   * @param {string} [queryString]
   * @returns {Promise<{ content: any[], totalElements: number, totalPages: number, page: number, size: number }>}
   */
  getApplications: async (queryString = '') => {
    const url = queryString ? `/me/loans?${queryString}` : '/me/loans';
    const { data } = await suiteClient.get(url);
    return adaptSuiteLoanList(data);
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
    // msfg-suite cutover: hit the suite typeahead so hits carry suite UUIDs (the
    // /loan/{id} dashboard now resolves suite UUIDs, not old numeric ids). The suite
    // wraps the list in an { success, data } envelope and uses LoanSearchHit field
    // names; adapt them to the row shape LoanSearch already renders.
    const { data } = await suiteClient.get(
      `/loans/search?${params.toString()}`,
      { signal: opts.signal },
    );
    const hits = unwrapEnvelope(data);
    return Array.isArray(hits) ? hits.map(adaptSuiteSearchHit) : [];
  },

  /**
   * Loan detail backing the borrower's detail view.
   *
   * msfg-suite re-point: now hits GET /api/loans/{id} (suite LoanSummaryResponse,
   * loan-access guarded server-side). The flat suite payload is reshaped into the
   * nested application object the detail page already consumes. Borrower-party data
   * is not on the suite loan summary this slice → borrowers is [].
   */
  getApplication: async (id) => {
    const { data } = await suiteClient.get(`/loans/${id}`);
    return adaptSuiteLoanDetail(data);
  },

  /**
   * Create the loan in suite from the funnel hand-off (the transition page calls this post-verify).
   * Hits the existing suite POST /api/loans/intake; idempotent on sourceLeadId; returns { loanId, loanNumber }.
   */
  createLoanFromIntake: async (intakeRequest) => {
    const { data } = await suiteClient.post('/loans/intake', intakeRequest);
    return (data && data.data) ? data.data : data;
  },

  updateApplication: async (id, applicationData) => {
    const { data } = await apiClient.put(`/loan-applications/${id}`, applicationData);
    return data;
  },

  /**
   * Invite a co-borrower to apply via a passwordless login link emailed by the suite
   * (system of record). Gated server-side to the PRIMARY borrower or staff/LO.
   *
   * The `ordinal` MUST be the suite party ordinal the borrower-self submit writes this
   * co-borrower's data to (its position among the DATA-bearing co-borrowers, 1-indexed) —
   * see the ordinal computation in BorrowerInformationStep. Sending the raw FE array index
   * would diverge the invite from the row the application data lands on.
   *
   * @param {string} suiteLoanId  The suite loan UUID (from sessionStorage 'suiteLoanId').
   * @param {{ ordinal: number, email: string, firstName: string, lastName: string }} invite
   * @returns {Promise<{ partyId: string, sent: boolean, link: string }>}  Unwrapped suite data.
   */
  inviteCoBorrower: async (suiteLoanId, { ordinal, email, firstName, lastName }) => {
    const { data } = await suiteClient.post(`/loans/${suiteLoanId}/co-borrowers/invite`, {
      ordinal, email, firstName, lastName,
    });
    return unwrapEnvelope(data);
  },

  /**
   * Accept a co-borrower invite after the invitee's passwordless login (the funnel reads the
   * token + loanId from the /continue URL fragment). The suite validates the signed token
   * (signature + expiry + token.loanId == path) and that the caller's VERIFIED email matches the
   * invited address, then binds the co-borrower party's user_id to the caller's Cognito sub.
   *
   * @param {string} loanId  The suite loan UUID (from the invite link `&loan=`).
   * @param {string} token   The opaque signed invite token (from the invite link `#invite=`).
   * @returns {Promise<{ loanId: string, partyId: string }>}  Unwrapped suite data.
   */
  acceptCoBorrowerInvite: async (loanId, token) => {
    const { data } = await suiteClient.post(`/loans/${loanId}/co-borrowers/accept-invite`, { token });
    return unwrapEnvelope(data);
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

  /**
   * Status timeline for the borrower portal's progress view.
   *
   * msfg-suite re-point: the suite has no historical status-timeline endpoint in
   * this slice. GET /api/loans/{id}/status/transitions returns the CURRENT status
   * plus the forward allowed-transition options (not a history). We synthesize a
   * single timeline entry from the current status so the detail timeline block
   * reflects where the loan is today. Returns [] on any failure (the component hides
   * the timeline when length === 0).
   */
  getStatusHistory: async (id) => {
    try {
      // The suite records a row per status change; this returns the real milestone timeline
      // ({ id, status, transitionedAt, ... }, oldest-first). Returns [] on any failure.
      const { data } = await suiteClient.get(`/loans/${id}/status/history`);
      const items = unwrapEnvelope(data);
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
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
    const { data } = await suiteClient.get('/me');
    return data;
  },

  getMyLoans: async () => {
    const { data } = await suiteClient.get('/me/loans');
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

  // ────────────────── Documents — BORROWER self into the suite (system of record) ──────────────────
  // The suite is the SoR: a borrower uploads/lists/downloads their OWN documents straight into it, so
  // staff processing/UW see them. Keyed by the suite loanId (a UUID); responses use the {success,data}
  // envelope. Uploads land unfiled (no type) for staff to categorize — keeps the client flow simple.

  getBorrowerDocuments: async (suiteLoanId) => {
    const { data } = await suiteClient.get(`/loans/${suiteLoanId}/borrower/documents`);
    const env = data?.data ?? data;
    const arr = Array.isArray(env) ? env : (env?.documents || []);
    return arr.map(adaptSuiteDocument);
  },

  getBorrowerDocumentDownloadUrl: async (suiteLoanId, documentId) => {
    const { data } = await suiteClient.get(`/loans/${suiteLoanId}/borrower/documents/${documentId}/download-url`);
    return data?.data ?? data; // { downloadUrl, expiresInSeconds }
  },

  /** Full borrower upload sequence into the suite (upload-url → PUT bytes to S3 → confirm). */
  uploadBorrowerDocument: async (suiteLoanId, file) => {
    const { data: slotEnv } = await suiteClient.post(`/loans/${suiteLoanId}/borrower/documents/upload-url`, {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    });
    const slot = slotEnv?.data ?? slotEnv; // { documentId, uploadUrl, ... }
    await mortgageService.uploadFileToS3(slot.uploadUrl, file);
    const { data: confEnv } = await suiteClient.put(
      `/loans/${suiteLoanId}/borrower/documents/${slot.documentId}/confirm`);
    return adaptSuiteDocument(confEnv?.data ?? confEnv);
  },

  // ────────────────── Documents — STAFF read-only view of the suite (system of record) ──────────────────
  // Staff document management now lives in the suite console; mortgage-app's staff view is read-only,
  // for visibility + quick download without leaving the loan detail page. Keyed by the suite loanId.

  /** Confirmed documents for a loan, newest first. Returns the unwrapped { count, documents }. */
  getStaffDocuments: async (suiteLoanId) => {
    const { data } = await suiteClient.get(`/loans/${suiteLoanId}/documents`);
    return unwrapEnvelope(data);
  },

  /** Returns a presigned GET URL for a staff-visible document. { downloadUrl, expiresInSeconds } */
  getStaffDocumentDownloadUrl: async (suiteLoanId, documentId) => {
    const { data } = await suiteClient.get(`/loans/${suiteLoanId}/documents/${documentId}/download-url`);
    return unwrapEnvelope(data);
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

// Named exports of the pure suite→FE adapters for unit testing. These are
// side-effect-free transforms (no HTTP) so they can be exercised directly.
export {
  adaptSuiteLoanList,
  adaptSuiteLoanDetail,
  adaptSuiteDashboard,
  adaptSuiteSearchHit,
  adaptSuiteDocument,
  unwrapEnvelope,
};

export default mortgageService;
