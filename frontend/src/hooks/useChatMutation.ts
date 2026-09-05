import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatExecutionState } from './chatSettingsSelectors';
import { useChatSettingsStore } from '../store/useChatSettingsStore';
import type {
  Attachment,
  ExpertAnalysis,
  ClaimScore,
  InvestigationSummary,
  StepDiagnostic,
  ChatMessage,
  SourceReference,
} from '../types/chat';
import type { ChatStreamEvent } from '../types/chatContract';
import { apiGetJson, apiPostStream } from '../services/apiClient';
import { buildChatPayload } from '../services/chatPayloadFactory';
import { consumeChatSSE } from '../utils/consumeChatSSE';

export interface ChatMetadata {
  id?: string;
  sessionId?: string;
  message?: string;
  final_answer?: string;
  sources?: string[];
  expert_analyses?: ExpertAnalysis[];
  eli_explanation?: string;
  diagnostics?: StepDiagnostic[];
  pipeline_latency_ms?: number;
  urgency_alerts?: string[];
  timeline?: ChatMessage['timeline'];
  gaps?: string[];
  inconsistencies?: string[];
  coi_conflicts?: string[];
  p_sukces?: number;
  confidence_score?: number;
  hitl_escalated?: boolean;
  synthesis_blocked?: boolean;
  hallucinated_cites?: string[];
  claim_scores?: ClaimScore[];
  investigation_summary?: InvestigationSummary;
  cited_sources?: SourceReference[];
}

interface ChatMutationData {
  message: string;
  history: { role: string; content: string }[];
  attachments?: Attachment[];
  sessionId?: string;
  document_text?: string;
  onChunk?: (chunk: string) => void;
  onMetadata?: (metadata: ChatMetadata) => void;
  use_saos?: boolean;
  use_eli?: boolean;
  use_rag_legal?: boolean;
  use_rag_user?: boolean;
  use_lexminde_mcp?: boolean;
  act_terms?: string[];
}

function normalizeUrgencyAlerts(alerts: unknown): string[] | undefined {
  if (!alerts || !Array.isArray(alerts)) return undefined;
  return alerts.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'description' in item) {
      const row = item as {
        description?: string;
        delivery_date?: string;
        event_date?: string;
        document_date?: string;
        deadline_date?: string;
        type?: string;
      };
      const deliveryLabel = row.delivery_date
        ? `doręczenie: ${row.delivery_date}`
        : row.type === 'pending_delivery'
          ? 'wymagana data doręczenia (nie data pisma)'
          : row.event_date
            ? `doręczenie: ${row.event_date}`
            : undefined;
      const parts = [row.description, deliveryLabel, row.deadline_date ? `ostatni dzień: ${row.deadline_date}` : undefined].filter(Boolean);
      return parts.join(' · ');
    }
    return String(item);
  });
}

export interface ChatMutationResult {
  content: string;
  id?: string;
  sessionId?: string;
  sources?: string[];
  expert_analyses?: ExpertAnalysis[];
  eli_explanation?: string;
  diagnostics?: unknown[];
  pipeline_latency_ms?: number;
  aborted?: boolean;
  urgency_alerts?: string[];
  timeline?: unknown[];
  gaps?: string[];
  inconsistencies?: string[];
  coi_conflicts?: string[];
  p_sukces?: number;
  confidence_score?: number;
  hitl_escalated?: boolean;
  synthesis_blocked?: boolean;
  hallucinated_cites?: string[];
  claim_scores?: ClaimScore[];
  investigation_summary?: InvestigationSummary;
  cited_sources?: SourceReference[];
}

