import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';
import { useFavoriteModelsState, useModelLatencyState } from './chatSettingsSelectors';
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
  const { favoriteModels } = useFavoriteModelsState();
  const { setModelLatencies, modelLatencies: latencies } = useModelLatencyState();

  const refreshHealth = useCallback(async () => {
    setIsLoading(true);
    try {
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
  }, [favoriteModels, setModelLatencies]);

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

  return { healthData, isLoading, refreshHealth, latencies };
}
