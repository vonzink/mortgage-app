import apiClient from './apiClient';

const auditService = {
  /** Audit trail for an entire loan (LO/Admin). Paginated. */
  getLoanAuditLog: async (loanId, { entityType, action, page = 0, size = 50 } = {}) => {
    const params = { page, size };
    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    const { data } = await apiClient.get(`/loan-applications/${loanId}/audit-log`, { params });
    return data;
  },

  /** Audit trail for a single document, oldest → newest. */
  getDocumentHistory: async (loanId, docUuid) => {
    const { data } = await apiClient.get(
      `/loan-applications/${loanId}/documents/${docUuid}/history`,
    );
    return data;
  },
};

export default auditService;
