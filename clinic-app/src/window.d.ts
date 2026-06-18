import { SyncPayload } from './types';

export {};

declare global {
  interface Window {
    api: {
      getClients: () => Promise<any[]>;
      createClient: (clientData: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      getClient: (clientId: number) => Promise<any>;
      updateClient: (clientId: number, clientData: any) => Promise<{ success: boolean; error?: string }>;
      deleteClient: (clientId: number) => Promise<{ success: boolean; error?: string }>;
      toggleClientStatus: (clientId: number, status: number) => Promise<{ success: boolean; error?: string }>;
      getSessions: (clientId: number) => Promise<any[]>;
      createSession: (sessionData: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateSession: (id: number, sessionData: any) => Promise<{ success: boolean; error?: string }>;
      deleteSession: (id: number) => Promise<{ success: boolean; error?: string }>;
      updateAssessment: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteAssessment: (id: number) => Promise<{ success: boolean; error?: string }>;
      getPayments: (clientId: number) => Promise<any[]>;
      createPayment: (paymentData: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      updatePayment: (paymentData: { paymentId: number; data: any }) => Promise<{ success: boolean; error?: string }>;
      getAppointments: () => Promise<any[]>;
      createAppointment: (appointmentData: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      getDashboardStats: (showAllTime?: boolean) => Promise<{ 
        clientsCount: number; 
        todayAppointments: number; 
        totalIncome: number;
        resetDate: string;
      }>;
      resetDashboard: () => Promise<{ success: boolean; resetDate: string; error?: string }>;
      getReportStats: (dateRange: { startDate: string; endDate: string; doctorId?: string | number }) => Promise<{
        clientsInPeriod: number;
        sessionsCount: number;
        totalIncome: number;
        totalLoans: number;
        totalWastes: number;
        dailyBreakdown: any[];
        detailedPayments: any[];
        detailedSessions: any[];
        loanDetails: any[];
        wasteDetails: any[];
      }>;
      uploadDocument: (clientId: number) => Promise<{ success: boolean; fileName?: string; error?: string }>;
      getDocuments: (clientId: number) => Promise<any[]>;
      openDocument: (filePath: string) => Promise<{ success: boolean; error?: string; warning?: string }>;
      showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      exportBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
      getTodayAppointments: () => Promise<any[]>;
      askAi: (data: { clientId?: number; question: string }) => Promise<{ success: boolean; text?: string; error?: string }>;
      getAssessmentStructure: () => Promise<{ regions: any[]; tests: any[] }>;
      saveAssessmentResult: (data: { clientId: number; testId: number; result: string }) => Promise<{ success: boolean; error?: string }>;
      getClientAssessmentResults: (clientId: number) => Promise<any[]>;
      getTestHistory: (data: { clientId: number; testId: number }) => Promise<any[]>;
      addAssessmentRegion: (name: string) => Promise<{ success: boolean; id?: number; error?: string }>;
      addAssessmentTest: (data: { regionId: number; name: string; description: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteAssessmentTest: (testId: number) => Promise<{ success: boolean; error?: string }>;
      deleteAssessmentRegion: (regionId: number) => Promise<{ success: boolean; error?: string }>;
      updateAssessmentRegion: (data: { id: number; name: string }) => Promise<{ success: boolean; error?: string }>;
      updateAssessmentTest: (data: { id: number; name: string; description: string }) => Promise<{ success: boolean; error?: string }>;
      getClientProgressStats: (clientId: number) => Promise<any[]>;
      getClientPackageStatus: (clientId: number) => Promise<{ total: number; used: number }>;
      getExercises: () => Promise<{ regions: any[]; exercises: any[] }>;
      addExerciseRegion: (name: string) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteExerciseRegion: (id: number) => Promise<{ success: boolean; error?: string }>;
      addExercise: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteExercise: (id: number) => Promise<{ success: boolean; error?: string }>;
      updateExerciseRegion: (data: { id: number; name: string }) => Promise<{ success: boolean; error?: string }>;
      updateExercise: (data: { id: number; name: string; type?: string; instructions?: string; video_url?: string }) => Promise<{ success: boolean; error?: string }>;
      getClientExercises: (clientId: number) => Promise<any[]>;
      assignExercise: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      removeClientExercise: (id) => Promise<{ success: boolean; error?: string }>;
      logExerciseProgress: (data: any) => Promise<{ success: boolean; error?: string }>;
      exportExercisesExcel: () => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      importExercisesExcel: () => Promise<{ success: boolean; imported?: number; skipped?: number; canceled?: boolean; errors?: string[]; error?: string }>;
      exportAssessmentsExcel: () => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      importAssessmentsExcel: () => Promise<{ success: boolean; imported?: number; skipped?: number; canceled?: boolean; errors?: string[]; error?: string }>;
      pushPatientPlan: (data: SyncPayload) => Promise<{ success: boolean; error?: string }>;
      getHighPainAlerts: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      getAllPainLogs: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      getPainTestResults: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      checkUsersExist: () => Promise<boolean>;
      setupAdmin: (data: any) => Promise<{ success: boolean; error?: string }>;
      loginUser: (data: any) => Promise<{ success: boolean; user?: any; error?: string }>;
      changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
      registerPendingUser: (data: any) => Promise<{ success: boolean; error?: string }>;
      getPendingAccounts: () => Promise<any[]>;
      approveAccountRequest: (userId: number) => Promise<{ success: boolean; error?: string }>;
      denyAccountRequest: (userId: number) => Promise<{ success: boolean; error?: string }>;
      getAllUsers: () => Promise<any[]>;
      resetUserPassword: (data: { userId: number; newPassword: string }) => Promise<{ success: boolean; error?: string }>;
      deleteUserAccount: (userId: number) => Promise<{ success: boolean; error?: string }>;
      getDbPath: () => Promise<string>;
      selectDbPath: () => Promise<string | null>;
      reloadDatabase: () => Promise<{ success: boolean; error?: string }>;
      confirm?: (message: string) => boolean;
      // New Profile / PT / Nutrition / Lymphatic / Session type declarations
      getDoctors: () => Promise<any[]>;
      getActiveDoctors: () => Promise<any[]>;
      deleteDoctor: (id: number) => Promise<{ success: boolean; error?: string }>;
      createUser?: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateUserStatus?: (data: { userId: number; status: string }) => Promise<{ success: boolean; error?: string }>;
      updateAppointment: (appointmentData: any) => Promise<{ success: boolean; error?: string }>;
      deleteAppointment: (appointmentId: number) => Promise<{ success: boolean; error?: string }>;
      
      getClientProfiles: (clientId: number) => Promise<any[]>;
      createClientProfile: (data: { client_id: number; profile_type: string; name?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteClientProfile: (profileId: number) => Promise<{ success: boolean; error?: string }>;
      updateClientProfileHeight: (data: { profileId: number; height: number | null }) => Promise<{ success: boolean; error?: string }>;
      getClientProfile: (profileId: number) => Promise<any>;

      getPTRedFlags: (profileId: number) => Promise<{ flags: string; other_text: string }>;
      savePTRedFlags: (profileId: number, data: { flags: string; other_text: string }) => Promise<{ success: boolean; error?: string }>;
      getPTSubjective: (profileId: number) => Promise<any>;
      savePTSubjective: (profileId: number, data: any) => Promise<{ success: boolean; error?: string }>;
      getPTObjectiveRows: (profileId: number) => Promise<any[]>;
      savePTObjectiveRows: (profileId: number, rows: any[]) => Promise<{ success: boolean; error?: string }>;
      getPTPalpation: (profileId: number) => Promise<{ notes: string }>;
      savePTPalpation: (profileId: number, data: { notes: string }) => Promise<{ success: boolean; error?: string }>;
      getPTSpecialTestResults: (profileId: number) => Promise<any[]>;
      savePTSpecialTestResult: (data: { profileId: number; testId: number; result: string }) => Promise<{ success: boolean; error?: string }>;
      getPTSessionPlan: (profileId: number) => Promise<{ electrotherapy: string | null; manual_therapy: string | null; tools: string | null }>;
      savePTSessionPlan: (profileId: number, data: { electrotherapy: string; manual_therapy: string; tools: string }) => Promise<{ success: boolean; error?: string }>;

      getNutritionHistory: (profileId: number) => Promise<any[]>;
      addNutritionHistory: (profileId: number, data: { content: string; session_date?: string; height?: number | null; weight?: number | null }) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateNutritionHistory: (id: number, data: { content: string; height?: number | null; weight?: number | null }) => Promise<{ success: boolean; error?: string }>;
      deleteNutritionHistory: (id: number) => Promise<{ success: boolean; error?: string }>;

      getInvestigationLibrary: () => Promise<any[]>;
      addToInvestigationLibrary: (name: string) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteFromInvestigationLibrary: (id: number) => Promise<{ success: boolean; error?: string }>;
      getClientInvestigations: (profileId: number) => Promise<any[]>;
      assignInvestigation: (profileId: number, investigationId: number) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateInvestigationResult: (id: number, data: { result_text: string; result_date?: string }) => Promise<{ success: boolean; error?: string }>;
      removeClientInvestigation: (id: number) => Promise<{ success: boolean; error?: string }>;

      uploadInbodyPhoto: (profileId: number) => Promise<{ success: boolean; fileName?: string; local_file_path?: string; session_date?: string; error?: string }>;
      getInbodyUploads: (profileId: number) => Promise<any[]>;
      deleteInbodyUpload: (id: number) => Promise<{ success: boolean; error?: string }>;

      getLymphaticMeasurements: (profileId: number) => Promise<any[]>;
      saveLymphaticMeasurement: (profileId: number, data: { measurement_name: string; value: string; unit?: string; session_date?: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteLymphaticMeasurement: (id: number) => Promise<{ success: boolean; error?: string }>;

      clockIn: (data: { userId: number; date?: string; time?: string }) => Promise<{ success: boolean; error?: string }>;
      clockOut: (data: { userId: number; date?: string; time?: string }) => Promise<{ success: boolean; error?: string }>;
      getAttendanceLogs: (date?: string) => Promise<any[]>;

      getSessionTypes: () => Promise<any[]>;
      createSessionType: (data: { name: string; cost: number; num_sessions?: number | null }) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateSessionType: (id: number, data: { name: string; cost: number; num_sessions?: number | null }) => Promise<{ success: boolean; error?: string }>;
      deleteSessionType: (id: number) => Promise<{ success: boolean; error?: string }>;

      getHomeExercises: (clientId: number) => Promise<any[]>;
      assignHomeExercise: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      removeHomeExercise: (id: number) => Promise<{ success: boolean; error?: string }>;
      updateHomeExercise: (id: number, data: { sets?: string; reps?: string; frequency?: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;

      getRecoveryStats: (clientId: number) => Promise<any[]>;
      getActiveSessions?: () => Promise<any[]>;
      getLocalUrl?: () => Promise<string>;
      getTailscaleUrl?: () => Promise<string | null>;
      getAssessments: (clientId: number) => Promise<any[]>;
      getAuditLogs: (clientId: number) => Promise<any[]>;

      // Branch Management
      getBranches: () => Promise<{ id: number; name: string; is_active: number }[]>;
      getAllBranches: () => Promise<{ id: number; name: string; is_active: number }[]>;
      setCurrentBranch: (branchId: number) => Promise<{ success: boolean; branchId?: number; error?: string }>;
      getCurrentBranch: () => Promise<{ id: number; name: string; is_active: number } | null>;
      addBranch: (name: string) => Promise<{ success: boolean; id?: number; name?: string; error?: string }>;
      renameBranch: (data: { branchId: number; newName: string }) => Promise<{ success: boolean; error?: string }>;
      deactivateBranch: (branchId: number) => Promise<{ success: boolean; error?: string }>;
      reactivateBranch: (branchId: number) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
