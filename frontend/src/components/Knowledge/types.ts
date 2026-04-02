export interface KnowledgeDocument {
  id: string;
  name: string;
  chunks?: number;
}

export interface KnowledgeViewProps {
  documents: KnowledgeDocument[];
  uploadPDF: (file: File) => Promise<void>;
  removeFile: (name: string) => Promise<void>;
  isUploading: boolean;
}
