import type { LucideIcon } from "lucide-react";

export interface Attachment {
  name: string;
  type: string;
  content: string; // Base64
}

export interface QueuedAttachment {
  id: string;
  file: File;
  status: 'waiting' | 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  extractedText?: string;
  error?: string;
}

export interface ExpertAnalysis {
  model: string;
  response: string;
  success?: boolean;
  latency_ms?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  attachments?: Attachment[];
  consensus_used?: boolean;
  expert_analyses?: ExpertAnalysis[];
  selected_models_count?: number;
  aggregator_used?: string;
  pipeline_latency_ms?: number;
  context_chars?: number;
  created_at?: string;
}

export interface Model {
  id: string;
  name: string;
  active: boolean;
  provider: string;
  vision: boolean;
  description?: string;
  model_id?: string;
}

export interface BrandConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  accent: string;
}

export interface Session {
  id: string;
  title?: string;
  created_at?: string;
}
