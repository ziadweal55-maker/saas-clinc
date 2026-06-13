import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Power, Check, X, AlertCircle, RefreshCw } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
  is_active: number;
}

export function BranchManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add branch state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await (window.api as any).getAllBranches();
      setBranches(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setAddLoading(true);
    setError('');
    try {
      const res = await (window.api as any).addBranch(newBranchName.trim());
      if (res.success) {
        setNewBranchName('');
        setShowAddForm(false);
        loadBranches();
      } else {
        setError(res.error || 'Failed to add branch.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setAddLoading(false);
    }
  };

  const startRename = (branch: Branch) => {
    setRenamingId(branch.id);
    setRenameValue(branch.name);
    setError('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRename = async (branchId: number) => {
    if (!renameValue.trim()) return;
    setRenameLoading(true);
    setError('');
    try {
      const res = await (window.api as any).renameBranch({ branchId, newName: renameValue.trim() });
      if (res.success) {
        setRenamingId(null);
        loadBranches();
      } else {
        setError(res.error || 'Failed to rename branch.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeactivate = async (branchId: number, branchName: string) => {
    const confirmed = window.api.confirm(`Deactivate "${branchName}"? Users will no longer see this branch at login.`);
    if (!confirmed) return;
    setError('');
    try {
      const res = await (window.api as any).deactivateBranch(branchId);
      if (res.success) {
        loadBranches();
      } else {
        setError(res.error || 'Failed to deactivate branch.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  const handleReactivate = async (branchId: number, branchName: string) => {
    const confirmed = window.api.confirm(`Reactivate "${branchName}"? Users will be able to see and select this branch at login again.`);
    if (!confirmed) return;
    setError('');
    try {
      const res = await (window.api as any).reactivateBranch(branchId);
      if (res.success) {
        loadBranches();
      } else {
        setError(res.error || 'Failed to reactivate branch.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Branch Management</h3>
            <p className="text-xs text-muted-foreground">Add, rename, and manage clinic branches</p>
          </div>
        </div>
        <button
          onClick={() => { setShowAddForm(v => !v); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={14} />
          Add Branch
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-start gap-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddBranch} className="p-5 bg-muted/30 rounded-2xl border border-border space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Branch Name</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="e.g., Tanta Branch"
              className="flex-1 px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium text-foreground"
              autoFocus
            />
            <button
              type="submit"
              disabled={addLoading || !newBranchName.trim()}
              className="px-5 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all hover:opacity-90"
            >
              {addLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewBranchName(''); setError(''); }}
              className="px-4 py-3 bg-muted text-muted-foreground rounded-xl text-xs font-bold hover:bg-muted/80 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Branches List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                branch.is_active
                  ? 'bg-card border-border'
                  : 'bg-muted/20 border-border/50 opacity-60'
              }`}
            >
              {/* Icon */}
              <div className={`p-2.5 rounded-xl ${branch.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Building2 size={18} />
              </div>

              {/* Name / Rename Input */}
              <div className="flex-1 min-w-0">
                {renamingId === branch.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(branch.id); if (e.key === 'Escape') cancelRename(); }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-primary text-sm font-medium text-foreground focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(branch.id)}
                      disabled={renameLoading || !renameValue.trim()}
                      className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {renameLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    </button>
                    <button
                      onClick={cancelRename}
                      className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-sm text-foreground">{branch.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Branch #{branch.id} · {branch.is_active ? <span className="text-emerald-400 font-semibold">Active</span> : <span className="text-rose-400 font-semibold">Deactivated</span>}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {renamingId !== branch.id && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startRename(branch)}
                    title="Rename branch"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <Pencil size={14} />
                  </button>
                  {branch.is_active && branch.id !== 1 && (
                    <button
                      onClick={() => handleDeactivate(branch.id, branch.name)}
                      title="Deactivate branch"
                      className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                    >
                      <Power size={14} />
                    </button>
                  )}
                  {!branch.is_active && (
                    <button
                      onClick={() => handleReactivate(branch.id, branch.name)}
                      title="Reactivate branch"
                      className="p-2 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {branch.id === 1 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 px-2">Primary</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
