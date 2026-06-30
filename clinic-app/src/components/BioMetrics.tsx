import { useState, useEffect } from 'react';
import { Plus, Trash2, Activity, FileText, ClipboardList, FileSpreadsheet, Download, Upload, Edit2, Save, X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { User } from '../types';

interface AssessmentTabProps {
  clientId: number;
  readOnly?: boolean;
  currentUser?: User | null;
}

export function AssessmentTab({ clientId, readOnly, currentUser: _currentUser }: AssessmentTabProps) {
  const { t, isAr } = useLanguage();
  const [structure, setStructure] = useState<{ regions: any[], tests: any[] }>({ regions: [], tests: [] });
  const [results, setResults] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRegionId] = useState<number | null>(null);
  const [regionSearch, setRegionSearch] = useState('');
  const [showInReport, setShowInReport] = useState(true); // Default to showing summary if results exist

  const loadData = async () => {
    if (window.api) {
      const struct = await window.api.getAssessmentStructure();
      const res = await window.api.getClientAssessmentResults(clientId);
      setStructure(struct);
      
      const resMap: Record<number, string> = {};
      // Important: Map existing results, but anything not in res is considered 'Negative' by default in the UI
      res.forEach((r: any) => { resMap[r.test_id] = r.result; });
      setResults(resMap);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const handleSaveResult = async (testId: number, resultValue: string) => {
    if (readOnly) return;
    if (window.api) {
      setResults(prev => ({ ...prev, [testId]: resultValue }));
      await window.api.saveAssessmentResult({ clientId, testId, result: resultValue });
    }
  };

  const positiveFindings = structure.tests.filter(t => results[t.id] === 'Positive');

  if (loading) return <div className="text-center py-20 animate-pulse text-primary font-bold uppercase tracking-widest text-xs">{t('syncing_biometrics', 'Syncing Bio-Metric Data...')}</div>;

  const headerTitle = selectedRegionId 
    ? (structure.regions.find(r => r.id === selectedRegionId)?.name || '') 
    : 'Full Body Scanning Protocol';

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row gap-6">

        <div className="w-full space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
             <h3 className="text-sm font-black text-blue-300 uppercase tracking-widest leading-none italic">
               {headerTitle === 'Full Body Scanning Protocol' 
                 ? t('full_body_scanning_protocol', 'Full Body Scanning Protocol') 
                 : t(headerTitle.toLowerCase(), headerTitle)}
             </h3>
             <div className="flex flex-wrap gap-2 text-xs font-bold no-print w-full sm:w-auto">
                <button 
                  onClick={() => setShowInReport(!showInReport)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg transition-all shadow-md ${showInReport ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  {showInReport ? t('report_auto_gen', 'Report Auto-Gen') : t('report_disabled', 'Report Disabled')}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 bg-blue-950 text-white rounded-lg hover:bg-black transition-all shadow-md uppercase text-[10px] tracking-widest">
                  <FileText size={14} /> {t('export_report', 'Export Report')}
                </button>
                 <span className="text-primary bg-primary/10 px-2 py-1 rounded font-black text-[9px] uppercase tracking-wider border border-primary/10 text-center shrink-0">
                   {t('findings_lbl', 'Findings:')} {positiveFindings.length}
                 </span>
              </div>
          </div>

          <div className="relative w-full no-print">
            <input 
              type="text" 
              placeholder={t('search_body_region_placeholder', 'Search by Body Region (e.g. Shoulder, Knee, Back)...')} 
              value={regionSearch}
              onChange={e => setRegionSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs" 
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {(selectedRegionId 
              ? structure.regions.filter(r => r.id === selectedRegionId) 
              : structure.regions.filter(r => r.name.toLowerCase().includes(regionSearch.toLowerCase()))
            ).map(region => (
              <div key={region.id} className="space-y-4">
                <div className="flex items-center gap-3 px-2 mt-4">
                  <div className="h-px flex-1 bg-border italic"></div>
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                    {isAr 
                      ? `${t('assessment_suffix', 'Assessment')} ${t(region.name.toLowerCase(), region.name)}` 
                      : `${t(region.name.toLowerCase(), region.name)} ${t('assessment_suffix', 'Assessment')}`}
                  </h4>
                  <div className="h-px flex-1 bg-border italic"></div>
                </div>
                {structure.tests.filter(t => t.region_id === region.id).map(test => {
                  const currentResult = results[test.id] || 'Negative';
                  return (
                    <div key={test.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border rounded-2xl gap-4 transition-all group relative overflow-hidden ${currentResult === 'Positive' ? 'bg-primary/5 border-primary/30 shadow-inner' : 'bg-card border-border hover:border-primary/20'}`}>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`p-1.5 rounded-full transition-all shrink-0 ${currentResult === 'Positive' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                           <Activity size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className={`font-black text-sm uppercase tracking-tight italic transition-colors truncate ${currentResult === 'Positive' ? 'text-primary' : 'text-foreground'}`}>
                             {t(test.name.toLowerCase(), test.name)}
                           </p>
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                           <button 
                            onClick={() => handleSaveResult(test.id, 'Positive')}
                            title={t('positive_finding_title', 'Positive Finding')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${currentResult === 'Positive' ? 'bg-primary border-primary text-primary-foreground shadow-xl' : 'border-border text-muted-foreground hover:bg-muted hover:text-primary'}`}>
                            {t('positive_finding_btn', 'Positive')}
                          </button>
                          <button 
                            onClick={() => handleSaveResult(test.id, 'Negative')}
                            title={t('negative_cleared_title', 'Negative / Cleared')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${currentResult === 'Negative' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl' : 'border-border text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600'}`}>
                            {t('negative_cleared_btn', 'Negative')}
                          </button>
                        </div>
                      )}
                      {readOnly && (
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                           <span className={`px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest ${currentResult === 'Positive' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                              {currentResult === 'Positive' ? t('positive_finding_title', 'Positive') : t('negative_cleared_title', 'Negative')}
                           </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showInReport && positiveFindings.length > 0 && (
        <div className="mt-12 bg-white p-10 rounded-[2.5rem] border-2 border-primary/20 shadow-2xl printable-area relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Activity size={120} className="text-primary" />
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-primary p-3 rounded-2xl text-primary-foreground shadow-xl shadow-primary/20">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground leading-tight uppercase italic tracking-tighter">{t('clinical_positive_findings_hdr', 'Clinical Positive Findings')}</h3>
              <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">{t('biometric_assessment_report_sub', 'Bio-Metric Assessment Report')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {positiveFindings.map(test => {
              const region = structure.regions.find(r => r.id === test.region_id);
              return (
                <div key={test.id} className="flex flex-col p-6 bg-muted/30 rounded-2xl border border-border relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-primary shadow-[2px_0_10px_rgba(var(--primary),0.2)]"></div>
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2 italic opacity-70">
                    {region ? t(region.name.toLowerCase(), region.name) : t('protocol_lbl', 'Protocol')}
                  </span>
                  <span className="text-sm font-black text-foreground uppercase tracking-tight">
                    {t(test.name.toLowerCase(), test.name)}
                  </span>
                  <div className="mt-4 flex items-center gap-2">
                     <span className="text-[8px] font-black bg-primary text-primary-foreground px-2 py-1 rounded uppercase tracking-[0.1em]">
                       {t('confirmed_finding_tag', 'Confirmed Finding')}
                     </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-10 pt-8 border-t border-dashed border-border text-center">
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.3em]">
              {t('end_clinical_protocol_footer', 'End of clinical assessment protocol — Secure Sync Active')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssessmentAdmin() {
  const { t, isAr } = useLanguage();
  const [structure, setStructure] = useState<{ regions: any[], tests: any[] }>({ regions: [], tests: [] });
  const [newRegion, setNewRegion] = useState('');
  const [newTest, setNewTest] = useState({ regionId: 0, name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showColumnInfo, setShowColumnInfo] = useState(false);

  const [editingRegionId, setEditingRegionId] = useState<number | null>(null);
  const [editRegionName, setEditRegionName] = useState('');
  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [editTestData, setEditTestData] = useState({ name: '', description: '' });

  const loadData = async () => {
    if (window.api) {
      const struct = await window.api.getAssessmentStructure();
      setStructure(struct);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRegion = async () => {
    if (!newRegion.trim()) return;
    const res = await window.api.addAssessmentRegion(newRegion);
    if (res.success) {
      const newRegionObj = { id: res.id, name: newRegion.trim() };
      setStructure(prev => ({ ...prev, regions: [...prev.regions, newRegionObj] }));
      setNewRegion('');
    }
  };

  const handleUpdateRegion = async (id: number) => {
    if (!editRegionName.trim()) return;
    const res = await (window.api as any).updateAssessmentRegion({ id, name: editRegionName.trim() });
    if (res.success) {
      setStructure(prev => ({
        ...prev,
        regions: prev.regions.map(r => r.id === id ? { ...r, name: editRegionName.trim() } : r)
      }));
      setEditingRegionId(null);
    }
  };

  const handleDeleteRegion = async (id: number) => {
    if (confirm(t('confirm_delete_region', 'Delete this region and ALL associated tests/results?'))) {
      await window.api.deleteAssessmentRegion(id);
      setStructure(prev => ({
        regions: prev.regions.filter(r => r.id !== id),
        tests: prev.tests.filter(t => t.region_id !== id)
      }));
    }
  };

  const handleAddTest = async () => {
    if (!newTest.name.trim() || newTest.regionId === 0) return;
    const res = await window.api.addAssessmentTest(newTest);
    if (res.success) {
      const newTestObj = { id: res.id, region_id: newTest.regionId, name: newTest.name.trim(), description: newTest.description };
      setStructure(prev => ({ ...prev, tests: [...prev.tests, newTestObj] }));
      setNewTest({ ...newTest, name: '', description: '' });
    }
  };

  const handleUpdateTest = async (id: number) => {
    if (!editTestData.name.trim()) return;
    const res = await (window.api as any).updateAssessmentTest({ id, name: editTestData.name.trim(), description: editTestData.description.trim() });
    if (res.success) {
      setStructure(prev => ({
        ...prev,
        tests: prev.tests.map(t => t.id === id ? { ...t, name: editTestData.name.trim(), description: editTestData.description.trim() } : t)
      }));
      setEditingTestId(null);
    }
  };

  const handleDeleteTest = async (id: number) => {
    if (confirm(t('confirm_delete_test', 'Delete this clinical test?'))) {
      await window.api.deleteAssessmentTest(id);
      setStructure(prev => ({ ...prev, tests: prev.tests.filter(t => t.id !== id) }));
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportStatus({ type: null, msg: '' });
    const res = await (window.api as any).importAssessmentsExcel();
    setIsImporting(false);
    if (res.canceled) return;
    if (res.success) {
      setImportStatus({ 
        type: 'success', 
        msg: t('import_success_msg', '✓ Imported {imported} tests ({skipped} skipped).')
          .replace('{imported}', String(res.imported))
          .replace('{skipped}', String(res.skipped)) 
      });
      loadData();
    } else {
      setImportStatus({ 
        type: 'error', 
        msg: t('import_failed_msg', '✗ Import failed: {error}').replace('{error}', res.error) 
      });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    const res = await (window.api as any).exportAssessmentsExcel();
    setIsExporting(false);
    if (res.success) {
      setImportStatus({ 
        type: 'success', 
        msg: t('export_success_msg', '✓ Exported to {fileName}')
          .replace('{fileName}', res.filePath?.split(/[\/\\]/).pop() || '') 
      });
    } else if (!res.canceled) {
      setImportStatus({ 
        type: 'error', 
        msg: t('export_failed_msg', '✗ Export failed: {error}').replace('{error}', res.error) 
      });
    }
  };

  if (loading) return <div className="text-center py-20 font-black uppercase tracking-widest text-blue-300 italic">{t('syncing_admin', 'Evolve Admin Sync...')}</div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-card p-4 sm:p-6 rounded-3xl border-2 border-border shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-black text-foreground uppercase italic tracking-tighter">{t('bulk_data_mgmt', 'Bulk Data Management')}</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{t('bulk_data_mgmt_desc', 'Import or export the full assessment library via Excel')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowColumnInfo(!showColumnInfo)}
              className="px-4 py-2 bg-muted text-foreground border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-all flex items-center gap-2"
            >
              <FileSpreadsheet size={14} /> {t('column_guide_btn', 'Column Guide')}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={14} /> {isExporting ? t('exporting_lbl', 'Exporting...') : t('export_excel_btn', 'Export Excel')}
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={14} /> {isImporting ? t('importing_lbl', 'Importing...') : t('import_excel_btn', 'Import Excel')}
            </button>
          </div>
        </div>

        {showColumnInfo && (
          <div className="bg-blue-950 rounded-2xl p-5 text-left space-y-3 animate-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">{t('req_excel_cols', 'Required Excel Column Names')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { col: 'region', req: true, desc: t('col_guide_region_desc', 'Assessment region name (e.g. "Shoulder"). Auto-created if not exists.') },
                { col: 'name', req: true, desc: t('col_guide_name_desc', 'Clinical test name (e.g. "Apprehension Test").') },
                { col: 'description', req: false, desc: t('col_guide_desc_desc', 'Optional short description of the test protocol.') },
              ].map(item => (
                <div key={item.col} className="bg-blue-900/50 p-3 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-emerald-400 font-black text-xs">{item.col}</code>
                    {item.req && <span className="text-[8px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase">{t('required_lbl', 'Required')}</span>}
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

      <div className="bg-card p-4 sm:p-6 md:p-8 rounded-3xl border-2 border-border shadow-xl">
        <h3 className="text-lg font-black text-foreground uppercase italic tracking-tighter mb-4">{t('add_new_clinical_region', 'Add New Clinical Region')}</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder={t('add_region_placeholder', 'e.g., Cervical Spine, Hip, Ankle...')} 
            className="flex-1 px-5 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-foreground"
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRegion()}
          />
          <button 
            onClick={handleAddRegion}
            className="px-6 sm:px-10 py-3 bg-blue-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-2">
            <Plus size={18} /> {t('initialize_region_btn', 'Initialize Region')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {structure.regions.map(region => (
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
                  <h4 className="font-black text-white uppercase italic tracking-widest">
                    {t(region.name.toLowerCase(), region.name)}
                  </h4>
                  <button
                    onClick={() => { setEditingRegionId(region.id); setEditRegionName(region.name); }}
                    className="p-1 text-blue-200 hover:text-white transition-all"
                    title={t('rename_region_tooltip', 'Rename Region')}
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
              <button 
                onClick={() => handleDeleteRegion(region.id)}
                className="text-red-400 hover:text-red-300 transition-all flex items-center gap-2 text-[10px] font-black uppercase">
                <Trash2 size={14} /> {t('remove_region_btn', 'Remove Region')}
              </button>
            </div>
            
            <div className="p-4 sm:p-8">
              <div className="space-y-4 mb-8">
                {structure.tests.filter(tItem => tItem.region_id === region.id).map(test => (
                  <div key={test.id} className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    {editingTestId === test.id ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-3 mr-4">
                        <input
                          type="text"
                          value={editTestData.name}
                          onChange={e => setEditTestData({ ...editTestData, name: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-bold text-blue-950 outline-none"
                          placeholder={t('test_name_placeholder', 'Test Name')}
                        />
                        <input
                          type="text"
                          value={editTestData.description}
                          onChange={e => setEditTestData({ ...editTestData, description: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-950 outline-none"
                          placeholder={t('test_desc_placeholder', 'Short Description')}
                        />
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateTest(test.id)} className="p-1.5 text-emerald-600 hover:text-emerald-700 transition-all" title="Save">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingTestId(null)} className="p-1.5 text-rose-600 hover:text-rose-700 transition-all" title="Cancel">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-900 text-sm sm:text-base">
                              {t(test.name.toLowerCase(), test.name)}
                            </span>
                            <button
                              onClick={() => { setEditingTestId(test.id); setEditTestData({ name: test.name, description: test.description || '' }); }}
                              className="p-1 text-blue-300 hover:text-primary transition-all"
                              title="Edit Test"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                          {test.description && <p className="text-xs text-blue-300 mt-1 uppercase font-black">{t(test.description.toLowerCase(), test.description)}</p>}
                        </div>
                        <button 
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-2 text-blue-300 hover:text-primary transition-all rounded-lg hover:bg-red-50 ml-2">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-primary/5 p-4 sm:p-6 rounded-2xl border border-primary/10">
                <h5 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 italic">{t('register_new_test_protocol', 'Register New Test Protocol')}</h5>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    placeholder={t('test_name_eg_placeholder', 'Test Name (e.g., Apprehension Test)')} 
                    className="flex-1 px-4 py-2.5 bg-white border border-blue-100 rounded-lg text-sm font-bold text-blue-950 outline-none focus:border-primary"
                    value={newTest.regionId === region.id ? newTest.name : ''}
                    onChange={(e) => setNewTest({ ...newTest, regionId: region.id, name: e.target.value })}
                  />
                  <input 
                    type="text" 
                    placeholder={t('test_desc_optional_placeholder', 'Short Description (optional)')} 
                    className="flex-1 px-4 py-2.5 bg-white border border-blue-100 rounded-lg text-sm font-bold text-blue-950 outline-none focus:border-primary"
                    value={newTest.regionId === region.id ? newTest.description : ''}
                    onChange={(e) => setNewTest({ ...newTest, regionId: region.id, description: e.target.value })}
                  />
                  <button 
                    onClick={handleAddTest}
                    className="px-6 py-2.5 bg-blue-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 shadow-xl transition-all flex items-center justify-center gap-2">
                    <Plus size={14} /> {t('link_test_btn', 'Link Test')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
