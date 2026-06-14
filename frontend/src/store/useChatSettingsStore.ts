import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { readEnabledModels } from '../hooks/useConfig';
import { createSafeStorage } from '../utils/safeStorage';
import {
  dedupeModelIds,
  filterFavoritesForAdminPool,
  intersectModelIds,
  MAX_MOA_ACTIVE_MODELS,
  MAX_USER_FAVORITE_MODELS,
} from '../utils/modelSelection';
import { capLatencies, capRecord, capString } from '../utils/storageLimits';

export type ChatSettingMode = 'single' | 'consensus' | 'moa';
export type ResponseMode = 'citizen' | 'strategic' | 'draft';

interface ChatSettingsState {
  // Panel visibility
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  toggleOpen: () => void;

  // Mode
  mode: ChatSettingMode;
  setMode: (mode: ChatSettingMode) => void;

  /** Styl odpowiedzi końcowej (sędzia) */
  responseMode: ResponseMode;
  setResponseMode: (mode: ResponseMode) => void;

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

  // Recent models (orchestrator UI)
  recentModelIds: string[];
  addRecentModel: (modelId: string) => void;

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

  useSaos: boolean;
  setUseSaos: (enabled: boolean) => void;
  useEli: boolean;
  setUseEli: (enabled: boolean) => void;
  useRagLegal: boolean;
  setUseRagLegal: (enabled: boolean) => void;
  useRagUser: boolean;
  setUseRagUser: (enabled: boolean) => void;

  optimizeForSpeed: () => void;
  // Reset
  resetToDefaults: () => void;
}

