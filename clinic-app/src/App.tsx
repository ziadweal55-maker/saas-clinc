import { useState, useEffect, useCallback } from 'react';
import { Home, Users, Calendar, Settings, FileText, Bot, Activity, RefreshCw, X, Stethoscope, ClipboardList, Dumbbell, DollarSign, Menu, Clock, FlaskConical, CheckCircle, AlertCircle, Info, Building2, UserCheck } from 'lucide-react';

// Types
import { Client, User as UserType } from './types';

// Views
import { LoginView } from './views/LoginView';
import { SetupView } from './views/SetupView';
import { RegisterTenantView } from './views/RegisterTenantView';
import { useTenant } from './hooks/useTenant';
import { BranchSelectorView } from './views/BranchSelectorView';
import { DashboardView } from './views/DashboardView';
import { CalendarView } from './views/CalendarView';
import { ClientsView } from './views/ClientsView';
import { ClientProfileView } from './views/ClientProfileView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { AIView } from './views/AIView';
import { AssessmentView } from './views/AssessmentView';
import { ExercisesView } from './views/ExercisesView';
import { FinanceManagementView } from './views/FinanceManagementView';
import { AttendanceView } from './views/AttendanceView';
import { AccountRequestsView } from './views/AccountRequestsView';
import { InvestigationAdmin } from './components/InvestigationAdmin';

