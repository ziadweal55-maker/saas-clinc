# Activate Patient Portal and Tenant Feedbacks

## TL;DR
We will activate the Patient Portal in the SaaS application by replacing its direct Supabase dependency with REST API endpoints on the multi-tenant Express backend (`clinic-api`). This will keep all patient exercise routines and check-in feedbacks isolated in each clinic's private database schema, eliminating Supabase dependency and costs.

---

## Objective
Enable a fully functional, tenant-isolated patient portal and feedback loop.
- Patients log in and submit check-ins on the patient portal web app.
- Clinicians view real-time feedbacks directly on the patient profile timeline in the main app.
- Data is stored in the respective tenant's database schema.

---

## Non-goals
- We will not modify the clinical features or exercises routing logic of the main app.
- We will not create separate public deployment targets; the patient portal will serve from the same domain/hosting layout using custom routing or environment settings.

---

## Discovery
- **Local App Feedbacks Query**: Local app used `window.api.getPatientFeedbacks` to query Supabase tables `paintests` and `patientlogs`.
- **SaaS Database Schema**: Database schemas are managed in `clinic-api/src/scripts/migrate.js` using tenant-scoped search paths.
- **Tenant Middleware**: `clinic-api/src/middlewares/tenant.js` automatically maps schemas using the `x-tenant-id` header.
- **Patient Portal Project**: Located in `clinic-app/patient-portal`, structured as a React-Vite project currently pointing to Supabase.

---

## Decisions
- **REST API over Supabase**: We will route all patient portal actions through the Express API.
- **New Tables in Schema**: Create `PatientPainTests` and `PatientLogs` tables in the tenant schema.
- **Automatic Migration**: Update the global migration script on startup to run tenant-scoped table generation for all registered tenants.
- **Tenant Context in URL**: The QR Code generation will pass the tenant ID (`?token={sync_token}&tenant={tenantId}`) so the patient portal knows which schema context to target.

---

## TODOs

### Wave 1: Schema Updates and Backend Endpoints
- [ ] **Task 1: Add Feedback Tables & Run Auto-Migrations**
  - **Files**:
    - [migrate.js](file:///home/zyad/saas-clinc/clinic-api/src/scripts/migrate.js)
  - **Details**:
    - Define `PatientPainTests` and `PatientLogs` inside `createTenantSchema()`.
    - Modify `createGlobalSchema()` to select all active tenant IDs from `public.tenants` and execute `createTenantSchema(tenant.id)` sequentially on startup to migrate existing clinics.
  - **Verification**: Restart the server and verify that the new tables are created in the active tenant schemas.
  - **Commit**: YES (feat: add patient feedbacks tables to tenant schema)

- [ ] **Task 2: Implement Patient Portal REST Endpoints**
  - **Files**:
    - [patientPortal.js](file:///home/zyad/saas-clinc/clinic-api/src/routes/patientPortal.js) (New File)
    - [server.js](file:///home/zyad/saas-clinc/clinic-api/src/server.js)
  - **Details**:
    - Create `routes/patientPortal.js` and mount it under `/api/v1/patient-portal` in `server.js` (after `tenantMiddleware`).
    - Endpoint `POST /login`: Receives `{ token, pin }`, queries `Clients` table for matching `sync_token` and `pin`, returns patient details.
    - Endpoint `GET /exercises`: Receives `x-patient-id` header, returns assigned home exercises from `ClientExercisesHome` joined with `Exercises` and `Doctors`.
    - Endpoint `POST /checkin`: Receives `x-patient-id` header, inserts record into `PatientLogs` and `PatientPainTests`.
  - **Commit**: YES (feat: add patient portal REST routes to API)

- [ ] **Task 3: Implement Feedbacks Retrieval Endpoint for Clinicians**
  - **Files**:
    - [clients.js](file:///home/zyad/saas-clinc/clinic-api/src/routes/clients.js)
  - **Details**:
    - Implement `GET /clients/:id/feedbacks` to retrieve unified logs from `PatientPainTests` and `PatientLogs` tables for a client.
  - **Commit**: YES (feat: add client feedbacks retrieval endpoint)

---

### Wave 2: Frontend Integrations
- [ ] **Task 4: Connect Main App Client Profile Feedbacks**
  - **Files**:
    - [apiBridge.ts](file:///home/zyad/saas-clinc/clinic-app/src/utils/apiBridge.ts)
  - **Details**:
    - Map `getPatientFeedbacks: (syncToken: string)` to call `GET /clients/:id/feedbacks` on the REST server. (Note: Since we fetch by client ID, we can update the signature/call to pass client ID or query by client ID).
  - **Commit**: YES (feat: connect main app feedbacks timeline to API)

- [ ] **Task 5: Refactor Patient Portal Web Project**
  - **Files**:
    - [api.ts](file:///home/zyad/saas-clinc/clinic-app/patient-portal/src/lib/api.ts) (New File replacing `supabase.ts`)
    - [PinEntry.tsx](file:///home/zyad/saas-clinc/clinic-app/patient-portal/src/components/PinEntry.tsx)
    - [ExerciseList.tsx](file:///home/zyad/saas-clinc/clinic-app/patient-portal/src/components/ExerciseList.tsx)
    - [DailyCheckIn.tsx](file:///home/zyad/saas-clinc/clinic-app/patient-portal/src/components/DailyCheckIn.tsx)
  - **Details**:
    - In `api.ts`, create a helper `fetchAPI(method, path, body)` that appends standard API URL, `x-tenant-id`, and client headers.
    - Replace Supabase database bindings in login, routine lists, and check-in forms with fetch calls to the new REST endpoints.
  - **Commit**: YES (feat: migrate patient portal from Supabase to REST API)

---

## Dependency Matrix

| Task | Depends on | Blocks | Can parallelize with |
|---|---|---|---|
| 1 | none | 2, 3 | none |
| 2 | 1 | 5 | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 3 | none | 5 |
| 5 | 2 | none | 4 |

---

## Final Verification Wave
- [ ] Boot Express API and check logs for successful migrations.
- [ ] Run clinical app, open a patient profile, click **"Sync Portal"**, and obtain the QR code URL.
- [ ] Extract the token and tenant from the QR code and test login on the patient portal with the correct PIN.
- [ ] Submit check-in feedback from the patient portal and verify it instantly updates the clinician's timeline in the main app.
- [ ] Run full project compilation check to ensure clean build.

Next: `start-work activate-patient-portal`
