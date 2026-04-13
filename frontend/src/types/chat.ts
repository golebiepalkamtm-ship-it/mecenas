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

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  expert_analyses?: ExpertAnalysis[];
  attachments?: Attachment[]; 
  eli_explanation?: string;
  consensus_used?: boolean;
  created_at?: string;
  selected_models_count?: number;
  aggregator_used?: string;
  pipeline_latency_ms?: number;
  context_chars?: number;
}
