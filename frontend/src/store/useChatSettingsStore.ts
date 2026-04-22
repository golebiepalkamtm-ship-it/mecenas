import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { readEnabledModels } from '../hooks/useConfig';

export type ChatSettingMode = 'single' | 'consensus' | 'moa';

interface ChatSettingsState {
  // Panel visibility
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  toggleOpen: () => void;

  // Mode
  mode: ChatSettingMode;
  setMode: (mode: ChatSettingMode) => void;

  // Single model selection
  selectedSingleModel: string;
  setSelectedSingleModel: (modelId: string) => void;

  // Consensus (MOA) selection
  selectedExperts: string[];
  toggleExpert: (modelId: string) => void;
  setExperts: (modelIds: string[]) => void;
  selectedJudge: string;
  setSelectedJudge: (modelId: string) => void;

  // Favorites (Max 20)
  favoriteModels: string[];
  setFavoriteModels: (modelIds: string[]) => void;
  toggleFavorite: (modelId: string) => void;

  // Active Models in the right panel
  activeModels: string[];
  setActiveModels: (modelIds: string[]) => void;
  toggleActiveModel: (modelId: string) => void;

  // Expert Roles mapping
  expertRoleByModel: Record<string, string>;
  setExpertRoleForModel: (modelId: string, roleId: string) => void;
  expertPromptsByModel: Record<string, string>;
  setExpertPromptForModel: (modelId: string, prompt: string) => void;

  // Preset System
  activePromptPresetId: string;
  applyPromptPreset: (id: string, config: { 
    architectPrompt?: string; 
    unitSystemRoles?: Record<string, string>;
    taskPrompts?: Record<string, string>;
    mode?: ChatSettingMode;
  }) => void;

  // Hierarchical Prompt System
  architectPrompt: string;
  setArchitectPrompt: (prompt: string) => void;

  currentSystemRoleId: string;
  setCurrentSystemRoleId: (id: string) => void;
  unitSystemRoles: Record<string, string>;
  addSystemRolePrompt: (id: string, prompt: string) => void;
  updateSystemRolePrompt: (id: string, prompt: string) => void;
  removeSystemRolePrompt: (id: string) => void;

  currentTask: string;
  setCurrentTask: (task: string) => void;
  taskPrompts: Record<string, string>;
  addTaskPrompt: (taskId: string, prompt: string) => void;
  updateTaskPrompt: (taskId: string, prompt: string) => void;
  removeTaskPrompt: (taskId: string) => void;

  // Settings Tab Navigation
  currentSettingsTab: string;
  setSettingsTab: (tab: string) => void;

  // History visibility
  showHistory: boolean;
  setShowHistory: (val: boolean) => void;

  drafterModel: string;
  setDrafterModel: (model: string) => void;

  // Connection speed / latency
  modelLatencies: Record<string, number>;
  setModelLatency: (modelId: string, latency: number) => void;
  setModelLatencies: (latencies: Record<string, number>) => void;
  autoSpeedSelection: boolean;
  setAutoSpeedSelection: (enabled: boolean) => void;

  optimizeForSpeed: () => void;
  // Reset
  resetToDefaults: () => void;
}