export const useChatMutation = () => {
  const queryClient = useQueryClient();
  const {
    selectedSingleModel,
    selectedExperts,
    selectedJudge,
    mode,
    setModelLatencies,
  } = useChatExecutionState();

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
      const { message, history, attachments, sessionId, document_text, onChunk, onMetadata, use_saos, use_eli, use_rag_legal, use_rag_user, use_lexminde_mcp, act_terms } = data;
      
      // Stop any previous generation
      stopGeneration();
      
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // MANDATORY: Check status and latency of all models BEFORE sending
      let currentLatencies = useChatSettingsStore.getState().modelLatencies;
      try {
        const healthData = await apiGetJson<{
          success?: boolean;
          models?: Array<{ id: string; latency_ms: number }>;
        }>('/health/free-models', { signal: controller.signal });
        if (healthData.success && healthData.models) {
          const newMap: Record<string, number> = {};
          healthData.models.forEach((m: { id: string; latency_ms: number }) => {
            newMap[m.id] = m.latency_ms;
          });
          currentLatencies = newMap;
          // Update store globally
          setModelLatencies(newMap);
        }
      } catch (e) {
        console.warn("[CHAT] Quick health check failed, using cached values:", e);
      }

      let finalSingleModel = selectedSingleModel;
      let finalExperts = selectedExperts;
      let finalJudge = selectedJudge;


      // Fallback if still empty
      if (!finalSingleModel) finalSingleModel = "google/gemini-2.5-flash-lite";
      if (mode !== 'single' && finalExperts.length === 0) finalExperts = ["google/gemini-2.5-flash-lite"];
      if (mode !== 'single' && !finalJudge) finalJudge = "google/gemini-2.5-flash-lite";

      const payload = buildChatPayload(
        message,
        {
          attachments,
          sessionId,
          document_text,
          history,
          use_saos,
          use_eli,
          use_rag_legal,
          use_rag_user,
          use_lexminde_mcp,
          act_terms,
        },
        {
          finalSingleModel,
          finalExperts,
          finalJudge,
          modelLatencies: currentLatencies,
        },
      );

      let fullContent = "";
      let currentMetadata: ChatMetadata = {};

      try {
        const response = await apiPostStream('/chat', payload, {
          signal: controller.signal,
        });

        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error("Nie można zainicjalizować strumienia danych.");
        }

        try {
          await consumeChatSSE(reader, (chunkData: ChatStreamEvent) => {
            const chunkType = chunkData.type;

            if (chunkType === 'error') {
              const errText = String(chunkData.text ?? 'Nieznany błąd strumienia');
              throw new Error(errText);
            }

            if (chunkType === 'action_required' && chunkData.action === 'select_model') {
              // IMR: Wstrzymujemy proces i powiadamiamy UI (np. ModelRecoveryModal)
              window.dispatchEvent(
                new CustomEvent('imr_action_required', { detail: chunkData })
              );
              return; // Nie zamykamy strumienia, po prostu ignorujemy ten kawałek w głównym oknie czatu
            }

            if (chunkType === 'metadata' || chunkType === 'final_metadata') {
              const { urgency_alerts, ...restChunkData } = chunkData;
              const normalizedChunkData: ChatMetadata = {
                ...restChunkData,
                ...(urgency_alerts !== undefined
                  ? { urgency_alerts: normalizeUrgencyAlerts(urgency_alerts) }
                  : {}),
              };
              currentMetadata = { ...currentMetadata, ...normalizedChunkData };
              onMetadata?.(currentMetadata);
              if (chunkType === 'final_metadata' && typeof chunkData.final_answer === 'string') {
                const finalAnswer = chunkData.final_answer;
                if (!fullContent.trim() && finalAnswer.trim()) {
                  fullContent = finalAnswer;
                  onChunk?.(finalAnswer);
                } else if (finalAnswer.length > fullContent.length) {
                  const delta = finalAnswer.slice(fullContent.length);
                  fullContent = finalAnswer;
                  if (delta) onChunk?.(delta);
                }
              }
            } else if (chunkType === 'chunk') {
              const text = String(chunkData.text ?? '');
              fullContent += text;
              onChunk?.(text);
            }
          });
        } finally {
          reader.releaseLock();
          abortControllerRef.current = null;
        }

        if (!fullContent.trim() && typeof currentMetadata.final_answer === 'string') {
          fullContent = currentMetadata.final_answer;
        }

        return { 
          content: fullContent,
          id: currentMetadata.id,
          sessionId: currentMetadata.sessionId,
          sources: currentMetadata.sources,
          expert_analyses: currentMetadata.expert_analyses,
          eli_explanation: currentMetadata.eli_explanation,
          diagnostics: currentMetadata.diagnostics,
          pipeline_latency_ms: currentMetadata.pipeline_latency_ms,
          urgency_alerts: normalizeUrgencyAlerts(currentMetadata.urgency_alerts),
          timeline: currentMetadata.timeline,
          gaps: currentMetadata.gaps,
          inconsistencies: currentMetadata.inconsistencies,
          coi_conflicts: currentMetadata.coi_conflicts,
          p_sukces: currentMetadata.p_sukces,
          confidence_score: currentMetadata.confidence_score,
          hitl_escalated: currentMetadata.hitl_escalated,
          synthesis_blocked: currentMetadata.synthesis_blocked,
          hallucinated_cites: currentMetadata.hallucinated_cites,
          claim_scores: currentMetadata.claim_scores,
          investigation_summary: currentMetadata.investigation_summary,
          cited_sources: currentMetadata.cited_sources,
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
            aborted: true,
            urgency_alerts: normalizeUrgencyAlerts(currentMetadata.urgency_alerts),
            timeline: currentMetadata.timeline,
            gaps: currentMetadata.gaps,
            inconsistencies: currentMetadata.inconsistencies,
            coi_conflicts: currentMetadata.coi_conflicts,
            p_sukces: currentMetadata.p_sukces,
            confidence_score: currentMetadata.confidence_score,
            hitl_escalated: currentMetadata.hitl_escalated,
            synthesis_blocked: currentMetadata.synthesis_blocked,
            hallucinated_cites: currentMetadata.hallucinated_cites,
            claim_scores: currentMetadata.claim_scores,
            investigation_summary: currentMetadata.investigation_summary,
            cited_sources: currentMetadata.cited_sources,
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
