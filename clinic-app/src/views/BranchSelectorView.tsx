import { useState, useEffect } from 'react';
import { Building2, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';

interface Branch {
  id: number;
  name: string;
  is_active: number;
}

interface BranchSelectorViewProps {
  onBranchSelected: (branch: Branch) => void;
  userDisplayName: string;
}

export function BranchSelectorView({ onBranchSelected, userDisplayName }: BranchSelectorViewProps) {
  const { tenantSettings } = useTenant();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await (window.api as any).getBranches();
      setBranches(data || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (branch: Branch) => {
    setSelecting(branch.id);
    try {
      await (window.api as any).setCurrentBranch(branch.id);
      onBranchSelected(branch);
    } catch (err) {
      console.error('Error setting branch:', err);
      setSelecting(null);
    }
  };

  // Branch accent colors for visual differentiation
  const branchColors = [
    { bg: 'from-violet-600/20 to-purple-600/10', border: 'border-violet-500/30', icon: 'bg-violet-500/20 text-violet-400', hover: 'hover:border-violet-400/60' },
    { bg: 'from-cyan-600/20 to-teal-600/10', border: 'border-cyan-500/30', icon: 'bg-cyan-500/20 text-cyan-400', hover: 'hover:border-cyan-400/60' },
    { bg: 'from-amber-600/20 to-orange-600/10', border: 'border-amber-500/30', icon: 'bg-amber-500/20 text-amber-400', hover: 'hover:border-amber-400/60' },
    { bg: 'from-emerald-600/20 to-green-600/10', border: 'border-emerald-500/30', icon: 'bg-emerald-500/20 text-emerald-400', hover: 'hover:border-emerald-400/60' },
    { bg: 'from-rose-600/20 to-pink-600/10', border: 'border-rose-500/30', icon: 'bg-rose-500/20 text-rose-400', hover: 'hover:border-rose-400/60' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-2xl mb-6 shadow-lg shadow-primary/10">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground font-heading italic mb-2">
            {tenantSettings?.name || 'Clinic Management'}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-muted-foreground mb-6">Clinical Intelligence Suite</p>
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />
          <div className="flex items-center justify-center gap-2">
            <Building2 size={16} className="text-primary" />
            <h2 className="text-lg font-bold text-foreground">Select Branch</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, <span className="text-foreground font-semibold">{userDisplayName}</span>. Choose a branch to manage.
          </p>
        </div>

        {/* Branch Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={32} className="animate-spin text-primary" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No branches found. Please contact your administrator.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {branches.map((branch, idx) => {
              const colors = branchColors[idx % branchColors.length];
              const isSelecting = selecting === branch.id;
              return (
                <button
                  key={branch.id}
                  onClick={() => handleSelect(branch)}
                  disabled={selecting !== null}
                  className={`
                    group relative w-full text-left p-6 rounded-2xl border bg-gradient-to-br
                    ${colors.bg} ${colors.border} ${colors.hover}
                    transition-all duration-200 
                    hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                  `}
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-xl ${colors.icon} transition-transform group-hover:scale-110 duration-200`}>
                      <Building2 size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground tracking-tight">{branch.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">
                        Branch #{branch.id} · Active
                      </p>
                    </div>
                    <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                      {isSelecting ? (
                        <RefreshCw size={20} className="animate-spin" />
                      ) : (
                        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1 duration-200" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">
            Each branch operates with fully isolated data. Your selection sets the active branch for this session.
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-3 font-medium">
            Version 4.0.0-REVIVE · Multi-Branch Edition
          </p>
        </div>
      </div>
    </div>
  );
}
