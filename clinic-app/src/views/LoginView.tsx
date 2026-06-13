import { useState, useEffect } from 'react';
import { AlertCircle, Lock, User, ShieldCheck, ChevronLeft, CheckCircle, Building2, Activity, Sparkles, Loader2 } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';

interface LoginViewProps {
  onLogin: (user: any) => void;
  onRegisterTenant?: () => void;
}

export function LoginView({ onLogin, onRegisterTenant }: LoginViewProps) {
  const { tenantSettings, changeTenant } = useTenant();
  // Login State
  const [workspaceId, setWorkspaceId] = useState(() => {
    const stored = localStorage.getItem('tenantId');
    if (stored) return stored;
    if (typeof window !== 'undefined' && window.location) {
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2) {
        const sub = parts[0];
        if (sub !== 'www' && sub !== 'api' && sub !== 'localhost') {
          return sub;
        }
      }
    }
    return 'revive';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Registration Wizard State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'staff'>('staff');
  
  // Registration Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [docFirstName, setDocFirstName] = useState('');
  const [docLastName, setDocLastName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [isRegLoading, setIsRegLoading] = useState(false);

  // Load branches when opening registration
  useEffect(() => {
    if (isRegistering) {
      const loadBranches = async () => {
        try {
          if (window.api && (window.api as any).getBranches) {
            const data = await (window.api as any).getBranches();
            const branchList = Array.isArray(data) ? data : [];
            setBranches(branchList);
            if (branchList.length > 0) {
              setSelectedBranch(branchList[0].id.toString());
            }
          }
        } catch (err) {
          console.error('Error loading branches:', err);
        }
      };
      loadBranches();
    }
  }, [isRegistering]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const sanitizedWorkspaceId = workspaceId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      localStorage.setItem('tenantId', sanitizedWorkspaceId);
      
      const result = await window.api.loginUser({ username, password });
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setError('A system error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regUsername.trim()) {
      setRegError('Username is required.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (selectedRole === 'doctor') {
      if (!docFirstName.trim() || !docLastName.trim()) {
        setRegError('First name and last name are required for doctor profile.');
        return;
      }
      if (!docSpecialty.trim()) {
        setRegError('Specialty is required for doctor profile.');
        return;
      }
    }

    setIsRegLoading(true);
    try {
      if (window.api && (window.api as any).registerPendingUser) {
        const payload = {
          branchId: parseInt(selectedBranch),
          role: selectedRole,
          username: regUsername.trim(),
          password: regPassword,
          firstName: selectedRole === 'doctor' ? docFirstName.trim() : undefined,
          lastName: selectedRole === 'doctor' ? docLastName.trim() : undefined,
          specialty: selectedRole === 'doctor' ? docSpecialty.trim() : undefined,
        };

        const result = await (window.api as any).registerPendingUser(payload);
        if (result.success) {
          setRegSuccess(true);
        } else {
          setRegError(result.error || 'Failed to submit registration request.');
        }
      } else {
        setRegError('System registration endpoint is not available.');
      }
    } catch (err: any) {
      setRegError(err.message || 'A system error occurred during registration.');
    } finally {
      setIsRegLoading(false);
    }
  };

  const resetRegForm = () => {
    setIsRegistering(false);
    setRegStep(1);
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setDocFirstName('');
    setDocLastName('');
    setDocSpecialty('');
    setRegError('');
    setRegSuccess(false);
  };

  // Render Login Panel
  if (!isRegistering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-card p-10 rounded-3xl border border-border shadow-2xl space-y-8">
            <div className="text-center space-y-2">
              {tenantSettings?.logo_url ? (
                <img src={tenantSettings.logo_url} alt={tenantSettings.name} className="mx-auto h-16 w-auto object-contain mb-4" />
              ) : (
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-4">
                   <ShieldCheck size={32} />
                </div>
              )}
              <h1 className="text-4xl font-bold tracking-tighter text-foreground font-heading italic uppercase">
                {tenantSettings?.name || 'Clinic Management'}
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-muted-foreground">
                {tenantSettings?.name ? 'Clinical Intelligence Suite' : 'SaaS Clinic Workspace'}
              </p>
            </div>
            
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <Building2 size={12} /> Clinic Workspace ID
                </label>
                <input
                  type="text"
                  value={workspaceId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWorkspaceId(val);
                    const cleanVal = val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
                    if (cleanVal) {
                      changeTenant(cleanVal);
                    }
                  }}
                  className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground placeholder:text-muted-foreground/50"
                  placeholder="e.g. revive or evolve"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <User size={12} /> Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground placeholder:text-muted-foreground/50"
                  placeholder="Clinical identifier"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <Lock size={12} /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-start gap-3 animate-in shake duration-300">
                  <AlertCircle size={18} className="shrink-0" /> 
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> Authenticating...</>
                  ) : 'Secure Sign In'}
                </button>
              </div>

              <div className="text-center pt-2 border-t border-border/50 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Create new account
                </button>
                {onRegisterTenant && (
                  <button
                    type="button"
                    onClick={onRegisterTenant}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest mt-1 cursor-pointer"
                  >
                    Register New Clinic (SaaS)
                  </button>
                )}
              </div>
            </form>
            
            <div className="text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Protected by Enterprise-Grade Encryption
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-center">
             <p className="text-xs text-muted-foreground font-medium">Version 4.0.0-REVIVE | &copy; 2026 Revive Medical</p>
          </div>
        </div>
      </div>
    );
  }

  // Render Registration Wizard
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card p-10 rounded-3xl border border-border shadow-2xl space-y-8">
          
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border pb-4">
            {!regSuccess && (
              <button
                onClick={() => regStep > 1 ? setRegStep(regStep - 1) : resetRegForm()}
                className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-black tracking-tight text-foreground font-heading uppercase">
                {regSuccess ? 'Request Sent' : `Sign Up - Step ${regStep} of 3`}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {regSuccess ? 'Access Registration Pending' : 'Create Clinic Member Account'}
              </p>
            </div>
          </div>

          {regSuccess ? (
            /* Success Screen */
            <div className="space-y-6 text-center py-4 animate-in fade-in duration-300">
              <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 text-emerald-500 rounded-3xl mb-2">
                <CheckCircle size={48} className="animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-foreground font-heading">Registration Request Submitted!</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed px-2">
                Your account request has been successfully saved. It is now pending administrator approval. You will not be able to log in until an administrator reviews and approves your request.
              </p>
              <div className="pt-4">
                <button
                  onClick={resetRegForm}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/10"
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            /* Registration Flow */
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              
              {/* Step 1: Select Branch */}
              {regStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Building2 size={12} /> Select Branch
                    </label>
                    <div className="grid grid-cols-1 gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {branches.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground border border-border border-dashed rounded-2xl">
                          Loading available branches...
                        </div>
                      ) : (
                        branches.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBranch(b.id.toString())}
                            className={`w-full p-4 rounded-2xl border text-left font-bold text-sm transition-all flex items-center justify-between ${
                              selectedBranch === b.id.toString()
                                ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30'
                            }`}
                          >
                            <span>{b.name}</span>
                            {selectedBranch === b.id.toString() && (
                              <CheckCircle size={16} className="text-primary" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={!selectedBranch}
                      onClick={() => setRegStep(2)}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Select Role */}
              {regStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Choose Account Role
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('doctor')}
                        className={`p-5 rounded-2xl border text-left transition-all flex items-start gap-4 ${
                          selectedRole === 'doctor'
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'bg-muted/10 border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${selectedRole === 'doctor' ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                          <Activity size={20} />
                        </div>
                        <div className="space-y-0.5">
                          <div className={`text-sm font-bold ${selectedRole === 'doctor' ? 'text-primary' : 'text-foreground'}`}>Doctor Account</div>
                          <div className="text-[10px] font-medium text-muted-foreground">For clinicians who manage patient clinical history & assessment</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('staff')}
                        className={`p-5 rounded-2xl border text-left transition-all flex items-start gap-4 ${
                          selectedRole === 'staff'
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'bg-muted/10 border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${selectedRole === 'staff' ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                          <User size={20} />
                        </div>
                        <div className="space-y-0.5">
                          <div className={`text-sm font-bold ${selectedRole === 'staff' ? 'text-primary' : 'text-foreground'}`}>Staff Account</div>
                          <div className="text-[10px] font-medium text-muted-foreground">For assistants, receptionists, or front-desk personnel</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Account Form */}
              {regStep === 3 && (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 animate-in fade-in duration-300">
                  
                  {/* Doctor Profile Fields */}
                  {selectedRole === 'doctor' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={docFirstName}
                            onChange={(e) => setDocFirstName(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-muted/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-foreground placeholder:text-muted-foreground/45"
                            placeholder="e.g. Ahmed"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={docLastName}
                            onChange={(e) => setDocLastName(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-muted/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-foreground placeholder:text-muted-foreground/45"
                            placeholder="e.g. Ali"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
                          <Sparkles size={11} /> Specialty
                        </label>
                        <input
                          type="text"
                          value={docSpecialty}
                          onChange={(e) => setDocSpecialty(e.target.value)}
                          className="w-full px-3 py-3 rounded-xl bg-muted/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-foreground placeholder:text-muted-foreground/45"
                          placeholder="e.g. Physical Therapy"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Username */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
                      <User size={11} /> Account Username
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl bg-muted/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-foreground placeholder:text-muted-foreground/45"
                      placeholder={selectedRole === 'doctor' ? "e.g. ahmed1" : "Username for login"}
                      required
                    />
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
                        <Lock size={11} /> Password
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-muted/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-foreground placeholder:text-muted-foreground/45"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Confirm
                      </label>
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-muted/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-foreground placeholder:text-muted-foreground/45"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {regError && (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold flex items-start gap-2.5 animate-in shake duration-300">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" /> 
                      <span className="leading-normal">{regError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isRegLoading}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
                    >
                      {isRegLoading ? (
                        <><Loader2 size={16} className="animate-spin" /> Registering...</>
                      ) : 'Submit Request'}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
