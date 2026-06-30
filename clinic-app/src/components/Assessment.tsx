import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Stethoscope, FileText, X, Edit, Trash2 } from 'lucide-react';
import { User } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface Assessment {
  id: number;
  doctor_id: number;
  doctor_name: string;
  diagnosis: string;
  pain_scale: number;
  rom: string;
  strength: string;
  recommendations: string;
  is_completed: number;
  assessment_date: string;
}

interface AssessmentTabProps {
  clientId: number;
  readOnly?: boolean;
  currentUser?: User | null;
}

export function AssessmentTab({ clientId, readOnly, currentUser }: AssessmentTabProps) {
  const { t, isAr } = useLanguage();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    doctor_id: '',
    diagnosis: '',
    pain_scale: 5,
    rom: '',
    strength: '',
    recommendations: '',
    is_completed: true
  });

  const [editingAssessmentId, setEditingAssessmentId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    doctor_id: '',
    diagnosis: '',
    pain_scale: 5,
    rom: '',
    strength: '',
    recommendations: '',
    is_completed: true
  });

  useEffect(() => {
    if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
      setFormData(prev => ({ ...prev, doctor_id: currentUser.doctor_id!.toString() }));
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.api) {
        const data = await (window.api as any).getAssessments(clientId);
        setAssessments(data || []);
        
        const docs = await (window.api as any).getActiveDoctors();
        setDoctors(docs || []);
      }
    } catch (err) {
      console.error('Error loading assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctor_id) {
      alert(t('toast_select_doctor', 'Please select an assigned doctor.'));
      return;
    }
    try {
      const res = await (window.api as any).createAssessment({
        client_id: clientId,
        ...formData
      });
      if (res.success) {
        setShowAdd(false);
        setFormData({
          doctor_id: currentUser?.role === 'doctor' ? currentUser.doctor_id!.toString() : '',
          diagnosis: '',
          pain_scale: 5,
          rom: '',
          strength: '',
          recommendations: '',
          is_completed: true
        });
        loadData();
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessmentId) return;
    if (!editFormData.doctor_id) {
      alert(t('toast_select_doctor', 'Please select an assigned doctor.'));
      return;
    }
    try {
      const res = await (window.api as any).updateAssessment(editingAssessmentId, editFormData);
      if (res.success) {
        setEditingAssessmentId(null);
        loadData();
      }
    } catch (err) {
      console.error('Error updating assessment:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('delete_assessment_confirm', 'Are you sure you want to permanently delete this assessment?'))) {
      try {
        const res = await (window.api as any).deleteAssessment(id);
        if (res.success) {
          loadData();
        }
      } catch (err) {
        console.error('Error deleting assessment:', err);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <FileText size={20} />
          </div>
          <h3 className="text-xl font-bold text-foreground font-heading">{t('physical_assessments_title', 'Physical Assessments')}</h3>
        </div>
        {!readOnly && (
          <button 
            onClick={() => setShowAdd(!showAdd)} 
            className={`w-full md:w-auto ${showAdd ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'} px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer`}>
            {showAdd ? <><X size={16} /> {t('cancel')}</> : <><Plus size={16} /> {t('new_assessment_btn', 'New Assessment')}</>}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="bg-muted/20 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('assigned_doctor_req', 'Assigned Doctor (Required)')}</label>
              <select 
                required
                value={formData.doctor_id} 
                onChange={e => setFormData({...formData, doctor_id: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('select_doctor_prompt', 'Select Doctor')}</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('pain_scale_vas_lbl', 'Pain Scale (0-10)')}</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" max="10" 
                  value={formData.pain_scale} 
                  onChange={e => setFormData({...formData, pain_scale: parseInt(e.target.value)})} 
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">{formData.pain_scale}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('diagnosis_label', 'Diagnosis')}</label>
              <textarea 
                required 
                rows={2} 
                value={formData.diagnosis} 
                onChange={e => setFormData({...formData, diagnosis: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                placeholder={t('diagnosis_placeholder', 'Initial clinical diagnosis...')}
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('rom_label', 'Range of Motion (ROM)')}</label>
                <input 
                  type="text" 
                  value={formData.rom} 
                  onChange={e => setFormData({...formData, rom: e.target.value})} 
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder={t('rom_placeholder', 'e.g. Flexion 120°')}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('strength_label', 'Strength')}</label>
                <input 
                  type="text" 
                  value={formData.strength} 
                  onChange={e => setFormData({...formData, strength: e.target.value})} 
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder={t('strength_placeholder', 'e.g. 4/5')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('recommendations_label', 'Recommendations')}</label>
              <textarea 
                rows={3} 
                value={formData.recommendations} 
                onChange={e => setFormData({...formData, recommendations: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                placeholder={t('recommendations_placeholder', 'Clinical guidelines & instructions...')}
              ></textarea>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="is_completed" 
                checked={formData.is_completed} 
                onChange={e => setFormData({...formData, is_completed: e.target.checked})}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="is_completed" className="text-xs font-semibold text-foreground cursor-pointer select-none">{t('mark_completed_lbl', 'Mark as Completed')}</label>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="bg-accent text-accent-foreground px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">
              {t('save_assessment_btn', 'Save Assessment')}
            </button>
          </div>
        </form>
      )}

      {/* Editing Form */}
      {editingAssessmentId && (
        <form onSubmit={handleUpdate} className="bg-muted/20 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
          <h4 className="text-sm font-black text-primary uppercase tracking-wider italic font-heading">{t('edit_assessment_title', 'Edit Assessment')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('assigned_doctor_req', 'Assigned Doctor (Required)')}</label>
              <select 
                required
                value={editFormData.doctor_id} 
                onChange={e => setEditFormData({...editFormData, doctor_id: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('select_doctor_prompt', 'Select Doctor')}</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('pain_scale_vas_lbl', 'Pain Scale (0-10)')}</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" max="10" 
                  value={editFormData.pain_scale} 
                  onChange={e => setEditFormData({...editFormData, pain_scale: parseInt(e.target.value)})} 
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">{editFormData.pain_scale}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('diagnosis_label', 'Diagnosis')}</label>
              <textarea 
                required 
                rows={2} 
                value={editFormData.diagnosis} 
                onChange={e => setEditFormData({...editFormData, diagnosis: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                placeholder={t('diagnosis_placeholder', 'Initial clinical diagnosis...')}
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('rom_label', 'Range of Motion (ROM)')}</label>
                <input 
                  type="text" 
                  value={editFormData.rom} 
                  onChange={e => setEditFormData({...editFormData, rom: e.target.value})} 
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder={t('rom_placeholder', 'e.g. Flexion 120°')}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('strength_label', 'Strength')}</label>
                <input 
                  type="text" 
                  value={editFormData.strength} 
                  onChange={e => setEditFormData({...editFormData, strength: e.target.value})} 
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder={t('strength_placeholder', 'e.g. 4/5')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-bold text-muted-foreground uppercase tracking-widest ${isAr ? 'mr-1' : 'ml-1'}`}>{t('recommendations_label', 'Recommendations')}</label>
              <textarea 
                rows={3} 
                value={editFormData.recommendations} 
                onChange={e => setEditFormData({...editFormData, recommendations: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                placeholder={t('recommendations_placeholder', 'Clinical guidelines & instructions...')}
              ></textarea>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="edit_is_completed" 
                checked={editFormData.is_completed} 
                onChange={e => setEditFormData({...editFormData, is_completed: e.target.checked})}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="edit_is_completed" className="text-xs font-semibold text-foreground cursor-pointer select-none">{t('mark_completed_lbl', 'Mark as Completed')}</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              className="bg-accent text-accent-foreground px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">
              {t('update_assessment_btn', 'Update Assessment')}
            </button>
            <button 
              type="button" 
              onClick={() => setEditingAssessmentId(null)}
              className="bg-muted text-foreground border border-border px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer">
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest italic animate-pulse">
          {t('loading_assessments_log', 'Loading clinical assessments...')}
        </div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border/80">
          <Stethoscope size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-bold text-foreground mb-1 font-heading">{t('no_assessments_logged_yet', 'No physical assessments logged yet.')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {assessments.map(item => (
            <div key={item.id} className={`bg-card border rounded-3xl p-6 md:p-8 shadow-xl transition-all relative overflow-hidden group ${item.is_completed === 0 ? 'border-amber-500/20' : 'border-border hover:border-primary/20'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {item.doctor_name?.[0].toUpperCase() || 'D'}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Dr. {item.doctor_name}</h4>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} /> {item.assessment_date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${item.is_completed === 1 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                    {item.is_completed === 1 ? t('completed_status', 'Completed') : t('absent_pending_status', 'Pending')}
                  </span>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingAssessmentId(item.id);
                          setEditFormData({
                            doctor_id: item.doctor_id.toString(),
                            diagnosis: item.diagnosis,
                            pain_scale: item.pain_scale,
                            rom: item.rom,
                            strength: item.strength,
                            recommendations: item.recommendations,
                            is_completed: item.is_completed === 1
                          });
                        }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
                        title={t('edit', 'Edit')}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer"
                        title={t('delete', 'Delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('diagnosis_label', 'Diagnosis')}</p>
                    <p className="text-foreground text-sm font-semibold leading-relaxed">{item.diagnosis}</p>
                  </div>
                  {item.recommendations && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('recommendations_label', 'Recommendations')}</p>
                      <p className="text-muted-foreground text-xs font-medium leading-relaxed italic bg-muted/40 p-4 rounded-2xl border border-border">
                        "{item.recommendations}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 bg-muted/20 border border-border p-5 rounded-2xl h-fit">
                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('pain_scale_vas_lbl', 'Pain Scale (VAS)')}</span>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      item.pain_scale <= 3 ? 'bg-emerald-500/10 text-emerald-600' :
                      item.pain_scale <= 6 ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-rose-500/10 text-rose-600'
                    }`}>{item.pain_scale}/10</span>
                  </div>
                  {item.rom && (
                    <div className="flex justify-between items-center border-b border-border/60 pb-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('rom_label', 'ROM')}</span>
                      <span className="text-xs font-semibold text-foreground">{item.rom}</span>
                    </div>
                  )}
                  {item.strength && (
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('strength_label', 'Strength')}</span>
                      <span className="text-xs font-semibold text-foreground">{item.strength}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
