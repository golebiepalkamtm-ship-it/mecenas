import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Check, 
  X,
  ChevronDown,
  UserCheck,
  Activity,
  Info,
} from 'lucide-react';
import { LexIcon, type LexIconName } from '../../Layout/LexIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useChatSettingsStore } from '../../../store/useChatSettingsStore';
import { useModelHealth } from '../../../hooks/useModelHealth';
import { useSelectableChatModels } from '../../../hooks/useSelectableChatModels';
import {
  DEFENSE_EXPERT_ROLE_IDS,
  PROSECUTION_EXPERT_ROLE_IDS,
} from '../../../utils/modelSelection';
import { getBrand } from '../constants';
import { usePromptPresets } from '../../../hooks/usePromptPresets';
import type { ResponseMode } from '../../../store/useChatSettingsStore';
import { CHAT_SIDE_PANEL_RIGHT } from '../../Library/shared';
import { translatePromptKey } from '../../../utils/promptLabels';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  defender: 'Reprezentuje interes prawny klienta, poszukuje okoliczności łagodzących i buduje linię obrony.',
  proceduralist: 'Analizuje przebieg procedury, terminy, wady formalne pism, błędy organów oraz doręczenia (ZPO/UPO).',
  constitutionalist: 'Ocenia zgodność działań z Konstytucją RP, prawami człowieka (ETPCz) i standardami proporcjonalności.',
  negotiator: 'Koncentruje się na polubownym rozwiązaniu sporu, ugodach, mediacjach i minimalizacji kosztów.',
  evidencecracker: 'Analizuje moc dowodów, wiarygodność świadków, braki w materiale i niespójności.',
  inquisitor: 'Prowadzi agresywne przesłuchanie hipotez, szukając słabych punktów w argumentacji drugiej strony.',
  oracle: 'Skupia się na czystej wykładni przepisów, analizie orzecznictwa sądów najwyższych (SN, NSA) i doktryny.',
  draftsman: 'Przygotowuje precyzyjne projekty pism procesowych, zarzutów, wniosków dowodowych i odwołań.',
  grandmaster: 'Tworzy długofalowy plan taktyczny, przewiduje ruchy przeciwnika i zarządza ryzykiem.',
  prosecutor: 'Formułuje zarzuty, analizuje znamiona czynów zabronionych i reprezentuje oskarżenie.',
  investigator: 'Rekonstruuje stan faktyczny, bada chronologię zdarzeń i gromadzi materiały źródłowe.',
  forensic_expert: 'Przeprowadza specjalistyczną ocenę techniczną, medyczną lub ekonomiczną.',
  hard_judge: 'Dokonuje bezstronnej i surowej oceny szans na sukces w oparciu o zgromadzony materiał.',
  sentencing_expert: 'Analizuje wymiar kary, stopień społecznej szkodliwości i porównuje sprawę z precedensami.',
  navigator: 'Nawiguje po skomplikowanych gałęziach prawa i koordynuje współpracę między agentami.'
};

const ROLE_IMPACTS: Record<string, string> = {
  defender: 'Konstruuje argumenty na korzyść klienta, buduje spójną linię obrony.',
  proceduralist: 'Zwraca uwagę na błędy formalne, terminy procesowe i uchybienia organów.',
  constitutionalist: 'Powołuje się na prawa człowieka, Konstytucję RP i zasady ustrojowe.',
  negotiator: 'Dąży do ugodowego zakończenia sporu i minimalizacji kosztów.',
  evidencecracker: 'Podważa moc dowodów przeciwnika i bada spójność materiału dowodowego.',
  inquisitor: 'Testuje argumenty poprzez prowokacyjne pytania i szukanie sprzeczności.',
  oracle: 'Zapewnia poparcie stanowiska najnowszym orzecznictwem SN, NSA i TSUE.',
  draftsman: 'Formułuje gotowe wnioski dowodowe, zarzuty i żądania w formie pism.',
  grandmaster: 'Planuje taktykę sporu, przewiduje reakcje i minimalizuje ryzyko.',
  prosecutor: 'Precyzuje zarzuty, wykazuje naruszenie norm prawnych i winę.',
  investigator: 'Uporządkowuje fakty, chronologię i odnajduje kluczowe powiązania.',
  forensic_expert: 'Ocenia specjalistyczne zagadnienia techniczne, medyczne i finansowe.',
  hard_judge: 'Wskazuje ryzyka, słabości argumentacji i szanse na wygraną.',
  sentencing_expert: 'Analizuje stopień społecznej szkodliwości i wysokość roszczeń/kar.',
  navigator: 'Koordynuje argumenty pozostałych ekspertów, dbając o jednolity przekaz.'
};

interface FeatureDetail {
  description: string;
  impact: string;
}

const RESPONSE_MODE_DETAILS: Record<ResponseMode, FeatureDetail> = {
  citizen: {
    description: 'Tłumaczy skomplikowane zagadnienia prawne prostym, przystępnym językiem.',
    impact: 'Unika żargonu prawnego, skupia się na praktycznych konsekwencjach i prawach klienta.'
  },
  strategic: {
    description: 'Koncentruje się na taktyce procesowej, ocenie ryzyka i planowaniu kolejnych kroków.',
    impact: 'Dostarcza logiczny, wieloetapowy plan działania i analizuje potencjalne ruchy przeciwnika.'
  },
  draft: {
    description: 'Przygotowuje profesjonalne projekty pism procesowych, wniosków czy odwołań.',
    impact: 'Generuje sformalizowany tekst w stylu urzędowo-sądowym z powołaniem przepisów.'
  }
};