const DEFAULTS = {
  mode: 'single' as ChatSettingMode,
  responseMode: 'strategic' as ResponseMode,
  selectedSingleModel: 'google/gemini-2.5-flash-lite',
  selectedExperts: [] as string[],
  selectedJudge: "google/gemini-2.5-flash-lite",
  favoriteModels: [] as string[],
  recentModelIds: [] as string[],
  activeModels: [] as string[],
  expertRoleByModel: {} as Record<string, string>,
  activePromptPresetId: 'defense',
  modelLatencies: {},
  autoSpeedSelection: false,

  useSaos: true,
  useEli: true,
  useRagLegal: true,
  useRagUser: true,
  
  /** Puste = backend (orchestrator.py) używa domyślnego promptu doradztwa strategicznego LexMind */
  architectPrompt: '',

  currentSystemRoleId: '',
  unitSystemRoles: {} as Record<string, string>,

  currentTask: 'general',
  taskPrompts: {} as Record<string, string>,
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

      responseMode: DEFAULTS.responseMode,
      setResponseMode: (responseMode) => set({ responseMode }),

      selectedSingleModel: DEFAULTS.selectedSingleModel,
      setSelectedSingleModel: (selectedSingleModel) => set({ selectedSingleModel }),

      selectedExperts: [...DEFAULTS.selectedExperts],
      toggleExpert: (id) => set((state) => {
        const nextExperts = state.selectedExperts.includes(id)
          ? state.selectedExperts.filter((m) => m !== id)
          : dedupeModelIds([...state.selectedExperts, id]).slice(0, MAX_MOA_ACTIVE_MODELS);
        return {
          selectedExperts: nextExperts,
          activeModels: nextExperts
        };
      }),
      setExperts: (selectedExperts) => {
        const nextExperts = dedupeModelIds(selectedExperts).slice(0, MAX_MOA_ACTIVE_MODELS);
        set({ 
          selectedExperts: nextExperts,
          activeModels: nextExperts
        });
      },

      selectedJudge: DEFAULTS.selectedJudge,
      setSelectedJudge: (selectedJudge) => set({ selectedJudge }),

      favoriteModels: [...DEFAULTS.favoriteModels],
      setFavoriteModels: (favoriteModels) => {
        const next = dedupeModelIds(favoriteModels).slice(0, MAX_USER_FAVORITE_MODELS);
        const adminIds = readEnabledModels();
        const { visible } = filterFavoritesForAdminPool(next, adminIds);
        const active = intersectModelIds(get().activeModels, visible.length > 0 ? visible : next);
        set({
          favoriteModels: next,
          activeModels: active,
          selectedExperts: active,
        });
      },
      toggleFavorite: (id) => set((state) => {
        const next = state.favoriteModels.includes(id)
          ? state.favoriteModels.filter((m) => m !== id)
          : dedupeModelIds([...state.favoriteModels, id]).slice(0, MAX_USER_FAVORITE_MODELS);
        const active = state.activeModels.filter((m) => next.includes(m));
        return {
          favoriteModels: next,
          activeModels: active,
          selectedExperts: active,
        };
      }),

      recentModelIds: [...DEFAULTS.recentModelIds],
      addRecentModel: (id) =>
        set((state) => ({
          recentModelIds: [id, ...state.recentModelIds.filter((m) => m !== id)].slice(0, 10),
        })),

      activeModels: [...DEFAULTS.activeModels], 
      setActiveModels: (activeModels) => set({ 
        activeModels,
        selectedExperts: activeModels
      }),
      toggleActiveModel: (id) => set((state) => {
        const nextActive = state.activeModels.includes(id)
          ? state.activeModels.filter(m => m !== id)
          : dedupeModelIds([...state.activeModels, id]).slice(0, MAX_MOA_ACTIVE_MODELS);
        return {
          activeModels: nextActive,
          selectedExperts: nextActive
        };
      }),

      expertRoleByModel: { ...DEFAULTS.expertRoleByModel },
      setExpertRoleForModel: (modelId, roleId) => set((state) => ({
        expertRoleByModel: { ...state.expertRoleByModel, [modelId]: roleId }
      })),
      expertPromptsByModel: {},
      setExpertPromptForModel: (modelId, prompt) => set((state) => ({
        expertPromptsByModel: { ...state.expertPromptsByModel, [modelId]: prompt }
      })),

      activePromptPresetId: DEFAULTS.activePromptPresetId,
      applyPromptPreset: (id, config = {}) => set({
        activePromptPresetId: id,
        architectPrompt: config.architectPrompt ?? '',
        unitSystemRoles: config.unitSystemRoles ? { ...config.unitSystemRoles } : {},
        taskPrompts: config.taskPrompts ? { ...config.taskPrompts } : {},
        expertPromptsByModel: {},
        currentSystemRoleId: config.unitSystemRoles && Object.keys(config.unitSystemRoles).length > 0
          ? Object.keys(config.unitSystemRoles)[0]
          : '',
        currentTask: config.taskPrompts && Object.keys(config.taskPrompts).length > 0
          ? Object.keys(config.taskPrompts)[0]
          : DEFAULTS.currentTask,
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

      drafterModel: "local/gpt-oss-20b",
      setDrafterModel: (drafterModel) => set({ drafterModel }),

      modelLatencies: {},
      autoSpeedSelection: false, // Włączone domyślnie niszczyło ręczny wybór modeli użytkownika
      setAutoSpeedSelection: (autoSpeedSelection) => {
        set({ autoSpeedSelection });
        if (autoSpeedSelection) {
          get().optimizeForSpeed();
        }
      },

      useSaos: DEFAULTS.useSaos,
      setUseSaos: (useSaos) => set({ useSaos }),
      useEli: DEFAULTS.useEli,
      setUseEli: (useEli) => set({ useEli }),
      useRagLegal: DEFAULTS.useRagLegal,
      setUseRagLegal: (useRagLegal) => set({ useRagLegal }),
      useRagUser: DEFAULTS.useRagUser,
      setUseRagUser: (useRagUser) => set({ useRagUser }),
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
        recentModelIds: [...DEFAULTS.recentModelIds],
        activeModels: [],
        expertRoleByModel: { ...DEFAULTS.expertRoleByModel },
        expertPromptsByModel: {},
        activePromptPresetId: DEFAULTS.activePromptPresetId,
        architectPrompt: DEFAULTS.architectPrompt,
        currentSystemRoleId: DEFAULTS.currentSystemRoleId,
        unitSystemRoles: { ...DEFAULTS.unitSystemRoles },
        currentTask: DEFAULTS.currentTask,
        taskPrompts: { ...DEFAULTS.taskPrompts },
        responseMode: DEFAULTS.responseMode,
        useSaos: DEFAULTS.useSaos,
        useEli: DEFAULTS.useEli,
        useRagLegal: DEFAULTS.useRagLegal,
        useRagUser: DEFAULTS.useRagUser,
      }),
    }),
    {
      name: 'lexmind-chat-persistent-settings-v20',
      version: 22,
      migrate: (persisted, version) => {
        const state = { ...(persisted as Record<string, unknown>) };
        const replaceDeprecated = (id: unknown): string => {
          const s = String(id ?? '');
          if (s === 'anthropic/claude-3.5-sonnet' || s === 'anthropic/claude-3-sonnet') {
            return 'google/gemini-2.5-flash';
          }
          return s;
        };

        if (version < 18) {
          return {
            ...state,
            architectPrompt: '',
            unitSystemRoles: {},
            taskPrompts: {},
            expertPromptsByModel: {},
            expertRoleByModel: {},
            activePromptPresetId: 'default',
            currentSystemRoleId: '',
          };
        }

        if (version < 19) {
          const experts = Array.isArray(state.selectedExperts)
            ? (state.selectedExperts as string[]).map(replaceDeprecated)
            : [];
          const uniqueExperts = [...new Set(experts.filter(Boolean))];
          return {
            ...state,
            selectedSingleModel: replaceDeprecated(state.selectedSingleModel),
            selectedJudge: replaceDeprecated(state.selectedJudge),
            selectedExperts: uniqueExperts,
            activeModels: Array.isArray(state.activeModels)
              ? (state.activeModels as string[]).map(replaceDeprecated)
              : uniqueExperts,
            favoriteModels: Array.isArray(state.favoriteModels)
              ? (state.favoriteModels as string[]).map(replaceDeprecated)
              : state.favoriteModels,
          };
        }

        if (version < 20) {
          return {
            ...state,
            responseMode: DEFAULTS.responseMode,
          };
        }

        if (version < 21) {
          let recentModelIds = Array.isArray(state.recentModelIds)
            ? (state.recentModelIds as string[])
            : [];
          try {
            const raw = localStorage.getItem('lexmind-orchestrator');
            if (raw) {
              const orch = JSON.parse(raw) as { state?: { recentModelIds?: string[]; favoriteModelIds?: string[] } };
              if (orch.state?.recentModelIds?.length) {
                recentModelIds = orch.state.recentModelIds;
              }
              if (
                (!state.favoriteModels || (state.favoriteModels as string[]).length === 0) &&
                orch.state?.favoriteModelIds?.length
              ) {
                return {
                  ...state,
                  recentModelIds,
                  favoriteModels: orch.state.favoriteModelIds,
                };
              }
            }
          } catch {
            /* ignore */
          }
          return { ...state, recentModelIds };
        }

        if (version < 22) {
          // v22: Użytkownik sam wybiera ekspertów — czyścimy automatycznie przypisane.
          return {
            ...state,
            activeModels: [],
            selectedExperts: [],
            expertRoleByModel: {},
          };
        }

        return persisted as typeof DEFAULTS;
      },
      partialize: (state) => ({
        mode: state.mode,
        responseMode: state.responseMode,
        selectedSingleModel: state.selectedSingleModel,
        selectedExperts: state.selectedExperts,
        selectedJudge: state.selectedJudge,
        favoriteModels: state.favoriteModels,
        recentModelIds: state.recentModelIds,
        activeModels: state.activeModels,
        expertRoleByModel: state.expertRoleByModel,
        expertPromptsByModel: capRecord(state.expertPromptsByModel),
        activePromptPresetId: state.activePromptPresetId,
        architectPrompt: capString(state.architectPrompt),
        currentSystemRoleId: state.currentSystemRoleId,
        unitSystemRoles: capRecord(state.unitSystemRoles),
        currentTask: state.currentTask,
        taskPrompts: capRecord(state.taskPrompts),
        showHistory: state.showHistory,
        drafterModel: state.drafterModel,
        modelLatencies: capLatencies(state.modelLatencies),
        autoSpeedSelection: state.autoSpeedSelection,
        useSaos: state.useSaos,
        useEli: state.useEli,
        useRagLegal: state.useRagLegal,
        useRagUser: state.useRagUser,
      }),
      storage: createJSONStorage(() => createSafeStorage()),
    }
  )
);
