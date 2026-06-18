import { useState, useEffect } from 'react';
import { Users, Key, Trash2, UserPlus, ShieldCheck, X, AlertCircle, Shield, Stethoscope, Snowflake, Flame, Building2, Search, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { Doctor } from '../types';

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    confirmPassword: '',
    role: 'staff',
    doctor_id: '',
    branch_id: '1'
  });
  const [error, setError] = useState('');
  
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Doctor Management States
  const [activeSection, setActiveSection] = useState<'users' | 'doctors'>('users');
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [doctorFormData, setDoctorFormData] = useState({ name: '', specialty: '', status: 'active' as 'active' | 'inactive' });
  const [doctorSearch, setDoctorSearch] = useState('');
  const [currentBranch, setCurrentBranch] = useState<{ id: number; name: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    if (window.api) {
        const userData = await window.api.getAllUsers();
        setUsers(userData || []);
        
        if (window.api.getDoctors) {
          const docData = await window.api.getDoctors();
          setDoctors(docData || []);
        }
        if ((window.api as any).getAllBranches) {
          const branchData = await (window.api as any).getAllBranches();
          setBranches((branchData || []).filter((b: any) => b.is_active));
        }
        if ((window.api as any).getCurrentBranch) {
          const activeBranch = await (window.api as any).getCurrentBranch();
          setCurrentBranch(activeBranch);
          if (activeBranch) {
            setFormData(prev => ({ ...prev, branch_id: activeBranch.id.toString() }));
          }
        }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusToggle = async (userId: number, currentStatus: string) => {
    if (!window.api || !window.api.updateUserStatus) return;
    const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';
    const res = await window.api.updateUserStatus({ userId, status: newStatus });
    if (res.success) {
      loadData();
    } else {
      alert('Failed to update account status.');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.role === 'doctor' && !formData.doctor_id) {
      setError('Please select a doctor profile to link with this account.');
      return;
    }

    try {
      if (window.api && window.api.setupAdmin) {
        const payload: any = { 
            username: formData.username, 
            password: formData.password,
            role: formData.role,
            doctor_id: formData.role === 'doctor' ? parseInt(formData.doctor_id) : null,
            // Admins are not branch-scoped; staff/doctors get their branch assignment
            branch_id: formData.role === 'admin' ? null : parseInt(formData.branch_id) || 1
        };
        const res = await window.api.setupAdmin(payload);
        if (res.success) {
          setFormData({ username: '', password: '', confirmPassword: '', role: 'staff', doctor_id: '', branch_id: '1' });
          setShowAddForm(false);
          loadData();
        } else {
          setError(res.error || 'Failed to create user account.');
        }
      }
    } catch (err) {
      setError('A system error occurred while creating the account.');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }
    const res = await window.api.resetUserPassword({ userId: resettingUser.id, newPassword });
    if (res.success) {
      alert(`Password for ${resettingUser.username} has been updated.`);
      setResettingUser(null);
      setNewPassword('');
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (username === 'root') {
        alert('The root account cannot be deleted.');
        return;
    }
    if (confirm(`CRITICAL: Are you sure you want to PERMANENTLY delete user "${username}"? This will revoke all system access.`)) {
      const res = await window.api.deleteUserAccount(id);
      if (res.success) loadData();
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorFormData.name.trim() || !doctorFormData.specialty.trim()) {
      alert('Name and specialty are required.');
      return;
    }
    try {
      if (editingDoctor) {
        await (window.api as any).updateDoctor(editingDoctor.id, doctorFormData);
      } else {
        await (window.api as any).addDoctor(doctorFormData);
      }
      setIsAddingDoctor(false);
      setEditingDoctor(null);
      setDoctorFormData({ name: '', specialty: '', status: 'active' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDoctorStatus = async (doctor: any) => {
    const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
    await (window.api as any).updateDoctor(doctor.id, { ...doctor, status: newStatus });
    loadData();
  };

  const handleDeleteDoctor = async (doctor: any) => {
    if (confirm(`Are you sure you want to delete Dr. ${doctor.name}? This will remove their user account, but preserve their logs and name in reports.`)) {
      try {
        const res = await (window.api as any).deleteDoctor(doctor.id);
        if (res.success) {
          loadData();
        } else {
          alert(res.error || 'Failed to delete doctor profile.');
        }
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'An error occurred.');
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin text-primary"><Users size={48} /></div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Synchronizing User Database...</p>
    </div>
  );

  // Filtering logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(userSearch.toLowerCase());
    const matchesBranch = selectedBranchFilter === 'all' ||
      user.role === 'admin' ||
      String(user.branch_id) === selectedBranchFilter;
    return matchesSearch && matchesBranch;
  });
  const activeUsers = filteredUsers.filter(u => (u.status || 'active') === 'active');
  const frozenUsers = filteredUsers.filter(u => u.status === 'frozen');

  const getBranchName = (branchId: number | null) => {
    if (!branchId) return null;
    return branches.find(b => b.id === branchId)?.name || `Branch #${branchId}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Section Switcher Tabs */}
      <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl w-fit border border-border">
        <button
          onClick={() => setActiveSection('users')}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            activeSection === 'users'
              ? 'bg-card text-primary shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveSection('doctors')}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            activeSection === 'doctors'
              ? 'bg-card text-primary shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Doctors
        </button>
      </div>

      {activeSection === 'users' ? (
        <>
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-primary/10 p-4 rounded-2xl text-primary shrink-0">
                <Users size={32} />
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h3 className="text-foreground font-bold text-lg font-heading">Clinic Team Management</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  Manage your staff accounts and access controls. You can add new team members or update security credentials for existing ones.
                </p>
              </div>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 shrink-0">
                {showAddForm ? <><X size={18} /> Cancel</> : <><UserPlus size={18} /> Add Team Member</>}
              </button>
            </div>
            {/* Search + Active Branch row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background/80 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              {currentBranch && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-4 py-2.5 rounded-xl border border-border">
                  <Building2 size={12} className="text-primary" />
                  <span>Active Branch: {currentBranch.name}</span>
                </div>
              )}
            </div>
          </div>

          {showAddForm && (
            <div className="bg-muted/10 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary animate-pulse" /> Register Security Credentials
                </h4>
                <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleAddUser} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold uppercase tracking-wider">
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Account Username</label>
                    <input 
                      type="text" 
                      placeholder="e.g. clinician.smith"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Access Privilege Role</label>
                    <select 
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="admin">Administrator (Full Access)</option>
                      <option value="staff">Clinical Staff (Daily Operations)</option>
                      <option value="doctor">Medical Specialist / Doctor</option>
                      <option value="cfo">Chief Financial Officer (CFO)</option>
                    </select>
                  </div>
                </div>

                {formData.role === 'doctor' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Assign Doctor Profile</label>
                    <select 
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs"
                      value={formData.doctor_id}
                      onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                    >
                      <option value="">Select Doctor Profile...</option>
                      {doctors.filter(d => (d.status || 'active') === 'active').map(doc => (
                        <option key={doc.id} value={doc.id.toString()}>{doc.name} ({doc.specialty})</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.role !== 'admin' && branches.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Default Operating Branch</label>
                    <select 
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs"
                      value={formData.branch_id}
                      onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id.toString()}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Security Password</label>
                    <input 
                      type="password" 
                      placeholder="Min. 6 characters"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirm Security Password</label>
                    <input 
                      type="password" 
                      placeholder="Retype password"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <ShieldCheck size={20} /> Authenticate & Register Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Active Accounts Section ── */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="bg-emerald-500/5 border-b border-emerald-500/20 px-8 py-4 flex items-center gap-3">
              <Flame size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Active Accounts</span>
              <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{activeUsers.length}</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff Member / Username</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access Role</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Branch</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-8 text-center text-sm text-muted-foreground">No active accounts match your filter.</td></tr>
                  ) : activeUsers.map(user => (
                    <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                            {user.username[0]}
                          </div>
                          <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">{user.username}</div>
                            {user.username === 'root' && <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">System Root</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                          user.role === 'doctor' ? 'bg-accent/10 text-accent border border-accent/20' :
                          'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {user.role === 'admin' ? <Shield size={12} /> : user.role === 'doctor' ? <Stethoscope size={12} /> : <Users size={12} />}
                          {user.role}
                          {user.doctor_id && <span className="ml-1 opacity-60">#{user.doctor_id}</span>}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {user.role === 'admin' ? (
                          <span className="text-[10px] text-muted-foreground font-medium italic">All branches</span>
                        ) : getBranchName(user.branch_id) ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                            <Building2 size={10} /> {getBranchName(user.branch_id)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <button
                          onClick={() => user.username !== 'root' && handleStatusToggle(user.id, user.status || 'active')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            user.username === 'root' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default' :
                            'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20'
                          }`}>
                          <Flame size={10} />
                          active
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setResettingUser(user)} className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all" title="Reset Credentials">
                            <Key size={18} />
                          </button>
                          {user.username !== 'root' && (
                            <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-2.5 bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all" title="Revoke Access">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Frozen Accounts Section ── */}
          {(frozenUsers.length > 0 || selectedBranchFilter !== 'all' || userSearch) && (
            <div className="bg-card rounded-3xl border border-rose-500/20 shadow-sm overflow-hidden">
              <div className="bg-rose-500/5 border-b border-rose-500/20 px-8 py-4 flex items-center gap-3">
                <Snowflake size={16} className="text-rose-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Frozen Accounts</span>
                <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{frozenUsers.length}</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff Member / Username</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access Role</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Branch</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {frozenUsers.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-8 text-center text-sm text-muted-foreground">No frozen accounts match your filter.</td></tr>
                    ) : frozenUsers.map(user => (
                      <tr key={user.id} className="hover:bg-rose-500/5 transition-colors group opacity-80">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                              {user.username[0]}
                            </div>
                            <div>
                              <div className="font-bold text-foreground/70 group-hover:text-foreground transition-colors">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider opacity-70 ${
                            user.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                            user.role === 'doctor' ? 'bg-accent/10 text-accent border border-accent/20' :
                            'bg-muted text-muted-foreground border border-border'
                          }`}>
                            {user.role === 'admin' ? <Shield size={12} /> : user.role === 'doctor' ? <Stethoscope size={12} /> : <Users size={12} />}
                            {user.role}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          {user.role === 'admin' ? (
                            <span className="text-[10px] text-muted-foreground font-medium italic">All branches</span>
                          ) : getBranchName(user.branch_id) ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                              <Building2 size={10} /> {getBranchName(user.branch_id)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => handleStatusToggle(user.id, 'frozen')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20">
                            <Snowflake size={10} />
                            frozen
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => setResettingUser(user)} className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all" title="Reset Credentials">
                              <Key size={18} />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-2.5 bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all" title="Revoke Access">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-primary/10 p-4 rounded-2xl text-primary shrink-0">
                <Stethoscope size={32} />
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h3 className="text-foreground font-bold text-lg font-heading">Doctor Management</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  Configure active practitioners and specialists. Frozen doctors will be excluded from signature options.
                </p>
              </div>
              <button 
                onClick={() => {
                  setEditingDoctor(null);
                  setDoctorFormData({ name: '', specialty: '', status: 'active' });
                  setIsAddingDoctor(!isAddingDoctor);
                }}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 shrink-0">
                {isAddingDoctor ? <><X size={18} /> Cancel</> : <><UserPlus size={18} /> Add Doctor</>}
              </button>
            </div>

            {/* Doctor Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search doctors by name or specialty..."
                value={doctorSearch}
                onChange={e => setDoctorSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Add / Edit Doctor Form */}
          {(isAddingDoctor || editingDoctor) && (
            <div className="bg-muted/10 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Stethoscope size={16} className="text-primary animate-pulse" />
                  {editingDoctor ? `Modify Doctor Profile: ${editingDoctor.name}` : 'Add New Doctor Profile'}
                </h4>
                <button onClick={() => { setIsAddingDoctor(false); setEditingDoctor(null); }} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveDoctor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Doctor Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. John Doe"
                      value={doctorFormData.name}
                      onChange={e => setDoctorFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Specialty</label>
                    <input
                      type="text"
                      required
                      placeholder="Physiotherapist"
                      value={doctorFormData.specialty}
                      onChange={e => setDoctorFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-medium text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {editingDoctor && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Profile Status</label>
                    <select
                      value={doctorFormData.status}
                      onChange={e => setDoctorFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <ShieldCheck size={20} />
                    {editingDoctor ? 'Update Doctor Profile' : 'Register Doctor Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Doctors List */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Doctor Name</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Specialty</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {doctors
                    .filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || d.specialty.toLowerCase().includes(doctorSearch.toLowerCase()))
                    .map(doc => (
                      <tr key={doc.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                              {doc.name[0] || 'D'}
                            </div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">{doc.name}</div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-semibold text-muted-foreground">{doc.specialty}</span>
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => toggleDoctorStatus(doc)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                              doc.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20'
                            }`}
                          >
                            {doc.status === 'active' ? (
                              <><Flame size={10} /> active</>
                            ) : (
                              <><Snowflake size={10} /> frozen</>
                            )}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => {
                                setEditingDoctor(doc);
                                setDoctorFormData({ name: doc.name, specialty: doc.specialty, status: doc.status });
                                setIsAddingDoctor(false);
                              }}
                              className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                              title="Edit Profile"
                            >
                              <Edit2 size={18} className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doc)}
                              className="p-2.5 bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                              title="Delete Profile"
                            >
                              <Trash2 size={18} className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {resettingUser && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
               <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-2">
                  <Key size={32} />
               </div>
               <h3 className="text-2xl font-bold text-foreground font-heading italic">Credential Reset</h3>
               <p className="text-sm text-muted-foreground font-medium">Re-issuing access for <strong>{resettingUser.username}</strong>.</p>
            </div>
            
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Secure Password</label>
               <input 
                 type="password" 
                 placeholder="Min. 6 characters"
                 className="w-full px-4 py-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
               />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => { setResettingUser(null); setNewPassword(''); }}
                className="flex-1 py-3 text-muted-foreground font-bold text-xs uppercase tracking-widest hover:bg-muted rounded-2xl transition-all">
                Cancel
              </button>
              <button 
                onClick={handleResetPassword}
                className="flex-1 py-4 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all">
                Update Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
