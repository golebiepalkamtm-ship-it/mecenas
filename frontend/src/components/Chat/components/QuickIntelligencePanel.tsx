import { useMemo, useState, useEffect } from 'react';
import { 
  Check, 
  Target, 
  X,
  Plus,
  Library,
  Search,
  Zap,
  Scale,
  Cpu,
  ChevronDown,
  Stamp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useChatSettingsStore } from '../../../store/useChatSettingsStore';
import { useOrchestratorStore } from '../../../store/useOrchestratorStore';
import { useModels, type Model } from '../../../hooks/useConfig';
import { getBrand } from '../constants';

const TASK_OPTIONS = [
  { id: 'general', roleId: 'navigator', label: 'Ogólne Wsparcie Prawne', icon: Library, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/40', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]' },
  { id: 'analysis', roleId: 'inquisitor', label: 'Analiza Dokumentacji', icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/40', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.2)]' },
  { id: 'drafting', roleId: 'draftsman', label: 'Kreator Pism i Umów', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/40', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
  { id: 'research', roleId: 'oracle', label: 'Research Orzecznictwa', icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/40', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]' },
  { id: 'strategy', roleId: 'grandmaster', label: 'Strategia Procesowa', icon: Scale, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/40', glow: 'shadow-[0_0_20px_rgba(251,113,133,0.2)]' }
];

export function QuickIntelligencePanel({ 
  onNavigate 
}: { 
  onNavigate?: (tab: "chat" | "knowledge" | "prompts" | "drafter" | "documents" | "admin" | "settings") => void 
}) {
  const { 
    drafterModel,
    setDrafterModel, 
    favoriteModels, 
    setFavoriteModels, 
    currentTask, 
    setCurrentTask, 
    setCurrentSystemRoleId, 
    setIsOpen, 
    activeModels, 
    toggleActiveModel, 
    mode, 
    setMode, 
    selectedJudge, 
    setSelectedJudge 
  } = useChatSettingsStore();
  
  const { favoriteModelIds } = useOrchestratorStore();
  
  const [isTaskSectionOpen, setTaskSectionOpen] = useState(true);
  const [isAssistantsSectionOpen, setAssistantsSectionOpen] = useState(true);
  const [isJudgeSectionOpen, setJudgeSectionOpen] = useState(false);
  const [isDrafterSectionOpen, setDrafterSectionOpen] = useState(true);
  
  const { data: allModels = [] } = useModels();

  const judgeModelsData = useMemo(() => {
    return allModels.filter(m => favoriteModels.includes(m.id) && !m.id.includes("vision"));
  }, [allModels, favoriteModels]);

  const activeModelsData = useMemo(() => {
    return allModels.filter(m => favoriteModels.includes(m.id));
  }, [allModels, favoriteModels]);

  useEffect(() => {
    if (JSON.stringify(favoriteModels) !== JSON.stringify(favoriteModelIds)) {
      setFavoriteModels(favoriteModelIds);
    }
  }, [favoriteModelIds, favoriteModels, setFavoriteModels]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('🔄 Profile updated - refreshing models display');
    };

    window.addEventListener('prawnik_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('prawnik_profile_updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (!selectedJudge && judgeModelsData.length > 0) {
      setSelectedJudge(judgeModelsData[0].id);
    }
  }, [selectedJudge, judgeModelsData, setSelectedJudge]);

  const currentTaskData = TASK_OPTIONS.find(t => t.id === currentTask) || TASK_OPTIONS[0];

  useEffect(() => {
    if (activeModels.length > 1 && mode !== 'moa') {
      setMode('moa');
    } else if (activeModels.length <= 1 && mode === 'moa') {
      setMode('single');
    }
  }, [activeModels.length, mode, setMode]);

  return (
    <div className="flex flex-col h-full glass-prestige-embossed rounded-3xl overflow-hidden relative group shadow-[0_40px_80px_rgba(0,0,0,0.6)] border-t-2 border-t-white/90 border-x border-white/10">
      {/* Logo highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gold-200/40 to-transparent" />
      
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold-primary/5 blur-[100px] pointer-events-none" />
      
      {/* Top specular highlight for convex effect */}
      <div className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none z-0 rounded-t-3xl" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, transparent 100%)'
      }} />

      {/* Header */}
      <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-prestige-gold flex items-center justify-center shadow-lg border-t border-white/20">
            <Cpu size={24} className="text-gold-primary" />
          </div>
          <div>
            <h3 className="text-[14px] font-black uppercase tracking-[0.2em] text-white/90 italic">Wybór Modelu</h3>
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Konfiguracja Zespołu</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20 shadow-lg"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 relative z-10">
        
        {/* Task Selection */}
        <section className="space-y-4">
          <button 
            onClick={() => setTaskSectionOpen(!isTaskSectionOpen)}
            className="flex items-center justify-between w-full px-1 group/header"
          >
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2 group-hover/header:text-white/60 transition-colors">
              <Plus size={10} className="text-gold-primary" /> Cel Konsultacji
              {!isTaskSectionOpen && (
                    <span className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-[8px] tracking-widest border transition-all truncate max-w-[120px]",
                      currentTaskData.bg,
                      currentTaskData.border,
                      currentTaskData.color
                    )}>
                        {currentTaskData.label}
                    </span>
              )}
            </h4>
            <ChevronDown size={14} className={cn("text-white/20 transition-transform duration-300", isTaskSectionOpen ? "rotate-180" : "rotate-0")} />
          </button>
          
          <AnimatePresence>
            {isTaskSectionOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 gap-2 pt-2">
                  {TASK_OPTIONS.map((task) => {
                    const isActive = currentTask === task.id;
                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          setCurrentTask(task.id);
                          setCurrentSystemRoleId(task.roleId);
                          if (task.id === 'drafting') {
                            setIsOpen(false);
                            onNavigate?.("drafter");
                          }
                        }}
                        className={cn(
                          "group flex items-center gap-4 p-4 rounded-2xl border transition-all text-left relative overflow-hidden w-full",
                          isActive ? cn(task.bg, task.border, task.glow, "shadow-xl border-t-white/30") : "bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all",
                          isActive ? cn(task.color.replace('text-', 'bg-'), "border-white/40 text-black shadow-lg") : "bg-black/40 border-white/10 text-white/40"
                        )}>
                          <task.icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                        </div>
                        <div className="flex flex-col relative z-10">
                          <span className={cn("text-[11px] font-black uppercase tracking-widest transition-colors", isActive ? task.color : "text-white/70")}>
                            {task.label}
                          </span>
                        </div>
                        {isActive && (
                          <motion.div 
                            layoutId="task-indicator"
                            className="ml-auto relative z-10"
                          >
                            <Check size={14} className={task.color} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Asystenci Selection */}
        <section className="space-y-4">
          <button 
            onClick={() => setAssistantsSectionOpen(!isAssistantsSectionOpen)}
            className="flex items-center justify-between w-full px-1 group/header"
          >
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2 group-hover/header:text-white/60 transition-colors">
              <Zap size={10} className="text-amber-400" /> Asystenci
              {!isAssistantsSectionOpen && activeModels.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[8px] tracking-widest border border-amber-500/50 bg-amber-500/10 text-amber-400">
                  Wybrano {activeModels.length}
                </span>
              )}
            </h4>
            <ChevronDown size={14} className={cn("text-white/20 transition-transform duration-300", isAssistantsSectionOpen ? "rotate-180" : "rotate-0")} />
          </button>

          <AnimatePresence>
            {isAssistantsSectionOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 gap-2 pt-2">
                    {activeModelsData.map((m: Model) => {
                        const isSelected = activeModels.includes(m.id);
                        const brand = getBrand(m.provider || (m.id.includes('/') ? m.id.split('/')[0] : 'unknown'));
                        const cleanName = m.name.includes(":") ? m.name.split(":").slice(-1)[0]?.trim() : m.name;
                        return (
                            <button
                                key={m.id}
                                onClick={() => toggleActiveModel(m.id)}
                                className={cn(
                                    "group flex items-center gap-3 p-2.5 px-4 rounded-2xl border transition-all text-left overflow-hidden min-h-[48px] h-auto w-full",
                                    isSelected 
                                        ? cn(brand.bg, brand.border, "shadow-lg shadow-black/20")
                                        : "bg-white/3 border-white/5 hover:border-white/20 hover:bg-white/6"
                                )}
                            >
                                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all", isSelected ? cn(brand.bg, brand.border, brand.color) : "bg-black/40 border-white/10 text-white/40 group-hover:text-white/60")}>
                                    <brand.icon size={12} />
                                </div>
                                <span className={cn("text-[12px] font-black uppercase tracking-tight leading-[1.1] flex-1 py-1 transition-colors", isSelected ? brand.color : "text-white/70 group-hover:text-white")}>
                                    {cleanName || m.id}
                                </span>
                                {isSelected && <div className={cn("w-2 h-2 rounded-full", brand.bg, brand.border, "shadow-lg")} />}
                            </button>
                        );
                    })}
                </div>
                {activeModelsData.length === 0 && (
                    <div className="py-10 text-center space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">Brak modeli</p>
                    </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Silnik Kreatora Pism (Drafter Engine) */}
        <section className="space-y-4 pt-4 border-t border-white/5">
          <button 
            onClick={() => setDrafterSectionOpen(!isDrafterSectionOpen)}
            className="flex items-center justify-between w-full px-1 group/header"
          >
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2 group-hover/header:text-white/60 transition-colors">
              <Stamp size={10} className="text-emerald-400" /> Silnik Kreatora Pism
              {!isDrafterSectionOpen && drafterModel && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[8px] tracking-widest border border-emerald-500/50 bg-emerald-500/10 text-emerald-400">
                  Ustawiony
                </span>
              )}
            </h4>
            <ChevronDown size={14} className={cn("text-white/20 transition-transform duration-300", isDrafterSectionOpen ? "rotate-180" : "rotate-0")} />
          </button>

          <AnimatePresence>
            {isDrafterSectionOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="grid grid-cols-1 gap-2 pt-2">
                  {activeModelsData.map(model => {
                    const isActive = drafterModel === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => setDrafterModel(model.id)}
                        className={cn(
                          "group flex items-center gap-3 p-2.5 px-4 rounded-2xl border transition-all text-left overflow-hidden min-h-[48px] h-auto w-full",
                          isActive 
                            ? "bg-emerald-400/10 border-emerald-400/30 shadow-lg text-emerald-400"
                            : "bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                          isActive ? "bg-emerald-400 text-black border-white/20" : "bg-black/40 border-white/10 text-white/40 group-hover:text-white/60"
                        )}>
                          <Cpu size={12} />
                        </div>
                        <span className={cn("text-[12px] font-black uppercase tracking-tight leading-[1.1] flex-1 py-1 transition-colors", isActive ? "text-emerald-400" : "text-white/70 group-hover:text-white")}>
                          {model.name}
                        </span>
                        {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Sędzia / Weryfikator Selection */}
        <section className="space-y-4 relative mt-8">
            <div className="absolute -top-6 left-0 right-0 flex justify-center">
              <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                Tryb Konsylium Detekcji
              </span>
            </div>
            <button 
              onClick={() => setJudgeSectionOpen(!isJudgeSectionOpen)}
              className="flex items-center justify-between w-full px-1 group/header mt-2"
            >
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2 group-hover/header:text-white/60 transition-colors">
                <Scale size={10} className="text-purple-400" /> Sędzia / Weryfikator
                {!isJudgeSectionOpen && selectedJudge && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[8px] tracking-widest border border-purple-500/50 bg-purple-500/10 text-purple-400">
                    Aktywny
                  </span>
                )}
              </h4>
              <ChevronDown size={14} className={cn("text-white/20 transition-transform duration-300", isJudgeSectionOpen ? "rotate-180" : "rotate-0")} />
            </button>

            <AnimatePresence>
              {isJudgeSectionOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <div className="grid grid-cols-1 gap-2 pt-2">
                      {judgeModelsData.map((m: Model) => {
                          const isSelected = selectedJudge === m.id;
                          const brand = getBrand(m.provider || (m.id.includes('/') ? m.id.split('/')[0] : 'unknown'));
                          const cleanName = m.name.includes(":") ? m.name.split(":").slice(-1)[0]?.trim() : m.name;
                          return (
                              <button
                                  key={`judge-${m.id}`}
                                  onClick={() => {
                                    setSelectedJudge(m.id);
                                    setJudgeSectionOpen(false);
                                  }}
                                  className={cn(
                                      "group flex items-center gap-3 p-2.5 px-4 rounded-2xl border transition-all text-left overflow-hidden w-full",
                                      isSelected 
                                          ? cn(brand.bg, brand.border, "shadow-lg shadow-black/20")
                                          : "bg-white/3 border-white/5 hover:border-white/20 hover:bg-white/6"
                                  )}
                              >
                                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all", isSelected ? cn(brand.bg, brand.border, brand.color) : "bg-black/40 border-white/10 text-white/40 group-hover:text-white/60")}>
                                      <brand.icon size={12} />
                                  </div>
                                  <span className={cn("text-[12px] font-black uppercase tracking-tight leading-[1.1] flex-1 py-1 transition-colors", isSelected ? brand.color : "text-white/70 group-hover:text-white")}>
                                      {cleanName || m.id}
                                  </span>
                                  {isSelected && <div className={cn("w-2 h-2 rounded-full", brand.bg, brand.border, "shadow-lg")} />}
                              </button>
                          );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-white/5 relative z-10">
        <button 
          onClick={() => setIsOpen(false)}
          className={cn(
            "w-full py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-[0.3em] shadow-lg",
            activeModels.length > 1 
              ? "bg-linear-to-br from-indigo-500/30 via-blue-500/30 to-teal-500/30 border-blue-500/40 text-white shadow-blue-500/20 hover:from-blue-500/50 hover:to-teal-500/50"
              : "bg-linear-to-br from-blue-600/30 to-indigo-700/30 border-blue-500/30 text-white hover:bg-blue-600/50 shadow-blue-500/10"
          )}
        >
          Zapisz ustawienia
        </button>
      </div>
    </div>
  );
}
