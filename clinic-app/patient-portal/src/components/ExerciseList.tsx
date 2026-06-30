import { useState, useEffect } from 'react';
import { request } from '../lib/api';
import { Loader2, AlertCircle, Dumbbell, Activity, PlayCircle, Circle, CheckCircle2 } from 'lucide-react';

interface Exercise {
  exercise_name: string;
  sets: string;
  reps: string;
  frequency: string;
  instructions: string;
  notes?: string;
  video_url?: string;
  doctors?: {
    name: string;
  } | null;
}

interface ExerciseListProps {
  patientId: string;
  onFinishSession: () => void;
}

export function ExerciseList({ patientId, onFinishSession }: ExerciseListProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (loading && isMounted) {
        setError('Connection timed out. Please check your internet or server configuration.');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    async function fetchPlan() {
      // Validate UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
      if (!isUuid) {
        setError('Invalid session. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        const data = await request('GET', '/patient-portal/exercises');

        if (!isMounted) return;

        if (!data || data.length === 0) {
          setError('No exercise plan found for this patient. Please contact your clinician.');
        } else {
          setExercises(data);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching plan:', err);
        setError(err.message || 'An unexpected error occurred while fetching your plan.');
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    }

    fetchPlan();
    return () => { 
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [patientId]);

  const toggleComplete = (idx: number) => {
    setCompleted(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="font-medium animate-pulse">Syncing your protocol...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-destructive" />
        <h3 className="text-lg font-bold text-destructive">Connection Error</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading italic uppercase tracking-tight">Today's Routine</h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Prescribed Protocol</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl flex items-center gap-2">
           <Activity size={16} />
           <span className="text-xs font-bold">{exercises.length} Exercises</span>
        </div>
      </div>

      <div className="grid gap-4">
        {exercises.map((ex, idx) => (
          <div 
            key={idx} 
            className={`bg-card rounded-3xl border transition-all p-6 relative overflow-hidden group ${completed[idx] ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/20'}`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${completed[idx] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Dumbbell size={20} />
                  </div>
                  <h3 className={`font-bold text-lg leading-tight uppercase italic ${completed[idx] ? 'text-primary' : 'text-foreground'}`}>
                    {ex.exercise_name}
                  </h3>
                  {(ex as any).doctors?.name && (
                    <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-widest border border-primary/10">
                      Assigned by: Dr. {(ex as any).doctors.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                   <div className="bg-muted/30 p-3 rounded-2xl border border-border/50 text-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Sets</p>
                      <p className="text-sm font-bold text-foreground">{ex.sets || '-'}</p>
                   </div>
                   <div className="bg-muted/30 p-3 rounded-2xl border border-border/50 text-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Reps</p>
                      <p className="text-sm font-bold text-foreground">{ex.reps || '-'}</p>
                   </div>
                   <div className="bg-muted/30 p-3 rounded-2xl border border-border/50 text-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Freq</p>
                      <p className="text-sm font-bold text-primary">{ex.frequency || '-'}</p>
                   </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    {ex.instructions}
                  </p>
                  {ex.notes && (
                    <div className="bg-destructive/5 text-destructive border-l-2 border-destructive p-3 rounded-r-xl text-xs font-bold italic">
                      Note: {ex.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => toggleComplete(idx)}
                  title={completed[idx] ? "Mark as Incomplete" : "Mark as Complete"}
                  aria-label={completed[idx] ? "Mark as Incomplete" : "Mark as Complete"}
                  className={`p-4 rounded-2xl transition-all active:scale-90 ${completed[idx] ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground border border-border hover:border-primary/30'}`}
                >
                  {completed[idx] ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                {ex.video_url ? (
                  <a 
                    href={ex.video_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    title="Watch Video Tutorial"
                    className="p-3 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl border border-primary/20 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                  >
                     <PlayCircle size={24} />
                  </a>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-2xl text-muted-foreground/30 border border-border/50" title="No Video Tutorial Available">
                     <PlayCircle size={24} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/90 to-transparent pt-12 z-40">
        <button 
          onClick={onFinishSession}
          className="w-full max-w-2xl mx-auto block bg-foreground text-background py-5 rounded-3xl font-bold uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm"
        >
          Finish Session & Log Progress
        </button>
      </div>
    </div>
  );
}
