# Clinic SaaS Conversion Plan (Supabase-Based)

## Current State
- Desktop Electron + React + Vite app with sql.js SQLite backend
- Feature-complete clinic system: clients, doctors, appointments, sessions, assessments, exercises, finance, attendance, patient portal
- Existing Supabase integration for patient portal (QR/PIN sync + Vercel deployment docs)
- Existing Supabase credentials already configured in `.env`
- Patient portal already scaffolded in `/patient-portal` and deployed docs exist

## What Needs To Happen
1. Supabase schema expansion for multi-tenant data (`tenants`, `branches`, `users` migration, RLS)
2. Replace Electron IPC/SQLite data path with Supabase client calls in renderer
3. Add tenant/branch context to queries
4. Replace hardcoded branding with tenant config-driven theme
5. Add subscription enforcement layer
6. Keep patient portal flow but route it through same Supabase tenant model

## Required User Actions
- Provide/confirm Supabase project access for schema changes
- Confirm tenant onboarding flow (self-serve vs manual)
- Provide Paymob merchant credentials when ready
- Confirm whether to keep Electron shell or move to pure web

## Implementation Steps
1. Audit existing Supabase tables and RLS policies
2. Add `tenants` + `branches` tables and RLS
3. Migrate auth from SQLite `Users` to Supabase Auth
4. Port Electron IPC handlers to Supabase calls
5. Build tenant-aware middleware in frontend
6. Add subscription checks before allowing tenant access
7. Deploy main clinic app and patient portal to Vercel
