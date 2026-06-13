import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  UserX, 
  Search, 
  Building2, 
  User, 
  Calendar, 
  Activity, 
  Check, 
  X, 
  RefreshCw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export function AccountRequestsView() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadRequests = async () => {
    setLoading(true);
    try {
      if (window.api && (window.api as any).getPendingAccounts) {
        const data = await (window.api as any).getPendingAccounts();
        setRequests(data || []);
      }
    } catch (err) {
      console.error('Error loading account requests:', err);
      if ((window as any).showToast) {
        (window as any).showToast('Failed to load registration requests.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (userId: number, username: string) => {
    const confirmed = window.api.confirm 
      ? window.api.confirm(`Are you sure you want to approve the account for "${username}"?`)
      : window.confirm(`Are you sure you want to approve the account for "${username}"?`);
      
    if (!confirmed) return;

    try {
      if (window.api && (window.api as any).approveAccountRequest) {
        const res = await (window.api as any).approveAccountRequest(userId);
        if (res.success) {
          if ((window as any).showToast) {
            (window as any).showToast(`Account "${username}" approved successfully!`, 'success');
          }
          loadRequests();
        } else {
          if ((window as any).showToast) {
            (window as any).showToast(`Error approving account: ${res.error}`, 'error');
          }
        }
      }
    } catch (err: any) {
      if ((window as any).showToast) {
        (window as any).showToast(`System Error: ${err.message}`, 'error');
      }
    }
  };

  const handleDeny = async (userId: number, username: string) => {
    const confirmed = window.api.confirm 
      ? window.api.confirm(`Are you sure you want to deny the account request for "${username}"?`)
      : window.confirm(`Are you sure you want to deny the account request for "${username}"?`);
      
    if (!confirmed) return;

    try {
      if (window.api && (window.api as any).denyAccountRequest) {
        const res = await (window.api as any).denyAccountRequest(userId);
        if (res.success) {
          if ((window as any).showToast) {
            (window as any).showToast(`Account request for "${username}" denied.`, 'warning');
          }
          loadRequests();
        } else {
          if ((window as any).showToast) {
            (window as any).showToast(`Error denying request: ${res.error}`, 'error');
          }
        }
      }
    } catch (err: any) {
      if ((window as any).showToast) {
        (window as any).showToast(`System Error: ${err.message}`, 'error');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    // If it's already in DD/MM/YYYY, return it
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    
    try {
      // SQLite format is YYYY-MM-DD HH:MM:SS or similar
      const parts = dateStr.split(' ')[0].split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}/${month}/${year}`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      (req.username || '').toLowerCase().includes(term) ||
      (req.doctor_name || '').toLowerCase().includes(term) ||
      (req.role || '').toLowerCase().includes(term) ||
      (req.branch_name || '').toLowerCase().includes(term);

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'pending' && req.status === 'pending') ||
      (statusFilter === 'approved' && req.status === 'active') ||
      (statusFilter === 'denied' && req.status === 'denied');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground font-heading uppercase italic flex items-center gap-2">
            <ShieldCheck className="text-primary shrink-0 animate-pulse" size={26} /> 
            Credentials & Approvals
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            Review and authorize access requests for clinical staff and doctors
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-secondary/20 hover:bg-secondary/40 text-primary border border-primary/20 rounded-xl transition-all disabled:opacity-50 active:scale-95 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Requests
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search by Username, Doctor Name, Role, or Branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/20 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs font-medium text-foreground"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-muted/30 p-1 rounded-xl border border-border w-full md:w-auto overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'denied', label: 'Denied' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-background text-primary shadow-sm font-black'
                  : 'text-muted-foreground hover:bg-background/20 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw size={36} className="animate-spin text-primary" />
            <p className="text-xs uppercase font-bold text-muted-foreground animate-pulse tracking-widest font-heading">
              Loading requests...
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="inline-flex p-4 bg-muted/30 rounded-full text-muted-foreground mb-1">
              <User size={32} />
            </div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">No Requests Found</h3>
            <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto px-4">
              There are no registration requests matching your current filters. New signups will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-semibold text-foreground">
                {filteredRequests.map((req) => {
                  // Role styling
                  const roleStyle = req.role === 'doctor' 
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' 
                    : 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';

                  // Status styling
                  let statusStyle = 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
                  let statusLabel = 'Pending';
                  if (req.status === 'active') {
                    statusStyle = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
                    statusLabel = 'Approved';
                  } else if (req.status === 'denied') {
                    statusStyle = 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
                    statusLabel = 'Denied';
                  }

                  return (
                    <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                      {/* Branch */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                          <Building2 size={13} className="text-muted-foreground" />
                          {req.branch_name || `Branch ${req.branch_id}`}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] uppercase tracking-wider font-extrabold ${roleStyle}`}>
                          {req.role === 'doctor' ? <Activity size={10} /> : <User size={10} />}
                          {req.role}
                        </span>
                      </td>

                      {/* Doctor Name / Specialty */}
                      <td className="px-6 py-4">
                        {req.role === 'doctor' ? (
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-foreground">{req.doctor_name || 'N/A'}</span>
                            {req.doctor_specialty && (
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                                <Sparkles size={10} className="text-primary" /> {req.doctor_specialty}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-medium italic">-</span>
                        )}
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 font-mono text-muted-foreground text-[11px] font-bold">
                        {req.username}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Calendar size={13} />
                          {formatDate(req.created_at)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-wider font-black ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {req.status === 'pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(req.id, req.username)}
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl transition-all active:scale-90 flex items-center gap-1"
                              title="Approve Request"
                            >
                              <Check size={14} />
                              <span className="text-[9px] uppercase tracking-wider font-black px-1">Approve</span>
                            </button>
                            <button
                              onClick={() => handleDeny(req.id, req.username)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl transition-all active:scale-90 flex items-center gap-1"
                              title="Deny Request"
                            >
                              <X size={14} />
                              <span className="text-[9px] uppercase tracking-wider font-black px-1">Deny</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest italic pr-4">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
