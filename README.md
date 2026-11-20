# P.T.A — Physical Therapy Assistant (Marketing Site)

Official product showcase and demo-booking platform for **P.T.A (Physical Therapy Assistant)**, integrated with **Concept 01 — Kinetic Spine** brand identity and deployed on Vercel at **[www.clinicmanger-pt.com](https://www.clinicmanger-pt.com)** (`saas-clinc.vercel.app`).

---

## Architecture & Connected Services

| Layer | Service | Details |
| :--- | :--- | :--- |
| **Frontend & Hosting** | **Vercel** (`clinic-app/` root directory) | Vite + React + TypeScript + Tailwind CSS v4 (Bilingual EN / AR RTL) |
| **Custom Domain & DNS** | **`clinicmanger-pt.com`** | Hosted on Vercel (`www.clinicmanger-pt.com`, root 308 redirect) |
| **Brand System** | **Concept 01 — Kinetic Spine** | `public/brand/` lockups & marks, `favicon.svg`, `favicon.ico`, `og-banner.png` (`1200x630`), Emerald `#059669` / Deep Pine `#0B2F24` |
| **Database & Backend** | **Supabase** (`revive-clinic`, `bsdumlzucnvmfnwlermm`) | Isolated `public.marketing_demo_requests` + `public.marketing_media_assets` tables with RLS enabled |
| **Serverless Lead API** | **Supabase Edge Function** (`submit-demo-request`) | Validates submissions, prevents spam/duplicates, stores leads with `service_role`, sends Resend emails |
| **Transactional Email** | **Resend** (`onboarding@clinicmanger-pt.com`) | Verified DKIM & DMARC on `clinicmanger-pt.com`; sends admin notification + bilingual prospect confirmation |
| **Media CDN** | **Cloudinary** (`dlhlrul7q`) | Responsive `f_auto,q_auto` image/video helper + optional dynamic slot overrides from `marketing_media_assets` |
| **Direct Sales / CTA** | **WhatsApp** (`01507881974`) | Instant pre-filled inquiry link (`wa.me/201507881974`) |

> All legacy Railway, Render, Neon Postgres, Electron desktop wrappers, and old multi-tenant portals were removed from this repository.

---

## Repository Structure

```text
├── clinic-app/                  # Vercel Root Directory (Advertising Web App)
│   ├── public/
│   │   ├── favicon.svg          # Concept 01 Kinetic Spine vector icon
│   │   ├── favicon.ico          # Multi-scale Windows/browser favicon
│   │   └── brand/               # Concept 01 lockups, marks, app icons, and og-banner.png
│   └── src/
│       ├── config/
│       │   ├── brand.ts         # Active P.T.A brand & contact configuration
│       │   └── cloudinary.ts    # Cloudinary f_auto/q_auto URL builders & media slots
│       ├── lib/supabase.ts      # Supabase client & Edge Function submission helper
│       ├── i18n/translations.ts # Complete English & Arabic RTL copy
│       └── components/          # Modular landing page sections & interactive mockups
└── supabase/
    ├── migrations/              # SQL schema for marketing_demo_requests & marketing_media_assets
    └── functions/
        └── submit-demo-request/ # Edge Function source deployed to Supabase
```

---

## Local Development

```bash
cd clinic-app
cp .env.example .env
npm install
npm run dev
```

### Frontend Environment Variables (`clinic-app/.env`)

- `VITE_SUPABASE_URL` — `https://bsdumlzucnvmfnwlermm.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable key (`sb_publishable_...`)
- `VITE_CLOUDINARY_CLOUD_NAME` — `dlhlrul7q`
- `VITE_WHATSAPP_NUMBER` — `201507881974`
- `VITE_SITE_URL` — `https://www.clinicmanger-pt.com`

### Supabase Edge Function Secrets (`bsdumlzucnvmfnwlermm`)

Set inside **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:
- `RESEND_API_KEY` — Your Resend API key
- `RESEND_FROM_EMAIL` *(optional)* — Defaults to `onboarding@clinicmanger-pt.com`
- `RESEND_FROM_NAME` *(optional)* — Defaults to `P.T.A — Physical Therapy Assistant`
- `LEAD_NOTIFY_EMAIL` *(optional)* — Defaults to `ziadweal55@gmail.com`

### Dynamic Media Slots (`public.marketing_media_assets`)

Optionally upload real product screenshots or showcase videos to Cloudinary (`dlhlrul7q`) and insert rows into `public.marketing_media_assets` using `slot_key` values: `hero_showcase`, `desktop_command`, `patient_portal`, `owner_mobile`, `ai_copilot`, `financial_hub`, `hero_video`.
