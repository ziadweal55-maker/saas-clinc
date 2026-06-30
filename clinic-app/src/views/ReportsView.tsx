import { useState, useEffect } from 'react';
import { FileText, Calendar, TrendingUp, Users, Activity, Printer, FileSpreadsheet, DollarSign, CreditCard, Package, Stethoscope, Clock } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
}

export function ReportsView() {
  const { language, t, isAr } = useLanguage();
  const [range, setRange] = useState('daily');
  const [referenceDate, setReferenceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | 'all'>('all');
  const [stats, setStats] = useState({
    clientsInPeriod: 0,
    sessionsCount: 0,
    totalIncome: 0,
    totalLoans: 0,
    totalWastes: 0,
    dailyBreakdown: [] as any[],
    detailedPayments: [] as any[],
    detailedSessions: [] as any[],
    loanDetails: [] as any[],
    wasteDetails: [] as any[],
    attendanceLogs: [] as any[],
  });

  // Load doctors list for filter
  useEffect(() => {
    if (window.api && (window.api as any).getDoctorsList) {
      (window.api as any).getDoctorsList().then((res: Doctor[]) => setDoctors(res || []));
    }
  }, []);

  useEffect(() => {
    let startDate = '';
    let endDate = '';

    if (range === 'custom') {
      startDate = customStartDate + ' 00:00:00';
      endDate = customEndDate + ' 23:59:59';
    } else if (range === 'month') {
      const [yr, mo] = selectedMonth.split('-').map(Number);
      const firstDay = new Date(yr, mo - 1, 1);
      const lastDay = new Date(yr, mo, 0);
      startDate = firstDay.toISOString().split('T')[0] + ' 00:00:00';
      endDate = lastDay.toISOString().split('T')[0] + ' 23:59:59';
    } else {
      endDate = referenceDate + ' 23:59:59';
      if (range === 'daily') {
        startDate = referenceDate + ' 00:00:00';
      } else if (range === 'weekly') {
        const p = new Date(referenceDate);
        p.setDate(p.getDate() - 7);
        startDate = p.toISOString().split('T')[0] + ' 00:00:00';
      } else if (range === '2weeks') {
        const p = new Date(referenceDate);
        p.setDate(p.getDate() - 14);
        startDate = p.toISOString().split('T')[0] + ' 00:00:00';
      } else if (range === '3weeks') {
        const p = new Date(referenceDate);
        p.setDate(p.getDate() - 21);
        startDate = p.toISOString().split('T')[0] + ' 00:00:00';
      } else {
        const p = new Date(referenceDate);
        p.setMonth(p.getMonth() - 1);
        startDate = p.toISOString().split('T')[0] + ' 00:00:00';
      }
    }

    if (window.api && window.api.getReportStats) {
      window.api.getReportStats({ startDate, endDate, doctorId: selectedDoctorId })
        .then(res => {
          setStats(res ? {
            clientsInPeriod: res.clientsInPeriod || 0,
            sessionsCount: res.sessionsCount || 0,
            totalIncome: res.totalIncome || 0,
            totalLoans: res.totalLoans || 0,
            totalWastes: res.totalWastes || 0,
            dailyBreakdown: res.dailyBreakdown || [],
            detailedPayments: res.detailedPayments || [],
            detailedSessions: res.detailedSessions || [],
            loanDetails: res.loanDetails || [],
            wasteDetails: res.wasteDetails || [],
            attendanceLogs: (res as any).attendanceLogs || [],
          } : {
            clientsInPeriod: 0,
            sessionsCount: 0,
            totalIncome: 0,
            totalLoans: 0,
            totalWastes: 0,
            dailyBreakdown: [],
            detailedPayments: [],
            detailedSessions: [],
            loanDetails: [],
            wasteDetails: [],
            attendanceLogs: [],
          });
        })
        .catch(console.error);
    }
  }, [range, referenceDate, selectedDoctorId, customStartDate, customEndDate, selectedMonth]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatTimeAmPm = (timeStr: string) => {
    if (!timeStr) return '—';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    } catch { return timeStr; }
  };

  const rangeOptions = [
    { id: 'daily', label: t('day_opt') },
    { id: 'weekly', label: t('week_opt') },
    { id: '2weeks', label: t('2weeks_opt') },
    { id: '3weeks', label: t('3weeks_opt') },
    { id: 'monthly', label: t('month_opt') },
    { id: 'custom', label: t('custom_range_opt') },
    { id: 'month', label: t('select_month_opt') },
  ];

  const periodLabel = () => {
    const localeStr = language === 'ar' ? 'ar-EG' : 'en-US';
    if (range === 'custom') return `${formatDate(customStartDate)} ${t('to_date_connector')} ${formatDate(customEndDate)}`;
    if (range === 'month') {
      const [yr, mo] = selectedMonth.split('-').map(Number);
      return new Date(yr, mo - 1, 1).toLocaleDateString(localeStr, { month: 'long', year: 'numeric' });
    }
    if (range === 'daily') return formatDate(referenceDate);
    const last = stats.dailyBreakdown[stats.dailyBreakdown.length - 1];
    return `${formatDate(last?.date || referenceDate)} ${t('to_date_connector')} ${formatDate(referenceDate)}`;
  };

  const netRevenue = stats.totalIncome - (stats.totalLoans || 0) - (stats.totalWastes || 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto printable-area space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-foreground font-heading tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-primary" size={24} /> {t('clinic_audit_report')}
          </h1>
          <p className="text-muted-foreground text-xs font-medium">
            {t('flat_spreadsheet_view')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Range selector */}
          <div className="flex bg-muted rounded-xl p-1 border border-border w-full sm:w-auto overflow-x-auto">
            {rangeOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider whitespace-nowrap ${range === opt.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Doctor filter */}
          <div className="relative flex items-center w-full sm:w-auto">
            <Stethoscope size={14} className={`absolute ${isAr ? 'right-3' : 'left-3'} text-muted-foreground pointer-events-none`} />
            <select
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className={`${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 rounded-xl border border-border bg-background text-foreground font-bold text-xs outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer w-full appearance-none`}
            >
              <option value="all">{t('all_doctors')}</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Date pickers — conditional on range */}
          {range === 'custom' ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex items-center">
                <Calendar size={14} className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} text-muted-foreground pointer-events-none`} />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className={`${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 rounded-xl border border-border bg-background text-foreground font-bold text-xs outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer`}
                />
              </div>
              <span className="text-muted-foreground text-xs font-bold">{t('to_date_connector')}</span>
              <div className="relative flex items-center">
                <Calendar size={14} className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} text-muted-foreground pointer-events-none`} />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className={`${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 rounded-xl border border-border bg-background text-foreground font-bold text-xs outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer`}
                />
              </div>
            </div>
          ) : range === 'month' ? (
            <div className="relative w-full sm:w-auto flex items-center">
              <Calendar size={14} className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} text-muted-foreground pointer-events-none`} />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className={`w-full sm:w-auto ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 rounded-xl border border-border bg-background text-foreground font-bold text-xs outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer`}
              />
            </div>
          ) : (
            <div className="relative w-full sm:w-auto flex items-center">
              <Calendar size={14} className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} text-muted-foreground pointer-events-none`} />
              <input
                type="date"
                value={referenceDate}
                onChange={e => setReferenceDate(e.target.value)}
                className={`w-full sm:w-auto ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 rounded-xl border border-border bg-background text-foreground font-bold text-xs outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer`}
              />
            </div>
          )}

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:opacity-90 active:scale-98 flex items-center justify-center gap-2 transition-all"
          >
            <Printer size={14} /> {t('print_sheet')}
          </button>
        </div>
      </div>

      {/* Report Document */}
      <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden print:border-none print:shadow-none print:bg-white p-4 sm:p-6 md:p-8 space-y-8 font-sans">
        {/* Header */}
        <div className="border-b border-border/80 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xs font-bold text-primary uppercase tracking-[0.25em] mb-1 font-mono">{t('evolve_clinical_suite')}</h2>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">
              {range === 'daily' ? t('daily_practice_report')
                : range === 'weekly' ? t('weekly_practice_report')
                : range === '2weeks' ? t('bi_weekly_practice_report')
                : range === '3weeks' ? t('tri_weekly_practice_report')
                : range === 'custom' ? t('custom_range_report')
                : range === 'month' ? t('monthly_practice_report')
                : t('monthly_practice_report')}
            </h1>
            <p className="text-muted-foreground text-xs font-medium font-mono mt-1">
              {t('period')} {periodLabel()}
              {selectedDoctorId !== 'all' && ` · ${t('doctor_label')} ${doctors.find(d => d.id === selectedDoctorId)?.name || ''}`}
            </p>
          </div>
          <div className="text-start sm:text-end space-y-1">
            <span className={`font-mono text-[9px] bg-muted px-2 py-1 rounded border border-border/60 text-muted-foreground block w-fit ${isAr ? 'sm:mr-auto' : 'sm:ml-auto'}`}>
              {t('generated_label')} {new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 flex items-center gap-4 border border-border/80 rounded-xl bg-card">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><Users size={20} /></div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block font-mono">{t('patients_treated')}</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{stats.clientsInPeriod}</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-4 border border-border/80 rounded-xl bg-card">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><FileText size={20} /></div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block font-mono">{t('sessions_logged')}</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{stats.sessionsCount}</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-4 border border-border/80 rounded-xl bg-card">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0"><DollarSign size={20} /></div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block font-mono">{t('revenue_realized')}</span>
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">${stats.totalIncome.toLocaleString()}</span>
            </div>
          </div>

          <div className={`p-4 sm:p-5 flex items-center gap-4 border rounded-xl bg-card ${netRevenue >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
            <div className={`p-2 rounded-lg shrink-0 ${netRevenue >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block font-mono">{t('net_revenue')}</span>
              <span className={`text-xl sm:text-2xl font-bold tabular-nums ${netRevenue >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>${netRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 1. Clinical Sessions Sheet */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="text-primary" size={16} />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">{t('treatment_sessions_sheet')}</h3>
          </div>
          <div className="border border-border/90 rounded-xl overflow-x-auto bg-card">
            <table className="w-full text-start border-collapse min-w-[900px] text-xs font-sans">
              <thead>
                <tr className="bg-muted border-b border-border/80 font-mono text-muted-foreground text-[10px] uppercase font-bold text-start">
                  <th className="px-4 py-3 border-e border-border/80 w-24 text-start">{t('time_date')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-36 text-start">{t('patient_name')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-36 text-start">{t('doctor_label').replace(':', '')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-32 text-start">{t('session_type', 'Session Type')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-28 text-center">{t('session_no')}</th>
                  <th className="px-4 py-3 border-e border-border/80 text-start">{t('treatment_rehab_protocols')}</th>
                  <th className="px-4 py-3 text-start">{t('progress_observations')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {stats.detailedSessions && stats.detailedSessions.length > 0 ? (
                  stats.detailedSessions.map(c => (
                    <tr key={c.id} className="hover:bg-muted/15 transition-colors">
                      <td className="px-4 py-3 border-e border-border/80 font-mono whitespace-nowrap text-start">
                        {range === 'daily' ? formatTime(c.session_date) : formatDate(c.session_date)}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 font-bold text-foreground text-start">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 font-bold text-foreground text-start">
                        {c.doctor_name || '—'}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 font-semibold text-foreground text-start">
                        {c.session_type || '—'}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 text-center font-mono font-bold text-primary">
                        {isAr ? `جلسة رقم ${c.session_number || 1}` : `Session #${c.session_number || 1}`}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 text-foreground/90 font-medium text-start">
                        {c.treatment_notes}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium italic text-start">
                        {c.progress_notes || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic font-medium font-mono">
                      {t('no_rehab_sessions_logged')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Revenue & Receipts Sheet */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={16} />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">{t('realized_revenue_sheet')}</h3>
          </div>
          <div className="border border-border/90 rounded-xl overflow-x-auto bg-card">
            <table className="w-full text-start border-collapse min-w-[700px] text-xs font-sans">
              <thead>
                <tr className="bg-muted border-b border-border/80 font-mono text-muted-foreground text-[10px] uppercase font-bold text-start">
                  <th className="px-4 py-3 border-e border-border/80 w-24 text-start">{t('time_date')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-44 text-start">{t('patient_name')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-36 text-start">{t('payment_type')}</th>
                  <th className="px-4 py-3 border-e border-border/80 text-start">{t('acquisition_details')}</th>
                  <th className={`px-4 py-3 w-36 ${isAr ? 'text-left' : 'text-right'}`}>{t('net_paid')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {stats.detailedPayments && stats.detailedPayments.length > 0 ? (
                  stats.detailedPayments.map(c => (
                    <tr key={c.id} className="hover:bg-muted/15 transition-colors">
                      <td className="px-4 py-3 border-e border-border/80 font-mono whitespace-nowrap text-start">
                        {range === 'daily' ? formatTime(c.payment_date) : formatDate(c.payment_date)}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 font-bold text-foreground text-start">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 font-mono text-start">
                        <span className="px-2 py-0.5 bg-muted border border-border/60 rounded text-[10px] font-bold text-foreground uppercase">
                          {c.payment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 text-muted-foreground font-medium text-start">
                        {c.package_sessions_total ? t('prepaid_package').replace('{count}', c.package_sessions_total.toString()) : t('per_session_treatment')}
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold text-emerald-600 text-sm tabular-nums ${isAr ? 'text-left' : 'text-right'}`}>
                        ${c.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground italic font-medium font-mono">
                      {t('no_billing_receipts')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Loans Sheet */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="text-rose-500" size={16} />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">{t('staff_doctor_loans')}</h3>
          </div>
          <div className="border border-border/90 rounded-xl overflow-x-auto bg-card">
            <table className="w-full text-start border-collapse min-w-[500px] text-xs font-sans">
              <thead>
                <tr className="bg-muted border-b border-border/80 font-mono text-muted-foreground text-[10px] uppercase font-bold text-start">
                  <th className="px-4 py-3 border-e border-border/80 w-24 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-40 text-start">{isAr ? 'الموظف / الطبيب' : 'Staff / Doctor'}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-24 text-start">{t('role')}</th>
                  <th className="px-4 py-3 border-e border-border/80 text-start">{t('note')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-24 text-start">{t('status')}</th>
                  <th className={`px-4 py-3 w-28 ${isAr ? 'text-left' : 'text-right'}`}>{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {stats.loanDetails && stats.loanDetails.length > 0 ? (
                  stats.loanDetails.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/15 transition-colors">
                      <td className="px-4 py-3 border-e border-border/80 font-mono whitespace-nowrap text-start">
                        {formatDate(l.loan_date)}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 font-bold text-foreground text-start">{l.username}</td>
                      <td className="px-4 py-3 border-e border-border/80 text-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.role === 'doctor' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {l.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 text-muted-foreground italic text-start">{l.note || '—'}</td>
                      <td className="px-4 py-3 border-e border-border/80 text-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.is_settled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {l.is_settled ? t('settled') : t('active')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold text-rose-500 tabular-nums ${isAr ? 'text-left' : 'text-right'}`}>
                        ${l.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic font-medium font-mono">
                      {t('no_loans_recorded')}
                    </td>
                  </tr>
                )}
              </tbody>
              {stats.loanDetails && stats.loanDetails.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/30 font-bold">
                    <td colSpan={5} className={`px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-mono border-t border-border/80 ${isAr ? 'text-left' : 'text-right'}`}>{t('total_loans')}</td>
                    <td className={`px-4 py-3 font-mono font-black text-rose-500 border-t border-border/80 ${isAr ? 'text-left' : 'text-right'}`}>
                      ${(stats.totalLoans || 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* 4. Wastes Sheet */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="text-amber-500" size={16} />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">{t('clinic_wastes_sheet')}</h3>
          </div>
          <div className="border border-border/90 rounded-xl overflow-x-auto bg-card">
            <table className="w-full text-start border-collapse min-w-[500px] text-xs font-sans">
              <thead>
                <tr className="bg-muted border-b border-border/80 font-mono text-muted-foreground text-[10px] uppercase font-bold text-start">
                  <th className="px-4 py-3 border-e border-border/80 w-24 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 border-e border-border/80 text-start">{t('item')}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-20 text-center">{t('qty')}</th>
                  <th className={`px-4 py-3 border-e border-border/80 w-28 ${isAr ? 'text-left' : 'text-right'}`}>{t('unit_cost')}</th>
                  <th className={`px-4 py-3 w-28 ${isAr ? 'text-left' : 'text-right'}`}>{t('total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {stats.wasteDetails && stats.wasteDetails.length > 0 ? (
                  stats.wasteDetails.map((w: any) => (
                    <tr key={w.id} className="hover:bg-muted/15 transition-colors">
                      <td className="px-4 py-3 border-e border-border/80 font-mono whitespace-nowrap text-start">
                        {formatDate(w.waste_date)}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 font-bold text-foreground text-start">{w.item_name}</td>
                      <td className="px-4 py-3 border-e border-border/80 text-center font-mono">{w.quantity}</td>
                      <td className={`px-4 py-3 border-e border-border/80 font-mono ${isAr ? 'text-left' : 'text-right'}`}>${w.unit_cost.toLocaleString()}</td>
                      <td className={`px-4 py-3 font-mono font-bold text-amber-500 tabular-nums ${isAr ? 'text-left' : 'text-right'}`}>
                        ${w.total_cost.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground italic font-medium font-mono">
                      {t('no_waste_items')}
                    </td>
                  </tr>
                )}
              </tbody>
              {stats.wasteDetails && stats.wasteDetails.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/30 font-bold">
                    <td colSpan={4} className={`px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-mono border-t border-border/80 ${isAr ? 'text-left' : 'text-right'}`}>{t('total_wastes')}</td>
                    <td className={`px-4 py-3 font-mono font-black text-amber-500 border-t border-border/80 ${isAr ? 'text-left' : 'text-right'}`}>
                      ${(stats.totalWastes || 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* 5. Shift Attendance Sheet */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="text-primary" size={16} />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">{t('shift_attendance_log')}</h3>
          </div>
          <div className="border border-border/90 rounded-xl overflow-x-auto bg-card">
            <table className="w-full text-start border-collapse min-w-[700px] text-xs font-sans">
              <thead>
                <tr className="bg-muted border-b border-border/80 font-mono text-muted-foreground text-[10px] uppercase font-bold text-start">
                  <th className="px-4 py-3 border-e border-border/80 w-28 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-44 text-start">{isAr ? 'المستخدم / المعالج' : 'User / Practitioner'}</th>
                  <th className="px-4 py-3 border-e border-border/80 w-32 text-start">{t('classification')}</th>
                  <th className="px-4 py-3 border-e border-border/80 text-center w-36">{t('check_in')}</th>
                  <th className="px-4 py-3 border-e border-border/80 text-center w-36">{t('check_out')}</th>
                  <th className="px-4 py-3 text-center">{t('hours_worked')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {stats.attendanceLogs && stats.attendanceLogs.length > 0 ? (
                  stats.attendanceLogs.map((log: any) => {
                    let hoursWorked = '—';
                    if (log.check_in_time && log.check_out_time) {
                      try {
                        const [inH, inM, inS] = log.check_in_time.split(':').map(Number);
                        const [outH, outM, outS] = log.check_out_time.split(':').map(Number);
                        const inDate = new Date(2000, 0, 1, inH, inM, inS || 0);
                        const outDate = new Date(2000, 0, 1, outH, outM, outS || 0);
                        const diffMs = outDate.getTime() - inDate.getTime();
                        if (diffMs > 0) {
                          const diffHrs = diffMs / (1000 * 60 * 60);
                          hoursWorked = `${diffHrs.toFixed(2)} ${isAr ? 'ساعة' : 'hrs'}`;
                        }
                      } catch (e) {
                        console.error('Error calculating work hours', e);
                      }
                    }
                    
                    return (
                      <tr key={log.id} className="hover:bg-muted/15 transition-colors">
                        <td className="px-4 py-3 border-e border-border/80 font-mono whitespace-nowrap text-start">
                          {formatDate(log.log_date)}
                        </td>
                        <td className="px-4 py-3 border-e border-border/80 font-bold text-foreground text-start">
                          {log.username}
                        </td>
                        <td className="px-4 py-3 border-e border-border/80 text-start">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                            {log.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-e border-border/80 text-center font-mono font-bold text-emerald-500">
                          {formatTimeAmPm(log.check_in_time)}
                        </td>
                        <td className="px-4 py-3 border-e border-border/80 text-center font-mono font-bold text-purple-500">
                          {formatTimeAmPm(log.check_out_time)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                          {hoursWorked}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic font-medium font-mono">
                      {t('no_attendance_logs')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Daily Log Consolidated Sheet */}
        {range !== 'daily' && stats.dailyBreakdown && stats.dailyBreakdown.length > 1 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Activity className="text-primary" size={16} />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">{t('daily_consolidated_log')}</h3>
            </div>
            <div className="border border-border/90 rounded-xl overflow-x-auto bg-card">
              <table className="w-full text-start border-collapse min-w-[700px] text-xs font-sans">
                <thead>
                  <tr className="bg-muted border-b border-border/80 font-mono text-muted-foreground text-[10px] uppercase font-bold text-start">
                    <th className="px-4 py-3 border-e border-border/80 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="px-4 py-3 border-e border-border/80 text-center">{t('patient_volume')}</th>
                    <th className="px-4 py-3 border-e border-border/80 text-center">{t('sessions_logged')}</th>
                    <th className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t('aggregate_revenue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/80">
                  {stats.dailyBreakdown.map(c => (
                    <tr key={c.date} className="hover:bg-muted/15 transition-colors">
                      <td className="px-4 py-3 border-e border-border/80 font-bold font-mono text-start">
                        {new Date(c.date + 'T12:00:00').toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 text-center font-medium text-foreground">
                        {c.clients} {c.clients === 1 ? (isAr ? 'مريض' : 'Patient') : (isAr ? 'مرضى' : 'Patients')}
                      </td>
                      <td className="px-4 py-3 border-e border-border/80 text-center font-medium text-foreground">
                        {c.sessions} {c.sessions === 1 ? (isAr ? 'جلسة' : 'Session') : (isAr ? 'جلسات' : 'Sessions')}
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold text-primary ${isAr ? 'text-left' : 'text-right'}`}>
                        ${c.income.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`pt-8 border-t border-border/80 flex flex-col sm:flex-row justify-between items-end gap-6 font-mono text-[10px] text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>
          <div className="space-y-1.5 max-w-md text-start">
            <div className="font-bold text-foreground">{t('biometric_system_isolated')}</div>
            <div className="leading-relaxed">
              {t('summary_extracted_local')}
              <br />
              {t('authorized_physiotherapist')}
            </div>
          </div>
          <div className={`text-center sm:text-end space-y-2 min-w-[220px] ${isAr ? 'sm:mr-auto' : 'sm:ml-auto'}`}>
            <div className={`border-b border-border/80 h-10 w-full flex items-end justify-center ${isAr ? 'sm:justify-start' : 'sm:justify-end'} pb-1 italic font-sans text-xs`}>
              {t('practitioner_clinician_signature')}
            </div>
            <div className="font-bold uppercase tracking-wider text-[8px]">{t('verification_stamp_log')}</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .printable-area { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          body { background: white !important; padding: 0 !important; }
          nav, div.w-64 { display: none !important; }
          main { margin-left: 0 !important; width: 100% !important; }
          .bg-card { border: none !important; box-shadow: none !important; }
          .rounded-2xl { border-radius: 0 !important; }
          .shadow-md { box-shadow: none !important; }
        }
      `}} />
    </div>
  );
}
