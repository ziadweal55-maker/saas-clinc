import { useState, useEffect } from 'react';
import { 
  Trash2, 
  Clock, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Stethoscope,
  User as UserIcon,
  CalendarDays,
  Search,
  MessageSquare
} from 'lucide-react';
import { Client, User, Doctor } from '../types';
import { generateWhatsAppLink, DEFAULT_WHATSAPP_TEMPLATE, DEFAULT_WHATSAPP_REVIEW_TEMPLATE } from '../utils/whatsapp';
import { useLanguage } from '../hooks/useLanguage';

interface CalendarViewProps {
  clients: Client[];
  currentUser: User | null;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 10); // 10 AM to 10 PM (22:00)

export function CalendarView({ clients, currentUser }: CalendarViewProps) {
  const { t, isAr } = useLanguage();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
  const [formData, setFormData] = useState({ 
    client_id: '', 
    doctor_id: '',
    appointment_date: '', 
    status: 'Scheduled',
    session_type: ''
  });
  const [completingAppointment, setCompletingAppointment] = useState<any | null>(null);
  const [completionNotes, setCompletionNotes] = useState({ treatment_notes: '', progress_notes: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  const loadData = async () => {
    if (window.api) {
      // If user is a doctor, only load their own appointments
      const doctorIdFilter = currentUser?.role === 'doctor' ? currentUser.doctor_id : undefined;
      const res = await (window.api as any).getAppointments(doctorIdFilter);
      setAppointments(res || []);

      const docData = await (window.api as any).getActiveDoctors();
      setDoctors(docData || []);
    }
  };

  useEffect(() => { loadData(); }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;

    if (!formData.client_id) {
      if ((window as any).showToast) {
        (window as any).showToast(t('toast_select_patient'), 'error');
      } else {
        alert(t('toast_select_patient'));
      }
      return;
    }

    const finalDoctorId = currentUser?.role === 'doctor' ? currentUser.doctor_id : parseInt(formData.doctor_id);
    if (!finalDoctorId) {
      if ((window as any).showToast) {
        (window as any).showToast(t('toast_select_doctor'), 'error');
      } else {
        alert(t('toast_select_doctor'));
      }
      return;
    }
    
    // Use local time parsing for hour comparison
    const selectedDateObj = new Date(formData.appointment_date);
    const selectedHour = selectedDateObj.getHours();
    
    // Conflict Checks
    const sameHourAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate.toLocaleDateString() === selectedDateObj.toLocaleDateString() && 
             aptDate.getHours() === selectedHour;
    });

    const sameDoctorInHour = sameHourAppointments.find(apt => apt.doctor_id === finalDoctorId && apt.id !== editingAppointment?.id);
    const capacityReached = sameHourAppointments.length >= 3;

    if (sameDoctorInHour) {
      if (!window.confirm(t('conflict_doctor_assign').replace('{name}', doctors.find(d => d.id === finalDoctorId)?.name || ''))) {
        return;
      }
    } else if (capacityReached) {
      if (!window.confirm(t('conflict_capacity_reached').replace('{count}', sameHourAppointments.length.toString()))) {
        return;
      }
    }

    const dataToSave = {
      ...formData,
      client_id: parseInt(formData.client_id),
      doctor_id: finalDoctorId
    };

    try {
      let res;
      if (editingAppointment) {
        // Intercept 'Completed' to open the notes modal
        if (dataToSave.status === 'Completed') {
          setShowAdd(false);
          setCompletionNotes({ treatment_notes: '', progress_notes: '' });
          setCompletingAppointment({
            ...editingAppointment,
            appointment_date: dataToSave.appointment_date,
            doctor_id: dataToSave.doctor_id,
            session_type: dataToSave.session_type
          });
          return;
        }
        res = await (window.api as any).updateAppointment({ 
          id: editingAppointment.id, 
          appointment_date: dataToSave.appointment_date, 
          status: dataToSave.status,
          doctor_id: dataToSave.doctor_id,
          session_type: dataToSave.session_type
        });
      } else {
        res = await (window.api as any).createAppointment(dataToSave);
      }

      if (res && res.success === false) {
        if ((window as any).showToast) {
          (window as any).showToast(`${t('toast_sys_error')}${res.error || ''}`, 'error');
        } else {
          alert(`${t('toast_sys_error')}${res.error || ''}`);
        }
        return;
      }

      if ((window as any).showToast) {
        (window as any).showToast(t('toast_apt_saved'), 'success');
      }

      setShowAdd(false);
      setEditingAppointment(null);
      setFormData({ client_id: '', doctor_id: '', appointment_date: '', status: 'Scheduled', session_type: '' });
      setClientSearch('');
      setDoctorSearch('');
      setShowClientDropdown(false);
      setShowDoctorDropdown(false);
      loadData();
    } catch (err: any) {
      if ((window as any).showToast) {
        (window as any).showToast(`${t('toast_sys_error')}${err.message}`, 'error');
      } else {
        alert(`${t('toast_sys_error')}${err.message}`);
      }
    }
  };

  const handleWhatsApp = (apt: any, type: 'reminder' | 'review' = 'reminder') => {
    const savedTemplate = type === 'review'
      ? (localStorage.getItem('whatsapp_review_template') || DEFAULT_WHATSAPP_REVIEW_TEMPLATE)
      : (localStorage.getItem('whatsapp_template') || DEFAULT_WHATSAPP_TEMPLATE);
    
    // Format date for Egyptian standard (DD/MM/YYYY)
    let formattedDate = '';
    try {
      const d = new Date(apt.appointment_date);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }
    } catch (e) {
      formattedDate = apt.appointment_date.split(' ')[0] || '';
    }

    // Format time: extract HH:MM
    let formattedTime = '';
    try {
      const parts = apt.appointment_date.split(' ');
      if (parts.length >= 2) {
        formattedTime = parts[1].substring(0, 5);
      } else {
        const d = new Date(apt.appointment_date);
        formattedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    } catch (e) {
      // fallback
    }

    const doctorObj = doctors.find(d => d.id === apt.doctor_id);
    const doctorName = doctorObj ? doctorObj.name : (apt.doctor_name || 'العيادة');

    const link = generateWhatsAppLink(savedTemplate, {
      patientName: `${apt.client_first_name || ''} ${apt.client_last_name || ''}`,
      phone: apt.client_phone || '',
      date: formattedDate || apt.appointment_date,
      time: formattedTime || 'الموعد المحدد',
      doctorName: doctorName,
      branchName: apt.branch_id === 2 ? 'El Monofaya Branch' : 'Banha Branch',
    });
    window.open(link, '_blank');
  };

  const handleEdit = (apt: any) => {
    if (currentUser?.role === 'doctor') return;
    setEditingAppointment(apt);
    setFormData({ 
      client_id: apt.client_id.toString(), 
      doctor_id: apt.doctor_id ? apt.doctor_id.toString() : '',
      appointment_date: apt.appointment_date.substring(0, 16), 
      status: apt.status,
      session_type: apt.session_type || ''
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    if (currentUser?.role === 'doctor') return;
    if (confirm(t('delete_apt_confirm'))) {
      await (window.api as any).deleteAppointment(id);
      loadData();
    }
  };

  const getAppointmentsForHour = (hour: number) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      const isSameDate = apt.appointment_date.startsWith(selectedDate);
      if (!isSameDate || aptDate.getHours() !== hour) return false;

      const clientName = `${apt.client_first_name || ''} ${apt.client_last_name || ''}`;
      const doctorName = apt.doctor_name || '';
      const sessionType = apt.session_type || '';
      const status = apt.status || '';
      
      return (
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sessionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const canModify = currentUser?.role !== 'doctor' && currentUser?.role !== 'cfo';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg md:rounded-xl text-primary shrink-0">
              <CalendarDays size={24} />
            </div>
            {t('clinical_schedule')}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1 font-medium italic">{t('manage_appointments')}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="relative w-full sm:w-64">
            <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-muted-foreground`} size={16} />
            <input 
              type="text" 
              placeholder={t('search_schedule')} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs placeholder:text-muted-foreground/50`}
            />
          </div>

          <div className="flex items-center justify-between bg-card p-1 rounded-xl md:rounded-2xl border border-border shadow-sm">
            <button 
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-secondary rounded-lg md:rounded-xl transition-all">
              {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-foreground text-sm md:text-base cursor-pointer px-2"
            />
            <button 
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-secondary rounded-lg md:rounded-xl transition-all">
              {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {canModify && (
            <button 
              onClick={() => {
                setEditingAppointment(null);
                setFormData({ 
                  client_id: '', 
                  doctor_id: '', 
                  appointment_date: `${selectedDate}T09:00`, 
                  status: 'Scheduled',
                  session_type: ''
                });
                setShowAdd(true);
              }}
              className="bg-primary text-primary-foreground px-5 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
              <Plus size={18} /> {t('new_session')}
            </button>
          )}
        </div>
      </div>

      {/* Hour Block Grid */}
      <div className="bg-card rounded-2xl md:rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 md:p-4 bg-muted/30 border-b border-border text-center font-black text-xs md:text-sm tracking-widest uppercase">
          {new Date(selectedDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        
        <div className="divide-y divide-border">
          {HOURS.map(hour => {
            const apts = getAppointmentsForHour(hour);
            const timeLabel = isAr 
              ? (hour === 12 ? '12 مساءً' : hour > 12 ? `${hour - 12} مساءً` : `${hour} صباحاً`)
              : (hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`);
            
            return (
              <div 
                key={hour} 
                onClick={() => {
                  if (canModify) {
                    setEditingAppointment(null);
                    setFormData({ 
                      client_id: '', 
                      doctor_id: '', 
                      appointment_date: `${selectedDate}T${hour.toString().padStart(2, '0')}:00`, 
                      status: 'Scheduled',
                      session_type: ''
                    });
                    setShowAdd(true);
                  }
                }}
                className={`flex min-h-[100px] md:min-h-[120px] group transition-colors ${
                  canModify ? 'cursor-pointer hover:bg-primary/[0.03]' : 'hover:bg-muted/10'
                }`}
              >
                <div className={`w-16 md:w-24 p-2 md:p-4 ${isAr ? 'border-l' : 'border-r'} border-border flex flex-col items-center justify-start text-muted-foreground font-black text-[10px] md:text-xs pt-4 md:pt-6 shrink-0`}>
                  <Clock size={12} className="mb-1" />
                  {timeLabel}
                </div>
                <div className="flex-1 p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {apts.map(apt => (
                    <div 
                      key={apt.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(apt);
                      }}
                      className="bg-background border border-border p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group/card relative overflow-hidden">
                      <div className={`absolute top-0 ${isAr ? 'right-0' : 'left-0'} w-1 h-full ${apt.status === 'Completed' ? 'bg-emerald-500' : apt.status === 'Cancelled' ? 'bg-rose-500' : 'bg-primary'}`} />
                      
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tighter px-1.5 md:px-2 py-0.5 rounded-md md:rounded-lg ${apt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : apt.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                          {apt.status}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {apt.client_phone && (
                            apt.status === 'Completed' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsApp(apt, 'review');
                                }}
                                className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-all"
                                title="Send WhatsApp Review"
                              >
                                <MessageSquare size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsApp(apt, 'reminder');
                                }}
                                className="p-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-all"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageSquare size={14} />
                              </button>
                            )
                          )}
                          {canModify && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                              className="p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all md:opacity-0 md:group-hover/card:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-black text-xs md:text-sm text-foreground flex items-center gap-2 truncate">
                          <UserIcon size={12} className="text-primary shrink-0" />
                          {apt.client_first_name} {apt.client_last_name}
                        </p>
                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground flex items-center gap-2 truncate">
                          <Stethoscope size={12} className="text-primary shrink-0" />
                          {t('doctor_label')} {apt.doctor_name || t('unassigned')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {apts.length === 0 && (
                    <div className="md:col-span-3 flex items-center justify-center text-muted-foreground/20 group-hover:text-primary/60 transition-colors font-black text-[10px] md:text-xs uppercase tracking-[0.2em] italic py-4 md:py-0">
                      {canModify ? t('click_to_schedule').replace('{time}', timeLabel) : t('no_sessions')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl md:rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-primary/5 shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <Clock className="text-primary" size={20} />
                  {editingAppointment ? t('edit_session') : t('new_session')}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAdd(false);
                  setClientSearch('');
                  setDoctorSearch('');
                  setShowClientDropdown(false);
                  setShowDoctorDropdown(false);
                }}
                className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2 relative">
                  <label className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('patients')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowClientDropdown(!showClientDropdown);
                        setShowDoctorDropdown(false);
                      }}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-start flex justify-between items-center transition-all font-bold text-sm"
                    >
                      <span className="truncate">
                        {formData.client_id
                          ? (() => {
                              const selectedClient = clients.find(c => c.id.toString() === formData.client_id.toString());
                              return selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : t('select_patient_prompt');
                            })()
                          : t('select_patient_prompt')}
                      </span>
                      <span className="text-muted-foreground text-[10px] ms-2 shrink-0">▼</span>
                    </button>

                    {showClientDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowClientDropdown(false)} />
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl p-2 space-y-2 max-h-60 flex flex-col">
                          <div className="relative shrink-0">
                            <Search className={`absolute ${isAr ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-muted-foreground`} size={14} />
                            <input
                              type="text"
                              placeholder={t('search_patient')}
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className={`w-full ${isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none`}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto divide-y divide-border/30 max-h-40">
                            {(() => {
                              const filtered = clients.filter(c => 
                                `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(clientSearch.toLowerCase())
                              );
                              if (filtered.length === 0) {
                                return <div className="p-2 text-center text-xs text-muted-foreground font-medium">{t('no_patients_found')}</div>;
                              }
                              return filtered.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, client_id: c.id.toString() });
                                    setShowClientDropdown(false);
                                    setClientSearch('');
                                  }}
                                  className="w-full text-start px-3 py-2 text-xs font-bold text-foreground hover:bg-primary/10 rounded-lg transition-colors truncate"
                                >
                                  {c.first_name} {c.last_name}
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('doctor_label').replace(':', '')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={currentUser?.role === 'doctor'}
                      onClick={() => {
                        setShowDoctorDropdown(!showDoctorDropdown);
                        setShowClientDropdown(false);
                      }}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-start flex justify-between items-center transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="truncate">
                        {currentUser?.role === 'doctor'
                          ? `Dr. ${doctors.find(d => d.id === currentUser.doctor_id)?.name || currentUser.username}`
                          : formData.doctor_id
                          ? `Dr. ${doctors.find(d => d.id.toString() === formData.doctor_id.toString())?.name || t('select_doctor_prompt')}`
                          : t('select_doctor_prompt')}
                      </span>
                      {currentUser?.role !== 'doctor' && <span className="text-muted-foreground text-[10px] ms-2 shrink-0">▼</span>}
                    </button>

                    {showDoctorDropdown && currentUser?.role !== 'doctor' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDoctorDropdown(false)} />
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl p-2 space-y-2 max-h-60 flex flex-col">
                          <div className="relative shrink-0">
                            <Search className={`absolute ${isAr ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-muted-foreground`} size={14} />
                            <input
                              type="text"
                              placeholder={t('search_doctor')}
                              value={doctorSearch}
                              onChange={(e) => setDoctorSearch(e.target.value)}
                              className={`w-full ${isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none`}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto divide-y divide-border/30 max-h-40">
                            {(() => {
                              const filtered = doctors.filter(d => 
                                (d.name || '').toLowerCase().includes(doctorSearch.toLowerCase()) || 
                                (d.specialty || '').toLowerCase().includes(doctorSearch.toLowerCase())
                              );
                              if (filtered.length === 0) {
                                return <div className="p-2 text-center text-xs text-muted-foreground font-medium">{t('no_doctors_found')}</div>;
                              }
                              return filtered.map(d => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, doctor_id: d.id.toString() });
                                    setShowDoctorDropdown(false);
                                    setDoctorSearch('');
                                  }}
                                  className="w-full text-start px-3 py-2 text-xs font-bold text-foreground hover:bg-primary/10 rounded-lg transition-colors truncate"
                                >
                                  Dr. {d.name} ({d.specialty})
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('date_time')}</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('status')}</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm">
                    <option value="Scheduled">{t('scheduled')}</option>
                    <option value="Completed">{isAr ? 'مكتمل' : 'Completed'}</option>
                    <option value="Cancelled">{isAr ? 'ملغي' : 'Cancelled'}</option>
                    <option value="No Show">{isAr ? 'لم يحضر' : 'No Show'}</option>
                  </select>
                </div>

                <div className="space-y-2 col-span-1 sm:col-span-2">
                  <label className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('session_type', 'Session Type')}</label>
                  <select 
                    required
                    value={formData.session_type}
                    onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-foreground">
                    <option value="">{t('select_session_type')}</option>
                    <option value="Physical Therapy">{t('physical_therapy')}</option>
                    <option value="Nutrition">{t('nutrition')}</option>
                    <option value="Lymphatic">{t('lymphatic')}</option>
                    <option value="Other">{t('other')}</option>
                  </select>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-primary/5 rounded-xl md:rounded-2xl border border-primary/10 flex items-start gap-2 md:gap-3">
                <AlertCircle className="text-primary shrink-0" size={16} />
                <p className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-wider leading-relaxed">
                  {t('avail_check_notice')}
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 uppercase tracking-[0.2em]">
                {editingAppointment ? t('update') : t('confirm')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Completion Notes Modal */}
      {completingAppointment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg">{t('mark_session_completed')}</h3>
              <button onClick={() => setCompletingAppointment(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-all">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'المريض:' : 'Patient:'} <span className="font-bold text-foreground">{completingAppointment.client_first_name} {completingAppointment.client_last_name}</span>
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('treatment_notes_optional')}</label>
                <textarea
                  rows={3}
                  value={completionNotes.treatment_notes}
                  onChange={e => setCompletionNotes(prev => ({ ...prev, treatment_notes: e.target.value }))}
                  placeholder={t('desc_today_treatment')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('progress_notes_optional')}</label>
                <textarea
                  rows={2}
                  value={completionNotes.progress_notes}
                  onChange={e => setCompletionNotes(prev => ({ ...prev, progress_notes: e.target.value }))}
                  placeholder={t('patient_progress_obs')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  if (window.api) {
                    await (window.api as any).updateAppointment({
                      id: completingAppointment.id,
                      appointment_date: completingAppointment.appointment_date,
                      status: 'Completed',
                      completed_by_staff_id: currentUser?.id || null,
                      treatment_notes: completionNotes.treatment_notes,
                      progress_notes: completionNotes.progress_notes,
                      doctor_id: completingAppointment.doctor_id,
                      session_type: completingAppointment.session_type
                    });
                    // Trigger WhatsApp Review after updating to Completed
                    if (completingAppointment.client_phone) {
                      handleWhatsApp(completingAppointment, 'review');
                    }
                    setCompletingAppointment(null);
                    setEditingAppointment(null);
                    setCompletionNotes({ treatment_notes: '', progress_notes: '' });
                    loadData();
                  }
                }}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> {t('confirm_complete')}
              </button>
              <button
                onClick={() => setCompletingAppointment(null)}
                className="px-4 py-3 bg-muted text-foreground border border-border rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-muted/80 transition-all"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}