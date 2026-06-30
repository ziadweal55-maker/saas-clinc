import { useState, useEffect, useCallback } from 'react';
import { Bot, FileText, RefreshCw, ExternalLink, Folder, ChevronLeft, User, Phone, Clipboard, ShieldAlert, CreditCard, Thermometer, Dumbbell, Activity, Plus, X, Sparkles, CheckCircle, ShieldCheck, QrCode, Edit, Trash2, Layers, MapPin, ClipboardList } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useLanguage } from '../hooks/useLanguage';
import { useTenant } from '../hooks/useTenant';
import { Client, User as UserType } from '../types';
import { ExercisesTab } from '../components/Exercises';
import { ProgressTab } from '../components/Progress';
import { PhysicalTherapyProfile } from '../components/PhysicalTherapyProfile';
import { NutritionProfile } from '../components/NutritionProfile';
import { LymphaticProfile } from '../components/LymphaticProfile';
import { HomeExercises } from '../components/HomeExercises';

function formatPTDate(dateStr: string | null | undefined, includeTime = false) {
  if (!dateStr) return '';
  const isoStr = dateStr.replace(' ', 'T');
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return dateStr;
  return includeTime ? d.toLocaleString() : d.toLocaleDateString();
}

interface ClientProfileViewProps {
  client: Client;
  onBack: () => void;
  onNavigate: (view: string) => void;
  currentUser: UserType | null;
  onClientUpdated?: (updatedClient: Client) => void;
}

