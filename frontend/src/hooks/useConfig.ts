import { useQuery } from '@tanstack/react-query';
import type { Model } from '../components/Chat/types';
import { API_BASE } from '../config';

export type { Model };

export interface Preset {
  id: string;
  name: string;
  icon: string;
  models: string[];
  judge: string;
  color: string;
}

// Force clear models cache on load
if (typeof window !== 'undefined') {
  localStorage.removeItem('lexmind_models_cache');
}

export function useModels() {
  return useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      // Spróbujmy wczytać z localStorage jako fallback
      const cached = localStorage.getItem('lexmind_models_cache');
      
      try {
        const res = await fetch(`${API_BASE}/models/all`);
        if (!res.ok) throw new Error("Failed to fetch models");
        const list = await res.json();
        const models = (list as Omit<Model, 'active'>[]).map((m) => ({ ...m, active: true }));
        localStorage.setItem('lexmind_models_cache', JSON.stringify(models));
        return models;
      } catch (err) {
        if (cached) return JSON.parse(cached);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 15, // 15 minut cache'u
    refetchOnWindowFocus: false,
  });
}

export function usePresets() {
  return useQuery<Preset[]>({
    queryKey: ['presets'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/models/presets`);
      if (!res.ok) throw new Error("Failed to fetch presets");
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1 godzina cache'u
  });
}
