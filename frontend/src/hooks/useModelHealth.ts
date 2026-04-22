import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
import { readEnabledModels } from './useConfig';

export interface ModelHealth {
  id: string;
  status: 'online' | 'offline';
  latency_ms: number;
  error: string | null;
}

export function useModelHealth() {
  const [healthData, setHealthData] = useState<Record<string, ModelHealth>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { setModelLatencies, favoriteModels, autoSpeedSelection } = useChatSettingsStore();

  const refreshHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Domyślny ping dla darmowych modeli
      const response = await fetch(`${API_BASE}/health/free-models`);
      const data = await response.json();
      
      const healthMap: Record<string, ModelHealth> = {};
      const latencyMap: Record<string, number> = {};

      if (data.success && data.models) {
        data.models.forEach((m: ModelHealth) => {
          healthMap[m.id] = m;
          latencyMap[m.id] = m.latency_ms;
        });
      }

      // 2. Jeśli auto-wybór jest aktywny, pingujemy wszystkie włączone w Arsenale modele
      if (autoSpeedSelection) {
        const enabledIds = readEnabledModels();
        const sourceIds = [...new Set([...favoriteModels, ...enabledIds])];
        
        if (sourceIds.length > 0) {
          try {
            const bulkRes = await fetch(`${API_BASE}/models/ping-bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model_ids: sourceIds })
            });
            
            if (bulkRes.ok) {
              const bulkData = await bulkRes.json();
              bulkData.forEach((m: any) => {
                healthMap[m.id] = {
                  id: m.id,
                  status: m.status,
                  latency_ms: m.latency_ms || -1,
                  error: m.error || null
                };
                if (m.latency_ms) latencyMap[m.id] = m.latency_ms;
              });
            }
          } catch (e) {
            console.warn("[HEALTH] Bulk ping failed:", e);
          }
        }
      }
      
      setHealthData(healthMap);
      setModelLatencies(latencyMap);
    } catch (error) {
      console.error('Error fetching model health:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setModelLatencies, favoriteModels, autoSpeedSelection]);

  useEffect(() => {
    refreshHealth();
    // Refresh every 5 minutes
    const interval = setInterval(refreshHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  const latencies = useChatSettingsStore((s) => s.modelLatencies);
  return { healthData, isLoading, refreshHealth, latencies };
}
