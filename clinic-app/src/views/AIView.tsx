import { useState } from 'react';
import { Bot, AlertCircle, Sparkles, Send, User, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Client } from '../types';

interface AIViewProps {
  clients: Client[];
}

export function AIView({ clients }: AIViewProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsLoading(true);
    setError('');
    setResponse('');
    try {
      const res = await window.api.askAi({ 
        clientId: selectedClientId ? parseInt(selectedClientId) : undefined, 
        question 
        });
      if (res.success) {
        setResponse(res.text || '');
      } else {
        setError(res.error || '');
      }
    } catch (err) {
      setError('An unexpected error occurred during AI synthesis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-heading tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Bot size={28} />
            </div>
            AI Clinical Assistant
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1 ml-1">Evidence-based clinical decision support and treatment planning.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-8 relative overflow-hidden group">
        <div className="absolute -right-24 -top-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <User size={12} /> Patient Context (Optional)
              </label>
              <select 
                value={selectedClientId} 
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="" className="text-foreground">General Query (No patient context)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="text-foreground">{c.first_name} {c.last_name} (ID: #{c.id})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <MessageSquare size={12} /> Clinical Dilemma or Treatment Question
            </label>
            <textarea 
              rows={5}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g., Analyze the clinical history and suggest a multi-phase rehabilitation strategy for this patient's chronic condition..."
              className="w-full px-4 py-4 bg-muted/30 border border-border rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
               <Sparkles size={14} className="text-primary" /> Data remains encrypted and local
            </div>
            <button 
              onClick={handleAsk}
              disabled={isLoading || !question.trim()}
              className="bg-accent text-accent-foreground px-10 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto hover:-translate-y-0.5 active:scale-95 group"
            >
              {isLoading ? (
                <><div className="animate-spin h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full" /> Generating Analysis...</>
              ) : (
                <><Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Consult Assistant</>
              )}
            </button>
          </div>
        </div>
      </div>

      {(response || error) && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className={`bg-card rounded-3xl border ${error ? 'border-destructive/20 shadow-destructive/5' : 'border-border shadow-xl'} overflow-hidden`}>
            <div className={`px-8 py-5 border-b flex justify-between items-center ${error ? 'bg-destructive/10 text-destructive border-destructive/10' : 'bg-primary text-primary-foreground border-primary/10'}`}>
              <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-widest">
                {error ? <><AlertCircle size={20} /> System Error</> : <><Sparkles size={20} /> Clinical Synthesis</>}
              </div>
              {!error && <div className="text-[10px] font-bold opacity-80">AI PROCESSED</div>}
            </div>
            
            <div className="p-10">
              {error ? (
                <div className="bg-destructive/5 p-6 rounded-2xl border border-destructive/10">
                  <p className="text-destructive font-bold text-lg mb-2">Synthesis Failed</p>
                  <p className="text-destructive/80 font-medium">{error}</p>
                </div>
              ) : (
                <div className="prose prose-slate prose-lg max-w-none dark:prose-invert text-foreground leading-relaxed font-medium">
                  <ReactMarkdown 
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-primary font-heading font-bold" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-primary font-heading font-bold" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-primary font-heading font-bold" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-primary font-bold" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc marker:text-accent" {...props} />,
                    }}
                  >
                    {response}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            
            {!error && (
               <div className="px-8 py-4 bg-muted/30 border-t border-border flex justify-end">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(response); }}
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    Copy to Clinical Notes
                  </button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
