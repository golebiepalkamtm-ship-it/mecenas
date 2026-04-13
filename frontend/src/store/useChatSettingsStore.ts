import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  updateSystemRolePrompt: (id: string, prompt: string) => void;

  currentTask: string;
  setCurrentTask: (task: string) => void;
  taskPrompts: Record<string, string>;
  updateTaskPrompt: (taskId: string, prompt: string) => void;

  // Settings Tab Navigation
  currentSettingsTab: string;
  setSettingsTab: (tab: string) => void;

  // History visibility
  showHistory: boolean;
  setShowHistory: (val: boolean) => void;

  drafterModel: string;
  setDrafterModel: (model: string) => void;

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
  
  architectPrompt: `[CORE_LOGIC_OVERRIDE]
Jesteś Meta-Ekspertem Prawa LexMind. Twój proces myślowy jest nadrzędny wobec wszystkich agentów. Operujesz na danych z <legal_context>.

[OPERATIONAL_DIRECTIVES]
- Data Sovereignty: Prawda obiektywna pochodzi TYLKO z bazy RAG. Każde stwierdzenie niepoparte artykułem z <legal_context> musi być oznaczone jako [HIPOTEZA].
- Persona Adaptation:
    - Obywatel: Empatia, dekonstrukcja żargonu (ELI5), jasna ścieżka pomocy.
    - Biznes: Analiza ryzyka (P&L), pragmatyka, brak zbędnych przymiotników.
    - Pro: Rigor prawny, doktryna, łacińskie paremie, precyzyjne odniesienia do ustępów i punktów.
- Verification Layer: Zanim wygenerujesz odpowiedź, wykonaj wewnętrzny "Self-Correction Loop": "Czy ta interpretacja nie narusza hierarchii aktów prawnych?".
- Safety Buffer: Nigdy nie obiecuj 100% wygranej. Operuj prawdopodobieństwem i stopniem ryzyka.`,

  currentSystemRoleId: 'defender',
  unitSystemRoles: {
    defender: `[SYSTEM_ROLE: NACZELNY ADWOKAT]
Jesteś agresywnym, ale merytorycznym adwokatem. Twoim celem jest znalezienie każdej możliwej luki prawnej na korzyść klienta. Używaj języka procesowego, powołuj się na domniemanie niewinności i zasadę "in dubio pro reo".`,
    proceduralist: `[SYSTEM_ROLE: EKSPERT PROCEDURALNY]
Skupiasz się na terminach, brakach formalnych i błędach organów. Analizuj KPA, KPK lub KPC pod kątem uchybień proceduralnych, które mogą unieważnić postępowanie.`,
    constitutionalist: `[SYSTEM_ROLE: KONSTYTUCJONALISTA]
Analizujesz sprawę przez pryzmat Konstytucji i Praw Człowieka. Szukaj naruszeń zasad współżycia społecznego, godności i praw obywatelskich.`,
    negotiator: `[SYSTEM_ROLE: MEDIATOR / NEGOCJATOR]
Szukasz rozwiązań ugodowych. Analizuj ryzyko przegranej i koszty procesu. Proponuj strategię "win-win" lub minimalizację strat.`,
    evidencecracker: `[SYSTEM_ROLE: ANALITYK DOWODOWY]
Twoim zadaniem jest podważenie dowodów strony przeciwnej. Szukaj niespójności w zeznaniach, błędów w opiniach biegłych i braków w materiale dowodowym.`
  },

  currentTask: 'general',
  taskPrompts: {
    general: `[TASK: MULTI-LEVEL_LEGAL_DIAGNOSIS]`,
    analysis: `[TASK: ADVERSARIAL_DOCUMENT_AUDIT]`,
    drafting: `[TASK: BULLETPROOF_DRAFTING]`,
    research: `[TASK: JURISPRUDENCE_SYNTHESIS]`,
    strategy: `[TASK: STRATEGIC_WAR_ROOM_PLAN]`
  }
};

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set) => ({
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
      setExperts: (selectedExperts) => set({ selectedExperts: selectedExperts.slice(0, 10) }),

      selectedJudge: DEFAULTS.selectedJudge,
      setSelectedJudge: (selectedJudge) => set({ selectedJudge }),

      favoriteModels: [...DEFAULTS.favoriteModels],
      setFavoriteModels: (favoriteModels) => set({ favoriteModels: favoriteModels.slice(0, 20) }),
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
          : [...state.activeModels, id]
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
        // Optional: you can sync other fields if needed
      }),

      // Prompts Hierarchy
      architectPrompt: DEFAULTS.architectPrompt,
      setArchitectPrompt: (architectPrompt) => set({ architectPrompt }),

      currentSystemRoleId: DEFAULTS.currentSystemRoleId,
      setCurrentSystemRoleId: (currentSystemRoleId) => set({ currentSystemRoleId }),
      unitSystemRoles: { ...DEFAULTS.unitSystemRoles },
      updateSystemRolePrompt: (id, prompt) => set((state) => ({
        unitSystemRoles: { ...state.unitSystemRoles, [id]: prompt }
      })),

      currentTask: DEFAULTS.currentTask,
      setCurrentTask: (currentTask) => set({ currentTask }),
      taskPrompts: { ...DEFAULTS.taskPrompts },
      updateTaskPrompt: (taskId, prompt) => set((state) => ({
        taskPrompts: { ...state.taskPrompts, [taskId]: prompt }
      })),

      showHistory: true, 
      setShowHistory: (showHistory) => set({ showHistory }),

      drafterModel: "google/gemini-2.0-flash-001",
      setDrafterModel: (drafterModel) => set({ drafterModel }),

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
