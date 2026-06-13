# Patient Portal - Auth & Portal Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Patient Portal (Web) and build the PIN verification logic.

**Architecture:** A React-TS Vite application using Supabase for backend interactions. PIN verification is handled by querying the `AccessControl` table.

**Tech Stack:** React, TypeScript, Vite, Supabase JS, Lucide React.

---

### Task 1: Scaffold Vite Project

**Files:**
- Create: `patient-portal/`

- [ ] **Step 1: Run Vite scaffold command**
Run: `npm create vite@latest patient-portal -- --template react-ts --yes` in `/home/zyad/clinic-app/.worktrees/feat-home-exercise-portal`

- [ ] **Step 2: Install dependencies**
Run: `cd patient-portal && npm install @supabase/supabase-js lucide-react`

- [ ] **Step 3: Verify scaffold**
Run: `ls -F patient-portal/`
Expected: `src/`, `public/`, `package.json`, etc.

### Task 2: Configure Supabase Client

**Files:**
- Create: `patient-portal/src/lib/supabase.ts`

- [ ] **Step 1: Create Supabase initialization file**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Verify file creation**
Run: `cat patient-portal/src/lib/supabase.ts`

### Task 3: Build PIN Entry Component

**Files:**
- Create: `patient-portal/src/components/PinEntry.tsx`

- [ ] **Step 1: Implement PinEntry component**

```tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Loader2 } from 'lucide-react';

interface PinEntryProps {
  onSuccess: (patientId: string, token: string) => void;
}

export const PinEntry: React.FC<PinEntryProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing access token');
      return;
    }
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('AccessControl')
        .select('patient_id, pin')
        .eq('sync_token', token)
        .single();

      if (supabaseError || !data) {
        setError('Invalid access token');
        return;
      }

      if (data.pin !== pin) {
        setError('Incorrect PIN');
        return;
      }

      localStorage.setItem('patient_id', data.patient_id);
      localStorage.setItem('sync_token', token);
      onSuccess(data.patient_id, token);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="text-red-500">Error: No access token provided.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 mb-4 bg-blue-100 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
          <p className="text-gray-500">Enter your 4-digit PIN to access your exercises</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 text-3xl text-center tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="0000"
              required
            />
          </div>

          {error && <p className="text-sm text-center text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full py-3 text-white bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify PIN'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

### Task 4: Update App Shell

**Files:**
- Modify: `patient-portal/src/App.tsx`

- [ ] **Step 1: Update App.tsx to use PinEntry**

```tsx
import { useState, useEffect } from 'react'
import { PinEntry } from './components/PinEntry'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)

  useEffect(() => {
    const storedPatientId = localStorage.getItem('patient_id')
    const storedToken = localStorage.getItem('sync_token')
    
    if (storedPatientId && storedToken) {
      setPatientId(storedPatientId)
      setIsAuthenticated(true)
    }
  }, [])

  const handleAuthSuccess = (id: string) => {
    setPatientId(id)
    setIsAuthenticated(true)
  }

  if (!isAuthenticated) {
    return <PinEntry onSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-gray-900">EVOLVE Home Exercise Portal</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Welcome back! Your exercise programs will appear here.</p>
          <p className="text-sm text-gray-400 mt-2">Patient ID: {patientId}</p>
        </div>
      </main>
    </div>
  )
}

export default App
```

### Task 5: Verification & Commit

- [ ] **Step 1: Build check**
Run: `cd patient-portal && npm run build`

- [ ] **Step 2: Commit changes**
Run: `git add patient-portal && git commit -m "feat: patient portal shell and auth"`
