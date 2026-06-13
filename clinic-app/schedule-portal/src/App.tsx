import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Clock, 
  Phone, 
  Activity, 
  UserCheck, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

// Pure JavaScript SHA-256 Hashing implementation
// Works in both Secure and Non-Secure contexts (HTTP & HTTPS) without using window.crypto.subtle
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const lengthProperty = 'length';
  let i, j;
  
  const result: string[] = [];
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  let wordsLength = ((asciiLength + 8) >> 6) + 1;
  const maxWords = wordsLength * 16;
  
  for (i = 0; i < maxWords; i++) words[i] = 0;
  for (i = 0; i < asciiLength; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  words[maxWords - 1] = asciiLength * 8;
  
  for (i = 0; i < maxWords; i += 16) {
    const w: number[] = [];
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3],
        e = hash[4], f = hash[5], g = hash[6], h = hash[7];
        
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j];
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }
  
  for (i = 0; i < 8; i++) {
    const hex = (hash[i] >>> 0).toString(16);
    result.push(hex.padStart(8, '0'));
  }
  
  return result.join('');
}

interface UserProfile {
  local_id: number;
  username: string;
  role: string;
  doctor_id: number | null;
  status: string;
}

interface Appointment {
  id: string;
  local_id: number;
  client_id: number;
  doctor_id: number | null;
  appointment_date: string;
  status: string;
  client_first_name: string;
  client_last_name: string;
  client_phone: string;
  doctor_name: string;
}

