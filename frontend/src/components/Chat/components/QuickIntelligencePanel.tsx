import { useMemo, useState, useEffect } from 'react';
import { 
  Check, 
  X,
  Zap,
  Scale,
  ChevronDown,
  Shield,
  Gavel,
  Search,
  UserCheck,
  LayoutDashboard,
  Activity,
  FileText,
  type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useChatSettingsStore } from '../../../store/useChatSettingsStore';
import { useOrchestratorStore } from '../../../store/useOrchestratorStore';
import { useModels } from '../../../hooks/useConfig';
import { getBrand } from '../constants';

const DEFENSE_MASTER_PROMPT = `[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]
Jesteś Naczelnym Dowódcą Sztabu Obrony — meta-strategiem koordynującym zespół najlepszych adwokatów, radców prawnych, konstytucjonalistów i obrońców praw człowieka w Polsce. 
Twoja jedyna misja: WYCIĄGNĄĆ KLIENTA Z KAŻDEJ OPRESJI PRAWNEJ.`;

const PROSECUTION_MASTER_PROMPT = `[CORE_IDENTITY: STATE_PROSECUTION_APPARATUS]
Jesteś Naczelnym Koordynatorem Aparatu Oskarżycielskiego — meta-analitykiem kierującym zespołem prokuratorów, śledczych, biegłych i sędziów. 
Twoja jedyna misja: ZBUDOWAĆ SZCZELNY, NIEPODWAŻALNY PRZYPADEK OSKARŻENIA.`;

