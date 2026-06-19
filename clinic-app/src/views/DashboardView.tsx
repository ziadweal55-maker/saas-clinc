import { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Users, Activity, Sparkles, ChevronRight, Calendar, Database, Layout, CheckCircle, ClipboardList, Info, Search, Filter, QrCode, Monitor, Shield, Stethoscope } from 'lucide-react';
import QRCode from 'react-qr-code';
import { User } from '../types';
import { useTenant } from '../hooks/useTenant';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  currentUser?: User | null;
}

export function DashboardView({ onNavigate, currentUser }: DashboardViewProps) {
  const { tenantSettings } = useTenant();
  const isFeatureEnabled = useCallback((key: string) => {
    if (!tenantSettings || !tenantSettings.features) return true;
    return !!(tenantSettings.features as Record<string, boolean>)[key];
  }, [tenantSettings]);

  const visibleCardsCount = [
    isFeatureEnabled('calendar'),
    isFeatureEnabled('patients'),
    isFeatureEnabled('finance')
  ].filter(Boolean).length;

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({ clientsCount: 0, todayAppointments: 0, totalIncome: 0, resetDate: '' });
  const [showAllTime, setShowAllTime] = useState(false);
  const [todayApps, setTodayApps] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [painTestResults, setPainTestResults] = useState<any[]>([]);
  const [isSyncingTests, setIsSyncingTests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [tailscaleUrl, setTailscaleUrl] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<Array<{ username: string; role: string; currentView: string; ip: string; lastSeen: number }>>([]);

  const loadStats = useCallback(() => {
    if (window.api?.getDashboardStats) {
      window.api.getDashboardStats(showAllTime).then(setStats).catch(console.error);
    }
  }, [showAllTime]);

  const loadTodayApps = useCallback(() => {
    if (window.api?.getTodayAppointments) {
      window.api.getTodayAppointments().then(setTodayApps).catch(console.error);
    }
  }, []);

  const loadAlerts = useCallback(() => {
    if (window.api?.getHighPainAlerts) {
      window.api.getHighPainAlerts().then(res => {
        if (res.success) {
          setAlerts(res.data || []);
        }
      }).catch(console.error);
    }
  }, []);

  const loadPainTests = useCallback(async () => {
    if (window.api?.getPainTestResults) {
      setIsSyncingTests(true);
      try {
        const res = await window.api.getPainTestResults();
        if (res.success) {
          setPainTestResults(res.data || []);
        } else {
          console.error('Pain test sync failed:', res.error);
        }
      } catch (err) {
        console.error('Failed to load pain tests:', err);
      } finally {
        setIsSyncingTests(false);
      }
    }
  }, []);

  const loadActiveSessions = useCallback(() => {
    if (currentUser?.role === 'admin' && window.api?.getActiveSessions) {
      window.api.getActiveSessions().then(setActiveSessions).catch(console.error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadStats();
    loadTodayApps();
    loadAlerts();
    loadPainTests();
    if (window.api?.getLocalUrl) {
      window.api.getLocalUrl().then(setLocalUrl).catch(console.error);
    }
    if (window.api?.getTailscaleUrl) {
      window.api.getTailscaleUrl().then(setTailscaleUrl).catch(console.error);
    }

    if (currentUser?.role === 'admin') {
      loadActiveSessions();
      const interval = setInterval(loadActiveSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [showAllTime, currentUser, loadStats, loadTodayApps, loadAlerts, loadPainTests, loadActiveSessions]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!tenantSettings?.id) return;
      try {
        const baseUrl = import.meta.env.VITE_API_URL 
          ? import.meta.env.VITE_API_URL.replace('/api/v1', '') 
          : 'http://127.0.0.1:3000';
        const res = await fetch(`${baseUrl}/api/v1/global/announcements?tenant=${tenantSettings.id}`);
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data);
        }
      } catch (err) {
        console.error('Failed to load announcements:', err);
      }
    };
    fetchAnnouncements();
  }, [tenantSettings?.id]);

  // Search and Grouping Logic
  const groupedResults = useMemo(() => {
    const sorted = [...painTestResults].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const filtered = sorted.filter(test => {
      const name = test.patients ? `${test.patients.first_name} ${test.patients.last_name || ''}`.toLowerCase() : `id: ${test.patient_id}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });

    const groups: Record<string, any[]> = {};
    filtered.forEach(test => {
      const date = new Date(test.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(test);
    });
    return groups;
  }, [painTestResults, searchQuery]);

  const isDoctor = currentUser?.role === 'doctor';

  if (isDoctor) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-heading tracking-tight italic uppercase">Recovery Monitoring</h1>
            <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Real-time patient clinical pain assessments.</p>
          </div>
        </div>

        {/* Detailed Pain Analysis Section */}
        <div className="bg-card border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-xl">
          <div className="px-4 py-4 md:px-8 md:py-6 border-b border-border bg-muted/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner shrink-0">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-foreground tracking-tight uppercase italic">Recovery Monitoring</h3>
                  <p className="text-[9px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Clinical Pain Assessments</p>
                </div>
              </div>

              <div className="flex flex-1 max-w-full lg:max-w-md items-center gap-3 bg-background border border-border px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all order-3 lg:order-2">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input 
                  type="text"
                  placeholder="Search patient..."
                  className="bg-transparent border-none outline-none text-xs md:text-sm font-bold w-full placeholder:text-muted-foreground/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button 
                onClick={loadPainTests}
                disabled={isSyncingTests}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-2.5 md:py-3 bg-primary text-primary-foreground rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap shadow-lg shadow-primary/10 order-2 lg:order-3"
              >
                <Database size={14} className={isSyncingTests ? 'animate-spin' : ''} />
                {isSyncingTests ? 'Syncing...' : 'Sync Cloud'}
              </button>
            </div>
          </div>

          <div className="p-0 h-[600px] overflow-y-auto custom-scrollbar">
            {Object.keys(groupedResults).length === 0 ? (
              <div className="text-center py-12 md:py-20 bg-muted/10">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
                  <Filter size={24} />
                </div>
                <p className="text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-widest px-4">No matching assessments found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {Object.entries(groupedResults).map(([date, tests]) => (
                  <div key={date} className="bg-background">
                    <div className="px-4 py-2 md:px-8 md:py-3 bg-muted/40 sticky top-0 z-10 backdrop-blur-md border-b border-border/50">
                      <h4 className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em] italic flex items-center gap-2">
                        <Calendar size={10} /> {date}
                      </h4>
                    </div>
                    <div className="divide-y divide-border/50">
                      {tests.map((test, idx) => (
                        <div key={idx} className="px-4 py-4 md:px-8 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 hover:bg-muted/20 transition-colors group">
                          <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-white shadow-xl transition-transform group-hover:scale-110 shrink-0 ${
                              (test.pain_score || test.pain_level) >= 7 ? 'bg-destructive shadow-destructive/20' : 
                              (test.pain_score || test.pain_level) >= 4 ? 'bg-orange-500 shadow-orange-500/20' : 
                              'bg-emerald-600 shadow-emerald-600/20'
                            }`}>
                              {test.pain_score || test.pain_level || 0}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-sm md:text-base text-foreground group-hover:text-primary transition-colors truncate uppercase italic tracking-tight">
                                {test.patients ? `${test.patients.first_name} ${test.patients.last_name || ''}` : `ID: ${test.patient_id}`}
                              </div>
                              <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-1">
                                <span className="text-[8px] md:text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider border border-primary/10">
                                  {test.test_type || 'Daily Check'}
                                </span>
                                <span className="text-[8px] md:text-[10px] text-muted-foreground font-bold tabular-nums">
                                  {new Date(test.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 max-w-full md:max-w-xl md:px-6">
                             <div className="bg-muted/30 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-border/50 group-hover:border-primary/20 transition-all flex gap-2 md:gap-3">
                                <Info size={14} className="text-primary shrink-0 mt-0.5" />
                                <p className="text-[10px] md:text-xs text-muted-foreground font-medium italic leading-relaxed line-clamp-2 md:line-clamp-none">
                                  {test.notes || 'No clinical observations provided.'}
                                </p>
                             </div>
                          </div>

                          <div className="flex items-center gap-2 text-emerald-600 self-end md:self-center">
                             <CheckCircle size={14} />
                             <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Verified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-heading tracking-tight italic">CLINICAL DASHBOARD</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Real-time patient monitoring and practice metrics.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border shadow-inner w-full md:w-auto">
          <button 
            onClick={() => setShowAllTime(false)}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${!showAllTime ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}>
            Session
          </button>
          <button 
            onClick={() => setShowAllTime(true)}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${showAllTime ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}>
            All Time
          </button>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((ann) => {
            const colors = {
              info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
              warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
              maintenance: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
              feature: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            };
            const typeColor = colors[ann.type as 'info' | 'warning' | 'maintenance' | 'feature'] || colors.info;
            return (
              <div key={ann.id} className={`${typeColor} border rounded-2xl p-4 flex gap-3 shadow-sm items-start`}>
                <Sparkles size={20} className="shrink-0 mt-0.5" style={{ color: 'currentColor' }} />
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider">{ann.title}</h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{ann.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {isFeatureEnabled('assessments') && alerts.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-destructive">
            <Activity size={20} className="animate-pulse" />
            <h2 className="text-base md:text-lg font-black uppercase italic">Critical Pain Alerts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex justify-between items-center bg-card p-3 md:p-4 rounded-xl border border-destructive/10 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 md:gap-4">
                   <div className="w-8 h-8 md:w-10 md:h-10 bg-destructive text-destructive-foreground rounded-lg flex items-center justify-center font-black text-base md:text-lg shadow-lg shadow-destructive/20">
                     {alert.pain_level}
                   </div>
                   <div>
                     <div className="font-bold text-foreground text-xs md:text-sm">
                       {alert.patients?.first_name || `Patient ID: ${alert.patient_id}`}
                     </div>
                     <div className="text-[8px] md:text-[10px] text-destructive font-black uppercase tracking-wider">Urgent Attention</div>
                   </div>
                </div>
                <div className="text-right text-[8px] md:text-[10px] text-muted-foreground font-bold uppercase tabular-nums">
                  {new Date(alert.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Pain Analysis Section */}
      {isFeatureEnabled('assessments') && (
        <div className="bg-card border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-xl">
          <div className="px-4 py-4 md:px-8 md:py-6 border-b border-border bg-muted/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner shrink-0">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-foreground tracking-tight uppercase italic">Recovery Monitoring</h3>
                  <p className="text-[9px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Clinical Pain Assessments</p>
                </div>
              </div>

              <div className="flex flex-1 max-w-full lg:max-w-md items-center gap-3 bg-background border border-border px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all order-3 lg:order-2">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input 
                  type="text"
                  placeholder="Search patient..."
                  className="bg-transparent border-none outline-none text-xs md:text-sm font-bold w-full placeholder:text-muted-foreground/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button 
                onClick={loadPainTests}
                disabled={isSyncingTests}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-2.5 md:py-3 bg-primary text-primary-foreground rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap shadow-lg shadow-primary/10 order-2 lg:order-3"
              >
                <Database size={14} className={isSyncingTests ? 'animate-spin' : ''} />
                {isSyncingTests ? 'Syncing...' : 'Sync Cloud'}
              </button>
            </div>
          </div>

          <div className="p-0 h-[400px] md:h-[500px] overflow-y-auto custom-scrollbar">
            {Object.keys(groupedResults).length === 0 ? (
              <div className="text-center py-12 md:py-20 bg-muted/10">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
                  <Filter size={24} />
                </div>
                <p className="text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-widest px-4">No matching assessments found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {Object.entries(groupedResults).map(([date, tests]) => (
                  <div key={date} className="bg-background">
                    <div className="px-4 py-2 md:px-8 md:py-3 bg-muted/40 sticky top-0 z-10 backdrop-blur-md border-b border-border/50">
                      <h4 className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em] italic flex items-center gap-2">
                        <Calendar size={10} /> {date}
                      </h4>
                    </div>
                    <div className="divide-y divide-border/50">
                      {tests.map((test, idx) => (
                        <div key={idx} className="px-4 py-4 md:px-8 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 hover:bg-muted/20 transition-colors group">
                          <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-white shadow-xl transition-transform group-hover:scale-110 shrink-0 ${
                              (test.pain_score || test.pain_level) >= 7 ? 'bg-destructive shadow-destructive/20' : 
                              (test.pain_score || test.pain_level) >= 4 ? 'bg-orange-500 shadow-orange-500/20' : 
                              'bg-emerald-600 shadow-emerald-600/20'
                            }`}>
                              {test.pain_score || test.pain_level || 0}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-sm md:text-base text-foreground group-hover:text-primary transition-colors truncate uppercase italic tracking-tight">
                                {test.patients ? `${test.patients.first_name} ${test.patients.last_name || ''}` : `ID: ${test.patient_id}`}
                              </div>
                              <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-1">
                                <span className="text-[8px] md:text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider border border-primary/10">
                                  {test.test_type || 'Daily Check'}
                                </span>
                                <span className="text-[8px] md:text-[10px] text-muted-foreground font-bold tabular-nums">
                                  {new Date(test.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 max-w-full md:max-w-xl md:px-6">
                             <div className="bg-muted/30 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-border/50 group-hover:border-primary/20 transition-all flex gap-2 md:gap-3">
                                <Info size={14} className="text-primary shrink-0 mt-0.5" />
                                <p className="text-[10px] md:text-xs text-muted-foreground font-medium italic leading-relaxed line-clamp-2 md:line-clamp-none">
                                  {test.notes || 'No clinical observations provided.'}
                                </p>
                             </div>
                          </div>

                          <div className="flex items-center gap-2 text-emerald-600 self-end md:self-center">
                             <CheckCircle size={14} />
                             <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Verified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {visibleCardsCount > 0 && (
        <div className={`grid grid-cols-1 ${
          visibleCardsCount === 3 ? 'md:grid-cols-3' : 
          visibleCardsCount === 2 ? 'md:grid-cols-2' : 
          'md:grid-cols-1'
        } gap-4 md:gap-6`}>
          {isFeatureEnabled('calendar') && (
            <div className="bg-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 group border-b-4 border-b-primary/50">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Clock size={18} />
                </div>
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">Daily Queue</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl md:text-4xl font-black text-foreground tabular-nums tracking-tighter">{stats.todayAppointments}</p>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Scheduled</span>
              </div>
            </div>
          )}
          
          {isFeatureEnabled('patients') && (
            <div className="bg-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 group border-b-4 border-b-emerald-500/50">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <Users size={18} />
                </div>
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">Active Load</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl md:text-4xl font-black text-foreground tabular-nums tracking-tighter">{stats.clientsCount}</p>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">In System</span>
              </div>
            </div>
          )}
          
          {isFeatureEnabled('finance') && (
            <div className="bg-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 group border-b-4 border-b-orange-500/50">
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                    <Activity size={18} />
                  </div>
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">Performance</h3>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-black text-orange-600 italic tracking-tighter">$</span>
                <p className="text-3xl md:text-4xl font-black text-foreground tabular-nums tracking-tighter">{(stats.totalIncome ?? 0).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-gradient-to-br from-primary to-blue-900 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-primary/20 shadow-2xl text-left relative overflow-hidden group">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-700"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-primary-foreground/80 mb-2">
                <Sparkles size={14} />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] italic">Revive Suite active</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-3 font-heading italic tracking-tighter leading-tight">ELITE CLINICAL MANAGEMENT</h2>
              <p className="text-primary-foreground/90 font-bold uppercase text-[8px] md:text-[10px] tracking-widest leading-relaxed max-w-xs md:max-w-md">Secure Database Syncing. AI Clinical Analysis. Automated Patient Feedback Loop.</p>
              
              <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3 md:gap-4">
                {isFeatureEnabled('patients') && (
                  <button 
                    onClick={() => onNavigate('clients')} 
                    className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white text-primary rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em] hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl">
                    <Users size={14} /> Manage Patients
                  </button>
                )}
                {isFeatureEnabled('calendar') && (
                  <button 
                    onClick={() => onNavigate('calendar')} 
                    className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-primary-foreground/10 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-primary-foreground/20 transition-all active:scale-95 border border-white/20 flex items-center justify-center gap-2">
                    <Clock size={14} /> Schedule
                  </button>
                )}
              </div>
            </div>
          </div>

          {isFeatureEnabled('calendar') && (
            <div className="bg-card rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-lg overflow-hidden">
              <div className="px-6 py-4 md:px-8 md:py-6 border-b border-border flex justify-between items-center bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Clock size={16} />
                  </div>
                  <h3 className="text-xs md:text-sm font-black text-foreground tracking-[0.1em] uppercase italic">session queue</h3>
                </div>
                <span className="text-[8px] md:text-[10px] font-black bg-primary text-primary-foreground px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                  {todayApps.length} session(s)
                </span>
              </div>
              
              <div className="p-0">
                {todayApps.length === 0 ? (
                  <div className="p-12 md:p-20 text-center flex flex-col items-center gap-4 bg-muted/5">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground/30 shadow-inner">
                      <Calendar size={24} />
                    </div>
                    <p className="text-muted-foreground text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Zero Sessions Logged</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {todayApps.map(apt => (
                      <div key={apt.id} className="px-4 py-4 md:px-8 md:py-6 flex justify-between items-center hover:bg-muted/50 transition-all group cursor-pointer active:bg-muted">
                        <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                          <div className="bg-primary/10 text-primary w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center font-black text-base md:text-xl border border-primary/10 group-hover:scale-110 transition-transform shadow-inner uppercase italic shrink-0">
                            {apt.first_name?.[0]}{apt.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-foreground group-hover:text-primary transition-colors text-sm md:text-lg uppercase italic tracking-tighter truncate">{apt.first_name} {apt.last_name}</div>
                            <div className="text-[8px] md:text-[10px] text-muted-foreground font-black uppercase tracking-widest truncate">{apt.phone}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8 shrink-0">
                          <div className="text-right">
                            <div className="font-black text-primary text-base md:text-xl tabular-nums tracking-tighter italic">
                              {new Date(apt.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' })}
                            </div>
                            <div className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mt-0.5">Clinical</div>
                          </div>
                          <ChevronRight size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 hidden sm:block" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {currentUser?.role === 'admin' && (
            <div className="bg-card p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-lg space-y-4 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center">
                <div className="text-primary text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 italic">
                  <Monitor size={16} /> LIVE CLINICAL PORTALS
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/10 relative">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 relative"></span>
                  <span className="text-[8px] font-black uppercase tracking-wider pl-1">Live ({activeSessions.length})</span>
                </div>
              </div>

              <div className="divide-y divide-border/60 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                {activeSessions.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">No other portals active</p>
                  </div>
                ) : (
                  activeSessions.map((session, i) => (
                    <div key={i} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 hover:bg-muted/10 transition-colors rounded-xl px-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          session.role === 'admin' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                          session.role === 'doctor' ? 'bg-primary/10 text-primary border border-primary/20' :
                          'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}>
                          {session.role === 'admin' ? <Shield size={14} /> :
                           session.role === 'doctor' ? <Stethoscope size={14} /> :
                           <Users size={14} />}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground uppercase tracking-tight italic flex items-center gap-1.5">
                            {session.username} 
                            {session.username === currentUser?.username && (
                              <span className="text-[7px] font-black bg-primary/20 text-primary border border-primary/20 px-1 py-0.2 rounded uppercase tracking-normal">You</span>
                            )}
                          </div>
                          <div className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                            View: <span className="text-primary">{session.currentView || 'Dashboard'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block text-[8px] font-mono font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border/80 tracking-wider">
                          {session.ip}
                        </span>
                        <div className="text-[7px] text-muted-foreground font-bold uppercase mt-1">
                          Active
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {(localUrl || tailscaleUrl) && (
            <div className="bg-card p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-lg animate-in zoom-in duration-500">
               <div className="text-primary text-[10px] uppercase tracking-[0.2em] font-black mb-6 flex items-center gap-2 italic">
                 <QrCode size={16} /> MOBILE & REMOTE ACCESS
               </div>
               <div className={`grid grid-cols-1 ${localUrl && tailscaleUrl ? 'md:grid-cols-2' : ''} gap-6`}>
                  {localUrl && (
                    <div className="flex flex-col items-center gap-4 text-center p-4 rounded-2xl bg-muted/20 border border-border/50">
                       <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 justify-center">
                         <Monitor size={14} className="text-primary" /> Clinic Wi-Fi
                       </div>
                       <div className="bg-white p-3 rounded-2xl border-4 border-primary/20 shadow-inner flex items-center justify-center">
                         <QRCode value={localUrl} size={110} level="H" />
                       </div>
                       <div className="w-full">
                         <p className="text-[10px] font-black text-foreground italic uppercase">Local Network Access</p>
                         <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Must be on clinic Wi-Fi</p>
                         <p className="text-[8px] text-primary font-bold mt-2 break-all bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 select-all">{localUrl}</p>
                       </div>
                    </div>
                  )}

                  {tailscaleUrl && (
                    <div className="flex flex-col items-center gap-4 text-center p-4 rounded-2xl bg-muted/20 border border-border/50">
                       <div className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                         <Shield size={14} className="text-emerald-500" /> Tailscale VPN
                       </div>
                       <div className="bg-white p-3 rounded-2xl border-4 border-emerald-500/20 shadow-inner flex items-center justify-center">
                         <QRCode value={tailscaleUrl} size={110} level="H" />
                       </div>
                       <div className="w-full">
                         <p className="text-[10px] font-black text-foreground italic uppercase">Secure Remote Access</p>
                         <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Works anywhere in the world</p>
                         <p className="text-[8px] text-emerald-600 font-bold mt-2 break-all bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10 select-all">{tailscaleUrl}</p>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          <div className="bg-card p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-lg">
             <div className="text-primary text-[10px] uppercase tracking-[0.2em] font-black mb-6 flex items-center gap-2 italic">
               <Activity size={16} /> CORE UTILITIES
             </div>
             <div className="grid grid-cols-1 gap-3 md:gap-4">
                <button 
                  onClick={() => onNavigate('settings')}
                  className="p-4 md:p-5 bg-muted/30 hover:bg-primary/5 rounded-xl md:rounded-[1.5rem] border border-border hover:border-primary/30 transition-all duration-300 text-left w-full group flex justify-between items-center shadow-sm">
                  <div>
                    <div className="text-base md:text-lg font-black text-foreground group-hover:text-primary transition-colors uppercase italic">Local DB</div>
                    <div className="text-[8px] md:text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">Backup</div>
                  </div>
                  <Database size={20} className="text-muted-foreground/30 group-hover:text-primary transition-all group-hover:rotate-12" />
                </button>
                <button 
                  onClick={() => onNavigate('dashboard')}
                  className="p-4 md:p-5 bg-muted/30 hover:bg-blue-600 hover:text-white rounded-xl md:rounded-[1.5rem] border border-border hover:border-blue-500 transition-all duration-300 text-left w-full group flex justify-between items-center shadow-sm">
                  <div>
                    <div className="text-base md:text-lg font-black group-hover:text-white transition-colors uppercase italic">V3.6.1</div>
                    <div className="text-[8px] md:text-[9px] text-muted-foreground group-hover:text-white/70 font-black uppercase tracking-widest mt-1">STABLE</div>
                  </div>
                  <Layout size={20} className="text-muted-foreground/30 group-hover:text-white transition-all group-hover:-rotate-12" />
                </button>
             </div>
          </div>

          <div className="bg-primary p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-primary/20 relative overflow-hidden">
             <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
             <h4 className="text-[8px] md:text-[10px] font-black text-primary-foreground/70 uppercase tracking-[0.2em] mb-3 md:mb-4 italic">INSIGHT</h4>
             <p className="text-[10px] md:text-xs text-white leading-relaxed font-bold uppercase tracking-wide">
               "PRECISION MONITORING IS THE FOUNDATION OF SUPERIOR TREATMENT OUTCOMES."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
