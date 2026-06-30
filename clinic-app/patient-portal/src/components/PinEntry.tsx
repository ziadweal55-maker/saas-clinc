import { useState } from 'react';
import { request, getTenantId } from '../lib/api';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';

interface PinEntryProps {
  onSuccess: (patientId: string, token: string) => void;
  branding?: any;
}

export function PinEntry({ onSuccess, branding }: PinEntryProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize token directly from URL to avoid cascading renders in useEffect
  const [token] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing access token.');
      return;
    }

    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Attempting login with:', { token, pin });
      const tenantId = getTenantId();
      if (!tenantId) {
        setError('Missing workspace configuration (tenant) in URL.');
        return;
      }

      const res = await request('POST', '/patient-portal/login', { token, pin });
      if (res.success && res.patient) {
        localStorage.setItem('patientId', res.patient.id.toString());
        localStorage.setItem('syncToken', token);
        onSuccess(res.patient.id.toString(), token);
      } else {
        setError('Login failed: Invalid credentials or record not found.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          <p className="font-bold">Access Denied: Missing Token</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-2xl mb-2">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={branding.name} className="h-10 w-auto object-contain" />
            ) : (
              <KeyRound size={40} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading italic uppercase">
            {branding?.name || 'REVIVE'}
          </h1>
          <p className="text-muted-foreground font-medium">Enter your 4-digit PIN to access your recovery plan.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-32 text-center text-3xl tracking-[0.5em] font-bold py-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="••••"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Access'}
          </button>
        </form>
      </div>
    </div>
  );
}
