import { useState } from "react";
import { Sparkles, Save, Edit3, Shield, Target, BrainCircuit, Check, Info } from "lucide-react";
import { useChatSettingsStore } from "../../store/useChatSettingsStore";
import { cn } from "../../utils/cn";
import { API_BASE } from "../../config";

type PromptCategory = 'roles' | 'tasks' | 'architect';

export function PromptsView() {
  const { 
    unitSystemRoles, updateSystemRolePrompt, currentSystemRoleId, setCurrentSystemRoleId,
    taskPrompts, updateTaskPrompt, currentTask, setCurrentTask,
    architectPrompt, setArchitectPrompt,
    activePromptPresetId, applyPromptPreset
  } = useChatSettingsStore();

  const [activeCategory, setActiveCategory] = useState<PromptCategory>('roles');
  
  // Local state for editing to prevent lag
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [localContent, setLocalContent] = useState<string>("");

  const [isLoadingPreset, setIsLoadingPreset] = useState(false);

  const loadPreset = async (presetId: 'defense' | 'prosecution') => {
    setIsLoadingPreset(true);
    try {
      const res = await fetch(`${API_BASE}/api/prompts/presets`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const preset = data?.[presetId];
      if (!preset) throw new Error(`Preset '${presetId}' not found`);

      // Use centralized applyPromptPreset action
      applyPromptPreset(presetId, preset);
    } finally {
      setIsLoadingPreset(false);
    }
  };

  const categories = [
    { id: 'roles', label: 'Eksperci (Role)', icon: Target, count: Object.keys(unitSystemRoles).length, color: 'text-white/80', rgb: '255,255,255' },
    { id: 'tasks', label: 'Zadania AI', icon: Shield, count: Object.keys(taskPrompts).length, color: 'text-white/40', rgb: '200,200,200' },
    { id: 'architect', label: 'System (Master)', icon: BrainCircuit, count: 1, color: 'text-gold-primary', rgb: '212,175,55' }
  ];

  const handleEdit = (key: string, content: string) => {
    setEditingKey(key);
    setLocalContent(content);
  };

  const handleSave = () => {
    if (!editingKey) return;
    
    if (activeCategory === 'roles') {
      updateSystemRolePrompt(editingKey, localContent);
    } else if (activeCategory === 'tasks') {
      updateTaskPrompt(editingKey, localContent);
    } else if (activeCategory === 'architect') {
      setArchitectPrompt(localContent);
    }
    
    setEditingKey(null);
  };

  const handleSelectActive = (key: string) => {
    if (activeCategory === 'roles') {
      setCurrentSystemRoleId(key);
    } else if (activeCategory === 'tasks') {
      setCurrentTask(key);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 lg:p-8 bg-transparent">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center"
             style={{
               background: "linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(30,30,35,0.95) 100%)",
               border: "1px solid rgba(212,175,55,0.3)",
               boxShadow: "0 8px 24px rgba(212,175,55,0.15), inset 0 2px 4px rgba(255,255,255,0.1)"
             }}>
          <Sparkles className="text-gold-primary w-6 h-6" />
        </div>
        <div>
           <h1 className="text-2xl font-black tracking-tight text-white/90">Biblioteka Promptów</h1>
           <p className="text-sm font-medium text-white/40">Zarządzaj instruktarzami systemowymi dla sztucznej inteligencji</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => loadPreset('defense')}
            disabled={isLoadingPreset}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
              activePromptPresetId === 'defense' && "ring-2 ring-emerald-500/50 bg-emerald-500/20",
              isLoadingPreset ? "opacity-60 cursor-not-allowed" : ""
            )}
            title="Załaduj zestaw OBRONY (DREAM DEFENSE TEAM)"
          >
            Obrona
          </button>
          <button
            onClick={() => loadPreset('prosecution')}
            disabled={isLoadingPreset}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              "border border-[#991b1b]/40 bg-[#991b1b]/10 text-red-200 hover:bg-[#991b1b]/15",
              activePromptPresetId === 'prosecution' && "ring-2 ring-[#991b1b]/50 bg-[#991b1b]/20",
              isLoadingPreset ? "opacity-60 cursor-not-allowed" : ""
            )}
            title="Załaduj zestaw OSKARŻENIA (PROSECUTION MACHINE)"
          >
            Oskarżenie
          </button>
          <div className={cn(
            "px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
            activePromptPresetId 
              ? cn(
                  "border-gold-primary/30 bg-gold-primary/10 text-gold-primary",
                  activePromptPresetId === 'defense' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-[#991b1b]/50 bg-[#991b1b]/10 text-red-300"
                )
              : "border-white/10 bg-black/20 text-white/40"
          )}>
            {activePromptPresetId ? activePromptPresetId.toUpperCase() : "BRAK PRESETU"}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Nav */}
        <div className="w-full lg:w-72 flex flex-col gap-2 shrink-0">
           {categories.map(cat => (
             <button
               key={cat.id}
               onClick={() => { setActiveCategory(cat.id as PromptCategory); setEditingKey(null); }}
               className={cn(
                 "w-full text-left flex items-center justify-between p-4 rounded-lg transition-all duration-300 relative overflow-hidden group",
                 activeCategory === cat.id 
                   ? "shadow-lg shadow-black/40"
                   : "bg-black/5 hover:bg-black/10 border border-white/5 text-white/40 hover:text-white"
               )}
               style={activeCategory === cat.id ? {
                 background: `linear-gradient(145deg, rgba(${cat.rgb},0.15) 0%, rgba(3,2,1,0.85) 100%)`,
                 borderTop: `1.5px solid rgba(${cat.rgb},0.85)`,
                 borderLeft: `1px solid rgba(${cat.rgb},0.35)`,
                 borderBottom: "2px solid rgba(0,0,0,0.6)",
                 boxShadow: `0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(${cat.rgb},0.45)`
               } : {}}
             >
               <div className="flex items-center gap-3 relative z-10">
                 <cat.icon size={18} className={activeCategory === cat.id ? cat.color : "text-white/40"} />
                 <span className={cn("font-black text-[11px] uppercase tracking-widest", activeCategory === cat.id ? "text-white" : "")}>{cat.label}</span>
               </div>
               <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-black z-10", activeCategory === cat.id ? `bg-${cat.color.split('-')[1]}-500/20 ${cat.color}` : "bg-black/20")}>{cat.count}</span>
             </button>
           ))}

           <div className="mt-auto p-4 rounded-lg bg-gold-primary/5 border border-gold-primary/10">
              <div className="flex items-start gap-2 text-gold-primary/80">
                 <Info size={14} className="shrink-0 mt-0.5" />
                 <p className="text-[10px] leading-relaxed">
                   Modyfikacja promptów natychmiastowo zmienia zachowanie wybranego asystenta w nowych wiadomościach. 
                   Wybieraj gotowe opcje lub dostosuj je do specyfiki swojej kancelarii.
                 </p>
              </div>
           </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/10 rounded-lg border border-white/5 p-2 lg:p-4 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at top right, rgba(212,175,55,0.03) 0%, transparent 70%)"
          }} />
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
             {activeCategory === 'roles' && Object.entries(unitSystemRoles).map(([key, prompt]) => (
                <PromptCard 
                  key={key} title={key.toUpperCase()} content={prompt} 
                  isActive={currentSystemRoleId === key}
                  onSelect={() => handleSelectActive(key)}
                  isEditing={editingKey === key}
                  localContent={localContent}
                  setLocalContent={setLocalContent}
                  onEdit={() => handleEdit(key, prompt)}
                  onSave={handleSave}
                  onCancel={() => setEditingKey(null)}
                />
             ))}

             {activeCategory === 'tasks' && Object.entries(taskPrompts).map(([key, prompt]) => (
                <PromptCard 
                  key={key} title={key.toUpperCase()} content={prompt} 
                  isActive={currentTask === key}
                  onSelect={() => handleSelectActive(key)}
                  isEditing={editingKey === key}
                  localContent={localContent}
                  setLocalContent={setLocalContent}
                  onEdit={() => handleEdit(key, prompt)}
                  onSave={handleSave}
                  onCancel={() => setEditingKey(null)}
                />
             ))}

             {activeCategory === 'architect' && (
                <PromptCard 
                  key="architect" title="GŁÓWNY ARCHITEKT" content={architectPrompt} 
                  isActive={true}
                  onSelect={() => {}} // Architect is always active
                  isEditing={editingKey === 'architect'}
                  localContent={localContent}
                  setLocalContent={setLocalContent}
                  onEdit={() => handleEdit('architect', architectPrompt)}
                  onSave={handleSave}
                  onCancel={() => setEditingKey(null)}
                />
             )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface PromptCardProps {
  title: string;
  content: string;
  isActive: boolean;
  onSelect: () => void;
  isEditing: boolean;
  localContent: string;
  setLocalContent: (val: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

function PromptCard({ 
  title, content, isActive, onSelect, 
  isEditing, localContent, setLocalContent, onEdit, onSave, onCancel 
}: PromptCardProps) {
  return (
    <div className={cn(
      "relative flex flex-col rounded-lg border transition-all duration-300",
      isActive 
        ? "border-gold-primary/30 bg-gold-primary/5 shadow-[0_8px_32px_rgba(212,175,55,0.05)]" 
        : "border-white/5 bg-black/20 hover:bg-black/30"
    )}>
       <div className="flex items-center justify-between p-4 border-b border-black/20">
          <div className="flex items-center gap-3">
             <button 
               onClick={onSelect}
               className={cn(
                 "w-5 h-5 rounded-lg flex items-center justify-center transition-all",
                 isActive ? "bg-gold-primary text-black" : "bg-black/40 border border-white/20 hover:border-gold-primary/50 text-transparent hover:text-gold-primary/50"
               )}
               title={isActive ? "Aktywny" : "Ustaw jako aktywny"}
             >
               <Check size={12} strokeWidth={isActive ? 3 : 2} />
             </button>
             <h3 className={cn("font-black tracking-wide text-sm", isActive ? "text-gold-primary" : "text-white/70")}>{title}</h3>
          </div>
          <div className="flex items-center gap-2">
             {isEditing ? (
                <>
                  <button onClick={onCancel} className="px-3 py-1.5 text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider">Anuluj</button>
                  <button onClick={onSave} className="flex items-center gap-1.5 px-4 py-1.5 bg-gold-primary text-black rounded-lg text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(212,175,55,0.3)] hover:scale-105 transition-all">
                     <Save size={12} /> Zapisz
                  </button>
                </>
             ) : (
                <button 
                  onClick={onEdit} 
                  className="p-2 rounded-lg bg-white/5 hover:bg-gold-primary/20 text-white/40 hover:text-gold-primary transition-all"
                  title="Edytuj prompt"
                >
                   <Edit3 size={14} />
                </button>
             )}
          </div>
       </div>
       <div className="p-4">
          {isEditing ? (
            <textarea
              value={localContent}
              onChange={e => setLocalContent(e.target.value)}
              className="w-full h-48 bg-black/40 border border-gold-primary/30 rounded-lg p-4 text-xs font-mono text-white/90 focus:outline-none focus:ring-1 focus:ring-gold-primary/50 resize-none custom-scrollbar leading-relaxed"
              style={{ caretColor: "#d4af37" }}
            />
          ) : (
            <div className="text-xs font-mono text-white/50 leading-relaxed max-h-32 overflow-hidden relative">
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-[#151515] to-transparent pointer-events-none" />
              <div className="whitespace-pre-wrap">{content}</div>
            </div>
          )}
       </div>
    </div>
  );
}
