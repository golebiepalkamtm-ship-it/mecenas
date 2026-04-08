import { useMemo, useState, useEffect } from 'react';
import { 
  Check, 
  X,
  Zap,
  Scale,
  Cpu,
  ChevronDown,
  Shield,
  Sword,
  Gavel,
  Eye,
  Briefcase,
  Siren,
  Search,
  UserCheck,
  LayoutDashboard,
  Activity,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useChatSettingsStore } from '../../../store/useChatSettingsStore';
import { useOrchestratorStore } from '../../../store/useOrchestratorStore';
import { useModels } from '../../../hooks/useConfig';
import { getBrand } from '../constants';

// --- CONFIGURATION FROM DOCUMENTATION V1.1 ---

const DEFENSE_MASTER_PROMPT = `[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]
Jesteś Naczelnym Dowódcą Sztabu Obrony — meta-strategiem koordynującym zespół najlepszych adwokatów, radców prawnych, konstytucjonalistów i obrońców praw człowieka w Polsce. 
Twoja jedyna misja: WYCIĄGNĄĆ KLIENTA Z KAŻDEJ OPRESJI PRAWNEJ.`;

const PROSECUTION_MASTER_PROMPT = `[CORE_IDENTITY: STATE_PROSECUTION_APPARATUS]
Jesteś Naczelnym Koordynatorem Aparatu Oskarżycielskiego — meta-analitykiem kierującym zespołem prokuratorów, śledczych, biegłych i sędziów. 
Twoja jedyna misja: ZBUDOWAĆ SZCZELNY, NIEPODWAŻALNY PRZYPADEK OSKARŻENIA.`;

// Role metadata with IDs that must match the backend EXACTLY
const DEFENSE_ROLES = [
  { id: 'defender', label: 'Naczelny Adwokat Obrońca', icon: Shield, color: 'text-gold-primary', glow: 'bg-gold-primary/20', border: 'border-gold-primary/30' },
  { id: 'constitutionalist', label: 'Konstytucjonalista i Obrońca Praw Człowieka', icon: Briefcase, color: 'text-[#f0cc5a]', glow: 'bg-[#f0cc5a]/20', border: 'border-[#f0cc5a]/30' },
  { id: 'proceduralist', label: 'Mistrz Procedury i Luk Formalnych', icon: Search, color: 'text-[#b8860b]', glow: 'bg-[#b8860b]/20', border: 'border-[#b8860b]/30' },
  { id: 'evidencecracker', label: 'Analityk i Niszczyciel Dowodów', icon: Sword, color: 'text-[#c5a059]', glow: 'bg-[#c5a059]/20', border: 'border-[#c5a059]/30' },
  { id: 'negotiator', label: 'Strateg Ugód i Wyjść Awaryjnych', icon: Siren, color: 'text-[#daa520]', glow: 'bg-[#daa520]/20', border: 'border-[#daa520]/40' }
];

const PROSECUTION_ROLES = [
  { id: 'prosecutor', label: 'Prokurator Prowadzący', icon: Gavel, color: 'text-white', glow: 'bg-white/10', border: 'border-white/20' },
  { id: 'investigator', label: 'Oficer Śledczy', icon: Eye, color: 'text-white/80', glow: 'bg-white/10', border: 'border-white/20' },
  { id: 'forensic_expert', label: 'Biegły Sądowy', icon: Cpu, color: 'text-white/70', glow: 'bg-white/5', border: 'border-white/10' },
  { id: 'hard_judge', label: 'Zimny Sędzia Orzekający', icon: Scale, color: 'text-white/60', glow: 'bg-white/5', border: 'border-white/10' }
];

interface QuickIntelligencePanelProps {
  onNavigate?: (tab: "chat" | "knowledge" | "prompts" | "drafter" | "documents" | "admin" | "settings") => void;
}