export default function App() {
  const { tenantSettings } = useTenant();
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([]);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    (window as any).showToast = showToast;
    window.alert = (message: any) => {
      showToast(String(message), 'warning');
    };
  }, [showToast]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt_dark_mode') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);


  const isBaseDomain = useCallback(() => {
    if (typeof window === 'undefined' || !window.location) return false;
    const hostname = window.location.hostname;
    // Always base domain on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    // Treat hosting platform domains as base unless ?tenant= is present
    const HOSTING_DOMAINS = ['vercel.app', 'railway.app', 'netlify.app', 'onrender.com'];
    const isHostingBase = HOSTING_DOMAINS.some(d => hostname.endsWith(d));
    if (isHostingBase) {
      const params = new URLSearchParams(window.location.search);
      return !params.get('tenant'); // base domain if no ?tenant= param
    }
    return false;
  }, []);


  const [isRegisteringTenant, setIsRegisteringTenant] = useState(() => isBaseDomain());

  // Branch State
  const [currentBranch, setCurrentBranch] = useState<{ id: number; name: string } | null>(null);
  // needsBranchSelection: true = show branch picker (admin/root only)
  const [needsBranchSelection, setNeedsBranchSelection] = useState(false);
  const [loadingBranchData, setLoadingBranchData] = useState(false);

  const checkUsers = async () => {
    if (isBaseDomain()) {
      setIsRegisteringTenant(true);
      setHasUsers(false);
      return;
    }

    try {
      // If we are on mobile/browser, skip the existence check and assume users exist
      if ((window as any).isMobilePortal) {
        setHasUsers(true);
        return;
      }

      if (window.api && (window.api as any).checkUsersExist) {
        const exists = await (window.api as any).checkUsersExist();
        
        // Handle API errors like missing tenant context
        if (exists && typeof exists === 'object' && 'error' in exists) {
          showToast(String(exists.error || 'Tenant workspace not registered.'), 'error');
          setIsRegisteringTenant(true);
          setHasUsers(false);
          return;
        }
        
        setHasUsers(!!exists);
      }
    } catch (err: any) {
      console.error('Error checking users:', err);
      setIsRegisteringTenant(true);
      setHasUsers(false);
    }
  };

  useEffect(() => {
    checkUsers();
  }, []);

  useEffect(() => {
    localStorage.setItem('pt_dark_mode', darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const loadClients = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      if (window.api && (window.api as any).getClients) {
        const data = await (window.api as any).getClients();
        setClients(data || []);
      }
    } catch (err) {
      console.error('Critical Error loading clients:', err);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    if (currentUser?.username && window.api && (window.api as any).removeActiveSession) {
      (window.api as any).removeActiveSession(currentUser.username).catch(console.error);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentBranch(null);
    setNeedsBranchSelection(false);
    setCurrentView('dashboard');
  };

  // Called when user logs in — admins see branch picker, staff/doctors go straight in
  const handleLogin = async (user: any) => {
    setCurrentUser(user);
    if (user.role === 'admin' || user.role === 'cfo' || user.isRoot) {
      // Admin, CFO & root must pick a branch every login
      setNeedsBranchSelection(true);
    } else {
      // Staff & doctors are permanently assigned to their branch
      const branchId = user.branch_id || 1;
      try {
        await (window.api as any).setCurrentBranch(branchId);
        const branch = await (window.api as any).getCurrentBranch();
        setCurrentBranch(branch);
      } catch (e) {
        // fallback
        setCurrentBranch({ id: branchId, name: `Branch ${branchId}` });
      }
      setIsAuthenticated(true);
    }
  };

  // Called when admin picks a branch from BranchSelectorView
  const handleBranchSelected = async (branch: { id: number; name: string }) => {
    setLoadingBranchData(true);
    setClients([]);
    setSelectedClient(null);
    setCurrentBranch(branch);
    setNeedsBranchSelection(false);
    setIsAuthenticated(true);
    try {
      if (window.api && (window.api as any).getClients) {
        const data = await (window.api as any).getClients();
        setClients(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setLoadingBranchData(false);
      }, 500);
    }
  };

  // Active Session Heartbeat
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.username) return;

    const sendHeartbeat = () => {
      if (window.api && (window.api as any).updateActiveSession) {
        (window.api as any).updateActiveSession({
          username: currentUser.username,
          role: currentUser.role,
          currentView
        }).catch(console.error);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser, currentView]);

  useEffect(() => {
    loadClients();
  }, [isAuthenticated, loadClients]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === 'admin') setCurrentView('dashboard');
      else if (currentUser.role === 'doctor') setCurrentView('calendar');
      else if (currentUser.role === 'staff') setCurrentView('clients');
    }
  }, [isAuthenticated, currentUser]);

  // Close sidebar on view change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [currentView]);

  if (isRegisteringTenant) {
    return (
      <RegisterTenantView
        onComplete={(tenantId) => {
          if (typeof window !== 'undefined' && window.location) {
            const hostname = window.location.hostname;
            const port = window.location.port ? `:${window.location.port}` : '';

            // Localhost → use subdomain routing
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
              window.location.href = `http://${tenantId}.localhost${port}`;
              return;
            }

            // Hosting platforms (Vercel, Railway, Netlify) → use ?tenant= param
            const HOSTING_DOMAINS = ['vercel.app', 'railway.app', 'netlify.app', 'onrender.com'];
            const isHostingPlatform = HOSTING_DOMAINS.some(d => hostname.endsWith(d));
            if (isHostingPlatform) {
              window.location.href = `${window.location.origin}?tenant=${tenantId}`;
              return;
            }

            // Custom domain → use real subdomain (e.g. revive.yourclinic.com)
            const parts = hostname.split('.');
            if (parts.length >= 2) {
              const baseDomain = parts.slice(-2).join('.');
              window.location.href = `https://${tenantId}.${baseDomain}`;
              return;
            }
          }
          // Fallback: store in localStorage and reload
          localStorage.setItem('tenantId', tenantId);
          setIsRegisteringTenant(false);
          checkUsers();
        }}
        onBackToLogin={() => {
          if (isBaseDomain()) {
            if (typeof window !== 'undefined' && window.location) {
              const port = window.location.port ? `:${window.location.port}` : '';
              window.location.href = `http://revive.localhost${port}`;
              return;
            }
          }
          setIsRegisteringTenant(false);
        }}
      />
    );
  }

  if (hasUsers === null) return <div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-spin text-primary"><RefreshCw size={48} /></div></div>;
  if (hasUsers === false) return <SetupView onComplete={checkUsers} />;
  if (!currentUser) return <LoginView onLogin={handleLogin} onRegisterTenant={() => setIsRegisteringTenant(true)} />;
  if (needsBranchSelection) return <BranchSelectorView onBranchSelected={handleBranchSelected} userDisplayName={currentUser.username} />;
  if (loadingBranchData) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center space-y-4">
        <RefreshCw size={48} className="animate-spin text-primary" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse font-heading italic">Loading Branch Data...</p>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const isDoctor = currentUser?.role === 'doctor';
  const isStaff = currentUser?.role === 'staff';
  const isCfo = currentUser?.role === 'cfo';

  return (
    <div className={`flex h-screen w-full bg-background text-foreground font-sans overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-card text-card-foreground flex flex-col shadow-xl z-40 transition-transform duration-300 border-r border-border overflow-y-auto
        lg:translate-x-0 lg:static lg:flex
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 pb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-primary leading-none font-heading italic uppercase">
              {tenantSettings?.name || 'Clinic Management'}
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold mt-1 text-muted-foreground">
              {tenantSettings?.name ? 'SaaS Workspace' : 'Clinic'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-secondary/20 text-primary hover:bg-secondary/40 transition-all active:scale-90 border border-primary/20">
              {darkMode ? <Activity size={18} /> : <Settings size={18} />}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-xl bg-destructive/10 text-destructive lg:hidden transition-all active:scale-90 border border-destructive/20">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-visible lg:overflow-y-auto">
          {(isAdmin || isDoctor) && (
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'dashboard' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <Home size={20} /> {isAdmin ? 'Dashboard' : 'Recovery Monitoring'}
            </button>
          )}
          
          <button 
            onClick={() => setCurrentView('calendar')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'calendar' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
            <Calendar size={20} /> Calendar
          </button>
          
          {(isAdmin || isDoctor || isStaff) && (
            <button 
              onClick={() => setCurrentView('clients')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'clients' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <Users size={20} /> Patients
            </button>
          )}


          {(isAdmin || isCfo) && (
            <button 
              onClick={() => setCurrentView('reports')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'reports' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <FileText size={20} /> Reports
            </button>
          )}

          {(isAdmin || isCfo) && (
            <button 
              onClick={() => setCurrentView('finance')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'finance' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <DollarSign size={20} /> Finance
            </button>
          )}

          {(isAdmin || isDoctor) && (
            <button 
              onClick={() => setCurrentView('assessment')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'assessment' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <ClipboardList size={20} /> Clinic Assessment
            </button>
          )}

          {(isAdmin || isDoctor) && (
            <button 
              onClick={() => setCurrentView('exercises')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'exercises' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <Dumbbell size={20} /> Exercise Library
            </button>
          )}

          {(isAdmin || isDoctor) && (
            <button 
              onClick={() => setCurrentView('investigation-library')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'investigation-library' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <FlaskConical size={20} /> Investigation Library
            </button>
          )}
 
          {isAdmin && (
            <button 
              onClick={() => setCurrentView('ai-assistant')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'ai-assistant' ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20 font-bold' : 'hover:bg-accent/10 text-muted-foreground hover:text-accent'}`}>
              <Bot size={20} /> Revive AI Assist
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setCurrentView('approvals')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'approvals' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'hover:bg-secondary/10 text-muted-foreground hover:text-primary'}`}>
              <UserCheck size={20} /> Account Requests
            </button>
          )}
        </nav>
        
        <div className="p-6 border-t border-border space-y-2">
           <button 
             onClick={() => setCurrentView('attendance')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'attendance' ? 'bg-secondary/20 text-primary' : 'text-muted-foreground hover:bg-secondary/10 hover:text-primary'}`}>
             <Clock size={20} /> Shift Attendance
           </button>
           {isAdmin && (
             <button 
               onClick={() => setCurrentView('settings')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'settings' ? 'bg-secondary/20 text-primary' : 'text-muted-foreground hover:bg-secondary/10 hover:text-primary'}`}>
               <Settings size={20} /> Settings & Backup
             </button>
           )}
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
           >
             <X size={20} /> Log Out
           </button>
           <div className="mt-3 mx-2 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1.5 mb-2">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                User: {currentUser?.username} ({currentUser?.role})
              </div>
              {currentBranch && (
                <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-widest mb-1">
                  <Building2 size={12} className="shrink-0" />
                  {currentBranch.name}
                </div>
              )}
              {(isAdmin || isCfo) && currentBranch && (
                <button
                  onClick={() => setNeedsBranchSelection(true)}
                  className="mt-1 w-full py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1"
                >
                  Switch Branch
                </button>
              )}
            </div>
            <div className="px-4 pt-1 pb-6 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Version 4.0.0-REVIVE
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden h-screen bg-background flex flex-col relative">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-card border-b border-border shadow-sm z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl bg-primary/10 text-primary active:scale-95 transition-all">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-black tracking-tighter text-primary font-heading italic uppercase">
              {tenantSettings?.name || 'Clinic Management'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
              {currentUser?.username?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-[88px] lg:pb-0">
          {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} currentUser={currentUser} />}
          {currentView === 'calendar' && <CalendarView clients={clients} currentUser={currentUser} />}
          {currentView === 'clients' && <ClientsView clients={clients} onSelectClient={(c) => { setSelectedClient(c); setCurrentView('clientProfile'); }} onClientAdded={loadClients} currentUser={currentUser} />}
          {currentView === 'clientProfile' && selectedClient && (
            <ClientProfileView 
              key={selectedClient.id} 
              client={selectedClient} 
              onBack={() => { setCurrentView('clients'); loadClients(); }} 
              onNavigate={setCurrentView} 
              currentUser={currentUser} 
              onClientUpdated={(updated) => {
                setSelectedClient(updated);
                loadClients();
              }}
            />
          )}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'finance' && <FinanceManagementView currentUser={currentUser} />}
          {currentView === 'assessment' && <AssessmentView />}
          {currentView === 'exercises' && <ExercisesView />}
          {currentView === 'investigation-library' && (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground font-heading uppercase italic flex items-center gap-2">
                  <FlaskConical className="text-primary shrink-0 animate-pulse" size={26} /> Diagnostic Investigation Library
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Standardize patient test panels and custom biomarkers</p>
              </div>
              <InvestigationAdmin />
            </div>
          )}
          {currentView === 'settings' && currentUser && <SettingsView currentUser={currentUser} />}
          {currentView === 'attendance' && <AttendanceView currentUser={currentUser} />}
          {currentView === 'ai-assistant' && <AIView clients={clients} />}
          {currentView === 'approvals' && <AccountRequestsView />}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-card/85 backdrop-blur-lg border border-border/80 shadow-2xl rounded-2xl p-2 z-40 flex justify-around items-center transition-all duration-300">
          {isAdmin && (
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${currentView === 'dashboard' ? 'text-primary bg-primary/10 font-bold scale-105' : 'text-muted-foreground'}`}>
              <Home size={18} />
              <span className="text-[9px] uppercase tracking-wider font-black">Home</span>
            </button>
          )}
          <button 
            onClick={() => setCurrentView('calendar')} 
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${currentView === 'calendar' ? 'text-primary bg-primary/10 font-bold scale-105' : 'text-muted-foreground'}`}>
            <Calendar size={18} />
            <span className="text-[9px] uppercase tracking-wider font-black">Schedule</span>
          </button>
          {(isAdmin || isDoctor || isStaff) && (
            <button 
              onClick={() => setCurrentView('clients')} 
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${currentView === 'clients' ? 'text-primary bg-primary/10 font-bold scale-105' : 'text-muted-foreground'}`}>
              <Users size={18} />
              <span className="text-[9px] uppercase tracking-wider font-black">Patients</span>
            </button>
          )}
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-muted-foreground active:scale-95 hover:text-primary transition-all">
            <Menu size={18} />
            <span className="text-[9px] uppercase tracking-wider font-black">Menu</span>
          </button>
        </div>

        {/* Toasts overlay */}
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print">
          {toasts.map(toast => {
            const colors = {
              success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
              error: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
              warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
              info: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
            };
            const icons = {
              success: <CheckCircle className="shrink-0 animate-bounce" size={18} />,
              error: <AlertCircle className="shrink-0 animate-pulse" size={18} />,
              warning: <AlertCircle className="shrink-0" size={18} />,
              info: <Info className="shrink-0" size={18} />
            };
            
            return (
              <div 
                key={toast.id} 
                className={`flex items-center gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-4 ${colors[toast.type]}`}
              >
                {icons[toast.type]}
                <div className="text-[10px] font-bold uppercase tracking-wider leading-none">{toast.message}</div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
