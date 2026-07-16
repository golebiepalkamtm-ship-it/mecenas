import type { ChatSettingsSliceCreator, ChatUiSettingsState } from '../types';

export const createChatUiSlice: ChatSettingsSliceCreator<ChatUiSettingsState> = (set) => ({
  isOpen: true,
  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  currentSettingsTab: 'Profil',
  setSettingsTab: (currentSettingsTab) => set({ currentSettingsTab }),
  showHistory: true,
  setShowHistory: (showHistory) => set({ showHistory }),
  drafterModel: 'local/gpt-oss-20b',
  setDrafterModel: (drafterModel) => set({ drafterModel }),
});
