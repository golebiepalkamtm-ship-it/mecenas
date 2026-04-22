import { useMemo, useState, useEffect } from 'react';
import { 
  Check, 
  X,
  Zap,
  ChevronDown,
  Shield,
  Gavel,
  Search,
  UserCheck,
  LayoutDashboard,
  Activity,
  FileText,
  Scroll,
  type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useChatSettingsStore } from '../../../store/useChatSettingsStore';
import { useOrchestratorStore } from '../../../store/useOrchestratorStore';
import { useModels } from '../../../hooks/useConfig';
import { useApiManagement } from '../../../hooks';
import { useModelHealth } from '../../../hooks/useModelHealth';
import { getBrand } from '../constants';

const DEFENSE_MASTER_PROMPT = `[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]
Jesteś Naczelnym Dowódcą Sztabu Obrony — meta-strategiem koordynującym zespół najlepszych adwokatów, radców prawnych, konstytucjonalistów i obrońców praw człowieka w Polsce. 
Twoja jedyna misja: WYCIĄGNĄĆ KLIENTA Z KAŻDEJ OPRESJI PRAWNEJ.`;

const PROSECUTION_MASTER_PROMPT = `[CORE_IDENTITY: STATE_PROSECUTION_APPARATUS]
Jesteś Naczelnym Koordynatorem Aparatu Oskarżycielskiego — meta-analitykiem kierującym zespołem prokuratorów, śledczych i biegłych. 
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
    selectedExperts,
    setExperts,
    setActiveModels,
    selectedSingleModel,
    setSelectedSingleModel,
    unitSystemRoles 
  } = useChatSettingsStore();
  
  const { favoriteModelIds } = useOrchestratorStore();
  
  const activeUniverse = activePromptPresetId === 'prosecution' ? 'prosecution' : 'defense';

  const roleList = useMemo(() => {
    const iconMap: Record<string, LucideIcon> = {
      defender: Shield,
      proceduralist: Scroll,
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
      label: id === 'defender' ? 'Obrońca' : 
             id === 'proceduralist' ? 'Specjalista Proceduralny' :
             id === 'constitutionalist' ? 'Konstytucjonalista' :
             id === 'negotiator' ? 'Mediator/Negocjator' :
             id === 'evidencecracker' ? 'Analityk Dowodowy' : 
             id === 'inquisitor' ? 'Inkwizytor' :
             id === 'oracle' ? 'Wyrocznia Prawna' :
             id === 'draftsman' ? 'Redaktor PISM' :
             id === 'grandmaster' ? 'Strateg/Arcymistrz' :
             id === 'prosecutor' ? 'Prokurator' :
             id === 'investigator' ? 'Śledczy' :
             id === 'forensic_expert' ? 'Biegły Sądowy' :
             id === 'hard_judge' ? 'Główny Analityk Śledczy' :
             id === 'sentencing_expert' ? 'Ekspert ds. Wyroków' :
             id.toUpperCase(),
      icon: iconMap[id] || Shield,
      color: colorMap[id] || 'text-gold-primary',
      border: borderMap[id] || 'border-gold-primary/30',
      glow: glowMap[id] || 'bg-gold-primary/10'
    }))
    .filter(role => role.id.trim().length > 0);
  }, [unitSystemRoles]);

  const [isRolesOpen, setIsRolesOpen] = useState(true);
  const [isModelsOpen, setIsModelsOpen] = useState(true);
  const [isJudgeOpen, setIsJudgeOpen] = useState(true);
  
  const { data: allModels = [] } = useModels();
  const { healthData } = useModelHealth();
  const { providers } = useApiManagement();

  const activeProviders = useMemo(() => 
    providers
      .filter(p => p.active && p.key && p.key.trim() !== "")
      .map(p => p.id.toLowerCase()),
    [providers]
  );
  
  const availableModels = useMemo(() => {
    let filtered = allModels;

    // Filter by active providers
    filtered = filtered.filter(model => {
        const provider = (model.provider || '').toLowerCase();
        let normalizedProviderId = provider;
        if (provider.includes('google')) normalizedProviderId = 'google';
        else if (provider.includes('openai')) normalizedProviderId = 'openai';
        else if (provider.includes('anthropic')) normalizedProviderId = 'anthropic';
        else if (provider.includes('mistral')) normalizedProviderId = 'mistral';
        else if (provider.includes('meta')) normalizedProviderId = 'meta';
        else if (provider.includes('deepseek')) normalizedProviderId = 'deepseek';
        else if (provider.includes('perplexity')) normalizedProviderId = 'perplexity';
        else if (provider.includes('openrouter')) normalizedProviderId = 'openrouter';
        else if (provider.includes('mindee')) normalizedProviderId = 'mindee';
        else if (provider.includes('cohere')) normalizedProviderId = 'cohere';
        else if (provider.includes('microsoft')) normalizedProviderId = 'microsoft';
        else if (provider.includes('stability')) normalizedProviderId = 'stability';
        else if (provider.includes('upstage')) normalizedProviderId = 'upstage';
        else if (provider.includes('x-ai')) normalizedProviderId = 'x-ai';

        const isVisibleThroughDirect = activeProviders.includes(normalizedProviderId);
        const isVisibleThroughOpenRouter = activeProviders.includes('openrouter');
        
        return isVisibleThroughDirect || isVisibleThroughOpenRouter;
    });

    if (favoriteModels.length > 0) {
      return filtered.filter(m => favoriteModels.includes(m.id));
    }
    return filtered;
  }, [allModels, favoriteModels, activeProviders]);

  // Synchronizacja: Czyścimy wybrane modele, jeśli ich dostawcy nie są już aktywni
  useEffect(() => {
    if (allModels.length === 0 || activeProviders.length === 0) return;
    
    const cleanup = () => {
        const validExperts = selectedExperts.filter((id: string) => availableModels.some(m => m.id === id));
        if (validExperts.length !== selectedExperts.length) {
            setExperts(validExperts);
        }

        const validActive = activeModels.filter((id: string) => availableModels.some(m => m.id === id));
        if (validActive.length !== activeModels.length) {
            setActiveModels(validActive);
        }

        if (selectedSingleModel && !availableModels.some(m => m.id === selectedSingleModel)) {
            setSelectedSingleModel("");
        }

        if (selectedJudge && !availableModels.some(m => m.id === selectedJudge)) {
            setSelectedJudge("");
        }
    };

    cleanup();
  }, [availableModels, selectedExperts, activeModels, selectedSingleModel, selectedJudge, setSelectedJudge, setExperts, setActiveModels, setSelectedSingleModel, allModels.length, activeProviders.length]);

  useEffect(() => {
    if (favoriteModels.length === 0 && favoriteModelIds.length > 0) {
      setFavoriteModels(favoriteModelIds);
    }
  }, [favoriteModelIds, favoriteModels.length, setFavoriteModels]);

  return (
    <div className="fixed lg:relative right-0 top-[80px] lg:top-0 bottom-0 lg:h-full w-[320px] max-w-full glass-steel-monolith rounded-none z-10000 shadow-none border-t border-white/5 pointer-events-auto flex flex-col overflow-hidden">
      <div className={cn(
        "absolute top-0 left-0 w-full h-64 pointer-events-none transition-colors duration-1000 opacity-15",
        activeUniverse === 'defense' 
          ? "bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.3)_0%,transparent_70%)]" 
          : "bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_70%)]"
      )} />

      <div className="px-6 py-6 pt-6 lg:pt-6 border-b border-black/10 relative z-10 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl glass-prestige group flex items-center justify-center shadow-lg hover:glass-liquid-convex">
                <LayoutDashboard size={18} className="text-black" />
             </div>
             <div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-black italic font-outfit">Strategia AI</h3>
                <p className="text-[7px] text-black/60 font-bold uppercase tracking-widest">Mercury Node v1.1</p>
             </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-red-500/5 border border-red-500/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/15 hover:border-red-500/40 group/close">
             <X size={16} className="group-hover/close:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 p-1.5 bg-black/5 border border-black/10 rounded-2xl relative shadow-inner mb-4">
          <motion.div 
            layoutId="universe-bg-v2"
            className={cn(
              "absolute inset-1.5 w-[calc(50%-6px)] h-[calc(100%-12px)] rounded-xl shadow-xl z-0",
              activeUniverse === 'defense' ? "bg-emerald-500/30 shadow-emerald-500/10" : "bg-black/10 shadow-black/5"
            )}
            transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
          />
          <button 
            onClick={() => applyPromptPreset('defense', { mode: 'single', architectPrompt: DEFENSE_MASTER_PROMPT, unitSystemRoles: {}, taskPrompts: {} })}
            className={cn("relative z-10 flex items-center justify-center gap-2 py-2 outline-none", activeUniverse === 'defense' ? "text-emerald-900 font-extrabold" : "text-black/30 font-bold")}
          >
            <Shield size={12} className={activeUniverse === 'defense' ? "text-emerald-700" : "text-black/10"} />
            <span className="text-[9px] uppercase tracking-widest">Obrona</span>
          </button>
          <button 
            onClick={() => applyPromptPreset('prosecution', { mode: 'single', architectPrompt: PROSECUTION_MASTER_PROMPT, unitSystemRoles: {}, taskPrompts: {} })}
            className={cn("relative z-10 flex items-center justify-center gap-2 py-2 outline-none", activeUniverse === 'prosecution' ? "text-black font-extrabold" : "text-black/30 font-bold")}
          >
            <Gavel size={12} className={activeUniverse === 'prosecution' ? "text-black" : "text-black/10"} />
            <span className="text-[9px] uppercase tracking-widest">Oskarżenie</span>
          </button>
        </div>

        <button onClick={() => { setMode(activeModels.length > 1 ? 'moa' : 'single'); setIsOpen(false); }} className="prestige-panel-action w-full bg-black/10 border border-black/10 py-3 rounded-xl text-black text-[10px] font-black uppercase tracking-widest hover:bg-black/20 transition-all">
          <span className="-mt-1 block">Aktywuj Strategię</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-8 relative z-10 custom-scrollbar pb-40 text-black">
        
        {/* AUTO SPEED SELECTION TOGGLE */}
        <section className="pt-6">
           <div className="p-4 rounded-2xl glass-liquid-convex bg-gold-primary/10 border border-gold-primary/20 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gold-primary/5 neural-orb opacity-40 animate-pulse pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center shadow-lg">
                       <Zap size={18} className="text-gold-primary animate-pulse" />
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black italic">Auto-Wybór (Speed)</h4>
                       <p className="text-[7px] text-black/50 font-bold uppercase tracking-widest mt-1">Priorytet Szybkości Łącza</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => useChatSettingsStore.getState().setAutoSpeedSelection(!useChatSettingsStore.getState().autoSpeedSelection)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative border p-1 shrink-0",
                    useChatSettingsStore(s => s.autoSpeedSelection) ? "bg-gold-primary border-gold-primary/30" : "bg-black/10 border-black/10"
                  )}
                 >
                    <motion.div 
                      animate={{ x: useChatSettingsStore(s => s.autoSpeedSelection) ? 24 : 0 }}
                      className="w-4 h-4 rounded-full bg-white shadow-lg"
                    />
                 </button>
              </div>
           </div>
        </section>
        
        <section className="space-y-4 pt-6">
           <button onClick={() => setIsRolesOpen(!isRolesOpen)} className="flex items-center justify-between w-full px-1 group">
              <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-black/50 flex items-center gap-2 group-hover:text-black transition-colors">
                 <Activity size={10} className="text-black" /> Aktywne Role Ekspertów
              </h4>
              <ChevronDown size={14} className={cn("text-black/40 transition-transform", isRolesOpen && "rotate-180")} />
           </button>
           
           <AnimatePresence>
             {isRolesOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="grid grid-cols-1 gap-2.5 pt-2">
                   {roleList.map((role) => {
                     const isRoleActiveInState = Object.entries(expertRoleByModel || {}).some(([mid, rid]) => 
                        activeModels.includes(mid) && rid === role.id
                     );
                     const roleColor = role.id === 'defender' ? '#10b981' : role.id === 'proceduralist' ? '#3b82f6' : role.id === 'constitutionalist' ? '#f59e0b' : role.id === 'negotiator' ? '#8b5cf6' : '#f43f5e';

                     return (
                       <div 
                         key={role.id} 
                         className={cn(
                           "flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 relative overflow-hidden group shadow-xl glass-liquid-convex", 
                           isRoleActiveInState ? "scale-[1.02]" : "opacity-40 grayscale group-hover:opacity-80"
                         )}
                         style={isRoleActiveInState ? { 
                            backgroundColor: roleColor,
                            backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.15) 100%)`,
                            boxShadow: `0 20px 40px -10px ${roleColor}88, inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.1)`
                         } : {}}
                       >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all", isRoleActiveInState ? "bg-black/10 border-black/10 text-black" : "bg-black/5 border-black/5 text-black/20")}>
                             <role.icon size={18} strokeWidth={isRoleActiveInState ? 4 : 2} />
                          </div>
                          <div className="flex flex-col relative z-10">
                             <span className="text-[11px] font-black uppercase tracking-widest text-black">{role.label}</span>
                             <span className={cn("text-[7px] font-black tracking-widest text-black/40")}>{isRoleActiveInState ? "SYST_EXEC_ON" : "STANDBY"}</span>
                          </div>
                          {isRoleActiveInState && (
                             <motion.div initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }} className="ml-auto relative z-10">
                                <div className="w-6 h-6 rounded-full bg-black/10 border border-black/20 flex items-center justify-center text-black shadow-lg">
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

        <section className="space-y-4 pt-4 border-t border-black/10">
           <button onClick={() => setIsModelsOpen(!isModelsOpen)} className="flex items-center justify-between w-full px-1 group">
             <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-black/50 flex items-center gap-2 group-hover:text-black transition-colors">
               <Zap size={10} className="text-black" /> Twój Zespół (Modele)
             </h4>
             <ChevronDown size={14} className={cn("text-black/40 transition-transform", isModelsOpen && "rotate-180")} />
           </button>

           <AnimatePresence>
             {isModelsOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                    {availableModels.map((m) => {
                      const isSelected = activeModels.includes(m.id);
                      const assignedRole = expertRoleByModel?.[m.id] || "";
                      const currentRoleObj = roleList.find(r => r.id === assignedRole);
                      const brand = getBrand(m.provider || "unknown");
                      const activeColor = "#ced4da";
                      const health = healthData[m.id];

                      return (
                       <div key={m.id} className="space-y-2">
                           <button 
                             onClick={() => {
                               const newState = !isSelected;
                               toggleActiveModel(m.id);
                               if (newState && (!expertRoleByModel?.[m.id])) {
                                 const assignedRoles = Object.entries(expertRoleByModel || {}).filter(([mid]) => activeModels.includes(mid)).map(([, rid]) => rid);
                                 const nextRole = roleList.find(r => !assignedRoles.includes(r.id)) || roleList[0];
                                 if (nextRole) setExpertRoleForModel(m.id, nextRole.id);
                               }
                             }} 
                             className={cn("flex items-center gap-3 p-3 rounded-2xl transition-all w-full relative overflow-hidden glass-liquid-convex", isSelected ? "scale-[1.01]" : "opacity-40 hover:opacity-100")}
                             style={isSelected ? { 
                               backgroundColor: activeColor,
                               backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.15) 100%)`,
                             } : {}}
                           >
                               <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border relative z-10", isSelected ? "bg-black/5 border-black/10 text-black shadow-lg" : "text-black/10 border-black/5")}>
                                  <brand.icon size={13} />
                               </div>
                               <div className="flex-1 min-w-0 flex flex-col text-left relative z-10">
                                  <span className={cn("text-[10px] font-black uppercase truncate tracking-widest text-black")}>{m.name}</span>
                                  {health && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                       <div className={cn("w-1 h-1 rounded-full", health.status === 'online' ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
                                       <span className="text-[6px] font-black text-black/40 uppercase tracking-tighter">
                                         {health.status === 'online' ? `${health.latency_ms}ms` : 'OFFLINE'}
                                       </span>
                                    </div>
                                  )}
                               </div>
                               <div className={cn("w-2 h-2 rounded-full relative z-10 shadow-lg", isSelected ? (currentRoleObj ? currentRoleObj.color.replace('text-', 'bg-') : "bg-black") : "bg-black/5")} />
                           </button>
                           {isSelected && (
                               <motion.div initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-1">
                                   <div className="p-2.5 glass-liquid-convex bg-black/5 rounded-2xl flex items-center gap-3 shadow-inner transition-all no-shimmer">
                                       <select value={assignedRole} onChange={(e) => setExpertRoleForModel(m.id, e.target.value)} className="bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer flex-1 transition-colors text-black">
                                           <option value="" className="bg-white text-black/30 italic uppercase">Pasywny Obserwator</option>
                                           {roleList.map(r => <option key={r.id} value={r.id} className="bg-white text-black uppercase">{r.label.toUpperCase()}</option>)}
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

        <section className="space-y-4 pt-10 border-t border-black/10 pb-10">
           <button onClick={() => setIsJudgeOpen(!isJudgeOpen)} className="flex items-center justify-between w-full px-1 group mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black/10 border border-black/20 flex items-center justify-center shadow-lg"><Gavel size={16} className="text-black" /></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/80 font-outfit">GŁÓWNY STRATEG</h4>
              </div>
              <ChevronDown size={14} className={cn("text-black/40 transition-transform", isJudgeOpen && "rotate-180")} />
           </button>

           <AnimatePresence>
             {isJudgeOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="grid grid-cols-1 gap-2.5">
                    {availableModels.map(m => {
                      const isFinalJudge = selectedJudge === m.id;
                      const brand = getBrand(m.provider || "unknown");
                      return (
                        <button 
                          key={m.id} 
                          onClick={() => setSelectedJudge(m.id)} 
                          className={cn("p-4 rounded-2xl transition-all flex items-center justify-between relative overflow-hidden group glass-liquid-convex", isFinalJudge ? "scale-[1.02]" : "opacity-50 hover:opacity-100")}
                          style={isFinalJudge ? { 
                            backgroundColor: '#ced4da',
                            backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.15) 100%)`,
                          } : {}}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                               <div className={cn("w-7 h-7 rounded-lg shrink-0 border flex items-center justify-center", isFinalJudge ? "bg-black/10 border-black/10 text-black shadow-lg" : "bg-black/10 border-black/5 text-black/20")}><brand.icon size={13} /></div>
                               <span className="text-[10px] font-black uppercase tracking-widest text-black">{m.name}</span>
                            </div>
                            {isFinalJudge && (
                              <div className="w-5 h-5 rounded-full bg-black/10 border border-black/20 flex items-center justify-center relative z-10 shadow-lg">
                                <UserCheck size={12} className="text-black" strokeWidth={3} />
                              </div>
                            )}
                        </button>
                      );
                    })}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
