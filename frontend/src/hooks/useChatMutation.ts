// LexMind Chat Mutation Hook - Stable v1.1 - Fixed with timeout and abort controller
import { useMutation } from '@tanstack/react-query';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
import { useProfile } from './index';
import { API_BASE } from '../config';
import { useRef, useEffect } from 'react';

import type { ChatMessage, ExpertAnalysis, Attachment } from '../types/chat';

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
    unitSystemRoles,
    expertRoleByModel,
    expertPromptsByModel
  } = useChatSettingsStore();
  
  const { profile } = useProfile();
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Decide consensus based on either old mode or if user has multiple active models in the new panel
  const isConsensusMode = mode === 'consensus' || mode === 'moa';
  const experts = activeModels.length > 0 ? activeModels : selectedExperts;
  const judge = selectedJudge;
  
  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const mutation = useMutation<ChatResponse, Error, { 
    message: string, 
    history: ChatMessage[], 
    sessionId?: string,
    attachments?: Attachment[],
    document_text?: string
  }>({
     mutationFn: async ({ message, history, sessionId, attachments, document_text }) => {
       // Abort any existing request before starting new one
       if (abortControllerRef.current) {
         abortControllerRef.current.abort();
       }
       
       abortControllerRef.current = new AbortController();
       const signal = abortControllerRef.current.signal;
       
       // Create timeout promise (300 sekund - zapas dla bardzo ciężkich zapytań prawnych/RAG)
       const timeoutPromise = new Promise<never>((_, reject) => {
         const timeoutId = setTimeout(() => {
           abortControllerRef.current?.abort();
           reject(new Error('Połączenie przekroczyło limit czasu (300s). Serwer przetwarza bardzo dużą ilość danych, spróbuj ponownie za chwilę.'));
         }, 300000);
         
         signal.addEventListener('abort', () => {
           clearTimeout(timeoutId);
         });
       });

       const endpoint = isConsensusMode && experts.length > 0 ? '/chat-consensus' : '/chat';
       const payload = {
         message,
         history,
         sessionId,
         attachments,
         document_text,
         context_category: (history.length === 0 && message.includes('[DOK]')) ? 'rag_user' : 'rag_legal',
         model: (isConsensusMode && experts.length > 0) ? judge : (activeModels[0] || selectedSingleModel),
         selected_models: (isConsensusMode && experts.length > 0) ? experts : undefined,
         aggregator_model: (isConsensusMode && experts.length > 0) ? judge : undefined,
         task: currentTask,
         custom_task_prompt: taskPrompts[currentTask] || undefined,
         architect_prompt: architectPrompt,
         system_role_prompt: unitSystemRoles[currentSystemRoleId],
         expert_roles: expertRoleByModel,
         expert_role_prompts: { ...unitSystemRoles, ...expertPromptsByModel },
         api_keys: (profile as any)?.api_keys || undefined
       };

      const fetchPromise = fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      try {
        const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;

        if (!res.ok) {
          try {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Server error: ' + res.status);
          } catch {
            throw new Error('Server error: ' + res.status);
          }
        }

        return res.json();
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Żądanie zostało przerwane.');
        }
        throw err;
      } finally {
        abortControllerRef.current = null;
      }
    },
  });
  
  // Add stop method to mutation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    mutation.reset();
  };

  return {
    ...mutation,
    stopGeneration,
  };
}