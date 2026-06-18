import axios from 'axios';

// TODO(security): Consider migrating to cookie-based auth (HttpOnly, Secure, SameSite=Lax)
// for production. Current localStorage token is acceptable for an internal admin SPA
// when served over HTTPS and behind network access controls.

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1/admin',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Clear state on auth failure — secure session lifecycle
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),

  // Stats
  getStats: () => api.get('/stats'),
  getAuditLogs: (params?: Record<string, unknown>) =>
    api.get('/audit-logs', { params }),

  // Tenants
  listTenants: (params?: Record<string, unknown>) =>
    api.get('/tenants', { params }),
  getTenant: (id: string) => api.get(`/tenants/${id}`),
  deleteTenant: (id: string) => api.delete(`/tenants/${id}`),
  approveTenant: (id: string) => api.post(`/tenants/${id}/approve`),
  rejectTenant: (id: string, reason: string) =>
    api.post(`/tenants/${id}/reject`, { reason }),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/tenants/${id}/status`, { status, reason }),
  updateFeatures: (id: string, features: Record<string, boolean>) =>
    api.patch(`/tenants/${id}/features`, { features }),
  getTenantUsage: (id: string) => api.get(`/tenants/${id}/usage`),
  getTenantHealth: (id: string) => api.get(`/tenants/${id}/health`),
  getTenantHistory: (id: string) => api.get(`/tenants/${id}/history`),
  impersonateTenant: (id: string) => api.post(`/tenants/${id}/impersonate`),
  getSubscription: (id: string) => api.get(`/tenants/${id}/subscription`),
  updateSubscription: (id: string, data: Record<string, unknown>) =>
    api.patch(`/tenants/${id}/subscription`, data),
  getExpiring: () => api.get('/tenants/expiring'),

  // Plans
  listPlans: () => api.get('/plans'),
  createPlan: (data: Record<string, unknown>) => api.post('/plans', data),
  updatePlan: (id: string, data: Record<string, unknown>) =>
    api.patch(`/plans/${id}`, data),

  // Announcements
  listAnnouncements: () => api.get('/announcements'),
  createAnnouncement: (data: Record<string, unknown>) =>
    api.post('/announcements', data),
  updateAnnouncement: (id: number, data: Record<string, unknown>) =>
    api.patch(`/announcements/${id}`, data),
  deleteAnnouncement: (id: number) => api.delete(`/announcements/${id}`),
};
