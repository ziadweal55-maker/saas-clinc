import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Activity, Clipboard, Target,
  ChevronDown, ChevronRight, Plus, Trash2, Save,
  CheckCircle, XCircle, Zap, Hand, Wrench
} from 'lucide-react';

function formatPTDate(dateStr: string | null | undefined, includeTime = false) {
  if (!dateStr) return '';
  const isoStr = dateStr.replace(' ', 'T');
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return dateStr;
  return includeTime ? d.toLocaleString() : d.toLocaleDateString();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PhysicalTherapyProfileProps {
  profileId: number;
  currentUser: any;
  readOnly?: boolean;
}

type PTTab = 'red-flags' | 'physical-assessment' | 'special-tests' | 'session-plan';
type AssessmentSection = 'subjective' | 'objective';

interface ObjectiveRow {
  id: number | string;
  row_type: 'AROM' | 'PROM';
  joint_name: string;
  pain: boolean;
  limitation: boolean;
  angle: string;
  sort_order: number;
}

interface SpecialTestResult {
  test_id?: number;
  test_name?: string;
  region_name?: string;
  result: string;
}

interface SessionItem {
  selected: boolean;
  notes: string;
  custom_name?: string;
}

// ─── Feedback flash helper ──────────────────────────────────────────────────────

function useFeedback() {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const flash = useCallback((type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 2800);
  }, []);
  return { feedback, flash };
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

// Spinner
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  );
}

// Feedback banner
function FeedbackBanner({ feedback }: { feedback: { type: 'success' | 'error'; msg: string } | null }) {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all animate-pulse
      ${isSuccess ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
      {isSuccess ? <CheckCircle size={14} /> : <XCircle size={14} />}
      {feedback.msg}
    </div>
  );
}

// Save button
function SaveBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60"
    >
      <Save size={14} />
      {loading ? 'Saving...' : 'Save'}
    </button>
  );
}

// Section divider
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] italic">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── TAB 1: Red Flags ──────────────────────────────────────────────────────────

const RED_FLAG_OPTIONS = ['Myelopathy', 'Cauda Equina', 'Drop Foot', 'Urinary Incontinence', 'Motor Weakness', 'Other', 'No'];

