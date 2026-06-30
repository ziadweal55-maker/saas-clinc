import { useState, useEffect } from 'react'
import { PinEntry } from './components/PinEntry'
import { ExerciseList } from './components/ExerciseList'
import { DailyCheckIn } from './components/DailyCheckIn'
import { LogOut, Dumbbell, Sparkles, CheckCircle } from 'lucide-react'
import { request } from './lib/api'

function hexToHslValues(hex: string): string {
  if (!hex || hex.length !== 7 || !hex.startsWith('#')) {
    return '160 84% 39%';
  }
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const isValidPatientId = (id: string | null) => {
  if (!id) return false;
  const isInteger = /^\d+$/.test(id);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return isInteger || isUuid;
};

function App() {
  const [patientId, setPatientId] = useState<string | null>(() => {
    const stored = localStorage.getItem('patientId');
    if (stored && !isValidPatientId(stored)) {
      localStorage.removeItem('patientId');
      localStorage.removeItem('syncToken');
      return null;
    }
    return stored;
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const stored = localStorage.getItem('patientId');
    return isValidPatientId(stored);
  })
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [branding, setBranding] = useState<any>(null)

  useEffect(() => {
    async function loadBranding() {
      try {
        const settings = await request('GET', '/global/settings');
        setBranding(settings);
        if (settings.primary_color) {
          const hslString = hexToHslValues(settings.primary_color);
          document.documentElement.style.setProperty('--primary', hslString);
        }
        if (settings.name) {
          document.title = `${settings.name} Patient Portal`;
        }
      } catch (err) {
        console.error('Failed to load branding:', err);
      }
    }
    loadBranding();
  }, []);

  const handleAuthSuccess = (id: string) => {
    setIsAuthenticated(true)
    setPatientId(id)
  }

  const handleLogout = () => {
    localStorage.removeItem('patientId')
    localStorage.removeItem('syncToken')
    setIsAuthenticated(false)
    setPatientId(null)
    setSessionCompleted(false)
  }

  const handleSessionSuccess = () => {
    setShowCheckIn(false)
    setSessionCompleted(true)
  }

  if (!isAuthenticated) {
    return <PinEntry onSuccess={handleAuthSuccess} branding={branding} />
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary font-bold">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={branding.name} className="h-6 w-auto object-contain rounded" />
            ) : (
              <Dumbbell size={24} />
            )}
            <span className="tracking-tight italic uppercase">{branding?.name || 'Revive'} Patient Portal</span>
          </div>
          <button 
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {sessionCompleted ? (
          <div className="py-20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
             <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-primary/5">
                <CheckCircle size={48} />
             </div>
             <div className="space-y-2">
                <h2 className="text-3xl font-bold font-heading italic uppercase tracking-tight text-foreground">Session Logged</h2>
                <p className="text-muted-foreground font-medium">Your progress and feedback have been shared with your clinician.</p>
             </div>
             <div className="pt-6">
                <button 
                  onClick={() => setSessionCompleted(false)}
                  className="bg-muted text-muted-foreground px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-muted/80 transition-all"
                >
                  Return to Routine
                </button>
             </div>
          </div>
        ) : (
          patientId && <ExerciseList patientId={patientId} onFinishSession={() => setShowCheckIn(true)} />
        )}
      </main>

      {showCheckIn && patientId && (
        <DailyCheckIn 
          patientId={patientId} 
          onClose={() => setShowCheckIn(false)} 
          onSuccess={handleSessionSuccess} 
        />
      )}
      
      {!sessionCompleted && (
        <div className="max-w-2xl mx-auto px-6 pb-20 opacity-50">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <Sparkles size={12} className="text-primary" /> End-to-end Encrypted Recovery Suite
            </div>
        </div>
      )}
    </div>
  )
}

export default App
