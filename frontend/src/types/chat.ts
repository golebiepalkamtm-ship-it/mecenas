export interface Attachment {
  name: string;
  type: string;
  content: string;
}

export interface ExpertAnalysis {
  model: string;
  response: string;
  success?: boolean;
  latency_ms?: number;
}

export interface StepDiagnostic {
  step_name: string;
  latency_ms: number;
  status: 'ok' | 'error' | 'warning';
  details?: string;
  input_tokens?: number;
  output_tokens?: number;
}

export interface SourceReference {
  ref_id: string;
  label: string;
  source_type: string;
  snippet?: string;
  url?: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  cited_sources?: SourceReference[];
  expert_analyses?: ExpertAnalysis[];
  attachments?: Attachment[]; 
  eli_explanation?: string;
  consensus_used?: boolean;
  created_at?: string;
  selected_models_count?: number;
  aggregator_used?: string;
  pipeline_latency_ms?: number;
  context_chars?: number;
  diagnostics?: StepDiagnostic[];
}
