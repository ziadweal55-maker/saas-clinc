import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, LogIn, LogOut, Calendar, Loader2, Users, Clipboard, Search } from 'lucide-react';
import { User } from '../types';

interface AttendanceViewProps {
  currentUser: User | null;
}

interface AttendanceLogItem {
  user_id: number;
  username: string;
  role: string;
  check_in_time: string | null;
  check_out_time: string | null;
  log_date: string | null;
}

const getLocalTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalTimeStr = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const formatTimeAmPm = (timeStr: string | null | undefined) => {
  if (!timeStr) return '—';
  try {
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};

export function AttendanceView({ currentUser }: AttendanceViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayStr());
  const [logs, setLogs] = useState<AttendanceLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (window.api && window.api.getAttendanceLogs) {
        const data = await window.api.getAttendanceLogs(selectedDate);
        setLogs(data || []);
      }
    } catch {
      showFeedback('Failed to load attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleUserClockIn = async (userId: number, username: string) => {
    setSaving(true);
    try {
      if (window.api && window.api.clockIn) {
        const todayStr = getLocalTodayStr();
        const nowTime = getLocalTimeStr();
        
        const res = await window.api.clockIn({
          userId,
          date: todayStr,
          time: nowTime
        });
        
        if (res.success) {
          showFeedback(`Clocked In ${username} at ${nowTime} successfully!`, 'success');
          if (selectedDate === todayStr) {
            await loadLogs();
          }
        } else {
          showFeedback(res.error || `Failed to clock in ${username}`, 'error');
        }
      }
    } catch (err: any) {
      showFeedback(err.message || 'System error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUserClockOut = async (userId: number, username: string) => {
    setSaving(true);
    try {
      if (window.api && window.api.clockOut) {
        const todayStr = getLocalTodayStr();
        const nowTime = getLocalTimeStr();
        
        const res = await window.api.clockOut({
          userId,
          date: todayStr,
          time: nowTime
        });
        
        if (res.success) {
          showFeedback(`Clocked Out ${username} at ${nowTime} successfully!`, 'success');
          if (selectedDate === todayStr) {
            await loadLogs();
          }
        } else {
          showFeedback(res.error || `Failed to clock out ${username}`, 'error');
        }
      }
    } catch (err: any) {
      showFeedback(err.message || 'System error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClockIn = async () => {
    if (!currentUser) return;
    await handleUserClockIn(currentUser.id, currentUser.username);
  };

  const handleClockOut = async () => {
    if (!currentUser) return;
    await handleUserClockOut(currentUser.id, currentUser.username);
  };

  // Find current user's record for TODAY
  const currentUserTodayLog = logs.find(item => item.user_id === currentUser?.id);
  const checkedInToday = !!currentUserTodayLog?.check_in_time;
  const checkedOutToday = !!currentUserTodayLog?.check_out_time;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-heading tracking-tight italic">Shift Attendance Console</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Register arrival and departure times for clinic staff and doctors.</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border animate-fadeIn
            ${feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
        >
          <CheckCircle2 size={16} />
          {feedback.msg}
        </div>
      )}

      {/* Clocking Station Console */}
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-black text-primary uppercase tracking-widest leading-none italic flex items-center gap-2">
              <Clock size={16} /> Time Station
            </h3>
            <h2 className="text-lg md:text-xl font-bold text-foreground font-heading">
              Welcome, {currentUser?.username}!
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Role: <span className="text-foreground font-bold uppercase">{currentUser?.role}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Clock-In Button */}
            <button
              onClick={handleClockIn}
              disabled={saving || checkedInToday}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                checkedInToday
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 cursor-not-allowed'
                  : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95'
              }`}
            >
              {checkedInToday ? (
                <>
                  <CheckCircle2 size={16} />
                  Checked In at {formatTimeAmPm(currentUserTodayLog?.check_in_time)}
                </>
              ) : (
                <>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  Clock In (Arrival)
                </>
              )}
            </button>

            {/* Clock-Out Button */}
            <button
              onClick={handleClockOut}
              disabled={saving || !checkedInToday || checkedOutToday}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                checkedOutToday
                  ? 'bg-purple-500/15 text-purple-500 border border-purple-500/20 cursor-not-allowed'
                  : !checkedInToday
                  ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
                  : 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:-translate-y-0.5 active:scale-95'
              }`}
            >
              {checkedOutToday ? (
                <>
                  <CheckCircle2 size={16} />
                  Checked Out at {formatTimeAmPm(currentUserTodayLog?.check_out_time)}
                </>
              ) : (
                <>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                  Clock Out (Departure)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Roster & Log Directory */}
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">Shift Logs & Attendance</h3>
              <p className="text-xs text-muted-foreground font-medium">Viewing shift history for chosen clinical date.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-muted/30 border border-border rounded-xl text-xs text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Date Picker */}
            <div className="relative w-full sm:w-auto flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Select Date:</span>
              <div className="relative w-full sm:w-auto">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full bg-muted/30 border border-border rounded-xl text-xs text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Log Table */}
        {(() => {
          const filteredLogs = logs.filter(log => {
            const hasAccess = currentUser?.role === 'admin' || currentUser?.role === 'staff' || log.user_id === currentUser?.id;
            if (!hasAccess) return false;

            const username = log.username || '';
            const role = log.role || '';
            const checkIn = formatTimeAmPm(log.check_in_time);
            const checkOut = formatTimeAmPm(log.check_out_time);
            
            return (
              username.toLowerCase().includes(searchTerm.toLowerCase()) ||
              role.toLowerCase().includes(searchTerm.toLowerCase()) ||
              checkIn.toLowerCase().includes(searchTerm.toLowerCase()) ||
              checkOut.toLowerCase().includes(searchTerm.toLowerCase())
            );
          });

          return (
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Syncing Shift History...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm font-medium">
                  <Clipboard size={36} className="mx-auto mb-3 opacity-30 text-primary" />
                  No clinical users registered in system.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
                        <th className="p-4 pl-6">Username</th>
                        <th className="p-4">Classification</th>
                        <th className="p-4">Arrival (Clock In)</th>
                        <th className="p-4">Departure (Clock Out)</th>
                        <th className="p-4 pr-6">Daily Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLogs.map(log => {
                        const hasClockedIn = !!log.check_in_time;
                        const hasClockedOut = !!log.check_out_time;
                        const isToday = selectedDate === getLocalTodayStr();
                        
                        return (
                          <tr key={log.user_id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4 pl-6">
                              <span className="text-xs font-bold text-foreground">{log.username}</span>
                              {log.user_id === currentUser?.id && (
                                <span className="ml-2 text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase">You</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                                {log.role}
                              </span>
                            </td>
                            <td className="p-4">
                              {hasClockedIn ? (
                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                                  <LogIn size={13} /> {formatTimeAmPm(log.check_in_time)}
                                </span>
                              ) : isToday ? (
                                <button
                                  onClick={() => handleUserClockIn(log.user_id, log.username)}
                                  disabled={saving}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <LogIn size={11} /> Check In
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium italic">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              {hasClockedOut ? (
                                <span className="text-xs font-bold text-purple-500 flex items-center gap-1.5">
                                  <LogOut size={13} /> {formatTimeAmPm(log.check_out_time)}
                                </span>
                              ) : hasClockedIn && isToday ? (
                                <button
                                  onClick={() => handleUserClockOut(log.user_id, log.username)}
                                  disabled={saving}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <LogOut size={11} /> Check Out
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium italic">—</span>
                              )}
                            </td>
                            <td className="p-4 pr-6">
                              {hasClockedOut ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/10">
                                  Completed
                                </span>
                              ) : hasClockedIn ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 animate-pulse">
                                  On Duty
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                                  Absent / Pending
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
          );
        })()}
      </div>
    </div>
  );
}
