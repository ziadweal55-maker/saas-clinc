import { useState, useEffect } from 'react';
import { Users, Key, Trash2, UserPlus, ShieldCheck, X, AlertCircle, Shield, Stethoscope, Snowflake, Flame, Building2, Search, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { Doctor } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface UserManagementProps {
  currentUser?: any;
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const { t, isAr } = useLanguage();
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
  const [selectedFormBranches, setSelectedFormBranches] = useState<number[]>([]);
  const [assigningUser, setAssigningUser] = useState<any | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<number[]>([]);
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
        const userData = await window.api.getAllUsers(currentUser?.isRoot);
        setUsers(Array.isArray(userData) ? userData : []);
        
        if (window.api.getDoctors) {
          const docData = await window.api.getDoctors();
          setDoctors(Array.isArray(docData) ? docData : []);
        }
        if ((window.api as any).getAllBranches) {
          const branchData = await (window.api as any).getAllBranches();
          setBranches(Array.isArray(branchData) ? branchData.filter((b: any) => b.is_active) : []);
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
      alert(t('toast_failed_load_requests', 'Failed to update account status.'));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError(t('pwd_mismatch_error', 'Passwords do not match.'));
      return;
    }
    
    if (formData.password.length < 6) {
      setError(t('pwd_length_error', 'Password must be at least 6 characters.'));
      return;
    }

    if (formData.role === 'doctor' && !formData.doctor_id) {
      setError(t('select_doctor_profile_prompt', 'Please select a doctor profile to link with this account.'));
      return;
    }

    if (currentUser?.isRoot && (formData.role === 'admin' || formData.role === 'cfo') && selectedFormBranches.length === 0) {
      setError(t('select_branches_lbl', 'Please select at least one branch.'));
      return;
    }

    try {
      if (window.api && window.api.setupAdmin) {
        const payload: any = { 
            username: formData.username, 
            password: formData.password,
            role: formData.role,
            doctor_id: formData.role === 'doctor' ? parseInt(formData.doctor_id) : null,
            branch_id: (formData.role === 'admin' || formData.role === 'cfo')
              ? (selectedFormBranches[0] || null)
              : currentUser?.isRoot ? (parseInt(formData.branch_id) || 1) : (currentBranch?.id || 1),
            branch_ids: (formData.role === 'admin' || formData.role === 'cfo')
              ? selectedFormBranches.join(',')
              : (currentUser?.isRoot ? formData.branch_id : String(currentBranch?.id || 1))
        };
        const res = await window.api.setupAdmin(payload);
        if (res.success) {
          setFormData({ username: '', password: '', confirmPassword: '', role: 'staff', doctor_id: '', branch_id: currentBranch?.id ? currentBranch.id.toString() : '1' });
          setSelectedFormBranches([]);
          setShowAddForm(false);
          loadData();
        } else {
          setError(res.error || t('setup_failed_error', 'Failed to create user account.'));
        }
      }
    } catch (err) {
      setError(t('critical_setup_error', 'A system error occurred while creating the account.'));
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
        alert(t('pwd_length_error', 'Password must be at least 6 characters.'));
        return;
    }
    const res = await window.api.resetUserPassword({ userId: resettingUser.id, newPassword });
    if (res.success) {
      alert(t('toast_request_approved', 'Password updated successfully!'));
      setResettingUser(null);
      setNewPassword('');
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (username === 'root') {
        alert(t('root_no_delete', 'The root account cannot be deleted.'));
        return;
    }
    if (confirm(t('confirm_delete_user_desc', `CRITICAL: Are you sure you want to PERMANENTLY delete user "${username}"? This will revoke all system access.`))) {
      const res = await window.api.deleteUserAccount(id);
      if (res.success) loadData();
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorFormData.name.trim() || !doctorFormData.specialty.trim()) {
      alert(t('name_specialty_req', 'Name and specialty are required.'));
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
    if (confirm(t('confirm_delete_doctor_desc', `Are you sure you want to delete Dr. ${doctor.name}? This will remove their user account, but preserve their logs and name in reports.`))) {
      try {
        const res = await (window.api as any).deleteDoctor(doctor.id);
        if (res.success) {
          loadData();
        } else {
          alert(res.error || t('toast_sys_error', 'Failed to delete doctor profile.'));
        }
      } catch (err: any) {
        console.error(err);
        alert(err.message || t('toast_sys_error_occurred', 'An error occurred.'));
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

  const renderBranches = (user: any) => {
    if (user.isRoot || user.username === 'root') {
      return <span className="text-[10px] text-primary font-black italic uppercase tracking-wider">All Branches (Owner)</span>;
    }
    if (user.role === 'admin' || user.role === 'cfo') {
      if (user.branch_ids) {
        const ids = user.branch_ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {ids.map((id: number) => {
              const name = getBranchName(id);
              return name ? (
                <span key={id} className="inline-flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10">
                  <Building2 size={8} className="shrink-0" /> {name}
                </span>
              ) : null;
            })}
          </div>
        );
      }
      return <span className="text-[10px] text-muted-foreground font-medium italic">No branches assigned</span>;
    }
    const name = getBranchName(user.branch_id);
    return name ? (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
        <Building2 size={10} className="shrink-0" /> {name}
      </span>
    ) : (
      <span className="text-[10px] text-muted-foreground/50">—</span>
    );
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
          {t('users_tab_lbl', 'Users')}
        </button>
        <button
          onClick={() => setActiveSection('doctors')}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            activeSection === 'doctors'
              ? 'bg-card text-primary shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('doctors_tab_lbl', 'Doctors')}
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
                <h3 className="text-foreground font-bold text-lg font-heading">{t('clinic_team_mgmt_title', 'Clinic Team Management')}</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  {t('clinic_team_mgmt_desc', 'Manage your staff accounts and access controls. You can add new team members or update security credentials for existing ones.')}
                </p>
              </div>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 shrink-0">
                {showAddForm ? <><X size={18} /> {t('cancel', 'Cancel')}</> : <><UserPlus size={18} /> {t('add_team_member_btn', 'Add Team Member')}</>}
              </button>
            </div>
            {/* Search + Active Branch row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="relative flex-1">
                <Search size={15} className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none`} />
                <input
                  type="text"
                  placeholder={t('search_by_username_placeholder', 'Search by username...')}
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className={`w-full ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2.5 rounded-xl border border-border bg-background/80 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                />
              </div>
              {currentBranch && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-4 py-2.5 rounded-xl border border-border">
                  <Building2 size={12} className="text-primary" />
                  <span>{t('active_branch_lbl', 'Active Branch:')} {currentBranch.name}</span>
                </div>
              )}
            </div>
          </div>

          {showAddForm && (
            <div className="bg-muted/10 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary animate-pulse" /> {t('register_security_creds', 'Register Security Credentials')}
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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('acc_username', 'Account Username')}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. clinician.smith"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('access_privilege_role', 'Access Privilege Role')}</label>
                    <select 
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      {currentUser?.isRoot && <option value="owner">{t('role_owner', 'Owner (Super Admin)')}</option>}
                      {currentUser?.isRoot && <option value="admin">{t('role_admin', 'Administrator (Full Access)')}</option>}
                      {currentUser?.isRoot && <option value="cfo">{t('role_cfo', 'Chief Financial Officer (CFO)')}</option>}
                      <option value="staff">{t('role_staff', 'Clinical Staff (Daily Operations)')}</option>
                      <option value="doctor">{t('role_doctor', 'Medical Specialist / Doctor')}</option>
                    </select>
                  </div>
                </div>

                {formData.role === 'doctor' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('assign_doctor_profile', 'Assign Doctor Profile')}</label>
                    <select 
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs"
                      value={formData.doctor_id}
                      onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                    >
                      <option value="">{t('select_doctor_profile_prompt', 'Select Doctor Profile...')}</option>
                      {doctors.filter(d => (d.status || 'active') === 'active').map(doc => (
                        <option key={doc.id} value={doc.id.toString()}>{doc.name} ({doc.specialty})</option>
                      ))}
                    </select>
                  </div>
                )}

                {(formData.role === 'admin' || formData.role === 'cfo') && branches.length > 0 && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('assigned_branches_ctrl', 'Assigned Branches (Control Privileges)')}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {branches.map(b => (
                        <label key={b.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedFormBranches.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFormBranches([...selectedFormBranches, b.id]);
                              } else {
                                setSelectedFormBranches(selectedFormBranches.filter(id => id !== b.id));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-xs font-bold text-foreground">{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.role !== 'admin' && formData.role !== 'cfo' && branches.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('default_operating_branch', 'Default Operating Branch')}</label>
                    {currentUser?.isRoot ? (
                      <select 
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs"
                        value={formData.branch_id}
                        onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                      >
                        {branches.map(b => (
                          <option key={b.id} value={b.id.toString()}>{b.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-4 py-3.5 bg-muted border border-border rounded-xl font-bold text-muted-foreground text-xs">
                        {currentBranch?.name || t('loading_path', 'Loading branch...')}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('security_pwd', 'Security Password')}</label>
                    <input 
                      type="password" 
                      placeholder={t('pwd_length_error', 'Min. 6 characters')}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('confirm_pwd', 'Confirm Security Password')}</label>
                    <input 
                      type="password" 
                      placeholder={t('confirm_pwd', 'Retype password')}
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
                    <ShieldCheck size={20} /> {t('auth_register_account', 'Authenticate & Register Account')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Active Accounts Section ── */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className={`bg-emerald-500/5 border-b border-emerald-500/20 px-8 py-4 flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
              <Flame size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t('active_accounts_section', 'Active Accounts')}</span>
              <span className={`${isAr ? 'mr-auto' : 'ml-auto'} text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full`}>{activeUsers.length}</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[750px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('staff_member_username_hdr', 'Staff Member / Username')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('access_role_hdr', 'Access Role')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('branch_header', 'Branch')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('status_header', 'Status')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-left' : 'text-right'}`}>{t('actions_header', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-8 text-center text-sm text-muted-foreground">{t('search_results_empty', 'No active accounts match your filter.')}</td></tr>
                  ) : activeUsers.map(user => (
                    <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className={`flex items-center gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {user.username[0]}
                          </div>
                          <div className={isAr ? 'text-right' : 'text-left'}>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">{user.username}</div>
                            {user.username === 'root' && <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">System Root</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'owner' ? 'bg-primary text-primary-foreground border border-primary/30 shadow-sm' :
                          user.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                          user.role === 'doctor' ? 'bg-accent/10 text-accent border border-accent/20' :
                          user.role === 'cfo' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                          'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {user.role === 'owner' || user.role === 'admin' ? <Shield size={12} /> : user.role === 'doctor' ? <Stethoscope size={12} /> : <Users size={12} />}
                          {user.role === 'cfo' ? 'CFO' : t(`role_${user.role}`, user.role)}
                          {user.doctor_id && <span className="ml-1 opacity-60">#{user.doctor_id}</span>}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {renderBranches(user)}
                      </td>
                      <td className="px-8 py-5">
                        <button
                          onClick={() => user.username !== 'root' && handleStatusToggle(user.id, user.status || 'active')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            user.username === 'root' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default' :
                            'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20'
                          }`}>
                          <Flame size={10} />
                          {t('status_active', 'active')}
                        </button>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex gap-3 ${isAr ? 'justify-start' : 'justify-end'}`}>
                          {currentUser?.isRoot && (user.role === 'admin' || user.role === 'cfo') && user.username !== 'root' && (
                            <button 
                              onClick={() => {
                                setAssigningUser(user);
                                const ids = user.branch_ids
                                  ? user.branch_ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
                                  : [];
                                setAssignedBranches(ids);
                              }} 
                              className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all font-sans cursor-pointer" 
                              title={t('assign_branches_tooltip', 'Assign Branches')}
                            >
                              <Building2 size={18} />
                            </button>
                          )}
                          <button onClick={() => setResettingUser(user)} className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer" title={t('reset_creds_tooltip', 'Reset Credentials')}>
                            <Key size={18} />
                          </button>
                          {user.username !== 'root' && (
                            <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-2.5 bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer" title={t('revoke_access_tooltip', 'Revoke Access')}>
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
              <div className={`bg-rose-500/5 border-b border-rose-500/20 px-8 py-4 flex items-center gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
                <Snowflake size={16} className="text-rose-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">{t('frozen_accounts_section', 'Frozen Accounts')}</span>
                <span className={`${isAr ? 'mr-auto' : 'ml-auto'} text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full`}>{frozenUsers.length}</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left min-w-[750px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('staff_member_username_hdr', 'Staff Member / Username')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('access_role_hdr', 'Access Role')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('branch_header', 'Branch')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('status_header', 'Status')}</th>
                    <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-left' : 'text-right'}`}>{t('actions_header', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {frozenUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-8 text-center text-sm text-muted-foreground">{t('search_results_empty', 'No frozen accounts match your filter.')}</td></tr>
                  ) : frozenUsers.map(user => (
                    <tr key={user.id} className="hover:bg-rose-500/5 transition-colors group opacity-80">
                      <td className="px-8 py-5">
                        <div className={`flex items-center gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                          <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {user.username[0]}
                          </div>
                          <div className={isAr ? 'text-right' : 'text-left'}>
                            <div className="font-bold text-foreground/70 group-hover:text-foreground transition-colors">{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider opacity-70 ${
                          user.role === 'owner' ? 'bg-primary text-primary-foreground border border-primary/30 shadow-sm' :
                          user.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                          user.role === 'doctor' ? 'bg-accent/10 text-accent border border-accent/20' :
                          user.role === 'cfo' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                          'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {user.role === 'owner' || user.role === 'admin' ? <Shield size={12} /> : user.role === 'doctor' ? <Stethoscope size={12} /> : <Users size={12} />}
                          {user.role === 'cfo' ? 'CFO' : t(`role_${user.role}`, user.role)}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {renderBranches(user)}
                      </td>
                      <td className="px-8 py-5">
                        <button
                          onClick={() => handleStatusToggle(user.id, 'frozen')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20">
                          <Snowflake size={10} />
                          {t('status_frozen', 'frozen')}
                        </button>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex gap-3 ${isAr ? 'justify-start' : 'justify-end'}`}>
                          {currentUser?.isRoot && (user.role === 'admin' || user.role === 'cfo') && user.username !== 'root' && (
                            <button 
                              onClick={() => {
                                setAssigningUser(user);
                                const ids = user.branch_ids
                                  ? user.branch_ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
                                  : [];
                                setAssignedBranches(ids);
                              }} 
                              className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer" 
                              title={t('assign_branches_tooltip', 'Assign Branches')}
                            >
                              <Building2 size={18} />
                            </button>
                          )}
                          <button onClick={() => setResettingUser(user)} className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer" title={t('reset_creds_tooltip', 'Reset Credentials')}>
                            <Key size={18} />
                          </button>
                          <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-2.5 bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer" title={t('revoke_access_tooltip', 'Revoke Access')}>
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
                <h3 className="text-foreground font-bold text-lg font-heading">{t('doctor_mgmt_title', 'Doctor Management')}</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  {t('doctor_mgmt_desc', 'Configure active practitioners and specialists. Frozen doctors will be excluded from signature options.')}
                </p>
              </div>
              <button 
                onClick={() => {
                  setEditingDoctor(null);
                  setDoctorFormData({ name: '', specialty: '', status: 'active' });
                  setIsAddingDoctor(!isAddingDoctor);
                }}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 shrink-0">
                {isAddingDoctor ? <><X size={18} /> {t('cancel', 'Cancel')}</> : <><UserPlus size={18} /> {t('add_doctor_btn', 'Add Doctor')}</>}
              </button>
            </div>

            {/* Doctor Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-muted-foreground`} size={16} />
              <input
                type="text"
                placeholder={t('search_doctors_placeholder', 'Search doctors by name or specialty...')}
                value={doctorSearch}
                onChange={e => setDoctorSearch(e.target.value)}
                className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
              />
            </div>
          </div>

          {/* Add / Edit Doctor Form */}
          {(isAddingDoctor || editingDoctor) && (
            <div className="bg-muted/10 border border-border rounded-3xl p-8 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Stethoscope size={16} className="text-primary animate-pulse" />
                  {editingDoctor ? `${t('modify_doctor_profile', 'Modify Doctor Profile:')} ${editingDoctor.name}` : t('add_new_doctor_profile', 'Add New Doctor Profile')}
                </h4>
                <button onClick={() => { setIsAddingDoctor(false); setEditingDoctor(null); }} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveDoctor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('doctor_name_lbl', 'Doctor Name')}</label>
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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('specialty_lbl', 'Specialty')}</label>
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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('profile_status_lbl', 'Profile Status')}</label>
                    <select
                      value={doctorFormData.status}
                      onChange={e => setDoctorFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-xs"
                    >
                      <option value="active">{t('status_active', 'active')}</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <ShieldCheck size={20} />
                    {editingDoctor ? t('update_doctor_profile', 'Update Doctor Profile') : t('register_doctor_profile', 'Register Doctor Profile')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Doctors List */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[750px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('doctor_name_lbl', 'Doctor Name')}</th>
                  <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('specialty_lbl', 'Specialty')}</th>
                  <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-right' : 'text-left'}`}>{t('status_header', 'Status')}</th>
                  <th className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${isAr ? 'text-left' : 'text-right'}`}>{t('actions_header', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {doctors
                  .filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || d.specialty.toLowerCase().includes(doctorSearch.toLowerCase()))
                  .map(doc => (
                    <tr key={doc.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className={`flex items-center gap-4 ${isAr ? 'flex-row-reverse' : ''}`}>
                          <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {doc.name[0] || 'D'}
                          </div>
                          <div className={`font-bold text-foreground group-hover:text-primary transition-colors ${isAr ? 'text-right' : 'text-left'}`}>{doc.name}</div>
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
                            <><Flame size={10} /> {t('status_active', 'active')}</>
                          ) : (
                            <><Snowflake size={10} /> {t('status_frozen', 'frozen')}</>
                          )}
                        </button>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex gap-3 ${isAr ? 'justify-start' : 'justify-end'}`}>
                          <button
                            onClick={() => {
                              setEditingDoctor(doc);
                              setDoctorFormData({ name: doc.name, specialty: doc.specialty, status: doc.status });
                              setIsAddingDoctor(false);
                            }}
                            className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
                            title={t('edit', 'Edit')}
                          >
                            <Edit2 size={18} className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doc)}
                            className="p-2.5 bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer"
                            title={t('delete', 'Delete')}
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
               <h3 className="text-2xl font-bold text-foreground font-heading italic">{t('credential_reset_title', 'Credential Reset')}</h3>
               <p className="text-sm text-muted-foreground font-medium">{t('reissuing_access_for', 'Re-issuing access for')} <strong>{resettingUser.username}</strong>.</p>
            </div>
            
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('new_secure_pwd', 'New Secure Password')}</label>
               <input 
                 type="password" 
                 placeholder={t('pwd_length_error', 'Min. 6 characters')}
                 className="w-full px-4 py-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
               />
            </div>

            <div className={`flex gap-3 pt-2 ${isAr ? 'flex-row-reverse' : ''}`}>
              <button 
                onClick={() => { setResettingUser(null); setNewPassword(''); }}
                className="flex-1 py-3 text-muted-foreground font-bold text-xs uppercase tracking-widest hover:bg-muted rounded-2xl transition-all cursor-pointer">
                {t('cancel', 'Cancel')}
              </button>
              <button 
                onClick={handleResetPassword}
                className="flex-1 py-4 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer">
                {t('update_creds_btn', 'Update Credentials')}
              </button>
            </div>
          </div>
        </div>
      )}

      {assigningUser && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
               <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-2">
                  <Building2 size={32} />
               </div>
               <h3 className="text-2xl font-bold text-foreground font-heading italic">{t('assign_branches_tooltip', 'Assign Branches')}</h3>
               <p className="text-sm text-muted-foreground font-medium">{t('config_branch_access_for', 'Configure branch access for')} <strong>{assigningUser.username}</strong> ({assigningUser.role}).</p>
            </div>
            
            <div className="space-y-3">
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">{t('select_branches_lbl', 'Select Branches')}</label>
               <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                 {branches.map(b => (
                   <label key={b.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/20 hover:bg-muted/50 transition-all cursor-pointer ${isAr ? 'flex-row-reverse' : ''}`}>
                     <input 
                       type="checkbox" 
                       checked={assignedBranches.includes(b.id)}
                       onChange={(e) => {
                         if (e.target.checked) {
                           setAssignedBranches([...assignedBranches, b.id]);
                         } else {
                           setAssignedBranches(assignedBranches.filter(id => id !== b.id));
                         }
                       }}
                       className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5"
                     />
                     <span className="text-sm font-bold text-foreground">{b.name}</span>
                   </label>
                 ))}
               </div>
            </div>

            <div className={`flex gap-3 pt-2 ${isAr ? 'flex-row-reverse' : ''}`}>
              <button 
                onClick={() => { setAssigningUser(null); setAssignedBranches([]); }}
                className="flex-1 py-3 text-muted-foreground font-bold text-xs uppercase tracking-widest hover:bg-muted rounded-2xl transition-all cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button 
                onClick={async () => {
                  if (assignedBranches.length === 0) {
                    alert(t('select_branches_lbl', 'Please assign at least one branch.'));
                    return;
                  }
                  if (window.api && (window.api as any).updateUserBranches) {
                    const res = await (window.api as any).updateUserBranches({
                      userId: assigningUser.id,
                      branchIds: assignedBranches.join(',')
                    });
                    if (res && res.success) {
                      alert(t('toast_request_approved', 'Branch assignments updated successfully!'));
                      setAssigningUser(null);
                      setAssignedBranches([]);
                      loadData();
                    } else {
                      alert(res?.error || t('toast_sys_error', 'Failed to update branches.'));
                    }
                  }
                }}
                className="flex-1 py-4 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                {t('save_changes_btn', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
