-- Marketing Demo Requests & Cloudinary Media Assets for Revive P.T.A Advertising Site
-- Applied to Supabase project: bsdumlzucnvmfnwlermm (revive-clinic)

CREATE TABLE IF NOT EXISTS public.marketing_demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_whatsapp TEXT NOT NULL,
  branches_count TEXT NOT NULL DEFAULT '1',
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar')),
  interest_modules TEXT[] NOT NULL DEFAULT '{}',
  plan_tier TEXT,
  message TEXT,
  source_url TEXT,
  utm_source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'demo_scheduled', 'converted', 'archived')),
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_demo_requests_created_at
  ON public.marketing_demo_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_demo_requests_status
  ON public.marketing_demo_requests (status);

ALTER TABLE public.marketing_demo_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.marketing_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key TEXT UNIQUE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  cloudinary_public_id TEXT,
  external_url TEXT,
  alt_en TEXT,
  alt_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_media_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'marketing_media_assets'
      AND policyname = 'Public can read active marketing media'
  ) THEN
    CREATE POLICY "Public can read active marketing media"
      ON public.marketing_media_assets
      FOR SELECT
      TO anon, authenticated
      USING (is_active = TRUE);
  END IF;
END $$;
