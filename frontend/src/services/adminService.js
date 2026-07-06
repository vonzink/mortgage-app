import apiClient from './apiClient';

const adminService = {
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
