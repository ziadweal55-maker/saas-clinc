import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Stethoscope, FileText, X, Edit, Trash2 } from 'lucide-react';
import { User } from '../types';

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
      alert('Please select an assigned doctor.');
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

  const completedAssessments = assessments.filter(a => a.is_completed === 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <FileText size={20} />
          </div>
          <h3 className="text-xl font-bold text-foreground font-heading">Physical Assessments</h3>
        </div>
        {!readOnly && (
          <button 
            onClick={() => setShowAdd(!showAdd)} 
            className={`${showAdd ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'} px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all`}>
            {showAdd ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Assessment</>}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="bg-muted/20 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Assigned Doctor (Required)</label>
              <select 
                required
                value={formData.doctor_id} 
                onChange={e => setFormData({...formData, doctor_id: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select Doctor</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Pain Scale (0-10)</label>
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Diagnosis</label>
              <textarea 
                required 
                rows={2} 
                value={formData.diagnosis} 
                onChange={e => setFormData({...formData, diagnosis: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                placeholder="Initial clinical diagnosis..."
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Range of Motion (ROM)</label>
                <input 
                  type="text" 
                  value={formData.rom} 
                  onChange={e => setFormData({...formData, rom: e.target.value})} 
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Flexion 120°"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Strength</label>
                <input 
                  type="text" 
                  value={formData.strength} 
                  onChange={e => setFormData({...formData, strength: e.target.value})} 
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="e.g. 4/5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Recommendations</label>
              <textarea 
                rows={3} 
                value={formData.recommendations} 
                onChange={e => setFormData({...formData, recommendations: e.target.value})} 
                className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                placeholder="Next steps, precautions, etc."
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-accent text-accent-foreground px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/10 hover:-translate-y-0.5 transition-all">Save Assessment</button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-20 animate-pulse text-primary font-bold uppercase tracking-widest text-xs">Loading Assessments...</div>
        ) : completedAssessments.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border">
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No completed assessments found.</p>
          </div>
        ) : (
          completedAssessments.map(a => {
            if (editingAssessmentId === a.id) {
              return (
                <form 
                  key={a.id}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (window.api && (window.api as any).updateAssessment) {
                      const res = await (window.api as any).updateAssessment(a.id, editFormData);
                      if (res.success) {
                        setEditingAssessmentId(null);
                        loadData();
                      } else {
                        alert('Error saving assessment: ' + res.error);
                      }
                    }
                  }}
                  className="border border-primary/35 rounded-3xl p-8 bg-card shadow-md space-y-6 animate-in slide-in-from-top-2 duration-300"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Edit Assessment Record</span>
                    <button type="button" onClick={() => setEditingAssessmentId(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Assigned Doctor (Required)</label>
                      <select 
                        required
                        value={editFormData.doctor_id} 
                        onChange={e => setEditFormData({...editFormData, doctor_id: e.target.value})} 
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                      >
                        <option value="">Select Doctor</option>
                        {doctors.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Pain Scale (0-10)</label>
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
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Diagnosis</label>
                      <textarea 
                        required 
                        rows={2} 
                        value={editFormData.diagnosis} 
                        onChange={e => setEditFormData({...editFormData, diagnosis: e.target.value})} 
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary resize-none" 
                      ></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Range of Motion (ROM)</label>
                        <input 
                          type="text" 
                          value={editFormData.rom} 
                          onChange={e => setEditFormData({...editFormData, rom: e.target.value})} 
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Strength</label>
                        <input 
                          type="text" 
                          value={editFormData.strength} 
                          onChange={e => setEditFormData({...editFormData, strength: e.target.value})} 
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Recommendations</label>
                      <textarea 
                        rows={3} 
                        value={editFormData.recommendations} 
                        onChange={e => setEditFormData({...editFormData, recommendations: e.target.value})} 
                        className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-foreground font-medium outline-none focus:ring-2 focus:ring-primary resize-none" 
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="submit" className="bg-accent text-accent-foreground px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/10 hover:-translate-y-0.5 transition-all">Save Changes</button>
                    <button type="button" onClick={() => setEditingAssessmentId(null)} className="bg-muted text-foreground border border-border px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-muted/80 transition-all">Cancel</button>
                  </div>
                </form>
              );
            }

            return (
              <div key={a.id} className="border border-border rounded-3xl p-8 bg-card shadow-sm hover:border-primary/20 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Stethoscope size={80} />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-border">
                  <div className="flex items-center gap-3 text-primary text-[10px] font-black uppercase tracking-widest">
                    <Clock size={14} /> {new Date(a.assessment_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/10 flex items-center gap-1">
                        <CheckCircle size={12} /> Completed
                     </span>
                     <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                        Dr. {a.doctor_name || 'Unassigned'}
                     </span>
                     {!readOnly && (
                       <div className="flex items-center gap-1.5 ml-2 no-print">
                         <button 
                           onClick={() => {
                             setEditingAssessmentId(a.id);
                             setEditFormData({
                               doctor_id: a.doctor_id ? a.doctor_id.toString() : '',
                               diagnosis: a.diagnosis || '',
                               pain_scale: a.pain_scale || 5,
                               rom: a.rom || '',
                               strength: a.strength || '',
                               recommendations: a.recommendations || '',
                               is_completed: a.is_completed === 1
                             });
                           }}
                           className="p-1.5 text-muted-foreground hover:text-primary transition-all rounded hover:bg-muted"
                           title="Edit Assessment"
                         >
                           <Edit size={14} />
                         </button>
                         <button 
                           onClick={async () => {
                             if (confirm('Are you sure you want to permanently delete this physical assessment record?')) {
                               if (window.api && (window.api as any).deleteAssessment) {
                                 const res = await (window.api as any).deleteAssessment(a.id);
                                 if (res.success) {
                                   loadData();
                                 } else {
                                   alert('Error deleting assessment: ' + res.error);
                                 }
                               }
                             }
                           }}
                           className="p-1.5 text-muted-foreground hover:text-destructive transition-all rounded hover:bg-muted"
                           title="Delete Assessment"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                     )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Diagnosis</p>
                      <p className="text-sm font-bold text-foreground italic">"{a.diagnosis}"</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pain Scale</p>
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
                            {a.pain_scale}
                         </div>
                         <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${a.pain_scale * 10}%` }}></div>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">ROM & Strength</p>
                      <p className="text-xs font-bold text-foreground">ROM: {a.rom || 'N/A'} | Strength: {a.strength || 'N/A'}</p>
                   </div>
                </div>

                {a.recommendations && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Clinical Recommendations</p>
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border italic text-xs text-foreground/80 leading-relaxed">
                       {a.recommendations}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
