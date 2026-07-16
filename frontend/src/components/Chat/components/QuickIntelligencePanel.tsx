import { useMemo, useEffect, useState, useRef } from 'react';
import { 
  Check, 
  X,
  ChevronDown,
  Sparkles,
  Settings,
  Zap,
  Shield,
  Gavel
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LexIcon, type LexIconName } from '../../Layout/LexIcon';
import { cn } from '../../../utils/cn';
import { useQuickIntelligenceState } from '../../../hooks/chatSettingsSelectors';
import { useModelHealth } from '../../../hooks/useModelHealth';
import { useSelectableChatModels } from '../../../hooks/useSelectableChatModels';
import { SelectionModal } from '../../UI/SelectionModal';
import { Tooltip } from '../../UI/Tooltip';
import {
  DEFENSE_EXPERT_ROLE_IDS,
  PROSECUTION_EXPERT_ROLE_IDS,
} from '../../../utils/modelSelection';
// import { getBrand } from '../constants';
import { usePromptPresets } from '../../../hooks/usePromptPresets';
import type { ResponseMode } from '../../../store/useChatSettingsStore';
import { CHAT_SIDE_PANEL_RIGHT } from '../../Library/shared';
import { translatePromptKey } from '../../../utils/promptLabels';
import { useChatSettingsStore } from '../../../store/useChatSettingsStore';

