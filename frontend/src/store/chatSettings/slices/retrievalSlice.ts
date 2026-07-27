import {
  DEFAULT_CHAT_SETTINGS,
  type ChatRetrievalSettingsState,
  type ChatSettingsSliceCreator,
} from '../types';

export const createChatRetrievalSlice: ChatSettingsSliceCreator<ChatRetrievalSettingsState> = (set) => ({
  useSaos: DEFAULT_CHAT_SETTINGS.useSaos,
  setUseSaos: (useSaos) => set({ useSaos }),
  useEli: DEFAULT_CHAT_SETTINGS.useEli,
  setUseEli: (useEli) => set({ useEli }),
  useRagLegal: DEFAULT_CHAT_SETTINGS.useRagLegal,
  setUseRagLegal: (useRagLegal) => set({ useRagLegal }),
  useRagUser: DEFAULT_CHAT_SETTINGS.useRagUser,
  setUseRagUser: (useRagUser) => set({ useRagUser }),
  useLexmindeMcp: DEFAULT_CHAT_SETTINGS.useLexmindeMcp,
  setUseLexmindeMcp: (useLexmindeMcp) => set({ useLexmindeMcp }),
});
