import { useChatSettingsStore } from '../store/useChatSettingsStore';
import type {
  ChatMode,
  ChatMutationExtras,
  ChatPayloadV2,
  ProcessSide,
  PromptOverrides,
} from '../types/chatContract';

function resolveSide(activePromptPresetId: string): ProcessSide {
  return activePromptPresetId === 'prosecution' ? 'prosecution' : 'defense';
}

function normalizeChatMode(mode: string): ChatMode {
  if (mode === 'moa' || mode === 'consensus') return mode;
  return 'single';
}

export function buildChatPayload(
  message: string,
  extras: ChatMutationExtras,
  options: {
    finalSingleModel: string;
    finalExperts: string[];
    finalJudge: string;
    modelLatencies: Record<string, number>;
  },
): ChatPayloadV2 & Record<string, unknown> {
  const store = useChatSettingsStore.getState();
  const side = resolveSide(store.activePromptPresetId);
  const chatMode = normalizeChatMode(store.mode);
  const isMoa = chatMode === 'moa' || chatMode === 'consensus';

  const architect = store.architectPrompt?.trim() || undefined;
  const systemRole =
    chatMode === 'single' && store.currentSystemRoleId
      ? store.unitSystemRoles[store.currentSystemRoleId]?.trim() || undefined
      : undefined;

  const customExpertPrompts = Object.fromEntries(
    Object.entries(store.expertPromptsByModel).filter(
      ([, value]) => (value ?? '').trim().length > 0,
    ),
  );

  const promptOverrides: PromptOverrides = {
    architect_prompt: architect,
    system_role_prompt: systemRole,
    task_prompt: store.taskPrompts[store.currentTask]?.trim() || undefined,
    role_catalog:
      Object.keys(store.unitSystemRoles).length > 0
        ? store.unitSystemRoles
        : undefined,
    expert_role_prompts:
      Object.keys(customExpertPrompts).length > 0 ? customExpertPrompts : undefined,
  };

  const payload: ChatPayloadV2 & Record<string, unknown> = {
    message,
    chat_mode: chatMode,
    response_mode: store.responseMode,
    side,
    active_system_role_id: store.currentSystemRoleId || undefined,
    current_task: store.currentTask || undefined,
    prompt_overrides: promptOverrides,
    model: options.finalSingleModel,
    sessionId: extras.sessionId,
    attachments: (extras.attachments as ChatPayloadV2['attachments']) ?? [],
    document_text: extras.document_text,
    history: extras.history,
    act_terms: extras.act_terms,
    stream: true,
    use_saos: extras.use_saos !== false,
    use_eli: extras.use_eli !== false,
    use_rag_legal: extras.use_rag_legal,
    use_rag_user: extras.use_rag_user,
    model_latencies: options.modelLatencies,
    active_prompt_preset_id: store.activePromptPresetId,
  };

  if (isMoa) {
    payload.moa_options = {
      selected_models: options.finalExperts,
      aggregator_model: options.finalJudge,
      expert_roles_map: store.expertRoleByModel,
    };
    payload.selected_models = options.finalExperts;
    payload.aggregator_model = options.finalJudge;
    payload.expert_roles = store.expertRoleByModel;
  }

  if (promptOverrides.architect_prompt) {
    payload.architect_prompt = promptOverrides.architect_prompt;
  }
  if (promptOverrides.system_role_prompt) {
    payload.system_role_prompt = promptOverrides.system_role_prompt;
  }
  if (promptOverrides.task_prompt) {
    payload.task_prompt = promptOverrides.task_prompt;
  }
  if (promptOverrides.role_catalog) {
    payload.role_catalog = promptOverrides.role_catalog;
  }
  if (promptOverrides.expert_role_prompts) {
    payload.expert_role_prompts = promptOverrides.expert_role_prompts;
  }

  return payload;
}
