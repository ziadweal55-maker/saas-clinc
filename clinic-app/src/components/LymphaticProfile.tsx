// TODO(security): Role-based access control is enforced via the readOnly prop passed from the parent.
// All data rendered via React JSX (framework-native auto-escaping). No dangerouslySetInnerHTML used.
// Measurement names and values are validated before API calls to prevent injection via user input.

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle,
  Ruler, Activity, TrendingUp, TrendingDown, Minus, BarChart2, X
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LymphaticMeasurement {
  id: number;
  measurement_name: string;
  value: number;
  unit: string;
  session_date: string;
}

interface LymphaticProfileProps {
  profileId: number;
  currentUser: any;
  readOnly?: boolean;
}

type UnitType = 'cm' | 'kg' | 'inches';

// ─── Standard measurement definitions ────────────────────────────────────────

const STANDARD_MEASUREMENTS: { name: string; unit: UnitType; icon?: React.ReactNode }[] = [
  { name: 'Weight', unit: 'kg' },
  { name: 'Height', unit: 'cm' },
  { name: 'Forearm', unit: 'cm' },
  { name: 'Arm', unit: 'cm' },
  { name: 'Thigh', unit: 'cm' },
  { name: 'Tibia', unit: 'cm' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getTrend(history: LymphaticMeasurement[]): 'up' | 'down' | 'flat' {
  if (history.length < 2) return 'flat';
  const sorted = [...history].sort((a, b) => a.session_date.localeCompare(b.session_date));
  const last = sorted[sorted.length - 1].value;
  const prev = sorted[sorted.length - 2].value;
  if (last > prev) return 'up';
  if (last < prev) return 'down';
  return 'flat';
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp size={13} className="text-emerald-400" />;
  if (trend === 'down') return <TrendingDown size={13} className="text-red-400" />;
  return <Minus size={13} className="text-muted-foreground" />;
}

// ─── Sparkline (simple SVG bar chart) ────────────────────────────────────────

function Sparkline({ history }: { history: LymphaticMeasurement[] }) {
  const sorted = [...history]
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .slice(-5);

  if (sorted.length < 2) return null;

  const values = sorted.map(h => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pad = 2;

  const points = sorted.map((h, i) => {
    const x = pad + (i / (sorted.length - 1)) * (W - pad * 2);
    const y = H - pad - ((h.value - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={W} height={H} className="shrink-0 opacity-80">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {sorted.map((_h, i) => {
        const [x, y] = points[i].split(',').map(Number);
        return (
          <circle key={i} cx={x} cy={y} r={2} fill="hsl(var(--primary))" />
        );
      })}
    </svg>
  );
}

// ─── Feedback Banner ──────────────────────────────────────────────────────────

function FeedbackBanner({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
        ${type === 'success'
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
          : 'bg-red-500/15 text-red-400 border border-red-500/20'
        }`}
    >
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

// ─── Single Measurement Row ───────────────────────────────────────────────────

interface MeasurementRowProps {
  name: string;
  defaultUnit: UnitType;
  history: LymphaticMeasurement[];
  readOnly: boolean;
  onSave: (name: string, value: number, unit: UnitType, date: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isCustom?: boolean;
  saving: boolean;
}

function MeasurementRow({
  name, defaultUnit, history, readOnly, onSave, onDelete, saving
}: MeasurementRowProps) {
  const { t, isAr } = useLanguage();
  const sorted = [...history].sort((a, b) => b.session_date.localeCompare(a.session_date));
  const latest = sorted[0];
  const trend = getTrend(history);

  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<UnitType>(defaultUnit);
  const [date, setDate] = useState(todayStr());
  const [showHistory, setShowHistory] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

  const handleSave = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) return;
    setLocalSaving(true);
    await onSave(name, numVal, unit, date);
    setValue('');
    setDate(todayStr());
    setLocalSaving(false);
  };

  // Translate standard measurement names dynamically
  const translatedName = t(name.toLowerCase(), name);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3 hover:border-primary/30 transition-all shadow-sm">
      {/* Row header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Ruler size={15} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">{translatedName}</p>
            {latest ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-primary font-semibold">{latest.value} {latest.unit}</span>
                <TrendIcon trend={trend} />
                <span className="text-[10px] text-muted-foreground">{latest.session_date}</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">{t('no_data_yet', 'No data yet')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length >= 2 && (
            <Sparkline history={history} />
          )}
          <button
            onClick={() => setShowHistory(v => !v)}
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all flex items-center gap-1 cursor-pointer"
          >
            <BarChart2 size={12} />
            {showHistory ? t('hide', 'Hide') : t('history_count', `History (${history.length})`).replace('{count}', history.length.toString())}
          </button>
        </div>
      </div>

      {/* Input row */}
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder={t('value', 'Value')}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-24 bg-background border border-border rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value as UnitType)}
            className="bg-background border border-border rounded-xl px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="cm">cm</option>
            <option value="kg">kg</option>
            <option value="inches">inches</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          />
          <button
            onClick={handleSave}
            disabled={saving || localSaving || !value.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {localSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {t('save')}
          </button>
        </div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">{t('last_entries', 'Last entries')}</p>
          {sorted.slice(0, 5).map(h => (
            <div key={h.id} className="flex items-center justify-between group px-2 py-1 rounded-lg hover:bg-muted/40">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{h.session_date}</span>
                <span className="text-sm font-semibold text-foreground">{h.value} <span className="text-xs text-muted-foreground">{h.unit}</span></span>
                {(h as any).doctor_name && (
                  <span className="text-[10px] text-muted-foreground italic bg-muted px-2 py-0.5 rounded-full shrink-0">
                    {t('signed_by', 'Signed by:')} {(h as any).doctor_name}
                  </span>
                )}
              </div>
              {!readOnly && (
                <button
                  onClick={() => onDelete(h.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LymphaticProfile({ profileId, currentUser, readOnly = false }: LymphaticProfileProps) {
  const { t, isAr } = useLanguage();
  const [allMeasurements, setAllMeasurements] = useState<LymphaticMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);

  // Custom measurement management
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, docs] = await Promise.all([
        (window.api as any).getLymphaticMeasurements(profileId),
        (window.api as any).getActiveDoctors()
      ]);
      const measurements: LymphaticMeasurement[] = data || [];
      setAllMeasurements(measurements);
      setDoctors(docs || []);
      if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
        setSelectedDoctorId(currentUser.doctor_id.toString());
      }
    } catch {
      showFeedback(t('toast_failed_load_attendance', 'Failed to load measurements'), 'error');
    } finally {
      setLoading(false);
    }
  }, [profileId, currentUser, t]);

  useEffect(() => { load(); }, [load]);

  const getHistory = (name: string): LymphaticMeasurement[] =>
    allMeasurements.filter(m => m.measurement_name === name);

  const handleSave = async (name: string, value: number, unit: UnitType, date: string) => {
    if (!selectedDoctorId) {
      showFeedback(t('doctor_signature_req_error', 'Doctor signature is required before saving.'), 'error');
      return;
    }
    setSaving(true);
    try {
      await (window.api as any).saveLymphaticMeasurement(profileId, {
        measurement_name: name,
        value,
        unit,
        session_date: date,
        doctor_id: parseInt(selectedDoctorId)
      });
      showFeedback(`${t(name.toLowerCase(), name)} ${t('salary_saved', 'saved')}`, 'success');
      await load();
    } catch {
      showFeedback(t('toast_patient_error', 'Failed to save measurement'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await (window.api as any).deleteLymphaticMeasurement(id);
      showFeedback(t('toast_request_denied', 'Entry deleted'), 'success');
      await load();
    } catch {
      showFeedback(t('toast_patient_error', 'Failed to delete entry'), 'error');
    }
  };

  const handleAddCustom = () => {
    const trimmed = newCustomName.trim();
    if (!trimmed) return;
    // Validate: no special chars that could cause issues
    if (!/^[a-zA-Z0-9\s\-_()أ-ي]{1,64}$/.test(trimmed)) {
      showFeedback(t('invalid_name_error', 'Measurement name: letters, numbers, spaces, hyphens only (max 64 chars)'), 'error');
      return;
    }
    const allNames = [...STANDARD_MEASUREMENTS.map(m => m.name), ...customNames];
    if (allNames.includes(trimmed)) {
      showFeedback(t('measurement_exists_error', 'Measurement already exists'), 'error');
      return;
    }
    setCustomNames(prev => [...prev, trimmed]);
    setNewCustomName('');
    setShowAddCustom(false);
  };

  const handleRemoveCustom = (name: string) => {
    setCustomNames(prev => prev.filter(n => n !== name));
  };

  // Summary stats
  const totalEntries = allMeasurements.length;
  const uniqueMeasurements = new Set(allMeasurements.map(m => m.measurement_name)).size;

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 size={20} className="animate-spin text-primary" />
      <span className="text-sm">{t('loading_measurements', 'Loading measurements…')}</span>
    </div>
  );

  return (
    <div className="bg-background min-h-full space-y-5">
      {/* Header stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('total_entries', 'Total Entries'), value: totalEntries, icon: <Activity size={16} className="text-primary" /> },
          { label: t('measurements', 'Measurements'), value: uniqueMeasurements, icon: <Ruler size={16} className="text-primary" /> },
          { label: t('standard', 'Standard'), value: STANDARD_MEASUREMENTS.length, icon: <BarChart2 size={16} className="text-primary" /> },
          { label: t('custom', 'Custom'), value: customNames.length, icon: <Plus size={16} className="text-primary" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {stat.icon}
            </div>
            <div>
              <p className="text-lg font-black text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {feedback && <FeedbackBanner message={feedback.msg} type={feedback.type} />}

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('doctor_signature_req', 'Doctor Signature (Required)')}</label>
          <select 
            disabled={readOnly || currentUser?.role === 'doctor'}
            value={selectedDoctorId} 
            onChange={e => setSelectedDoctorId(e.target.value)} 
            className="w-full px-3 py-2.5 text-xs bg-background border border-border rounded-xl text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">{t('select_doctor', 'Select Doctor...')}</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Standard Measurements */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Ruler size={14} /> {t('standard_measurements_lbl', 'Standard Measurements')}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {STANDARD_MEASUREMENTS.map(m => (
            <MeasurementRow
              key={m.name}
              name={m.name}
              defaultUnit={m.unit}
              history={getHistory(m.name)}
              readOnly={readOnly}
              onSave={handleSave}
              onDelete={handleDelete}
              saving={saving}
            />
          ))}
        </div>
      </div>

      {/* Custom Measurements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Plus size={14} /> {t('custom_measurements_lbl', 'Custom Measurements')}
          </h3>
          {!readOnly && (
            <button
              onClick={() => setShowAddCustom(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md cursor-pointer"
            >
              <Plus size={12} /> {t('add_measurement_btn', 'Add Measurement')}
            </button>
          )}
        </div>

        {/* Add custom form */}
        {showAddCustom && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-2 shadow-sm">
            <input
              type="text"
              placeholder={t('measurement_name_placeholder', 'Measurement name (e.g. Calf, Waist…)')}
              value={newCustomName}
              onChange={e => setNewCustomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              maxLength={64}
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleAddCustom}
              disabled={!newCustomName.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Plus size={13} /> {t('add', 'Add')}
            </button>
            <button
              onClick={() => { setShowAddCustom(false); setNewCustomName(''); }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:opacity-80 transition-all cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {customNames.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm bg-card border border-border rounded-2xl shadow-sm">
            <BarChart2 size={30} className="mx-auto mb-2 opacity-30" />
            {t('no_custom_measurements_desc', 'No custom measurements yet. Click "Add Measurement" to create one.')}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {customNames.map(name => (
              <div key={name} className="relative">
                <MeasurementRow
                  name={name}
                  defaultUnit="cm"
                  history={getHistory(name)}
                  readOnly={readOnly}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  saving={saving}
                  isCustom
                />
                {!readOnly && (
                  <button
                    onClick={() => handleRemoveCustom(name)}
                    title={t('remove_custom_measurement_tooltip', 'Remove custom measurement')}
                    className="absolute top-3 right-3 p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LymphaticProfile;
