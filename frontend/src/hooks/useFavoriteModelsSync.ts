import { useEffect, useRef } from 'react';
import { API_BASE } from '../config';
import { supabase } from '../utils/supabaseClient';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
import { dedupeModelIds } from '../utils/modelSelection';

function parseFavoriteIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return dedupeModelIds(
      raw.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'id' in item) {
          return String((item as { id: unknown }).id);
        }
        return '';
      }),
    );
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseFavoriteIds(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

async function fetchBackendFavorites(userId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${API_BASE}/models/profile/selected?user_id=${encodeURIComponent(userId)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { selected_models?: unknown };
    return parseFavoriteIds(data.selected_models);
  } catch {
    return [];
  }
}

async function fetchSupabaseFavorites(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('favorite_models')
      .eq('id', userId)
      .single();
    if (error || !data) return [];
    return parseFavoriteIds(data.favorite_models);
  } catch {
    return [];
  }
}

async function saveBackendFavorites(userId: string, modelIds: string[]): Promise<void> {
  if (modelIds.length === 0) return;
  try {
    await fetch(`${API_BASE}/models/profile/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        selected_model_ids: modelIds,
      }),
    });
  } catch (err) {
    console.warn('[MODEL_SYNC] Backend save failed:', err);
  }
}

async function saveSupabaseFavorites(userId: string, modelIds: string[]): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .upsert({
        id: userId,
        favorite_models: modelIds,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[MODEL_SYNC] Supabase save failed:', err);
  }
}

function mergeFavoriteLists(...lists: string[][]): string[] {
  return dedupeModelIds(lists.flat());
}

/**
 * Synchronizuje ulubione modele między profilami Chrome / urządzeniami:
 * backend SQLite (per user_id) + Supabase profiles.favorite_models.
 */
export function useFavoriteModelsSync(userId: string | undefined) {
  const hydratedRef = useRef(false);
  const skipSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const runHydrate = async () => {
      const [backendIds, supabaseIds] = await Promise.all([
        fetchBackendFavorites(userId),
        fetchSupabaseFavorites(userId),
      ]);
      if (cancelled) return;

      const serverIds = mergeFavoriteLists(backendIds, supabaseIds);
      const localIds = useChatSettingsStore.getState().favoriteModels;

      skipSaveRef.current = true;

      if (serverIds.length > 0) {
        if (
          localIds.length === 0 ||
          serverIds.length !== localIds.length ||
          serverIds.some((id, i) => id !== localIds[i])
        ) {
          useChatSettingsStore.getState().setFavoriteModels(serverIds);
          const { activeModels } = useChatSettingsStore.getState();
          // NIE włączaj automatycznie modeli jako ekspertów.
          // Użytkownik sam wybiera ekspertów w panelu Strategia AI.
          if (activeModels.length === 0) {
            // Zachowaj pustą listę — użytkownik sam doda modele.
            // Dawny kod: setActiveModels(serverIds.slice(0, MAX_MOA_ACTIVE_MODELS));
          }
        }
      } else if (localIds.length > 0) {
        await Promise.all([
          saveBackendFavorites(userId, localIds),
          saveSupabaseFavorites(userId, localIds),
        ]);
      }

      skipSaveRef.current = false;
      hydratedRef.current = true;
    };

    const start = () => {
      void runHydrate();
    };

    let unsubHydration: (() => void) | undefined;

    if (useChatSettingsStore.persist.hasHydrated()) {
      start();
    } else {
      unsubHydration = useChatSettingsStore.persist.onFinishHydration(() => {
        unsubHydration?.();
        unsubHydration = undefined;
        start();
      });
    }

    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ favorite_models?: unknown }>).detail;
      const ids = parseFavoriteIds(detail?.favorite_models);
      if (ids.length === 0) return;
      skipSaveRef.current = true;
      useChatSettingsStore.getState().setFavoriteModels(ids);
      skipSaveRef.current = false;
    };

    window.addEventListener('prawnik_profile_updated', onProfileUpdated);

    return () => {
      cancelled = true;
      unsubHydration?.();
      window.removeEventListener('prawnik_profile_updated', onProfileUpdated);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsub = useChatSettingsStore.subscribe((state, prev) => {
      if (!hydratedRef.current || skipSaveRef.current) return;
      if (state.favoriteModels === prev.favoriteModels) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const ids = useChatSettingsStore.getState().favoriteModels;
        void Promise.all([
          saveBackendFavorites(userId, ids),
          saveSupabaseFavorites(userId, ids),
        ]);
      }, 800);
    });

    return () => {
      unsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [userId]);
}
