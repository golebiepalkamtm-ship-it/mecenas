/** Kontrakt API czatu — zgodny z schemas/chat_contract.py */

import type { HearingRound } from '../store/useTrialRoomStore';
import type {
  ClaimScore,
  ExpertAnalysis,
  InvestigationSummary,
  SourceReference,
  StepDiagnostic,
  ChatMessage,
} from './chat';

export type ChatMode = 'single' | 'moa' | 'consensus';

export type ResponseMode = 'citizen' | 'strategic' | 'draft';

export type ProcessSide = 'defense' | 'prosecution';

export interface PromptOverrides {
  architect_prompt?: string;
  system_role_prompt?: string;
  judge_system_prompt?: string;
  task_prompt?: string;
  role_catalog?: Record<string, string>;
  expert_role_prompts?: Record<string, string>;
}

export interface MoaOptions {
  selected_models: string[];
  aggregator_model: string;
  expert_roles_map: Record<string, string>;
}

export interface ChatAttachment {
  id?: string;
  name?: string;
  type?: string;
  mime_type?: string;
  content_type?: string;
  url?: string;
  text?: string;
  size?: number;
  content?: unknown;
}

export interface ChatHistoryMessage {
  role: string;
  content: string | unknown[] | Record<string, unknown>;
}

export interface ChatPayloadV2 {
  message: string;
  chat_mode: ChatMode;
  response_mode: ResponseMode;
  side: ProcessSide;
  active_system_role_id?: string;
  current_task?: string;
  prompt_overrides: PromptOverrides;
  moa_options?: MoaOptions;
  model?: string;
  sessionId?: string;
  attachments?: ChatAttachment[];
  document_text?: string;
  history?: ChatHistoryMessage[];
  act_terms?: string[];
  use_saos?: boolean;
  use_eli?: boolean;
  use_rag_legal?: boolean;
  use_rag_user?: boolean;
  use_lexminde_mcp?: boolean;
  model_latencies?: Record<string, number>;
  stream?: boolean;
  active_prompt_preset_id?: string;

  // Transitional compatibility fields. Keep until backend legacy adapter is removed.
  selected_models?: string[];
  aggregator_model?: string;
  expert_roles?: Record<string, string>;
  architect_prompt?: string;
  system_role_prompt?: string;
  judge_system_prompt?: string;
  task_prompt?: string;
  role_catalog?: Record<string, string>;
  expert_role_prompts?: Record<string, string>;
}

export interface ChatMutationExtras {
  attachments?: ChatAttachment[];
  sessionId?: string;
  document_text?: string;
  history?: ChatHistoryMessage[];
  use_saos?: boolean;
  use_eli?: boolean;
  use_rag_legal?: boolean;
  use_rag_user?: boolean;
  use_lexminde_mcp?: boolean;
  act_terms?: string[];
}

export interface StreamMetadataEvent {
  type: 'metadata';
  id?: string;
  sessionId?: string;
  message?: string;
  expert_analyses?: ExpertAnalysis[];
  urgency_alerts?: unknown[];
}

export interface StreamChunkEvent {
  type: 'chunk';
  text: string;
}

export interface StreamFinalMetadataEvent {
  type: 'final_metadata';
  id?: string;
  sessionId?: string;
  final_answer?: string;
  sources?: string[];
  expert_analyses?: ExpertAnalysis[];
  eli_explanation?: string;
  diagnostics?: StepDiagnostic[];
  pipeline_latency_ms?: number;
  urgency_alerts?: unknown[];
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
  hearing_rounds?: HearingRound[];
}

export interface StreamErrorEvent {
  type: 'error';
  text?: string;
}

export interface TrialRoundEvent {
  type: 'trial_round';
  side?: string;
  round?: number | string;
  text?: string;
  model?: string;
}

export type ChatStreamEvent =
  | StreamMetadataEvent
  | StreamChunkEvent
  | StreamFinalMetadataEvent
  | StreamErrorEvent
  | TrialRoundEvent;
