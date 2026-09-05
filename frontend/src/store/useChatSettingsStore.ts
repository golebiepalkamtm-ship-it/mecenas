import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/safeStorage';
import { capLatencies, capRecord, capString } from '../utils/storageLimits';
import { createChatModelSlice } from './chatSettings/slices/modelSlice';
import { createChatPerformanceSlice } from './chatSettings/slices/performanceSlice';
import { createChatPromptSlice } from './chatSettings/slices/promptSlice';
import { createChatRetrievalSlice } from './chatSettings/slices/retrievalSlice';
import { createChatUiSlice } from './chatSettings/slices/uiSlice';
import { DEFAULT_CHAT_SETTINGS, type ChatSettingsState } from './chatSettings/types';

export type {
  ChatSettingMode,
  ChatSettingsState,
  PromptPresetConfig,
  ResponseMode,
} from './chatSettings/types';

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set, get, api) => ({
      ...createChatUiSlice(set, get, api),
      ...createChatModelSlice(set, get, api),
      ...createChatPromptSlice(set, get, api),
      ...createChatRetrievalSlice(set, get, api),
      ...createChatPerformanceSlice(set, get, api),
      resetToDefaults: () => set({
        mode: DEFAULT_CHAT_SETTINGS.mode,
        selectedSingleModel: DEFAULT_CHAT_SETTINGS.selectedSingleModel,
        selectedExperts: [...DEFAULT_CHAT_SETTINGS.selectedExperts],
        selectedJudge: DEFAULT_CHAT_SETTINGS.selectedJudge,
        favoriteModels: [...DEFAULT_CHAT_SETTINGS.favoriteModels],
        recentModelIds: [...DEFAULT_CHAT_SETTINGS.recentModelIds],
        activeModels: [],
        expertRoleByModel: { ...DEFAULT_CHAT_SETTINGS.expertRoleByModel },
        expertPromptsByModel: {},
        activePromptPresetId: DEFAULT_CHAT_SETTINGS.activePromptPresetId,
        architectPrompt: DEFAULT_CHAT_SETTINGS.architectPrompt,
        currentSystemRoleId: DEFAULT_CHAT_SETTINGS.currentSystemRoleId,
        unitSystemRoles: { ...DEFAULT_CHAT_SETTINGS.unitSystemRoles },
        currentTask: DEFAULT_CHAT_SETTINGS.currentTask,
        taskPrompts: { ...DEFAULT_CHAT_SETTINGS.taskPrompts },
        responseMode: DEFAULT_CHAT_SETTINGS.responseMode,
        useSaos: DEFAULT_CHAT_SETTINGS.useSaos,
        useEli: DEFAULT_CHAT_SETTINGS.useEli,
        useRagLegal: DEFAULT_CHAT_SETTINGS.useRagLegal,
        useRagUser: DEFAULT_CHAT_SETTINGS.useRagUser,
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
            responseMode: DEFAULT_CHAT_SETTINGS.responseMode,
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

        return persisted as typeof DEFAULT_CHAT_SETTINGS;
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
        assignedModels: state.assignedModels,
      }),
      storage: createJSONStorage(() => createSafeStorage()),
    }
  )
);
