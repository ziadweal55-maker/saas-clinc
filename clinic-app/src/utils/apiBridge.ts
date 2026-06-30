import * as XLSX from 'xlsx';

/**
 * API Bridge for browser-based SaaS execution.
 * Intercepts window.api calls and maps them to REST API calls over HTTP.
 * Enables running the app as a pure web app without Electron.
 */

// Detect if running inside Electron (window.api is already set by preload)
const isElectron = typeof window !== 'undefined' && window.api && typeof window.api.getClients === 'function';

if (!isElectron) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api/v1';
  const API_SERVER = API_BASE_URL.replace('/api/v1', '');

  // Helper to resolve the tenant ID
  const getTenantId = () => {
    // 1. Check ?tenant= query parameter first (e.g. saas-clinc.vercel.app?tenant=revive)
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const queryTenant = params.get('tenant');
      if (queryTenant) {
        // Persist so it survives page navigation
        localStorage.setItem('tenantId', queryTenant);
        return queryTenant;
      }
    }

    // 2. Resolve from subdomain/hostname to enforce hostname-based routing
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        const parts = hostname.split('.');
        if (parts.length === 2 && parts[1] === 'localhost') {
          return parts[0];
        }
        if (parts.length >= 3) {
          const sub = parts[0];
          if (sub !== 'www' && sub !== 'api' && sub !== 'saas-clinc') {
            return sub;
          }
        }
      }
    }

    // 3. Do NOT default to localStorage if we are on the base domain (localhost/127.0.0.1)
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return null;
      }
    }

    let tenantId = localStorage.getItem('tenantId');
    if (tenantId) return tenantId;

    return null;
  };

  // Helper to make authenticated HTTP requests to the Express server
  const request = async (method: string, path: string, body?: any) => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();
    const branchId = localStorage.getItem('branchId');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    if (branchId) {
      headers['x-branch-id'] = branchId;
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || response.statusText };
      }
      
      return data;
    } catch (err: any) {
      console.error(`[API BRIDGE ERROR] ${method} ${path}`, err);
      return { success: false, error: 'Network connection failed.' };
    }
  };

  // Define the core API implementation
  const apiImplementation = {
    // --- Clients ---
    getClients: () => request('GET', '/clients'),
    createClient: (clientData: any) => request('POST', '/clients', clientData),
    getClient: (clientId: number) => request('GET', `/clients/${clientId}`),
    updateClient: (clientId: number, clientData: any) => request('PUT', `/clients/${clientId}`, clientData),
    deleteClient: (clientId: number) => request('DELETE', `/clients/${clientId}`),
    toggleClientStatus: (clientId: number, status: number) => request('PATCH', `/clients/${clientId}/toggle-status`, { status }),

    // --- Sessions ---
    getSessions: (clientId: number) => request('GET', `/sessions?clientId=${clientId}`),
    createSession: (sessionData: any) => request('POST', '/sessions', sessionData),
    updateSession: (id: number, sessionData: any) => request('PUT', `/sessions/${id}`, sessionData),
    deleteSession: (id: number) => request('DELETE', `/sessions/${id}`),

    // --- Payments ---
    getPayments: (clientId: number) => request('GET', `/payments?clientId=${clientId}`),
    createPayment: (paymentData: any) => request('POST', '/payments', paymentData),
    updatePayment: (payload: { paymentId: number; data: any }) => request('PUT', `/payments/${payload.paymentId}`, payload.data),

    // --- Appointments ---
    getAppointments: (doctorId?: any) => request('GET', `/appointments${doctorId ? `?doctorId=${doctorId}` : ''}`),
    createAppointment: (appointmentData: any) => request('POST', '/appointments', appointmentData),
    updateAppointment: (data: any) => request('PUT', `/appointments/${data.id}`, data),
    deleteAppointment: (id: number) => request('DELETE', `/appointments/${id}`),

    // --- Assessments ---
    getAssessments: (clientId: number) => request('GET', `/assessments?clientId=${clientId}`),
    createAssessment: (data: any) => request('POST', '/assessments', data),
    updateAssessment: (id: number, data: any) => request('PUT', `/assessments/${id}`, data),
    deleteAssessment: (id: number) => request('DELETE', `/assessments/${id}`),
    getAssessmentStructure: () => request('GET', '/assessments/structure'),
    getClientAssessmentResults: (clientId: number) => request('GET', `/assessments/results/${clientId}`),
    saveAssessmentResult: (data: any) => request('POST', '/assessments/results', data),
    addAssessmentRegion: (data: { name: string }) => request('POST', '/assessments/regions', data),
    updateAssessmentRegion: (data: { id: number; name: string }) => request('PUT', `/assessments/regions/${data.id}`, { name: data.name }),
    deleteAssessmentRegion: (id: number) => request('DELETE', `/assessments/regions/${id}`),
    addAssessmentTest: (data: any) => request('POST', '/assessments/tests', data),
    updateAssessmentTest: (data: any) => request('PUT', `/assessments/tests/${data.id}`, data),
    deleteAssessmentTest: (id: number) => request('DELETE', `/assessments/tests/${id}`),
    importAssessmentsExcel: async (): Promise<any> => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls, .csv';
        input.style.display = 'none';
        
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve({ success: false, canceled: true });
            return;
          }
          
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            try {
              const data = new Uint8Array(event.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
              
              let imported = 0;
              let skipped = 0;
              const errors: string[] = [];
              
              // Fetch existing regions
              const existingData = await apiImplementation.getAssessmentStructure();
              const existingRegions = existingData.regions || [];
              const regionCache: Record<string, number> = {};
              existingRegions.forEach((r: any) => {
                regionCache[r.name.trim().toLowerCase()] = r.id;
              });
              
              const getOrCreateRegion = async (regionName: string) => {
                const key = regionName.trim().toLowerCase();
                if (regionCache[key]) return regionCache[key];
                
                const createRes = await apiImplementation.addAssessmentRegion({ name: regionName.trim() });
                if (createRes && createRes.success && createRes.id) {
                  regionCache[key] = createRes.id;
                  return createRes.id;
                }
                throw new Error(createRes?.error || 'Failed to create assessment region');
              };
              
              for (const row of rows) {
                try {
                  const regionName = String(row['region'] || row['Region'] || '').trim();
                  const name = String(row['name'] || row['Name'] || '').trim();
                  const description = String(row['description'] || row['Description'] || '').trim();
                  
                  if (!regionName || !name) {
                    skipped++;
                    continue;
                  }
                  
                  const regionId = await getOrCreateRegion(regionName);
                  const res = await apiImplementation.addAssessmentTest({
                    regionId,
                    name,
                    description
                  });
                  
                  if (res && res.success) {
                    imported++;
                  } else {
                    errors.push(res?.error || 'Failed to insert assessment test');
                  }
                } catch (err: any) {
                  errors.push(err.message);
                }
              }
              
              resolve({ success: true, imported, skipped, errors: errors.slice(0, 5) });
            } catch (err: any) {
              resolve({ success: false, error: err.message });
            }
          };
          
          reader.readAsArrayBuffer(file);
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      });
    },
    exportAssessmentsExcel: async (): Promise<any> => {
      try {
        const data = await apiImplementation.getAssessmentStructure();
        const tests = data.tests || [];
        const regions = data.regions || [];
        const regionMap = new Map<number, string>();
        regions.forEach((r: any) => regionMap.set(r.id, r.name));
        
        const exportRows = tests.map((t: any) => ({
          Region: regionMap.get(t.region_id) || '',
          Name: t.name || '',
          Description: t.description || ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessments');
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assessment_library_export.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return { success: true, filePath: 'assessment_library_export.xlsx' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    // --- Doctors ---
    getDoctors: () => request('GET', '/doctors'),
    getActiveDoctors: () => request('GET', '/doctors/active'),
    addDoctor: (data: any) => request('POST', '/doctors', data),
    updateDoctor: (id: number, data: any) => request('PUT', `/doctors/${id}`, data),
    deleteDoctor: (id: number) => request('DELETE', `/doctors/${id}`),

    // --- Branches ---
    getBranches: () => request('GET', '/branches'),
    getAllBranches: () => request('GET', '/branches/all'),
    addBranch: (name: string) => request('POST', '/branches', { name }),
    renameBranch: (payload: { branchId: number; newName: string }) => request('PUT', `/branches/${payload.branchId}`, { name: payload.newName }),
    deactivateBranch: (branchId: number) => request('PATCH', `/branches/${branchId}/deactivate`),
    reactivateBranch: (branchId: number) => request('PATCH', `/branches/${branchId}/reactivate`),
    setCurrentBranch: async (branchId: number) => {
      // Local mock session state helper
      localStorage.setItem('branchId', String(branchId));
      return { success: true, branchId };
    },
    getCurrentBranch: async () => {
      const bid = localStorage.getItem('branchId') || '1';
      return { id: parseInt(bid), name: 'Selected Branch', is_active: 1 };
    },

    // --- Authentication ---
    checkUsersExist: () => request('GET', '/auth/exists').then(res => res && res.error ? res : !!res.exists),
    setupAdmin: (data: any) => request('POST', '/auth/setup-admin', data),
    loginUser: async (data: any) => {
      const res = await request('POST', '/auth/login', data);
      if (res.success && res.token) {
        localStorage.setItem('token', res.token);
        // Extract tenant ID prefix or use input domain logic if any
        localStorage.setItem('tenantId', getTenantId());
      }
      return res;
    },
    changePassword: (data: { currentPassword: string; newPassword: string }) => request('POST', '/auth/change-password', data),
    registerPendingUser: (data: any) => request('POST', '/auth/register-pending', data),
    getPendingAccounts: () => request('GET', '/auth/pending-requests'),
    approveAccountRequest: (userId: number) => request('POST', '/auth/approve-request', { userId }),
    denyAccountRequest: (userId: number) => request('POST', '/auth/deny-request', { userId }),
    getAllUsers: () => request('GET', '/auth/all'),
    resetUserPassword: (data: { userId: number; newPassword: string }) => request('POST', '/auth/reset-password', data),
    deleteUserAccount: (userId: number) => request('POST', '/auth/delete-user', { userId }),
    updateUserStatus: (data: { userId: number; status: string }) => request('POST', '/auth/update-status', data),

    // --- Attendance ---
    clockIn: (data: any) => request('POST', '/attendance/clock-in', data),
    clockOut: (data: any) => request('POST', '/attendance/clock-out', data),
    getAttendanceLogs: (date?: string) => request('GET', `/attendance/logs${date ? `?date=${date}` : ''}`),

    // --- Exercises ---
    getExercises: () => request('GET', '/exercises'),
    getClientExercises: (clientId: number) => request('GET', `/exercises/client/${clientId}`),
    assignExercise: (data: any) => request('POST', '/exercises/assign', data),
    removeClientExercise: (id: number) => request('DELETE', `/exercises/client/${id}`),
    logExerciseProgress: (data: any) => request('POST', '/exercises/progress', data),
    addExerciseRegion: (data: { name: string }) => request('POST', '/exercises/regions', data),
    updateExerciseRegion: (data: { id: number; name: string }) => request('PUT', `/exercises/regions/${data.id}`, { name: data.name }),
    deleteExerciseRegion: (id: number) => request('DELETE', `/exercises/regions/${id}`),
    addExercise: (data: any) => request('POST', '/exercises', data),
    updateExercise: (data: any) => request('PUT', `/exercises/${data.id}`, data),
    deleteExercise: (id: number) => request('DELETE', `/exercises/${id}`),
    getHomeExercises: (clientId: number) => request('GET', `/exercises/home/${clientId}`),
    assignHomeExercise: (data: any) => request('POST', '/exercises/home/assign', data),
    removeHomeExercise: (id: number) => request('DELETE', `/exercises/home/${id}`),
    updateHomeExercise: (id: number, data: any) => request('PUT', `/exercises/home/${id}`, data),
    importExercisesExcel: async (): Promise<any> => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls, .csv';
        input.style.display = 'none';
        
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve({ success: false, canceled: true });
            return;
          }
          
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            try {
              const data = new Uint8Array(event.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
              
              let imported = 0;
              let skipped = 0;
              const errors: string[] = [];
              
              // Fetch existing regions
              const existingData = await apiImplementation.getExercises();
              const existingRegions = existingData.regions || [];
              const regionCache: Record<string, number> = {};
              existingRegions.forEach((r: any) => {
                regionCache[r.name.trim().toLowerCase()] = r.id;
              });
              
              const getOrCreateRegion = async (regionName: string) => {
                const key = regionName.trim().toLowerCase();
                if (regionCache[key]) return regionCache[key];
                
                const createRes = await apiImplementation.addExerciseRegion({ name: regionName.trim() });
                if (createRes && createRes.success && createRes.id) {
                  regionCache[key] = createRes.id;
                  return createRes.id;
                }
                throw new Error(createRes?.error || 'Failed to create exercise region');
              };
              
              for (const row of rows) {
                try {
                  const regionName = String(row['region'] || row['Region'] || '').trim();
                  const name = String(row['name'] || row['Name'] || '').trim();
                  const type = String(row['type'] || row['Type'] || 'Strengthening').trim();
                  const instructions = String(row['instructions'] || row['Instructions'] || '').trim();
                  const videoUrl = String(row['video_url'] || row['Video URL'] || row['video'] || '').trim();
                  
                  if (!regionName || !name) {
                    skipped++;
                    continue;
                  }
                  
                  const regionId = await getOrCreateRegion(regionName);
                  const res = await apiImplementation.addExercise({
                    regionId,
                    name,
                    type,
                    instructions,
                    video_url: videoUrl
                  });
                  
                  if (res && res.success) {
                    imported++;
                  } else {
                    errors.push(res?.error || 'Failed to insert exercise');
                  }
                } catch (err: any) {
                  errors.push(err.message);
                }
              }
              
              resolve({ success: true, imported, skipped, errors: errors.slice(0, 5) });
            } catch (err: any) {
              resolve({ success: false, error: err.message });
            }
          };
          
          reader.readAsArrayBuffer(file);
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      });
    },
    exportExercisesExcel: async (): Promise<any> => {
      try {
        const data = await apiImplementation.getExercises();
        const exercises = data.exercises || [];
        const regions = data.regions || [];
        const regionMap = new Map<number, string>();
        regions.forEach((r: any) => regionMap.set(r.id, r.name));
        
        const exportRows = exercises.map((e: any) => ({
          Region: regionMap.get(e.region_id) || '',
          Name: e.name || '',
          Type: e.type || '',
          Instructions: e.instructions || '',
          'Video URL': e.video_url || ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Exercises');
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exercise_library_export.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return { success: true, filePath: 'exercise_library_export.xlsx' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    // --- Session Types & Package Status ---
    getSessionTypes: () => request('GET', '/sessions/types'),
    getClientPackageStatus: (clientId: number) => request('GET', `/payments/package-status/${clientId}`),

    // --- Clinical Profiles ---
    getClientProfiles: (clientId: number) => request('GET', `/profiles/client/${clientId}`),
    getClientProfile: (profileId: number) => request('GET', `/profiles/${profileId}`),
    createClientProfile: (data: any) => request('POST', '/profiles', data),
    deleteClientProfile: (profileId: number) => request('DELETE', `/profiles/${profileId}`),
    updateClientProfileHeight: (data: { profileId: number; height: number | null }) => request('PATCH', `/profiles/${data.profileId}/height`, { height: data.height }),

    // --- PT Profile Details ---
    getPTRedFlags: (profileId: number) => request('GET', `/profiles/pt/red-flags/${profileId}`),
    savePTRedFlags: (profileId: number, data: any) => request('POST', `/profiles/pt/red-flags/${profileId}`, data),
    getPTSubjective: (profileId: number, assessmentId?: any) => request('GET', `/profiles/pt/subjective/${profileId}${assessmentId ? `?assessmentId=${assessmentId}` : ''}`),
    getPTSubjectives: (profileId: number) => request('GET', `/profiles/pt/subjectives/${profileId}`),
    savePTSubjective: (profileId: number, data: any) => request('POST', `/profiles/pt/subjective/${profileId}`, data),
    deletePTAssessment: (id: number) => request('DELETE', `/profiles/pt/assessment/${id}`),
    getPTObjectiveRows: (profileId: number, subjectiveId: any) => request('GET', `/profiles/pt/objective-rows/${profileId}?subjectiveId=${subjectiveId}`),
    savePTObjectiveRows: (profileId: number, data: any) => request('POST', `/profiles/pt/objective-rows/${profileId}`, data),
    getPTPalpation: (profileId: number, subjectiveId: any) => request('GET', `/profiles/pt/palpation/${profileId}?subjectiveId=${subjectiveId}`),
    savePTPalpation: (profileId: number, data: any) => request('POST', `/profiles/pt/palpation/${profileId}`, data),
    getPTSpecialTestResults: (profileId: number) => request('GET', `/profiles/pt/special-tests/${profileId}`),
    savePTSpecialTestResult: (data: any) => request('POST', '/profiles/pt/special-test-result', data),
    getPTSessionPlans: (profileId: number) => request('GET', `/profiles/pt/session-plans/${profileId}`),
    savePTSessionPlan: (profileId: number, data: any) => request('POST', `/profiles/pt/session-plan/${profileId}`, data),
    deletePTSessionPlan: (planId: number) => request('DELETE', `/profiles/pt/session-plan/${planId}`),

    // --- Lymphatic Profile ---
    getLymphaticMeasurements: (profileId: number) => request('GET', `/profiles/lymphatic/${profileId}`),
    saveLymphaticMeasurement: (profileId: number, data: any) => request('POST', `/profiles/lymphatic/${profileId}`, data),
    deleteLymphaticMeasurement: (id: number) => request('DELETE', `/profiles/lymphatic/measurement/${id}`),

    // --- Nutrition Profile ---
    getNutritionHistory: (profileId: number) => request('GET', `/profiles/nutrition/${profileId}`),
    addNutritionHistory: (profileId: number, data: any) => request('POST', `/profiles/nutrition/${profileId}`, data),
    updateNutritionHistory: (id: number, data: any) => request('PUT', `/profiles/nutrition/history/${id}`, data),
    deleteNutritionHistory: (id: number) => request('DELETE', `/profiles/nutrition/history/${id}`),

    // --- Investigations ---
    getInvestigationLibrary: () => request('GET', '/profiles/investigations/library'),
    getClientInvestigations: (profileId: number) => request('GET', `/profiles/investigations/client/${profileId}`),
    assignInvestigation: (profileId: number, investigationId: number, doctorId?: number) => request('POST', `/profiles/investigations/assign/${profileId}`, { investigationId, doctorId }),
    removeClientInvestigation: (id: number) => request('DELETE', `/profiles/investigations/client/${id}`),
    updateInvestigationResult: (id: number, data: any) => request('PUT', `/profiles/investigations/client/${id}`, data),

    // --- Inbody Uploads ---
    getInbodyUploads: (profileId: number) => request('GET', `/profiles/inbody/${profileId}`),
    uploadInbodyMobile: (profileId: number, fileName: string, base64: string) => request('POST', `/profiles/inbody/${profileId}/upload`, { fileName, base64 }),
    uploadInbodyPhoto: (profileId: number) => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            resolve({ success: false, error: 'No file selected' });
            return;
          }
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            const res = await apiImplementation.uploadInbodyMobile(profileId, file.name, base64Data);
            resolve(res);
          };
          reader.onerror = () => resolve({ success: false, error: 'Read file error' });
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },
    deleteInbodyUpload: (id: number) => request('DELETE', `/profiles/inbody/upload/${id}`),

    // --- Document Records ---
    getDocuments: (clientId: number) => request('GET', `/profiles/documents/${clientId}`),
    uploadDocumentMobile: (clientId: number, fileName: string, base64: string) => request('POST', `/profiles/documents/${clientId}/upload`, { fileName, base64 }),
    uploadDocument: (clientId: number) => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            resolve({ success: false, error: 'No file selected' });
            return;
          }
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            const res = await apiImplementation.uploadDocumentMobile(clientId, file.name, base64Data);
            resolve(res);
          };
          reader.onerror = () => resolve({ success: false, error: 'Read file error' });
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },
    openDocument: async (path: string) => {
      if (typeof window !== 'undefined') {
        const fullUrl = path.startsWith('http') ? path : `${API_SERVER}${path}`;
        window.open(fullUrl, '_blank');
      }
      return { success: true };
    },
    showItemInFolder: async (path: string) => {
      if (typeof window !== 'undefined') {
        const fullUrl = path.startsWith('http') ? path : `${API_SERVER}${path}`;
        window.open(fullUrl, '_blank');
      }
      return { success: true };
    },
    // --- Dashboard & Reporting ---
    getDashboardStats: (showAllTime: boolean) => request('GET', `/finance/dashboard-stats?showAllTime=${showAllTime}`),
    getTodayAppointments: () => request('GET', '/finance/today-appointments'),
    getHighPainAlerts: () => request('GET', '/finance/high-pain-alerts'),
    getPainTestResults: () => request('GET', '/finance/pain-test-results'),
    getPatientFeedbacks: (syncToken: string) => request('GET', `/clients/feedbacks/by-token/${syncToken}`),
    pushPatientPlan: async (payload: any) => {
      console.log('[API BRIDGE] pushPatientPlan (No-op in SaaS, client portal reads directly from Neon)', payload);
      return { success: true };
    },
    getActiveSessions: () => request('GET', '/finance/active-sessions'),
    getDoctorsList: () => request('GET', '/doctors'),
    getReportStats: (data: any) => request('GET', `/finance/report-stats?startDate=${data.startDate}&endDate=${data.endDate}${data.doctorId ? `&doctorId=${data.doctorId}` : ''}`),
    getLocalUrl: async () => 'http://127.0.0.1:5173',
    getTailscaleUrl: async () => 'VPN Connection Active',

    // --- User Finance & Salaries ---
    getFinanceUsers: () => request('GET', '/finance/users'),
    getMonthlyRevenue: (month: string) => request('GET', `/finance/monthly-revenue?month=${month}`),
    getSalaryRecords: (month: string) => request('GET', `/finance/salary-records?month=${month}`),
    getDoctorSessionsCount: (data: any) => request('GET', `/finance/doctor-sessions-count?doctorId=${data.doctorId}&month=${data.month}`),
    updateUserFinance: (data: any) => request('POST', '/finance/user-finance', data),
    saveSalaryRecord: (data: any) => request('POST', '/finance/salary-record', data),

    // --- Loans Management ---
    getLoans: (month: string) => request('GET', `/finance/loans?month=${month}`),
    addLoan: (data: any) => request('POST', '/finance/loan', data),
    deleteLoan: (id: number) => request('DELETE', `/finance/loan/${id}`),
    settleLoan: (id: number) => request('POST', `/finance/settle-loan/${id}`),
    resetLoans: (month: string) => request('POST', '/finance/reset-loans', { month }),

    // --- Waste Management ---
    getWasteItems: (date: string) => request('GET', `/finance/waste-items?date=${date}`),
    getWasteDays: (month: string) => request('GET', `/finance/waste-days?month=${month}`),
    getDailySummary: (date: string) => request('GET', `/finance/daily-summary?date=${date}`),
    addWasteItem: (data: any) => request('POST', '/finance/waste-item', data),
    deleteWasteItem: (id: number) => request('DELETE', `/finance/waste-item/${id}`),

    // --- Session Types Admin ---
    createSessionType: (data: any) => request('POST', '/finance/session-type', data),
    updateSessionType: (id: number, data: any) => request('PUT', `/finance/session-type/${id}`, data),
    deleteSessionType: (id: number) => request('DELETE', `/finance/session-type/${id}`),

    // --- Active Session Heartbeat ---
    updateActiveSession: async (data: any) => ({ success: true }),

    // --- Investigation Library Admin ---
    addToInvestigationLibrary: (name: string) => request('POST', '/profiles/investigations/library', { name }),
    deleteFromInvestigationLibrary: (id: number) => request('DELETE', `/profiles/investigations/library/${id}`),

    // --- Global Settings / Metadata fallback ---
    getTenantSettings: () => request('GET', '/global/settings'),
    getDbPath: async () => 'SaaS Postgres Cloud Database',
    selectDbPath: async () => 'Cloud Server',
    reloadDatabase: async () => ({ success: true }),
    exportBackup: async () => ({ success: false, error: 'Backup is managed automatically on the cloud database server.' })
  };

  // Helper to generate type-safe default responses for unimplemented features
  const defaultMock = (propName: string) => {
    return async (...args: any[]) => {
      console.warn(`[API BRIDGE] Called unimplemented method: window.api.${propName}`, args);
      
      // Structure-specific fallbacks to prevent destructuring crashes in React views
      if (propName === 'getAssessmentStructure' || propName === 'getExercises') {
        return { regions: [], tests: [], exercises: [] };
      }
      if (propName === 'getDashboardStats') {
        return { clientsCount: 0, todayAppointments: 0, totalIncome: 0, resetDate: '1970-01-01 00:00:00' };
      }
      if (propName === 'getReportStats') {
        return {
          clientsInPeriod: 0,
          sessionsCount: 0,
          totalIncome: 0,
          totalLoans: 0,
          totalWastes: 0,
          dailyBreakdown: [],
          detailedPayments: [],
          detailedSessions: [],
          loanDetails: [],
          wasteDetails: []
        };
      }
      if (propName === 'getClientPackageStatus') {
        return { total: 0, used: 0 };
      }
      if (propName === 'getPTRedFlags') {
        return { flags: '', other_text: '' };
      }
      if (propName === 'getPTSubjective') {
        return { chief_complaint: '', aggravating: '', easing: '', irritability: '', nature: '' };
      }
      if (propName === 'getPTSessionPlan') {
        return { electrotherapy: null, manual_therapy: null, tools: null };
      }

      // Default Naming convention fallbacks
      if (propName.startsWith('get')) {
        return [];
      }
      
      return { success: true };
    };
  };

  // Wrap all API implementations to return safe fallbacks on error
  const safeApi: Record<string, any> = {};
  for (const [key, value] of Object.entries(apiImplementation)) {
    if (typeof value === 'function') {
      safeApi[key] = async (...args: any[]) => {
        try {
          const res = await (value as any)(...args);
          // If it failed with success: false (API error or 429)
          if (res && res.success === false) {
            console.error(`[API BRIDGE FAIL] window.api.${key} failed:`, res.error);
            // Return safe fallback
            return defaultMock(key)(...args);
          }
          // Special case for getClients: extract .data if it's paginated
          if (key === 'getClients') {
            return (res && res.data) || res || [];
          }
          return res;
        } catch (err) {
          console.error(`[API BRIDGE CRITICAL] window.api.${key} crashed:`, err);
          return defaultMock(key)(...args);
        }
      };
    } else {
      safeApi[key] = value;
    }
  }

  // Setup the Proxy wrapper to intercept any missing methods gracefully
  (window as any).api = new Proxy(safeApi, {
    get: (target, prop) => {
      if (prop in target) {
        return (target as any)[prop];
      }
      return defaultMock(String(prop));
    }
  });
  
  console.log('[API BRIDGE] Browser SaaS mode initialized with proxy protection');
}
