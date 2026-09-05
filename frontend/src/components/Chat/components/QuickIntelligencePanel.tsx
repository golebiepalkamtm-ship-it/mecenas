import { useMemo, useEffect, useState, useRef } from 'react';
import { 
  X,
  ChevronDown,
  Sparkles,
  Settings,
  Zap,
  Shield,
  Gavel
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LexIcon, type LexIconName } from '../../Layout/LexIcon';
import { cn } from '../../../utils/cn';
import { useQuickIntelligenceState, useFavoriteModelsState } from '../../../hooks/chatSettingsSelectors';
import { useModels, readEnabledModels } from '../../../hooks/useConfig';


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

    setIsOpen,
    expertRoleByModel,
    activePromptPresetId,
    unitSystemRoles,
    taskPrompts,
    currentTask,
    setCurrentTask,
    responseMode,
    setResponseMode,

  } = useQuickIntelligenceState();

  const [taskModalOpen, setTaskModalOpen] = useState(false);


  const { applyServerPreset, loading: presetsLoading } = usePromptPresets();

  const { data: rawModels = [] } = useModels();
  const { favoriteModels } = useFavoriteModelsState();

  const userAvailableModels = useMemo(() => {
    const adminEnabled = readEnabledModels();
    
    if (favoriteModels && favoriteModels.length > 0) {
      const favSet = new Set(favoriteModels);
      return rawModels
        .filter((m) => favSet.has(m.id) && (adminEnabled.length === 0 || adminEnabled.includes(m.id)))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (adminEnabled.length > 0) {
      const adminSet = new Set(adminEnabled);
      return rawModels
        .filter((m) => adminSet.has(m.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return [...rawModels].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawModels, favoriteModels]);

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
    
  }, [currentTask, activeUniverse, unitSystemRoles, activeModels, expertRoleByModel]);

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
        {taskOptions.length > 0 && (
          <section className="pb-2">
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

        {currentTask ? (
          <section className="pb-6">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2 flex items-center gap-1.5">
               <Settings size={11} /> Zespół Ekspertów ({roleList.length})
             </h4>
             
             <div className="space-y-2">
               {roleList.length === 0 && (
                  <div className="py-6 text-center glass-liquid-convex rounded-2xl px-4 border border-black/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40">
                      Brak ekspertów dla tego zadania.
                    </p>
                  </div>
               )}
               {roleList.map((role) => {
                 const isRoleActiveInState = activeModels.includes(role.id);
                 const assignedModelId = Object.keys(expertRoleByModel || {}).find(mId => (expertRoleByModel || {})[mId] === role.id);
                 const isModelSelected = assignedModelId && assignedModelId !== role.id;
                 
                 return (
                    <Tooltip key={role.id} title={role.label} content={role.description} impact={role.impact} position="top">
                      <div 
                        className={cn(
                          "group flex flex-col p-3 rounded-2xl transition-all duration-500 w-full text-left outline-none",
                          !isRoleActiveInState 
                            ? "bg-black/5 border border-black/10 opacity-70 hover:opacity-100 cursor-pointer hover:border-black/20" 
                            : isModelSelected 
                              ? "btn-convex-prestige active scale-[1.01]" 
                              : "glass-liquid-convex border-t-2 border-t-white/80 border-l-[1.5px] border-l-white/60 border-b-2 border-b-black/30 scale-[1.01]"
                        )}
                      >
                        <div 
                          onClick={() => {
                            toggleActiveModel(role.id);
                            const nextExpertMap = { ...expertRoleByModel };
                            // Zawsze czyśćmy stare przypisania dla tej roli
                            Object.keys(nextExpertMap).forEach(mId => {
                              if (nextExpertMap[mId] === role.id) delete nextExpertMap[mId];
                            });
                            
                            if (!activeModels.includes(role.id)) {
                              // Włączamy: ustaw placeholder, żeby nie świeciło na złoto dopóki użytkownik nie wybierze z listy
                              nextExpertMap[role.id] = role.id;
                            } 
                            // Wyłączamy: rola zostaje po prostu usunięta z mapy
                            
                            useChatSettingsStore.setState({ expertRoleByModel: nextExpertMap });
                          }}
                          className="flex items-center gap-3 w-full cursor-pointer"
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all", 
                            !isRoleActiveInState ? "bg-black/5 border-black/5 text-black/30" : 
                            isModelSelected ? "bg-gold-primary/20 border-gold-primary/40 text-gold-deep shadow-inner" : 
                            "bg-black/10 border-black/10 text-black shadow-inner"
                          )}>
                            <LexIcon name={role.lexIcon} size={14} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-wider truncate block", 
                              !isRoleActiveInState ? "text-black/60" : "text-black"
                            )}>{role.label}</span>
                          </div>
                          {isRoleActiveInState && (
                              <span className={cn(
                                "shrink-0 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-lg border",
                                isModelSelected 
                                  ? "bg-gold-primary/20 text-black border-gold-primary/30" 
                                  : "bg-black/5 text-black/60 border-black/10"
                              )}>
                                {isModelSelected ? "AKTYWNA" : "WYBIERZ MODEL"}
                              </span>
                          )}
                        </div>
                        
                        {isRoleActiveInState && (
                          <div className="mt-2.5 pt-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={Object.keys(expertRoleByModel || {}).find(mId => (expertRoleByModel || {})[mId] === role.id) || role.id}
                              onChange={(e) => {
                                 const newModelId = e.target.value;
                                 const oldModelId = Object.keys(expertRoleByModel || {}).find(mId => (expertRoleByModel || {})[mId] === role.id);
                                 const newMap = { ...(expertRoleByModel || {}) };
                                 if (oldModelId) delete newMap[oldModelId];
                                 if (newModelId) newMap[newModelId] = role.id;
                                 useChatSettingsStore.setState({ expertRoleByModel: newMap });
                              }}
                              className="w-full bg-white/60 border border-black/10 hover:border-gold-primary/40 focus:border-gold-primary rounded-xl px-2 py-1.5 text-[8.5px] font-bold text-black outline-none transition-all cursor-pointer shadow-sm pr-6"
                            >
                              <option value={role.id} disabled>
                                (Domyślny: {
                                  role.id === 'oracle' ? 'Claude Sonnet 5' :
                                  role.id === 'inquisitor' ? 'DeepSeek V4 Pro' :
                                  role.id === 'evidencecracker' ? 'Muse Spark 1.1' :
                                  role.id === 'proceduralist' ? 'GPT-5.6 Terra' :
                                  role.id === 'defender' ? 'Grok 4.3' :
                                  role.id === 'negotiator' ? 'GPT-5.6 Luna' :
                                  role.id === 'constitutionalist' ? 'Gemini 3.1 Pro Preview' :
                                  'Wybierz model AI'
                                })
                              </option>
                              {userAvailableModels.map(m => {
                                const assignedRole = (expertRoleByModel || {})[m.id];
                                const isAssignedToOther = assignedRole && assignedRole !== role.id;
                                
                                const getRoleLabel = (rId: string) => {
                                  return roleList.find(r => r.id === rId)?.label || rId;
                                };

                                return (
                                  <option 
                                    key={m.id} 
                                    value={m.id}
                                    disabled={isAssignedToOther}
                                  >
                                    {m.name} {isAssignedToOther ? `(przypisany: ${getRoleLabel(assignedRole)})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    </Tooltip>
                 );
               })}
             </div>
          </section>
        ) : (
          <section className="pb-6">
            <div className="py-6 text-center glass-liquid-convex rounded-2xl px-4 border border-black/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-black/40">
                Najpierw wybierz Zadanie AI powyżej,<br/>aby dobrać zespół ekspertów.
              </p>
            </div>
          </section>
        )}
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
    </motion.div>
  );
}
