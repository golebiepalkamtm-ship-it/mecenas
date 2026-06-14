/** Kontrakt API czatu — zgodny z schemas/chat_contract.py */

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
  attachments?: Array<Record<string, unknown>>;
  document_text?: string;
  history?: Array<{ role: string; content: string }>;
  act_terms?: string[];
  use_saos?: boolean;
  use_eli?: boolean;
  use_rag_legal?: boolean;
  use_rag_user?: boolean;
  model_latencies?: Record<string, number>;
  stream?: boolean;
}

export interface ChatMutationExtras {
  attachments?: unknown[];
  sessionId?: string;
  document_text?: string;
  history?: Array<{ role: string; content: string }>;
  use_saos?: boolean;
  use_eli?: boolean;
  use_rag_legal?: boolean;
  use_rag_user?: boolean;
  act_terms?: string[];
}
