export interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  chunks?: number;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  chunks: number;
  status: string;
  created_at: string;
  type?: 'document' | 'image';
  content?: string;
}
