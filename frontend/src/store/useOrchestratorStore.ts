import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrchestratorMode, ModelTag } from '../components/ModelOrchestrator/types';

const MAX_RECENT = 10;
const MAX_EXPERTS = 10;

interface OrchestratorStoreState {
  // Mode
  mode: OrchestratorMode;
  setMode: (mode: OrchestratorMode) => void;

  // Single model
  singleModelId: string;
  setSingleModelId: (id: string) => void;

  // MOA
  moaExpertIds: string[];
  toggleMoaExpert: (id: string) => void;
  setMoaExperts: (ids: string[]) => void;
  moaJudgeId: string;
  setMoaJudgeId: (id: string) => void;

  // Preset
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => void;

  // Recent models
  recentModelIds: string[];
  addRecentModel: (id: string) => void;

  // UI filters (not persisted)
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterTag: ModelTag | 'all';
  setFilterTag: (tag: ModelTag | 'all') => void;
  filterVendor: string;
  setFilterVendor: (v: string) => void;

  // Sync with legacy store
  syncToLegacy: () => {
    mode: OrchestratorMode;
    selectedSingleModel: string;
    selectedExperts: string[];
    selectedJudge: string;
  };

  // Favorites (Pinned to Sidebar)
  favoriteModelIds: string[];
  toggleFavoriteModel: (id: string) => void;
  setFavoriteModels: (ids: string[]) => void;

  // Reset
  reset: () => void;
}

const DEFAULTS = {
  mode: 'single' as OrchestratorMode,
  singleModelId: '', 
  moaExpertIds: [],
  moaJudgeId: '',
  activePresetId: null,
  recentModelIds: [] as string[],
  favoriteModelIds: [],
};

export const useOrchestratorStore = create<OrchestratorStoreState>()(
  persist(
    (set, get) => ({
      mode: DEFAULTS.mode,
      setMode: (mode) => set({ mode }),

      singleModelId: DEFAULTS.singleModelId,
      setSingleModelId: (id) => {
        set({ singleModelId: id });
        get().addRecentModel(id);
      },

      moaExpertIds: [...DEFAULTS.moaExpertIds],
      toggleMoaExpert: (id) =>
        set((state) => ({
          moaExpertIds: state.moaExpertIds.includes(id)
            ? state.moaExpertIds.filter((m) => m !== id)
            : [...state.moaExpertIds, id].slice(0, MAX_EXPERTS),
          activePresetId: null,
        })),
      setMoaExperts: (ids) =>
        set({ moaExpertIds: ids.slice(0, MAX_EXPERTS), activePresetId: null }),

      moaJudgeId: DEFAULTS.moaJudgeId,
      setMoaJudgeId: (id) => set({ moaJudgeId: id, activePresetId: null }),

      activePresetId: DEFAULTS.activePresetId,
      setActivePresetId: (id) => set({ activePresetId: id }),

      recentModelIds: [...DEFAULTS.recentModelIds],
      addRecentModel: (id) =>
        set((state) => ({
          recentModelIds: [
            id,
            ...state.recentModelIds.filter((m) => m !== id),
          ].slice(0, MAX_RECENT),
        })),

      favoriteModelIds: [...DEFAULTS.favoriteModelIds],
      toggleFavoriteModel: (id) =>
        set((state) => ({
          favoriteModelIds: state.favoriteModelIds.includes(id)
            ? state.favoriteModelIds.filter((m) => m !== id)
            : [...state.favoriteModelIds, id].slice(0, 20),
        })),
      setFavoriteModels: (ids) => set({ favoriteModelIds: ids.slice(0, 20) }),

      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      filterTag: 'all',
      setFilterTag: (filterTag) => set({ filterTag }),
      filterVendor: 'all',
      setFilterVendor: (filterVendor) => set({ filterVendor }),

      syncToLegacy: () => {
        const s = get();
        return {
          mode: s.mode,
          selectedSingleModel: s.singleModelId,
          selectedExperts: s.moaExpertIds,
          selectedJudge: s.moaJudgeId,
        };
      },

      reset: () =>
        set({
          mode: DEFAULTS.mode,
          singleModelId: DEFAULTS.singleModelId,
          moaExpertIds: [...DEFAULTS.moaExpertIds],
          moaJudgeId: DEFAULTS.moaJudgeId,
          activePresetId: DEFAULTS.activePresetId,
          recentModelIds: [...DEFAULTS.recentModelIds],
          favoriteModelIds: [...DEFAULTS.favoriteModelIds],
          searchQuery: '',
          filterTag: 'all',
          filterVendor: 'all',
        }),
    }),
    {
      name: 'lexmind-orchestrator',
      version: 1,
      partialize: (state) => ({
        mode: state.mode,
        singleModelId: state.singleModelId,
        moaExpertIds: state.moaExpertIds,
        moaJudgeId: state.moaJudgeId,
        activePresetId: state.activePresetId,
        recentModelIds: state.recentModelIds,
        favoriteModelIds: state.favoriteModelIds,
      }),
    }
  )
);
