import apiClient from './apiClient';

const adminService = {
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
