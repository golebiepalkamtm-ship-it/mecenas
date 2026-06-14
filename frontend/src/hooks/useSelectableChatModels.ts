import { useMemo, useState, useEffect } from 'react';
import { useModels, readEnabledModels, type Model } from './useConfig';
import { useApiManagement } from './index';
import { isModelVisibleForProviders } from '../utils/modelSource';
import { normalizeVendor } from '../components/Chat/constants';
import { API_BASE } from '../config';

import { MAX_MOA_ACTIVE_MODELS } from '../utils/modelSelection';

export const MAX_MOA_EXPERTS = MAX_MOA_ACTIVE_MODELS;

export type ModelPickerScope = 'favorites' | 'all';

export function useSelectableChatModels(
  scope: ModelPickerScope,
  favoriteIds: string[],
  searchQuery: string,
  filterVendor: string,
) {
  const { data: allModels = [] } = useModels();
  const { providers } = useApiManagement();
  
  const [adminEnabled, setAdminEnabled] = useState<string[]>(() => readEnabledModels());
  
  useEffect(() => {
    fetch(`${API_BASE}/models/profile/available`)
      .then(res => res.json())
      .then(data => {
         if (data.available_models) {
            const ids = data.available_models.map((m: any) => m.id);
            setAdminEnabled(ids);
         }
      })
      .catch(console.error);
  }, []);

  const activeProviders = useMemo(
    () =>
      providers
        .filter((p) => p.active && p.key && p.key.trim() !== '')
        .map((p) => p.id.toLowerCase()),
    [providers],
  );

  const pool = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const favSet = new Set(favoriteIds);

    const favoritesOnly = scope === 'favorites' && favSet.size > 0;

    const filtered = allModels.filter((m: Model) => {
      if (adminEnabled.length > 0 && !adminEnabled.includes(m.id)) return false;
      if (!isModelVisibleForProviders(m, activeProviders)) return false;
      if (favoritesOnly && !favSet.has(m.id)) return false;

      const vendor = normalizeVendor(m.name, m.id);
      if (filterVendor !== 'all' && vendor !== filterVendor) return false;

      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchId = m.id.toLowerCase().includes(q);
        const matchProvider = (m.provider || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchProvider) return false;
      }
      return true;
    });

    const byId = new Map<string, Model>();
    for (const m of filtered) {
      if (!byId.has(m.id)) byId.set(m.id, m);
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allModels, adminEnabled, activeProviders, scope, favoriteIds, searchQuery, filterVendor]);

  const vendors = useMemo(() => {
    const set = new Set<string>();
    allModels.forEach((m) => {
      if (adminEnabled.length > 0 && !adminEnabled.includes(m.id)) return;
      if (!isModelVisibleForProviders(m, activeProviders)) return;
      set.add(normalizeVendor(m.name, m.id));
    });
    return Array.from(set).sort();
  }, [allModels, adminEnabled, activeProviders]);

  return { models: pool, vendors, totalCatalog: allModels.length };
}
