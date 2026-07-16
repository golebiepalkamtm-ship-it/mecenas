import { readEnabledModels } from '../../../hooks/useConfig';
import {
  DEFAULT_CHAT_SETTINGS,
  type ChatPerformanceSettingsState,
  type ChatSettingsSliceCreator,
} from '../types';

export const createChatPerformanceSlice: ChatSettingsSliceCreator<ChatPerformanceSettingsState> = (set, get) => ({
  modelLatencies: {},
  setModelLatency: (modelId, latency) =>
    set((state) => ({
      modelLatencies: { ...state.modelLatencies, [modelId]: latency },
    })),
  setModelLatencies: (modelLatencies) => {
    set({ modelLatencies });
    const state = get();
    if (state.autoSpeedSelection && Object.keys(modelLatencies).length > 0) {
      state.optimizeForSpeed();
    }
  },
  autoSpeedSelection: DEFAULT_CHAT_SETTINGS.autoSpeedSelection,
  setAutoSpeedSelection: (autoSpeedSelection) => {
    set({ autoSpeedSelection });
    if (autoSpeedSelection) {
      get().optimizeForSpeed();
    }
  },
  optimizeForSpeed: () =>
    set((state) => {
      if (!state.autoSpeedSelection) return {};

      const enabledIds = readEnabledModels();
      const sourceIds =
        state.favoriteModels.length > 0
          ? state.favoriteModels
          : enabledIds.length > 0
            ? enabledIds
            : Object.keys(state.modelLatencies);

      const modelsWithLatency = sourceIds
        .filter((id) => enabledIds.length === 0 || enabledIds.includes(id))
        .map((id) => ({ id, latency: state.modelLatencies[id] ?? 999999 }))
        .filter((model) => model.latency > 0 && model.latency < 5000)
        .sort((a, b) => a.latency - b.latency);

      if (modelsWithLatency.length === 0) return {};

      const bestExperts = modelsWithLatency.slice(0, 5).map((model) => model.id);
      const bestJudge = modelsWithLatency[0].id;

      console.log(
        `[AUTO-SPEED] Optymalizacja zakończona (uwzględniono Arsenal). Wybrano: ${bestExperts.length} ekspertów.`,
      );

      return {
        activeModels: bestExperts,
        selectedExperts: bestExperts,
        selectedSingleModel: bestJudge,
        selectedJudge: bestJudge,
      };
    }),
});
