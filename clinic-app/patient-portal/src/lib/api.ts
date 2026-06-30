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
  
  // Dynamically resolve base API domain from hostname if on the main app domain
  const hostParts = window.location.hostname.split('.');
  if (hostParts.length >= 2) {
    const baseDomain = hostParts.slice(-2).join('.');
    if (baseDomain.includes('clinicmanger-pt') || baseDomain.includes('clinicmanager-pt')) {
      return `https://api.${baseDomain}/api/v1`;
    }
  }
  
  // Default production API endpoint fallback
  return 'https://api.clinicmanger-pt.com/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export const getTenantId = () => {
  if (typeof window !== 'undefined' && window.location) {
    // 1. Check URL query parameters (highest priority for QR code scans)
    const params = new URLSearchParams(window.location.search);
    const queryTenant = params.get('tenant');
    if (queryTenant) {
      localStorage.setItem('tenantId', queryTenant);
      return queryTenant;
    }

    // 2. Extract from subdomain (e.g. tenant-id.portal.com)
    const hostParts = window.location.hostname.split('.');
    if (hostParts.length >= 3) {
      const firstSub = hostParts[0];
      if (firstSub !== 'www' && firstSub !== 'localhost' && firstSub !== 'api') {
        localStorage.setItem('tenantId', firstSub);
        return firstSub;
      }
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