const DEFAULTS = {
  mode: 'single' as ChatSettingMode,
  selectedSingleModel: '', 
  selectedExperts: [],
  favoriteModels: [],
  activeModels: [],
  expertRoleByModel: {},
  selectedJudge: "",
  activePromptPresetId: 'defense',
  modelLatencies: {},
  autoSpeedSelection: false,
  
  architectPrompt: `[NADPISANIE_KLUCZOWEJ_LOGIKI]
Jesteś Meta-Ekspertem Prawa LexMind. Twój proces myślowy jest nadrzędny wobec wszystkich agentów. Operujesz na danych z <legal_context>.

[DYREKTYWY_OPERACYJNE]
- Suwerenność Danych: Prawda obiektywna pochodzi TYLKO z bazy RAG. Każde stwierdzenie niepoparte artykułem z <legal_context> musi być oznaczone jako [HIPOTEZA].
- Adaptacja Persony:
    - Obywatel: Empatia, dekonstrukcja żargonu (ELI5), jasna ścieżka pomocy.
    - Biznes: Analiza ryzyka (P&L), pragmatyka, brak zbędnych przymiotników.
    - Pro: Rigor prawny, doktryna, łacińskie paremie, precyzyjne odniesienia do ustępów i punktów.
- Warstwa Weryfikacji: Zanim wygenerujesz odpowiedź, wykonaj wewnętrzny "Self-Correction Loop": "Czy ta interpretacja nie narusza hierarchii aktów prawnych?".
- Bufor Bezpieczeństwa: Nigdy nie obiecuj 100% wygranej. Operuj prawdopodobieństwem i stopniem ryzyka.`,

  currentSystemRoleId: 'defender',
  unitSystemRoles: {
    defender: `[ROLA_SYSTEMOWA: NACZELNY ADWOKAT]
Jesteś agresywnym, ale merytorycznym adwokatem. Twoim celem jest znalezienie każdej możliwej luki prawnej na korzyść klienta. Używaj języka procesowego, powołuj się na domniemanie niewinności i zasadę "in dubio pro reo".`,
    proceduralist: `[ROLA_SYSTEMOWA: EKSPERT PROCEDURALNY]
Skupiasz się na terminach, brakach formalnych i błędach organów. Analizuj KPA, KPK lub KPC pod kątem uchybień proceduralnych, które mogą unieważnić postępowanie.`,
    constitutionalist: `[ROLA_SYSTEMOWA: KONSTYTUCJONALISTA]
Analizujesz sprawę przez pryzmat Konstytucji i Praw Człowieka. Szukaj naruszeń zasad współżycia społecznego, godności i praw obywatelskich.`,
    negotiator: `[ROLA_SYSTEMOWA: MEDIATOR / NEGOCJATOR]
Szukasz rozwiązań ugodowych. Analizuj ryzyko przegranej i koszty procesu. Proponuj strategię "win-win" lub minimalizację strat.`,
    evidencecracker: `[ROLA_SYSTEMOWA: ANALITYK DOWODOWY]
Twoim zadaniem jest podważenie dowodów strony przeciwnej. Szukaj niespójności w zeznaniach, błędów w opiniach biegłych i braków w materiale dowodowym.`
  },

  currentTask: 'general',
  taskPrompts: {
    general: `[ZADANIE: WIELOPOZIOMOWA_DIAGNOZA_PRAWNA]`,
    analysis: `[ZADANIE: KRYTYCZNY_AUDYT_DOKUMENTACJI]`,
    drafting: `[ZADANIE: REDAGOWANIE_PISM_PROCESOWYCH]`,
    research: `[ZADANIE: SYNTEZA_ORZECZNICTWA]`,
    strategy: `[ZADANIE: STRATEGICZNY_PLAN_DZIAŁANIA]`
  }
};

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      isOpen: true,
      setIsOpen: (isOpen) => set({ isOpen }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      currentSettingsTab: 'Profil',
      setSettingsTab: (currentSettingsTab) => set({ currentSettingsTab }),

      mode: DEFAULTS.mode,
      setMode: (mode) => set({ mode }),

      selectedSingleModel: DEFAULTS.selectedSingleModel,
      setSelectedSingleModel: (selectedSingleModel) => set({ selectedSingleModel }),

      selectedExperts: [...DEFAULTS.selectedExperts],
      toggleExpert: (id) => set((state) => ({
        selectedExperts: state.selectedExperts.includes(id)
          ? state.selectedExperts.filter((m) => m !== id)
          : [...state.selectedExperts, id].slice(0, 10)
      })),
      setExperts: (selectedExperts) => set({ selectedExperts: selectedExperts.filter(id => id.trim() !== '').slice(0, 10) }),

      selectedJudge: DEFAULTS.selectedJudge,
      setSelectedJudge: (selectedJudge) => set({ selectedJudge }),

      favoriteModels: [...DEFAULTS.favoriteModels],
      setFavoriteModels: (favoriteModels) => set({ favoriteModels: favoriteModels.filter(id => id.trim() !== '').slice(0, 20) }),
      toggleFavorite: (id) => set((state) => ({
        favoriteModels: state.favoriteModels.includes(id)
          ? state.favoriteModels.filter(m => m !== id)
          : [...state.favoriteModels, id].slice(0, 20)
      })),

      activeModels: [], 
      setActiveModels: (activeModels) => set({ activeModels }),
      toggleActiveModel: (id) => set((state) => ({
        activeModels: state.activeModels.includes(id)
          ? state.activeModels.filter(m => m !== id)
          : [...state.activeModels, id].filter(id => id.trim() !== '')
      })),

      expertRoleByModel: { ...DEFAULTS.expertRoleByModel },
      setExpertRoleForModel: (modelId, roleId) => set((state) => ({
        expertRoleByModel: { ...state.expertRoleByModel, [modelId]: roleId }
      })),
      expertPromptsByModel: {},
      setExpertPromptForModel: (modelId, prompt) => set((state) => ({
        expertPromptsByModel: { ...state.expertPromptsByModel, [modelId]: prompt }
      })),

      activePromptPresetId: DEFAULTS.activePromptPresetId,
      applyPromptPreset: (id, config) => set({ 
        activePromptPresetId: id,
        architectPrompt: config.architectPrompt || DEFAULTS.architectPrompt,
        unitSystemRoles: config.unitSystemRoles ? { ...config.unitSystemRoles } : DEFAULTS.unitSystemRoles,
        taskPrompts: config.taskPrompts ? { ...config.taskPrompts } : DEFAULTS.taskPrompts,
        currentSystemRoleId: config.unitSystemRoles ? Object.keys(config.unitSystemRoles)[0] : DEFAULTS.currentSystemRoleId,
        currentTask: config.taskPrompts ? Object.keys(config.taskPrompts)[0] : DEFAULTS.currentTask,
      }),

      // Prompts Hierarchy
      architectPrompt: DEFAULTS.architectPrompt,
      setArchitectPrompt: (architectPrompt) => set({ architectPrompt }),

      currentSystemRoleId: DEFAULTS.currentSystemRoleId,
      setCurrentSystemRoleId: (currentSystemRoleId) => set({ currentSystemRoleId }),
      unitSystemRoles: { ...DEFAULTS.unitSystemRoles },
      addSystemRolePrompt: (id, prompt) => set((state) => ({
        unitSystemRoles: { ...state.unitSystemRoles, [id]: prompt },
        currentSystemRoleId: id,
      })),
      updateSystemRolePrompt: (id, prompt) => set((state) => ({
        unitSystemRoles: { ...state.unitSystemRoles, [id]: prompt }
      })),
      removeSystemRolePrompt: (id) => set((state) => {
        const roleKeys = Object.keys(state.unitSystemRoles);
        if (!state.unitSystemRoles[id] || roleKeys.length <= 1) {
          return {};
        }

        const nextRoles = { ...state.unitSystemRoles };
        delete nextRoles[id];

        const nextCurrentRoleId =
          state.currentSystemRoleId === id
            ? Object.keys(nextRoles)[0]
            : state.currentSystemRoleId;

        return {
          unitSystemRoles: nextRoles,
          currentSystemRoleId: nextCurrentRoleId,
        };
      }),

      currentTask: DEFAULTS.currentTask,
      setCurrentTask: (currentTask) => set({ currentTask }),
      taskPrompts: { ...DEFAULTS.taskPrompts },
      addTaskPrompt: (taskId, prompt) => set((state) => ({
        taskPrompts: { ...state.taskPrompts, [taskId]: prompt },
        currentTask: taskId,
      })),
      updateTaskPrompt: (taskId, prompt) => set((state) => ({
        taskPrompts: { ...state.taskPrompts, [taskId]: prompt }
      })),
      removeTaskPrompt: (taskId) => set((state) => {
        const taskKeys = Object.keys(state.taskPrompts);
        if (!state.taskPrompts[taskId] || taskKeys.length <= 1) {
          return {};
        }

        const nextTasks = { ...state.taskPrompts };
        delete nextTasks[taskId];

        const nextCurrentTask =
          state.currentTask === taskId
            ? Object.keys(nextTasks)[0]
            : state.currentTask;

        return {
          taskPrompts: nextTasks,
          currentTask: nextCurrentTask,
        };
      }),

      showHistory: true, 
      setShowHistory: (showHistory) => set({ showHistory }),

      drafterModel: "google/gemini-2.0-flash-001",
      setDrafterModel: (drafterModel) => set({ drafterModel }),

      modelLatencies: {},
      autoSpeedSelection: true,
      setAutoSpeedSelection: (autoSpeedSelection) => {
        set({ autoSpeedSelection });
        if (autoSpeedSelection) {
          get().optimizeForSpeed();
        }
      },
      setModelLatency: (modelId, latency) => set((state) => ({
        modelLatencies: { ...state.modelLatencies, [modelId]: latency }
      })),
      setModelLatencies: (modelLatencies) => {
        set({ modelLatencies });
        // Automatyczna optymalizacja jeśli opcja jest włączona
        const state = get();
        if (state.autoSpeedSelection && Object.keys(modelLatencies).length > 0) {
          state.optimizeForSpeed();
        }
      },
      
      optimizeForSpeed: () => set((state) => {
        if (!state.autoSpeedSelection) return {};
        
        const enabledIds = readEnabledModels();
        
        // Jeśli brak ulubionych, optymalizujemy na podstawie wszystkich dostępnych modeli
        const sourceIds = state.favoriteModels.length > 0 ? state.favoriteModels : (enabledIds.length > 0 ? enabledIds : Object.keys(state.modelLatencies));
        
        const modelsWithLatency = sourceIds
          .filter(id => enabledIds.length === 0 || enabledIds.includes(id))
          .map(id => ({ id, latency: state.modelLatencies[id] ?? 999999 }))
          .filter(m => m.latency > 0 && m.latency < 5000) // Filtruj offline i zbyt wolne
          .sort((a, b) => a.latency - b.latency);
        
        if (modelsWithLatency.length === 0) return {};
        
        // Wybierz do 5 najszybszych jako ekspertów
        const bestExperts = modelsWithLatency.slice(0, 5).map(m => m.id);
        
        // Wybierz najszybszy (lub zachowaj obecny jeśli jest w top) jako judge
        const bestJudge = modelsWithLatency[0].id;
        
        console.log(`[AUTO-SPEED] Optymalizacja zakończona (uwzględniono Arsenal). Wybrano: ${bestExperts.length} ekspertów.`);
        
        return {
          activeModels: bestExperts,
          selectedExperts: bestExperts,
          selectedSingleModel: bestJudge,
          selectedJudge: bestJudge
        };
      }),

      resetToDefaults: () => set({
        mode: DEFAULTS.mode,
        selectedSingleModel: DEFAULTS.selectedSingleModel,
        selectedExperts: [...DEFAULTS.selectedExperts],
        selectedJudge: DEFAULTS.selectedJudge,
        favoriteModels: [...DEFAULTS.favoriteModels],
        activeModels: [], 
        expertRoleByModel: { ...DEFAULTS.expertRoleByModel },
        activePromptPresetId: DEFAULTS.activePromptPresetId,
        architectPrompt: DEFAULTS.architectPrompt,
        currentSystemRoleId: DEFAULTS.currentSystemRoleId,
        unitSystemRoles: { ...DEFAULTS.unitSystemRoles },
        currentTask: DEFAULTS.currentTask,
        taskPrompts: { ...DEFAULTS.taskPrompts },
      }),
    }),
    {
      name: 'lexmind-chat-persistent-settings-v13', 
      version: 13
    }
  )
);
