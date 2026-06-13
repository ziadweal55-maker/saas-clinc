import { useState, useEffect } from 'react';
import { Printer, Plus, X, Search, Dumbbell, Activity, Check, Trash2, FileSpreadsheet, Download, Upload, Edit2, Save } from 'lucide-react';
import { User } from '../types';

interface ExercisesTabProps {
  clientId: number;
  readOnly?: boolean;
  currentUser?: User | null;
}

export function ExercisesTab({ clientId, readOnly, currentUser }: ExercisesTabProps) {
  const [patientEx, setPatientEx] = useState<any[]>([]);
  const [libraryData, setLibraryData] = useState<{ regions: any[], exercises: any[] }>({ regions: [], exercises: [] });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [assignment, setAssignment] = useState({ exercise_id: 0, doctor_id: '', sets: '', reps: '', frequency: '', notes: '' });
  
  useEffect(() => {
    if (currentUser?.role === 'doctor' && currentUser.doctor_id) {
      setAssignment(prev => ({ ...prev, doctor_id: currentUser.doctor_id!.toString() }));
    }
  }, [currentUser]);

  // Local state for session logging
  const [logInputs, setLogInputs] = useState<Record<number, { sets: string, reps: string }>>({});
  const [isLogging, setIsLogging] = useState<number | null>(null);

  useEffect(() => { loadData(); }, [clientId]);

  const loadData = async () => {
    const lib = await window.api.getExercises();
    const pEx = await window.api.getClientExercises(clientId);
    const docs = await (window.api as any).getActiveDoctors();
    setLibraryData(lib);
    setPatientEx(pEx);
    setDoctors(docs || []);
  };

  const handleAssign = async () => {
    if (readOnly) return;
    if (assignment.exercise_id === 0) return;
    if (!assignment.doctor_id) {
      alert('Please select an assigned doctor.');
      return;
    }
    const res = await window.api.assignExercise({ ...assignment, client_id: clientId });
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
      loadData();
    }
  };

  const handleRemove = async (id: number) => {
    if (readOnly) return;
    if (confirm('Remove this exercise from patient program?')) {
      await window.api.removeClientExercise(id);
      loadData();
    }
  };

  const handleLogActivity = async (ceId: number) => {
    if (readOnly) return;
    const input = logInputs[ceId];
    if (!input || (!input.sets && !input.reps)) return;
    
    setIsLogging(ceId);
    const res = await window.api.logExerciseProgress({
      clientExerciseId: ceId,
      sessionId: 0, // In a larger system, link to current session
      sets: input.sets,
      reps: input.reps,
      notes: 'Logged via Quick Update'
    });
    
    if (res.success) {
      // Show short success feedback then clear
      setTimeout(() => {
        setIsLogging(null);
        setLogInputs(prev => ({ ...prev, [ceId]: { sets: '', reps: '' } }));
      }, 1000);
    }
  };

  const filteredLibrary = libraryData.exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  // Group patient exercises by region with search filter by region or exercise name
  const filteredPatientEx = patientEx.filter(ex => {
    const query = patientSearch.toLowerCase();
    const regionName = ex.region_name || 'General';
    const exerciseName = ex.exercise_name || '';
    return regionName.toLowerCase().includes(query) || exerciseName.toLowerCase().includes(query);
  });

  const groupedExercises: Record<string, any[]> = {};
  filteredPatientEx.forEach(ex => {
    const rName = ex.region_name || 'General';
    if (!groupedExercises[rName]) groupedExercises[rName] = [];
    groupedExercises[rName].push(ex);
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center no-print">
        <h3 className="text-lg font-black text-blue-950 uppercase italic tracking-tighter">Therapeutic Recovery Protocol</h3>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-50 text-blue-900 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-100 transition-all">
            <Printer size={16} /> Print Handout
          </button>
          {!readOnly && (
            <button 
              onClick={() => setShowAssign(!showAssign)}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-500/10">
              <Plus size={16} /> Assign Exercise
            </button>
          )}
        </div>
      </div>

      <div className="relative w-full no-print">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
        <input 
          type="text" 
          placeholder="Search patient exercises by region or exercise name..." 
          value={patientSearch}
          onChange={e => setPatientSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-blue-100 bg-white text-blue-950 font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs" 
        />
      </div>

      {showAssign && (
        <div className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 mb-8 shadow-inner no-print border-dashed">
          <div className="flex justify-between items-center mb-6">
             <h4 className="text-[10px] font-black text-blue-300 uppercase tracking-widest italic leading-none">Protocol Assignment Engine</h4>
             <button onClick={() => setShowAssign(false)} className="text-blue-300 hover:text-blue-800 font-bold transition-all"><X size={18}/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Step 1: Search Library */}
            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <input 
                  type="text" placeholder="Search Diagnostic Library..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-blue-100 rounded-xl font-bold text-blue-950 focus:ring-2 focus:ring-primary outline-none"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {libraryData.regions.map(region => {
                  const regionExercises = filteredLibrary.filter(ex => ex.region_id === region.id);
                  if (regionExercises.length === 0) return null;
                  return (
                    <div key={region.id} className="space-y-1">
                      <div className="px-2 py-1 text-[9px] font-black text-blue-300 uppercase tracking-widest">{region.name}</div>
                      {regionExercises.map(ex => (
                        <button 
                          key={ex.id}
                          onClick={() => setAssignment({...assignment, exercise_id: ex.id})}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${assignment.exercise_id === ex.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-blue-100 bg-white hover:border-primary/20'}`}>
                          <div className="flex justify-between items-center">
                             <span className="font-bold text-blue-950 text-xs">{ex.name}</span>
                             <span className="text-[8px] font-black uppercase text-blue-300 opacity-50">{ex.type}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Set Parameters */}
            <div className={`space-y-4 transition-all ${assignment.exercise_id === 0 ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
               <div>
                  <label className="text-[10px] font-black uppercase text-blue-300 ml-1">Assigned Doctor (Required)</label>
                  <select 
                    required
                    value={assignment.doctor_id} 
                    onChange={e => setAssignment({...assignment, doctor_id: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl font-bold text-blue-950 outline-none focus:border-primary appearance-none cursor-pointer"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-300 ml-1">Daily Sets</label>
                    <input type="text" placeholder="e.g. 3" className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl font-bold text-blue-950 outline-none focus:border-primary" value={assignment.sets} onChange={e => setAssignment({...assignment, sets: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-300 ml-1">Reps/Duration</label>
                    <input type="text" placeholder="e.g. 15 reps" className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl font-bold text-blue-950 outline-none focus:border-primary" value={assignment.reps} onChange={e => setAssignment({...assignment, reps: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-blue-300 ml-1">Weekly Frequency</label>
                  <input type="text" placeholder="e.g. 4x Week" className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl font-bold text-blue-950 outline-none focus:border-primary" value={assignment.frequency} onChange={e => setAssignment({...assignment, frequency: e.target.value})} />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-blue-300 ml-1">Individualized Notes</label>
                  <textarea rows={2} placeholder="Clinical precautions or tips..." className="w-full px-4 py-2 bg-white border border-blue-100 rounded-xl font-bold text-blue-950 outline-none focus:border-primary" value={assignment.notes} onChange={e => setAssignment({...assignment, notes: e.target.value})} />
               </div>
               <button 
                 onClick={handleAssign}
                 className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10">
                 Commit to Protocol
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Program List - Grouped by Region */}
      <div className="space-y-8">
        {Object.keys(groupedExercises).length === 0 ? (
          <div className="text-center py-20 bg-blue-50 border-2 border-dashed border-blue-100 rounded-3xl">
            <Dumbbell size={48} className="mx-auto text-blue-100 mb-4" />
            <p className="font-bold text-blue-300 uppercase italic">Physiotherapy protocol is currently empty.</p>
          </div>
        ) : (
          Object.entries(groupedExercises).map(([region, exercises]) => (
            <div key={region} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="h-0.5 flex-1 bg-blue-50 italic"></div>
                <h4 className="text-[10px] font-black text-blue-300 uppercase tracking-widest italic">{region} Exercises</h4>
                <div className="h-0.5 flex-1 bg-blue-50 italic"></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {exercises.map((ex, idx) => (
                  <div key={ex.id} className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm hover:border-primary transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group page-break-avoid relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none no-print">
                      <Activity size={80} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-black text-blue-200">{idx + 1}.</span>
                        <h4 className="font-black text-blue-950 uppercase italic leading-tight tracking-tight">{ex.exercise_name}</h4>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-blue-50 text-blue-400 rounded-lg">{ex.type}</span>
                        {ex.doctor_name && <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary rounded-lg border border-primary/10">Dr. {ex.doctor_name}</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-6 mb-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-300 uppercase tracking-tighter">Planned Sets</span>
                            <span className="text-sm font-bold text-blue-950">{ex.sets || '-'}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-300 uppercase tracking-tighter">Reps Goal</span>
                            <span className="text-sm font-bold text-blue-950">{ex.reps || '-'}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-300 uppercase tracking-tighter">Weekly Frequency</span>
                            <span className="text-sm font-bold text-blue-600">{ex.frequency || '-'}</span>
                         </div>
                      </div>
                      
                      {/* Session Input - "Update every session" */}
                      {!readOnly && (
                        <div className="flex items-center gap-4 no-print border-t border-blue-100 pt-4 mt-2">
                           <div className="flex-1 text-[10px] font-black text-blue-300 uppercase tracking-widest italic">Today's Session Activity:</div>
                           <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Sets" 
                                className="w-20 px-3 py-2 bg-white border border-blue-100 rounded-lg text-xs font-bold text-blue-950 outline-none focus:border-blue-600"
                                value={logInputs[ex.id]?.sets || ''}
                                onChange={e => setLogInputs(prev => ({ ...prev, [ex.id]: { ...(prev[ex.id] || { sets: '', reps: '' }), sets: e.target.value } }))}
                              />
                              <input 
                                type="text" 
                                placeholder="Reps" 
                                className="w-20 px-3 py-2 bg-white border border-blue-100 rounded-lg text-xs font-bold text-blue-950 outline-none focus:border-blue-500"
                                value={logInputs[ex.id]?.reps || ''}
                                onChange={e => setLogInputs(prev => ({ ...prev, [ex.id]: { ...(prev[ex.id] || { sets: '', reps: '' }), reps: e.target.value } }))}
                              />
                              <button 
                                onClick={() => handleLogActivity(ex.id)}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 ${isLogging === ex.id ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {isLogging === ex.id ? <Check size={14} /> : 'Log Activity'}
                              </button>
                           </div>
                        </div>
                      )}

                      <div className="mt-4 text-[11px] text-blue-800 leading-relaxed font-medium">
                         {ex.notes && (
                           <div className="mb-3 p-3 bg-red-50 text-red-900 rounded-xl border-l-4 border-red-500 italic font-bold">
                             Precautions: {ex.notes}
                           </div>
                         )}
                         <p className="opacity-80">{ex.instructions}</p>
                      </div>
                    </div>
                    {!readOnly && (
                      <button 
                        onClick={() => handleRemove(ex.id)} 
                        className="p-3 text-blue-100 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all no-print border border-transparent hover:border-red-100">
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden print:block mt-20 border-t border-blue-100 pt-8 text-center">
         <h2 className="text-xl font-black text-primary uppercase italic tracking-tighter">REVIVE CLINIC ENTERPRISE</h2>
         <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">Diagnostic Recovery Protocol - Clinician Supervised</p>
      </div>
    </div>
  );
}

export function ExerciseAdmin() {
  const [data, setData] = useState<{ regions: any[], exercises: any[] }>({ regions: [], exercises: [] });
  const [loading, setLoading] = useState(true);
  const [newRegion, setNewRegion] = useState('');
  const [newExercise, setNewExercise] = useState({ regionId: 0, name: '', type: 'Strengthening', instructions: '', video_url: '' });
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showColumnInfo, setShowColumnInfo] = useState(false);

  // Editing state for exercise regions and exercises
  const [editingRegionId, setEditingRegionId] = useState<number | null>(null);
  const [editRegionName, setEditRegionName] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editExerciseData, setEditExerciseData] = useState({ name: '', type: 'Strengthening', instructions: '', video_url: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await window.api.getExercises();
    setData(res);
    setLoading(false);
  };

  const handleAddRegion = async () => {
    if (!newRegion.trim()) return;
    const res = await window.api.addExerciseRegion(newRegion);
    if (res.success) {
      const newRegionObj = { id: res.id, name: newRegion.trim() };
      setData(prev => ({ ...prev, regions: [...prev.regions, newRegionObj] }));
      setNewRegion('');
    }
  };

  const handleUpdateRegion = async (id: number) => {
    if (!editRegionName.trim()) return;
    const res = await (window.api as any).updateExerciseRegion({ id, name: editRegionName.trim() });
    if (res.success) {
      setData(prev => ({
        ...prev,
        regions: prev.regions.map(r => r.id === id ? { ...r, name: editRegionName.trim() } : r)
      }));
      setEditingRegionId(null);
    }
  };

  const handleDeleteRegion = async (id: number) => {
    if (confirm('Delete this exercise region and ALL contained exercises?')) {
      await window.api.deleteExerciseRegion(id);
      setData(prev => ({
        regions: prev.regions.filter(r => r.id !== id),
        exercises: prev.exercises.filter(e => e.region_id !== id)
      }));
    }
  };

  const handleAddExercise = async () => {
    if (!newExercise.name.trim() || newExercise.regionId === 0) return;
    const res = await window.api.addExercise(newExercise);
    if (res.success) {
      // Immediately append to local state — NO full reload, NO scroll reset
      const newEx = {
        id: res.id,
        region_id: newExercise.regionId,
        name: newExercise.name.trim(),
        type: newExercise.type,
        instructions: newExercise.instructions,
        video_url: newExercise.video_url
      };
      setData(prev => ({ ...prev, exercises: [...prev.exercises, newEx] }));
      setNewExercise({ ...newExercise, name: '', instructions: '', video_url: '' });
    }
  };

  const handleUpdateExercise = async (id: number) => {
    if (!editExerciseData.name.trim()) return;
    const res = await (window.api as any).updateExercise({ id, ...editExerciseData });
    if (res.success) {
      setData(prev => ({
        ...prev,
        exercises: prev.exercises.map(e => e.id === id ? { ...e, ...editExerciseData } : e)
      }));
      setEditingExerciseId(null);
    }
  };

  const handleDeleteExercise = async (id: number) => {
    if (confirm('Delete this exercise from library?')) {
      await window.api.deleteExercise(id);
      setData(prev => ({ ...prev, exercises: prev.exercises.filter(e => e.id !== id) }));
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportStatus({ type: null, msg: '' });
    const res = await window.api.importExercisesExcel();
    setIsImporting(false);
    if (res.canceled) return;
    if (res.success) {
      setImportStatus({ type: 'success', msg: `✓ Imported ${res.imported} exercises (${res.skipped} skipped).` });
      loadData(); // Full reload needed to show all new data
    } else {
      setImportStatus({ type: 'error', msg: `✗ Import failed: ${res.error}` });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    const res = await window.api.exportExercisesExcel();
    setIsExporting(false);
    if (res.success) {
      setImportStatus({ type: 'success', msg: `✓ Exported to ${res.filePath?.split(/[\\/]/).pop()}` });
    } else if (!res.canceled) {
      setImportStatus({ type: 'error', msg: `✗ Export failed: ${res.error}` });
    }
  };

  if (loading) return <div className="text-center py-20 font-black uppercase tracking-widest text-blue-300 italic">Syncing Exercise Vault...</div>;

  return (
    <div className="space-y-10 pb-20">
      {/* Top Action Bar: Import / Export */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border-2 border-blue-100 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-black text-blue-950 uppercase italic tracking-tighter">Bulk Data Management</h3>
            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-0.5">Import or export the full exercise library via Excel</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowColumnInfo(!showColumnInfo)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
            >
              <FileSpreadsheet size={14} /> Column Guide
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={14} /> {isExporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={14} /> {isImporting ? 'Importing...' : 'Import Excel'}
            </button>
          </div>
        </div>

        {showColumnInfo && (
          <div className="bg-blue-950 rounded-2xl p-5 text-left space-y-3 animate-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Required Excel Column Names</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { col: 'region', req: true, desc: 'Body region name (e.g. "Cervical Spine"). Auto-created if not exists.' },
                { col: 'name', req: true, desc: 'Exercise name (e.g. "Chin Tucks").' },
                { col: 'type', req: false, desc: 'Type: Strengthening / Stretching / Mobility / Balance / Functional. Defaults to Strengthening.' },
                { col: 'instructions', req: false, desc: 'Step-by-step clinical instructions.' },
                { col: 'video_url', req: false, desc: 'Optional video link URL.' },
              ].map(item => (
                <div key={item.col} className="bg-blue-900/50 p-3 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-emerald-400 font-black text-xs">{item.col}</code>
                    {item.req && <span className="text-[8px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase">Required</span>}
                  </div>
                  <p className="text-[10px] text-blue-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {importStatus.type && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-bold ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {importStatus.msg}
          </div>
        )}
      </div>

      {/* Add Region */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-3xl border-2 border-blue-100 shadow-xl">
        <h3 className="text-lg font-black text-blue-950 uppercase italic tracking-tighter mb-4">Initialize Exercise Region</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="e.g., Cervical Spine, Core, Lower Extremity..." 
            className="flex-1 px-5 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-blue-950"
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRegion()}
          />
          <button 
            onClick={handleAddRegion}
            className="px-6 sm:px-10 py-3 bg-blue-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-2">
            <Plus size={18} /> Create Region
          </button>
        </div>
      </div>

      {/* Regions & Exercises */}
      {data.regions.map(region => (
        <div key={region.id} className="bg-white border-2 border-blue-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            {editingRegionId === region.id ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={editRegionName}
                  onChange={e => setEditRegionName(e.target.value)}
                  className="px-3 py-1 bg-white/10 text-white border border-white/20 rounded-lg text-sm font-bold outline-none focus:border-white w-full sm:w-64"
                  onKeyDown={e => e.key === 'Enter' && handleUpdateRegion(region.id)}
                />
                <button onClick={() => handleUpdateRegion(region.id)} className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-all">
                  <Save size={16} />
                </button>
                <button onClick={() => setEditingRegionId(null)} className="p-1.5 text-rose-400 hover:text-rose-300 transition-all">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <h4 className="font-black text-white uppercase italic tracking-widest">{region.name}</h4>
                <button
                  onClick={() => { setEditingRegionId(region.id); setEditRegionName(region.name); }}
                  className="p-1 text-blue-200 hover:text-white transition-all"
                  title="Rename Region"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            )}
            <button onClick={() => handleDeleteRegion(region.id)} className="text-red-400 hover:text-red-300 transition-all flex items-center gap-2 text-[10px] font-black uppercase">
              <Trash2 size={14} /> Remove Region
            </button>
          </div>
          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {data.exercises.filter(ex => ex.region_id === region.id).map(ex => (
                <div key={ex.id} className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-start group">
                  {editingExerciseId === ex.id ? (
                    <div className="flex-1 space-y-3 mr-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editExerciseData.name}
                          onChange={e => setEditExerciseData({ ...editExerciseData, name: e.target.value })}
                          className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-950 outline-none"
                          placeholder="Exercise Name"
                        />
                        <select
                          value={editExerciseData.type}
                          onChange={e => setEditExerciseData({ ...editExerciseData, type: e.target.value })}
                          className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-950 outline-none cursor-pointer"
                        >
                          <option>Strengthening</option>
                          <option>Stretching</option>
                          <option>Mobility</option>
                          <option>Balance</option>
                          <option>Functional</option>
                        </select>
                        <input
                          type="text"
                          value={editExerciseData.video_url}
                          onChange={e => setEditExerciseData({ ...editExerciseData, video_url: e.target.value })}
                          className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-950 outline-none"
                          placeholder="Video URL"
                        />
                      </div>
                      <textarea
                        value={editExerciseData.instructions}
                        onChange={e => setEditExerciseData({ ...editExerciseData, instructions: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-950 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        placeholder="Instructions"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateExercise(ex.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                          <Save size={12} /> Save
                        </button>
                        <button onClick={() => setEditingExerciseId(null)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-primary/10 text-primary rounded-full">{ex.type}</span>
                          <button
                            onClick={() => { setEditingExerciseId(ex.id); setEditExerciseData({ name: ex.name, type: ex.type || 'Strengthening', instructions: ex.instructions || '', video_url: ex.video_url || '' }); }}
                            className="p-1 text-blue-300 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                            title="Edit Exercise"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                        <h5 className="font-bold text-blue-950 uppercase text-xs">{ex.name}</h5>
                        {ex.video_url && <a href={ex.video_url} target="_blank" rel="noreferrer" className="text-[9px] text-primary underline font-bold mt-0.5 block">Video Link</a>}
                        <p className="text-[10px] text-blue-400 line-clamp-2 mt-1">{ex.instructions}</p>
                      </div>
                      <button onClick={() => handleDeleteExercise(ex.id)} className="p-2 text-blue-200 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-2">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Exercise to this Region */}
            <div className="bg-emerald-50 p-4 sm:p-6 rounded-2xl border border-emerald-100">
               <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4 italic">Link Diagnostic Exercise to {region.name}</h5>
               <div className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                   <input 
                     type="text" placeholder="Exercise Name" 
                     className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-950 outline-none focus:ring-2 focus:ring-emerald-500"
                     value={newExercise.regionId === region.id ? newExercise.name : ''}
                     onChange={e => setNewExercise({...newExercise, regionId: region.id, name: e.target.value})}
                   />
                   <select 
                     className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-950 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                     value={newExercise.regionId === region.id ? newExercise.type : 'Strengthening'}
                     onChange={e => setNewExercise({...newExercise, regionId: region.id, type: e.target.value})}>
                     <option>Strengthening</option>
                     <option>Stretching</option>
                     <option>Mobility</option>
                     <option>Balance</option>
                     <option>Functional</option>
                   </select>
                   <input 
                     type="text" placeholder="Video URL (optional)" 
                     className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-950 outline-none focus:ring-2 focus:ring-emerald-500"
                     value={newExercise.regionId === region.id ? newExercise.video_url : ''}
                     onChange={e => setNewExercise({...newExercise, regionId: region.id, video_url: e.target.value})}
                   />
                 </div>
                 <textarea 
                   placeholder="Clinical Instructions..." 
                   className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-950 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                   rows={2} value={newExercise.regionId === region.id ? newExercise.instructions : ''}
                   onChange={e => setNewExercise({...newExercise, regionId: region.id, instructions: e.target.value})}
                 />
                 <button 
                   onClick={handleAddExercise}
                   className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all flex items-center justify-center gap-2">
                   <Plus size={14} /> Register to Region
                 </button>
               </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