const _ROLE_DESCRIPTIONS: Record<string, string> = {
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

const _ROLE_IMPACTS: Record<string, string> = {
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

const _RESPONSE_MODE_DETAILS: Record<ResponseMode, FeatureDetail> = {
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

const _TASK_DETAILS: Record<string, FeatureDetail> = {
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
  general: ['oracle', 'defender', 'proceduralist', 'constitutionalist', 'inquisitor', 'negotiator', 'evidencecracker', 'prosecutor', 'investigator', 'hard_judge', 'forensic_expert', 'sentencing_expert'],
  analysis: ['proceduralist', 'evidencecracker', 'forensic_expert', 'hard_judge', 'oracle', 'investigator', 'defender', 'prosecutor', 'inquisitor'],
  drafting: ['proceduralist', 'oracle', 'defender', 'prosecutor', 'evidencecracker', 'constitutionalist', 'sentencing_expert', 'hard_judge', 'inquisitor', 'negotiator'],
  research: ['oracle', 'constitutionalist', 'investigator', 'sentencing_expert', 'proceduralist', 'inquisitor', 'defender', 'prosecutor', 'forensic_expert', 'evidencecracker'],
  strategy: ['oracle', 'hard_judge', 'negotiator', 'defender', 'prosecutor', 'proceduralist', 'inquisitor', 'investigator', 'evidencecracker', 'constitutionalist', 'sentencing_expert'],
  criminal_defense: ['defender', 'proceduralist', 'evidencecracker', 'constitutionalist', 'sentencing_expert', 'inquisitor', 'negotiator', 'oracle'],
  rights_defense: ['constitutionalist', 'defender', 'oracle', 'negotiator', 'proceduralist', 'inquisitor'],
  document_attack: ['inquisitor', 'evidencecracker', 'proceduralist', 'hard_judge', 'forensic_expert', 'defender', 'prosecutor'],
  emergency_relief: ['proceduralist', 'defender', 'negotiator', 'oracle', 'constitutionalist', 'prosecutor'],
  charge_building: ['prosecutor', 'investigator', 'evidencecracker', 'forensic_expert', 'hard_judge', 'inquisitor', 'sentencing_expert', 'oracle'],
  indictment_review: ['defender', 'inquisitor', 'proceduralist', 'evidencecracker', 'hard_judge', 'prosecutor', 'oracle'],
  sentencing_argument: ['sentencing_expert', 'defender', 'prosecutor', 'negotiator', 'oracle', 'hard_judge', 'constitutionalist'],
  warrant_application: ['prosecutor', 'defender', 'proceduralist', 'hard_judge', 'investigator', 'inquisitor', 'oracle']
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
  } = useQuickIntelligenceState();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [roleModalOpenFor, setRoleModalOpenFor] = useState<string | null>(null);

  const { applyServerPreset, loading: presetsLoading } = usePromptPresets();

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
        description: _ROLE_DESCRIPTIONS[id],
        impact: _ROLE_IMPACTS[id],
        lexIcon: iconMap[id] || 'shield',
        icon: <LexIcon name={iconMap[id] || 'shield'} size={14} />
      }))
      .filter((role) => role.id.trim().length > 0 && (!currentTask || !VALID_ROLES_FOR_TASK[currentTask] || VALID_ROLES_FOR_TASK[currentTask].includes(role.id)));
  }, [unitSystemRoles, activeUniverse, currentTask]);

  const taskOptions = useMemo(() => {
    return Object.keys(taskPrompts)
      .filter((id) => id.trim().length > 0)
      .map((id) => ({ 
        id, 
        label: translatePromptKey(id),
        description: _TASK_DETAILS[id]?.description,
        impact: _TASK_DETAILS[id]?.impact
      }));
  }, [taskPrompts]);

  const { healthData } = useModelHealth();
  const { models: availableModels } = useSelectableChatModels(
    'all',
    favoriteModels,
    '',
    'all',
  );

  const prevTaskRef = useRef(currentTask);

  // Auto-adaptation logic: adapt incompatible roles and adjust model count when task changes
  useEffect(() => {
    // Only adapt strictly when the task itself changes
    const isTaskChange = prevTaskRef.current !== currentTask;
    prevTaskRef.current = currentTask;
    
    if (!currentTask || !VALID_ROLES_FOR_TASK[currentTask] || !expertRoleByModel) return;
    const validRolesForCurrentTask = VALID_ROLES_FOR_TASK[currentTask];
    
    // Get roles that are currently valid and available in the current universe
    const roleOrder = activeUniverse === 'prosecution' ? PROSECUTION_EXPERT_ROLE_IDS : DEFENSE_EXPERT_ROLE_IDS;
    const validAvailableRoles = roleOrder.filter(id => 
      id in unitSystemRoles && validRolesForCurrentTask.includes(id)
    );

    const targetCount = validAvailableRoles.length;
    if (targetCount === 0) return;

    if (!isTaskChange) {
      // If task didn't change, we shouldn't force the count to targetCount.
      // We should allow the user to manually select more/fewer models.
      // But we still need to ensure new models get a role if possible.
      // For simplicity, let's just return and let them manage roles manually,
      // or we could assign the first available role to a newly added model.
      return; 
    }

    // Check if we already match perfectly:
    // 1. Same number of models
    // 2. All active models have valid, distinct roles from validAvailableRoles
    const nextExpertMap = { ...expertRoleByModel };
    let hasChanges = false;
    activeModels.forEach((modelId, index) => {
      const currentRole = expertRoleByModel[modelId];
      if (!currentRole || !(validAvailableRoles as string[]).includes(currentRole)) {
        const assignedRole = validAvailableRoles[index % validAvailableRoles.length] || validAvailableRoles[0];
        if (assignedRole && assignedRole !== currentRole) {
          nextExpertMap[modelId] = assignedRole;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      useChatSettingsStore.setState({
        expertRoleByModel: nextExpertMap,
      });
    }
    
  }, [currentTask, activeUniverse, unitSystemRoles, availableModels, activeModels, expertRoleByModel]);

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      className={cn(CHAT_SIDE_PANEL_RIGHT, "flex flex-col select-none overflow-hidden z-50")}
    >
      <div className="shrink-0 px-5 py-5 border-b border-black/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl glass-prestige flex items-center justify-center shadow-lg">
               <Sparkles size={18} />
             </div>
             <div>
               <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-black italic font-outfit">
                 Strategia AI
               </h3>
               <p className="text-[7px] text-black/60 font-bold uppercase tracking-widest">
                 Wybór taktyki
               </p>
             </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-black/5 border border-black/10 text-black/40 hover:text-black hover:bg-black/10"
          >
             <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-black/5 border border-black/10 rounded-2xl mb-4">
            <Tooltip title="Obrona" content="Wybierz profil obronny. Modele skupią się na ochronie Twoich interesów." impact="Budowanie bezpiecznej linii orzeczniczej." position="top">
              <button 
                onClick={() => applyServerPreset('defense', { mode: 'single' })}
                disabled={presetsLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all",
                  activeUniverse === 'defense' 
                    ? "bg-gold-primary/30 text-black shadow-sm"
                    : "text-black/40 hover:text-black/70"
                )}
              >
                <Shield size={11} />
                <span>Obrona</span>
              </button>
            </Tooltip>
            <Tooltip title="Oskarżenie" content="Wybierz profil oskarżycielski. Modele skupią się na badaniu dowodów i formułowaniu zarzutów." impact="Agresywne szukanie luk prawnych i wymierzanie sankcji." position="top">
              <button 
                onClick={() => applyServerPreset('prosecution', { mode: 'single' })}
                disabled={presetsLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all",
                  activeUniverse === 'prosecution' 
                    ? "bg-gold-primary/30 text-black shadow-sm"
                    : "text-black/40 hover:text-black/70"
                )}
              >
                <Gavel size={11} />
                <span>Oskarżenie</span>
              </button>
            </Tooltip>
        </div>

        <div className="mb-4">
          <Tooltip title="Aktywuj Strategię" content="Zatwierdza wybór i uruchamia tryb pracy z wybraną strategią i ekspertami." impact="Aktywuje wszystkie wybrane ustawienia w czacie." position="top">
            <button 
              onClick={() => { setMode(activeModels.length > 1 ? 'moa' : 'single'); setIsOpen(false); }} 
              className="prestige-panel-action w-full py-3 rounded-xl text-black text-[10px] font-black uppercase tracking-widest"
            >
              <span className="flex items-center justify-center gap-2"><Zap size={12} /> Aktywuj Strategię</span>
            </button>
          </Tooltip>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-black/5 border border-black/10 rounded-2xl">
            {responseModeOptions.map((opt) => (
              <Tooltip key={opt.id} title={`Tryb: ${opt.label}`} content={_RESPONSE_MODE_DETAILS[opt.id]?.description} impact={_RESPONSE_MODE_DETAILS[opt.id]?.impact} position="top">
                <button
                  type="button"
                  onClick={() => setResponseMode(opt.id)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all',
                    responseMode === opt.id 
                      ? "bg-gold-primary/30 text-black shadow-sm"
                      : "text-black/40 hover:text-black/70"
                  )}
                >
                  <span>{opt.label}</span>
                </button>
              </Tooltip>
            ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
        <section>
           <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2 flex items-center gap-1.5">
             <Settings size={11} /> Zespół Ekspertów ({roleList.length})
           </h4>
           
           <div className="space-y-2">
             {roleList.length === 0 && (
                <div className="py-6 text-center glass-liquid-convex rounded-2xl px-4 border border-black/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-black/40">
                    Wybierz Obronę lub Oskarżenie aby załadować role.
                  </p>
                </div>
             )}
             {roleList.map((role) => {
               const isRoleActiveInState = Object.entries(expertRoleByModel || {}).some(([mid, rid]) => 
                  activeModels.includes(mid) && rid === role.id
               );
               return (
                 <Tooltip key={role.id} title={role.label} content={role.description} impact={role.impact} position="top">
                   <motion.div 
                     layout
                     className={cn(
                       "group flex items-center gap-3 p-3 rounded-2xl transition-all duration-500 w-full",
                       isRoleActiveInState ? "glass-liquid-convex border border-gold-primary/20 scale-[1.01]" : "bg-black/5 border border-black/10 opacity-70 hover:opacity-100"
                     )}
                   >
                     <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", isRoleActiveInState ? "bg-black/10 border-black/10 text-black" : "bg-black/5 border-black/5 text-black/30")}>
                       <LexIcon name={role.lexIcon} size={14} />
                     </div>
                     <div className="flex-1 min-w-0 text-left">
                       <span className={cn("text-[9px] font-black uppercase tracking-wider truncate", isRoleActiveInState ? "text-black" : "text-black/60")}>{role.label}</span>
                     </div>
                     {isRoleActiveInState && (
                         <span className="shrink-0 text-[7px] font-bold tracking-widest uppercase bg-gold-primary/20 text-black px-2 py-0.5 rounded-lg border border-gold-primary/30">AKTYWNA</span>
                     )}
                   </motion.div>
                 </Tooltip>
               );
             })}
           </div>
        </section>

        {taskOptions.length > 0 && (
          <section>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Zadanie AI</h4>
             <Tooltip 
               title="Zadanie AI" 
               content={currentTask ? taskOptions.find(o => o.id === currentTask)?.description : 'Kliknij, aby wybrać zadanie.'} 
               impact={currentTask ? taskOptions.find(o => o.id === currentTask)?.impact : undefined}
               position="top"
             >
               <button
                 onClick={() => setTaskModalOpen(true)}
                 className="w-full flex items-center justify-between bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-left transition-all hover:bg-black/10"
               >
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-wider text-black block">
                     {currentTask ? taskOptions.find(o => o.id === currentTask)?.label : "Wybierz zadanie..."}
                   </span>
                 </div>
                 <ChevronDown size={14} className="text-black/40" />
               </button>
             </Tooltip>
          </section>
        )}

        <section>
           <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Dobór Modeli ({availableModels.length})</h4>

           <div className="space-y-2">
             {availableModels.length === 0 && (
                <div className="py-6 text-center glass-liquid-convex rounded-2xl px-4 border border-black/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-black/40">Brak dostępnych modeli.</p>
                </div>
             )}
             {availableModels.map((m) => {
               const isSelected = activeModels.includes(m.id);
               const assignedRole = expertRoleByModel?.[m.id] || "";
               const health = healthData[m.id];

               return (
                <div key={m.id} className={cn("rounded-2xl transition-all duration-500 overflow-hidden", isSelected ? "glass-liquid-convex border border-gold-primary/20 scale-[1.01]" : "bg-black/5 border border-black/10 opacity-70 hover:opacity-100")}>
                    <Tooltip title={m.name} content={`Kliknij, aby włączyć lub wyłączyć ten model. Stan serwera: ${health?.status || 'Nieznany'}.`} impact="Modele połączone debacie tworzą potężne konsylium MOA." position="top">
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
                        className="flex items-center gap-3 p-3 w-full text-left outline-none"
                      >
                         <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors border", isSelected ? "bg-gold-primary text-black border-gold-primary/50" : "bg-transparent border-black/20 text-transparent")}>
                           <Check size={12} strokeWidth={3} />
                         </div>
                         <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border", isSelected ? "bg-black/10 border-black/10 text-black" : "bg-black/5 border-black/5 text-black/30")}>
                           <LexIcon name="ai" size={14} />
                         </div>
                         <span className={cn("text-[9px] uppercase font-black tracking-wider truncate flex-1", isSelected ? "text-black" : "text-black/60")}>{m.name}</span>
                         {health && (
                           <div className={cn("text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-lg border", 
                              health.status === 'online' ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : 
                              health.status === 'degraded' ? "bg-amber-500/10 text-amber-700 border-amber-500/20" : "bg-red-500/10 text-red-700 border-red-500/20"
                           )}>
                             {health.status === 'online' ? `${health.latency_ms}ms` : health.status === 'degraded' ? `${health.latency_ms}ms` : 'OFF'}
                           </div>
                         )}
                      </button>
                    </Tooltip>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3"
                      >
                        <div className="flex items-center gap-2 bg-black/5 border border-black/10 rounded-xl p-2 relative z-10">
                          <span className="text-[9px] font-black text-black/50 px-1 uppercase tracking-widest">Rola</span>
                          <div className="flex-1">
                            <Tooltip 
                              title="Przypisana Rola" 
                              content={roleList.find(r => r.id === assignedRole)?.description || 'Model pracuje bez przypisanej sztywnej roli.'} 
                              impact={roleList.find(r => r.id === assignedRole)?.impact}
                              position="top"
                            >
                              <button
                                onClick={() => setRoleModalOpenFor(m.id)}
                                className="w-full flex items-center justify-between bg-black/5 border border-black/10 rounded-lg px-2 py-1.5 text-left hover:bg-black/10 transition-colors"
                              >
                                <span className="text-[9px] font-black uppercase tracking-wider text-black truncate">
                                  {assignedRole ? roleList.find(r => r.id === assignedRole)?.label : "-- Pasywny Obserwator --"}
                                </span>
                                <ChevronDown size={10} className="text-black/40 shrink-0" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
               );
             })}
           </div>
        </section>

        <section className="pb-6">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Główny Arbiter</h4>

           <div className="space-y-2">
             {availableModels.map(m => {
               const isFinalJudge = selectedJudge === m.id;
               return (
                 <Tooltip key={m.id} title={`Arbiter: ${m.name}`} content="Ten model będzie zarządzał podsumowaniem pracy całego zespołu." impact="Wydaje werdykt i skleja argumenty w jeden spójny dokument." position="top">
                   <button 
                     onClick={() => setSelectedJudge(m.id)} 
                     className={cn(
                       "flex items-center gap-3 p-3 w-full text-left outline-none rounded-2xl border transition-all duration-500", 
                       isFinalJudge ? "glass-liquid-convex border-emerald-500/30 scale-[1.01]" : "bg-black/5 border-black/10 opacity-70 hover:opacity-100"
                     )}
                   >
                       <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all", isFinalJudge ? "border-emerald-500 bg-emerald-500/10" : "border-black/20 bg-transparent")}>
                         {isFinalJudge && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                       </div>
                       <span className={cn("text-[9px] uppercase font-black tracking-wider truncate flex-1", isFinalJudge ? "text-black" : "text-black/60")}>{m.name}</span>
                   </button>
                 </Tooltip>
               );
             })}
           </div>
        </section>
      </div>

      {/* Modals */}
      <SelectionModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Zadanie AI"
        subtitle="Określ główny problem lub działanie do zrealizowania"
        options={taskOptions}
        value={currentTask || ""}
        onChange={setCurrentTask}
      />

      <SelectionModal
        isOpen={!!roleModalOpenFor}
        onClose={() => setRoleModalOpenFor(null)}
        title="Rola Eksperta"
        subtitle="Zmień specjalizację i zachowanie tego modelu w dyskusji"
        options={[
          { id: '', label: '-- Pasywny Obserwator --', description: 'Model jedynie przysłuchuje się debacie i asystuje. Włączy się tylko zapytany wprost przez arbitra.', impact: 'Neutralny.' },
          ...roleList
        ]}
        value={roleModalOpenFor ? (expertRoleByModel?.[roleModalOpenFor] || "") : ""}
        onChange={(val) => {
          if (roleModalOpenFor) setExpertRoleForModel(roleModalOpenFor, val);
        }}
      />
    </motion.div>
  );
}
