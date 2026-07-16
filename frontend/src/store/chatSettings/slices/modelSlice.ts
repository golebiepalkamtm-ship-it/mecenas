import { readEnabledModels } from '../../../hooks/useConfig';
import {
  dedupeModelIds,
  filterFavoritesForAdminPool,
  intersectModelIds,
  MAX_MOA_ACTIVE_MODELS,
  MAX_USER_FAVORITE_MODELS,
} from '../../../utils/modelSelection';
import { DEFAULT_CHAT_SETTINGS, type ChatModelSettingsState, type ChatSettingsSliceCreator } from '../types';

export const createChatModelSlice: ChatSettingsSliceCreator<ChatModelSettingsState> = (set, get) => ({
  mode: DEFAULT_CHAT_SETTINGS.mode,
  setMode: (mode) => set({ mode }),
  responseMode: DEFAULT_CHAT_SETTINGS.responseMode,
  setResponseMode: (responseMode) => set({ responseMode }),
  selectedSingleModel: DEFAULT_CHAT_SETTINGS.selectedSingleModel,
  setSelectedSingleModel: (selectedSingleModel) => set({ selectedSingleModel }),
  selectedExperts: [...DEFAULT_CHAT_SETTINGS.selectedExperts],
  toggleExpert: (id) =>
    set((state) => {
      const nextExperts = state.selectedExperts.includes(id)
        ? state.selectedExperts.filter((modelId) => modelId !== id)
        : dedupeModelIds([...state.selectedExperts, id]).slice(0, MAX_MOA_ACTIVE_MODELS);
      return {
        selectedExperts: nextExperts,
        activeModels: nextExperts,
      };
    }),
  setExperts: (selectedExperts) => {
    const nextExperts = dedupeModelIds(selectedExperts).slice(0, MAX_MOA_ACTIVE_MODELS);
    set({
      selectedExperts: nextExperts,
      activeModels: nextExperts,
    });
  },
  selectedJudge: DEFAULT_CHAT_SETTINGS.selectedJudge,
  setSelectedJudge: (selectedJudge) => set({ selectedJudge }),
  favoriteModels: [...DEFAULT_CHAT_SETTINGS.favoriteModels],
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
  toggleFavorite: (id) =>
    set((state) => {
      const next = state.favoriteModels.includes(id)
        ? state.favoriteModels.filter((modelId) => modelId !== id)
        : dedupeModelIds([...state.favoriteModels, id]).slice(0, MAX_USER_FAVORITE_MODELS);
      const active = state.activeModels.filter((modelId) => next.includes(modelId));
      return {
        favoriteModels: next,
        activeModels: active,
        selectedExperts: active,
      };
    }),
  recentModelIds: [...DEFAULT_CHAT_SETTINGS.recentModelIds],
  addRecentModel: (id) =>
    set((state) => ({
      recentModelIds: [id, ...state.recentModelIds.filter((modelId) => modelId !== id)].slice(0, 10),
    })),
  activeModels: [...DEFAULT_CHAT_SETTINGS.activeModels],
  setActiveModels: (activeModels) =>
    set({
      activeModels,
      selectedExperts: activeModels,
    }),
  toggleActiveModel: (id) =>
    set((state) => {
      const nextActive = state.activeModels.includes(id)
        ? state.activeModels.filter((modelId) => modelId !== id)
        : dedupeModelIds([...state.activeModels, id]).slice(0, MAX_MOA_ACTIVE_MODELS);
      return {
        activeModels: nextActive,
        selectedExperts: nextActive,
      };
    }),
  expertRoleByModel: { ...DEFAULT_CHAT_SETTINGS.expertRoleByModel },
  setExpertRoleForModel: (modelId, roleId) =>
    set((state) => ({
      expertRoleByModel: { ...state.expertRoleByModel, [modelId]: roleId },
    })),
  expertPromptsByModel: {},
  setExpertPromptForModel: (modelId, prompt) =>
    set((state) => ({
      expertPromptsByModel: { ...state.expertPromptsByModel, [modelId]: prompt },
    })),
});
