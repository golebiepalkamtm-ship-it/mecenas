import {
  DEFAULT_CHAT_SETTINGS,
  type ChatPromptSettingsState,
  type ChatSettingsSliceCreator,
} from '../types';

export const createChatPromptSlice: ChatSettingsSliceCreator<ChatPromptSettingsState> = (set) => ({
  activePromptPresetId: DEFAULT_CHAT_SETTINGS.activePromptPresetId,
  applyPromptPreset: (id, config = {}) =>
    set({
      activePromptPresetId: id,
      architectPrompt: config.architectPrompt ?? '',
      unitSystemRoles: config.unitSystemRoles ? { ...config.unitSystemRoles } : {},
      taskPrompts: config.taskPrompts ? { ...config.taskPrompts } : {},
      expertPromptsByModel: {},
      currentSystemRoleId:
        config.unitSystemRoles && Object.keys(config.unitSystemRoles).length > 0
          ? Object.keys(config.unitSystemRoles)[0]
          : '',
      currentTask:
        config.taskPrompts && Object.keys(config.taskPrompts).length > 0
          ? Object.keys(config.taskPrompts)[0]
          : DEFAULT_CHAT_SETTINGS.currentTask,
    }),
  architectPrompt: DEFAULT_CHAT_SETTINGS.architectPrompt,
  setArchitectPrompt: (architectPrompt) => set({ architectPrompt }),
  currentSystemRoleId: DEFAULT_CHAT_SETTINGS.currentSystemRoleId,
  setCurrentSystemRoleId: (currentSystemRoleId) => set({ currentSystemRoleId }),
  unitSystemRoles: { ...DEFAULT_CHAT_SETTINGS.unitSystemRoles },
  addSystemRolePrompt: (id, prompt) =>
    set((state) => ({
      unitSystemRoles: { ...state.unitSystemRoles, [id]: prompt },
      currentSystemRoleId: id,
    })),
  updateSystemRolePrompt: (id, prompt) =>
    set((state) => ({
      unitSystemRoles: { ...state.unitSystemRoles, [id]: prompt },
    })),
  removeSystemRolePrompt: (id) =>
    set((state) => {
      const roleKeys = Object.keys(state.unitSystemRoles);
      if (!state.unitSystemRoles[id] || roleKeys.length <= 1) {
        return {};
      }

      const nextRoles = { ...state.unitSystemRoles };
      delete nextRoles[id];

      return {
        unitSystemRoles: nextRoles,
        currentSystemRoleId:
          state.currentSystemRoleId === id ? Object.keys(nextRoles)[0] : state.currentSystemRoleId,
      };
    }),
  currentTask: DEFAULT_CHAT_SETTINGS.currentTask,
  setCurrentTask: (currentTask) => set({ currentTask }),
  taskPrompts: { ...DEFAULT_CHAT_SETTINGS.taskPrompts },
  addTaskPrompt: (taskId, prompt) =>
    set((state) => ({
      taskPrompts: { ...state.taskPrompts, [taskId]: prompt },
      currentTask: taskId,
    })),
  updateTaskPrompt: (taskId, prompt) =>
    set((state) => ({
      taskPrompts: { ...state.taskPrompts, [taskId]: prompt },
    })),
  removeTaskPrompt: (taskId) =>
    set((state) => {
      const taskKeys = Object.keys(state.taskPrompts);
      if (!state.taskPrompts[taskId] || taskKeys.length <= 1) {
        return {};
      }

      const nextTasks = { ...state.taskPrompts };
      delete nextTasks[taskId];

      return {
        taskPrompts: nextTasks,
        currentTask: state.currentTask === taskId ? Object.keys(nextTasks)[0] : state.currentTask,
      };
    }),
});
