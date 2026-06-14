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
  /** Pełne brzmienie przepisu do weryfikacji (zwijane w UI). */
  full_text?: string | null;
  verified?: boolean;
  url?: string;
}

export interface ClaimScore {
  hypothesis_id: string;
  label: string;
  legal_strength: number;
  procedural_strength: number;
  precedent_support: number;
  contradiction_risk: number;
  notes?: string;
}

export interface InvestigationSummary {
  hypothesis_count?: number;
  research_rounds?: number;
  problem_tags?: string[];
  evidence_count?: number;
  budget_llm_calls?: number;
  budget_retrieval_calls?: number;
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
  urgency_alerts?: string[];
  timeline?: Array<{
    date: string;
    event: string;
    source: string;
    impact: string;
  }>;
  gaps?: string[];
  inconsistencies?: string[];
  coi_conflicts?: string[];
  p_sukces?: number;
  confidence_score?: number;
  hitl_escalated?: boolean;
  synthesis_blocked?: boolean;
  hallucinated_cites?: string[];
  /** Legal Investigation v2 — ocena hipotez (backend: 0–1) */
  claim_scores?: ClaimScore[];
  investigation_summary?: InvestigationSummary;
  /** Etapy potoku widoczne podczas generowania odpowiedzi */
  pipeline_log?: string[];
}
