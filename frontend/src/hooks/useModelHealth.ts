import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
export interface ModelHealth {
  id: string;
  status: 'online' | 'offline' | 'degraded';
  latency_ms: number;
  error: string | null;
  timestamp?: number;
}

export function useModelHealth() {
  const [healthData, setHealthData] = useState<Record<string, ModelHealth>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { setModelLatencies } = useChatSettingsStore();

  const refreshHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Pobierz ulubione modele z globalnego stanu
      const favoriteModels = useChatSettingsStore.getState().favoriteModels;
      if (!favoriteModels || favoriteModels.length === 0) {
        setIsLoading(false);
        return;
      }

      // Wykonaj ping tylko dla wybranych modeli użytkownika
      const response = await fetch(`${API_BASE}/models/ping-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_ids: favoriteModels })
      });
      const data = await response.json();
      
      const healthMap: Record<string, ModelHealth> = {};
      const latencyMap: Record<string, number> = {};

      if (Array.isArray(data)) {
        data.forEach((m: ModelHealth) => {
          healthMap[m.id] = m;
          latencyMap[m.id] = m.latency_ms || 0;
        });
      }

      setHealthData(healthMap);
      setModelLatencies(latencyMap);
    } catch (error) {
      console.error('Error fetching model health:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setModelLatencies]);

  useEffect(() => {
    let isMounted = true;
    
    // Używamy mikro-zadania, aby uniknąć ostrzeżenia o synchronicznym setState w efekcie,
    // co pozwala Reactowi ukończyć cykl renderowania przed rozpoczęciem odświeżania.
    Promise.resolve().then(() => {
      if (isMounted) refreshHealth();
    });

    const interval = setInterval(() => {
      if (isMounted) refreshHealth();
    }, 30 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshHealth]);

  const latencies = useChatSettingsStore((s) => s.modelLatencies);
  return { healthData, isLoading, refreshHealth, latencies };
}
