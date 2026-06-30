import { useState, useEffect } from 'react';
import { Plus, Clock, ShieldCheck, Database, FileSpreadsheet, Dumbbell, History, Sparkles, Share2, Network, FlaskConical, Building2, MessageSquare } from 'lucide-react';
import { AssessmentAdmin } from '../components/BioMetrics';
import { ExerciseAdmin } from '../components/Exercises';
import { UserManagement } from '../components/UserManagement';
import { InvestigationAdmin } from '../components/InvestigationAdmin';
import { BranchManagement } from '../components/BranchManagement';
import { DEFAULT_WHATSAPP_TEMPLATE, DEFAULT_WHATSAPP_REVIEW_TEMPLATE } from '../utils/whatsapp';
import { useTenant } from '../hooks/useTenant';
import { useLanguage } from '../hooks/useLanguage';

interface SettingsViewProps {
  currentUser: {
    id: number;
    username: string;
    role: string;
    doctor_id?: number;
  };
}

export function SettingsView({ currentUser }: SettingsViewProps) {
  const { tenantSettings } = useTenant();
  const { t } = useLanguage();
  const isFeatureEnabled = (key: string) => {
    if (!tenantSettings || !tenantSettings.features) return true;
    return !!(tenantSettings.features as Record<string, boolean>)[key];
  };

  const showAssessment = isFeatureEnabled('assessments');
  const showExercises = isFeatureEnabled('exercises');
  const showInvestigations = isFeatureEnabled('investigations');
  const showUsers = isFeatureEnabled('users');
  const showBranches = isFeatureEnabled('branches');

  const [activeSubTab, setActiveSubTab] = useState('backup');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [currentDbPath, setCurrentDbPath] = useState<string>('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [whatsappReviewTemplate, setWhatsappReviewTemplate] = useState('');

  console.log('Settings viewed by:', currentUser.username);

  useEffect(() => {
    if (window.api?.getDbPath) {
      window.api.getDbPath().then(path => setCurrentDbPath(path));
    }
    setWhatsappTemplate(localStorage.getItem('whatsapp_template') || DEFAULT_WHATSAPP_TEMPLATE);
    setWhatsappReviewTemplate(localStorage.getItem('whatsapp_review_template') || DEFAULT_WHATSAPP_REVIEW_TEMPLATE);
  }, []);

  const handleBackup = async () => {
    if (window.api?.exportBackup) {
      const res = await window.api.exportBackup();
      if (res.success) alert(`Backup saved to: ${res.path}`);
    }
  };

  const handleSelectNetworkDb = async () => {
    if (window.api?.selectDbPath) {
      await window.api.selectDbPath();
      // App will relaunch on success via main process
    }
  };

  const handleReset = async () => {
    if (confirm('This will clear the current dashboard totals and start a new period. All history is preserved. Proceed?')) {
      if (window.api?.resetDashboard) {
        const res = await window.api.resetDashboard();
        if (res.success) {
          setResetStatus(`Dashboard reset successful. New period started: ${new Date(res.resetDate).toLocaleString()}`);
        }
      }
    }
  };

  const handleSaveTemplate = () => {
    localStorage.setItem('whatsapp_template', whatsappTemplate);
    localStorage.setItem('whatsapp_review_template', whatsappReviewTemplate);
    alert(t('templates_saved_success', 'Templates saved successfully!'));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-heading tracking-tight">{t('system_settings')}</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">{t('settings_subtitle')}</p>
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl flex flex-col min-h-[600px]">
        <div className="flex flex-wrap border-b border-border bg-muted/30 p-1">
          <button 
            onClick={() => setActiveSubTab('backup')}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeSubTab === 'backup' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'} cursor-pointer`}>
            <Database size={16} /> {t('db_backup')}
          </button>
          <button 
            onClick={() => setActiveSubTab('whatsapp')}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeSubTab === 'whatsapp' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'} cursor-pointer`}>
            <MessageSquare size={16} /> {t('whatsapp_templates')}
          </button>
          {showAssessment && (
            <button 
              onClick={() => setActiveSubTab('assessment')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeSubTab === 'assessment' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'} cursor-pointer`}>
              <FileSpreadsheet size={16} /> {t('clinic_assessment')}
            </button>
          )}
          {showExercises && (
            <button 
              onClick={() => setActiveSubTab('exercises')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeSubTab === 'exercises' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'} cursor-pointer`}>
              <Dumbbell size={16} /> {t('exercise_library')}
            </button>
          )}
          {showInvestigations && (
            <button 
              onClick={() => setActiveSubTab('investigations')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeSubTab === 'investigations' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'} cursor-pointer`}>
              <FlaskConical size={16} /> {t('investigation_library')}
            </button>
          )}
          {showUsers && (
            <button 
              onClick={() => setActiveSubTab('users')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeSubTab === 'users' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'} cursor-pointer`}>
              <Plus size={16} /> {t('team_management')}
            </button>
          )}
          {showBranches && (
            <button 
              onClick={() => setActiveSubTab('branches')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeSubTab === 'branches' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'} cursor-pointer`}>
              <Building2 size={16} /> {t('branches')}
            </button>
          )}
        </div>

        <div className="p-10 flex-1">
          {activeSubTab === 'backup' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div className="bg-muted/20 p-8 rounded-3xl border border-border space-y-6 group hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                      <Database size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-foreground font-heading">Data Persistence</h3>
                </div>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Generate a full encrypted export of the local SQLite database. This includes all patient records, clinical history, and system configurations.
                </p>
                <button onClick={handleBackup} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer">
                   <Plus size={20} /> Export Local Backup
                </button>
              </div>

              <div className="bg-muted/20 p-8 rounded-3xl border border-border space-y-6 group hover:border-accent/20 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                      <Network size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-foreground font-heading">Network Database</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    Configure a shared database path across your network. This allows multiple workstations to access and update the same clinical data simultaneously.
                  </p>
                  <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Active Database Location:</p>
                    <p className="text-[11px] font-mono break-all text-primary/80">{currentDbPath || 'Loading path...'}</p>
                  </div>
                </div>
                <button onClick={handleSelectNetworkDb} className="w-full py-4 bg-accent/10 text-accent border-2 border-accent/20 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-accent/20 transition-all flex items-center justify-center gap-3 cursor-pointer">
                   <Share2 size={20} /> Select Shared Database
                </button>
              </div>

              <div className="bg-muted/20 p-8 rounded-3xl border border-border space-y-6 group hover:border-accent/20 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                      <History size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-foreground font-heading">Financial Period</h3>
                </div>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Reset the current dashboard revenue tracking. This will start a new fiscal period or month. Existing clinical records remain untouched.
                </p>
                <button onClick={handleReset} className="w-full py-4 bg-accent/10 text-accent border-2 border-accent/20 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-accent/20 transition-all flex items-center justify-center gap-3 cursor-pointer">
                   <Clock size={20} /> Reset Analysis Period
                </button>
                {resetStatus && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-accent/5 rounded-xl border border-accent/10">
                    <Sparkles size={14} className="text-accent" />
                    <p className="text-[10px] font-bold text-accent uppercase tracking-wider text-center">{resetStatus}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'whatsapp' && (
            <div className="max-w-2xl space-y-6 animate-in fade-in duration-300">
              <div className="bg-muted/20 p-8 rounded-3xl border border-border space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground font-heading">{t('whatsapp_reminder')}</h3>
                    <p className="text-xs text-muted-foreground">{t('whatsapp_reminder_desc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('template_text')}</label>
                    <textarea
                      value={whatsappTemplate}
                      onChange={(e) => setWhatsappTemplate(e.target.value)}
                      rows={4}
                      className="w-full p-4 text-xs font-semibold rounded-2xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground leading-relaxed"
                    />
                  </div>
                </div>

                <div className="border-t border-border/50 pt-6 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground font-heading">{t('whatsapp_review')}</h3>
                    <p className="text-xs text-muted-foreground">{t('whatsapp_review_desc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('template_text')}</label>
                    <textarea
                      value={whatsappReviewTemplate}
                      onChange={(e) => setWhatsappReviewTemplate(e.target.value)}
                      rows={4}
                      className="w-full p-4 text-xs font-semibold rounded-2xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground leading-relaxed"
                    />
                  </div>

                  <div className="p-4 bg-background/50 rounded-2xl border border-border/50 text-[11px] font-semibold text-muted-foreground space-y-2">
                    <p className="font-bold uppercase text-foreground tracking-wider text-[9px] text-primary">{t('dynamic_tokens')}</p>
                    <p>{t('dynamic_tokens_desc')}</p>
                    <ul className="list-disc pl-4 space-y-1 text-foreground/80">
                      <li><code className="text-primary font-mono font-bold bg-muted px-1.5 py-0.5 rounded">[PatientName]</code> &mdash; Full name of the patient</li>
                      <li><code className="text-primary font-mono font-bold bg-muted px-1.5 py-0.5 rounded">[Date]</code> &mdash; Date of the appointment (DD/MM/YYYY)</li>
                      <li><code className="text-primary font-mono font-bold bg-muted px-1.5 py-0.5 rounded">[Time]</code> &mdash; Appointment start time (HH:MM)</li>
                      <li><code className="text-primary font-mono font-bold bg-muted px-1.5 py-0.5 rounded">[DoctorName]</code> &mdash; Doctor assigned to the appointment</li>
                      <li><code className="text-primary font-mono font-bold bg-muted px-1.5 py-0.5 rounded">[BranchName]</code> &mdash; Active branch name</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleSaveTemplate}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {t('save_templates')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="animate-in fade-in duration-300">
            {activeSubTab === 'assessment' && showAssessment && <AssessmentAdmin />}
            {activeSubTab === 'exercises' && showExercises && <ExerciseAdmin />}
            {activeSubTab === 'investigations' && showInvestigations && <InvestigationAdmin />}
            {activeSubTab === 'users' && showUsers && <UserManagement />}
            {activeSubTab === 'branches' && showBranches && <BranchManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
