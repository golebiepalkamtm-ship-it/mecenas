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
  updated_at?: string;
}
