# Home Exercise Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, cloud-synced home exercise portal for patients with pain-level alerting for clinicians.

**Architecture:** A bridge architecture connecting a local Electron app (SQLite) to a mobile web portal (React) via Supabase.

**Tech Stack:** Electron, React, Supabase, SQLite, Lucide-React.

---

### Task 1: Infrastructure & Core Sync Service

**Files:**
- Create: `electron/sync.js`
- Modify: `.env`, `package.json`, `electron/main.js`

- [ ] **Step 1: Install dependencies**
Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Configure Environment**
Add these to `.env`:
```
SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

- [ ] **Step 3: Create the Sync Service**
Create `electron/sync.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function syncPatientPlan(patientData, exercises) {
  // 1. Upsert Access Control
  const { data: access, error: accessErr } = await supabase
    .from('AccessControl')
    .upsert({ 
      patient_id: patientData.id, 
      sync_token: patientData.sync_token,
      pin_hash: patientData.pin_hash // Hashed PIN
    });

  // 2. Upsert Patient Plan
  const { data: plan, error: planErr } = await supabase
    .from('PatientPlans')
    .upsert({
      patient_id: patientData.id,
      first_name: patientData.first_name,
      exercises: exercises,
      last_synced: new Date().toISOString()
    });

  return { success: !accessErr && !planErr, error: accessErr || planErr };
}

module.exports = { syncPatientPlan };
```

- [ ] **Step 4: Register IPC Handler**
In `electron/main.js`, import `syncPatientPlan` and add handler:
```javascript
const { syncPatientPlan } = require('./sync');

ipcMain.handle('push-patient-plan', async (event, { patientData, exercises }) => {
  return await syncPatientPlan(patientData, exercises);
});
```

- [ ] **Step 5: Commit**
`git add . && git commit -m "feat: core sync infrastructure"`

---

### Task 2: Admin App Integration (Share Action)

**Files:**
- Modify: `src/views/ClientProfileView.tsx`, `electron/preload.js`

- [ ] **Step 1: Expose API in preload**
In `electron/preload.js`:
```javascript
pushPatientPlan: (data) => ipcRenderer.invoke('push-patient-plan', data),
```

- [ ] **Step 2: Add "Share" UI to ClientProfileView**
In `src/views/ClientProfileView.tsx`, add state and button:
```typescript
const [isSyncing, setIsSyncing] = useState(false);

const handleShareWithPatient = async () => {
  setIsSyncing(true);
  const patientData = { 
    id: client.id, 
    first_name: client.first_name,
    sync_token: Math.random().toString(36).substring(7), // Simple token for now
    pin_hash: '1234' // Placeholder for hashed PIN logic
  };
  const res = await window.api.pushPatientPlan({ patientData, exercises: [] }); // exercises to be fetched
  setIsSyncing(false);
  if (res.success) alert('Portal updated successfully.');
};
```
Add the button next to "Archive Profile" or in the header.

- [ ] **Step 3: Commit**
`git add . && git commit -m "feat: admin share button UI"`

---

### Task 3: Patient Portal - Auth & Portal Shell

**Files:**
- Create: `patient-portal/` (directory), `patient-portal/src/lib/supabase.ts`, `patient-portal/src/components/PinEntry.tsx`

- [ ] **Step 1: Scaffold Vite project**
Run: `npm create vite@latest patient-portal -- --template react-ts`
Run: `cd patient-portal && npm install @supabase/supabase-js lucide-react`

- [ ] **Step 2: Configure Supabase in Portal**
Create `patient-portal/src/lib/supabase.ts` with same env config as Task 1.

- [ ] **Step 3: Build PIN Entry Component**
Implement `PinEntry.tsx` that takes a `token` from URL and validates PIN against `AccessControl` table.

- [ ] **Step 4: Commit**
`git add patient-portal && git commit -m "feat: patient portal shell and auth"`

---

### Task 4: Patient Portal - List & Logger

**Files:**
- Create: `patient-portal/src/components/ExerciseList.tsx`, `patient-portal/src/components/DailyCheckIn.tsx`

- [ ] **Step 1: Display Exercises**
Create `ExerciseList.tsx` to fetch `PatientPlans` filtered by `patient_id`. Map over exercises and show cards with Lucide icons.

- [ ] **Step 2: Build Pain Logger**
Create `DailyCheckIn.tsx` with a 0-10 scale. On submit, insert row into `PatientLogs` table in Supabase.

- [ ] **Step 3: Commit**
`git add . && git commit -m "feat: patient routine list and pain logger"`

---

### Task 5: Clinical Alerts (Dashboard)

**Files:**
- Modify: `electron/main.js`, `src/views/DashboardView.tsx`

- [ ] **Step 1: Fetch Logs in Main**
In `electron/main.js`, add background task to fetch `PatientLogs` where `pain_level >= 7`.

- [ ] **Step 2: Display Alerts in Dashboard**
In `src/views/DashboardView.tsx`, fetch these alerts and show a "High Pain Alert" card or badge in the "System Utilities" or a new section.

- [ ] **Step 3: Final Verification & Commit**
Verify end-to-end sync.
`git add . && git commit -m "feat: high-pain alerts loop closed"`
