import { useMutation } from '@tanstack/react-query';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
import { API_BASE } from '../config';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExpertAnalysis {
  model: string;
  response: string;
  success?: boolean;
}

interface Attachment {
  name: string;
  type: string;
  content: string;
}

interface ChatResponse {
  id: string;
  content: string;
  model: string;
  role: string;
  sources?: string[];
  expert_analyses?: ExpertAnalysis[];
  sessionId: string;
}

export function useChatMutation() {
  const { 
    mode, 
    selectedSingleModel, 
    selectedExperts, 
    selectedJudge,
    activeModels,
    currentTask,
    taskPrompts,
    architectPrompt,
    currentSystemRoleId,
    unitSystemRoles
  } = useChatSettingsStore();
  
  // Decide consensus based on either old mode or if user has multiple active models in the new panel
  const isConsensusMode = mode === 'consensus' || mode === 'moa';
  const experts = activeModels.length > 0 ? activeModels : selectedExperts;
  const judge = selectedJudge;
  
  return useMutation<ChatResponse, Error, { 
    message: string, 
    history: ChatMessage[], 
    sessionId?: string,
    attachments?: Attachment[],
    document_text?: string
  }>({
    mutationFn: async ({ message, history, sessionId, attachments, document_text }) => {
      const endpoint = isConsensusMode && experts.length > 0 ? '/chat-consensus' : '/chat';
      const payload = {
        message,
        history,
        sessionId,
        attachments,
        document_text,
        model: (isConsensusMode && experts.length > 0) ? judge : (activeModels[0] || selectedSingleModel),
        selected_models: (isConsensusMode && experts.length > 0) ? experts : undefined,
        aggregator_model: (isConsensusMode && experts.length > 0) ? judge : undefined,
        task: currentTask,
        custom_task_prompt: taskPrompts[currentTask] || undefined,
        architect_prompt: architectPrompt,
        system_role_prompt: unitSystemRoles[currentSystemRoleId]
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Network response was not ok");
      }

      return res.json();
    },
  });
}