export function ClientProfileView({ client, onBack, onNavigate, currentUser, onClientUpdated }: ClientProfileViewProps) {
  const { t, isAr } = useLanguage();
  const { tenantSettings } = useTenant();
  const [localClient, setLocalClient] = useState<any>(client);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    first_name: client.first_name || '',
    last_name: client.last_name || '',
    phone: client.phone || '',
    age: client.age || '',
    medical_history: client.medical_history || '',
    address: client.address || '',
    referral_source: client.referral_source || ''
  });

  const isAdmin = currentUser?.role === 'admin';
  const isDoctor = currentUser?.role === 'doctor';
  const isStaff = currentUser?.role === 'staff';

  const [packageStatus, setPackageStatus] = useState<{ total: number; used: number }>({ total: 0, used: 0 });

  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(isStaff ? 'financials' : 'documents');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [patientPin, setPatientPin] = useState(client.pin || '1234');

  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);

  const [feedbacks, setFeedbacks] = useState<{ paintests: any[]; patientlogs: any[] }>({ paintests: [], patientlogs: [] });
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [feedbacksError, setFeedbacksError] = useState<string | null>(null);

  const [sessionTypes, setSessionTypes] = useState<any[]>([]);

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 200, payment_type: 'Cash', session_type: '', num_sessions: 1 });
  const [manualAmount, setManualAmount] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPaymentData, setEditPaymentData] = useState({ amount: 0, payment_type: '', notes: '', package_sessions_total: 0 });

  const loadSessionTypes = useCallback(async () => {
    if (window.api && (window.api as any).getSessionTypes) {
      const types = await (window.api as any).getSessionTypes();
      setSessionTypes(types || []);
    }
  }, []);

  useEffect(() => {
    loadSessionTypes();
  }, [loadSessionTypes]);
  
  // Calculate total amount whenever type or number of sessions changes
  useEffect(() => {
    if (!manualAmount) {
      const selectedType = sessionTypes.find(t => t.id.toString() === paymentData.session_type || t.name === paymentData.session_type);
      const total = selectedType ? selectedType.cost : 200;
      setPaymentData(prev => ({ 
          ...prev, 
          amount: total, 
          package_sessions_total: prev.num_sessions, 
          payment_type: selectedType ? selectedType.name : (prev.session_type || 'Custom')
      }));
    }
  }, [paymentData.session_type, paymentData.num_sessions, manualAmount, sessionTypes]);

  const [documents, setDocuments] = useState<any[]>([]);



  const loadPayments = useCallback(async () => {
    try {
      if (window.api && window.api.getPayments) {
        const data = await window.api.getPayments(localClient.id);
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
    }
  }, [localClient.id]);

  const loadDocuments = useCallback(async () => {
    try {
      if (window.api && window.api.getDocuments) {
        const data = await window.api.getDocuments(localClient.id);
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }, [localClient.id]);

  const [isUploadingMobile, setIsUploadingMobile] = useState(false);

  const handleMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMobile(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          let res;
          if (window.api && (window.api as any).uploadDocumentMobile) {
            res = await (window.api as any).uploadDocumentMobile(localClient.id, file.name, base64Data);
          } else {
            const response = await fetch('/api/upload-document-mobile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId: localClient.id,
                fileName: file.name,
                fileData: base64Data
              })
            });
            res = response.ok ? await response.json() : { success: false, error: 'Network error' };
          }

          if (res?.success) {
            alert('Document uploaded successfully.');
            loadDocuments();
          } else {
            alert(`Upload failed: ${res?.error || 'Unknown error'}`);
          }
        } catch (err: any) {
          alert(`Upload error: ${err.message}`);
        } finally {
          setIsUploadingMobile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(`Error reading file: ${err.message}`);
      setIsUploadingMobile(false);
    }
  };

  const handleUploadClick = () => {
    if ((window as any).isMobilePortal) {
      document.getElementById('mobile-document-file')?.click();
    } else {
      (async () => {
        if (window.api && window.api.uploadDocument) {
          const res = await window.api.uploadDocument(localClient.id);
          if (res.success) {
            loadDocuments();
          } else if (res.error !== 'Canceled') {
            alert(`Upload error: ${res.error}`);
          }
        }
      })();
    }
  };

  const loadPackageStatus = useCallback(async () => {
    try {
      if (window.api && (window.api as any).getClientPackageStatus) {
        const status = await (window.api as any).getClientPackageStatus(localClient.id);
        setPackageStatus(status || { total: 0, used: 0 });
      }
    } catch (err) {
      console.error('Error loading package status:', err);
    }
  }, [localClient.id]);

  const loadProfiles = useCallback(async () => {
    try {
      if (window.api && (window.api as any).getClientProfiles) {
        const data = await (window.api as any).getClientProfiles(localClient.id);
        const profilesList = Array.isArray(data) ? data : [];
        setProfiles(profilesList);
        if (profilesList.length > 0 && !activeProfileId) {
          setActiveProfileId(profilesList[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  }, [localClient.id, activeProfileId]);

  useEffect(() => {
    if (localClient) {
      loadPayments();
      loadDocuments();
      loadPackageStatus();
      loadProfiles();
    }
  }, [localClient, loadPayments, loadDocuments, loadPackageStatus, loadProfiles]);

  const loadRecoveryFeedbacks = useCallback(async () => {
    if (!localClient || !localClient.sync_token) return;
    setIsLoadingFeedbacks(true);
    setFeedbacksError(null);
    try {
      if (window.api.getPatientFeedbacks) {
        const res = await window.api.getPatientFeedbacks(localClient.sync_token);
        if (res.success) {
          setFeedbacks({
            paintests: res.paintests || [],
            patientlogs: res.patientlogs || []
          });
        } else {
          setFeedbacksError(res.error || 'Failed to load feedbacks');
        }
      }
    } catch (err: any) {
      setFeedbacksError(err.message || 'An error occurred while loading feedbacks');
    } finally {
      setIsLoadingFeedbacks(false);
    }
  }, [localClient]);

  // Reload data when switching tabs to ensure freshness
  useEffect(() => {
    if (!localClient) return;
    if (activeTab === 'documents') loadDocuments();
    if (activeTab === 'financials') loadPayments();
    if (activeTab === 'recovery-monitoring') loadRecoveryFeedbacks();
  }, [activeTab, localClient, loadDocuments, loadPayments, loadRecoveryFeedbacks]);



  const handleRefreshData = async () => {
    setIsSyncingLocal(true);
    try {
      if (window.api?.reloadDatabase) {
        await window.api.reloadDatabase();
      }
      await Promise.all([
        loadPayments(),
        loadDocuments()
      ]);
    } catch (err) {
      console.error('Local Sync Error:', err);
    } finally {
      // Keep spinner for at least 600ms for visual confirmation
      setTimeout(() => setIsSyncingLocal(false), 600);
    }
  };

  const handleToggleStatus = async () => {
    if (window.api && window.api.toggleClientStatus) {
      const newStatus = client.is_active === 0 ? 1 : 0;
      const res = await window.api.toggleClientStatus(client.id, newStatus);
      if (res.success) {
        alert(`Patient account ${newStatus === 1 ? 'activated' : 'archived'} successfully.`);
        onBack();
      }
    }
  };

  const handleShareWithPatient = async () => {
    if (!window.api?.pushPatientPlan) {
      alert('Sync service is currently unavailable.');
      return;
    }

    if (!patientPin || patientPin.length < 4) {
      alert('Please set a secure 4-digit PIN for the patient.');
      return;
    }

    setIsSyncing(true);
    try {
      // Fetch all related data for full sync
      const [
        assignedExercises,
        homeExercises,
        sessions,
        assessments,
        payments,
        auditLogs,
        docsList,
        bioMetricsStructure,
        bioMetricsResults,
        profilesList
      ] = await Promise.all([
        window.api.getClientExercises(client.id),
        window.api.getHomeExercises ? window.api.getHomeExercises(client.id) : [],
        window.api.getSessions(client.id),
        window.api.getAssessments(client.id),
        window.api.getPayments(client.id),
        window.api.getAuditLogs(client.id),
        window.api.getDoctors(),
        window.api.getAssessmentStructure(),
        window.api.getClientAssessmentResults(client.id),
        window.api.getClientProfiles ? window.api.getClientProfiles(client.id) : []
      ]);

      // Fetch all sub-profile data for full sync
      const clientProfiles = [];
      if (profilesList && profilesList.length > 0) {
        for (const p of profilesList) {
          const profileData: any = {
            id: p.id,
            client_id: p.client_id,
            profile_type: p.profile_type,
            name: p.name,
            created_at: p.created_at,
            redFlags: null,
            subjective: null,
            objectiveRows: [],
            palpation: null,
            sessionPlan: null,
            nutritionHistory: [],
            investigations: [],
            inbodyUploads: [],
            lymphaticMeasurements: []
          };

          if (p.profile_type === 'physical_therapy') {
            const [rf, subj, objRows, palp, sPlan] = await Promise.all([
              window.api.getPTRedFlags(p.id),
              window.api.getPTSubjective(p.id),
              window.api.getPTObjectiveRows(p.id),
              window.api.getPTPalpation(p.id),
              window.api.getPTSessionPlan(p.id)
            ]);

            if (rf) {
              try {
                rf.flags = typeof rf.flags === 'string' ? JSON.parse(rf.flags) : rf.flags;
              } catch (e) {
                rf.flags = [];
              }
            }

            profileData.redFlags = rf;
            profileData.subjective = subj;
            profileData.objectiveRows = objRows || [];
            profileData.palpation = palp;
            profileData.sessionPlan = sPlan;
          } else if (p.profile_type === 'nutrition') {
            const [history, invs, uploads] = await Promise.all([
              window.api.getNutritionHistory(p.id),
              window.api.getClientInvestigations(p.id),
              window.api.getInbodyUploads(p.id)
            ]);

            profileData.nutritionHistory = history || [];
            profileData.investigations = invs || [];
            profileData.inbodyUploads = uploads || [];
          } else if (p.profile_type === 'lymphatic') {
            const measurements = await window.api.getLymphaticMeasurements(p.id);
            profileData.lymphaticMeasurements = measurements || [];
          }

          clientProfiles.push(profileData);
        }
      }

      // 2. Handle sync token and PIN persistence in database
      let currentToken = client.sync_token;
      if (!currentToken) {
        currentToken = Math.random().toString(36).substring(2, 15);
      }
      
      if (window.api.updateClient) {
        const updatedClient = {
          ...client,
          sync_token: currentToken,
          pin: patientPin
        };
        await window.api.updateClient(client.id, updatedClient);
        client.sync_token = currentToken;
        client.pin = patientPin;
        setLocalClient(updatedClient);
        if (onClientUpdated) {
          onClientUpdated(updatedClient);
        }
      }

      // 3. Prepare payload
      const payload = {
        patientData: {
          ...client,
          sync_token: currentToken,
          pin: patientPin
        },
        exercises: assignedExercises,
        homeExercises,
        sessions,
        assessments,
        payments,
        auditLogs,
        doctors: docsList,
        assessmentRegions: bioMetricsStructure.regions,
        assessmentTests: bioMetricsStructure.tests,
        assessmentResults: bioMetricsResults,
        clientProfiles
      };

      // 4. Push to Supabase via Bridge
      const res = await window.api.pushPatientPlan(payload);

      if (res.success) {
        // Generate the URL for the patient portal
        const tenantId = tenantSettings?.id || 'revive';
        const portalUrl = `https://saas-clinc-xktx.vercel.app/?token=${currentToken}&tenant=${tenantId}`;
        setSyncUrl(portalUrl);
        setShowQr(true);
      } else {
        alert(`Sync Failed: ${res.error}`);
      }
    } catch (err) {
      console.error('Sync Error:', err);
      alert('A communication error occurred during synchronization.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!client) return null;



  const tabs = [
    // Profile-specific tabs show directly if they exist for this client
    ...(profiles.some(p => p.profile_type === 'physical_therapy') ? [
      { id: 'pt-profile', label: 'pt_profile_tab', icon: Activity },
    ] : []),
    ...(profiles.some(p => p.profile_type === 'nutrition') ? [
      { id: 'nutrition-profile', label: 'nutrition_profile_tab', icon: Clipboard },
    ] : []),
    ...(profiles.some(p => p.profile_type === 'lymphatic') ? [
      { id: 'lymphatic-profile', label: 'lymphatic_profile_tab', icon: Thermometer },
    ] : []),
    // These tabs show for all profiles or when no profile:
    { id: 'documents', label: 'medical_records_tab', icon: FileText },
    { id: 'exercises', label: 'clinical_exercises_tab', icon: Sparkles },
    { id: 'home-exercises', label: 'home_exercises_tab', icon: Dumbbell },
    { id: 'financials', label: 'session_finance_tab', icon: CreditCard },
    { id: 'progress', label: 'recovery_insights_tab', icon: Activity },
    { id: 'recovery-monitoring', label: 'recovery_monitoring', icon: ClipboardList },
  ].filter(tab => {
    if (isStaff) {
      // Staff should only see the 'financials' (Session Finance) tab
      return tab.id === 'financials';
    }
    if (tab.id === 'financials' && isDoctor) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={onBack} 
            className="p-2 md:p-2.5 bg-background border border-border text-muted-foreground rounded-xl hover:bg-muted transition-all"
            title={t('back')}
          >
            <ChevronLeft size={20} className={isAr ? "rotate-180" : ""} />
          </button>
          <button 
            onClick={handleRefreshData} 
            disabled={isSyncingLocal}
            className={`p-2 md:p-2.5 bg-background border border-border rounded-xl transition-all flex items-center gap-2 group ${isSyncingLocal ? 'text-accent' : 'text-primary hover:bg-muted'}`}
            title={t('sync_local_database')}
          >
            <RefreshCw size={20} className={isSyncingLocal ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
              {isSyncingLocal ? t('syncing_local') : t('sync_local_database')}
            </span>
          </button>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => window.print()} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-background border border-border text-foreground rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all"
          >
            <FileText size={16} /> <span className="hidden xs:inline">{t('print_patient_report')}</span><span className="xs:hidden">{t('print_sheet')}</span>
          </button>
          <button 
            onClick={() => onNavigate('ai-assistant')} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <Bot size={16} /> {t('ai_assist')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Sidebar Profile */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card rounded-2xl md:rounded-3xl border border-border shadow-xl p-6 md:p-8 relative overflow-hidden group">
            <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-4 opacity-5`}>
               <User size={120} />
            </div>
            
            {!isEditingProfile && (isAdmin || isDoctor) && (
              <button 
                onClick={() => {
                  setProfileFormData({
                    first_name: localClient.first_name || '',
                    last_name: localClient.last_name || '',
                    phone: localClient.phone || '',
                    age: localClient.age !== undefined && localClient.age !== null ? localClient.age.toString() : '',
                    medical_history: localClient.medical_history || '',
                    address: localClient.address || '',
                    referral_source: localClient.referral_source || ''
                  });
                  setIsEditingProfile(true);
                }} 
                className={`absolute top-6 ${isAr ? 'left-6' : 'right-6'} p-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all z-20`}
                title={t('edit_patient_profile')}
              >
                <Edit size={16} />
              </button>
            )}

            {isEditingProfile ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (window.api && window.api.updateClient) {
                  const res = await window.api.updateClient(localClient.id, {
                    ...localClient,
                    first_name: profileFormData.first_name,
                    last_name: profileFormData.last_name,
                    phone: profileFormData.phone,
                    age: profileFormData.age ? parseInt(profileFormData.age as string) : null,
                    medical_history: profileFormData.medical_history,
                    address: profileFormData.address,
                    referral_source: profileFormData.referral_source
                  });
                  if (res.success) {
                    const updated = {
                      ...localClient,
                      first_name: profileFormData.first_name,
                      last_name: profileFormData.last_name,
                      phone: profileFormData.phone,
                      age: profileFormData.age ? parseInt(profileFormData.age as string) : null,
                      medical_history: profileFormData.medical_history,
                      address: profileFormData.address,
                      referral_source: profileFormData.referral_source
                    };
                    setLocalClient(updated);
                    setIsEditingProfile(false);
                    if (onClientUpdated) {
                      onClientUpdated(updated);
                    }
                  } else {
                    alert('Error updating profile: ' + res.error);
                  }
                }
              }} className="relative z-10 space-y-4">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest leading-none italic mb-4">{t('edit_patient_profile')}</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('first_name')}</label>
                    <input 
                      required 
                      type="text" 
                      value={profileFormData.first_name} 
                      onChange={e => setProfileFormData({...profileFormData, first_name: e.target.value})} 
                      className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('last_name')}</label>
                    <input 
                      required 
                      type="text" 
                      value={profileFormData.last_name} 
                      onChange={e => setProfileFormData({...profileFormData, last_name: e.target.value})} 
                      className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('phone_number')}</label>
                    <input 
                      type="text" 
                      value={profileFormData.phone} 
                      onChange={e => setProfileFormData({...profileFormData, phone: e.target.value})} 
                      className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('age')}</label>
                    <input 
                      type="number" 
                      min="0"
                      value={profileFormData.age} 
                      onChange={e => setProfileFormData({...profileFormData, age: e.target.value})} 
                      className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('address')}</label>
                    <input 
                      type="text" 
                      value={profileFormData.address} 
                      onChange={e => setProfileFormData({...profileFormData, address: e.target.value})} 
                      className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('how_did_you_know_us')}</label>
                    <input 
                      type="text" 
                      value={profileFormData.referral_source} 
                      onChange={e => setProfileFormData({...profileFormData, referral_source: e.target.value})} 
                      className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={`text-[9px] font-black text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('primary_clinical_notes')}</label>
                  <textarea 
                    rows={4} 
                    value={profileFormData.medical_history} 
                    onChange={e => setProfileFormData({...profileFormData, medical_history: e.target.value})} 
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary resize-none" 
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    className="flex-1 py-2 px-4 bg-accent text-accent-foreground rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {t('save_changes_btn')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingProfile(false)}
                    className="py-2 px-4 bg-muted text-foreground border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-muted/80 transition-all"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="relative z-10">
                <div className={`${localClient.is_active === 0 ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'} w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-bold mb-4 md:mb-6 mx-auto shadow-inner border border-primary/5`}>
                  {localClient.first_name[0]}{localClient.last_name[0]}
                </div>
                
                <div className="text-center space-y-1.5 md:space-y-2 mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground font-heading">{localClient.first_name} {localClient.last_name}</h2>
                  <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground font-medium text-xs md:text-sm">
                    <div className="flex items-center gap-2 justify-center">
                       <Phone size={14} />
                       <span>{localClient.phone}</span>
                    </div>
                    {localClient.address && (
                      <div className="flex items-center gap-2 justify-center">
                         <MapPin size={14} className="text-primary shrink-0" />
                         <span className="truncate max-w-[200px]">{localClient.address}</span>
                      </div>
                    )}
                    {localClient.referral_source && (
                      <div className="flex items-center gap-1.5 justify-center text-[10px] bg-primary/5 text-primary px-2.5 py-0.5 rounded-full border border-primary/10">
                         <span className="font-bold">{t('how_did_you_know_us')}:</span>
                         <span>{localClient.referral_source}</span>
                      </div>
                    )}
                    {localClient.age !== undefined && localClient.age !== null && (
                      <div className="text-[11px] font-bold bg-primary/5 text-primary px-2.5 py-0.5 rounded-full border border-primary/10">
                        {localClient.age} {t('years_old', 'Years Old')}
                      </div>
                    )}
                  </div>
                  {localClient.is_active === 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-destructive/10 text-destructive text-[9px] md:text-[10px] font-bold rounded-full border border-destructive/10 uppercase tracking-wider">
                      <ShieldAlert size={12} /> {t('archived')}
                    </span>
                  )}
                </div>
                
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-2 md:space-y-3">
                    <h3 className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Clipboard size={12} className="text-primary" /> {t('diagnosis_history_section')}
                    </h3>
                    <div className="bg-muted/30 rounded-xl md:rounded-2xl p-4 md:p-5 border border-border">
                      <p className="text-foreground text-xs md:text-sm leading-relaxed italic font-medium">
                        "{localClient.medical_history || t('no_prior_medical_history')}"
                      </p>
                    </div>
                  </div>

                  {(isAdmin || isDoctor) && (
                    <div className="bg-muted/20 p-4 md:p-5 rounded-xl md:rounded-2xl border border-border space-y-3 md:space-y-4">
                      <label 
                        htmlFor="patient-portal-pin"
                        className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer"
                      >
                           <ShieldCheck size={14} className="text-accent" /> {t('patient_access_pin_lbl')}
                      </label>
                      <input 
                        id="patient-portal-pin"
                        name="patient_portal_pin"
                        type="text" 
                        maxLength={4}
                        value={patientPin}
                        onChange={(e) => setPatientPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono text-center text-base md:text-lg tracking-[0.5em] md:tracking-[1em] focus:ring-2 focus:ring-accent outline-none"
                        placeholder="0000"
                      />
                      <button 
                        onClick={handleShareWithPatient}
                        disabled={isSyncing}
                        className={`w-full py-3 md:py-3.5 px-4 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-sm ${isSyncing ? 'bg-muted text-muted-foreground border-border cursor-not-allowed' : 'bg-accent text-accent-foreground border-accent/10 hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 active:scale-95'}`}>
                        {isSyncing ? (
                          <><RefreshCw size={16} className="animate-spin text-accent" /> {t('synchronizing')}</>
                        ) : (
                          <><RefreshCw size={16} /> {t('sync_portal_btn')}</>
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Profiles Panel */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h3 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Layers size={12} className="text-primary" /> {t('patient_clinical_profiles')}
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {([
                        { type: 'physical_therapy', label: 'physical_therapy', tabId: 'pt-profile', activeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15', inactiveColor: 'border-dashed border-border hover:border-blue-500/40 hover:bg-blue-500/5 text-muted-foreground hover:text-blue-500' },
                        { type: 'nutrition', label: 'nutrition', tabId: 'nutrition-profile', activeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15', inactiveColor: 'border-dashed border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 text-muted-foreground hover:text-emerald-500' },
                        { type: 'lymphatic', label: 'lymphatic', tabId: 'lymphatic-profile', activeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/15', inactiveColor: 'border-dashed border-border hover:border-purple-500/40 hover:bg-purple-500/5 text-muted-foreground hover:text-purple-500' }
                      ] as const).map(pConfig => {
                        const profile = profiles.find(p => p.profile_type === pConfig.type);
                        const isActive = activeProfileId && profile && activeProfileId === profile.id;
                        
                        if (profile) {
                          return (
                            <div
                              key={profile.id}
                              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isActive ? pConfig.activeColor + ' ring-2 ring-primary/10' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              }`}
                              onClick={() => {
                                setActiveProfileId(profile.id);
                                setActiveTab(pConfig.tabId);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-current shrink-0" />
                                <span className="text-xs font-bold">{t(pConfig.label)}</span>
                              </div>
                              {!isStaff && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(t('active_profile_confirm_delete').replace('{type}', t(pConfig.label)))) {
                                      await (window.api as any).deleteClientProfile(profile.id);
                                      loadProfiles();
                                      if (activeProfileId === profile.id) setActiveProfileId(null);
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                                  title={t('delete')}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          );
                        } else {
                          const addLabel = pConfig.type === 'physical_therapy' ? t('add_pt_profile') : pConfig.type === 'nutrition' ? t('add_nutrition_profile') : t('add_lymphatic_profile');
                          return (
                            <div
                              key={pConfig.type}
                              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${pConfig.inactiveColor}`}
                              onClick={async () => {
                                if (window.api && (window.api as any).createClientProfile) {
                                  const res = await (window.api as any).createClientProfile({
                                    client_id: localClient.id,
                                    profile_type: pConfig.type,
                                    name: null
                                  });
                                  if (res.success) {
                                    const updated = await (window.api as any).getClientProfiles(localClient.id);
                                    setProfiles(updated || []);
                                    setActiveProfileId(res.id);
                                    setActiveTab(pConfig.tabId);
                                  } else {
                                    alert('Error creating profile: ' + res.error);
                                  }
                                }
                              }}
                            >
                              <Plus size={14} /> {addLabel}
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-4 md:pt-6 border-t border-border space-y-2 md:space-y-3">
                      <button 
                        onClick={handleToggleStatus}
                        className={`w-full py-3 md:py-3.5 px-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-sm ${localClient.is_active === 0 ? 'bg-primary text-primary-foreground border-primary/10 shadow-primary/20 hover:-translate-y-0.5' : 'bg-background text-foreground border-border hover:bg-muted/50'}`}>
                        {localClient.is_active === 0 ? <><CheckCircle size={16} /> {t('activate_account')}</> : <><ShieldAlert size={16} /> {t('archive_account')}</>}
                      </button>

                      <button 
                        onClick={async () => {
                          if (confirm(t('purge_client_confirm').replace('{name}', localClient.first_name + ' ' + localClient.last_name))) {
                            if (window.api && window.api.deleteClient) {
                              const res = await window.api.deleteClient(localClient.id);
                              if (res.success) onBack();
                            }
                          }
                        }}
                        className="w-full py-3 md:py-3.5 px-4 bg-destructive/5 text-destructive/60 border border-destructive/10 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2">
                        {t('purge_record_btn')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Content Tabs */}
        <div className="lg:col-span-8">
          <div className="bg-card rounded-2xl md:rounded-3xl border border-border shadow-xl overflow-hidden min-h-[500px] md:min-h-[700px] flex flex-col">
            <div className="flex border-b border-border bg-muted/30 p-1 overflow-x-auto no-scrollbar scroll-smooth">
              <div className="flex flex-nowrap min-w-max">
                {tabs.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'pt-profile') {
                        const pt = profiles.find(p => p.profile_type === 'physical_therapy');
                        if (pt) setActiveProfileId(pt.id);
                      } else if (tab.id === 'nutrition-profile') {
                        const nutr = profiles.find(p => p.profile_type === 'nutrition');
                        if (nutr) setActiveProfileId(nutr.id);
                      } else if (tab.id === 'lymphatic-profile') {
                        const lymph = profiles.find(p => p.profile_type === 'lymphatic');
                        if (lymph) setActiveProfileId(lymph.id);
                      }
                      setActiveTab(tab.id);
                    }} 
                    className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-[9px] md:text-[10px] font-bold uppercase tracking-widest rounded-xl md:rounded-2xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}>
                    <tab.icon size={14} />
                    {t(tab.label)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-10 flex-1">
              {activeTab === 'pt-profile' && activeProfileId && (
                <div className="animate-in fade-in duration-300">
                  <PhysicalTherapyProfile profileId={activeProfileId} currentUser={currentUser} readOnly={false} />
                </div>
              )}
              {activeTab === 'nutrition-profile' && activeProfileId && (
                <div className="animate-in fade-in duration-300">
                  <NutritionProfile profileId={activeProfileId} currentUser={currentUser} readOnly={false} />
                </div>
              )}
              {activeTab === 'lymphatic-profile' && activeProfileId && (
                <div className="animate-in fade-in duration-300">
                  <LymphaticProfile profileId={activeProfileId} currentUser={currentUser} readOnly={false} />
                </div>
              )}
              {activeTab === 'home-exercises' && (
                <div className="animate-in fade-in duration-300">
                  <HomeExercises clientId={localClient.id} currentUser={currentUser} readOnly={false} />
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                   {(isAdmin || isDoctor) && (
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10 no-print">
                        <div className="space-y-1">
                           <h4 className="text-primary font-bold text-sm flex items-center gap-2 font-heading">
                              <Bot size={18} /> {t('ai_clinical_recovery_generator', 'AI CLINICAL RECOVERY GENERATOR')}
                           </h4>
                           <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('synthesize_personalized_protocol', 'Synthesize personalized protocol based on clinical findings')}</p>
                        </div>
                        <button 
                          onClick={() => { onNavigate('ai-assistant'); }}
                          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2">
                          <Sparkles size={14} /> {t('generate_program', 'Generate Program')}
                        </button>
                     </div>
                   )}
                   <ProgressTab clientId={localClient.id} />
                </div>
              )}

               {activeTab === 'exercises' && <div className="animate-in fade-in duration-300"><ExercisesTab clientId={localClient.id} readOnly={false} currentUser={currentUser} /></div>}

              {activeTab === 'documents' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-foreground font-heading">{t('medical_documents_header')}</h3>
                      <p className="text-xs text-muted-foreground mt-1 font-medium tracking-tight">{t('diagnostic_imagery_desc')}</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={loadDocuments}
                        className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all border border-border"
                        title={t('refresh_registry', 'Refresh Registry')}
                      >
                        <RefreshCw size={18} />
                      </button>
                      {!isStaff && (
                        <>
                          <input
                            type="file"
                            id="mobile-document-file"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleMobileUpload}
                          />
                          <button 
                            onClick={handleUploadClick}
                            disabled={isUploadingMobile}
                            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50">
                            {isUploadingMobile ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <FileText size={16} />
                            )}
                            {isUploadingMobile ? t('uploading', 'Uploading...') : t('import_record_btn')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {documents.length === 0 ? (
                    <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border">
                      <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                      <p className="font-bold text-foreground mb-1 font-heading">{t('no_digital_records_found')}</p>
                      <p className="text-xs text-muted-foreground font-medium">{t('securely_store_pdfs')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {documents.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-5 border border-border rounded-2xl bg-card shadow-sm hover:border-primary/20 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <FileText size={20} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-foreground text-sm truncate" title={doc.file_name}>{doc.file_name}</p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{doc.upload_date ? formatPTDate(doc.upload_date) : t('unknown_date', 'Unknown Date')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={async () => {
                                  if (window.api && window.api.openDocument) {
                                    const res = await window.api.openDocument(doc.local_file_path);
                                    if (res && !res.success) {
                                      alert(`Error: ${res.error}`);
                                    }
                                  }
                              }}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                              title={t('open_document_tooltip')}
                            >
                              <ExternalLink size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.api && window.api.showItemInFolder) {
                                  window.api.showItemInFolder(doc.local_file_path);
                                }
                              }}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all" 
                              title={t('reveal_in_system_tooltip')}
                            >
                              <Folder size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'financials' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <CreditCard size={20} />
                       </div>
                       <h3 className="text-xl font-bold text-foreground font-heading">{t('session_finance_tab')}</h3>
                    </div>
                    {(isAdmin || isStaff) && (
                      <button 
                        onClick={() => {
                          if (!showAddPayment) {
                            loadSessionTypes();
                          }
                          setShowAddPayment(!showAddPayment);
                        }} 
                        className={`${showAddPayment ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'} px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all`}>
                        {showAddPayment ? <><X size={16} /> {t('cancel')}</> : <><Plus size={16} /> {t('record_payment_btn')}</>}
                      </button>
                    )}
                  </div>

                  {/* Package Sessions Tracking Summary Card */}
                  {packageStatus.total > 0 && (
                    <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8 space-y-4 md:space-y-6 shadow-sm animate-in fade-in duration-300">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-black text-primary uppercase tracking-wider italic font-heading">{t('active_package_status')}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">{t('realtime_sync_timeline')}</p>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center bg-card border border-border px-4 py-2 rounded-2xl shadow-sm">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t('total_purchased')}</p>
                            <p className="text-xl md:text-2xl font-black text-primary font-heading leading-tight mt-1">{packageStatus.total}</p>
                          </div>
                          <div className="text-center bg-card border border-border px-4 py-2 rounded-2xl shadow-sm">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t('sessions_used')}</p>
                            <p className="text-xl md:text-2xl font-black text-accent font-heading leading-tight mt-1">{packageStatus.used}</p>
                          </div>
                          <div className="text-center bg-card border border-border px-4 py-2 rounded-2xl shadow-sm">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t('sessions_left')}</p>
                            <p className="text-xl md:text-2xl font-black text-emerald-600 font-heading leading-tight mt-1">{Math.max(0, packageStatus.total - packageStatus.used)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>{t('progress_tab', 'Progress')}</span>
                          <span>{Math.round((packageStatus.used / packageStatus.total) * 100)}% {t('used')}</span>
                        </div>
                        <div className="h-3 w-full bg-muted border border-border rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${Math.min(100, (packageStatus.used / packageStatus.total) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {showAddPayment && (isAdmin || isStaff) && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (window.api && window.api.createPayment) {
                        const res = await window.api.createPayment({ client_id: localClient.id, ...paymentData });
                        if (res.success) {
                          setShowAddPayment(false);
                          setManualAmount(false);
                          loadPayments();
                          loadPackageStatus();
                        }
                      }
                    }} className="bg-muted/20 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('service_classification')}</label>
                          <select 
                            value={paymentData.session_type} 
                            onChange={e => {
                              const selectedType = sessionTypes.find(t => t.id.toString() === e.target.value || t.name === e.target.value);
                              setPaymentData(prev => ({
                                ...prev,
                                session_type: e.target.value,
                                num_sessions: selectedType ? (selectedType.num_sessions || 1) : 1,
                                amount: selectedType ? selectedType.cost : 200
                              }));
                            }} 
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="">{t('select_service_type')}</option>
                             {sessionTypes.map(st => (
                               <option key={st.id} value={st.id.toString()}>{st.name} — {st.cost} EGP{st.num_sessions ? ` (${st.num_sessions} ${t('sessions_unit')})` : ''}</option>
                             ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('session_count_label')}</label>
                          <input 
                            disabled 
                            type="number" 
                            value={paymentData.num_sessions} 
                            className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-muted-foreground font-medium outline-none cursor-not-allowed" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('total_transaction_value')}</label>
                        <div className="relative">
                          <span className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-muted-foreground font-bold`}>$</span>
                          <input 
                            disabled 
                            type="number" 
                            value={paymentData.amount} 
                            className={`w-full ${isAr ? 'pr-8 pl-4' : 'pl-8 pr-4'} py-4 bg-muted/50 border border-border rounded-2xl text-muted-foreground font-bold text-2xl outline-none cursor-not-allowed tabular-nums`} 
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">{t('fixed_rate_sync_notice')}</p>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-accent text-accent-foreground px-10 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/10 hover:-translate-y-0.5 transition-all">{t('authenticate_record')}</button>
                      </div>
                    </form>
                  )}

                  <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                    {payments.length === 0 ? (
                      <div className="text-center py-20">
                        <CreditCard size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-medium">{t('no_financial_records')}</p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop View Table */}
                        <div className="hidden md:block overflow-x-auto w-full">
                          <table className={`w-full ${isAr ? 'text-right' : 'text-left'} min-w-[850px]`}>
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className={`px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-right' : 'text-left'}`}>{t('transaction_date')}</th>
                              <th className={`px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-right' : 'text-left'}`}>{t('service_details')}</th>
                              <th className={`px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-right' : 'text-left'}`}>{t('volume_notes')}</th>
                              <th className={`px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-left' : 'text-right'}`}>{t('net_amount')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {payments.map((p, i) => (
                              editingPaymentId === p.id ? (
                                <tr key={p.id || i} className="bg-primary/5">
                                  <td className={`px-8 py-5 text-sm font-medium text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{formatPTDate(p.payment_date)}</td>
                                  <td className="px-8 py-5">
                                    <input 
                                      type="text" 
                                      value={editPaymentData.payment_type}
                                      onChange={e => setEditPaymentData({ ...editPaymentData, payment_type: e.target.value })}
                                      className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </td>
                                  <td className="px-8 py-5">
                                    <div className="flex items-center gap-2 mb-2">
                                      <input 
                                        type="number"
                                        placeholder={t('sessions_unit')}
                                        value={editPaymentData.package_sessions_total}
                                        onChange={e => setEditPaymentData({ ...editPaymentData, package_sessions_total: parseInt(e.target.value) || 0 })}
                                        className="w-20 px-2 py-1 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary outline-none"
                                        min="1"
                                      />
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('sessions_unit')}</span>
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder={t('payment_notes_placeholder')}
                                      value={editPaymentData.notes}
                                      onChange={e => setEditPaymentData({ ...editPaymentData, notes: e.target.value })}
                                      className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground font-medium outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </td>
                                  <td className={`px-8 py-5 font-bold ${isAr ? 'text-left' : 'text-right'}`}>
                                    <div className={`flex items-center ${isAr ? 'justify-start' : 'justify-end'} gap-2.5`}>
                                      <span className="text-sm text-muted-foreground font-bold">$</span>
                                      <input 
                                        type="number" 
                                        value={editPaymentData.amount}
                                        onChange={e => setEditPaymentData({ ...editPaymentData, amount: parseFloat(e.target.value) || 0 })}
                                        className={`w-24 px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground font-bold outline-none focus:ring-2 focus:ring-primary ${isAr ? 'text-left' : 'text-right'}`}
                                      />
                                      <button 
                                        onClick={async () => {
                                          if (window.api && (window.api as any).updatePayment) {
                                            const res = await (window.api as any).updatePayment({
                                              paymentId: p.id,
                                              data: editPaymentData
                                            });
                                            if (res.success) {
                                              setEditingPaymentId(null);
                                              loadPayments();
                                              loadPackageStatus();
                                            } else {
                                              alert(`Update failed: ${res.error}`);
                                            }
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all"
                                      >
                                        {t('confirm')}
                                      </button>
                                      <button 
                                        onClick={() => setEditingPaymentId(null)}
                                        className="px-3 py-1.5 bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-muted/80 transition-all"
                                      >
                                        {t('cancel')}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr key={p.id || i} className="hover:bg-primary/5 transition-colors group">
                                  <td className="px-8 py-5 text-sm font-medium text-muted-foreground">{formatPTDate(p.payment_date)}</td>
                                  <td className="px-8 py-5 font-bold text-foreground">{p.payment_type}</td>
                                  <td className="px-8 py-5">
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-xs font-bold px-2.5 py-1 bg-muted rounded-lg text-foreground w-fit">{p.package_sessions_total} {t('sessions_unit')}</span>
                                      {p.notes && <span className="text-[10px] text-muted-foreground font-semibold italic mt-0.5">{p.notes}</span>}
                                    </div>
                                  </td>
                                  <td className={`px-8 py-5 font-bold text-primary tabular-nums text-lg ${isAr ? 'text-left' : 'text-right'}`}>
                                    <div className={`flex items-center ${isAr ? 'justify-start' : 'justify-end'} gap-3.5`}>
                                      <span>${p.amount.toLocaleString()}</span>
                                      {isAdmin && (
                                        <button 
                                          onClick={() => {
                                            setEditingPaymentId(p.id);
                                            setEditPaymentData({ amount: p.amount, payment_type: p.payment_type, notes: p.notes || '', package_sessions_total: p.package_sessions_total || 0 });
                                          }}
                                          className="p-2 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer opacity-70 hover:opacity-100"
                                          title={t('edit')}
                                        >
                                          <Edit size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            ))}
                          </tbody>
                        </table>
                      </div>

                        {/* Mobile View Cards */}
                        <div className="md:hidden divide-y divide-border">
                          {payments.map((p, i) => (
                            editingPaymentId === p.id ? (
                              <div key={p.id || i} className="p-4 space-y-4 bg-primary/5">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('service_details')}</label>
                                  <input 
                                    type="text" 
                                    value={editPaymentData.payment_type}
                                    onChange={e => setEditPaymentData({ ...editPaymentData, payment_type: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('sessions_unit')}</label>
                                    <input 
                                      type="number"
                                      value={editPaymentData.package_sessions_total}
                                      onChange={e => setEditPaymentData({ ...editPaymentData, package_sessions_total: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary outline-none"
                                      min="1"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('net_amount')}</label>
                                    <input 
                                      type="number" 
                                      value={editPaymentData.amount}
                                      onChange={e => setEditPaymentData({ ...editPaymentData, amount: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground font-bold outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('volume_notes')}</label>
                                  <input 
                                    type="text" 
                                    placeholder={t('payment_notes_placeholder')}
                                    value={editPaymentData.notes}
                                    onChange={e => setEditPaymentData({ ...editPaymentData, notes: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground font-medium outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                  <button 
                                    onClick={async () => {
                                      if (window.api && (window.api as any).updatePayment) {
                                        const res = await (window.api as any).updatePayment({
                                          paymentId: p.id,
                                          data: editPaymentData
                                        });
                                        if (res.success) {
                                          setEditingPaymentId(null);
                                          loadPayments();
                                          loadPackageStatus();
                                        } else {
                                          alert(`Update failed: ${res.error}`);
                                        }
                                      }
                                    }}
                                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all"
                                  >
                                    {t('confirm')}
                                  </button>
                                  <button 
                                    onClick={() => setEditingPaymentId(null)}
                                    className="px-4 py-2 bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-muted/80 transition-all"
                                  >
                                    {t('cancel')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div key={i} className="p-4 space-y-3 hover:bg-primary/5 transition-colors relative group">
                                <div className="flex justify-between items-center">
                                  <div className="font-bold text-sm text-foreground">{p.payment_type}</div>
                                  <div className="flex items-center gap-3">
                                    <div className="font-black text-primary tabular-nums text-base">${p.amount.toLocaleString()}</div>
                                    {isAdmin && (
                                      <button 
                                        onClick={() => {
                                          setEditingPaymentId(p.id);
                                          setEditPaymentData({ amount: p.amount, payment_type: p.payment_type, notes: p.notes || '', package_sessions_total: p.package_sessions_total || 0 });
                                        }}
                                        className="p-2 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer opacity-80 hover:opacity-100"
                                        title={t('edit')}
                                      >
                                        <Edit size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {p.notes && <div className="text-xs text-muted-foreground font-medium italic mt-0.5">{p.notes}</div>}
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                  <span className="bg-muted text-foreground px-2 py-0.5 rounded-lg border border-border/10">{p.package_sessions_total} {t('sessions_unit')}</span>
                                  <span className="tabular-nums opacity-80">{formatPTDate(p.payment_date)}</span>
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'recovery-monitoring' && (() => {
                const unifiedFeedbacks = [
                  ...(feedbacks.paintests || []).map(t => ({
                    id: t.id,
                    date: t.created_at,
                    score: t.pain_score ?? t.pain_level ?? 0,
                    type: t.test_type || 'Pain Test',
                    notes: t.notes || t.comments || t.observations || '',
                    isPainTest: true
                  })),
                  ...(feedbacks.patientlogs || []).map(l => ({
                    id: l.id,
                    date: l.created_at,
                    score: l.pain_level ?? 0,
                    type: 'Daily Check-in',
                    notes: l.notes || l.comments || l.observations || '',
                    isPainTest: false
                  }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                return (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/10 pb-6">
                      <div>
                        <h3 className="text-xl font-bold text-foreground font-heading">{t('recovery_monitoring')}</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium tracking-tight">{t('recovery_monitoring_subtitle')}</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {localClient.sync_token && (
                          <button 
                            onClick={loadRecoveryFeedbacks}
                            disabled={isLoadingFeedbacks}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2.5 bg-background border border-border text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all disabled:opacity-50"
                            title={t('refresh_registry', 'Refresh')}
                          >
                            <RefreshCw size={18} className={isLoadingFeedbacks ? 'animate-spin' : ''} />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const tenantId = tenantSettings?.id || 'revive';
                            const portalUrl = `https://saas-clinc-xktx.vercel.app/?token=${localClient.sync_token || ''}&tenant=${tenantId}`;
                            setSyncUrl(portalUrl);
                            setShowQr(true);
                          }}
                          className="flex-1 sm:flex-none bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95"
                        >
                          <QrCode size={16} />
                          {t('view_qr_code', 'View QR Code')}
                        </button>
                      </div>
                    </div>

                    {!localClient.sync_token ? (
                      <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border p-6">
                        <QrCode size={48} className="mx-auto mb-4 text-muted-foreground/30 animate-pulse" />
                        <p className="font-bold text-foreground mb-1 font-heading">Sync Portal Not Configured</p>
                        <p className="text-xs text-muted-foreground font-medium max-w-md mx-auto mb-6">
                          To monitor patient recovery, please click the sync button to generate a QR code and link this patient with the client portal.
                        </p>
                      </div>
                    ) : isLoadingFeedbacks ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <RefreshCw size={36} className="text-primary animate-spin mb-4" />
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{t('syncing')}</p>
                      </div>
                    ) : feedbacksError ? (
                      <div className="text-center py-16 bg-destructive/5 rounded-3xl border border-dashed border-destructive/20 p-6">
                        <ShieldAlert size={48} className="mx-auto mb-4 text-destructive/40" />
                        <p className="font-bold text-destructive mb-1 font-heading">Failed to Load Feedbacks</p>
                        <p className="text-xs text-muted-foreground font-medium max-w-md mx-auto mb-4">
                          {feedbacksError}
                        </p>
                        <button 
                          onClick={loadRecoveryFeedbacks}
                          className="px-4 py-2 bg-background border border-border text-foreground hover:bg-muted font-bold text-xs rounded-xl transition-all"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : unifiedFeedbacks.length === 0 ? (
                      <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border p-6">
                        <ClipboardList size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                        <p className="font-bold text-foreground mb-1 font-heading">No Feedbacks Logged Yet</p>
                        <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto">
                          Once the patient scans their portal QR code and logs their check-ins or pain scores, they will appear here in real-time.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:md:left-7 before:w-0.5 before:bg-border/60 overflow-hidden py-2 animate-in fade-in duration-300">
                        {unifiedFeedbacks.map((item, idx) => {
                          const dateObj = new Date(item.date);
                          const dateStr = dateObj.toLocaleDateString(isAr ? 'ar-EG' : undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                          const timeStr = dateObj.toLocaleTimeString(isAr ? 'ar-EG' : [], { hour: '2-digit', minute: '2-digit' });
                          const isHighPain = item.score >= 7;
                          const isMediumPain = item.score >= 4 && item.score < 7;

                          return (
                            <div key={item.id || idx} className="relative pl-12 md:pl-16 group">
                              {/* Timeline dot */}
                              <div className={`absolute left-3.5 md:left-5.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background z-10 transition-transform group-hover:scale-125 ${
                                isHighPain ? 'bg-destructive shadow-lg shadow-destructive/30' : 
                                isMediumPain ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : 
                                'bg-emerald-600 shadow-lg shadow-emerald-600/30'
                              }`} />

                              {/* Card Content */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border border-border rounded-2xl bg-card shadow-sm hover:border-primary/20 hover:shadow-md transition-all">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {/* Pain Score Badge */}
                                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-white shadow-md transition-transform group-hover:scale-105 shrink-0 ${
                                    isHighPain ? 'bg-destructive shadow-destructive/20' : 
                                    isMediumPain ? 'bg-orange-500 shadow-orange-500/20' : 
                                    'bg-emerald-600 shadow-emerald-600/20'
                                  }`}>
                                    {item.score}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-black text-sm md:text-base text-foreground group-hover:text-primary transition-colors truncate uppercase italic tracking-tight">
                                      {item.type}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                        {dateStr}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground/60 font-semibold">•</span>
                                      <span className="text-[9px] text-muted-foreground font-bold tabular-nums">
                                        {timeStr}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-1 max-w-full md:max-w-md">
                                  <div className="bg-muted/30 p-3 rounded-xl border border-border/50 group-hover:border-primary/20 transition-all">
                                    <p className="text-xs text-muted-foreground font-medium italic leading-relaxed">
                                      {item.notes || 'No comments left by patient'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {showQr && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-card border border-border rounded-[2.5rem] shadow-2xl p-8 space-y-6 text-center relative">
            <button 
              onClick={() => setShowQr(false)}
              className={`absolute top-6 ${isAr ? 'left-6' : 'right-6'} p-2 text-muted-foreground hover:bg-muted rounded-xl transition-all`}
            >
              <X size={20} />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-2xl mb-2">
                <QrCode size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground font-heading uppercase italic">{t('patient_access_portal')}</h3>
              <p className="text-xs text-muted-foreground font-medium">{t('scan_code_portal')}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl inline-block shadow-inner border border-border">
              <QRCode value={syncUrl} size={200} />
            </div>

            <div className="bg-muted/50 p-4 rounded-2xl space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('patient_access_pin_lbl')}</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-[0.5em] ml-2">{patientPin}</p>
            </div>

            <button 
              onClick={() => setShowQr(false)}
              className="w-full py-4 bg-foreground text-background rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
            >
              {t('done_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
