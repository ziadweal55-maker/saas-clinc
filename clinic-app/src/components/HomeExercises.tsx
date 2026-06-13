import { useState, useEffect } from 'react';
import { Plus, X, Search, Dumbbell, Trash2, CheckCircle, AlertTriangle, ExternalLink, Edit3, Save } from 'lucide-react';
import { User } from '../types';

interface HomeExercisesProps {
  clientId: number;
  readOnly?: boolean;
  currentUser?: User | null;
}

export function HomeExercises({ clientId, readOnly, currentUser }: HomeExercisesProps) {
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
      showFeedback('error', 'Please select an assigning doctor.');
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
        showFeedback('success', 'Exercise assigned successfully to Home Program!');
        loadData();
      } else {
        showFeedback('error', res.error || 'Failed to assign exercise.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'System error occurred.');
    }
  };

  const handleRemove = async (id: number) => {
    if (readOnly) return;
    if (confirm('Remove this exercise from the patient\'s home program?')) {
      try {
        const res = await window.api.removeHomeExercise(id);
        if (res.success) {
          showFeedback('success', 'Exercise removed from Home Program.');
          loadData();
        } else {
          showFeedback('error', res.error || 'Failed to remove exercise.');
        }
      } catch (err: any) {
        showFeedback('error', err.message || 'System error occurred.');
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
        showFeedback('success', 'Exercise updated successfully.');
        loadData();
      } else {
        showFeedback('error', res.error || 'Failed to update exercise.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'System error occurred.');
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
          <h3 className="text-xl font-bold text-foreground font-heading">Therapeutic Recovery Protocol</h3>
          <p className="text-muted-foreground text-xs font-medium mt-0.5">Manage exercises for independent practice at home. Synced to patient portal.</p>
        </div>
        {!readOnly && (
          <button 
            onClick={() => setShowAssign(!showAssign)} 
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
              showAssign ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            }`}
          >
            {showAssign ? <><X size={16} /> Close Library</> : <><Plus size={16} /> Assign Exercise</>}
          </button>
        )}
      </div>

      {showAssign && !readOnly && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <Dumbbell size={16} className="text-primary" /> Exercise Library
            </h4>
            <div className="relative w-full max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search library..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-medium outline-none focus:ring-1 focus:ring-primary transition-all"
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
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all ${
                    selectedRegionId === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  All Regions
                </button>
                {(libraryData.regions || []).map(region => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setSelectedRegionId(region.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all ${
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
                  <p className="text-xs text-muted-foreground text-center py-10 font-bold uppercase tracking-wider">No exercises match search</p>
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
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Planned Sets</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 3" 
                    value={assignment.sets} 
                    onChange={e => setAssignment({ ...assignment, sets: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Reps Goal</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 12" 
                    value={assignment.reps} 
                    onChange={e => setAssignment({ ...assignment, reps: e.target.value })} 
                    className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Weekly Freq.</label>
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
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Doctor Signature</label>
                <select 
                  disabled={currentUser?.role === 'doctor'}
                  value={assignment.doctor_id} 
                  onChange={e => setAssignment({ ...assignment, doctor_id: e.target.value })} 
                  className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-semibold outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Assigning Clinician...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id.toString()}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Rehabilitation Guidance / Notes</label>
                <textarea 
                  rows={2} 
                  placeholder="Specific patient instructions, e.g. Keep spine neutral, stop if pain increases." 
                  value={assignment.notes} 
                  onChange={e => setAssignment({ ...assignment, notes: e.target.value })} 
                  className="w-full px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg text-foreground font-medium outline-none resize-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button 
                type="button" 
                onClick={handleAssign}
                disabled={assignment.exercise_id === 0}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest hover:-translate-y-0.5 active:scale-95 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
              >
                Confirm & Add to Home Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Syncing Program...</p>
        </div>
      ) : assignedEx.length === 0 ? (
        <div className="text-center py-20 bg-muted/5 rounded-3xl border border-border">
          <Dumbbell size={48} className="mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs">No Active Home Exercises</p>
          <p className="text-[10px] text-muted-foreground mt-1">Assign exercises from the library to build the patient's daily home program.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignedEx.map(ex => (
            <div key={ex.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-foreground text-sm uppercase tracking-wider leading-tight">{ex.exercise_name}</h4>
                    <span className="inline-block text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wider mt-1">{ex.region_name || 'General'}</span>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      {editingId !== ex.id && (
                        <button 
                          onClick={() => startEdit(ex)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Edit exercise values"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemove(ex.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Remove exercise"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {editingId === ex.id ? (
                  /* Inline edit form */
                  <div className="space-y-3 bg-muted/20 border border-primary/20 rounded-xl p-4">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Edit Exercise Parameters</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Planned Sets</label>
                        <input 
                          type="text" 
                          value={editData.sets} 
                          onChange={e => setEditData({ ...editData, sets: e.target.value })}
                          placeholder="e.g. 3"
                          className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground font-bold outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Reps Goal</label>
                        <input 
                          type="text" 
                          value={editData.reps} 
                          onChange={e => setEditData({ ...editData, reps: e.target.value })}
                          placeholder="e.g. 12"
                          className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground font-bold outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Weekly Freq.</label>
                        <input 
                          type="text" 
                          value={editData.frequency} 
                          onChange={e => setEditData({ ...editData, frequency: e.target.value })}
                          placeholder="e.g. 3x/wk"
                          className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground font-bold outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Instructions / Notes</label>
                      <textarea 
                        rows={2}
                        value={editData.notes} 
                        onChange={e => setEditData({ ...editData, notes: e.target.value })}
                        placeholder="Patient instructions..."
                        className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground font-medium outline-none resize-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted text-muted-foreground hover:opacity-80 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(ex.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Save size={12} /> Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/50 text-center font-bold text-[10px] uppercase tracking-wider">
                    <div>
                      <span className="block text-[8px] text-muted-foreground">Planned Sets</span>
                      <span className="text-foreground font-black mt-0.5 block">{ex.sets || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-muted-foreground">Reps Goal</span>
                      <span className="text-foreground font-black mt-0.5 block">{ex.reps || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-muted-foreground">Weekly Freq.</span>
                      <span className="text-foreground font-black mt-0.5 block text-xs tracking-tighter">{ex.frequency || '—'}</span>
                    </div>
                  </div>
                )}

                {editingId !== ex.id && ex.notes && (
                  <p className="text-[10px] text-muted-foreground italic bg-muted/10 p-2.5 rounded-lg border border-border/30">
                    <span className="font-black not-italic uppercase text-[8px] text-primary tracking-widest block mb-0.5">Instruction:</span>
                    {ex.notes}
                  </p>
                )}
              </div>

              {ex.video_url && (
                <a 
                  href={ex.video_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-widest hover:text-accent transition-colors pt-2 self-start border-t border-border/50 w-full"
                >
                  <ExternalLink size={12} /> Video Tutorial Available
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
