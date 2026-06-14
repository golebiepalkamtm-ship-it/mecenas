import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../config';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
import { filterFavoritesForAdminPool } from '../utils/modelSelection';
import { readEnabledModels } from './useConfig';

export interface PromptPresetBundle {
  mode?: string;
  architectPrompt?: string;
  unitSystemRoles?: Record<string, string>;
  taskPrompts?: Record<string, string>;
  judgeSystemPrompt?: string;
  moaDefaultExpertRoles?: string[];
}

export type PromptPresetId = 'defense' | 'prosecution';
export type PromptPresetsMap = Record<PromptPresetId, PromptPresetBundle>;

function resolvePresetId(activeId: string): PromptPresetId {
  return activeId === 'prosecution' ? 'prosecution' : 'defense';
}

function needsPromptCatalogBootstrap(store: ReturnType<typeof useChatSettingsStore.getState>): boolean {
  // Tymczasowo zawsze zwracamy true, aby po odświeżeniu strony UI zaciągnęło zaktualizowane pliki .txt z backendu
  return true;
}

export function usePromptPresets() {
  const [presets, setPresets] = useState<PromptPresetsMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const applyPromptPreset = useChatSettingsStore((s) => s.applyPromptPreset);

  const applyPresetBundle = useCallback(
    (
      id: PromptPresetId,
      bundle: PromptPresetBundle,
      extra?: { mode?: 'single' | 'consensus' | 'moa'; assignModels?: boolean },
    ) => {
      const roleIds = Object.keys(bundle.unitSystemRoles ?? {});
      const defaultRoles =
        bundle.moaDefaultExpertRoles && bundle.moaDefaultExpertRoles.length > 0
          ? bundle.moaDefaultExpertRoles
          : roleIds;

      applyPromptPreset(id, {
        architectPrompt: bundle.architectPrompt,
        unitSystemRoles: bundle.unitSystemRoles,
        taskPrompts: bundle.taskPrompts,
        mode: extra?.mode,
      });

      if (extra?.assignModels === false) return;

      const store = useChatSettingsStore.getState();
      const { visible: pool } = filterFavoritesForAdminPool(
        store.favoriteModels,
        readEnabledModels(),
      );

      const nextActive: string[] = [];
      const nextExpertMap: Record<string, string> = {};
      defaultRoles.forEach((roleId, idx) => {
        const modelId = pool[idx];
        if (modelId) {
          nextActive.push(modelId);
          nextExpertMap[modelId] = roleId;
        }
      });

      if (nextActive.length > 0) {
        useChatSettingsStore.setState({
          activeModels: nextActive,
          selectedExperts: nextActive,
          expertRoleByModel: nextExpertMap,
        });
      }
    },
    [applyPromptPreset],
  );

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/prompts/presets`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PromptPresetsMap;
      setPresets(data);

      const store = useChatSettingsStore.getState();
      if (needsPromptCatalogBootstrap(store)) {
        const presetId = resolvePresetId(store.activePromptPresetId);
        const bundle = data[presetId];
        if (bundle?.unitSystemRoles && Object.keys(bundle.unitSystemRoles).length > 0) {
          // Bootstrap: ładuj tylko katalog ról/promptów, NIE przypisuj modeli automatycznie.
          // Użytkownik sam wybiera ekspertów w panelu.
          applyPresetBundle(presetId, bundle, { assignModels: false });
        }
      }

      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się pobrać presetów';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyPresetBundle]);

  useEffect(() => {
    void fetchPresets();
  }, [fetchPresets]);

  const applyServerPreset = useCallback(
    (id: PromptPresetId, extra?: { mode?: 'single' | 'consensus' | 'moa' }) => {
      const bundle = presets?.[id];
      if (!bundle) {
        applyPromptPreset(id, { mode: extra?.mode });
        return;
      }
      applyPresetBundle(id, bundle, { mode: extra?.mode, assignModels: true });
    },
    [presets, applyPromptPreset, applyPresetBundle],
  );

  return {
    presets,
    loading,
    error,
    refetch: fetchPresets,
    applyServerPreset,
  };
}