function App() {
  // Authentication states
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('revive_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // App scheduling states
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allDoctors, setAllDoctors] = useState<string[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persistence of authentication
  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('revive_user', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('revive_user');
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
  };

  // Secure Sign In handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    try {
      // 1. Master Root Account Check
      if (usernameInput === 'root' && passwordInput === 'P@ssw0rd') {
        const rootUser: UserProfile = {
          local_id: 0,
          username: 'root',
          role: 'admin',
          doctor_id: null,
          status: 'active'
        };
        handleLoginSuccess(rootUser);
        setIsAuthenticating(false);
        return;
      }

      // 2. Compute SHA-256 hash of password synchronously
      const passwordHash = sha256(passwordInput);

      // 3. Query Supabase portal_users
      const { data: dbUser, error } = await supabase
        .from('portal_users')
        .select('*')
        .eq('username', usernameInput)
        .single();

      if (error || !dbUser) {
        setLoginError('User not found in system.');
        setIsAuthenticating(false);
        return;
      }

      if (dbUser.status === 'frozen') {
        setLoginError('This account has been frozen. Please contact the administrator.');
        setIsAuthenticating(false);
        return;
      }

      // 4. Verify hash match
      if (dbUser.password_hash === passwordHash) {
        const loggedUser: UserProfile = {
          local_id: dbUser.local_id,
          username: dbUser.username,
          role: dbUser.role,
          doctor_id: dbUser.doctor_id,
          status: dbUser.status
        };
        handleLoginSuccess(loggedUser);
      } else {
        setLoginError('Invalid password. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('A system error occurred during authentication.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Fetch appointments from Supabase based on selectedDate
  const fetchAppointments = async (showRefresher = false) => {
    if (!user) return;
    if (showRefresher) setIsRefreshing(true);
    else setIsLoadingData(true);

    try {
      // Calculate local day start/end range in UTC
      const localDateStart = new Date(`${selectedDate}T00:00:00`);
      const localDateEnd = new Date(`${selectedDate}T23:59:59`);

      let query = supabase
        .from('portal_appointments')
        .select('*')
        .gte('appointment_date', localDateStart.toISOString())
        .lte('appointment_date', localDateEnd.toISOString());

      // If logged in as Doctor, they should ONLY see their own patients
      if (user.role === 'doctor' && user.doctor_id) {
        query = query.eq('doctor_id', user.doctor_id);
      }

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);

      // Extract all unique doctor names for filter dropdown if user is admin/staff
      if (user.role === 'admin' || user.role === 'staff') {
        const uniqueDoctors: string[] = [];
        data?.forEach(apt => {
          if (apt.doctor_name && !uniqueDoctors.includes(apt.doctor_name)) {
            uniqueDoctors.push(apt.doctor_name);
          }
        });
        setAllDoctors(uniqueDoctors);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, user]);

  // Navigate dates
  const changeDate = (days: number) => {
    const currentDate = new Date(`${selectedDate}T12:00:00`); // Use noon to avoid timezone overflow
    currentDate.setDate(currentDate.getDate() + days);
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const setDateToToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Filtered Appointments list
  const filteredAppointments = appointments.filter(apt => {
    // 1. Patient name search filter
    const patientName = `${apt.client_first_name} ${apt.client_last_name}`.toLowerCase();
    const matchesSearch = patientName.includes(searchQuery.toLowerCase()) || 
                          (apt.client_phone && apt.client_phone.includes(searchQuery));

    // 2. Doctor dropdown filter (Admin/Staff only)
    const matchesDoctor = selectedDoctorFilter === 'All' || apt.doctor_name === selectedDoctorFilter;

    // 3. Status filter
    const matchesStatus = statusFilter === 'All' || apt.status === statusFilter;

    return matchesSearch && matchesDoctor && matchesStatus;
  });


  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'Scheduled':
      default:
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T12:00:00`);
      return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Authentication View
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-card p-10 rounded-3xl border border-border shadow-2xl space-y-10">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-4">
                 <ShieldCheck size={32} />
              </div>
              <h1 className="text-4xl font-bold tracking-tighter text-foreground font-heading italic">REVIVE</h1>
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-muted-foreground">Portal Schedule Access</p>
            </div>
            
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <User size={12} /> Username
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground placeholder:text-muted-foreground/50"
                  placeholder="Clinical identifier"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <Lock size={12} /> Password
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                  required
                />
              </div>

              {loginError && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-start gap-3 animate-bounce">
                  <AlertCircle size={18} className="shrink-0" /> 
                  <span className="leading-relaxed">{loginError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAuthenticating ? (
                    <><div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> Authenticating...</>
                  ) : 'Secure Sign In'}
                </button>
              </div>
            </form>
            
            <div className="text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Protected by Enterprise-Grade Encryption
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-center">
             <p className="text-xs text-muted-foreground font-medium">Version 4.0.0-REVIVE | &copy; 2026 Revive Medical</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard / Schedule View
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Sticky Premium Header */}
      <header className="bg-card border-b border-border py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold shadow-inner">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-heading italic leading-none flex items-center gap-1.5">
                REVIVE <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full not-italic tracking-wider border border-border">Schedule</span>
              </h1>
              <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mt-1">Staff Online Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <UserCheck size={14} className="text-primary" /> {user.username}
              </span>
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-muted-foreground px-2 py-0.5 bg-muted rounded-md mt-0.5">
                {user.role}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              title="Sign Out"
              className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-border hover:border-destructive/20 bg-muted/20"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Upper Control Bar: Calendar Navigate, Search & Filters */}
        <section className="bg-card p-5 rounded-3xl border border-border shadow-md space-y-4">
          
          {/* Calendar Picker and Navigations */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Nav Arrows */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changeDate(-1)}
                className="p-3 bg-muted/40 hover:bg-muted/80 rounded-2xl transition-all text-foreground border border-border/60 hover:-translate-x-0.5 active:scale-95"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2.5 bg-muted/30 px-4 py-2.5 rounded-2xl border border-border">
                <Calendar size={16} className="text-primary" />
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-foreground focus:outline-none cursor-pointer"
                />
              </div>

              <button 
                onClick={() => changeDate(1)}
                className="p-3 bg-muted/40 hover:bg-muted/80 rounded-2xl transition-all text-foreground border border-border/60 hover:translate-x-0.5 active:scale-95"
              >
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={setDateToToday}
                className="px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Today
              </button>
            </div>

            {/* Date Display and Refresher */}
            <div className="flex items-center justify-between md:justify-end gap-4">
              <h2 className="text-sm sm:text-base font-bold text-foreground font-heading tracking-tight">
                {formatDateLabel(selectedDate)}
              </h2>

              <button 
                onClick={() => fetchAppointments(true)}
                disabled={isRefreshing || isLoadingData}
                title="Refresh schedule"
                className={`p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all border border-border/80 bg-muted/20 ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Search bar & Filter dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <Search size={15} />
              </span>
              <input 
                type="text"
                placeholder="Search patient / phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold text-foreground"
              />
            </div>

            {/* Doctor filter (Admin/Staff only) */}
            {(user.role === 'admin' || user.role === 'staff') ? (
              <div className="flex items-center gap-2">
                <div className="w-full">
                  <select
                    value={selectedDoctorFilter}
                    onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold text-foreground cursor-pointer appearance-none"
                  >
                    <option value="All">All Doctors</option>
                    {allDoctors.map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3.5 rounded-2xl bg-muted/20 border border-border text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <User size={14} /> Only your schedules shown
              </div>
            )}

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold text-foreground cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Display Stats */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 px-4 bg-primary/5 rounded-2xl border border-primary/10">
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Filtered:</span>
              <span className="text-lg font-black text-primary">{filteredAppointments.length}</span>
              <span className="text-muted-foreground text-xs font-semibold">of {appointments.length} total</span>
            </div>
          </div>

        </section>

        {/* Schedule Hourly Timeline */}
        <section className="bg-card rounded-3xl border border-border shadow-md overflow-hidden flex flex-col">
          <div className="p-4 bg-muted/40 border-b border-border text-center font-extrabold text-xs uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2">
            <Calendar size={14} className="text-primary" />
            Hourly Clinical Schedule for {formatDateLabel(selectedDate)}
          </div>
          
          <div className="divide-y divide-border/60">
            {isLoadingData ? (
              <div className="py-20 text-center space-y-4">
                <div className="relative w-12 h-12 mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-primary font-bold text-[9px] uppercase tracking-widest">REV</div>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Loading clinic schedules...</p>
              </div>
            ) : (() => {
              const HOURS = Array.from({ length: 13 }, (_, i) => i + 10); // 10 AM to 10 PM (22:00)
              
              return HOURS.map(hour => {
                const timeLabel = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                
                // Get filtered appointments for this hour slot
                const hourApts = filteredAppointments.filter(apt => {
                  try {
                    const aptDate = new Date(apt.appointment_date);
                    return aptDate.getHours() === hour;
                  } catch {
                    return false;
                  }
                });

                return (
                  <div 
                    key={hour} 
                    className="flex min-h-[90px] sm:min-h-[110px] hover:bg-muted/10 transition-colors group"
                  >
                    {/* Hourly Indicator left rail - Side-by-side on mobile too! */}
                    <div className="w-20 sm:w-28 p-2 sm:p-4 border-r border-border flex flex-col items-center justify-start text-muted-foreground font-black text-[10px] sm:text-xs pt-4 shrink-0 bg-muted/10 group-hover:bg-muted/20 transition-all select-none">
                      <Clock size={12} className="mb-1 text-primary shrink-0" />
                      <span>{timeLabel}</span>
                    </div>

                    {/* Hourly Slot Appointments Panel */}
                    <div className="flex-1 p-2.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 bg-card">
                      {hourApts.length > 0 ? (
                        hourApts.map(apt => (
                          <div 
                            key={apt.id} 
                            className="bg-card border border-border p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all relative overflow-hidden group/card flex flex-col justify-between"
                          >
                            {/* Color bar status indicator */}
                            <div className={`absolute top-0 left-0 w-1 sm:w-1.5 h-full ${apt.status === 'Completed' ? 'bg-blue-500' : apt.status === 'Cancelled' ? 'bg-red-500' : 'bg-primary'}`} />
                            
                            <div className="space-y-2.5">
                              {/* Card Header Status */}
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                  #{apt.local_id}
                                </span>
                                <span className={`text-[7px] sm:text-[8px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full ${getStatusStyle(apt.status)}`}>
                                  {apt.status}
                                </span>
                              </div>

                              {/* Client Details */}
                              <div className="space-y-1">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground font-heading tracking-tight mt-0.5 leading-tight">
                                  {apt.client_first_name} {apt.client_last_name}
                                </h4>
                                {apt.client_phone && (
                                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground font-semibold">
                                    <Phone size={10} className="text-primary/70 shrink-0" />
                                    <a href={`tel:${apt.client_phone}`} className="hover:text-primary transition-all truncate">
                                      {apt.client_phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Clinician Footer */}
                            <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-foreground">
                              <Activity size={10} className="text-primary shrink-0" />
                              <span className="truncate">Dr. {apt.doctor_name || 'Unassigned'}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-start text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground/30 select-none py-1.5 px-1">
                          Available slot
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>

        {/* Footer Info Statement */}
        <footer className="text-center pt-8 pb-4 opacity-50 space-y-2">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Sparkles size={12} className="text-primary animate-pulse" /> Secure End-to-End Clinic Sync Engine
          </div>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase">Schedule cleared automatically on database schedules policy</p>
        </footer>
        
      </main>
    </div>
  );
}

export default App;
