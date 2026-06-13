# Design Spec: EVOLVE Home Exercise Portal (Hybrid Sync)

## 1. Overview
The Home Exercise Portal allows patients to securely access their prescribed exercise routines from their own devices. It bridges the local-first EVOLVE Suite (Electron) with a mobile-responsive web portal using Supabase as a secure sync layer.

## 2. Goals
- Provide patients with clear, video-guided instructions for home exercises.
- Enable patients to log session completion and daily pain levels.
- Alert clinicians to high-pain reports via the main administrative dashboard.
- Maintain clinical privacy by syncing only essential "public-safe" data.

## 3. Architecture
- **Admin App (Electron)**: The source of truth. Handles data entry, local storage (SQLite), and syncing to the cloud.
- **Sync Layer (Supabase)**: A lightweight PostgreSQL database and auth bridge.
  - `PatientPlans`: Stores exercise lists, instructions, and metadata.
  - `AccessControl`: Stores hashed PINs and unique `sync_tokens`.
  - `PatientLogs`: Stores completion status, pain levels (0-10), and timestamps.
- **Patient Portal (Web)**: A mobile-first React (Vite) application hosted on Vercel/Netlify.

## 4. Verification & Security
- **QR + PIN Method**:
  1. Clinician generates a QR code containing a unique `sync_token`.
  2. Patient scans the QR and is prompted for a 4-digit PIN (set by the clinician).
  3. PINs are salted and hashed before being stored in Supabase.
  4. Successful verification issues a JWT (JSON Web Token) saved to the patient's local storage.

## 5. User Experience (UX)
### Patient Portal
- **Daily Routine**: Simple list view showing exercises for the day.
- **Exercise Detail**: Auto-playing video (muted), clear sets/reps info, and a "Complete" button.
- **Daily Check-in**: A post-session modal asking "How was your pain today?" with a 0-10 scale.

### Admin App
- **Share Action**: A "Share with Patient" button in `ClientProfileView`.
- **Sync Status**: Visual feedback indicating if the cloud version is up-to-date.
- **Pain Monitoring**: Dashboard badges highlight patients who reported pain ≥ 7/10.

## 6. Implementation Plan (High Level)
1. **Infrastructure**: Setup Supabase tables and security policies.
2. **Admin Integration**: Add `supabase-js` to Electron and implement the sync service.
3. **Portal Development**: Build the mobile-responsive web app with PIN verification.
4. **Closing the Loop**: Implement the background fetch in Electron to pull pain logs and show alerts.

## 7. Testing Strategy
- **Security**: Verify that a wrong PIN denies access to the `sync_token`.
- **Data Integrity**: Ensure local edits in the Admin app update the portal after sync.
- **Alerting**: Trigger a mock 8/10 pain report and verify the dashboard badge appears in the Admin app.