const TASK_DETAILS: Record<string, FeatureDetail> = {
  general: {
    description: 'Ogólne doradztwo prawne i diagnoza wstępna sytuacji.',
    impact: 'Zapewnia całościowe spojrzenie na problem, pomaga zrozumieć sytuację i zdefiniować główne kierunki działania.'
  },
  analysis: {
    description: 'Szczegółowa weryfikacja dokumentów pod kątem wad, luk i ryzyk.',
    impact: 'Ujawnia słabe punkty w pismach przeciwnika lub zagrożenia w umowach, przygotowuje grunt pod polemikę.'
  },
  drafting: {
    description: 'Opracowywanie projektów pism, wniosków, zarzutów i odwołań.',
    impact: 'Przekłada argumentację na precyzyjny język prawniczy, zachowując strukturę formalną wymaganą przez sądy/organy.'
  },
  research: {
    description: 'Analiza orzecznictwa sądowego, poglądów doktryny i interpretacji przepisów.',
    impact: 'Wskazuje silne argumenty poparte linią orzeczniczą sądów (SN, NSA, SA), zwiększając wiarygodność stanowiska.'
  },
  strategy: {
    description: 'Planowanie kompleksowej taktyki procesowej i zarządzanie ryzykiem.',
    impact: 'Umożliwia wyprzedzenie ruchów przeciwnika i optymalne rozłożenie sił w sporze sądowym.'
  },
  criminal_defense: {
    description: 'Budowanie linii obrony w sprawach o przestępstwa i wykroczenia.',
    impact: 'Skupia się na prawach podejrzanego/oskarżonego, podważaniu wiarygodności dowodów oskarżenia i łagodzeniu kary.'
  },
  rights_defense: {
    description: 'Ochrona praw podstawowych, konsumenckich, pracowniczych i obywatelskich.',
    impact: 'Wskazuje konkretne przepisy chroniące słabszą stronę stosunku prawnego oraz ścieżki dochodzenia roszczeń.'
  },
  document_attack: {
    description: 'Krytyczna ocena dowodów z dokumentów przedstawionych przez drugą stronę.',
    impact: 'Pomaga zakwestionować autentyczność, moc dowodową lub poprawność formalną kluczowych dowodów przeciwnika.'
  },
  emergency_relief: {
    description: 'Natychmiastowa pomoc w sytuacjach nagłych i przy krótkich terminach.',
    impact: 'Maksymalnie koncentruje się na najpilniejszych działaniach zabezpieczających, aby uniknąć negatywnych skutków upływu czasu.'
  },
  charge_building: {
    description: 'Precyzyjne formułowanie zarzutów i podstaw prawnych powództwa.',
    impact: 'Pozwala na jasne zdefiniowanie naruszeń prawa przez przeciwnika, co stanowi fundament pozwu lub aktu oskarżenia.'
  },
  indictment_review: {
    description: 'Analiza aktu oskarżenia pod kątem niespójności i braku dowodów.',
    impact: 'Wskazuje luki w materiale dowodowym prokuratury, które mogą być kluczem do uniewinnienia.'
  },
  sentencing_argument: {
    description: 'Argumentacja dotycząca wymiaru kary, środków karnych i probacyjnych.',
    impact: 'Pomaga uzyskać najniższy możliwy wymiar kary, zawieszenie jej wykonania lub warunkowe umorzenie.'
  },
  warrant_application: {
    description: 'Analiza przesłanek stosowania tymczasowego aresztowania i innych środków.',
    impact: 'Dostarcza argumentów przeciwko potrzebie izolowania podejrzanego lub za zastosowaniem wolnościowych środków.'
  }
};

const VALID_ROLES_FOR_TASK: Record<string, string[]> = {
  general: ['oracle', 'navigator', 'hard_judge', 'grandmaster'],
  analysis: ['proceduralist', 'evidencecracker', 'forensic_expert', 'hard_judge', 'oracle', 'investigator'],
  drafting: ['draftsman', 'proceduralist', 'oracle', 'defender', 'prosecutor', 'evidencecracker'],
  research: ['oracle', 'constitutionalist', 'investigator', 'sentencing_expert'],
  strategy: ['grandmaster', 'navigator', 'hard_judge', 'negotiator', 'oracle'],
  criminal_defense: ['defender', 'proceduralist', 'evidencecracker', 'constitutionalist', 'sentencing_expert'],
  rights_defense: ['constitutionalist', 'defender', 'oracle', 'negotiator'],
  document_attack: ['inquisitor', 'evidencecracker', 'proceduralist', 'hard_judge'],
  emergency_relief: ['navigator', 'proceduralist', 'defender', 'negotiator'],
  charge_building: ['prosecutor', 'investigator', 'evidencecracker', 'forensic_expert'],
  indictment_review: ['defender', 'inquisitor', 'proceduralist', 'evidencecracker'],
  sentencing_argument: ['sentencing_expert', 'defender', 'prosecutor', 'negotiator'],
  warrant_application: ['prosecutor', 'defender', 'proceduralist', 'hard_judge']
};

