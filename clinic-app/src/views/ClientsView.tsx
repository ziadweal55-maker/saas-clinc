import { useState } from 'react';
import { Search, Users, UserPlus, X, Plus } from 'lucide-react';
import { Client, User } from '../types';

interface ClientsViewProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onClientAdded: () => void;
  currentUser: User | null;
}

export function ClientsView({ clients, onSelectClient, onClientAdded, currentUser: _currentUser }: ClientsViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '', age: '', medical_history: '', profile_type: 'physical_therapy', address: '', referral_source: '' });
  const [profileFilter, setProfileFilter] = useState<'all' | 'physical_therapy' | 'nutrition' | 'lymphatic'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' or 'disabled'
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const filteredClients = clients.filter(c => {
    const firstName = c.first_name || '';
    const lastName = c.last_name || '';
    const phone = c.phone || '';
    const matchesSearch = (firstName + ' ' + lastName).toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'active' ? (c.is_active === 1 || c.is_active === undefined) : c.is_active === 0;
    const matchesProfile = profileFilter === 'all' || (c.profile_types && c.profile_types.split(',').includes(profileFilter));
    return matchesSearch && matchesStatus && matchesProfile;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.id || 0) - (a.id || 0);
    } else {
      return (a.id || 0) - (b.id || 0);
    }
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.api && window.api.createClient) {
      const res = await window.api.createClient(formData);
      if (res.success) {
        setFormData({ first_name: '', last_name: '', phone: '', age: '', medical_history: '', profile_type: 'physical_therapy', address: '', referral_source: '' });
        setShowAddForm(false);
        onClientAdded();
        if ((window as any).showToast) {
          (window as any).showToast('Patient record created successfully!', 'success');
        }
      } else {
        if ((window as any).showToast) {
          (window as any).showToast('Error creating patient: ' + res.error, 'error');
        } else {
          alert('Error creating client: ' + res.error);
        }
      }
    }
  };



  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-heading tracking-tight italic">Patient Directory</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">Manage patient records and clinical history.</p>
        </div>
        
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className={`w-full md:w-auto ${showAddForm ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'} px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-95`}>
          {showAddForm ? <><X size={18} /> Cancel</> : <><UserPlus size={18} /> Add Patient</>}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card rounded-2xl border border-border shadow-xl p-6 md:p-8 mb-6 md:mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-foreground font-heading">New Patient Enrollment</h2>
          </div>
          
          <form onSubmit={handleCreateClient} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">First Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. John"
                  value={formData.first_name} 
                  onChange={e => setFormData({...formData, first_name: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Last Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Doe"
                  value={formData.last_name} 
                  onChange={e => setFormData({...formData, last_name: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Age</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="e.g. 25"
                  value={formData.age} 
                  onChange={e => setFormData({...formData, age: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 123 Main St, City"
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">How did you know us?</label>
                <input 
                  type="text" 
                  placeholder="e.g. Social Media, Referral, Friend"
                  value={formData.referral_source} 
                  onChange={e => setFormData({...formData, referral_source: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Primary Clinical Notes</label>
              <textarea 
                rows={4} 
                placeholder="Initial assessment or medical history summary..."
                value={formData.medical_history} 
                onChange={e => setFormData({...formData, medical_history: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Profile Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['physical_therapy', 'nutrition', 'lymphatic'] as const).map(type => {
                  const labels = { physical_therapy: 'Physical Therapy', nutrition: 'Nutrition', lymphatic: 'Lymphatic' };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, profile_type: type})}
                      className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                        formData.profile_type === type
                          ? type === 'physical_therapy' ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                            : type === 'nutrition' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                            : 'border-purple-500 bg-purple-500/10 text-purple-600'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                className="w-full md:w-auto bg-accent text-accent-foreground px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 active:scale-95">
                Register Patient Profile
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        {/* Profile Type Filter Tabs */}
        <div className="px-4 md:px-5 pt-4 md:pt-5 flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Patients', color: 'text-foreground' },
            { id: 'physical_therapy', label: 'Physical Therapy', color: 'text-blue-600' },
            { id: 'nutrition', label: 'Nutrition', color: 'text-emerald-600' },
            { id: 'lymphatic', label: 'Lymphatic', color: 'text-purple-600' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setProfileFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                profileFilter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 md:p-5 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/20">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search directory..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground font-medium"
            />
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Sort:</span>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="px-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-full md:w-auto"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-border shadow-inner w-full md:w-auto">
              <button 
                onClick={() => setStatusFilter('active')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === 'active' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}>
                Active
              </button>
              <button 
                onClick={() => setStatusFilter('disabled')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === 'disabled' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}>
                Archived
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredClients.length === 0 ? (
            <div className="p-12 md:p-20 text-center flex flex-col items-center">
              <div className="bg-muted p-6 md:p-8 rounded-full mb-6 text-muted-foreground">
                <Users size={40} />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 font-heading">No results matched</h3>
              <p className="text-muted-foreground max-w-xs mx-auto text-xs md:text-sm font-medium leading-relaxed px-4">
                {searchTerm ? `We couldn't find any patients matching "${searchTerm}".` : `The directory is currently empty.`}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <table className="w-full text-left hidden md:table">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Patient Details</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contact Information</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Reference ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedClients.map((c, i) => (
                    <tr key={c.id || i} onClick={() => onSelectClient(c)} className="hover:bg-primary/5 cursor-pointer transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {c.first_name?.[0]}{c.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">{c.first_name} {c.last_name}</div>
                            {c.is_active === 0 && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Archived</span>}
                            {c.profile_types && c.profile_types.split(',').map((type: string) => {
                              const colors = {
                                physical_therapy: 'bg-blue-100 text-blue-600',
                                nutrition: 'bg-emerald-100 text-emerald-600',
                                lymphatic: 'bg-purple-100 text-purple-600'
                              };
                              const labels = {
                                physical_therapy: 'PT',
                                nutrition: 'Nutrition',
                                lymphatic: 'Lymphatic'
                              };
                              return (
                                <span key={type} className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide mt-0.5 mr-1 inline-block ${colors[type as keyof typeof colors] || 'bg-muted text-foreground'}`}>
                                  {labels[type as keyof typeof labels] || type}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-foreground">{c.phone}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-0.5">Primary Contact</div>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <span className="font-mono text-xs text-muted-foreground font-bold px-2 py-1 bg-muted rounded-md group-hover:bg-primary/10 group-hover:text-primary transition-colors">#{c.id}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {sortedClients.map((c, i) => (
                  <div key={c.id || i} onClick={() => onSelectClient(c)} className="p-4 active:bg-primary/5 transition-colors group flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0 border border-primary/10">
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground text-base truncate">{c.first_name} {c.last_name}</div>
                        <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest truncate">{c.phone}</div>
                        {c.is_active === 0 && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase mt-1 inline-block tracking-tighter">Archived</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                        <Plus size={16} className="text-primary" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
