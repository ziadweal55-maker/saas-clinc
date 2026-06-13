import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TenantSettings {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  whatsapp_number: string | null;
  status: string;
}

interface TenantContextType {
  tenantSettings: TenantSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  changeTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Helper to convert HEX to HSL values used by Tailwind v4
function hexToHslValues(hex: string): string {
  // Default fallback if hex is invalid
  if (!hex || hex.length !== 7 || !hex.startsWith('#')) {
    return '160 84% 39%'; // Default green HSL
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTenantId = useCallback(() => {
    // 1. Resolve from subdomain/hostname first to enforce hostname-based routing
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        const parts = hostname.split('.');
        if (parts.length === 2 && parts[1] === 'localhost') {
          return parts[0];
        }
        if (parts.length >= 3) {
          const sub = parts[0];
          if (sub !== 'www' && sub !== 'api') {
            return sub;
          }
        }
      }
    }

    // 2. Do NOT default to localStorage or fallback if we are on the base domain (localhost/127.0.0.1)
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return null;
      }
    }

    let tenantId = localStorage.getItem('tenantId');
    if (tenantId) return tenantId;

    return 'revive';
  }, []);

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const tenantId = getTenantId();

    if (!tenantId) {
      setTenantSettings(null);
      setLoading(false);
      return;
    }

    try {
      const apiEndpoint = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL.replace('/api/v1', '')}/api/v1/global/settings`
        : 'http://127.0.0.1:3000/api/v1/global/settings';

      const response = await fetch(apiEndpoint, {
        headers: {
          'x-tenant-id': tenantId
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Tenant workspace '${tenantId}' does not exist.`);
        }
        throw new Error('Failed to fetch workspace branding settings.');
      }

      const data: TenantSettings = await response.json();
      setTenantSettings(data);

      // Apply primary color globally using HSL override
      if (data.primary_color) {
        const hslString = hexToHslValues(data.primary_color);
        document.documentElement.style.setProperty('--primary', hslString);
        // Also update the ring focus color matching the primary color
        document.documentElement.style.setProperty('--ring', hslString);
      }
    } catch (err: any) {
      console.error('[TenantProvider] Load Error:', err);
      setError(err.message || 'Error connecting to workspace.');
    } finally {
      setLoading(false);
    }
  }, [getTenantId]);

  const changeTenant = (newTenantId: string) => {
    localStorage.setItem('tenantId', newTenantId);
    refreshSettings();
  };

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    if (tenantSettings?.name) {
      document.title = tenantSettings.name;
    } else {
      document.title = 'Clinic Management';
    }
  }, [tenantSettings]);

  return (
    <TenantContext.Provider value={{ tenantSettings, loading, error, refreshSettings, changeTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