export function QuickIntelligencePanel() {
  const { 
    activeModels, 
    toggleActiveModel, 
    setMode, 
    selectedJudge, 
    setSelectedJudge,
    setIsOpen,
    expertRoleByModel,
    setExpertRoleForModel,
    activePromptPresetId,
    unitSystemRoles,
    taskPrompts,
    currentTask,
    setCurrentTask,
    responseMode,
    setResponseMode,
    favoriteModels,
  } = useChatSettingsStore();

  const { applyServerPreset, loading: presetsLoading, error: presetsError } = usePromptPresets();

  const responseModeOptions: { id: ResponseMode; label: string }[] = [
    { id: 'citizen', label: 'Obywatel' },
    { id: 'strategic', label: 'Strategia' },
    { id: 'draft', label: 'Pismo' },
  ];
  
  const activeUniverse = activePromptPresetId === 'prosecution' ? 'prosecution' : 'defense';

  const roleList = useMemo(() => {
    const iconMap: Record<string, LexIconName> = {
      defender: 'shield',
      proceduralist: 'documents',
      constitutionalist: 'file',
      negotiator: 'gavel',
      evidencecracker: 'knowledge',
      inquisitor: 'prompts',
      oracle: 'knowledge',
      draftsman: 'drafter',
      grandmaster: 'prompts',
      prosecutor: 'gavel',
      investigator: 'knowledge',
      forensic_expert: 'documents',
      hard_judge: 'judgments',
      sentencing_expert: 'judgments',
    };

    const roleOrder =
      activeUniverse === 'prosecution'
        ? PROSECUTION_EXPERT_ROLE_IDS
        : DEFENSE_EXPERT_ROLE_IDS;

    return roleOrder
      .filter((id) => id in unitSystemRoles)
      .map((id) => ({
        id,
        label: translatePromptKey(id),
        lexIcon: iconMap[id] || 'shield'
      }))
      .filter((role) => role.id.trim().length > 0 && (!currentTask || !VALID_ROLES_FOR_TASK[currentTask] || VALID_ROLES_FOR_TASK[currentTask].includes(role.id)));
  }, [unitSystemRoles, activeUniverse, currentTask]);

  const taskOptions = useMemo(() => {
    return Object.keys(taskPrompts)
      .filter((id) => id.trim().length > 0)
      .map((id) => ({ id, label: translatePromptKey(id) }));
  }, [taskPrompts]);

  const [isRolesOpen, setIsRolesOpen] = useState(true);
  const [isTaskOpen, setIsTaskOpen] = useState(true);
  const [isModelsOpen, setIsModelsOpen] = useState(true);
  const [isJudgeOpen, setIsJudgeOpen] = useState(true);
  const { healthData } = useModelHealth();
  const { models: availableModels } = useSelectableChatModels(
    'favorites',
    favoriteModels,
    '',
    'all',
  );

  const [activeTooltipModelId, setActiveTooltipModelId] = useState<string | null>(null);
  const [hoveredResponseMode, setHoveredResponseMode] = useState<ResponseMode | null>(null);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredTaskPos, setHoveredTaskPos] = useState({ top: 0, left: 0 });
  const [activeRoleDropdownModelId, setActiveRoleDropdownModelId] = useState<string | null>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);
  const [hoveredRolePos, setHoveredRolePos] = useState({ top: 0, left: 0 });
  const [hoveredUniverse, setHoveredUniverse] = useState<'defense' | 'prosecution' | null>(null);

  // Auto-degradation logic: cleanup incompatible roles when task changes
  useEffect(() => {
    if (!currentTask || !VALID_ROLES_FOR_TASK[currentTask] || !expertRoleByModel) return;
    const validRolesForCurrentTask = VALID_ROLES_FOR_TASK[currentTask];
    
    Object.entries(expertRoleByModel).forEach(([modelId, assignedRole]) => {
      if (activeModels.includes(modelId) && assignedRole && !validRolesForCurrentTask.includes(assignedRole)) {
        setExpertRoleForModel(modelId, ""); // Reset to passive observer
      }
    });
  }, [currentTask, expertRoleByModel, activeModels, setExpertRoleForModel]);

  return (
    <div className={cn(CHAT_SIDE_PANEL_RIGHT, "border-l border-black/5 bg-[linear-gradient(180deg,rgba(250,246,230,0.5)_0%,rgba(245,238,215,0.45)_100%)] backdrop-blur-xl")}>
      <div className={cn(
        "absolute top-0 left-0 w-full h-80 pointer-events-none transition-all duration-1000 ease-in-out z-0",
        activeUniverse === 'defense' 
          ? "bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.12)_0%,rgba(212,175,55,0.04)_50%,transparent_80%)]" 
          : "bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.08)_0%,rgba(0,0,0,0.01)_45%,transparent_75%)]"
      )} />

      <div className="px-6 py-6 pt-6 lg:pt-6 border-b border-black/5 relative z-10 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl glass-prestige group flex items-center justify-center shadow-lg hover:shadow-[0_8px_25px_rgba(212,175,55,0.25)] transition-all duration-500">
                <LexIcon name="ai" size={18} className="text-gold-deep" />
             </div>
             <div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-black italic font-outfit">Strategia AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-1 w-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-primary/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1 w-1 bg-gold-primary"></span>
                  </span>
                  <p className="text-[7px] text-black/60 font-bold uppercase tracking-widest font-mono">Mercury Node v1.1</p>
                </div>
             </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-red-500/5 border border-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/15 hover:border-red-500/30 hover:scale-105 group/close outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          >
             <X size={14} className="group-hover/close:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 p-1 bg-black/5 border border-black/5 rounded-2xl relative shadow-inner mb-4">
          <motion.div 
            layoutId="universe-bg-v2"
            className={cn(
              "absolute inset-1 w-[calc(50%-4px)] h-[calc(100%-8px)] rounded-xl shadow-lg z-0",
              activeUniverse === 'defense' ? "bg-emerald-500/15 shadow-emerald-500/5 border border-emerald-500/20" : "bg-[linear-gradient(135deg,#fffbf0_0%,#fbf4e2_100%)] shadow-[0_4px_12px_rgba(212,175,55,0.08)] border border-gold-primary/10"
            )}
            transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
          />
          <button 
            onClick={() => applyServerPreset('defense', { mode: 'single' })}
            onMouseEnter={() => setHoveredUniverse('defense')}
            onMouseLeave={() => setHoveredUniverse(null)}
            disabled={presetsLoading}
            className={cn("relative z-10 flex items-center justify-center gap-2 py-2 rounded-xl outline-none transition-all duration-300 active:scale-95", activeUniverse === 'defense' ? "text-emerald-950 font-extrabold" : "text-black/35 hover:text-black/60 font-bold")}
          >
            <LexIcon name="shield" size={11} className={activeUniverse === 'defense' ? "opacity-100 text-emerald-700" : "opacity-35"} />
            <span className="text-[9px] uppercase tracking-widest font-outfit">Obrona</span>
          </button>
          <button 
            onClick={() => applyServerPreset('prosecution', { mode: 'single' })}
            onMouseEnter={() => setHoveredUniverse('prosecution')}
            onMouseLeave={() => setHoveredUniverse(null)}
            disabled={presetsLoading}
            className={cn("relative z-10 flex items-center justify-center gap-2 py-2 rounded-xl outline-none transition-all duration-300 active:scale-95", activeUniverse === 'prosecution' ? "text-black font-extrabold" : "text-black/35 hover:text-black/60 font-bold")}
          >
            <LexIcon name="gavel" size={11} className={activeUniverse === 'prosecution' ? "opacity-100 text-black" : "opacity-35"} />
            <span className="text-[9px] uppercase tracking-widest font-outfit">Oskarżenie</span>
          </button>
          
          <AnimatePresence>
            {hoveredUniverse && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 w-full p-4 bg-[linear-gradient(135deg,rgba(255,254,250,0.96)_0%,rgba(251,247,233,0.96)_100%)] backdrop-blur-md border border-gold-primary/15 rounded-2xl shadow-[0_20px_50px_rgba(212,175,55,0.12)] text-left z-50 pointer-events-none text-black"
                style={{
                  borderLeft: hoveredUniverse === 'defense' ? '4px solid #10b981' : '4px solid #d4af37'
                }}
              >
                <p className="text-[9.5px] font-black uppercase tracking-widest text-black mb-1.5 pb-1 border-b border-black/5">
                  Tryb: {hoveredUniverse === 'defense' ? 'Obrona' : 'Oskarżenie'}
                </p>
                <p className="text-[8.5px] leading-relaxed text-black/60 font-semibold uppercase tracking-wider mb-2">
                  {hoveredUniverse === 'defense' 
                    ? 'Koncentruje się na budowaniu strategii obrończej, szukaniu dowodów na korzyść oskarżonego i wytykaniu błędów organów.' 
                    : 'Skupia się na perspektywie prokuratorskiej, analizowaniu znamion czynu zabronionego i budowaniu aktu oskarżenia.'}
                </p>
                <p className="text-[7.5px] leading-relaxed text-emerald-600 font-black uppercase tracking-wider">
                  Wpływ: Przełącza globalne instrukcje dla wszystkich przypisanych ekspertów.
                </p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2 h-2 bg-[#fbf7e9] border-l border-t border-gold-primary/15 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={() => { setMode(activeModels.length > 1 ? 'moa' : 'single'); setIsOpen(false); }} className="prestige-panel-action w-full bg-black/10 border border-black/10 py-3 rounded-xl text-black text-[10px] font-black uppercase tracking-widest hover:bg-black/20 transition-all">
          <span className="-mt-1 block">Aktywuj Strategię</span>
        </button>

        <div className="relative mt-3">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/5 border border-black/5 rounded-2xl relative shadow-inner">
            {responseModeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setResponseMode(opt.id)}
                onMouseEnter={() => setHoveredResponseMode(opt.id)}
                onMouseLeave={() => setHoveredResponseMode(null)}
                className={cn(
                  'w-full py-2 rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all duration-300 outline-none active:scale-95',
                  responseMode === opt.id
                    ? 'bg-[linear-gradient(135deg,#fffbf0_0%,#fbf4e2_100%)] text-black shadow-sm border border-gold-primary/15 font-extrabold'
                    : 'text-black/40 hover:text-black/70 font-semibold',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {hoveredResponseMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 w-full p-4 bg-[linear-gradient(135deg,rgba(255,254,250,0.96)_0%,rgba(251,247,233,0.96)_100%)] backdrop-blur-md border border-gold-primary/15 rounded-2xl shadow-[0_20px_50px_rgba(212,175,55,0.12)] text-left z-50 pointer-events-none text-black"
                style={{
                  borderLeft: '4px solid #d4af37'
                }}
              >
                <p className="text-[9.5px] font-black uppercase tracking-widest text-black mb-1.5 pb-1 border-b border-black/5">
                  Tryb: {responseModeOptions.find(o => o.id === hoveredResponseMode)?.label}
                </p>
                <p className="text-[8.5px] leading-relaxed text-black/60 font-semibold uppercase tracking-wider mb-2">
                  {RESPONSE_MODE_DETAILS[hoveredResponseMode].description}
                </p>
                <p className="text-[7.5px] leading-relaxed text-emerald-600 font-black uppercase tracking-wider">
                  Wpływ: {RESPONSE_MODE_DETAILS[hoveredResponseMode].impact}
                </p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2 h-2 bg-[#fbf7e9] border-l border-t border-gold-primary/15 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-8 relative z-10 custom-scrollbar pb-40 text-black">
        
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
                 {roleList.length === 0 && (
                   <div className="py-6 px-4 text-center glass-liquid-convex bg-white/5 rounded-2xl border border-black/5 mb-2">
                     <p className="text-[9px] font-black uppercase tracking-widest text-black/40 leading-relaxed">
                       {presetsLoading
                         ? 'Ładowanie katalogu ról…'
                         : presetsError
                           ? `Błąd presetów: ${presetsError}`
                           : 'Brak ról — wybierz Obronę lub Oskarżenie powyżej'}
                     </p>
                   </div>
                 )}
                 <div className="grid grid-cols-1 gap-2.5 pt-2">
                   {roleList.map((role) => {
                     const isRoleActiveInState = Object.entries(expertRoleByModel || {}).some(([mid, rid]) => 
                        activeModels.includes(mid) && rid === role.id
                     );
                     const roleColor = role.id === 'defender' ? '#10b981' 
                                     : role.id === 'proceduralist' ? '#3b82f6' 
                                     : role.id === 'constitutionalist' ? '#f59e0b' 
                                     : role.id === 'negotiator' ? '#8b5cf6' 
                                     : '#f43f5e';

                     return (
                       <motion.div 
                         key={role.id} 
                         whileHover={{ y: -2, scale: isRoleActiveInState ? 1.02 : 1.01 }}
                         className={cn(
                           "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-black/5 backdrop-blur-md",
                           isRoleActiveInState ? "z-20 border-black/10" : "opacity-45 grayscale hover:opacity-85 z-10"
                         )}
                         onMouseEnter={(e) => {
                           const rect = e.currentTarget.getBoundingClientRect();
                           setHoveredRolePos({ top: rect.top, left: rect.left });
                           setHoveredRoleId(role.id);
                         }}
                         onMouseLeave={() => setHoveredRoleId(null)}
                         style={{
                           borderLeft: `4px solid ${isRoleActiveInState ? roleColor : 'rgba(0,0,0,0.05)'}`,
                           background: isRoleActiveInState 
                             ? `radial-gradient(circle at 0% 0%, ${roleColor}15 0%, transparent 60%), linear-gradient(145deg, #fffbf2 0%, #f7ecd3 100%)`
                             : `linear-gradient(145deg, rgba(253, 250, 238, 0.75) 0%, rgba(246, 239, 218, 0.6) 100%)`,
                           boxShadow: isRoleActiveInState 
                             ? `0 15px 35px -10px ${roleColor}25, inset 0 1px 0 rgba(255,255,255,0.8)` 
                             : `0 8px 30px rgba(0,0,0,0.01)`
                         }}
                       >
                         <div className={cn(
                           "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all duration-300", 
                           isRoleActiveInState 
                             ? "bg-[#fffdf9] border-black/10 text-black shadow-sm" 
                             : "bg-black/5 border-black/5 text-black/30"
                         )}>
                            <motion.div 
                              whileHover={{ scale: 1.1, rotate: 5 }} 
                              className="flex items-center justify-center"
                            >
                              <LexIcon name={role.lexIcon} size={16} className={isRoleActiveInState ? "opacity-100" : "opacity-50"} />
                            </motion.div>
                         </div>
                         <div className="flex flex-col relative z-10">
                           <span className="text-[10px] font-black uppercase tracking-wider text-black font-outfit">{role.label}</span>
                           <div className="flex items-center gap-1.5 mt-0.5">
                             {isRoleActiveInState ? (
                               <>
                                 <span className="relative flex h-1 w-1">
                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                   <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                                 </span>
                                 <span className="text-[6.5px] font-bold tracking-widest text-emerald-600 font-mono">ACTIVE</span>
                               </>
                             ) : (
                               <>
                                 <span className="w-1 h-1 rounded-full bg-black/20"></span>
                                 <span className="text-[6.5px] font-bold tracking-widest text-black/30 font-mono">STANDBY</span>
                               </>
                             )}
                           </div>
                         </div>
                         {isRoleActiveInState && (
                            <motion.div 
                              initial={{ scale: 0, x: 10 }} 
                              animate={{ scale: 1, x: 0 }} 
                              className="ml-auto relative z-10"
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-sm">
                                  <Check size={8} strokeWidth={4} />
                               </div>
                            </motion.div>
                         )}
                         <AnimatePresence>
                            {hoveredRoleId === role.id && createPortal(
                              <motion.div
                                initial={{ opacity: 0, x: 8, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 8, scale: 0.98 }}
                                className="fixed z-50 bg-[linear-gradient(135deg,rgba(255,254,250,0.96)_0%,rgba(251,247,233,0.96)_100%)] backdrop-blur-md p-4 rounded-2xl shadow-[0_25px_60px_rgba(212,175,55,0.12)] border border-gold-primary/15 pointer-events-none text-black"
                                style={{
                                  top: Math.max(10, hoveredRolePos.top - 20),
                                  left: hoveredRolePos.left - 260,
                                  width: 240,
                                  borderLeft: `4px solid ${roleColor}`
                                }}
                              >
                                <p className="text-[9.5px] leading-none text-black font-black uppercase tracking-widest mb-2.5 pb-2 border-b border-black/5">
                                  {role.label}
                                </p>
                                <p className="text-[8.5px] leading-relaxed text-black/60 font-semibold uppercase tracking-wider mb-2">
                                  {ROLE_DESCRIPTIONS[role.id] || "Brak opisu."}
                                </p>
                                <p className="text-[7.5px] leading-normal text-emerald-600 font-black uppercase tracking-wider">
                                  Wpływ: {ROLE_IMPACTS[role.id] || "Brak opisu wpływu."}
                                </p>
                                <div className="absolute top-8 right-[-5px] w-2.5 h-2.5 bg-[#fbf7e9] border-r border-t border-gold-primary/15 rotate-45" />
                              </motion.div>,
                              document.body
                            )}
                         </AnimatePresence>
                       </motion.div>
                     );
                   })}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </section>

        {taskOptions.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-black/10">
            <button onClick={() => setIsTaskOpen(!isTaskOpen)} className="flex items-center justify-between w-full px-1 group">
              <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-black/50 flex items-center gap-2 group-hover:text-black transition-colors">
                <LexIcon name="prompts" size={10} /> Zadanie AI
              </h4>
              <ChevronDown size={14} className={cn("text-black/40 transition-transform", isTaskOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isTaskOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-visible"
                >
                  <div className="relative">
                    {/* Custom Dropdown Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                      className="w-full p-3.5 rounded-2xl border border-gold-primary/10 bg-[linear-gradient(145deg,rgba(253,250,238,0.85)_0%,rgba(246,239,218,0.75)_100%)] hover:bg-[linear-gradient(145deg,rgba(255,254,250,0.95)_0%,rgba(249,244,228,0.9)_100%)] shadow-[0_4px_20px_rgba(212,175,55,0.04)] text-left flex items-center justify-between transition-all duration-300 z-10 hover:z-999 relative focus:outline-none focus:ring-1 focus:ring-gold-primary/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-lg bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center text-gold-primary">
                          <LexIcon name="prompts" size={10} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-black font-outfit">
                          {taskOptions.find(t => t.id === currentTask)?.label || currentTask}
                        </span>
                      </div>
                      <ChevronDown size={12} className={cn("text-black/40 transition-transform duration-300", isTaskDropdownOpen && "rotate-180")} />
                    </button>

                    {/* Custom Dropdown List */}
                    <AnimatePresence>
                      {isTaskDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsTaskDropdownOpen(false)} />
                          
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            className="absolute top-full left-0 w-full mt-2 bg-[linear-gradient(145deg,#fffdf9_0%,#fbf7e9_100%)] backdrop-blur-md border border-gold-primary/15 rounded-2xl shadow-[0_20px_50px_rgba(212,175,55,0.15)] z-50 max-h-64 overflow-y-auto custom-scrollbar p-1.5"
                          >
                            {taskOptions.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => {
                                  setCurrentTask(task.id);
                                  setIsTaskDropdownOpen(false);
                                }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredTaskPos({ top: rect.top, left: rect.left });
                                  setHoveredTaskId(task.id);
                                }}
                                onMouseLeave={() => setHoveredTaskId(null)}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-between border-l-2 border-transparent",
                                  currentTask === task.id 
                                    ? "bg-gold-primary/15 text-gold-deep border-l-gold-primary font-bold" 
                                    : "text-black/60 hover:text-black hover:bg-black/5 hover:border-l-black/20"
                                )}
                              >
                                <span>{task.label}</span>
                                {currentTask === task.id && <Check size={10} className="text-gold-deep" strokeWidth={4} />}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Floating Tooltip outside the scroll list using Portal */}
                    <AnimatePresence>
                      {isTaskDropdownOpen && hoveredTaskId && createPortal(
                        <motion.div
                          initial={{ opacity: 0, x: 8, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 8, scale: 0.98 }}
                          className="fixed z-[99999] bg-[linear-gradient(135deg,rgba(255,254,250,0.96)_0%,rgba(251,247,233,0.96)_100%)] backdrop-blur-md border border-gold-primary/15 rounded-2xl shadow-[0_25px_60px_rgba(212,175,55,0.12)] text-left pointer-events-none text-black p-4"
                          style={{
                            top: Math.max(10, hoveredTaskPos.top - 20),
                            left: hoveredTaskPos.left - 260,
                            width: 240,
                            borderLeft: '4px solid #d4af37'
                          }}
                        >
                          <p className="text-[9.5px] font-black uppercase tracking-widest text-black mb-1.5 pb-1 border-b border-black/5">
                            Zadanie: {taskOptions.find(t => t.id === hoveredTaskId)?.label}
                          </p>
                          <p className="text-[8.5px] leading-relaxed text-black/60 font-semibold uppercase tracking-wider mb-2">
                            {TASK_DETAILS[hoveredTaskId]?.description || "Brak opisu."}
                          </p>
                          <p className="text-[7.5px] leading-relaxed text-emerald-600 font-black uppercase tracking-wider">
                            Wpływ: {TASK_DETAILS[hoveredTaskId]?.impact || "Brak opisu wpływu."}
                          </p>
                          <div className="absolute top-8 right-[-5px] w-2.5 h-2.5 bg-[#fbf7e9] border-r border-t border-gold-primary/15 rotate-45" />
                        </motion.div>,
                        document.body
                      )}
                    </AnimatePresence>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        <section className="space-y-4 pt-4 border-t border-black/10">
           <button onClick={() => setIsModelsOpen(!isModelsOpen)} className="flex items-center justify-between w-full px-1 group">
             <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-black/50 flex items-center gap-2 group-hover:text-black transition-colors">
               <LexIcon name="ai" size={10} /> Twój Zespół (Modele)
             </h4>
             <ChevronDown size={14} className={cn("text-black/40 transition-transform", isModelsOpen && "rotate-180")} />
           </button>

           <AnimatePresence>
             {isModelsOpen && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-visible space-y-2">
                    {availableModels.length === 0 && (
                        <div className="py-10 flex flex-col items-center justify-center text-center px-4 glass-liquid-convex bg-white/5 rounded-2xl border border-black/5">
                           <LexIcon name="profil" size={24} className="opacity-30 mb-3" />
                           <p className="text-[9px] font-black uppercase tracking-widest text-black/30">
                              Brak wybranych modeli.<br/>
                              Skonfiguruj swój zespół<br/>
                              w ustawieniach profilu.
                           </p>
                        </div>
                     )}
                     {availableModels.map((m) => {
                      const isSelected = activeModels.includes(m.id);
                      const assignedRole = expertRoleByModel?.[m.id] || "";
                      const currentRoleObj = roleList.find(r => r.id === assignedRole);
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
                             className={cn(
                               "flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 w-full relative overflow-hidden border bg-[linear-gradient(145deg,rgba(253,250,238,0.7)_0%,rgba(246,239,218,0.6)_100%)] hover:z-20", 
                               isSelected 
                                 ? "scale-[1.01] border-gold-primary/20 bg-white/95 shadow-[0_10px_30px_rgba(212,175,55,0.08)]" 
                                 : "opacity-40 hover:opacity-95 border-transparent shadow-[0_4px_20px_rgba(212,175,55,0.02)]"
                             )}
                             style={isSelected ? {
                               background: `radial-gradient(circle at 100% 0%, rgba(212,175,55,0.08) 0%, transparent 50%), linear-gradient(145deg, #fffbf5 0%, #fcf5df 100%)`
                             } : {}}
                           >
                               <div className={cn(
                                 "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300", 
                                 isSelected 
                                   ? "bg-black/5 border-black/10 text-black shadow-sm" 
                                   : "text-black/20 border-black/5 bg-black/5"
                               )}>
                                  <LexIcon name="ai" size={13} />
                               </div>
                               <div className="flex-1 min-w-0 flex flex-col text-left relative z-10">
                                  <span className={cn("text-[10px] font-black uppercase truncate tracking-widest text-black font-outfit")}>{m.name}</span>
                                  {health && (
                                    <div className="flex items-center gap-1 mt-1">
                                       <span className="relative flex h-1 w-1">
                                         {health.status === 'online' && (
                                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                         )}
                                         <span className={cn(
                                           "relative inline-flex rounded-full h-1 w-1",
                                           health.status === 'online' ? "bg-emerald-500" : 
                                           health.status === 'degraded' ? "bg-amber-500" :
                                           "bg-red-500"
                                         )}></span>
                                       </span>
                                       <span className={cn(
                                         "text-[6px] font-mono font-bold tracking-wider",
                                         health.status === 'online' ? "text-emerald-600" :
                                         health.status === 'degraded' ? "text-amber-600" :
                                         "text-red-500"
                                       )}>
                                         {health.status === 'online' ? `${health.latency_ms}ms` : 
                                          health.status === 'degraded' ? `${health.latency_ms}ms` : 
                                          'OFFLINE'}
                                       </span>
                                    </div>
                                  )}
                               </div>
                               {isSelected && (
                                 <div className="w-2.5 h-2.5 rounded-full relative z-10 shadow-sm border border-white bg-gold-primary" />
                               )}
                           </button>
                           {isSelected && (
                               <motion.div initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-1 space-y-1.5 overflow-visible">
                                   <div className="relative">
                                       {/* Custom Dropdown Trigger */}
                                       <div className="p-2.5 border border-black/5 bg-black/5 rounded-2xl flex items-center justify-between transition-all duration-300 relative">
                                           <button
                                               type="button"
                                               onClick={() => setActiveRoleDropdownModelId(activeRoleDropdownModelId === m.id ? null : m.id)}
                                               className="bg-transparent text-[8.5px] font-black uppercase tracking-wider outline-none cursor-pointer flex-1 text-left text-black/70 hover:text-black flex items-center justify-between"
                                           >
                                               <span className="font-outfit">{assignedRole ? (translatePromptKey(assignedRole).toUpperCase()) : "PASYWNY OBSERWATOR"}</span>
                                               <ChevronDown size={10} className={cn("text-black/40 transition-transform ml-2 duration-300", activeRoleDropdownModelId === m.id && "rotate-180")} />
                                           </button>
                                           
                                           <div className="relative flex items-center justify-center shrink-0 ml-2">
                                               <button
                                                   type="button"
                                                   onClick={(e) => { e.stopPropagation(); setActiveTooltipModelId(activeTooltipModelId === m.id ? null : m.id); }}
                                                   onMouseEnter={() => setActiveTooltipModelId(m.id)}
                                                   onMouseLeave={() => setActiveTooltipModelId(null)}
                                                   className="text-black/30 hover:text-black transition-colors p-0.5"
                                                   aria-label="Informacje o roli"
                                               >
                                                   <Info size={11} />
                                               </button>
                                               <AnimatePresence>
                                                   {activeTooltipModelId === m.id && (
                                                       <motion.div
                                                           initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                           animate={{ opacity: 1, scale: 1, y: 0 }}
                                                           exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                           className="absolute top-full right-0 mt-2 w-[200px] p-3 bg-[linear-gradient(135deg,rgba(255,254,250,0.96)_0%,rgba(251,247,233,0.96)_100%)] backdrop-blur-md border border-gold-primary/15 rounded-2xl shadow-[0_15px_30px_rgba(212,175,55,0.12)] text-left z-50 pointer-events-none text-black"
                                                       >
                                                           <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                                                               {assignedRole ? translatePromptKey(assignedRole) : "Pasywny Obserwator"}
                                                           </p>
                                                           <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1.5">
                                                               {assignedRole ? (ROLE_DESCRIPTIONS[assignedRole] || "Brak opisu.") : "Model wspiera wnioskowanie i analizę bez wchodzenia w dedykowany spór procesowy."}
                                                           </p>
                                                           <p className="text-[7px] leading-relaxed text-emerald-600 font-black uppercase tracking-wider">
                                                               Wpływ: {assignedRole ? (ROLE_IMPACTS[assignedRole] || "Model działa w trybie ogólnym.") : "Model działa w trybie ogólnym."}
                                                           </p>
                                                           <div className="absolute bottom-full right-2 -mb-px w-2 h-2 bg-[#fbf7e9] border-l border-t border-gold-primary/15 rotate-45" />
                                                       </motion.div>
                                                   )}
                                               </AnimatePresence>
                                           </div>
                                       </div>
 
                                       {/* Custom Dropdown List */}
                                       <AnimatePresence>
                                           {activeRoleDropdownModelId === m.id && (
                                               <>
                                                   <div className="fixed inset-0 z-40" onClick={() => setActiveRoleDropdownModelId(null)} />
                                                   
                                                   <motion.div
                                                       initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                                       animate={{ opacity: 1, y: 0, scale: 1 }}
                                                       exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                                       className="absolute top-full left-0 w-full mt-2 bg-[linear-gradient(145deg,#fffdf9_0%,#fbf7e9_100%)] backdrop-blur-md border border-gold-primary/15 rounded-2xl shadow-[0_20px_50px_rgba(212,175,55,0.15)] z-[100] max-h-64 overflow-y-auto custom-scrollbar p-1.5"
                                                   >
                                                       <button
                                                           type="button"
                                                           onClick={() => {
                                                               setExpertRoleForModel(m.id, "");
                                                               setActiveRoleDropdownModelId(null);
                                                           }}
                                                           onMouseEnter={() => setHoveredRoleId("passive")}
                                                           onMouseLeave={() => setHoveredRoleId(null)}
                                                           className={cn(
                                                               "w-full text-left px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between border-l-2 border-transparent",
                                                               assignedRole === "" ? "bg-gold-primary/15 text-gold-deep border-l-gold-primary" : "text-black/60 hover:text-black hover:bg-black/5"
                                                           )}
                                                       >
                                                           <span>Pasywny Obserwator</span>
                                                           {assignedRole === "" && <Check size={10} strokeWidth={4} className="text-gold-deep" />}
                                                       </button>
                                                       
                                                       {roleList.map((r) => (
                                                           <button
                                                               key={r.id}
                                                               type="button"
                                                               onClick={() => {
                                                                   setExpertRoleForModel(m.id, r.id);
                                                                   setActiveRoleDropdownModelId(null);
                                                               }}
                                                               onMouseEnter={() => setHoveredRoleId(r.id)}
                                                               onMouseLeave={() => setHoveredRoleId(null)}
                                                               className={cn(
                                                                   "w-full text-left px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between border-l-2 border-transparent",
                                                                   assignedRole === r.id ? "bg-gold-primary/15 text-gold-deep border-l-gold-primary" : "text-black/60 hover:text-black hover:bg-black/5"
                                                               )}
                                                           >
                                                               <span>{r.label}</span>
                                                               {assignedRole === r.id && <Check size={10} strokeWidth={4} className="text-gold-deep" />}
                                                           </button>
                                                       ))}
                                                   </motion.div>
                                               </>
                                           )}
                                       </AnimatePresence>
 
                                       {/* Floating Tooltip outside scroll list */}
                                       <AnimatePresence>
                                           {activeRoleDropdownModelId === m.id && hoveredRoleId && (
                                               <motion.div
                                                   initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                   animate={{ opacity: 1, scale: 1, y: 0 }}
                                                   exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                   className="absolute bottom-full left-0 mb-3 w-full p-3.5 bg-[linear-gradient(135deg,rgba(255,254,250,0.96)_0%,rgba(251,247,233,0.96)_100%)] backdrop-blur-md border border-gold-primary/15 rounded-2xl shadow-[0_15px_30px_rgba(212,175,55,0.12)] text-left z-50 pointer-events-none text-black"
                                               >
                                                   <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                                                       Rola: {hoveredRoleId === "passive" ? "Pasywny Obserwator" : (roleList.find(r => r.id === hoveredRoleId)?.label || hoveredRoleId)}
                                                   </p>
                                                   <p className="text-[8px] leading-relaxed text-black/70 font-bold uppercase tracking-wider mb-2">
                                                       {hoveredRoleId === "passive" 
                                                           ? "Model wspiera wnioskowanie i analizę bez wchodzenia w dedykowany spór procesowy."
                                                           : (ROLE_DESCRIPTIONS[hoveredRoleId] || "Brak opisu.")}
                                                   </p>
                                                   <p className="text-[7px] leading-relaxed text-emerald-600 font-black uppercase tracking-wider">
                                                       Wpływ: {hoveredRoleId === "passive"
                                                           ? "Model działa w trybie ogólnym."
                                                           : (ROLE_IMPACTS[hoveredRoleId] || "Brak opisu wpływu.")}
                                                   </p>
                                                   <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[#fbf7e9] border-r border-b border-gold-primary/15 rotate-45" />
                                               </motion.div>
                                           )}
                                       </AnimatePresence>
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
                <div className="w-8 h-8 rounded-xl bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center shadow-lg text-gold-deep"><LexIcon name="judgments" size={16} /></div>
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
                       const health = healthData[m.id];
                       return (
                         <button 
                           key={m.id} 
                           onClick={() => setSelectedJudge(m.id)} 
                           className={cn(
                             "p-3.5 rounded-2xl transition-all duration-300 flex items-center justify-between relative overflow-hidden border", 
                             isFinalJudge 
                               ? "scale-[1.01] border-gold-primary/30 shadow-[0_10px_30px_rgba(212,175,55,0.08)] bg-white/95" 
                               : "opacity-45 hover:opacity-90 border-transparent"
                           )}
                           style={isFinalJudge ? { 
                             background: `radial-gradient(circle at 100% 0%, rgba(212,175,55,0.06) 0%, transparent 60%), linear-gradient(145deg, #fffcf3 0%, #faf1da 100%)`,
                           } : {}}
                         >
                             <div className="flex items-center gap-3 relative z-10">
                                <div className={cn(
                                  "w-7 h-7 rounded-lg shrink-0 border flex items-center justify-center transition-all duration-300", 
                                  isFinalJudge 
                                    ? "bg-gold-primary/10 border-gold-primary/20 text-gold-primary shadow-sm" 
                                    : "bg-black/5 border-black/5 text-black/20"
                                )}><brand.icon size={13} /></div>
                                <div className="flex-1 min-w-0 flex flex-col text-left">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-black font-outfit">{m.name}</span>
                                   {health && (
                                     <div className="flex items-center gap-1 mt-0.5">
                                        <div className={cn(
                                          "w-1 h-1 rounded-full", 
                                          health.status === 'online' ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : 
                                          health.status === 'degraded' ? "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" :
                                          "bg-red-500"
                                        )} />
                                        <span className={cn(
                                          "text-[6px] font-mono font-bold tracking-wider",
                                          health.status === 'online' ? "text-emerald-600" :
                                          health.status === 'degraded' ? "text-amber-600" :
                                          "text-red-500"
                                        )}>
                                          {health.status === 'online' ? `${health.latency_ms}ms` : 
                                           health.status === 'degraded' ? `${health.latency_ms}ms*` : 
                                           'OFFLINE'}
                                        </span>
                                     </div>
                                   )}
                                </div>
                             </div>
                             {isFinalJudge && (
                               <motion.div 
                                 initial={{ scale: 0, rotate: -15 }} 
                                 animate={{ scale: 1, rotate: 0 }} 
                                 className="w-5 h-5 rounded-full bg-gold-primary/15 border border-gold-primary/35 flex items-center justify-center relative z-10 shadow-sm"
                               >
                                 <UserCheck size={9} className="text-gold-deep" strokeWidth={4} />
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
      </div>
    </div>
  );
}
