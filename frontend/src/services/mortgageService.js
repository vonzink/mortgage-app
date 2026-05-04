import apiClient from './apiClient';

// Bare axios for the direct-to-S3 PUT only — that hits the presigned URL on
// AWS, not our backend, and must NOT carry our Authorization header.
import axios from 'axios';

// Pulls filename out of `attachment; filename="…"` headers; safe for blob downloads.
function parseFilename(disposition) {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
}

const mortgageService = {
  // ----- Loan applications -----
  createApplication: async (applicationData) => {
    try {
      const response = await apiClient.post('/loan-applications', applicationData);
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data);
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.response?.data ||
                          'Failed to create application';
      throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Request validation failed');
    }
  },

  getApplications: async () => {
    try {
      const response = await apiClient.get('/loan-applications');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch applications');
    }
  },

  getApplication: async (id) => {
    try {
      const response = await apiClient.get(`/loan-applications/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch application');
    }
  },

  updateApplication: async (id, applicationData) => {
    try {
      const response = await apiClient.put(`/loan-applications/${id}`, applicationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update application');
    }
  },

  aiReviewApplication: async (id) => {
    try {
      const response = await apiClient.post(`/loan-applications/${id}/ai-review`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'AI review failed');
    }
  },

  aiReviewPreview: async (applicationData) => {
    try {
      const response = await apiClient.post('/loan-applications/ai-review-preview', applicationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'AI review preview failed');
    }
  },

  deleteApplication: async (id) => {
    try {
      await apiClient.delete(`/loan-applications/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete application');
    }
  },

  // ----- MISMO export (backend-generated, gated by LoanAccessGuard) -----
  // variant: "closing" | "fnm"
  downloadMismoXml: async (applicationId, variant = 'closing') => {
    try {
      const resp = await apiClient.get(
        `/loan-applications/${applicationId}/export/mismo`,
        { params: { variant }, responseType: 'blob' }
      );
      const filename = parseFilename(resp.headers['content-disposition'])
        || `MISMO-3.4-${variant}-${applicationId}.xml`;
      const url = window.URL.createObjectURL(resp.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to download MISMO XML');
    }
  },

  // ----- Documents (3-step direct-to-S3 flow) -----
  uploadDocument: async (applicationId, documentType, file, options = {}) => {
    const { partyRole = 'borrower' } = options;
    try {
      const presignResp = await apiClient.post(
        `/loan-applications/${applicationId}/documents/upload-url`,
        {
          documentType,
          partyRole,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        }
      );
      const { docUuid, uploadUrl } = presignResp.data;

      // Direct-to-S3 PUT — must use bare axios so our backend's Authorization
      // header doesn't tag along (it would break the presigned signature).
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        transformRequest: [(data) => data],
      });

      const confirmResp = await apiClient.put(
        `/loan-applications/${applicationId}/documents/${docUuid}/confirm`
      );
      return confirmResp.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload document');
    }
  },

  getApplicationDocuments: async (applicationId) => {
    try {
      const response = await apiClient.get(`/loan-applications/${applicationId}/documents`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch documents');
    }
  },

  downloadDocument: async (applicationId, docUuid, fileName) => {
    try {
      const resp = await apiClient.get(
        `/loan-applications/${applicationId}/documents/${docUuid}/download-url`
      );
      const link = document.createElement('a');
      link.href = resp.data.downloadUrl;
      if (fileName) link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to download document');
    }
  },

  renameDocument: async (applicationId, docUuid, displayName) => {
    try {
      const resp = await apiClient.patch(
        `/loan-applications/${applicationId}/documents/${docUuid}`,
        { displayName }
      );
      return resp.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to rename document');
    }
  },

  deleteDocument: async (applicationId, docUuid) => {
    try {
      await apiClient.delete(`/loan-applications/${applicationId}/documents/${docUuid}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete document');
    }
  }
};

export default mortgageService;
