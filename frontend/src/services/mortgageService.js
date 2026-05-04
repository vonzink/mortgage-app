import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const mortgageService = {
  // Create a new mortgage application
  createApplication: async (applicationData) => {
    try {
      console.log('[DEBUG] Sending application data:', JSON.stringify(applicationData, null, 2));
      const response = await axios.post(`${API_BASE_URL}/loan-applications`, applicationData);
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data);
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
      if (error.response?.data?.fieldErrors) {
        console.error('Field validation errors:', error.response.data.fieldErrors);
      }
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.response?.data || 
                          'Failed to create application';
      throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Request validation failed');
    }
  },

  // Get all applications for the current user
  getApplications: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/loan-applications`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch applications');
    }
  },

  // Get a specific application by ID
  getApplication: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/loan-applications/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch application');
    }
  },

  // Update an existing application
  updateApplication: async (id, applicationData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/loan-applications/${id}`, applicationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update application');
    }
  },

  // AI review of an application (by saved ID)
  aiReviewApplication: async (id) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/loan-applications/${id}/ai-review`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'AI review failed');
    }
  },

  // AI review preview (without saving application)
  aiReviewPreview: async (applicationData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/loan-applications/ai-review-preview`, applicationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'AI review preview failed');
    }
  },

  // Delete an application
  deleteApplication: async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/loan-applications/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete application');
    }
  },

  // User authentication methods (for future implementation)
  login: async (credentials) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  register: async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  logout: async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Logout failed');
    }
  },

  // Document management — 3-step direct-to-S3 flow
  // 1) backend issues a presigned PUT URL
  // 2) browser PUTs the file straight to S3
  // 3) backend HEADs the object, applies tags, flips status to `uploaded`
  uploadDocument: async (applicationId, documentType, file, options = {}) => {
    const { partyRole = 'borrower' } = options;
    try {
      const presignResp = await axios.post(
        `${API_BASE_URL}/loan-applications/${applicationId}/documents/upload-url`,
        {
          documentType,
          partyRole,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        }
      );
      const { docUuid, uploadUrl } = presignResp.data;

      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        transformRequest: [(data) => data],
      });

      const confirmResp = await axios.put(
        `${API_BASE_URL}/loan-applications/${applicationId}/documents/${docUuid}/confirm`
      );
      return confirmResp.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload document');
    }
  },

  getApplicationDocuments: async (applicationId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/loan-applications/${applicationId}/documents`
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch documents');
    }
  },

  downloadDocument: async (applicationId, docUuid, fileName) => {
    try {
      const resp = await axios.get(
        `${API_BASE_URL}/loan-applications/${applicationId}/documents/${docUuid}/download-url`
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
      const resp = await axios.patch(
        `${API_BASE_URL}/loan-applications/${applicationId}/documents/${docUuid}`,
        { displayName }
      );
      return resp.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to rename document');
    }
  },

  deleteDocument: async (applicationId, docUuid) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/loan-applications/${applicationId}/documents/${docUuid}`
      );
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete document');
    }
  }
};

export default mortgageService;