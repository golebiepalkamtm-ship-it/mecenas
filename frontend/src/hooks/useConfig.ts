import { useQuery } from '@tanstack/react-query';
import type { Model } from '../components/Chat/types';
import { API_BASE } from '../config';
import { ensureApiAvailability } from '../utils/apiAvailability';

export type { Model };

export interface Preset {
  id: string;
  name: string;
  icon: string;
  models: string[];
  judge: string;
  color: string;
}

const MODELS_CACHE_KEY = 'lexmind_models_cache';

function readCachedModels(): Model[] {
  const cached = localStorage.getItem(MODELS_CACHE_KEY);
  if (!cached) return [];

  try {
    return JSON.parse(cached) as Model[];
  } catch {
    localStorage.removeItem(MODELS_CACHE_KEY);
    return [];
  }
}

const ENABLED_MODELS_STORAGE_KEY = 'prawnik_enabled_models';

function readEnabledModels(): string[] {
  try {
    const raw = window.localStorage.getItem(ENABLED_MODELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function saveEnabledModels(modelIds: string[]): void {
  window.localStorage.setItem(ENABLED_MODELS_STORAGE_KEY, JSON.stringify(modelIds));
  window.dispatchEvent(new CustomEvent('prawnik_models_updated'));
}

export { readEnabledModels, saveEnabledModels };

export function useModels() {
  const query = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      const cachedModels = readCachedModels();
      const apiAvailable = await ensureApiAvailability();

      if (!apiAvailable) {
        return cachedModels;
      }

      try {
        const res = await fetch(`${API_BASE}/models/admin?output_modalities=all`);
        if (!res.ok) throw new Error('Failed to fetch models');
        const list = (await res.json()) as Omit<Model, 'active'>[];
        let models = list.map((m) => ({ ...m, active: true }));

        // DOŁĄCZANIE MODELI CUSTOMOWYCH (WŁASNE API KEYS)
        const customProviders = ['openrouter', 'google', 'openai', 'anthropic'];
        customProviders.forEach(provider => {
          const custom = localStorage.getItem(`custom_models_${provider}`);
          if (custom) {
            try {
              const customList = JSON.parse(custom) as Model[];
              // Unikaj duplikatów
              const existingIds = new Set(models.map(m => m.id));
              const newModels = customList.filter(m => m.id && !existingIds.has(m.id));
              models = [...models, ...newModels.map(m => ({ ...m, active: true }))];
            } catch (e) {
              console.warn(`Błąd parsowania modeli custom dla ${provider}:`, e);
            }
          }
        });

        // Ostateczna deduplikacja dla bezpieczeństwa
        const finalMap = new Map();
        models.forEach(m => {
          if (m.id && m.id.trim().length > 0) finalMap.set(m.id, m);
        });
        const deduplicatedModels = Array.from(finalMap.values());

        localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(deduplicatedModels));
        return deduplicatedModels;
      } catch {
        if (cachedModels.length > 0) return cachedModels;
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  return query;
}

export function usePresets() {
  return useQuery<Preset[]>({
    queryKey: ['presets'],
    queryFn: async () => {
      const apiAvailable = await ensureApiAvailability();
      if (!apiAvailable) return [];

      const res = await fetch(`${API_BASE}/models/presets`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });
}
