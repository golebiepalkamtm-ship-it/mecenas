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

export function useModels() {
  return useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      const cachedModels = readCachedModels();
      const apiAvailable = await ensureApiAvailability();

      if (!apiAvailable) {
        return cachedModels;
      }

      try {
        const res = await fetch(`${API_BASE}/models/all`);
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
              const newModels = customList.filter(m => !existingIds.has(m.id));
              models = [...models, ...newModels.map(m => ({ ...m, active: true }))];
            } catch (e) {
              console.warn(`Błąd parsowania modeli custom dla ${provider}:`, e);
            }
          }
        });

        localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(models));
        return models;
      } catch (err) {
        if (cachedModels.length > 0) return cachedModels;
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // Krótszy cache przy dynamicznych kluczach
    refetchOnWindowFocus: true,
  });
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
