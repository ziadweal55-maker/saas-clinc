import { useState, useEffect } from 'react';
import { Plus, X, Search, Dumbbell, Trash2, CheckCircle, AlertTriangle, ExternalLink, Edit3, Save } from 'lucide-react';
import { User } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface HomeExercisesProps {
  clientId: number;
  readOnly?: boolean;
  currentUser?: User | null;
}

export function HomeExercises({ clientId, readOnly, currentUser }: HomeExercisesProps) {
  const { t, isAr } = useLanguage();
  const [assignedEx, setAssignedEx] = useState<any[]>([]);
  const [libraryData, setLibraryData] = useState<{ regions: any[], exercises: any[] }>({ regions: [], exercises: [] });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | 'all'>('all');

  const [assignment, setAssignment] = useState({ 
    exercise_id: 0, 
    doctor_id: '', 
    sets: '', 
    reps: '', 
    frequency: '', 
    notes: '' 
  });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ sets: '', reps: '', frequency: '', notes: '' });
  const [saving, setSaving] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
      setAssignment(prev => ({ ...prev, doctor_id: currentUser.doctor_id!.toString() }));
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lib, homeEx, docs] = await Promise.all([
        window.api.getExercises(),
        window.api.getHomeExercises(clientId),
        (window.api as any).getActiveDoctors()
      ]);
      setLibraryData(lib || { regions: [], exercises: [] });
      setAssignedEx(homeEx || []);
      setDoctors(docs || []);
    } catch (err) {
      console.error('Error loading home exercises data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAssign = async () => {
    if (readOnly) return;
    if (assignment.exercise_id === 0) return;
    if (!assignment.doctor_id) {
      showFeedback('error', t('toast_select_doctor', 'Please select an assigning doctor.'));
      return;
    }
    
    try {
      const res = await window.api.assignHomeExercise({ 
        ...assignment, 
        client_id: clientId,
        exercise_id: assignment.exercise_id,
        doctor_id: parseInt(assignment.doctor_id)
      });
      if (res.success) {
        setAssignment({ 
          exercise_id: 0, 
          doctor_id: currentUser?.role === 'doctor' ? currentUser.doctor_id!.toString() : '', 
          sets: '', 
          reps: '', 
          frequency: '', 
          notes: '' 
        });
        setShowAssign(false);
        showFeedback('success', t('toast_test_registered_success', 'Exercise assigned successfully to Home Program!'));
        loadData();
      } else {
        showFeedback('error', res.error || t('toast_patient_error', 'Failed to assign exercise.'));
      }
    } catch (err: any) {
      showFeedback('error', err.message || t('toast_sys_error_occurred', 'System error occurred.'));
    }
  };

  const handleRemove = async (id: number) => {
    if (readOnly) return;
    if (confirm(t('delete_apt_confirm', 'Remove this exercise?'))) {
      try {
        const res = await window.api.removeHomeExercise(id);
        if (res.success) {
          showFeedback('success', t('toast_request_denied', 'Exercise removed.'));
          loadData();
        } else {
          showFeedback('error', res.error || t('toast_patient_error', 'Failed to remove exercise.'));
        }
      } catch (err: any) {
        showFeedback('error', err.message || t('toast_sys_error_occurred', 'System error occurred.'));
      }
    }
  };

  const startEdit = (ex: any) => {
    setEditingId(ex.id);
    setEditData({ sets: ex.sets || '', reps: ex.reps || '', frequency: ex.frequency || '', notes: ex.notes || '' });
  };

  const handleUpdate = async (id: number) => {
    setSaving(true);
    try {
      const res = await window.api.updateHomeExercise(id, editData);
      if (res.success) {
        setEditingId(null);
        showFeedback('success', t('toast_test_registered_success', 'Exercise updated successfully.'));
        loadData();
      } else {
        showFeedback('error', res.error || t('toast_patient_error', 'Failed to update exercise.'));
      }
    } catch (err: any) {
      showFeedback('error', err.message || t('toast_sys_error_occurred', 'System error occurred.'));
    } finally {
      setSaving(false);
    }
  };

  const filteredLibrary = (libraryData.exercises || []).filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.category && e.category.toLowerCase().includes(search.toLowerCase()));
    const matchesRegion = selectedRegionId === 'all' || e.region_id === selectedRegionId;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-in fade-in duration-300 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
            : 'bg-destructive/10 text-destructive border-destructive/20'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {feedback.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground font-heading">{t('therapeutic_recovery_protocol', 'Therapeutic Recovery Protocol')}</h3>
          <p className="text-muted-foreground text-xs font-medium mt-0.5">{t('manage_home_exercises_desc', 'Manage exercises for independent practice at home. Synced to patient portal.')}</p>
        </div>
        {!readOnly && (
          <button 
            onClick={() => setShowAssign(!showAssign)} 
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
              showAssign ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            }`}
          >
            {showAssign ? <><X size={16} /> {t('close_library_btn', 'Close Library')}</> : <><Plus size={16} /> {t('assign_exercise_btn', 'Assign Exercise')}</>}
          </button>
        )}
      </div>

      {showAssign && !readOnly && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <Dumbbell size={16} className="text-primary" /> {t('exercise_library')}
            </h4>
            <div className="relative w-full max-w-xs">
              <Search size={14} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground`} />
              <input 
                type="text" 
                placeholder={t('search_library_placeholder', 'Search library...')} 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className={`w-full ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-medium outline-none focus:ring-1 focus:ring-primary transition-all`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Library Selector */}
            <div className="flex flex-col space-y-3">
              {/* Region Selector Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedRegionId('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    selectedRegionId === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t('all_regions_btn', 'All Regions')}
                </button>
                {(libraryData.regions || []).map(region => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setSelectedRegionId(region.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                      selectedRegionId === region.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {region.name}
                  </button>
                ))}
              </div>

              <div className="border border-border rounded-xl h-[250px] overflow-y-auto divide-y divide-border">
                {filteredLibrary.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10 font-bold uppercase tracking-wider">{t('no_matching_tests_in_repo', 'No exercises match search')}</p>
                ) : (
                  filteredLibrary.map(ex => {
                    const isSelected = assignment.exercise_id === ex.id;
                    const regionName = libraryData.regions.find(r => r.id === ex.region_id)?.name || ex.category || 'General';
                    return (
                      <div 
                        key={ex.id} 
                        onClick={() => setAssignment({ ...assignment, exercise_id: ex.id })}
                        className={`p-3 text-left cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-l-4 border-primary text-primary font-bold' : 'hover:bg-muted/30 text-foreground font-medium'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-wide">{ex.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{regionName}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Assignment Settings Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('planned_sets_lbl', 'Planned Sets')}</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 3" 
                    value={assignment.sets} 
                    onChange={e => setAssignment({ ...assignment, sets: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('reps_goal_lbl', 'Reps Goal')}</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 12" 
                    value={assignment.reps} 
                    onChange={e => setAssignment({ ...assignment, reps: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('weekly_freq_lbl', 'Weekly Freq.')}</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 3x/wk" 
                    value={assignment.frequency} 
                    onChange={e => setAssignment({ ...assignment, frequency: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('doctor_signature_req', 'Doctor Signature (Required)')}</label>
                <select 
                  disabled={currentUser?.role === 'doctor'}
                  value={assignment.doctor_id} 
                  onChange={e => setAssignment({ ...assignment, doctor_id: e.target.value })} 
                  className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">{t('select_assigning_clinician_prompt', 'Select Assigning Clinician...')}</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('clinical_instructions_notes_lbl', 'Clinical Instructions & Notes')}</label>
                <textarea 
                  rows={4} 
                  placeholder={t('enter_guidelines_placeholder', 'Enter guidelines, pacing, hold times...')}
                  value={assignment.notes} 
                  onChange={e => setAssignment({ ...assignment, notes: e.target.value })} 
                  className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <button 
                onClick={handleAssign}
                disabled={assignment.exercise_id === 0 || !assignment.doctor_id}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {t('add_to_program_btn', 'Add to Program')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program exercises list */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider border-b border-border pb-3">
          <Dumbbell size={16} className="text-primary" /> {t('active_home_program_title', 'Active Home Program')}
        </h4>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-xs uppercase tracking-widest font-bold animate-pulse">{t('loading_measurements', 'Loading program...')}</div>
        ) : assignedEx.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs uppercase tracking-widest font-bold opacity-60">
            {t('no_notes_logged_yet', 'No exercises assigned yet. Add exercises to create a program.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedEx.map(ex => {
              const isEditing = editingId === ex.id;
              return (
                <div key={ex.id} className="p-5 border border-border rounded-xl bg-card hover:border-primary/30 transition-all flex flex-col space-y-3 relative group">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wider">{ex.category || 'Rehab'}</span>
                      <h5 className="font-bold text-foreground text-sm uppercase tracking-wide mt-1.5">{ex.exercise_name}</h5>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">{t('assigned_by_lbl', 'Assigned by')} Dr. {ex.doctor_name}</p>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-1">
                        {!isEditing ? (
                          <button 
                            onClick={() => startEdit(ex)} 
                            className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdate(ex.id)} 
                            disabled={saving}
                            className="p-1 text-primary hover:text-primary-foreground rounded hover:bg-primary transition-colors cursor-pointer"
                          >
                            <Save size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleRemove(ex.id)} 
                          className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-3 gap-2 bg-muted/20 p-3 rounded-lg border border-border">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('sets_lbl', 'Sets')}</label>
                        <input 
                          type="text" 
                          value={editData.sets} 
                          onChange={e => setEditData({...editData, sets: e.target.value})} 
                          className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('reps_lbl', 'Reps')}</label>
                        <input 
                          type="text" 
                          value={editData.reps} 
                          onChange={e => setEditData({...editData, reps: e.target.value})} 
                          className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('frequency_lbl', 'Frequency')}</label>
                        <input 
                          type="text" 
                          value={editData.frequency} 
                          onChange={e => setEditData({...editData, frequency: e.target.value})} 
                          className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-border/60">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('sets_lbl', 'Sets')}</p>
                        <p className="text-xs font-bold text-foreground mt-0.5">{ex.sets || '—'}</p>
                      </div>
                      <div className="text-center border-x border-border/60">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('reps_lbl', 'Reps')}</p>
                        <p className="text-xs font-bold text-foreground mt-0.5">{ex.reps || '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('frequency_lbl', 'Frequency')}</p>
                        <p className="text-xs font-bold text-foreground mt-0.5">{ex.frequency || '—'}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('instructions_lbl', 'Instructions')}</p>
                    {isEditing ? (
                      <textarea 
                        rows={2} 
                        value={editData.notes} 
                        onChange={e => setEditData({...editData, notes: e.target.value})} 
                        className="w-full px-3 py-1.5 bg-background border border-border rounded text-xs text-foreground font-medium resize-none focus:outline-none"
                      />
                    ) : (
                      <p className="text-xs font-medium text-foreground leading-relaxed italic">{ex.notes ? `"${ex.notes}"` : t('no_notes', 'No specific guidelines.')}</p>
                    )}
                  </div>

                  {ex.video_url && (
                    <a 
                      href={ex.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 pt-1.5 w-fit cursor-pointer"
                    >
                      <ExternalLink size={12} /> {t('watch_video_tutorial_btn', 'Watch Video Tutorial')}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
