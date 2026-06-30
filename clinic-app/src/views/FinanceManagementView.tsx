import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  ChevronRight,
  Calculator,
  Save,
  Calendar,
  Search,
  AlertCircle,
  CreditCard,
  Trash2,
  PlusCircle,
  RotateCcw,
  Package,
  X,
  CheckCircle,
  TrendingDown,
  Minus,
  ChevronLeft,
  ClipboardList
} from 'lucide-react';
import { User } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface FinanceUser extends User {
  status: 'active' | 'frozen';
  base_salary: number;
}

interface SalaryRecord {
  user_id: number;
  month: string;
  base_salary: number;
  dynamic_salary: number;
  sessions_count: number;
  total_salary: number;
}

interface Loan {
  id: number;
  user_id: number;
  username: string;
  role: string;
  amount: number;
  note: string;
  month: string;
  is_settled: number;
  loan_date: string;
  settled_at?: string;
}

interface WasteItem {
  id: number;
  waste_date: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface DailySummary {
  date: string;
  revenue: number;
  totalLoans: number;
  totalWastes: number;
  netRevenue: number;
  loans: Array<{ username: string; role: string; amount: number; note: string; loan_date: string }>;
  wastes: WasteItem[];
}

type FinanceTab = 'salaries' | 'loans' | 'wastes' | 'daily' | 'session-types';

const api = () => (window.api as any);

interface FinanceManagementViewProps {
  currentUser?: { id: number; username: string; role: string } | null;
}
export function FinanceManagementView({ currentUser }: FinanceManagementViewProps = {}) {
  const { t, isAr } = useLanguage();
  const [activeTab, setActiveTab] = useState<FinanceTab>(
    currentUser?.role === 'staff' ? 'loans' : 'salaries'
  );

  // ── SALARIES STATE ──────────────────────────────────────────────
  const [users, setUsers] = useState<FinanceUser[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [revenue, setRevenue] = useState(0);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loansForSalaries, setLoansForSalaries] = useState<Loan[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<FinanceUser | null>(null);
  const [calcData, setCalcData] = useState<{
    dynamic_salary: number;
    sessions_count: number;
    session_types_breakdown?: {
      'Physical Therapy': number;
      'Nutrition': number;
      'Lymphatic': number;
      'Other': number;
    };
  }>({ dynamic_salary: 0, sessions_count: 0 });

  // ── LOANS STATE ─────────────────────────────────────────────────
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanMonth, setLoanMonth] = useState(new Date().toISOString().substring(0, 7));
  const [showAddLoan, setShowAddLoan] = useState<number | null>(null); // user_id
  const [newLoan, setNewLoan] = useState({ amount: '', note: '' });
  const [loanFilter, setLoanFilter] = useState<'all' | 'active' | 'settled'>('active');

  // ── WASTES STATE ─────────────────────────────────────────────────
  const [wasteDate, setWasteDate] = useState(new Date().toISOString().split('T')[0]);
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [wasteDays, setWasteDays] = useState<string[]>([]);
  const [wasteMonth, setWasteMonth] = useState(new Date().toISOString().substring(0, 7));
  const [showAddWaste, setShowAddWaste] = useState(false);
  const [newWaste, setNewWaste] = useState({ item_name: '', quantity: '', unit_cost: '' });

  // ── DAILY SUMMARY STATE ──────────────────────────────────────────
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  // ── SESSION TYPES STATE ──────────────────────────────────────────
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [newSessionType, setNewSessionType] = useState({ name: '', cost: '', num_sessions: '' });
  const [editingSessionType, setEditingSessionType] = useState<any | null>(null);
  const [sessionTypesLoading, setSessionTypesLoading] = useState(false);

  // ── LOAD SALARIES ────────────────────────────────────────────────
  const [doctorBreakdowns, setDoctorBreakdowns] = useState<Record<number, { total: number; types: Record<string, number> }>>({});

  const loadSalaryData = useCallback(async () => {
    if (window.api) {
      const u = await api().getFinanceUsers();
      setUsers(u || []);
      const rev = await api().getMonthlyRevenue(month);
      const revNum = typeof rev === 'number' ? rev : (rev && typeof rev === 'object' && 'total' in rev ? (rev as any).total : Number(rev) || 0);
      setRevenue(revNum);
      const recs = await api().getSalaryRecords(month);
      setSalaryRecords(recs || []);

      const loansData = await api().getLoans(month);
      setLoansForSalaries(loansData || []);

      // Load session counts/breakdowns for all doctors
      const breakdowns: Record<number, any> = {};
      if (u) {
        for (const user of u) {
          if (user.role === 'doctor' && user.doctor_id) {
            const res = await api().getDoctorSessionsCount({ doctorId: user.doctor_id, month });
            breakdowns[user.id] = res;
          }
        }
      }
      setDoctorBreakdowns(breakdowns);
    }
  }, [month]);

  useEffect(() => { loadSalaryData(); }, [loadSalaryData]);

  // ── LOAD LOANS ────────────────────────────────────────────────────
  const loadLoans = useCallback(async () => {
    if (window.api) {
      const data = await api().getLoans(loanMonth);
      setLoans(data || []);
    }
  }, [loanMonth]);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  // ── LOAD WASTES ───────────────────────────────────────────────────
  const loadWasteItems = useCallback(async () => {
    if (window.api) {
      const items = await api().getWasteItems(wasteDate);
      setWasteItems(items || []);
    }
  }, [wasteDate]);

  const loadWasteDays = useCallback(async () => {
    if (window.api) {
      const days = await api().getWasteDays(wasteMonth);
      setWasteDays(days || []);
    }
  }, [wasteMonth]);

  useEffect(() => { loadWasteItems(); }, [loadWasteItems]);
  useEffect(() => { loadWasteDays(); }, [loadWasteDays]);

  // ── LOAD DAILY SUMMARY ────────────────────────────────────────────
  const loadDailySummary = useCallback(async () => {
    if (window.api) {
      const data = await api().getDailySummary(summaryDate);
      setDailySummary(data);
    }
  }, [summaryDate]);

  useEffect(() => { loadDailySummary(); }, [loadDailySummary]);

  // ── LOAD SESSION TYPES ────────────────────────────────────────────
  const loadSessionTypes = useCallback(async () => {
    setSessionTypesLoading(true);
    try {
      if (api().getSessionTypes) {
        const data = await api().getSessionTypes();
        setSessionTypes(data || []);
      }
    } catch(e) { console.error(e); }
    finally { setSessionTypesLoading(false); }
  }, []);

  useEffect(() => { loadSessionTypes(); }, [loadSessionTypes]);

  // Re-fetch the relevant data whenever the user switches tabs
  // so mutations on one tab are immediately visible on another.
  useEffect(() => {
    if (activeTab === 'daily') loadDailySummary();
    if (activeTab === 'wastes') { loadWasteItems(); loadWasteDays(); }
    if (activeTab === 'loans') loadLoans();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── SALARY HANDLERS ───────────────────────────────────────────────
  const handleBaseSalaryUpdate = async (user: FinanceUser, amount: number) => {
    if (!window.api) return;
    await api().updateUserFinance({ userId: user.id, status: user.status, base_salary: amount });
    loadSalaryData();
  };

  const openCalculator = async (user: FinanceUser) => {
    setSelectedUser(user);
    const existing = salaryRecords.find(r => r.user_id === user.id);
    let sc = 0;
    let breakdown = { 'Physical Therapy': 0, 'Nutrition': 0, 'Lymphatic': 0, 'Other': 0 };
    if (user.role === 'doctor') {
      const res = await api().getDoctorSessionsCount({ doctorId: user.doctor_id, month });
      if (res && typeof res === 'object') {
        sc = res.total || 0;
        breakdown = res.types || breakdown;
      } else {
        sc = res || 0;
      }
    }
    setCalcData({ 
      dynamic_salary: existing ? existing.dynamic_salary : 0, 
      sessions_count: sc,
      session_types_breakdown: breakdown
    });
  };

  const saveSalary = async () => {
    if (!selectedUser || !window.api) return;
    const activeLoans = loansForSalaries.filter(l => l.user_id === selectedUser.id && l.is_settled === 0);
    const loanDeduction = activeLoans.reduce((sum, l) => sum + l.amount, 0);
    const finalTotal = Math.max(0, selectedUser.base_salary + calcData.dynamic_salary - loanDeduction);

    const record: SalaryRecord = {
      user_id: selectedUser.id,
      month,
      base_salary: selectedUser.base_salary,
      dynamic_salary: calcData.dynamic_salary,
      sessions_count: calcData.sessions_count,
      total_salary: finalTotal
    };
    const res = await api().saveSalaryRecord(record);
    if (res.success) {
      for (const loan of activeLoans) {
        await api().settleLoan(loan.id);
      }
      setSelectedUser(null); 
      loadSalaryData();
      if (activeTab === 'loans') loadLoans();
    }
  };

  // ── LOAN HANDLERS ─────────────────────────────────────────────────
  const handleAddLoan = async (user: FinanceUser) => {
    if (!newLoan.amount || parseFloat(newLoan.amount) <= 0) return;
    const res = await api().addLoan({
      user_id: user.id,
      amount: parseFloat(newLoan.amount),
      note: newLoan.note,
      month: loanMonth
    });
    if (res.success) {
      setShowAddLoan(null);
      setNewLoan({ amount: '', note: '' });
      loadLoans();
    }
  };

  const handleDeleteLoan = async (loanId: number) => {
    const ok = window.api && (window.api as any).confirm('Delete this loan record permanently?');
    if (!ok) return;
    await api().deleteLoan(loanId);
    loadLoans();
  };

  const handleSettleLoan = async (loanId: number) => {
    const ok = window.api && (window.api as any).confirm('Mark this loan as settled? It will stay in history but no longer count as an active deduction.');
    if (!ok) return;
    await api().settleLoan(loanId);
    loadLoans();
  };

  const handleResetLoans = async () => {
    const ok = window.api && (window.api as any).confirm(
      `Mark ALL active loans for ${loanMonth} as settled? This records them as paid but keeps the history.`
    );
    if (!ok) return;
    await api().resetLoans(loanMonth);
    loadLoans();
  };

  // ── WASTE HANDLERS ─────────────────────────────────────────────────
  const handleAddWaste = async () => {
    if (!newWaste.item_name || !newWaste.quantity || !newWaste.unit_cost) return;
    const res = await api().addWasteItem({
      waste_date: wasteDate,
      item_name: newWaste.item_name,
      quantity: parseFloat(newWaste.quantity),
      unit_cost: parseFloat(newWaste.unit_cost)
    });
    if (res.success) {
      setShowAddWaste(false);
      setNewWaste({ item_name: '', quantity: '', unit_cost: '' });
      loadWasteItems();
      loadWasteDays();
    }
  };

  const handleDeleteWaste = async (id: number) => {
    const ok = window.api && (window.api as any).confirm('Remove this waste item?');
    if (!ok) return;
    await api().deleteWasteItem(id);
    loadWasteItems();
    loadWasteDays();
  };

  // ── DERIVED VALUES ────────────────────────────────────────────────
  const activeUsers = users.filter(u => u.status !== 'frozen');
  const filteredUsers = activeUsers.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalSalaries = salaryRecords.reduce((acc, curr) => acc + curr.total_salary, 0);
  const netProfit = revenue - totalSalaries;

  const filteredLoans = loans.filter(l => {
    if (loanFilter === 'active') return l.is_settled === 0;
    if (loanFilter === 'settled') return l.is_settled === 1;
    return true;
  });



  const totalActiveLoans = loans.filter(l => l.is_settled === 0).reduce((s, l) => s + l.amount, 0);
  const wasteTotal = wasteItems.reduce((s, i) => s + i.total_cost, 0);

  const previewWasteCost = newWaste.quantity && newWaste.unit_cost
    ? parseFloat(newWaste.quantity) * parseFloat(newWaste.unit_cost)
    : 0;

  // Mini calendar helpers
  const calendarDays = (() => {
    const [y, m] = wasteMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    return { firstDay, daysInMonth, year: y, month: m };
  })();

  const prevWasteMonth = () => {
    const [y, m] = wasteMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setWasteMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextWasteMonth = () => {
    const [y, m] = wasteMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setWasteMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };


  const isAdmin = !currentUser || currentUser.role === 'admin' || currentUser.role === 'cfo';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3 font-heading italic">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <DollarSign size={28} />
            </div>
            {t('financial_operations')}
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">{t('financial_operations_desc')}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-2xl border border-border w-full overflow-x-auto">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('salaries')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'salaries'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}
          >
            <Users size={16} />
            {t('payroll_tab')}
          </button>
        )}
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'loans'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
          }`}
        >
          <CreditCard size={16} />
          {t('loans_tab')}
        </button>
        <button
          onClick={() => setActiveTab('wastes')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'wastes'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
          }`}
        >
          <Package size={16} />
          {t('wastes_tab')}
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}
          >
            <ClipboardList size={16} />
            {t('daily_tab')}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('session-types')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'session-types'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}
          >
            <ChevronRight size={16} />
            {t('services_tab')}
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB: SALARIES
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'salaries' && (
        <div className="space-y-6">
          {/* Month Picker */}
          <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border shadow-sm w-fit">
            <Calendar size={18} className="text-primary ml-2" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-foreground cursor-pointer"
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-8 opacity-10 group-hover:scale-110 transition-transform`}>
                <TrendingUp size={80} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('monthly_revenue_indicator')}</p>
              <p className="text-4xl font-black mt-2 text-foreground font-heading italic">${revenue.toLocaleString()}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 w-fit px-2 py-1 rounded-lg">{t('gross_revenue', 'Gross Revenue')}</div>
            </div>

            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-8 opacity-10 group-hover:scale-110 transition-transform`}>
                <Users size={80} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('total_salaries', 'Total Salaries')}</p>
              <p className="text-4xl font-black mt-2 text-foreground font-heading italic">${totalSalaries.toLocaleString()}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 w-fit px-2 py-1 rounded-lg">{t('staff_account', 'Staff') + ' & ' + t('doctor_account', 'Doctors')}</div>
            </div>

            <div className={`bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${netProfit >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
              <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-8 opacity-10 group-hover:scale-110 transition-transform`}>
                <DollarSign size={80} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('net_revenue')}</p>
              <p className={`text-4xl font-black mt-2 font-heading italic ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${netProfit.toLocaleString()}
              </p>
              <div className={`mt-4 flex items-center gap-2 text-xs font-bold w-fit px-2 py-1 rounded-lg ${netProfit >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                {netProfit >= 0 ? t('net_gain', 'NET GAIN') : t('net_loss', 'NET LOSS')}
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users size={20} className="text-primary" />
                {t('staff_payroll_ledger')}
              </h2>
              <div className="relative group">
                <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors`} size={16} />
                <input
                  type="text"
                  placeholder={t('search_practitioners')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pr-4 py-2 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64 transition-all ${isAr ? 'pr-10 pl-4 text-right' : 'pl-10 text-left'}`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full ${isAr ? 'text-right' : 'text-left'}`}>
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('user')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('role')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('base_salary')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('calculated_payout')}</th>
                    <th className={`px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-left' : 'text-right'}`}>{t('ledger_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map(user => {
                    const record = salaryRecords.find(r => r.user_id === user.id);
                    const activeLoans = loansForSalaries.filter(l => l.user_id === user.id && l.is_settled === 0);
                    const loanDeduction = activeLoans.reduce((sum, l) => sum + l.amount, 0);
                    return (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${user.role === 'doctor' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                              {user.username[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{user.username}</span>
                              {user.role === 'doctor' && doctorBreakdowns[user.id] && (
                                <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                  {t('total')}: <strong className="text-foreground">{doctorBreakdowns[user.id].total}</strong> 
                                  {' '}({t('pt_sessions')}: {doctorBreakdowns[user.id].types['Physical Therapy'] || 0}, 
                                  {t('nutrition_sessions')}: {doctorBreakdowns[user.id].types['Nutrition'] || 0}, 
                                  {t('lymphatic_sessions')}: {doctorBreakdowns[user.id].types['Lymphatic'] || 0}, 
                                  {t('other')}: {doctorBreakdowns[user.id].types['Other'] || 0})
                                </span>
                              )}
                              {!record && loanDeduction > 0 && (
                                <span className="text-[10px] text-rose-500 font-black mt-1 uppercase tracking-wider flex items-center gap-1">
                                  <AlertCircle size={10} /> {t('active_loans', 'Active Loans')}: -${loanDeduction.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.role === 'doctor' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {user.role === 'doctor' ? t('doctor_account') : t('staff_account')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-bold">$</span>
                            <input
                              type="number"
                              value={user.base_salary}
                              onChange={(e) => handleBaseSalaryUpdate(user, parseFloat(e.target.value) || 0)}
                              className={`w-24 bg-transparent border-none focus:ring-0 font-black p-0 text-foreground ${isAr ? 'text-right' : 'text-left'}`}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {record ? (
                            <span className="font-black text-primary italic">${record.total_salary.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">{t('not_calculated', 'Not calculated')}</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 ${isAr ? 'text-left' : 'text-right'}`}>
                          <button
                            onClick={() => openCalculator(user)}
                            className="p-2.5 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-xl transition-all group/btn">
                            <Calculator size={18} className="transition-transform group-hover/btn:scale-110" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                        {t('no_results_matched')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Salary Calculator Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Calculator className="text-primary" />
                    {t('calculate_salary')}
                  </h3>
                  <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${selectedUser.role === 'doctor' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {selectedUser.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-lg">{selectedUser.username}</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedUser.role}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-muted-foreground">Fixed Base Salary</span>
                      <span className="font-black">${selectedUser.base_salary.toLocaleString()}</span>
                    </div>

                    {selectedUser && (() => {
                      const activeLoans = loansForSalaries.filter(l => l.user_id === selectedUser.id && l.is_settled === 0);
                      const loanDeduction = activeLoans.reduce((sum, l) => sum + l.amount, 0);
                      if (loanDeduction === 0) return null;
                      return (
                        <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 space-y-2">
                          <div className="flex justify-between items-center text-rose-500 font-bold">
                            <span className="text-sm flex items-center gap-1.5"><AlertCircle size={16} /> {t('active_loans', 'Active Loans')}</span>
                            <span className="font-black">-${loanDeduction.toLocaleString()}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-semibold divide-y divide-border/50">
                            {activeLoans.map(loan => (
                              <div key={loan.id} className="flex justify-between py-1">
                                <span>{loan.note || 'Loan/Advance'}</span>
                                <span className="tabular-nums">${loan.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {selectedUser.role === 'doctor' && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-muted-foreground">Sessions this Month</span>
                          <span className="font-black bg-primary/10 text-primary px-3 py-1 rounded-lg">
                            {calcData.sessions_count} Sessions
                          </span>
                        </div>

                        {calcData.session_types_breakdown && (
                          <div className="bg-secondary/20 p-4 rounded-2xl border border-border space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Session Type Breakdown</p>
                            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                              <div className="flex justify-between p-2 bg-background rounded-lg border border-border">
                                <span className="text-muted-foreground">Physical Therapy:</span>
                                <span className="text-foreground">{calcData.session_types_breakdown['Physical Therapy'] || 0}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-background rounded-lg border border-border">
                                <span className="text-muted-foreground">Nutrition:</span>
                                <span className="text-foreground">{calcData.session_types_breakdown['Nutrition'] || 0}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-background rounded-lg border border-border">
                                <span className="text-muted-foreground">Lymphatic:</span>
                                <span className="text-foreground">{calcData.session_types_breakdown['Lymphatic'] || 0}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-background rounded-lg border border-border">
                                <span className="text-muted-foreground">Other:</span>
                                <span className="text-foreground">{calcData.session_types_breakdown['Other'] || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-muted-foreground">Dynamic Part (Performance/Sessions)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                              type="number"
                              value={calcData.dynamic_salary}
                              onChange={(e) => setCalcData({ ...calcData, dynamic_salary: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-lg"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-4 border-t border-border mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-black italic">Final Total</span>
                        <span className="text-3xl font-black text-primary italic font-heading">
                          ${(() => {
                            const activeLoans = loansForSalaries.filter(l => l.user_id === selectedUser.id && l.is_settled === 0);
                            const loanDeduction = activeLoans.reduce((sum, l) => sum + l.amount, 0);
                            return Math.max(0, selectedUser.base_salary + calcData.dynamic_salary - loanDeduction);
                          })().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveSalary}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    <Save size={24} />
                    Save Salary Record
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-tighter flex items-center justify-center gap-2">
                    <AlertCircle size={12} /> This will be subtracted from the total monthly revenue
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: LOANS
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
                <Calendar size={16} className={`text-primary ${isAr ? 'mr-1' : 'ml-1'}`} />
                <input
                  type="month"
                  value={loanMonth}
                  onChange={(e) => setLoanMonth(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 font-bold text-foreground cursor-pointer text-sm"
                />
              </div>
              {/* Filter */}
              <div className="flex bg-muted rounded-xl p-1 border border-border">
                {(['active', 'settled', 'all'] as const).map(f => {
                  const filterKey = f === 'active' ? 'active_filter' : f === 'settled' ? 'settled_filter' : 'all_filter';
                  return (
                    <button
                      key={f}
                      onClick={() => setLoanFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${loanFilter === f ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t(filterKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary + Reset */}
            <div className="flex items-center gap-3">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-2 text-center">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{t('active_loans')}</p>
                <p className="text-xl font-black text-rose-500">{totalActiveLoans.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</p>
              </div>
              <button
                onClick={handleResetLoans}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl font-bold text-sm hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <RotateCcw size={16} className={isAr ? 'rotate-180' : ''} />
                {t('reset_month')}
              </button>
            </div>
          </div>

          {/* Loan cards per user */}
          <div className="space-y-4">
            {activeUsers.length === 0 && (
              <div className="text-center py-16 text-muted-foreground italic">{t('no_staff_doctors_found')}</div>
            )}
            {activeUsers.map(user => {
              const userLoans = filteredLoans.filter(l => l.user_id === user.id);
              const userTotal = userLoans.reduce((s, l) => s + l.amount, 0);
              const isAdding = showAddLoan === user.id;

              return (
                <div key={user.id} className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                  {/* User header */}
                  <div className="p-5 flex items-center justify-between border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${user.role === 'doctor' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-foreground">{user.username}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${user.role === 'doctor' ? 'text-blue-500' : 'text-orange-500'}`}>
                          {user.role === 'doctor' ? t('doctor_account') : t('staff_account')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {userTotal > 0 && (
                        <div className={isAr ? 'text-left' : 'text-right'}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('total_loaned')}</p>
                          <p className="font-black text-rose-500 text-lg">{userTotal.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</p>
                        </div>
                      )}
                      <button
                        onClick={() => setShowAddLoan(isAdding ? null : user.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                      >
                        <PlusCircle size={16} />
                        {t('add_loan')}
                      </button>
                    </div>
                  </div>

                  {/* Add loan form */}
                  {isAdding && (
                    <div className="p-5 border-b border-border bg-primary/5 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[120px]">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{t('amount')} ({isAr ? 'جنيه' : 'EGP'})</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newLoan.amount}
                            onChange={e => setNewLoan({ ...newLoan, amount: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                          />
                        </div>
                        <div className="flex-[2] min-w-[160px]">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{t('note_optional')}</label>
                          <input
                            type="text"
                            placeholder={t('reason_loan_placeholder')}
                            value={newLoan.note}
                            onChange={e => setNewLoan({ ...newLoan, note: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddLoan(user)}
                            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer text-sm"
                          >
                            <Save size={16} />
                            {t('save')}
                          </button>
                          <button
                            onClick={() => { setShowAddLoan(null); setNewLoan({ amount: '', note: '' }); }}
                            className="px-3 py-2.5 bg-muted text-muted-foreground rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loan list */}
                  {userLoans.length > 0 ? (
                    <div className="divide-y divide-border">
                      {userLoans.map(loan => (
                        <div key={loan.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                          <div className="flex items-center gap-3">
                            {loan.is_settled === 1 ? (
                              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                            ) : (
                              <CreditCard size={16} className="text-rose-500 shrink-0" />
                            )}
                            <div>
                              <p className={`font-black ${loan.is_settled === 1 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                {loan.amount.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}
                              </p>
                              {loan.note && <p className="text-xs text-muted-foreground italic">{loan.note}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={isAr ? 'text-left' : 'text-right'}>
                              <p className="text-xs text-muted-foreground font-mono">
                                {new Date(loan.loan_date).toLocaleDateString(isAr ? 'ar-EG' : undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {new Date(loan.loan_date).toLocaleTimeString(isAr ? 'ar-EG' : undefined, { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {loan.is_settled === 1 && (
                                <p className="text-[10px] text-emerald-500 font-bold uppercase">{t('settled')}</p>
                              )}
                            </div>
                            {loan.is_settled === 0 && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={() => handleSettleLoan(loan.id)}
                                  title={t('mark_settled_tooltip')}
                                  className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-all cursor-pointer"
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteLoan(loan.id)}
                                  title={t('delete_perm_tooltip')}
                                  className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-all cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-6 text-sm text-muted-foreground italic text-center">
                      {loanFilter === 'active' ? t('no_active_loans_period') : t('no_loans_found')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: WASTES
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'wastes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mini Calendar */}
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={prevWasteMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                  <ChevronLeft size={18} className={isAr ? 'rotate-180' : ''} />
                </button>
                <p className="font-black text-sm">
                  {new Date(calendarDays.year, calendarDays.month - 1).toLocaleDateString(isAr ? 'ar-EG' : undefined, { month: 'long', year: 'numeric' })}
                </p>
                <button onClick={nextWasteMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                  <ChevronRight size={18} className={isAr ? 'rotate-180' : ''} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {(isAr ? ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']).map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: calendarDays.firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: calendarDays.daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `${calendarDays.year}-${String(calendarDays.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const hasWaste = wasteDays.includes(dayStr);
                  const isSelected = wasteDate === dayStr;
                  return (
                    <button
                      key={dayStr}
                      onClick={() => setWasteDate(dayStr)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {dayNum}
                      {hasWaste && (
                        <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                {t('days_with_waste')}
              </div>
            </div>

            {/* Waste Items Panel */}
            <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-black text-lg flex items-center gap-2">
                    <Package size={20} className="text-primary shrink-0" />
                    {new Date(wasteDate + 'T12:00:00').toLocaleDateString(isAr ? 'ar-EG' : undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                  {wasteTotal > 0 && (
                    <p className="text-sm text-rose-500 font-bold mt-0.5">{t('daily_total')}: {wasteTotal.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowAddWaste(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer"
                >
                  <PlusCircle size={16} />
                  {t('add_item')}
                </button>
              </div>

              {/* Add Item Form */}
              {showAddWaste && (
                <div className="p-5 border-b border-border bg-primary/5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-[2] min-w-[150px]">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{t('item_name')}</label>
                      <input
                        type="text"
                        placeholder={t('item_name_placeholder')}
                        value={newWaste.item_name}
                        onChange={e => setNewWaste({ ...newWaste, item_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      />
                    </div>
                    <div className="flex-1 min-w-[80px]">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{t('quantity')}</label>
                      <input
                        type="number"
                        placeholder="1"
                        min="0"
                        value={newWaste.quantity}
                        onChange={e => setNewWaste({ ...newWaste, quantity: e.target.value })}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                      />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{t('unit_cost_egp')}</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        value={newWaste.unit_cost}
                        onChange={e => setNewWaste({ ...newWaste, unit_cost: e.target.value })}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      {previewWasteCost > 0 && (
                        <p className="text-xs text-primary font-bold text-right">= {previewWasteCost.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddWaste}
                          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Save size={16} />
                          {t('save')}
                        </button>
                        <button
                          onClick={() => { setShowAddWaste(false); setNewWaste({ item_name: '', quantity: '', unit_cost: '' }); }}
                          className="px-3 py-2.5 bg-muted text-muted-foreground rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items list */}
              {wasteItems.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className={`px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-right' : 'text-left'}`}>{t('item_header')}</th>
                          <th className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">{t('qty_header')}</th>
                          <th className={`px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-left' : 'text-right'}`}>{t('unit_cost_header')}</th>
                          <th className={`px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'text-left' : 'text-right'}`}>{t('total_header')}</th>
                          <th className="px-5 py-3 w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {wasteItems.map(item => (
                          <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                            <td className="px-5 py-3.5 font-bold text-foreground">{item.item_name}</td>
                            <td className="px-5 py-3.5 text-center text-muted-foreground font-mono">{item.quantity}</td>
                            <td className={`px-5 py-3.5 text-muted-foreground font-mono ${isAr ? 'text-left' : 'text-right'}`}>{item.unit_cost.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</td>
                            <td className={`px-5 py-3.5 font-black text-foreground ${isAr ? 'text-left' : 'text-right'}`}>{item.total_cost.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => handleDeleteWaste(item.id)}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-rose-500 transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-4 border-t border-border bg-muted/20 flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('day_total')}</span>
                    <span className="text-2xl font-black text-rose-500">{wasteTotal.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</span>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-muted-foreground italic space-y-2">
                  <Package size={40} className="mx-auto opacity-30" />
                  <p>{t('no_waste_recorded_day')}</p>
                  <p className="text-xs">{t('click_add_item_desc')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: DAILY SUMMARY
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Date Picker */}
          <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border shadow-sm w-fit">
            <Calendar size={16} className={`text-primary ${isAr ? 'mr-2' : 'ml-2'}`} />
            <input
              type="date"
              value={summaryDate}
              onChange={e => setSummaryDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-foreground cursor-pointer text-sm"
            />
          </div>

          {dailySummary && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue */}
                <div className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                  <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-6 opacity-5 group-hover:scale-110 transition-transform`}>
                    <TrendingUp size={70} />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('gross_revenue')}</p>
                  <p className="text-3xl font-black mt-1 text-emerald-500 font-heading italic">{dailySummary.revenue.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</p>
                  <div className="mt-3 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 w-fit px-2 py-1 rounded-lg">{t('from_payments')}</div>
                </div>

                {/* Loans */}
                <div className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                  <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-6 opacity-5 group-hover:scale-110 transition-transform`}>
                    <CreditCard size={70} />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('loans')}</p>
                  <p className="text-3xl font-black mt-1 text-rose-500 font-heading italic">-{dailySummary.totalLoans.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</p>
                  <div className="mt-3 text-[10px] font-bold text-rose-500 bg-rose-500/10 w-fit px-2 py-1 rounded-lg">
                    {dailySummary.loans.length} {dailySummary.loans.length === 1 ? t('record_singular') : t('records_plural')}
                  </div>
                </div>

                {/* Wastes */}
                <div className="bg-card p-5 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                  <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-6 opacity-5 group-hover:scale-110 transition-transform`}>
                    <Package size={70} />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('wastes')}</p>
                  <p className="text-3xl font-black mt-1 text-amber-500 font-heading italic">-{dailySummary.totalWastes.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</p>
                  <div className="mt-3 text-[10px] font-bold text-amber-500 bg-amber-500/10 w-fit px-2 py-1 rounded-lg">
                    {dailySummary.wastes.length} {dailySummary.wastes.length === 1 ? t('item_singular') : t('items_plural')}
                  </div>
                </div>

                {/* Net */}
                <div className={`bg-card p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${dailySummary.netRevenue >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                  <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} p-6 opacity-5 group-hover:scale-110 transition-transform`}>
                    <DollarSign size={70} />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('net_revenue_lbl')}</p>
                  <p className={`text-3xl font-black mt-1 font-heading italic ${dailySummary.netRevenue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {dailySummary.netRevenue.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}
                  </p>
                  <div className={`mt-3 text-[10px] font-bold w-fit px-2 py-1 rounded-lg ${dailySummary.netRevenue >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                    {dailySummary.netRevenue >= 0 ? t('net_gain') : t('net_loss')}
                  </div>
                </div>
              </div>

              {/* Calculation Breakdown */}
              <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-3">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Calculator size={20} className="text-primary shrink-0" />
                  {t('revenue_breakdown')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5 border-b border-border">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <TrendingUp size={16} />
                      <span className="font-bold">{t('gross_revenue')}</span>
                    </div>
                    <span className="font-black text-emerald-600 text-lg">+{dailySummary.revenue.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-border">
                    <div className="flex items-center gap-2 text-rose-500">
                      <Minus size={16} />
                      <span className="font-bold">{t('loans_issued')}</span>
                    </div>
                    <span className="font-black text-rose-500 text-lg">-{dailySummary.totalLoans.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-border">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Minus size={16} />
                      <span className="font-bold">{t('clinic_wastes')}</span>
                    </div>
                    <span className="font-black text-amber-500 text-lg">-{dailySummary.totalWastes.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 bg-muted/30 rounded-2xl px-4">
                    <span className="font-black text-lg">{t('net_clear_revenue')}</span>
                    <span className={`font-black text-2xl font-heading italic ${dailySummary.netRevenue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {dailySummary.netRevenue.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Loans detail */}
              {dailySummary.loans.length > 0 && (
                <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-black flex items-center gap-2 text-rose-500">
                      <CreditCard size={18} />
                      {t('loans_on_day')}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-lg">
                        {dailySummary.loans.filter((l: any) => !l.is_settled).length} {t('active_filter')}
                      </span>
                      {dailySummary.loans.some((l: any) => l.is_settled) && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                          {dailySummary.loans.filter((l: any) => l.is_settled).length} {t('settled_filter')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {dailySummary.loans.map((loan: any, i: number) => (
                      <div key={i} className={`px-6 py-3.5 flex items-center justify-between ${loan.is_settled ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${loan.role === 'doctor' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {loan.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground">{loan.username}</p>
                              {loan.is_settled ? (
                                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">{t('settled')}</span>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded">{t('active')}</span>
                              )}
                            </div>
                            {loan.note && <p className="text-xs text-muted-foreground italic">{loan.note}</p>}
                          </div>
                        </div>
                        <span className={`font-black ${loan.is_settled ? 'text-muted-foreground line-through' : 'text-rose-500'}`}>
                          {loan.amount.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Wastes detail */}
              {dailySummary.wastes.length > 0 && (
                <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-black flex items-center gap-2 text-amber-500">
                      <Package size={18} />
                      {t('waste_items_on_day')}
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {dailySummary.wastes.map((item) => (
                      <div key={item.id} className="px-6 py-3.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × {item.unit_cost} {isAr ? 'جنيه' : 'EGP'}</p>
                        </div>
                        <span className="font-black text-amber-500">{item.total_cost.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex justify-between">
                    <span className="font-bold text-muted-foreground">{t('total_header')}</span>
                    <span className="font-black text-amber-500">{dailySummary.totalWastes.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</span>
                  </div>
                </div>
              )}

              {/* Empty day message */}
              {dailySummary.revenue === 0 && dailySummary.totalLoans === 0 && dailySummary.totalWastes === 0 && (
                <div className="text-center py-12 text-muted-foreground italic space-y-2">
                  <TrendingDown size={40} className="mx-auto opacity-30" />
                  <p>{t('no_financial_activity_day')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: SESSION TYPES
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'session-types' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground font-heading">{t('session_type_library')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('manage_session_types_desc')}</p>
            </div>
          </div>

          {/* Add New Session Type Form */}
          <div className="bg-muted/20 border border-border rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-foreground">{t('add_new_session_type')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('name')}</label>
                <input
                  type="text"
                  placeholder={isAr ? "مثال: علاج طبيعي قياسي" : "e.g. Standard Therapy"}
                  value={newSessionType.name}
                  onChange={e => setNewSessionType({ ...newSessionType, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('service_cost')}</label>
                <input
                  type="number"
                  placeholder="e.g. 300"
                  value={newSessionType.cost}
                  onChange={e => setNewSessionType({ ...newSessionType, cost: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('sessions_package_optional')}</label>
                <input
                  type="number"
                  placeholder={t('leave_blank_single')}
                  value={newSessionType.num_sessions}
                  onChange={e => setNewSessionType({ ...newSessionType, num_sessions: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                if (!newSessionType.name || !newSessionType.cost) return;
                const res = await api().createSessionType({
                  name: newSessionType.name,
                  cost: parseFloat(newSessionType.cost),
                  num_sessions: newSessionType.num_sessions ? parseInt(newSessionType.num_sessions) : null
                });
                if (res.success) {
                  setNewSessionType({ name: '', cost: '', num_sessions: '' });
                  loadSessionTypes();
                }
              }}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
            >
              {t('add_session_type_btn')}
            </button>
          </div>

          {/* Session Types List */}
          {sessionTypesLoading ? (
            <div className="text-center py-10 text-muted-foreground">{t('loading_path', 'Loading...')}</div>
          ) : sessionTypes.length === 0 ? (
            <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground font-medium">{t('no_session_types_defined')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('add_session_types_above_desc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionTypes.map(st => (
                <div key={st.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/20 hover:shadow-md transition-all group">
                  {editingSessionType?.id === st.id ? (
                    <div className={`flex-1 grid grid-cols-3 gap-3 ${isAr ? 'ml-3' : 'mr-3'}`}>
                      <input
                        value={editingSessionType.name}
                        onChange={e => setEditingSessionType({...editingSessionType, name: e.target.value})}
                        className="px-3 py-2 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none"
                      />
                      <input
                        type="number"
                        value={editingSessionType.cost}
                        onChange={e => setEditingSessionType({...editingSessionType, cost: e.target.value})}
                        className="px-3 py-2 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none"
                      />
                      <input
                        type="number"
                        value={editingSessionType.num_sessions || ''}
                        placeholder={t('note_optional')}
                        onChange={e => setEditingSessionType({...editingSessionType, num_sessions: e.target.value})}
                        className="px-3 py-2 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{st.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {st.cost} {isAr ? 'جنيه للجلسة' : 'EGP per session'}{st.num_sessions ? ` · ${st.num_sessions} ${t('sessions_in_package_desc')}` : ` · ${t('single_session')}`}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingSessionType?.id === st.id ? (
                      <>
                        <button
                          onClick={async () => {
                            await api().updateSessionType(st.id, {
                              name: editingSessionType.name,
                              cost: parseFloat(editingSessionType.cost),
                              num_sessions: editingSessionType.num_sessions ? parseInt(editingSessionType.num_sessions) : null
                            });
                            setEditingSessionType(null);
                            loadSessionTypes();
                          }}
                          className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-[10px] font-bold uppercase tracking-widest hover:-translate-y-0.5 transition-all cursor-pointer"
                        >{t('save')}</button>
                        <button onClick={() => setEditingSessionType(null)} className="px-3 py-1.5 bg-muted text-foreground border border-border rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer">{t('cancel')}</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingSessionType({...st, cost: st.cost.toString(), num_sessions: st.num_sessions?.toString() || ''})}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                          title={t('edit')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(t('confirm_delete_service'))) {
                              await api().deleteSessionType(st.id);
                              loadSessionTypes();
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
                          title={t('delete')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}