function RedFlagsTab({ profileId, currentUser, readOnly }: { profileId: number; currentUser: any; readOnly?: boolean }) {
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const { feedback, flash } = useFeedback();

  useEffect(() => {
    const load = async () => {
      if (!window.api) { setLoading(false); return; }
      try {
        const [res, docs] = await Promise.all([
          (window.api as any).getPTRedFlags(profileId),
          (window.api as any).getActiveDoctors(),
        ]);
        setDoctors(docs || []);
        if (res) {
          setSelectedFlags(typeof res.flags === 'string' ? JSON.parse(res.flags || '[]') : (res.flags || []));
          setOtherText(res.other_text || '');
          if (res.doctor_id) {
            setSelectedDoctorId(res.doctor_id.toString());
          } else if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
            setSelectedDoctorId(currentUser.doctor_id.toString());
          }
        } else if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
          setSelectedDoctorId(currentUser.doctor_id.toString());
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [profileId, currentUser]);

  const toggleFlag = (flag: string) => {
    if (readOnly) return;
    if (flag === 'No') {
      setSelectedFlags(selectedFlags.includes('No') ? [] : ['No']);
      return;
    }
    setSelectedFlags(prev => {
      const withoutNo = prev.filter(f => f !== 'No');
      return withoutNo.includes(flag)
        ? withoutNo.filter(f => f !== flag)
        : [...withoutNo, flag];
    });
  };

  const handleSave = async () => {
    if (!window.api) return;
    if (!selectedDoctorId) {
      flash('error', 'Doctor signature is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await (window.api as any).savePTRedFlags(profileId, {
        flags: JSON.stringify(selectedFlags),
        other_text: otherText,
        doctor_id: parseInt(selectedDoctorId),
      });
      flash(res?.success ? 'success' : 'error', res?.success ? 'Red flags saved.' : 'Save failed.');
    } catch { flash('error', 'Save failed.'); }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  const isNo = selectedFlags.includes('No');
  const isOtherSelected = selectedFlags.includes('Other');

  return (
    <div className="space-y-6">
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-destructive" />
          <h3 className="text-sm font-black text-destructive uppercase tracking-wider italic">
            Neurological Red Flags Screening
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          Select all applicable neurological red flags. Selecting <strong>No</strong> clears all others.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RED_FLAG_OPTIONS.map(flag => {
          const isSelected = selectedFlags.includes(flag);
          const isNoFlag = flag === 'No';
          return (
            <button
              key={flag}
              onClick={() => toggleFlag(flag)}
              disabled={readOnly || (!isNoFlag && isNo)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all font-bold text-sm active:scale-95
                ${isSelected
                  ? isNoFlag
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-destructive/10 border-destructive text-destructive shadow-md'
                  : 'bg-card border-border text-foreground hover:border-primary/40 hover:bg-muted/40'
                }
                ${readOnly || (!isNoFlag && isNo) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                ${isSelected
                  ? isNoFlag ? 'bg-accent border-accent' : 'bg-destructive border-destructive'
                  : 'border-border bg-background'
                }`}>
                {isSelected && <CheckCircle size={12} className="text-white" />}
              </span>
              <span className="uppercase tracking-tight text-xs font-black">{flag}</span>
            </button>
          );
        })}
      </div>

      {isOtherSelected && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Other — Describe</label>
          <textarea
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
            disabled={readOnly}
            rows={3}
            placeholder="Describe the other red flag..."
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
          />
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Doctor Signature (Required)</label>
          <select 
            disabled={readOnly || currentUser?.role === 'doctor'}
            value={selectedDoctorId} 
            onChange={e => setSelectedDoctorId(e.target.value)} 
            className="w-full px-3 py-2.5 text-xs bg-background border border-border rounded-xl text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select Assigning Clinician...</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
            ))}
          </select>
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <FeedbackBanner feedback={feedback} />
          <SaveBtn onClick={handleSave} loading={saving} />
        </div>
      )}
    </div>
  );
}

// ─── TAB 2a: Subjective ────────────────────────────────────────────────────────

const IRRITABILITY_OPTIONS = ['High', 'Mod', 'Low'] as const;
const NATURE_OPTIONS = ['Inflammatory', 'Mechanical', 'Neural'] as const;

function SubjectiveSection({ profileId, assessmentId, currentUser, readOnly, onAssessmentSaved }: { profileId: number; assessmentId: number | null; currentUser: any; readOnly?: boolean; onAssessmentSaved: (id: number) => void }) {
  const [data, setData] = useState({
    chief_complaint: '',
    aggravating: '',
    easing: '',
    irritability: '',
    irritability_notes: '',
    nature: '',
    nature_notes: '',
    pain_scale: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const { feedback, flash } = useFeedback();

  useEffect(() => {
    const load = async () => {
      if (!window.api) { setLoading(false); return; }
      setLoading(true);
      try {
        const docs = await (window.api as any).getActiveDoctors();
        setDoctors(docs || []);

        if (!assessmentId) {
          setData({
            chief_complaint: '',
            aggravating: '',
            easing: '',
            irritability: '',
            irritability_notes: '',
            nature: '',
            nature_notes: '',
            pain_scale: '',
          });
          if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
            setSelectedDoctorId(currentUser.doctor_id.toString());
          } else {
            setSelectedDoctorId('');
          }
          setLoading(false);
          return;
        }

        const res = await (window.api as any).getPTSubjective(profileId, assessmentId);
        if (res) {
          setData({
            chief_complaint: res.chief_complaint || '',
            aggravating: res.aggravating || '',
            easing: res.easing || '',
            irritability: res.irritability || '',
            irritability_notes: res.irritability_notes || '',
            nature: res.nature || '',
            nature_notes: res.nature_notes || '',
            pain_scale: res.pain_scale || '',
          });
          if (res.doctor_id) {
            setSelectedDoctorId(res.doctor_id.toString());
          } else if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
            setSelectedDoctorId(currentUser.doctor_id.toString());
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [profileId, assessmentId, currentUser]);

  const set = (key: string, val: string) => setData(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!window.api) return;
    if (!selectedDoctorId) {
      flash('error', 'Doctor signature is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await (window.api as any).savePTSubjective(profileId, {
        id: assessmentId,
        ...data,
        doctor_id: parseInt(selectedDoctorId),
      });
      if (res?.success && res.id) {
        flash('success', assessmentId ? 'Subjective updated.' : 'New physical assessment subjective saved.');
        onAssessmentSaved(res.id);
      } else {
        flash('error', 'Save failed.');
      }
    } catch { flash('error', 'Save failed.'); }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <SectionLabel label="Subjective Assessment" />

      {[
        { key: 'chief_complaint', label: 'Chief Complaint' },
        { key: 'aggravating', label: 'Aggravating Factors' },
        { key: 'easing', label: 'Easing Factors' },
      ].map(({ key, label }) => (
        <div key={key} className="space-y-1.5">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</label>
          <textarea
            value={(data as any)[key]}
            onChange={e => set(key, e.target.value)}
            disabled={readOnly}
            rows={3}
            placeholder={`Enter ${label.toLowerCase()}...`}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all resize-y min-h-[80px]"
          />
        </div>
      ))}

      {/* Pain Scale (VAS) */}
      <div className="space-y-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pain Scale (VAS 0-10)</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={data.pain_scale || '0'}
            onChange={e => set('pain_scale', e.target.value)}
            disabled={readOnly}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 border-2 ${
            Number(data.pain_scale || 0) <= 3 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' :
            Number(data.pain_scale || 0) <= 6 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' :
            'bg-rose-500/10 border-rose-500/30 text-rose-600'
          }`}>{data.pain_scale || '0'}</div>
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
          <span>No Pain (0)</span>
          <span>Moderate (5)</span>
          <span>Worst Pain (10)</span>
        </div>
      </div>

      {/* Irritability */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Irritability</label>
        <div className="flex gap-2 flex-wrap">
          {IRRITABILITY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => set('irritability', data.irritability === opt ? '' : opt)}
              disabled={readOnly}
              className={`px-5 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95
                ${data.irritability === opt
                  ? opt === 'High' ? 'bg-destructive border-destructive text-white shadow-md'
                    : opt === 'Mod' ? 'bg-yellow-500 border-yellow-500 text-white shadow-md'
                    : 'bg-accent border-accent text-white shadow-md'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
            >{opt}</button>
          ))}
        </div>
        <textarea
          value={data.irritability_notes}
          onChange={e => set('irritability_notes', e.target.value)}
          disabled={readOnly}
          rows={2}
          placeholder="Irritability notes..."
          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all resize-y min-h-[60px]"
        />
      </div>

      {/* Nature */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nature</label>
        <div className="flex gap-2 flex-wrap">
          {NATURE_OPTIONS.map(opt => {
            const isSelected = data.nature.split(',').map(s => s.trim()).includes(opt);
            return (
              <button
                key={opt}
                onClick={() => {
                  const current = data.nature ? data.nature.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const next = current.includes(opt) ? current.filter(s => s !== opt) : [...current, opt];
                  set('nature', next.join(', '));
                }}
                disabled={readOnly}
                className={`px-5 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95
                  ${isSelected
                    ? 'bg-primary border-primary text-primary-foreground shadow-md'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              >{opt}</button>
            );
          })}
        </div>
        <textarea
          value={data.nature_notes}
          onChange={e => set('nature_notes', e.target.value)}
          disabled={readOnly}
          rows={2}
          placeholder="Nature notes..."
          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all resize-y min-h-[60px]"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Doctor Signature (Required)</label>
          <select 
            disabled={readOnly || currentUser?.role === 'doctor'}
            value={selectedDoctorId} 
            onChange={e => setSelectedDoctorId(e.target.value)} 
            className="w-full px-3 py-2.5 text-xs bg-background border border-border rounded-xl text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select Assigning Clinician...</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
            ))}
          </select>
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <FeedbackBanner feedback={feedback} />
          <SaveBtn onClick={handleSave} loading={saving} />
        </div>
      )}
    </div>
  );
}

