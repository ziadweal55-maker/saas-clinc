const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window === 'undefined') {
    return '/api/v1';
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3000/api/v1';
  }
  
  // Dynamically resolve base API domain from hostname
  // Example: portal.clinicmanger-pt.com -> api.clinicmanger-pt.com
  const hostParts = window.location.hostname.split('.');
  if (hostParts.length >= 2) {
    const baseDomain = hostParts.slice(-2).join('.');
    return `https://api.${baseDomain}/api/v1`;
  }
  
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

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
