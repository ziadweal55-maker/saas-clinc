import { createClient } from '@supabase/supabase-js';
import type { MarketingMediaAsset } from '../config/cloudinary';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://bsdumlzucnvmfnwlermm.supabase.co';

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_9Bm6pHb8K5G7YwSuSR1PzQ_Ed-TNPB0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface DemoRequestPayload {
  clinicName: string;
  contactName: string;
  email: string;
  phoneWhatsapp: string;
  branchesCount: string;
  preferredLanguage: 'en' | 'ar';
  interestModules: string[];
  planTier?: string;
  message?: string;
  sourceUrl?: string;
  utmSource?: string;
  website?: string; // Honeypot field
}

export interface DemoSubmitResult {
  success: boolean;
  id?: string;
  emailSent?: boolean;
  error?: string;
}

export async function fetchMarketingMedia(): Promise<Record<string, MarketingMediaAsset>> {
  try {
    const { data, error } = await supabase
      .from('marketing_media_assets')
      .select('slot_key, media_type, cloudinary_public_id, external_url, alt_en, alt_ar')
      .eq('is_active', true);

    if (error || !data) {
      return {};
    }

    const mapped: Record<string, MarketingMediaAsset> = {};
    for (const row of data) {
      if (row && typeof row.slot_key === 'string') {
        mapped[row.slot_key] = row as MarketingMediaAsset;
      }
    }
    return mapped;
  } catch {
    return {};
  }
}

export async function submitDemoRequest(
  payload: DemoRequestPayload,
): Promise<DemoSubmitResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-demo-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    let data: Record<string, unknown> = {};
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      // Ignore parse errors on empty responses
    }

    if (!response.ok) {
      return {
        success: false,
        error:
          (typeof data.error === 'string' && data.error) ||
          'Unable to submit your request right now. Please try WhatsApp directly.',
      };
    }

    return {
      success: true,
      id: typeof data.id === 'string' ? data.id : undefined,
      emailSent: Boolean(data.emailSent),
    };
  } catch {
    return {
      success: false,
      error: 'Network error connecting to server. Please try again or reach us via WhatsApp.',
    };
  }
}
