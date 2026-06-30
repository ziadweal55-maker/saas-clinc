const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://127.0.0.1:3000/api/v1' : '/api/v1');

export const getTenantId = () => {
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    const queryTenant = params.get('tenant');
    if (queryTenant) {
      localStorage.setItem('tenantId', queryTenant);
      return queryTenant;
    }
  }
  return localStorage.getItem('tenantId');
};

export const request = async (method: string, path: string, body?: any) => {
  const tenantId = getTenantId();
  const patientId = localStorage.getItem('patientId');
  const syncToken = localStorage.getItem('syncToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (patientId) headers['x-patient-id'] = patientId;
  if (syncToken) headers['x-sync-token'] = syncToken;

  const config: RequestInit = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || response.statusText);
  }

  return data;
};