export function QuickIntelligencePanel() {
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
    applyPromptPreset,
    unitSystemRoles 
  } = useChatSettingsStore();
  
  const { favoriteModelIds } = useOrchestratorStore();
  
  const activeUniverse = activePromptPresetId === 'prosecution' ? 'prosecution' : 'defense';

  const roleList = useMemo(() => {
    const iconMap: Record<string, LucideIcon> = {
      defender: Shield,
      proceduralist: Scale,
      constitutionalist: FileText,
      negotiator: Gavel,
      evidencecracker: Search
    };
    const colorMap: Record<string, string> = {
      defender: 'text-emerald-400',
      proceduralist: 'text-blue-400',
      constitutionalist: 'text-amber-400',
      negotiator: 'text-purple-400',
      evidencecracker: 'text-rose-400'
    };
    const borderMap: Record<string, string> = {
      defender: 'border-emerald-500/30',
      proceduralist: 'border-blue-500/30',
      constitutionalist: 'border-amber-500/30',
      negotiator: 'border-purple-500/30',
      evidencecracker: 'border-rose-500/30'
    };
    const glowMap: Record<string, string> = {
      defender: 'bg-emerald-500/10',
      proceduralist: 'bg-blue-500/10',
      constitutionalist: 'bg-amber-500/10',
      negotiator: 'bg-purple-500/10',
      evidencecracker: 'bg-rose-500/10'
    };

    return Object.keys(unitSystemRoles).map(id => ({
      id,
      label: id === 'defender' ? 'Adwokat' : 
             id === 'proceduralist' ? 'Proceduralista' :
             id === 'constitutionalist' ? 'Konstytucjonalista' :
             id === 'negotiator' ? 'Mediator' :
             id === 'evidencecracker' ? 'Analityk Dowodowy' : id.toUpperCase(),
      icon: iconMap[id] || Shield,
      color: colorMap[id] || 'text-gold-primary',
      border: borderMap[id] || 'border-gold-primary/30',
      glow: glowMap[id] || 'bg-gold-primary/10'
    }));
  }, [unitSystemRoles]);

  const [isRolesOpen, setIsRolesOpen] = useState(true);
  const [isModelsOpen, setIsModelsOpen] = useState(true);
  
  const { data: allModels = [] } = useModels();
  
  const availableModels = useMemo(() => {
    if (favoriteModels.length > 0) {
      return allModels.filter(m => favoriteModels.includes(m.id));
    }
    return [];
  }, [allModels, favoriteModels]);

  useEffect(() => {
    if (favoriteModels.length === 0 && favoriteModelIds.length > 0) {
      setFavoriteModels(favoriteModelIds);
    }
  }, [favoriteModelIds, favoriteModels.length, setFavoriteModels]);

  return (
    <div className="fixed lg:relative right-0 top-20 bottom-0 lg:h-[calc(100%-80px)] w-[320px] max-w-full glass-steel-monolith rounded-none z-10000 shadow-none border-t border-white/5 pointer-events-auto flex flex-col overflow-hidden">
      <div className={cn(
        "absolute top-0 left-0 w-full h-32 blur-[80px] pointer-events-none transition-colors duration-1000 opacity-20",
        activeUniverse === 'defense' ? "bg-jade-primary" : "bg-white"
      )} />

      <div className="px-6 py-6 pt-6 lg:pt-6 border-b border-white/10 relative z-10 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl glass-prestige-gold flex items-center justify-center shadow-lg">
                <LayoutDashboard size={18} className="text-gold-primary" />
             </div>
             <div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white italic font-outfit">Strategia AI</h3>
                <p className="text-[7px] text-white/60 font-bold uppercase tracking-widest">Premium v1.1</p>
             </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-red-500/5 border border-red-500/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/15 hover:border-red-500/40 group/close">
             <X size={16} className="group-hover/close:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl relative shadow-inner mb-4">
          <motion.div 
            layoutId="universe-bg-v2"
            className={cn(
              "absolute inset-1.5 w-[calc(50%-6px)] h-[calc(100%-12px)] rounded-xl shadow-xl z-0",
              activeUniverse === 'defense' ? "bg-[#d4af37]/30 shadow-[#d4af37]/10" : "bg-white/20 shadow-white/5"
            )}
            transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
          />
          <button 
            onClick={() => applyPromptPreset('defense', { mode: 'advocate', architectPrompt: DEFENSE_MASTER_PROMPT, unitSystemRoles: {}, taskPrompts: {} })}
            className={cn("relative z-10 flex items-center justify-center gap-2 py-2 outline-none", activeUniverse === 'defense' ? "text-gold-primary font-extrabold" : "text-white/20 font-bold")}
          >
            <Shield size={12} className={activeUniverse === 'defense' ? "text-gold-primary" : "text-white/10"} />
            <span className="text-[9px] uppercase tracking-widest">Obrona</span>
          </button>
          <button 
            onClick={() => applyPromptPreset('prosecution', { mode: 'advocate', architectPrompt: PROSECUTION_MASTER_PROMPT, unitSystemRoles: {}, taskPrompts: {} })}
            className={cn("relative z-10 flex items-center justify-center gap-2 py-2 outline-none", activeUniverse === 'prosecution' ? "text-white font-extrabold" : "text-white/40 font-bold")}
          >
            <Gavel size={12} className={activeUniverse === 'prosecution' ? "text-white" : "text-white/10"} />
            <span className="text-[9px] uppercase tracking-widest">Oskarżenie</span>
          </button>
        </div>

        <button onClick={() => { setMode(activeModels.length > 1 ? 'moa' : 'single'); setIsOpen(false); }} className="prestige-panel-action w-full bg-gold-primary/10 border border-gold-primary/20 py-3 rounded-xl text-gold-primary text-[10px] font-black uppercase tracking-widest hover:bg-gold-primary/20 transition-all">
          <span className="-mt-1 block">Aktywuj Strategię</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-8 relative z-10 custom-scrollbar pb-40 text-white">
        
        <section className="space-y-4 pt-6">
           <button onClick={() => setIsRolesOpen(!isRolesOpen)} className="flex items-center justify-between w-full px-1 group">
              <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50 flex items-center gap-2 group-hover:text-white transition-colors">
                 <Activity size={10} className="text-gold-primary" /> Aktywne Role Ekspertów
              </h4>
              <ChevronDown size={14} className={cn("text-white/40 transition-transform", isRolesOpen && "rotate-180")} />
           </button>
           
           <AnimatePresence>
             {isRolesOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="grid grid-cols-1 gap-2.5 pt-2">
                   {roleList.map((role) => {
                     const isRoleActiveInState = Object.entries(expertRoleByModel || {}).some(([mid, rid]) => 
                        activeModels.includes(mid) && rid === role.id
                     );

                     return (
                       <div key={role.id} className={cn("flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden group shadow-xl", isRoleActiveInState ? `${role.glow} ${role.border} scale-[1.01]` : "bg-white/2 border-white/5 opacity-20 grayscale group-hover:opacity-60")}>
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all", isRoleActiveInState ? `bg-white/40 ${role.border} ${role.color}` : "bg-white/10 border-white/5 text-white/20")}>
                             <role.icon size={18} strokeWidth={isRoleActiveInState ? 3 : 2} />
                          </div>
                          <div className="flex flex-col relative z-10">
                             <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isRoleActiveInState ? "text-white" : "text-white/40")}>{role.label}</span>
                             <span className={cn("text-[6.5px] font-black tracking-widest transition-colors", isRoleActiveInState ? role.color : "text-white/5")}>{isRoleActiveInState ? "SYSTEM_ACTIVE_EXEC" : "IDLE_STANDBY"}</span>
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

        <section className="space-y-4 pt-4 border-t border-white/10">
           <button onClick={() => setIsModelsOpen(!isModelsOpen)} className="flex items-center justify-between w-full px-1 group">
             <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50 flex items-center gap-2 group-hover:text-white transition-colors">
               <Zap size={10} className="text-gold-primary" /> Twój Zespół (Modele)
             </h4>
             <ChevronDown size={14} className={cn("text-white/40 transition-transform", isModelsOpen && "rotate-180")} />
           </button>

           <AnimatePresence>
             {isModelsOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                    {availableModels.map((m) => {
                      const isSelected = activeModels.includes(m.id);
                      const assignedRole = expertRoleByModel?.[m.id] || "";
                      const currentRoleObj = roleList.find(r => r.id === assignedRole);
                      const brand = getBrand(m.provider || "unknown");

                      return (
                       <div key={m.id} className="space-y-2">
                           <button 
                             onClick={() => {
                               const newState = !isSelected;
                               toggleActiveModel(m.id);
                               
                               // If activating and no role assigned yet, find first free role
                               if (newState && (!expertRoleByModel?.[m.id])) {
                                 const assignedRoles = Object.entries(expertRoleByModel || {})
                                   .filter(([mid]) => activeModels.includes(mid))
                                   .map(([, rid]) => rid);
                                 
                                 const nextRole = roleList.find(r => !assignedRoles.includes(r.id)) || roleList[0];
                                 if (nextRole) setExpertRoleForModel(m.id, nextRole.id);
                               }
                             }} 
                             className={cn("flex items-center gap-3 p-3 rounded-2xl border transition-all w-full relative overflow-hidden", isSelected ? "bg-white/5 border-white/10 shadow-2xl" : "bg-white/2 border-white/5 opacity-40 hover:opacity-100")}
                           >
                               <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border relative z-10", isSelected ? "bg-white/10 border-white/20 text-white shadow-lg" : "text-white/10 border-white/5")}>
                                  <brand.icon size={13} />
                               </div>
                               <span className={cn("text-[10px] font-black uppercase flex-1 truncate text-left relative z-10 tracking-widest", isSelected ? "text-white" : "text-white/20")}>{m.name}</span>
                               <div className={cn("w-2 h-2 rounded-full relative z-10 shadow-lg", isSelected ? (currentRoleObj ? currentRoleObj.color.replace('text-', 'bg-') : "bg-gold-primary") : "bg-white/5")} />
                           </button>
                           {isSelected && (
                               <motion.div initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-1">
                                   <div className={cn("p-3 bg-white/5 border rounded-2xl flex items-center gap-3 shadow-inner transition-all", currentRoleObj ? currentRoleObj.border : "border-white/10")}>
                                       <select value={assignedRole} onChange={(e) => setExpertRoleForModel(m.id, e.target.value)} className={cn("bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer flex-1 transition-colors", currentRoleObj ? currentRoleObj.color : "text-white/30")}>
                                           <option value="" className="bg-[#111] text-white/30 italic uppercase">Pasywny Obserwator</option>
                                           {roleList.map(r => <option key={r.id} value={r.id} className="bg-[#111] text-white uppercase">{r.label.toUpperCase()}</option>)}
                                       </select>
                                   </div>
                               </motion.div>
                           )}
                       </div>
                      );
                    })}
                 </motion.div>
             )}
           </AnimatePresence>
        </section>

        <section className="space-y-4 pt-10 border-t border-white/10 pb-10">
           <div className="flex items-center gap-3 px-1 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gold-primary/15 border border-gold-primary/35 flex items-center justify-center shadow-lg"><Scale size={16} className="text-gold-primary" /></div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 font-outfit">Sędzia-Syntetyzator</h4>
              </div>
           </div>
           <div className="grid grid-cols-1 gap-2.5">
              {availableModels.map(m => {
                const isFinalJudge = selectedJudge === m.id;
                const brand = getBrand(m.provider || "unknown");
                return (
                  <button key={m.id} onClick={() => setSelectedJudge(m.id)} className={cn("p-4 rounded-2xl border transition-all flex items-center justify-between relative overflow-hidden group", isFinalJudge ? "bg-gold-primary/10 border-gold-primary/50 shadow-2xl scale-[1.02]" : "bg-white/2 border-white/5 opacity-50 hover:opacity-100")}>
                      <div className="flex items-center gap-3 relative z-10">
                         <div className={cn("w-7 h-7 rounded-lg shrink-0 border flex items-center justify-center", isFinalJudge ? "bg-gold-primary/20 border-gold-primary/40 text-gold-primary shadow-lg" : "bg-black/40 border-white/5 text-white/20")}><brand.icon size={13} /></div>
                         <span className={cn("text-[10px] font-black uppercase tracking-widest", isFinalJudge ? "text-white" : "text-white/40")}>{m.name}</span>
                      </div>
                      {isFinalJudge && <div className="w-5 h-5 rounded-full bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center relative z-10"><UserCheck size={12} className="text-gold-primary" strokeWidth={3} /></div>}
                  </button>
                );
              })}
           </div>
        </section>
      </div>
    </div>
  );
}
