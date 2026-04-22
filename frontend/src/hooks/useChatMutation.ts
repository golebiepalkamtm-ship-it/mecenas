import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
import type { Attachment, ExpertAnalysis } from '../types/chat';
import { API_BASE } from '../config';

interface ChatMetadata {
  id?: string;
  sessionId?: string;
  sources?: string[];
  expert_analyses?: ExpertAnalysis[];
  eli_explanation?: string;
  diagnostics?: any[];
  pipeline_latency_ms?: number;
}

interface ChatMutationData {
  message: string;
  history: { role: string; content: string }[];
  attachments?: Attachment[];
  sessionId?: string;
  document_text?: string;
  onChunk?: (chunk: string) => void;
  onMetadata?: (metadata: ChatMetadata) => void;
}

export interface ChatMutationResult {
  content: string;
  id?: string;
  sessionId?: string;
  sources?: string[];
  expert_analyses?: ExpertAnalysis[];
  eli_explanation?: string;
  diagnostics?: any[];
  pipeline_latency_ms?: number;
  aborted?: boolean;
}

export const useChatMutation = () => {
  const queryClient = useQueryClient();
  const { 
    selectedSingleModel, 
    selectedExperts, 
    selectedJudge,
    mode,
    architectPrompt,
    unitSystemRoles,
    currentSystemRoleId,
    currentTask,
    expertRoleByModel,
    expertPromptsByModel,
    modelLatencies
  } = useChatSettingsStore();

  // Ref to hold the current abort controller to allow stopping generation
  const abortControllerRef = { current: null as AbortController | null };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: ChatMutationData): Promise<ChatMutationResult> => {
      const { message, history, attachments, sessionId, document_text, onChunk, onMetadata } = data;
      
      // Stop any previous generation
      stopGeneration();
      
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // MANDATORY: Check status and latency of all models BEFORE sending
      let currentLatencies = useChatSettingsStore.getState().modelLatencies;
      try {
        const healthRes = await fetch(`${API_BASE}/health/free-models`, { signal: controller.signal });
        const healthData = await healthRes.json();
        if (healthData.success && healthData.models) {
          const newMap: Record<string, number> = {};
          healthData.models.forEach((m: any) => {
            newMap[m.id] = m.latency_ms;
          });
          currentLatencies = newMap;
          // Update store globally
          useChatSettingsStore.getState().setModelLatencies(newMap);
        }
      } catch (e) {
        console.warn("[CHAT] Quick health check failed, using cached values:", e);
      }

      // Automatic selection logic based on connection speed (latency)
      let finalSingleModel = selectedSingleModel;
      let finalExperts = selectedExperts;
      let finalJudge = selectedJudge;

      const { autoSpeedSelection } = useChatSettingsStore.getState();

      // ALWAYS sort experts by speed if we have latency data, as requested
      if (finalExperts.length > 0) {
        finalExperts = [...finalExperts].sort((a, b) => {
          const latA = currentLatencies[a] || 9999;
          const latB = currentLatencies[b] || 9999;
          return latA - latB;
        });
      }

      if (autoSpeedSelection && Object.keys(currentLatencies).length > 0) {
        // Find fastest models from the available ones that have latency data
        const sortedAll = Object.entries(currentLatencies)
          .filter(([_, lat]) => lat > 0)
          .sort((a, b) => a[1] - b[1]);

        if (sortedAll.length > 0) {
          if (mode === 'single' || !finalSingleModel) {
             finalSingleModel = sortedAll[0][0];
          }
          
          if (mode !== 'single' && finalExperts.length === 0) {
              finalExperts = sortedAll.slice(0, 5).map(m => m[0]);
          }
          if (mode !== 'single' && !finalJudge) {
              finalJudge = sortedAll[0][0];
          }
        }
      }

      // Fallback if still empty
      if (!finalSingleModel) finalSingleModel = "google/gemini-2.0-flash-001";
      if (mode !== 'single' && finalExperts.length === 0) finalExperts = ["google/gemini-2.0-flash-001"];
      if (mode !== 'single' && !finalJudge) finalJudge = "google/gemini-2.0-flash-001";

      // Prepare MOA options
      const moaOptions = mode !== 'single' ? {
        selected_models: finalExperts,
        aggregator_model: finalJudge,
        task: currentTask,
        architect_prompt: architectPrompt,
        system_role_prompt: unitSystemRoles[currentSystemRoleId],
        expert_roles: expertRoleByModel,
        expert_role_prompts: expertPromptsByModel,
        model_latencies: currentLatencies
      } : {};

      const payload = {
        message,
        history,
        sessionId,
        model: finalSingleModel,
        mode: (currentSystemRoleId === 'judge' || currentSystemRoleId === 'prosecutor') ? 'judge' : 'advocate',
        attachments: attachments || [],
        document_text,
        stream: true,
        ...moaOptions
      };

      let fullContent = "";
      let currentMetadata: ChatMetadata = {};

      try {
        const response = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Błąd serwera: ${response.status} - ${errorText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Nie można zainicjalizować strumienia danych.");
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6).trim();
                if (dataStr === "[DONE]") continue;

                try {
                  const chunkData = JSON.parse(dataStr);
                  
                  if (chunkData.type === "metadata" || chunkData.type === "final_metadata") {
                    currentMetadata = { ...currentMetadata, ...chunkData };
                    onMetadata?.(currentMetadata);
                  } else if (chunkData.type === "chunk") {
                    fullContent += chunkData.text;
                    onChunk?.(chunkData.text);
                  }
                } catch (e) {
                  console.warn("[STREAM] Error parsing chunk:", e, dataStr);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          abortControllerRef.current = null;
        }

        return { 
          content: fullContent,
          id: currentMetadata.id,
          sessionId: currentMetadata.sessionId,
          sources: currentMetadata.sources,
          expert_analyses: currentMetadata.expert_analyses,
          eli_explanation: currentMetadata.eli_explanation,
          diagnostics: currentMetadata.diagnostics,
          pipeline_latency_ms: currentMetadata.pipeline_latency_ms
        };
      } catch (error: unknown) {
        const err = error as Error;
        if (err.name === 'AbortError') {
          return { 
            content: fullContent, 
            id: currentMetadata.id,
            sessionId: currentMetadata.sessionId,
            sources: currentMetadata.sources,
            expert_analyses: currentMetadata.expert_analyses,
            eli_explanation: currentMetadata.eli_explanation,
            diagnostics: currentMetadata.diagnostics,
            pipeline_latency_ms: currentMetadata.pipeline_latency_ms,
            aborted: true 
          };
        }
        console.error("Chat Mutation Error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    }
  });

  return {
    ...mutation,
    stopGeneration
  };
};