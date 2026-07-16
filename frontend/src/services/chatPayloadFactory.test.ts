import { beforeEach, describe, expect, it } from 'vitest';

import { buildChatPayload } from './chatPayloadFactory';
import { useChatSettingsStore } from '../store/useChatSettingsStore';

function resetStore(): void {
  globalThis.localStorage.clear();
  useChatSettingsStore.getState().resetToDefaults();
  useChatSettingsStore.setState({
    activePromptPresetId: 'defense',
    expertPromptsByModel: {},
    expertRoleByModel: {},
    unitSystemRoles: {},
    currentSystemRoleId: '',
    taskPrompts: {},
    currentTask: 'general',
    architectPrompt: '',
    responseMode: 'strategic',
    mode: 'single',
  });
}

describe('buildChatPayload', () => {
  beforeEach(() => {
    resetStore();
  });

  it('builds a single-mode payload with trimmed prompt overrides and explicit toggles', () => {
    useChatSettingsStore.setState({
      mode: 'single',
      responseMode: 'citizen',
      activePromptPresetId: 'prosecution',
      architectPrompt: '  Architekt testowy  ',
      currentSystemRoleId: 'lead',
      unitSystemRoles: {
        lead: '  Główny prokurator  ',
      },
      currentTask: 'analysis',
      taskPrompts: {
        analysis: '  Oceń materiał dowodowy  ',
      },
    });

    const payload = buildChatPayload(
      'Czy mogę zaskarżyć decyzję?',
      {
        sessionId: 'sess-1',
        attachments: [{ id: 'a1' }],
        document_text: 'Treść dokumentu',
        history: [{ role: 'user', content: 'Poprzednie pytanie' }],
        act_terms: ['kpa'],
        use_saos: false,
        use_eli: true,
        use_rag_legal: true,
        use_rag_user: false,
      },
      {
        finalSingleModel: 'google/gemini-2.5-flash-lite',
        finalExperts: [],
        finalJudge: '',
        modelLatencies: {
          'google/gemini-2.5-flash-lite': 123,
        },
      },
    );

    expect(payload.chat_mode).toBe('single');
    expect(payload.side).toBe('prosecution');
    expect(payload.response_mode).toBe('citizen');
    expect(payload.model).toBe('google/gemini-2.5-flash-lite');
    expect(payload.active_system_role_id).toBe('lead');
    expect(payload.current_task).toBe('analysis');
    expect(payload.stream).toBe(true);
    expect(payload.use_saos).toBe(false);
    expect(payload.use_eli).toBe(true);
    expect(payload.use_rag_legal).toBe(true);
    expect(payload.use_rag_user).toBe(false);

    expect(payload.prompt_overrides).toEqual({
      architect_prompt: 'Architekt testowy',
      system_role_prompt: 'Główny prokurator',
      task_prompt: 'Oceń materiał dowodowy',
      role_catalog: {
        lead: '  Główny prokurator  ',
      },
      expert_role_prompts: undefined,
    });

    expect(payload.architect_prompt).toBe('Architekt testowy');
    expect(payload.system_role_prompt).toBe('Główny prokurator');
    expect(payload.task_prompt).toBe('Oceń materiał dowodowy');
    expect(payload.role_catalog).toEqual({
      lead: '  Główny prokurator  ',
    });
  });

  it('adds MOA fields only in multi-expert mode and filters blank custom prompts', () => {
    useChatSettingsStore.setState({
      mode: 'moa',
      activePromptPresetId: 'defense',
      currentSystemRoleId: 'lead',
      unitSystemRoles: {
        lead: '  Ten prompt wejdzie jako baza dla agentów MOA  ',
      },
      expertRoleByModel: {
        'model-a': 'defender',
        'model-b': 'strategist',
      },
      expertPromptsByModel: {
        'model-a': '  Autorski prompt eksperta  ',
        'model-b': '   ',
      },
      currentTask: 'strategy',
      taskPrompts: {
        strategy: '  Zbuduj strategię obrony  ',
      },
    });

    const payload = buildChatPayload(
      'Przygotuj strategię',
      {
        history: [],
      },
      {
        finalSingleModel: 'google/gemini-2.5-flash-lite',
        finalExperts: ['model-a', 'model-b'],
        finalJudge: 'judge-1',
        modelLatencies: {},
      },
    );

    expect(payload.chat_mode).toBe('moa');
    expect(payload.side).toBe('defense');
    expect(payload.moa_options).toEqual({
      selected_models: ['model-a', 'model-b'],
      aggregator_model: 'judge-1',
      expert_roles_map: {
        'model-a': 'defender',
        'model-b': 'strategist',
      },
    });
    expect(payload.selected_models).toEqual(['model-a', 'model-b']);
    expect(payload.aggregator_model).toBe('judge-1');
    expect(payload.expert_roles).toEqual({
      'model-a': 'defender',
      'model-b': 'strategist',
    });
    expect(payload.system_role_prompt).toBe('Ten prompt wejdzie jako baza dla agentów MOA');
    expect(payload.prompt_overrides.system_role_prompt).toBe('Ten prompt wejdzie jako baza dla agentów MOA');
    expect(payload.expert_role_prompts).toEqual({
      'model-a': '  Autorski prompt eksperta  ',
    });
    expect(payload.prompt_overrides.expert_role_prompts).toEqual({
      'model-a': '  Autorski prompt eksperta  ',
    });
    expect(payload.task_prompt).toBe('Zbuduj strategię obrony');
  });
});
