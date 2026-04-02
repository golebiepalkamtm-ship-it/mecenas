import { useEffect } from 'react';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import { useChatSettingsStore, type ChatSettingMode } from '../store/useChatSettingsStore';

/**
 * Syncs orchestrator store → legacy chat settings store.
 * Attach once at app root or in the orchestrator's parent.
 */
export function useOrchestratorSync() {
  const mode = useOrchestratorStore((s) => s.mode);
  const singleModelId = useOrchestratorStore((s) => s.singleModelId);
  const moaExpertIds = useOrchestratorStore((s) => s.moaExpertIds);
  const moaJudgeId = useOrchestratorStore((s) => s.moaJudgeId);
  const favoriteModelIds = useOrchestratorStore((s) => s.favoriteModelIds);

  useEffect(() => {
    useChatSettingsStore.setState({
      mode: mode as ChatSettingMode,
      selectedSingleModel: singleModelId,
      selectedExperts: moaExpertIds,
      activeModels: moaExpertIds, // Sync with active models for the chat panel
      selectedJudge: moaJudgeId,
      favoriteModels: favoriteModelIds,
    });
  }, [mode, singleModelId, moaExpertIds, moaJudgeId, favoriteModelIds]);
}
