import { useState } from 'react';
import { request } from '../lib/api';
import { Thermometer, CheckCircle, Loader2, AlertCircle, X, MessageSquare } from 'lucide-react';

interface DailyCheckInProps {
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DailyCheckIn({ patientId, onClose, onSuccess }: DailyCheckInProps) {
  const [painLevel, setPainLevel] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate patient ID (can be integer or UUID)
    const isValid = /^\d+$/.test(patientId) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
    if (!isValid) {
      setError('Invalid session. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await request('POST', '/patient-portal/checkin', {
        painLevel,
        notes: notes.trim() || 'No specific observations provided.'
      });

      onSuccess();
    } catch (err: unknown) {
      console.error('Error logging session:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  const painColors = [
    'bg-emerald-500', 'bg-emerald-400', 'bg-green-400', 'bg-lime-400', 'bg-yellow-400',
    'bg-orange-400', 'bg-orange-500', 'bg-red-400', 'bg-red-500', 'bg-red-600', 'bg-red-900'
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-2xl p-8 space-y-8 animate-in slide-in-from-bottom-10 duration-500 relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-muted-foreground hover:bg-muted rounded-xl transition-all"
        >
          <X size={20} />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-4 bg-accent/10 text-accent rounded-3xl mb-2">
            <Thermometer size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground font-heading italic uppercase tracking-tight">Recovery Check-in</h2>
          <p className="text-muted-foreground font-medium text-sm max-w-[280px] mx-auto">How was your pain level during today's routine?</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <button
                key={level}
                onClick={() => setPainLevel(level)}
                className={`h-10 flex items-center justify-center rounded-xl font-black text-sm transition-all ${
                  painLevel === level 
                    ? `${painColors[level]} text-white scale-110 shadow-lg ring-4 ring-background` 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
             <span>No Pain</span>
             <span>Severe</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest px-1">
            <MessageSquare size={14} />
            <span>Additional Observations</span>
          </div>
          <textarea 
            placeholder="How are you feeling? Any specific discomfort? (Optional)"
            className="w-full bg-muted/50 border border-border rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all min-h-[100px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || painLevel === null}
          className="w-full bg-primary text-primary-foreground py-4 rounded-3xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : <><CheckCircle size={20} /> Submit Feedback</>}
        </button>

        <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest">Data is securely synced with your clinician</p>
      </div>
    </div>
  );
}
