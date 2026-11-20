/**
 * Brand & Contact Configuration (Concept 01 — Kinetic Spine)
 */

const rawWhatsApp = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || '201507881974';
const normalizedWhatsApp = rawWhatsApp.replace(/[^\d]/g, '') || '201507881974';

export const BRAND = {
  nameEn: 'P.T.A',
  nameAr: 'منظومة P.T.A',
  wordmark: 'P.T.A',
  subtitleEn: 'PHYSICAL THERAPY ASSISTANT',
  subtitleAr: 'منظومة إدارة عيادات العلاج الطبيعي',
  versionBadge: 'v3.9',
  logoMarkUrl: '/brand/icon-squircle-emerald.svg',
  logoHorizontalLightUrl: '/brand/logo-horizontal-light.png',
  logoHorizontalDarkUrl: '/brand/logo-horizontal-dark.png',
  ogImageUrl: 'https://www.clinicmanger-pt.com/brand/og-banner.png',
  whatsappNumber: normalizedWhatsApp,
  whatsappDisplay: '01507881974',
  supportEmail: 'onboarding@clinicmanger-pt.com',
  siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://www.clinicmanger-pt.com',
  colors: {
    primaryEmerald: '#059669',
    smartMint: '#10B981',
    deepPine: '#0B2F24',
    deepPineDark: '#071F18',
    mintCanvas: '#F4F7F6',
    mintSurface: '#ECFDF5',
    mintBorder: '#D1FAE5',
  },
} as const;

export function getWhatsAppUrl(prefillMessage: string): string {
  const encoded = encodeURIComponent(prefillMessage);
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encoded}`;
}
