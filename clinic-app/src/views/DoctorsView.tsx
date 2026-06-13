import { useState, useEffect } from 'react';
import { Search, Edit2, CheckCircle, XCircle, UserPlus, Stethoscope, RefreshCw } from 'lucide-react';
import { Doctor } from '../types';

export function DoctorsView() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{ name: string; specialty: string; status: 'active' | 'inactive' }>({ name: '', specialty: '', status: 'active' });

  const loadDoctors = async () => {
    setIsLoading(true);
    try {
      if (window.api && (window.api as any).getDoctors) {
        const data = await (window.api as any).getDoctors();
        setDoctors(data || []);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        await (window.api as any).updateDoctor(editingDoctor.id, formData);
      } else {
        await (window.api as any).addDoctor(formData);
      }
      setIsAdding(false);
      setEditingDoctor(null);
      setFormData({ name: '', specialty: '', status: 'active' });
      loadDoctors();
    } catch (err) {
      console.error('Error saving doctor:', err);
    }
  };

  const toggleStatus = async (doctor: Doctor) => {
    try {
      const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
      await (window.api as any).updateDoctor(doctor.id, { ...doctor, status: newStatus });
      loadDoctors();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-heading tracking-tight italic uppercase">Doctor Management</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1 uppercase tracking-widest">Register and manage medical professionals for record assignment.</p>
        </div>
        
        <button 
          onClick={() => { setIsAdding(true); setEditingDoctor(null); setFormData({ name: '', specialty: '', status: 'active' }); }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/20 active:scale-95 transition-all shadow-lg shadow-primary/10">
          <UserPlus size={18} /> Add New Doctor
        </button>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
        <div className="px-8 py-6 border-b border-border bg-muted/30">
          <div className="flex flex-1 max-w-md items-center gap-3 bg-background border border-border px-4 py-2.5 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search size={18} className="text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by doctor name or specialty..."
              className="bg-transparent border-none outline-none text-sm font-bold w-full placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Doctor Name</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Specialty</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <RefreshCw className="animate-spin mx-auto text-primary" size={32} />
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                    No doctors found.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map(doc => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <Stethoscope size={20} />
                        </div>
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors uppercase italic tracking-tight">{doc.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{doc.specialty}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${doc.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                        {doc.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setEditingDoctor(doc); setFormData({ name: doc.name, specialty: doc.specialty, status: doc.status }); setIsAdding(true); }}
                          className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90 border border-border group-hover:border-primary/20">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => toggleStatus(doc)}
                          className={`p-2 rounded-lg transition-all active:scale-90 border ${doc.status === 'active' ? 'bg-destructive/5 text-destructive hover:bg-destructive/10 border-destructive/20' : 'bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20'}`}>
                          {doc.status === 'active' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-border bg-muted/30 flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic tracking-tight">{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h3>
              <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground p-1 transition-colors"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Doctor Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  placeholder="e.g. Dr. Ahmed Hassan"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Specialty</label>
                <input 
                  required
                  type="text" 
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  placeholder="e.g. Orthopedic Surgery"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Status</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${formData.status === 'active' ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}>
                    Active
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'inactive' })}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${formData.status === 'inactive' ? 'bg-destructive text-white border-destructive-foreground shadow-lg shadow-destructive/20' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}>
                    Inactive
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-border text-muted-foreground hover:bg-muted transition-all">
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  {editingDoctor ? 'Save Changes' : 'Register Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
