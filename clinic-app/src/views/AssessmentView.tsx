import { AssessmentAdmin } from '../components/BioMetrics';
import { ClipboardList } from 'lucide-react';

export function AssessmentView() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground font-heading tracking-tight italic flex items-center gap-3">
          <ClipboardList size={28} className="text-primary md:w-8 md:h-8" />
          CLINIC ASSESSMENT PROTOCOLS
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1 ml-10">Configure and manage bio-metric regions and clinical test definitions.</p>
      </div>

      <div className="bg-card rounded-2xl md:rounded-3xl border border-border shadow-xl overflow-hidden">
        <div className="p-4 sm:p-6 md:p-10">
          <AssessmentAdmin />
        </div>
      </div>
    </div>
  );
}
