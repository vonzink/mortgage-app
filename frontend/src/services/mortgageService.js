import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const mortgageService = {
  // Create a new mortgage application
  createApplication: async (applicationData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/loan-applications`, applicationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create application');
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
  }
};

export default mortgageService;