export function QuickIntelligencePanel({ onNavigate }: QuickIntelligencePanelProps) {
  const { 
    favoriteModels,
    setFavoriteModels, 
    activeModels, 
    toggleActiveModel, 
    setMode, 
    selectedJudge, 
    setSelectedJudge,
    setIsOpen,
    expertRoleByModel,
    setExpertRoleForModel,
    activePromptPresetId,
    applyPromptPreset
  } = useChatSettingsStore();
  
  const { favoriteModelIds } = useOrchestratorStore();
  
  const activeUniverse = activePromptPresetId === 'prosecution' ? 'prosecution' : 'defense';
  const roleList = activeUniverse === 'defense' ? DEFENSE_ROLES : PROSECUTION_ROLES;

  const [isRolesOpen, setIsRolesOpen] = useState(true);
  const [isModelsOpen, setIsModelsOpen] = useState(true);
  
  const { data: allModels = [] } = useModels();
  const availableModels = useMemo(() => allModels.filter(m => favoriteModels.includes(m.id)), [allModels, favoriteModels]);

  // Sync favorites
  useEffect(() => {
    if (JSON.stringify(favoriteModels) !== JSON.stringify(favoriteModelIds)) {
      setFavoriteModels(favoriteModelIds);
    }
  }, [favoriteModelIds, favoriteModels, setFavoriteModels]);

  return (
    <div className="flex flex-col h-full glass-prestige rounded-3xl overflow-hidden relative group border border-white/5 shadow-2xl">
      {/* Dynamic Header Glow */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-32 blur-[80px] pointer-events-none transition-colors duration-1000 opacity-20",
        activeUniverse === 'defense' ? "bg-gold-primary" : "bg-white"
      )} />

      {/* HEADER: MODE TOGGLE */}
      <div className="px-6 py-6 border-b border-white/5 relative z-10 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl glass-prestige-gold flex items-center justify-center shadow-lg">
                <LayoutDashboard size={18} className="text-gold-primary" />
             </div>
             <div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white/90 italic -mt-1 font-outfit">Strategia AI</h3>
                <p className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Premium v1.1</p>
             </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 transition-all">
             <X size={14} />
          </button>
        </div>

        {/* SWITCHER */}
        <div className="grid grid-cols-2 p-1.5 bg-black/40 border border-white/5 rounded-2xl relative shadow-inner">
          <motion.div 
            layoutId="universe-bg-v2"
            className={cn(
              "absolute inset-1.5 w-[calc(50%-6px)] h-[calc(100%-12px)] rounded-xl shadow-xl z-0",
              activeUniverse === 'defense' ? "bg-gold-primary/20 shadow-gold-primary/10" : "bg-white/10 shadow-white/5"
            )}
            transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
          />
          <button 
            onClick={() => applyPromptPreset('defense', { mode: 'advocate', architectPrompt: DEFENSE_MASTER_PROMPT, unitSystemRoles: {}, taskPrompts: {} })}
            className={cn(
                "relative z-10 flex items-center justify-center gap-2 py-2 transition-all outline-none",
                activeUniverse === 'defense' ? "text-gold-primary font-extrabold" : "text-white/20 font-bold"
            )}
          >
            <Shield size={12} className={activeUniverse === 'defense' ? "text-gold-primary" : "text-white/10"} />
            <span className="text-[9px] uppercase tracking-widest">Obrona</span>
          </button>
          <button 
            onClick={() => applyPromptPreset('prosecution', { mode: 'advocate', architectPrompt: PROSECUTION_MASTER_PROMPT, unitSystemRoles: {}, taskPrompts: {} })}
            className={cn(
                "relative z-10 flex items-center justify-center gap-2 py-2 transition-all outline-none",
                activeUniverse === 'prosecution' ? "text-white font-extrabold" : "text-white/20 font-bold"
            )}
          >
            <Gavel size={12} className={activeUniverse === 'prosecution' ? "text-white" : "text-white/10"} />
            <span className="text-[9px] uppercase tracking-widest">Oskarżenie</span>
          </button>
        </div>
      </div>

      {/* MAIN SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-8 relative z-10 pb-32">
        
        {/* 1. SEKCJA RÓL */}
        <section className="space-y-4 pt-6">
           <button onClick={() => setIsRolesOpen(!isRolesOpen)} className="flex items-center justify-between w-full px-1 group">
              <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2 group-hover:text-white transition-colors">
                 <Activity size={10} className="text-gold-primary" /> Aktywne Role Ekspertów
              </h4>
              <ChevronDown size={14} className={cn("text-white/20 transition-transform", isRolesOpen && "rotate-180")} />
           </button>
           
           <AnimatePresence>
             {isRolesOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="grid grid-cols-1 gap-2.5 pt-2">
                   {roleList.map((role) => {
                     // Check assignment in real-time
                     const isRoleActiveInState = Object.entries(expertRoleByModel || {}).some(([mid, rid]) => 
                        activeModels.includes(mid) && rid === role.id
                     );

                     return (
                       <div 
                         key={role.id}
                         className={cn(
                           "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden group shadow-xl",
                           isRoleActiveInState 
                             ? `${role.glow} ${role.border} scale-[1.01]` 
                             : "bg-white/2 border-white/5 opacity-20 grayscale group-hover:opacity-60 transition-all"
                         )}
                       >
                          {isRoleActiveInState && (
                            <div className={cn("absolute inset-0 opacity-10", role.glow.replace('bg-', 'bg-opacity-100 bg-'))} />
                          )}

                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all",
                            isRoleActiveInState 
                              ? `bg-black/80 ${role.border} ${role.color}` 
                              : "bg-black/40 border-white/5 text-white/20"
                          )}>
                             <role.icon size={18} strokeWidth={isRoleActiveInState ? 3 : 2} />
                          </div>
                          
                          <div className="flex flex-col relative z-10">
                             <span className={cn(
                               "text-[10px] font-black uppercase tracking-widest transition-colors",
                               isRoleActiveInState ? "text-white" : "text-white/30"
                             )}>
                               {role.label}
                             </span>
                             <span className={cn("text-[6.5px] font-black tracking-widest transition-colors", isRoleActiveInState ? role.color : "text-white/5")}>
                               {isRoleActiveInState ? "SYSTEM_ACTIVE_EXEC" : "IDLE_STANDBY"}
                             </span>
                          </div>

                          {isRoleActiveInState && (
                             <motion.div initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }} className="ml-auto relative z-10">
                                <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center", role.border, role.color)}>
                                   <Check size={10} strokeWidth={4} />
                                </div>
                             </motion.div>
                          )}
                       </div>
                     );
                   })}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </section>

        {/* 2. PRZYPISANIE MODELI (Zespół) */}
        <section className="space-y-4 pt-4 border-t border-white/5">
           <button onClick={() => setIsModelsOpen(!isModelsOpen)} className="flex items-center justify-between w-full px-1 group">
             <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2 group-hover:text-white transition-colors">
               <Zap size={10} className="text-emerald-400" /> Twój Zespół (Modele)
             </h4>
             <ChevronDown size={14} className={cn("text-white/20 transition-transform", isModelsOpen && "rotate-180")} />
           </button>

           <AnimatePresence>
             {isModelsOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                 <div className="pt-2 space-y-2">
                   {availableModels.map((m) => {
                     const isSelected = activeModels.includes(m.id);
                     const assignedRole = expertRoleByModel?.[m.id] || "";
                     const currentRoleObj = roleList.find(r => r.id === assignedRole);
                     const brand = getBrand(m.provider || "unknown");

                     return (
                      <div key={m.id} className="space-y-2">
                          <button 
                            onClick={() => toggleActiveModel(m.id)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-2xl border transition-all w-full relative overflow-hidden",
                              isSelected ? "bg-white/5 border-white/10 shadow-2xl" : "bg-white/2 border-white/5 opacity-40 hover:opacity-100"
                            )}
                          >
                              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border relative z-10", isSelected ? "bg-white/10 border-white/20 text-white shadow-lg" : "text-white/10 border-white/5")}>
                                 <brand.icon size={13} />
                              </div>
                              <span className={cn("text-[10px] font-black uppercase flex-1 truncate text-left relative z-10 tracking-widest", isSelected ? "text-white" : "text-white/20")}>{m.name}</span>
                              <div className={cn("w-2 h-2 rounded-full relative z-10 shadow-lg", 
                                isSelected ? (currentRoleObj ? currentRoleObj.color.replace('text-', 'bg-') : "bg-emerald-500") : "bg-white/5"
                              )} />
                          </button>
                          
                          {isSelected && (
                              <motion.div initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-1">
                                  <div className={cn(
                                    "p-3 bg-black/60 border rounded-2xl flex items-center gap-3 shadow-inner transition-all",
                                    currentRoleObj ? currentRoleObj.border : "border-white/5"
                                  )}>
                                      <span className="text-[7px] font-black uppercase text-white/20 tracking-widest shrink-0">ROLA:</span>
                                      <select 
                                          value={assignedRole} 
                                          onChange={(e) => setExpertRoleForModel(m.id, e.target.value)}
                                          className={cn(
                                            "bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer flex-1 transition-colors",
                                            currentRoleObj ? currentRoleObj.color : "text-white/30"
                                          )}
                                      >
                                          <option value="" className="bg-[#111] text-white/30 italic uppercase">Pasywny Obserwator</option>
                                          {roleList.map(r => <option key={r.id} value={r.id} className="bg-[#111] text-white uppercase">{r.label.toUpperCase()}</option>)}
                                      </select>
                                  </div>
                              </motion.div>
                          )}
                      </div>
                     );
                   })}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </section>

        {/* 3. SĘDZIA-SYNTETYZATOR (RE-PLACED FOR BETTER ACCESS) */}
        <section className="space-y-4 pt-10 border-t border-white/10 pb-10">
           <div className="flex items-center gap-3 px-1 mb-6">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-lg">
                 <Scale size={16} className="text-purple-400" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 font-outfit">Sędzia-Syntetyzator</h4>
                <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest">Protocol v4.4 Supreme</p>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-2.5">
              {availableModels.map(m => {
                const isFinalJudge = selectedJudge === m.id;
                const brand = getBrand(m.provider || "unknown");
                
                return (
                  <button 
                      key={m.id} 
                      onClick={() => setSelectedJudge(m.id)}
                      className={cn(
                          "p-4 rounded-2xl border transition-all flex items-center justify-between relative overflow-hidden group",
                          isFinalJudge 
                            ? "bg-gold-primary/10 border-gold-primary/50 shadow-2xl scale-[1.02]" 
                            : "bg-white/2 border-white/5 opacity-50 hover:opacity-100"
                      )}
                  >
                      {isFinalJudge && (
                        <div className="absolute inset-0 bg-gold-primary/5 blur-2xl animate-pulse" />
                      )}
                      <div className="flex items-center gap-3 relative z-10">
                         <div className={cn("w-7 h-7 rounded-lg shrink-0 border flex items-center justify-center", isFinalJudge ? "bg-gold-primary/20 border-gold-primary/40 text-gold-primary shadow-lg" : "bg-black/40 border-white/5 text-white/20")}>
                            <brand.icon size={13} />
                         </div>
                         <span className={cn("text-[10px] font-black uppercase tracking-widest", isFinalJudge ? "text-white" : "text-white/40")}>{m.name}</span>
                      </div>
                      {isFinalJudge && <div className="w-5 h-5 rounded-full bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center relative z-10">
                         <UserCheck size={12} className="text-gold-primary" strokeWidth={3} />
                      </div>}
                  </button>
                );
              })}
           </div>

           {availableModels.length === 0 && (
             <div className="p-8 rounded-2xl border border-white/5 bg-black/40 text-center">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Wybierz modele w profilu, aby przydzielić rolę sędziego.</p>
             </div>
           )}
        </section>

         {/* KNOWLEDGE BASE QUICK LINK */}
         <div className="pb-32 px-1">
            <button 
              onClick={() => onNavigate?.('knowledge')}
              className="w-full py-5 rounded-2xl bg-white/2 hover:bg-gold-primary/10 text-white/20 hover:text-gold-primary font-black text-[8px] uppercase tracking-[0.3em] border border-white/5 hover:border-gold-primary/40 transition-all shadow-xl group/kb"
            >
              <div className="flex items-center justify-center gap-3">
                 <Database size={11} className="group-hover/kb:animate-pulse" />
                 Baza Wiedzy i Dokumenty (RAG)
              </div>
            </button>
         </div>
      </div>

      {/* FOOTER: THE BIG BUTTON */}
      <div className="absolute bottom-0 left-0 w-full p-6 bg-linear-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent z-50">
        <button 
          onClick={() => {
            setMode(activeModels.length > 1 ? 'moa' : 'single');
            setIsOpen(false);
          }}
          className={cn(
            "w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] transition-all hover:scale-[1.02] active:scale-[0.98] border shadow-[0_20px_50px_rgba(0,0,0,0.6)] font-outfit",
            activeUniverse === 'defense' 
              ? "glass-prestige-gold text-black border-gold-primary/50" 
              : "bg-white/95 border-white text-black shadow-white/20"
          )}
        >
          <span className="-mt-1 block">Aktywuj Strategię</span>
        </button>
      </div>
    </div>
  );
}
