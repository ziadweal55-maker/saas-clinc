import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { PackageStatus } from '../types';

interface ProgressTabProps {
  clientId: number;
}

export function ProgressTab({ clientId }: ProgressTabProps) {
  const [packageStatus, setPackageStatus] = useState<PackageStatus>({ total: 0, used: 0 });
  const [recoveryStats, setRecoveryStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (window.api) {
        const [pkg, recovery] = await Promise.all([
          (window.api as any).getClientPackageStatus(clientId),
          (window.api as any).getRecoveryStats(clientId)
        ]);
        setPackageStatus(pkg || { total: 0, used: 0 });
        setRecoveryStats(recovery || []);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [clientId]);

  if (isLoading) return <div className="p-8 text-center text-primary font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing Recovery Metrics...</div>;

  const chartHeight = 120;
  const chartWidth = 400;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm group hover:border-primary/20 transition-all">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 italic">Session Package Status</h3>
          {packageStatus.total > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-4xl font-black text-foreground tabular-nums tracking-tighter">{Math.max(0, packageStatus.total - packageStatus.used)}</span>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">SESSIONS REMAINING</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                  style={{ width: `${Math.min(100, (packageStatus.used / packageStatus.total) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
                <span>Total: {packageStatus.total} Sessions</span>
                <span>Used: {packageStatus.used}</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
               <p className="text-muted-foreground italic text-xs font-medium">No active session packages detected.</p>
            </div>
          )}
        </div>

        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm group hover:border-primary/20 transition-all">
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 italic">Latest Pain Score</h3>
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-2xl ${
              recoveryStats.length > 0 && recoveryStats[recoveryStats.length-1].pain_scale >= 7 ? 'bg-destructive shadow-destructive/20' : 
              recoveryStats.length > 0 && recoveryStats[recoveryStats.length-1].pain_scale >= 4 ? 'bg-orange-500 shadow-orange-500/20' : 
              'bg-emerald-600 shadow-emerald-600/20'
            }`}>
              {recoveryStats.length > 0 ? recoveryStats[recoveryStats.length-1].pain_scale : '-'}
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">CURRENT STATUS</div>
              <div className="text-lg font-black text-foreground uppercase italic tracking-tighter">
                {recoveryStats.length > 0 ? (
                  recoveryStats[recoveryStats.length-1].pain_scale >= 7 ? 'High Sensitivity' : 
                  recoveryStats.length > 0 && recoveryStats[recoveryStats.length-1].pain_scale >= 4 ? 'Moderate Pain' : 
                  'Low Pain / Recovery'
                ) : 'No Assessment Data'}
              </div>
            </div>
          </div>
          {recoveryStats.length > 1 && (
            <div className="mt-4 pt-4 border-t border-border">
              <span className={`text-[10px] font-black uppercase tracking-widest ${recoveryStats[recoveryStats.length-1].pain_scale < recoveryStats[recoveryStats.length-2].pain_scale ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {recoveryStats[recoveryStats.length-1].pain_scale < recoveryStats[recoveryStats.length-2].pain_scale ? '↘ Improved Pain Threshold' : 'Consistent baseline'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-8 italic">Pain Scale Progression</h3>
        {recoveryStats.length < 2 ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-border rounded-3xl bg-muted/5">
            <Activity size={40} className="mb-4 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Insufficient History for Trending</p>
          </div>
        ) : (
          <div className="relative pt-6">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-48 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="painGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              {[0, 0.5, 1].map((p, i) => (
                <line 
                  key={i}
                  x1="0" y1={chartHeight * p} x2={chartWidth} y2={chartHeight * p}
                  stroke="currentColor" className="text-border/50" strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}
              
              {/* Area */}
              <path
                d={`M 0 ${chartHeight} ${recoveryStats.map((s, i) => 
                  `L ${(i / (recoveryStats.length - 1)) * chartWidth} ${chartHeight - (s.pain_scale / 10) * chartHeight}`
                ).join(' ')} L ${chartWidth} ${chartHeight} Z`}
                fill="url(#painGradient)"
              />
              
              {/* Line */}
              <path
                d={recoveryStats.map((s, i) => 
                  `${i === 0 ? 'M' : 'L'} ${(i / (recoveryStats.length - 1)) * chartWidth} ${chartHeight - (s.pain_scale / 10) * chartHeight}`
                ).join(' ')}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Points */}
              {recoveryStats.map((s, i) => (
                <circle
                  key={i}
                  cx={(i / (recoveryStats.length - 1)) * chartWidth}
                  cy={chartHeight - (s.pain_scale / 10) * chartHeight}
                  r="6"
                  className="fill-card stroke-primary"
                  strokeWidth="3"
                />
              ))}
            </svg>
            
            <div className="flex justify-between mt-8 pt-4 border-t border-border">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Baseline Entry</span>
                <span className="text-xs font-bold text-foreground">{new Date(recoveryStats[0].date).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Latest Score</span>
                <span className="text-xs font-bold text-primary">{recoveryStats[recoveryStats.length - 1].pain_scale}/10 Level</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {recoveryStats.length > 0 && (
         <div className="bg-muted/20 p-8 rounded-3xl border border-border">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 italic">Mobility & Strength Log</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recoveryStats.slice(-4).reverse().map((r, i) => (
                  <div key={i} className="bg-card p-4 rounded-2xl border border-border shadow-sm flex justify-between items-center">
                     <div>
                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{new Date(r.date).toLocaleDateString()}</div>
                        <div className="text-sm font-bold text-foreground italic truncate max-w-[200px]">ROM: {r.rom || 'N/A'}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">STRENGTH</div>
                        <div className="text-sm font-black text-foreground">{r.strength || 'N/A'}</div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
}
