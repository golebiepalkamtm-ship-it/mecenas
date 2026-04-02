import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Tryb pracy
  isConsensusMode: boolean;
  setConsensusMode: (val: boolean) => void;
  
  // Wybór modeli dla MOA
  selectedAnalystIds: string[];
  toggleAnalyst: (id: string) => void;
  setAnalysts: (ids: string[]) => void;
  
  // Model sędziego/pojedynczy
  primaryModelId: string;
  setPrimaryModel: (id: string) => void;
  
  // Widoczność paneli
  showMultiModelPanel: boolean;
  setShowMultiModelPanel: (val: boolean) => void;
  
  // Reset stanu
  resetMOA: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isConsensusMode: false,
      setConsensusMode: (val) => set({ isConsensusMode: val }),
      
      selectedAnalystIds: [], 
      toggleAnalyst: (id) => set((state) => ({
        selectedAnalystIds: state.selectedAnalystIds.includes(id)
          ? state.selectedAnalystIds.filter((m) => m !== id)
          : [...state.selectedAnalystIds, id]
      })),
      setAnalysts: (ids) => set({ selectedAnalystIds: ids }),
      
      primaryModelId: '', 
      setPrimaryModel: (id) => set({ primaryModelId: id }),
      
      showMultiModelPanel: false,
      setShowMultiModelPanel: (val) => set({ showMultiModelPanel: val }),
      
      resetMOA: () => set({
        selectedAnalystIds: [],
        isConsensusMode: false
      }),
    }),
    {
      name: 'lexmind-ui-storage',
    }
  )
);
