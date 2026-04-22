import type { LucideIcon } from "lucide-react";

export type { Attachment, ExpertAnalysis, ChatMessage as Message } from "../../types/chat";

export interface QueuedAttachment {
  id: string;
  file: File;
  status: 'waiting' | 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  extractedText?: string;
  previewUrl?: string; // Cache dla Object URL
  error?: string;
}

export interface Model {
  id: string;
  name: string;
  active: boolean;
  provider: string;
  vision: boolean;
  free: boolean;
  description?: string;
  model_id?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
    image?: string;
  };
  architecture?: {
    tokenizer?: string;
    instruct_type?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  api_source?: string;
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
  updated_at?: string;
}
