import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle,
  Ruler, Activity, Minus, BarChart2, X, FileText, Camera, Upload, BookOpen, Microscope, Edit3, Image as ImageIcon,
  FlaskConical
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NutritionHistoryEntry {
  id: number;
  content: string;
  session_date: string;
  weight: number | null;
  doctor_id: number | null;
  doctor_name: string | null;
  created_at: string;
}

interface InbodyUpload {
  id: number;
  file_name: string;
  local_file_path: string;
  session_date: string;
}

interface ClientInvestigation {
  id: number;
  investigation_id: number;
  name: string;
  result_text: string;
  result_date: string;
}

interface InvestigationLibraryItem {
  id: number;
  name: string;
}

interface NutritionProfileProps {
  profileId: number;
  currentUser: any;
  readOnly?: boolean;
}

type TabId = 'basic' | 'investigations' | 'inbody';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveInbodyImageUrl(localPath: string) {
  if (!localPath) return '';
  return `safe-file://${localPath}`;
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

// ─── Height Banner (One-time record) ──────────────────────────────────────────

function HeightBanner({ profileId, readOnly }: { profileId: number; readOnly?: boolean }) {
  const { t, isAr } = useLanguage();
  const [height, setHeight] = useState<string>('');
  const [editingHeight, setEditingHeight] = useState(false);
  const [newHeight, setNewHeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await (window.api as any).getClientProfile(profileId);
        if (profile?.height != null) {
          setHeight(profile.height.toString());
        } else {
          setHeight('');
        }
      } catch {
        setHeight('');
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [profileId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await (window.api as any).updateClientProfileHeight({ profileId, height: newHeight ? parseFloat(newHeight) : null });
      setHeight(newHeight);
      setEditingHeight(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="flex items-center gap-4 bg-blue-500/8 border border-blue-500/20 rounded-2xl px-5 py-3">
      <div className="p-2 bg-blue-500/15 rounded-xl shrink-0">
        <Ruler size={16} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{t('patient_height_title', 'Patient Height (One-time record)')}</p>
        {editingHeight ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 175"
              value={newHeight}
              onChange={e => setNewHeight(e.target.value)}
              className="w-24 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
            <span className="text-xs text-muted-foreground font-bold">cm</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {t('save')}
            </button>
            <button onClick={() => setEditingHeight(false)} className="p-1 rounded-lg hover:bg-muted transition-all cursor-pointer">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base font-black text-foreground">
              {height ? `${height} cm` : <span className="text-muted-foreground text-xs font-medium italic">{t('height_not_recorded', 'Not recorded yet')}</span>}
            </span>
            {!readOnly && (
              <button
                onClick={() => { setNewHeight(height); setEditingHeight(true); }}
                className="p-1 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-all cursor-pointer"
                title={t('edit', 'Set height')}
              >
                <Edit3 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 1: Basic Data (Nutrition History) ───────────────────────────────────

function BasicDataTab({ profileId, currentUser, readOnly }: { profileId: number; currentUser: any; readOnly?: boolean }) {
  const { t, isAr } = useLanguage();
  const [entries, setEntries] = useState<NutritionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, docs] = await Promise.all([
        (window.api as any).getNutritionHistory(profileId),
        (window.api as any).getActiveDoctors()
      ]);
      setEntries(data || []);
      setDoctors(docs || []);
      if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
        setSelectedDoctorId(currentUser.doctor_id.toString());
        setEditDoctorId(currentUser.doctor_id.toString());
      }
    } catch {
      showFeedback(t('toast_failed_load_attendance', 'Failed to load history'), 'error');
    } finally {
      setLoading(false);
    }
  }, [profileId, currentUser, t]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    if (!selectedDoctorId) {
      showFeedback(t('doctor_signature_req_error', 'Doctor signature is required.'), 'error');
      return;
    }
    setSaving(true);
    try {
      await (window.api as any).addNutritionHistory(profileId, { 
        content: newContent.trim(), 
        session_date: newDate,
        weight: newWeight ? parseFloat(newWeight) : null,
        doctor_id: parseInt(selectedDoctorId)
      });
      setNewContent('');
      setNewWeight('');
      setNewDate(new Date().toISOString().slice(0, 10));
      setShowNewForm(false);
      showFeedback(t('toast_test_registered_success', 'Session note added'), 'success');
      await load();
    } catch {
      showFeedback(t('toast_patient_error', 'Failed to save note'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editContent.trim()) return;
    if (!editDoctorId) {
      showFeedback(t('doctor_signature_req_error', 'Doctor signature is required.'), 'error');
      return;
    }
    setSaving(true);
    try {
      await (window.api as any).updateNutritionHistory(id, { 
        content: editContent.trim(),
        weight: editWeight ? parseFloat(editWeight) : null,
        doctor_id: parseInt(editDoctorId)
      });
      setEditingId(null);
      showFeedback(t('toast_test_registered_success', 'Note updated'), 'success');
      await load();
    } catch {
      showFeedback(t('toast_patient_error', 'Failed to update note'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('delete_apt_confirm', 'Delete permanently?'))) return;
    try {
      await (window.api as any).deleteNutritionHistory(id);
      showFeedback(t('toast_request_denied', 'Note deleted'), 'success');
      await load();
    } catch {
      showFeedback(t('toast_patient_error', 'Failed to delete note'), 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 size={20} className="animate-spin text-primary" />
      <span className="text-sm">{t('loading_measurements', 'Loading session notes…')}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <BookOpen size={14} /> {t('session_notes_tab', 'Session Notes')}
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md cursor-pointer"
          >
            <Plus size={14} /> {t('add_session_note_btn', 'Add New Session Note')}
          </button>
        )}
      </div>

      {feedback && <FeedbackBanner message={feedback.msg} type={feedback.type} />}

      {/* New entry form */}
      {showNewForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('new_session_note_title', 'New Session Note')}</span>
            <button onClick={() => setShowNewForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('date_header', 'Date')}</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('weight_kg_lbl', 'Weight (kg)')}</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 70"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder={t('session_notes_placeholder', 'Enter session notes, dietary observations, recommendations…')}
            rows={5}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          
          <div className="space-y-1 bg-background/50 border border-border p-4 rounded-xl">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('doctor_signature_req', 'Doctor Signature (Required)')}</label>
            <select 
              disabled={readOnly || currentUser?.role === 'doctor'}
              value={selectedDoctorId} 
              onChange={e => setSelectedDoctorId(e.target.value)} 
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">{t('select_doctor', 'Select Doctor...')}</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:opacity-80 transition-all cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newContent.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {t('save_note_btn', 'Save Note')}
            </button>
          </div>
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm bg-card border border-border rounded-2xl shadow-sm">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          {t('no_notes_logged_yet', 'No session notes yet. Add the first one.')}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="bg-card border border-border rounded-2xl p-5 space-y-3 hover:border-primary/30 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="font-bold text-primary">{entry.session_date}</span>
                  <span>·</span>
                  <span>{t('added_at_lbl', 'Added')} {new Date(entry.created_at).toLocaleDateString()}</span>
                  {entry.weight && (
                    <>
                      <span>·</span>
                      <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                        {entry.weight} kg
                      </span>
                    </>
                  )}
                  {entry.doctor_name && (
                    <>
                      <span>·</span>
                      <span className="text-[10px] text-muted-foreground italic">
                        {t('signed_by', 'Signed by:')} {entry.doctor_name}
                      </span>
                    </>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { 
                        setEditingId(entry.id); 
                        setEditContent(entry.content); 
                        setEditWeight(entry.weight !== undefined && entry.weight !== null ? entry.weight.toString() : '');
                        setEditDoctorId(entry.doctor_id ? entry.doctor_id.toString() : (currentUser?.doctor_id ? currentUser.doctor_id.toString() : ''));
                      }}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {editingId === entry.id ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('weight_kg_lbl', 'Weight (kg)')}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editWeight}
                      onChange={e => setEditWeight(e.target.value)}
                      placeholder="e.g. 70"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={5}
                    className="w-full bg-background border border-primary/40 rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('doctor_signature_req', 'Doctor Signature (Required)')}</label>
                    <select 
                      disabled={readOnly || currentUser?.role === 'doctor'}
                      value={editDoctorId} 
                      onChange={e => setEditDoctorId(e.target.value)} 
                      className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">{t('select_doctor', 'Select Doctor...')}</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:opacity-80 transition-all cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={() => handleUpdate(entry.id)}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      {t('save')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Investigations ────────────────────────────────────────────────────

interface AddResultFormProps {
  existingEntries: any[];
  doctors: any[];
  currentUser: any;
  onSave: (updated: any[]) => Promise<void>;
}

function AddResultForm({
  existingEntries,
  doctors,
  currentUser,
  onSave
}: AddResultFormProps) {
  const { t, isAr } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [resultText, setResultText] = useState('');
  const [resultDate, setResultDate] = useState(new Date().toISOString().slice(0, 10));
  const [doctorId, setDoctorId] = useState(currentUser?.doctor_id ? currentUser.doctor_id.toString() : '');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!resultText.trim()) return;
    if (!doctorId) return;
    setSaving(true);
    try {
      const selectedDoc = doctors.find(d => d.id === parseInt(doctorId));
      const newEntry = {
        id: Date.now().toString(),
        result_text: resultText.trim(),
        result_date: resultDate,
        doctor_id: parseInt(doctorId),
        doctor_name: selectedDoc ? selectedDoc.name : ''
      };
      await onSave([...existingEntries, newEntry]);
      setResultText('');
      setShowForm(false);
    } catch {
      // handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-2 bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/20 hover:border-primary/40 rounded-xl text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition-all mt-1 cursor-pointer"
      >
        <Plus size={14} /> {t('add_new_result_btn', 'Add New Result Entry')}
      </button>
    );
  }

  return (
    <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3 mt-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('new_result_entry_title', 'New Result Entry')}</span>
        <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('result_date_lbl', 'Result Date')}</label>
          <input
            type="date"
            value={resultDate}
            onChange={e => setResultDate(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('doctor_signature_req', 'Doctor Signature (Required)')}</label>
          <select
            disabled={currentUser?.role === 'doctor'}
            value={doctorId}
            onChange={e => setDoctorId(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold cursor-pointer"
          >
            <option value="">{t('select_doctor', 'Select Doctor...')}</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
            ))}
          </select>
        </div>
      </div>

      <textarea
        value={resultText}
        onChange={e => setResultText(e.target.value)}
        placeholder={t('result_notes_placeholder', 'Enter result text, findings, or metrics...')}
        rows={3}
        className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
      />

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowForm(false)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-muted text-muted-foreground hover:opacity-80 transition-all cursor-pointer"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleAdd}
          disabled={saving || !resultText.trim() || !doctorId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {t('add_result_btn_text', 'Add Result')}
        </button>
      </div>
    </div>
  );
}

function InvestigationsTab({ profileId, currentUser, readOnly }: { profileId: number; currentUser: any; readOnly?: boolean }) {
  const { t, isAr } = useLanguage();
  const [library, setLibrary] = useState<InvestigationLibraryItem[]>([]);
  const [clientInvestigations, setClientInvestigations] = useState<ClientInvestigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lib, inv, docs] = await Promise.all([
        (window.api as any).getInvestigationLibrary(),
        (window.api as any).getClientInvestigations(profileId),
        (window.api as any).getActiveDoctors(),
      ]);
      setLibrary(lib || []);
      setClientInvestigations(inv || []);
      setDoctors(docs || []);
      if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
        setSelectedDoctorId(currentUser.doctor_id.toString());
      }
    } catch {
      showFeedback(t('toast_failed_load_investigations', 'Failed to load investigations'), 'error');
    } finally {
      setLoading(false);
    }
  }, [profileId, currentUser, t]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (investigationId: number) => {
    if (readOnly) return;
    const alreadyAssigned = clientInvestigations.some(ci => ci.investigation_id === investigationId);
    if (alreadyAssigned) { showFeedback(t('measurement_exists_error', 'Already assigned to this patient'), 'error'); return; }
    if (!selectedDoctorId) {
      showFeedback(t('doctor_signature_req_error', 'Doctor signature is required.'), 'error');
      return;
    }
    setSaving(true);
    try {
      await (window.api as any).assignInvestigation(profileId, investigationId, parseInt(selectedDoctorId));
      showFeedback(t('toast_test_registered_success', 'Investigation assigned'), 'success');
      await load();
    } catch {
      showFeedback(t('toast_patient_error', 'Failed to assign'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm(t('delete_apt_confirm', 'Delete permanently?'))) return;
    try {
      await (window.api as any).removeClientInvestigation(id);
      showFeedback(t('toast_request_denied', 'Investigation removed'), 'success');
      await load();
    } catch {
      showFeedback(t('toast_patient_error', 'Failed to remove'), 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 size={20} className="animate-spin text-primary" />
      <span className="text-sm">{t('loading_measurements', 'Loading investigations…')}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Plus size={15} className="text-primary" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('assign_diagnostic_test', 'Assign Diagnostic Test')}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('select_test_library_lbl', 'Select Test from Library')}</label>
              <select
                value={selectedInvestigationId}
                onChange={e => setSelectedInvestigationId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                <option value="">{t('select_test_prompt', 'Select test...')}</option>
                {library.map(item => {
                  const assigned = clientInvestigations.some(ci => ci.investigation_id === item.id);
                  return (
                    <option key={item.id} value={item.id} disabled={assigned}>
                      {item.name} {assigned ? `(${t('processed_status', 'Assigned')})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('doctor_signature_req', 'Doctor Signature (Required)')}</label>
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

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (selectedInvestigationId) {
                  handleAssign(parseInt(selectedInvestigationId));
                  setSelectedInvestigationId('');
                }
              }}
              disabled={saving || !selectedInvestigationId}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {t('assign_test_btn', 'Assign Test')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 min-w-0">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Microscope size={14} /> {t('assigned_investigations_title', 'Assigned Investigations')}
        </h3>

        {feedback && <FeedbackBanner message={feedback.msg} type={feedback.type} />}

        {clientInvestigations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm bg-card border border-border rounded-2xl shadow-sm">
            <FlaskConical size={36} className="mx-auto mb-3 opacity-30" />
            {t('no_investigations_assigned_yet', 'No investigations assigned yet. Select and assign a test above.')}
          </div>
        ) : (
          <div className="space-y-3">
            {clientInvestigations.map(inv => {
              let entries: any[] = [];
              if (inv.result_text) {
                try {
                  const parsed = JSON.parse(inv.result_text);
                  if (Array.isArray(parsed)) {
                    entries = parsed;
                  } else {
                    entries = [{
                      id: 'legacy',
                      result_text: inv.result_text,
                      result_date: inv.result_date || new Date().toISOString().slice(0, 10),
                      doctor_name: (inv as any).doctor_name
                    }];
                  }
                } catch (e) {
                  entries = [{
                    id: 'legacy',
                    result_text: inv.result_text,
                    result_date: inv.result_date || new Date().toISOString().slice(0, 10),
                    doctor_name: (inv as any).doctor_name
                  }];
                }
              }

              const sortedEntries = [...entries].sort((a, b) => b.result_date.localeCompare(a.result_date));

              return (
                <div
                  key={inv.id}
                  className="bg-card border border-border rounded-2xl p-5 space-y-4 hover:border-primary/30 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FlaskConical size={15} className="text-primary" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{inv.name}</span>
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => handleRemove(inv.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                        title={t('delete', 'Remove Test Assignment')}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {!readOnly && (
                    <AddResultForm
                      existingEntries={entries}
                      doctors={doctors}
                      currentUser={currentUser}
                      onSave={async (updatedEntries) => {
                        const latest = updatedEntries.reduce((latestOpt: any, current: any) => {
                          if (!latestOpt) return current;
                          return current.result_date.localeCompare(latestOpt.result_date) > 0 ? current : latestOpt;
                        }, null);
                        
                        await (window.api as any).updateInvestigationResult(inv.id, {
                          result_text: JSON.stringify(updatedEntries),
                          result_date: latest ? latest.result_date : null
                        });
                        showFeedback(t('toast_test_registered_success', 'Investigation results updated'), 'success');
                        await load();
                      }}
                    />
                  )}

                  <div className="space-y-3 mt-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('results_history_count', 'Results History ({count})').replace('{count}', sortedEntries.length.toString())}</p>
                    {sortedEntries.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-2">{t('no_results_recorded_yet', 'No results recorded yet.')}</p>
                    ) : (
                      <div className="relative pl-4 border-l border-border/80 space-y-4">
                        {sortedEntries.map((entry, idx) => (
                          <div key={entry.id || idx} className="relative space-y-1">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                            
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-primary font-mono">{entry.result_date}</span>
                              {entry.doctor_name && (
                                <span className="text-[9px] text-muted-foreground italic bg-muted px-2 py-0.5 rounded-full">
                                  {t('signed_by_short', 'Signed:')} {entry.doctor_name}
                                </span>
                              )}
                            </div>
                            
                            <div className="bg-muted/40 rounded-xl px-3 py-2 flex justify-between items-start gap-4">
                              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap flex-1">
                                {entry.result_text}
                              </p>
                              {!readOnly && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(t('delete_apt_confirm', 'Delete permanently?'))) return;
                                    const filtered = entries.filter(e => e.id !== entry.id);
                                    const latest = filtered.reduce((latestOpt: any, current: any) => {
                                      if (!latestOpt) return current;
                                      return current.result_date.localeCompare(latestOpt.result_date) > 0 ? current : latestOpt;
                                    }, null);
                                    
                                    await (window.api as any).updateInvestigationResult(inv.id, {
                                      result_text: filtered.length > 0 ? JSON.stringify(filtered) : '',
                                      result_date: latest ? latest.result_date : null
                                    });
                                    showFeedback(t('toast_request_denied', 'Result entry deleted'), 'success');
                                    await load();
                                  }}
                                  className="text-muted-foreground hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                                  title={t('delete', 'Delete this entry')}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: InBody ─────────────────────────────────────────────────────────────

function InBodyTab({ profileId, readOnly }: { profileId: number; readOnly?: boolean }) {
  const { t, isAr } = useLanguage();
  const [uploads, setUploads] = useState<InbodyUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await (window.api as any).getInbodyUploads(profileId);
      setUploads(Array.isArray(data) ? data : []);
    } catch {
      showFeedback(t('toast_inbody_load_failed', 'Failed to load InBody scans'), 'error');
    } finally {
      setLoading(false);
    }
  }, [profileId, t]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const result = await (window.api as any).uploadInbodyPhoto(profileId);
      if (result?.success) {
        showFeedback(t('toast_inbody_upload_success', 'InBody scan uploaded successfully'), 'success');
        await load();
      } else {
        showFeedback(t('toast_inbody_upload_failed', 'Upload cancelled or failed'), 'error');
      }
    } catch {
      showFeedback(t('toast_inbody_upload_failed', 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          let res;
          if (window.api && (window.api as any).uploadInbodyMobile) {
            res = await (window.api as any).uploadInbodyMobile(profileId, file.name, base64Data);
          } else {
            const response = await fetch('/api/upload-inbody-mobile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                profileId,
                fileName: file.name,
                fileData: base64Data
              })
            });
            res = response.ok ? await response.json() : { success: false, error: 'Network error' };
          }

          if (res?.success) {
            showFeedback(t('toast_inbody_upload_success', 'InBody scan uploaded successfully'), 'success');
            await load();
          } else {
            showFeedback(res?.error || t('toast_inbody_upload_failed', 'Upload failed'), 'error');
          }
        } catch (err: any) {
          showFeedback(`${t('toast_inbody_upload_failed', 'Upload failed')}: ${err.message}`, 'error');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showFeedback(`${t('toast_sys_error_occurred', 'Error reading file')}: ${err.message}`, 'error');
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    if ((window as any).isMobilePortal) {
      document.getElementById('mobile-inbody-file')?.click();
    } else {
      handleUpload();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('delete_apt_confirm', 'Delete permanently?'))) return;
    try {
      await (window.api as any).deleteInbodyUpload(id);
      showFeedback(t('toast_inbody_delete_success', 'Scan deleted'), 'success');
      await load();
    } catch {
      showFeedback(t('toast_inbody_delete_failed', 'Failed to delete scan'), 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 size={20} className="animate-spin text-primary" />
      <span className="text-sm">{t('loading_measurements', 'Loading InBody scans…')}</span>
    </div>
  );

  const uploadsList = Array.isArray(uploads) ? uploads : [];

  return (
    <div className="space-y-4">
      <input
        type="file"
        id="mobile-inbody-file"
        className="hidden"
        accept="image/*"
        onChange={handleMobileUpload}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Camera size={14} /> {t('inbody_scan_gallery', 'InBody Scan Gallery')}
        </h3>
        {!readOnly && (
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {t('upload_inbody_scan_btn', 'Upload InBody Scan')}
          </button>
        )}
      </div>

      {feedback && <FeedbackBanner message={feedback.msg} type={feedback.type} />}

      {/* Gallery */}
      {uploadsList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm bg-card border border-border rounded-2xl shadow-sm">
          <ImageIcon size={36} className="mx-auto mb-3 opacity-30" />
          {t('no_inbody_scans_yet', 'No InBody scans uploaded yet.')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploads.map(item => (
            <div
              key={item.id}
              className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all shadow-sm"
            >
              {/* Thumbnail */}
              <div
                className="aspect-square bg-muted/50 cursor-pointer overflow-hidden"
                onClick={() => setLightboxSrc(resolveInbodyImageUrl(item.local_file_path))}
              >
                <img
                  src={resolveInbodyImageUrl(item.local_file_path)}
                  alt={`InBody scan ${item.session_date}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              {/* Meta */}
              <div className="p-2.5">
                <p className="text-xs font-bold text-primary">{item.session_date}</p>
                <p className="text-[10px] text-muted-foreground truncate" title={item.file_name}>{item.file_name}</p>
              </div>

              {/* Delete button */}
              {!readOnly && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
            onClick={() => setLightboxSrc(null)}
          >
            <X size={20} />
          </button>
          <img
            src={lightboxSrc}
            alt="InBody scan full view"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NutritionProfile({ profileId, currentUser, readOnly = false }: NutritionProfileProps) {
  const { t, isAr } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: t('session_notes_tab', 'Session Notes'), icon: <FileText size={14} /> },
    { id: 'investigations', label: t('investigations', 'Investigations'), icon: <FlaskConical size={14} /> },
    { id: 'inbody', label: t('inbody', 'InBody'), icon: <Camera size={14} /> },
  ];

  return (
    <div className="bg-background min-h-full space-y-5">
      {/* One-time Height Banner */}
      <HeightBanner profileId={profileId} readOnly={readOnly} />

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-card border border-border rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
              ${activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        {activeTab === 'basic' && (
          <BasicDataTab profileId={profileId} currentUser={currentUser} readOnly={readOnly} />
        )}
        {activeTab === 'investigations' && (
          <InvestigationsTab profileId={profileId} currentUser={currentUser} readOnly={readOnly} />
        )}
        {activeTab === 'inbody' && (
          <InBodyTab profileId={profileId} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}

export default NutritionProfile;
