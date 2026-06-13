import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Loader2, FlaskConical, CheckCircle2, AlertCircle } from 'lucide-react';

interface InvestigationLibraryItem {
  id: number;
  name: string;
}

export function InvestigationAdmin() {
  const [library, setLibrary] = useState<InvestigationLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadLibrary = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.getInvestigationLibrary) {
        const data = await window.api.getInvestigationLibrary();
        setLibrary(data || []);
      }
    } catch {
      showFeedback('Failed to load investigation library', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const handleAddTest = async () => {
    if (!newTestName.trim()) return;
    setSaving(true);
    try {
      if (window.api && window.api.addToInvestigationLibrary) {
        const res = await window.api.addToInvestigationLibrary(newTestName.trim());
        if (res.success) {
          setNewTestName('');
          showFeedback('Test registered to diagnostic library successfully', 'success');
          await loadLibrary();
        } else {
          showFeedback(res.error || 'Failed to add test', 'error');
        }
      }
    } catch (err: any) {
      showFeedback(err.message || 'System error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTest = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to permanently delete "${name}" from the Investigation Library? This will also remove any assigned records of this test from all patients.`)) {
      try {
        if (window.api && window.api.deleteFromInvestigationLibrary) {
          const res = await window.api.deleteFromInvestigationLibrary(id);
          if (res.success) {
            showFeedback('Test removed from library', 'success');
            await loadLibrary();
          } else {
            showFeedback(res.error || 'Failed to delete test', 'error');
          }
        }
      } catch (err: any) {
        showFeedback(err.message || 'System error occurred', 'error');
      }
    }
  };

  const filteredLibrary = library.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-sm font-semibold tracking-wide uppercase">Syncing Diagnostic Library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border animate-fadeIn
            ${feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
        </div>
      )}

      {/* Quick Register Test */}
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <FlaskConical size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-heading">Register New Diagnostic Test</h3>
            <p className="text-xs text-muted-foreground font-medium">Add a standardized investigation type for nutrition protocols.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="e.g. Complete Blood Count (CBC), Fasting Blood Sugar, Vitamin D3..."
            className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-semibold text-xs text-foreground placeholder:text-muted-foreground"
            value={newTestName}
            onChange={(e) => setNewTestName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTest()}
          />
          <button
            onClick={handleAddTest}
            disabled={saving || !newTestName.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Register Test
          </button>
        </div>
      </div>

      {/* Tests List & Search */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden space-y-4 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="font-bold text-foreground font-heading text-sm">Diagnostic Test Repository</h4>
            <p className="text-xs text-muted-foreground font-medium">Total: {library.length} Registered Tests</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search registered tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-muted/30 border border-border rounded-xl text-foreground font-medium outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="max-h-[350px] overflow-y-auto divide-y divide-border pr-1 custom-scrollbar bg-card">
            {filteredLibrary.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                No matching diagnostic tests in repository
              </div>
            ) : (
              filteredLibrary.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 hover:bg-muted/10 group transition-all">
                  <div className="flex items-center gap-3">
                    <FlaskConical size={14} className="text-primary/70 shrink-0" />
                    <span className="text-xs font-bold text-foreground">{item.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTest(item.id, item.name)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    title="Remove from Library"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
