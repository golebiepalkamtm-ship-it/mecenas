import { useShallow } from 'zustand/react/shallow';

import { useChatSettingsStore } from '../store/useChatSettingsStore';

export function usePromptSettingsState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      unitSystemRoles: state.unitSystemRoles,
      addSystemRolePrompt: state.addSystemRolePrompt,
      updateSystemRolePrompt: state.updateSystemRolePrompt,
      removeSystemRolePrompt: state.removeSystemRolePrompt,
      currentSystemRoleId: state.currentSystemRoleId,
      setCurrentSystemRoleId: state.setCurrentSystemRoleId,
      taskPrompts: state.taskPrompts,
      addTaskPrompt: state.addTaskPrompt,
      updateTaskPrompt: state.updateTaskPrompt,
      removeTaskPrompt: state.removeTaskPrompt,
      currentTask: state.currentTask,
      setCurrentTask: state.setCurrentTask,
      architectPrompt: state.architectPrompt,
      setArchitectPrompt: state.setArchitectPrompt,
      resetToDefaults: state.resetToDefaults,
      applyPromptPreset: state.applyPromptPreset,
      activePromptPresetId: state.activePromptPresetId,
    })),
  );
}

export function useSettingsNavigationState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      currentSettingsTab: state.currentSettingsTab,
      setSettingsTab: state.setSettingsTab,
    })),
  );
}

export function useFavoriteModelsState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      favoriteModels: state.favoriteModels,
      setFavoriteModels: state.setFavoriteModels,
      toggleFavorite: state.toggleFavorite,
    })),
  );
}

export function useModelLatencyState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      modelLatencies: state.modelLatencies,
      setModelLatencies: state.setModelLatencies,
    })),
  );
}

export function useFavoriteModelsCount() {
  return useChatSettingsStore((state) => state.favoriteModels.length);
}

export function useDrafterModelSetting() {
  return useChatSettingsStore(
    useShallow((state) => ({
      drafterModel: state.drafterModel,
      setDrafterModel: state.setDrafterModel,
    })),
  );
}

export function useChatUiState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      mode: state.mode,
      isOpen: state.isOpen,
      setIsOpen: state.setIsOpen,
      showHistory: state.showHistory,
      setShowHistory: state.setShowHistory,
    })),
  );
}

export function useChatRetrievalState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      useSaos: state.useSaos,
      setUseSaos: state.setUseSaos,
      useEli: state.useEli,
      setUseEli: state.setUseEli,
      useRagLegal: state.useRagLegal,
      setUseRagLegal: state.setUseRagLegal,
      useRagUser: state.useRagUser,
      setUseRagUser: state.setUseRagUser,
    })),
  );
}

export function useChatExecutionState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      selectedSingleModel: state.selectedSingleModel,
      selectedExperts: state.selectedExperts,
      selectedJudge: state.selectedJudge,
      mode: state.mode,
      modelLatencies: state.modelLatencies,
      setModelLatencies: state.setModelLatencies,
    })),
  );
}

export function useQuickIntelligenceState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      activeModels: state.activeModels,
      toggleActiveModel: state.toggleActiveModel,
      setMode: state.setMode,
      selectedJudge: state.selectedJudge,
      setSelectedJudge: state.setSelectedJudge,
      setIsOpen: state.setIsOpen,
      expertRoleByModel: state.expertRoleByModel,
      setExpertRoleForModel: state.setExpertRoleForModel,
      activePromptPresetId: state.activePromptPresetId,
      unitSystemRoles: state.unitSystemRoles,
      taskPrompts: state.taskPrompts,
      currentTask: state.currentTask,
      setCurrentTask: state.setCurrentTask,
      responseMode: state.responseMode,
      setResponseMode: state.setResponseMode,
      favoriteModels: state.favoriteModels,
    })),
  );
}

export function useModelOrchestratorState() {
  return useChatSettingsStore(
    useShallow((state) => ({
      recentModelIds: state.recentModelIds,
      favoriteModels: state.favoriteModels,
      setFavoriteModels: state.setFavoriteModels,
      toggleFavorite: state.toggleFavorite,
    })),
  );
}
