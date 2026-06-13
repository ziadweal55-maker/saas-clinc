import { useState } from 'react';
import { AlertCircle, UserPlus, ShieldCheck, Lock, User } from 'lucide-react';

interface SetupViewProps {
  onComplete: () => void;
}

export function SetupView({ onComplete }: SetupViewProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (password.length < 6) {
      setError('Security requirement: Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.api.setupAdmin({ username, password });
      if (result.success) {
        onComplete();
      } else {
        setError(result.error || 'Setup initialization failed.');
      }
    } catch (err) {
      setError('A critical system error occurred during initial setup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card p-10 rounded-3xl border border-border shadow-2xl space-y-10">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-4">
               <ShieldCheck size={32} />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter text-foreground font-heading italic">INITIAL SETUP</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Initialize Administrator Account</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                <User size={12} /> Admin Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                <Lock size={12} /> New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground"
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                <ShieldCheck size={12} /> Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground"
                placeholder="Re-enter password"
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
                className="w-full py-4 bg-accent text-accent-foreground rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-accent/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><div className="animate-spin h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full" /> Initializing...</>
                ) : (
                  <><UserPlus size={18} /> Complete Secure Setup</>
                )}
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Protected by Enterprise-Grade Encryption
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center">
           <p className="text-xs text-muted-foreground font-medium">System Configuration Mode | &copy; 2026 Revive Medical</p>
        </div>
      </div>
    </div>
  );
}