// ─── TAB 2b: Objective ────────────────────────────────────────────────────────

let _rowCounter = 1000;
function nextTempId() { return `temp_${_rowCounter++}`; }

function ObjectiveSection({ profileId, assessmentId, currentUser, readOnly }: { profileId: number; assessmentId: number; currentUser: any; readOnly?: boolean }) {
  const [rows, setRows] = useState<ObjectiveRow[]>([]);
  const [palpation, setPalpation] = useState('');
  const [positiveTests, setPositiveTests] = useState<SpecialTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const { feedback, flash } = useFeedback();

  useEffect(() => {
    const load = async () => {
      if (!window.api) { setLoading(false); return; }
      setLoading(true);
      try {
        const [rowData, palpData, testData, docs] = await Promise.all([
          (window.api as any).getPTObjectiveRows(profileId, assessmentId),
          (window.api as any).getPTPalpation(profileId, assessmentId),
          (window.api as any).getPTSpecialTestResults(profileId),
          (window.api as any).getActiveDoctors(),
        ]);
        setRows(rowData || []);
        setPalpation(palpData?.notes || '');
        setPositiveTests((testData || []).filter((t: SpecialTestResult) => t.result === 'Positive'));
        setDoctors(docs || []);
        if (palpData) {
          if (palpData.doctor_id) {
            setSelectedDoctorId(palpData.doctor_id.toString());
          } else if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
            setSelectedDoctorId(currentUser.doctor_id.toString());
          }
        } else if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
          setSelectedDoctorId(currentUser.doctor_id.toString());
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [profileId, assessmentId, currentUser]);

  const addRow = (type: 'AROM' | 'PROM') => {
    const newRow: ObjectiveRow = {
      id: nextTempId(),
      row_type: type,
      joint_name: '',
      pain: false,
      limitation: false,
      angle: '',
      sort_order: rows.filter(r => r.row_type === type).length,
    };
    setRows(prev => [...prev, newRow]);
  };

  const updateRow = (id: number | string, field: keyof ObjectiveRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteRow = (id: number | string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    if (!window.api) return;
    if (!selectedDoctorId) {
      flash('error', 'Doctor signature is required.');
      return;
    }
    setSaving(true);
    try {
      const [rowRes, palRes] = await Promise.all([
        (window.api as any).savePTObjectiveRows(profileId, { subjectiveId: assessmentId, rows }),
        (window.api as any).savePTPalpation(profileId, { subjectiveId: assessmentId, notes: palpation, doctor_id: parseInt(selectedDoctorId) }),
      ]);
      const ok = rowRes?.success && palRes?.success;
      flash(ok ? 'success' : 'error', ok ? 'Objective data saved.' : 'Save failed.');
    } catch { flash('error', 'Save failed.'); }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  const renderTable = (type: 'AROM' | 'PROM') => {
    const typeRows = rows.filter(r => r.row_type === type);
    return (
      <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm flex-1">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-5 rounded-full ${type === 'AROM' ? 'bg-primary' : 'bg-accent'}`} />
            <span className="text-sm font-black text-foreground uppercase tracking-widest italic">{type} (Range of Motion)</span>
          </div>
          {!readOnly && (
            <button
              onClick={() => addRow(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-sm"
            >
              <Plus size={12} /> Add Joint
            </button>
          )}
        </div>

        {typeRows.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest italic opacity-60 bg-muted/20 rounded-2xl border border-dashed border-border/80">
            No joint assessments added
          </div>
        )}

        {typeRows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-background/50">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3.5 py-3 text-left font-black text-muted-foreground uppercase tracking-widest text-[9px]">Joint</th>
                  <th className="px-2 py-3 text-center font-black text-rose-500 uppercase tracking-widest text-[9px]">Pain</th>
                  <th className="px-2 py-3 text-center font-black text-primary uppercase tracking-widest text-[9px]">Limitation</th>
                  <th className="px-3.5 py-3 text-left font-black text-muted-foreground uppercase tracking-widest text-[9px]">Angle</th>
                  {!readOnly && <th className="px-2 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {typeRows.map(row => (
                  <tr key={row.id} className="bg-card hover:bg-muted/10 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        value={row.joint_name}
                        onChange={e => updateRow(row.id, 'joint_name', e.target.value)}
                        disabled={readOnly}
                        placeholder="e.g. Knee"
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-1 focus:ring-primary outline-none transition-all min-w-[90px]"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={row.pain}
                          onChange={e => updateRow(row.id, 'pain', e.target.checked)}
                          disabled={readOnly}
                          className="w-4.5 h-4.5 accent-rose-500 cursor-pointer rounded-md border-border"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={row.limitation}
                          onChange={e => updateRow(row.id, 'limitation', e.target.checked)}
                          disabled={readOnly}
                          className="w-4.5 h-4.5 accent-primary cursor-pointer rounded-md border-border"
                        />
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        value={row.angle}
                        onChange={e => updateRow(row.id, 'angle', e.target.value)}
                        disabled={readOnly}
                        placeholder="e.g. 120°"
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary outline-none transition-all min-w-[50px]"
                      />
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SectionLabel label="Objective Assessment" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTable('AROM')}
        {renderTable('PROM')}
      </div>

      {/* Positive Special Tests (read-only from special tests tab) */}
      <div className="space-y-2">
        <SectionLabel label="Positive Special Tests (from Special Tests tab)" />
        {positiveTests.length === 0 ? (
          <p className="text-xs text-muted-foreground italic font-medium opacity-70">No positive findings recorded.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {positiveTests.map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Activity size={11} />
                {t.test_name || `Test #${i + 1}`}
                {t.region_name && <span className="opacity-60 normal-case">— {t.region_name}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Palpation */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Palpation Notes</label>
        <textarea
          value={palpation}
          onChange={e => setPalpation(e.target.value)}
          disabled={readOnly}
          rows={4}
          placeholder="Palpation findings..."
          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Doctor Signature (Required)</label>
          <select 
            disabled={readOnly || currentUser?.role === 'doctor'}
            value={selectedDoctorId} 
            onChange={e => setSelectedDoctorId(e.target.value)} 
            className="w-full px-3 py-2.5 text-xs bg-background border border-border rounded-xl text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select Assigning Clinician...</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
            ))}
          </select>
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <FeedbackBanner feedback={feedback} />
          <SaveBtn onClick={handleSave} loading={saving} />
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: Physical Assessment (container) ────────────────────────────────────

function PhysicalAssessmentTab({ profileId, currentUser, readOnly }: { profileId: number; currentUser: any; readOnly?: boolean }) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [activeAssessmentId, setActiveAssessmentId] = useState<number | null>(null);
  const [section, setSection] = useState<AssessmentSection>('subjective');
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const { feedback, flash } = useFeedback();

  const loadAssessments = useCallback(async (selectLatest = false) => {
    if (!window.api) {
      setLoading(false);
      return;
    }
    try {
      const [res, docs] = await Promise.all([
        (window.api as any).getPTSubjectives(profileId),
        (window.api as any).getActiveDoctors()
      ]);
      setDoctors(Array.isArray(docs) ? docs : []);
      const assessmentsList = Array.isArray(res) ? res : [];
      setAssessments(assessmentsList);
      if (assessmentsList.length > 0) {
        if (selectLatest || activeAssessmentId === null || !assessmentsList.some((a: any) => a.id === activeAssessmentId)) {
          setActiveAssessmentId(assessmentsList[0].id);
        }
      } else {
        setActiveAssessmentId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profileId, activeAssessmentId]);

  useEffect(() => {
    loadAssessments(true);
  }, [profileId]);

  const selectAssessment = (id: number) => {
    setActiveAssessmentId(id);
    setSection('subjective');
  };

  const startNewAssessment = () => {
    setActiveAssessmentId(null);
    setSection('subjective');
  };

  const handleAssessmentSaved = async (id: number) => {
    setActiveAssessmentId(id);
    await loadAssessments();
    flash('success', 'Assessment saved successfully.');
  };

  const handleTabClick = async (tabId: AssessmentSection) => {
    if (tabId === 'objective' && !activeAssessmentId) {
      if (!window.api) return;
      setLoading(true);
      try {
        const res = await (window.api as any).savePTSubjective(profileId, {
          chief_complaint: '',
          aggravating: '',
          easing: '',
          irritability: '',
          irritability_notes: '',
          nature: '',
          nature_notes: '',
          doctor_id: currentUser?.doctor_id || (doctors.length > 0 ? doctors[0].id : 1),
        });
        if (res?.success && res.id) {
          setActiveAssessmentId(res.id);
          await loadAssessments();
          setSection('objective');
        } else {
          flash('error', 'Could not initialize assessment draft.');
        }
      } catch (err) {
        console.error(err);
        flash('error', 'Could not initialize assessment draft.');
      } finally {
        setLoading(false);
      }
    } else {
      setSection(tabId);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.api) return;
    if (!window.confirm("Are you sure you want to delete this physical assessment?")) return;
    try {
      const res = await (window.api as any).deletePTAssessment(id);
      if (res?.success) {
        flash('success', 'Assessment deleted.');
        const assessmentsList = Array.isArray(assessments) ? assessments : [];
        const updated = assessmentsList.filter(a => a.id !== id);
        setAssessments(updated);
        if (activeAssessmentId === id) {
          if (updated.length > 0) {
            setActiveAssessmentId(updated[0].id);
          } else {
            setActiveAssessmentId(null);
          }
        }
      } else {
        flash('error', 'Failed to delete.');
      }
    } catch {
      flash('error', 'Failed to delete.');
    }
  };

  if (loading) return <Spinner />;

  const sections: { id: AssessmentSection; label: string }[] = [
    { id: 'subjective', label: 'Subjective' },
    { id: 'objective', label: 'Objective' },
  ];

  const assessmentsList = Array.isArray(assessments) ? assessments : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      {/* Sidebar history */}
      <div className="w-full lg:w-64 shrink-0 space-y-4 border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 lg:pr-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assessments History</span>
          {!readOnly && (
            <button
              onClick={startNewAssessment}
              className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={10} />
              New
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {assessmentsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs italic opacity-60">
              No assessments recorded yet.
            </div>
          ) : (
            assessmentsList.map((item, idx) => {
              const isSelected = activeAssessmentId === item.id;
              const dateStr = item.updated_at ? formatPTDate(item.updated_at) : 'Draft';
              return (
                <div
                  key={item.id}
                  onClick={() => selectAssessment(item.id)}
                  className={`p-3 rounded-xl border-2 flex items-center justify-between group transition-all cursor-pointer select-none
                    ${isSelected 
                      ? 'border-primary/50 bg-primary/5 shadow-sm' 
                      : 'border-border bg-card hover:bg-muted/30 hover:border-border-hover'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      Assessment #{assessmentsList.length - idx}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{dateStr}</p>
                    <p className="text-[9px] text-muted-foreground font-medium truncate italic mt-0.5">
                      By: {item.doctor_name || 'Unsigned'}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
              {activeAssessmentId ? `Editing Physical Assessment` : 'New Physical Assessment'}
            </h4>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {activeAssessmentId 
                ? `Saved on ${formatPTDate(assessmentsList.find(a => a.id === activeAssessmentId)?.updated_at, true)}` 
                : 'Fill out the subjective assessment first'
              }
            </p>
          </div>
          <FeedbackBanner feedback={feedback} />
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl w-fit border border-border">
          {sections.map(s => {
            return (
              <button
                key={s.id}
                onClick={() => handleTabClick(s.id)}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all
                  ${section === s.id
                    ? 'bg-card text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {section === 'subjective' ? (
          <SubjectiveSection 
            profileId={profileId} 
            assessmentId={activeAssessmentId} 
            currentUser={currentUser} 
            readOnly={readOnly} 
            onAssessmentSaved={handleAssessmentSaved} 
          />
        ) : (
          activeAssessmentId ? (
            <ObjectiveSection 
              profileId={profileId} 
              assessmentId={activeAssessmentId} 
              currentUser={currentUser} 
              readOnly={readOnly} 
            />
          ) : null
        )}
      </div>
    </div>
  );
}

// ─── TAB 3: Special Tests ─────────────────────────────────────────────────────

function SpecialTestsTab({ profileId, readOnly }: { profileId: number; readOnly?: boolean }) {
  const [structure, setStructure] = useState<{ regions: any[]; tests: any[] }>({ regions: [], tests: [] });
  const [results, setResults] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!window.api) { setLoading(false); return; }
      try {
        const [struct, res] = await Promise.all([
          (window.api as any).getAssessmentStructure(),
          (window.api as any).getPTSpecialTestResults(profileId),
        ]);
        setStructure(struct || { regions: [], tests: [] });
        const map: Record<number, string> = {};
        (res || []).forEach((r: any) => { if (r.test_id) map[r.test_id] = r.result; });
        setResults(map);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [profileId]);

  const handleToggle = async (testId: number, currentResult: string) => {
    if (readOnly || !window.api) return;
    const next = currentResult === 'Positive' ? 'Negative' : 'Positive';
    setResults(prev => ({ ...prev, [testId]: next }));
    try {
      await (window.api as any).savePTSpecialTestResult({ profileId, testId, result: next });
    } catch (e) { console.error(e); }
  };

  if (loading) return <Spinner />;

  const positiveCount = Object.values(results).filter(v => v === 'Positive').length;
  
  // Find all regions that match the search query OR have tests matching the query
  const filteredRegions = structure.regions.filter(r => {
    const matchesRegion = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const regionTests = structure.tests.filter(t => t.region_id === r.id);
    const matchesTests = regionTests.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRegion || matchesTests;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <span className="text-sm font-black text-foreground uppercase tracking-tight italic">Clinical Assessment Library</span>
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/10">
            {positiveCount} Positive
          </span>
        </div>
        <input
          type="text"
          placeholder="Search region or test name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 rounded-xl border border-border bg-card text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-xs"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
        {filteredRegions.map(region => {
          // If the region matches the query, show all tests; otherwise, filter tests by query
          const isRegionMatched = region.name.toLowerCase().includes(searchQuery.toLowerCase());
          const regionTests = structure.tests.filter(t => {
            const isCorrectRegion = t.region_id === region.id;
            if (!isCorrectRegion) return false;
            if (isRegionMatched || !searchQuery) return true;
            return t.name.toLowerCase().includes(searchQuery.toLowerCase());
          });
          
          if (regionTests.length === 0) return null;
          return (
            <div key={region.id} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-border" />
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                  {region.name} Assessment
                </h4>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {regionTests.map(test => {
                  const result = results[test.id] || 'Negative';
                  const isPositive = result === 'Positive';
                  return (
                    <div
                      key={test.id}
                      className={`flex items-center justify-between p-4 border rounded-2xl gap-4 transition-all group
                        ${isPositive ? 'bg-primary/5 border-primary/30 shadow-inner' : 'bg-card border-border hover:border-primary/20'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded-full shrink-0 transition-all
                          ${isPositive ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                          <Activity size={14} />
                        </div>
                        <p className={`font-black text-xs uppercase tracking-tight italic truncate transition-colors
                          ${isPositive ? 'text-primary' : 'text-foreground'}`}>
                          {test.name}
                        </p>
                      </div>
                      {!readOnly ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleToggle(test.id, result)}
                            className={`px-4 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
                              ${isPositive
                                ? 'bg-primary border-primary text-primary-foreground shadow-md'
                                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                              }`}
                          >
                            {isPositive ? 'Positive ✓' : 'Positive'}
                          </button>
                          <button
                            onClick={() => !isPositive && handleToggle(test.id, 'Positive')}
                            className={`px-4 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
                              ${!isPositive
                                ? 'bg-accent border-accent text-accent-foreground shadow-md'
                                : 'border-border text-muted-foreground hover:border-accent/40 hover:text-accent'
                              }`}
                            disabled={!isPositive}
                          >
                            Negative
                          </button>
                        </div>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest
                          ${isPositive ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                          {result}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredRegions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-xs font-bold uppercase tracking-widest italic opacity-60">
            No regions found
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 4: Session Plan ──────────────────────────────────────────────────────

interface SessionPlanSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: { key: string; label: string }[];
}

const SESSION_PLAN_SECTIONS: SessionPlanSection[] = [
  {
    id: 'electrotherapy',
    label: 'Electrotherapy',
    icon: <Zap size={16} />,
    items: [
      { key: 'tens', label: 'TENS' },
      { key: 'nmes', label: 'NMES' },
      { key: 'hot_pack', label: 'Hot Pack' },
      { key: 'laser', label: 'Laser' },
      { key: 'other', label: 'Other' },
    ],
  },
  {
    id: 'manual_therapy',
    label: 'Manual Therapy',
    icon: <Hand size={16} />,
    items: [
      { key: 'mobilisation', label: 'Mobilisation' },
      { key: 'mobilisation_with_movement', label: 'Mobilisation with Movement' },
      { key: 'manipulation', label: 'Manipulation' },
      { key: 'manual_soft_tissue_release', label: 'Manual Soft Tissue Release' },
      { key: 'other', label: 'Other' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: <Wrench size={16} />,
    items: [
      { key: 'dry_needle', label: 'Dry Needle' },
      { key: 'dry_cupping', label: 'Dry Cupping' },
      { key: 'kinesio_taping', label: 'Kinesio Taping' },
      { key: 'rigid_tape', label: 'Rigid Tape' },
      { key: 'blade_iastm', label: 'Blade/IASTM' },
      { key: 'bfr', label: 'BFR' },
      { key: 'other', label: 'Other' },
    ],
  },
];

type SectionData = Record<string, SessionItem>;
type AllSectionData = Record<string, SectionData>;

function buildDefaultSection(items: { key: string }[]): SectionData {
  return Object.fromEntries(items.map(i => [i.key, { selected: false, notes: '', custom_name: '' }]));
}

function parseSectionData(jsonStr: string, items: { key: string }[]): SectionData {
  const defaultSec = buildDefaultSection(items);
  if (!jsonStr) return defaultSec;
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Backward compatibility: map hot_patch key to hot_pack
    if (parsed.hot_patch) {
      parsed.hot_pack = parsed.hot_pack || parsed.hot_patch;
      delete parsed.hot_patch;
    }
    
    // Ensure all items in the current definition exist (e.g. 'other')
    return { ...defaultSec, ...parsed };
  } catch (e) {
    return defaultSec;
  }
}

function SessionPlanTab({ profileId, currentUser, readOnly }: { profileId: number; currentUser: any; readOnly?: boolean }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [sectionData, setSectionData] = useState<AllSectionData>({
    electrotherapy: buildDefaultSection(SESSION_PLAN_SECTIONS[0].items),
    manual_therapy: buildDefaultSection(SESSION_PLAN_SECTIONS[1].items),
    tools: buildDefaultSection(SESSION_PLAN_SECTIONS[2].items),
  });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const { feedback, flash } = useFeedback();

  useEffect(() => {
    const load = async () => {
      if (!window.api) { setLoading(false); return; }
      try {
        const [resList, docs] = await Promise.all([
          (window.api as any).getPTSessionPlans(profileId),
          (window.api as any).getActiveDoctors(),
        ]);
        const doctorsList = Array.isArray(docs) ? docs : [];
        const plansList = Array.isArray(resList) ? resList : [];
        setDoctors(doctorsList);
        setPlans(plansList);
        
        if (plansList.length > 0) {
          const latest = plansList[0];
          setActivePlanId(latest.id);
          setSectionData({
            electrotherapy: parseSectionData(latest.electrotherapy, SESSION_PLAN_SECTIONS[0].items),
            manual_therapy: parseSectionData(latest.manual_therapy, SESSION_PLAN_SECTIONS[1].items),
            tools: parseSectionData(latest.tools, SESSION_PLAN_SECTIONS[2].items),
          });
          if (latest.doctor_id) {
            setSelectedDoctorId(latest.doctor_id.toString());
          } else if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
            setSelectedDoctorId(currentUser.doctor_id.toString());
          }
        } else {
          setActivePlanId(null);
          setSectionData({
            electrotherapy: buildDefaultSection(SESSION_PLAN_SECTIONS[0].items),
            manual_therapy: buildDefaultSection(SESSION_PLAN_SECTIONS[1].items),
            tools: buildDefaultSection(SESSION_PLAN_SECTIONS[2].items),
          });
          if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
            setSelectedDoctorId(currentUser.doctor_id.toString());
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [profileId, currentUser]);

  const selectPlan = (plan: any) => {
    setActivePlanId(plan.id);
    setSectionData({
      electrotherapy: parseSectionData(plan.electrotherapy, SESSION_PLAN_SECTIONS[0].items),
      manual_therapy: parseSectionData(plan.manual_therapy, SESSION_PLAN_SECTIONS[1].items),
      tools: parseSectionData(plan.tools, SESSION_PLAN_SECTIONS[2].items),
    });
    if (plan.doctor_id) {
      setSelectedDoctorId(plan.doctor_id.toString());
    } else if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
      setSelectedDoctorId(currentUser.doctor_id.toString());
    } else {
      setSelectedDoctorId('');
    }
  };

  const startNewPlan = () => {
    setActivePlanId(null);
    setSectionData({
      electrotherapy: buildDefaultSection(SESSION_PLAN_SECTIONS[0].items),
      manual_therapy: buildDefaultSection(SESSION_PLAN_SECTIONS[1].items),
      tools: buildDefaultSection(SESSION_PLAN_SECTIONS[2].items),
    });
    if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
      setSelectedDoctorId(currentUser.doctor_id.toString());
    } else {
      setSelectedDoctorId('');
    }
  };

  const cloneFromLatest = () => {
    if (plans.length === 0) return;
    const latest = plans[0];
    setSectionData({
      electrotherapy: parseSectionData(latest.electrotherapy, SESSION_PLAN_SECTIONS[0].items),
      manual_therapy: parseSectionData(latest.manual_therapy, SESSION_PLAN_SECTIONS[1].items),
      tools: parseSectionData(latest.tools, SESSION_PLAN_SECTIONS[2].items),
    });
    if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
      setSelectedDoctorId(currentUser.doctor_id.toString());
    }
    flash('success', 'Cloned from latest session plan.');
  };

  const toggleItem = (sectionId: string, key: string) => {
    setSectionData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [key]: { ...prev[sectionId][key], selected: !prev[sectionId][key]?.selected },
      },
    }));
  };

  const updateNotes = (sectionId: string, key: string, notes: string) => {
    setSectionData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [key]: { ...prev[sectionId][key], notes },
      },
    }));
  };

  const updateCustomName = (sectionId: string, key: string, custom_name: string) => {
    setSectionData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [key]: { ...prev[sectionId][key], custom_name },
      },
    }));
  };

  const handleSave = async () => {
    if (!window.api) return;
    if (!selectedDoctorId) {
      flash('error', 'Doctor signature is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await (window.api as any).savePTSessionPlan(profileId, {
        id: activePlanId,
        electrotherapy: JSON.stringify(sectionData.electrotherapy),
        manual_therapy: JSON.stringify(sectionData.manual_therapy),
        tools: JSON.stringify(sectionData.tools),
        doctor_id: parseInt(selectedDoctorId),
      });
      if (res?.success) {
        flash('success', activePlanId ? 'Session plan updated.' : 'New session plan saved.');
        const resList = await (window.api as any).getPTSessionPlans(profileId);
        setPlans(resList || []);
        if (!activePlanId && resList && resList.length > 0) {
          setActivePlanId(resList[0].id);
        }
      } else {
        flash('error', 'Save failed.');
      }
    } catch { flash('error', 'Save failed.'); }
    setSaving(false);
  };

  const handleDelete = async (planId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this session plan?")) return;
    try {
      const res = await (window.api as any).deletePTSessionPlan(planId);
      if (res?.success) {
        flash('success', 'Session plan deleted.');
        const updated = plans.filter(p => p.id !== planId);
        setPlans(updated);
        if (activePlanId === planId) {
          if (updated.length > 0) {
            selectPlan(updated[0]);
          } else {
            startNewPlan();
          }
        }
      }
    } catch {
      flash('error', 'Failed to delete.');
    }
  };

  const plansList = Array.isArray(plans) ? plans : [];
  const doctorsList = Array.isArray(doctors) ? doctors : [];

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      {/* History Sidebar */}
      <div className="w-full lg:w-64 shrink-0 space-y-4 border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 lg:pr-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sessions History</span>
          {!readOnly && (
            <button
              onClick={startNewPlan}
              className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={10} />
              New
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {plansList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs italic opacity-60">
              No session plans recorded yet.
            </div>
          ) : (
            plansList.map((plan, idx) => {
              const isSelected = activePlanId === plan.id;
              const dateStr = plan.updated_at ? formatPTDate(plan.updated_at) : 'Draft';
              return (
                <div
                  key={plan.id}
                  onClick={() => selectPlan(plan)}
                  className={`p-3 rounded-xl border-2 flex items-center justify-between group transition-all cursor-pointer select-none
                    ${isSelected 
                      ? 'border-primary/50 bg-primary/5 shadow-sm' 
                      : 'border-border bg-card hover:bg-muted/30 hover:border-border-hover'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      Session #{plansList.length - idx}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{dateStr}</p>
                    <p className="text-[9px] text-muted-foreground font-medium truncate italic mt-0.5">
                      By: {plan.doctor_name || 'Unsigned'}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={(e) => handleDelete(plan.id, e)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Form */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
              {activePlanId ? `Editing Session Plan` : 'New Session Plan'}
            </h4>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {activePlanId 
                ? `Modify details for this previously recorded session.` 
                : 'Select treatments and options to document this clinical session.'}
            </p>
          </div>
          {!activePlanId && plans.length > 0 && !readOnly && (
            <button
              onClick={cloneFromLatest}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-xl transition-all cursor-pointer"
            >
              Clone From Latest
            </button>
          )}
        </div>

        <div className="space-y-4">
          {SESSION_PLAN_SECTIONS.map(section => {
            const isCollapsed = collapsed[section.id];
            const selectedCount = Object.values(sectionData[section.id] || {}).filter(v => v.selected).length;

            return (
              <div key={section.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {/* Collapsible header */}
                <button
                  onClick={() => setCollapsed(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      {section.icon}
                    </div>
                    <span className="font-black text-sm text-foreground uppercase tracking-tight italic">{section.label}</span>
                    {selectedCount > 0 && (
                      <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-[9px] font-black uppercase tracking-widest">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                    {section.items.map(item => {
                      const itemData = sectionData[section.id]?.[item.key] || { selected: false, notes: '', custom_name: '' };
                      const isOther = item.key === 'other';
                      return (
                        <div
                          key={item.key}
                          className={`p-4 rounded-xl border-2 transition-all
                            ${itemData.selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => !readOnly && toggleItem(section.id, item.key)}
                              disabled={readOnly}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all
                                ${itemData.selected ? 'bg-primary border-primary' : 'border-border bg-card'}
                                ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary'}`}
                            >
                              {itemData.selected && <CheckCircle size={12} className="text-white" />}
                            </button>
                            <span
                              className={`text-xs font-black uppercase tracking-widest cursor-pointer
                                ${itemData.selected ? 'text-primary' : 'text-foreground'}`}
                              onClick={() => !readOnly && toggleItem(section.id, item.key)}
                            >
                              {item.label}
                            </span>
                          </div>
                          {itemData.selected && (
                            <div className="space-y-2 mt-2 animate-in fade-in duration-200">
                              {isOther && (
                                <input
                                  type="text"
                                  value={itemData.custom_name || ''}
                                  onChange={e => updateCustomName(section.id, item.key, e.target.value)}
                                  disabled={readOnly}
                                  placeholder="Specify other treatment..."
                                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary outline-none transition-all mb-1"
                                />
                              )}
                              <input
                                type="text"
                                value={itemData.notes}
                                onChange={e => updateNotes(section.id, item.key, e.target.value)}
                                disabled={readOnly}
                                placeholder={`${isOther ? (itemData.custom_name || 'Other') : item.label} notes...`}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Doctor Signature (Required)</label>
              <select 
                disabled={readOnly || currentUser?.role === 'doctor'}
                value={selectedDoctorId} 
                onChange={e => setSelectedDoctorId(e.target.value)} 
                className="w-full px-3 py-2.5 text-xs bg-background border border-border rounded-xl text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Assigning Clinician...</option>
                {doctorsList.map(d => (
                  <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
                ))}
              </select>
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <FeedbackBanner feedback={feedback} />
              <SaveBtn onClick={handleSave} loading={saving} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const PT_TABS: { id: PTTab; label: string; icon: React.ReactNode }[] = [
  { id: 'red-flags', label: 'Red Flags', icon: <AlertTriangle size={14} /> },
  { id: 'physical-assessment', label: 'Physical Assessment', icon: <Activity size={14} /> },
  { id: 'special-tests', label: 'Special Tests', icon: <Target size={14} /> },
  { id: 'session-plan', label: 'Session Plan', icon: <Clipboard size={14} /> },
];

export function PhysicalTherapyProfile({ profileId, currentUser, readOnly }: PhysicalTherapyProfileProps) {
  const [activeTab, setActiveTab] = useState<PTTab>('red-flags');

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-2xl border border-border overflow-x-auto no-scrollbar">
        {PT_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
          >
            <span className={activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'red-flags' && (
          <RedFlagsTab profileId={profileId} currentUser={currentUser} readOnly={readOnly} />
        )}
        {activeTab === 'physical-assessment' && (
          <PhysicalAssessmentTab profileId={profileId} currentUser={currentUser} readOnly={readOnly} />
        )}
        {activeTab === 'special-tests' && (
          <SpecialTestsTab profileId={profileId} readOnly={readOnly} />
        )}
        {activeTab === 'session-plan' && (
          <SessionPlanTab profileId={profileId} currentUser={currentUser} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}
