import type { StateCreator } from 'zustand';

export type ChatSettingMode = 'single' | 'consensus' | 'moa';
export type ResponseMode = 'citizen' | 'strategic' | 'draft';

export interface PromptPresetConfig {
  architectPrompt?: string;
  unitSystemRoles?: Record<string, string>;
  taskPrompts?: Record<string, string>;
  mode?: ChatSettingMode;
}

export interface ChatUiSettingsState {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  toggleOpen: () => void;
  currentSettingsTab: string;
  setSettingsTab: (tab: string) => void;
  showHistory: boolean;
  setShowHistory: (val: boolean) => void;
  drafterModel: string;
  setDrafterModel: (model: string) => void;
}

export interface ChatModelSettingsState {
  mode: ChatSettingMode;
  setMode: (mode: ChatSettingMode) => void;
  responseMode: ResponseMode;
  setResponseMode: (mode: ResponseMode) => void;
  selectedSingleModel: string;
  setSelectedSingleModel: (modelId: string) => void;
  selectedExperts: string[];
  toggleExpert: (modelId: string) => void;
  setExperts: (modelIds: string[]) => void;
  selectedJudge: string;
  setSelectedJudge: (modelId: string) => void;
  favoriteModels: string[];
  setFavoriteModels: (modelIds: string[]) => void;
  toggleFavorite: (modelId: string) => void;
  recentModelIds: string[];
  addRecentModel: (modelId: string) => void;
  activeModels: string[];
  setActiveModels: (modelIds: string[]) => void;
  toggleActiveModel: (modelId: string) => void;
  expertRoleByModel: Record<string, string>;
  setExpertRoleForModel: (modelId: string, roleId: string) => void;
  expertPromptsByModel: Record<string, string>;
  setExpertPromptForModel: (modelId: string, prompt: string) => void;
}

export interface ChatPromptSettingsState {
  activePromptPresetId: string;
  applyPromptPreset: (id: string, config: PromptPresetConfig) => void;
  architectPrompt: string;
  setArchitectPrompt: (prompt: string) => void;
  currentSystemRoleId: string;
  setCurrentSystemRoleId: (id: string) => void;
  unitSystemRoles: Record<string, string>;
  addSystemRolePrompt: (id: string, prompt: string) => void;
  updateSystemRolePrompt: (id: string, prompt: string) => void;
  removeSystemRolePrompt: (id: string) => void;
  currentTask: string;
  setCurrentTask: (task: string) => void;
  taskPrompts: Record<string, string>;
  addTaskPrompt: (taskId: string, prompt: string) => void;
  updateTaskPrompt: (taskId: string, prompt: string) => void;
  removeTaskPrompt: (taskId: string) => void;
}

export interface ChatPerformanceSettingsState {
  modelLatencies: Record<string, number>;
  setModelLatency: (modelId: string, latency: number) => void;
  setModelLatencies: (latencies: Record<string, number>) => void;
  autoSpeedSelection: boolean;
  setAutoSpeedSelection: (enabled: boolean) => void;
  optimizeForSpeed: () => void;
}

export interface ChatRetrievalSettingsState {
  useSaos: boolean;
  setUseSaos: (enabled: boolean) => void;
  useEli: boolean;
  setUseEli: (enabled: boolean) => void;
  useRagLegal: boolean;
  setUseRagLegal: (enabled: boolean) => void;
  useRagUser: boolean;
  setUseRagUser: (enabled: boolean) => void;
  useLexmindeMcp: boolean;
  setUseLexmindeMcp: (enabled: boolean) => void;
}

export interface ChatSettingsResetState {
  resetToDefaults: () => void;
}

export type ChatSettingsState =
  & ChatUiSettingsState
  & ChatModelSettingsState
  & ChatPromptSettingsState
  & ChatPerformanceSettingsState
  & ChatRetrievalSettingsState
  & ChatSettingsResetState;

export const DEFAULT_CHAT_SETTINGS = {
  mode: 'single' as ChatSettingMode,
  responseMode: 'strategic' as ResponseMode,
  selectedSingleModel: 'google/gemini-2.5-flash-lite',
  selectedExperts: [],
  selectedJudge: 'google/gemini-2.5-flash-lite',
  favoriteModels: [] as string[],
  recentModelIds: [] as string[],
  activeModels: [] as string[],
  expertRoleByModel: {} as Record<string, string>,
  activePromptPresetId: 'defense',
  architectPrompt: '',
  currentSystemRoleId: '',
  unitSystemRoles: {} as Record<string, string>,
  currentTask: 'general',
  taskPrompts: {} as Record<string, string>,
  modelLatencies: {} as Record<string, number>,
  autoSpeedSelection: false,
  useSaos: true,
  useEli: true,
  useRagLegal: true,
  useRagUser: false,
  useLexmindeMcp: true,
} as const;

export type ChatSettingsSliceCreator<TSlice> = StateCreator<ChatSettingsState, [], [], TSlice>;
