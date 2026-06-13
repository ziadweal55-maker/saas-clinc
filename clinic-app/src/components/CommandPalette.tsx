import { useState, useEffect } from 'react';
import { Search, Home, Users, Bot, Command, ChevronRight, Sparkles } from 'lucide-react';
import { Client } from '../types';

interface CommandPaletteProps {
  clients: Client[];
  onClose: () => void;
  onNavigate: (view: string) => void;
  onSelectClient: (client: Client) => void;
}

export function CommandPalette({ clients, onClose, onNavigate, onSelectClient }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  
  // Cleanup effect to restore focus to body when unmounting
  useEffect(() => {
    return () => {
      // Explicitly blur any active elements and restore body focus
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      document.body.focus();
    };
  }, []);

  const filteredPatients = query.length > 1 ? clients.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
    c.phone.includes(query)
  ).slice(0, 5) : [];

  return (
    <div 
      className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-300 pointer-events-auto"
      onClick={onClose}
    >
      <div 
        className="bg-card w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-center gap-4 bg-muted/20">
          <Search className="text-primary" size={24} />
          <input 
            autoFocus 
            placeholder="Search patients, actions, or clinical views..." 
            className="w-full bg-transparent outline-none text-xl font-medium placeholder:text-muted-foreground/40 text-foreground font-heading" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>
        
        <div className="p-3 max-h-[60vh] overflow-y-auto space-y-4">
          {query.length > 1 && filteredPatients.length > 0 && (
            <div className="space-y-1">
              <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Users size={12} /> Matching Patient Records
              </div>
              {filteredPatients.map(client => (
                  <button 
                  key={client.id}
                  onClick={() => { onSelectClient(client); onClose(); }} 
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 rounded-2xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {client.first_name[0]}{client.last_name[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{client.first_name} {client.last_name}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">{client.phone}</div>
                  </div>
                  <kbd className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-primary/20 text-primary rounded text-[10px] font-bold transition-opacity">ACCESS</kbd>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
               <Command size={12} /> Quick Navigation
            </div>
            
            <button onClick={() => { onNavigate('dashboard'); onClose(); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 rounded-2xl transition-all group">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Home size={20} />
              </div>
              <div className="flex-1 text-left font-bold text-foreground">Clinic Dashboard Overview</div>
              <ChevronRight size={18} className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </button>
            
            <button onClick={() => { onNavigate('clients'); onClose(); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 rounded-2xl transition-all group">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Users size={20} />
              </div>
              <div className="flex-1 text-left font-bold text-foreground">Patient Directory Registry</div>
              <ChevronRight size={18} className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </button>

            <button onClick={() => { onNavigate('ai-assistant'); onClose(); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 rounded-2xl transition-all group">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Bot size={20} />
              </div>
              <div className="flex-1 text-left font-bold text-foreground">AI Clinical Intelligence Assist</div>
              <ChevronRight size={18} className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-muted/30 border-t border-border flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className="flex items-center gap-4">
             <span className="flex items-center gap-1.5"><kbd className="px-2 py-0.5 bg-background border border-border rounded-md text-[9px] shadow-sm">Enter</kbd> Select</span>
             <span className="flex items-center gap-1.5"><kbd className="px-2 py-0.5 bg-background border border-border rounded-md text-[9px] shadow-sm">Esc</kbd> Close</span>
          </div>
          <div className="flex items-center gap-2">
             <Sparkles size={12} className="text-primary" />
             <span className="italic">REVIVE Suite v3.5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
