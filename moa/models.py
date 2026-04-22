# ===========================================================================
# MOA Models — Precyzyjne typowanie danych wejściowych/wyjściowych
# ===========================================================================
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, List


# ---------------------------------------------------------------------------
# Diagnostyka kroków pipeline'u
# ---------------------------------------------------------------------------
@dataclass
class StepDiagnostic:
    """Szczegółowa diagnostyka pojedynczego kroku w pipeline."""

    step_name: str
    latency_ms: float
    status: str = "ok"
    details: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


# ---------------------------------------------------------------------------
# Dane wejściowe
# ---------------------------------------------------------------------------
@dataclass
class MOARequest:
    """Żądanie do pipeline'u MOA."""

    query: str
    session_id: Optional[str] = None
    analyst_models: Optional[list[str]] = None  # Jeśli None → domyślne
    judge_model: Optional[str] = None  # Jeśli None → domyślny
    match_count: int = 12
    match_threshold: float = 0.3
    task: Optional[str] = (
        None  # Typ zadania (general/analysis/drafting/research/strategy)
    )
    custom_task_prompt: Optional[str] = None
    architect_prompt: Optional[str] = None
    system_role_prompt: Optional[str] = None
    document_text: Optional[str] = (
        None  # Treść dokumentu użytkownika (oddzielna od query)
    )
    history: list[dict] = field(default_factory=list)
    mode: Optional[str] = "advocate"
    category: Optional[str] = None  # rag_legal lub user_docs
    expert_roles: Optional[dict[str, str]] = None
    expert_role_prompts: Optional[dict[str, str]] = None
    judge_system_prompt: Optional[str] = None
    api_keys: Optional[dict[str, str]] = None
    attachments: list[dict] = field(
        default_factory=list
    )  # Nowość: wsparcie dla obrazów/plików
    include_user_db: bool = False
    context_text: Optional[str] = None
    model_latencies: Optional[dict[str, float]] = field(default_factory=dict)
    user_id: str = "default"


# ---------------------------------------------------------------------------
# Fragment z bazy wiedzy (Supabase pgvector)
# ---------------------------------------------------------------------------
@dataclass
class RetrievedChunk:
    """Pojedynczy fragment dokumentu pobrany z bazy wektorowej."""

    content: str
    source: str  # Nazwa pliku / kodeksu
    similarity: float = 0.0
    source_type: str = "knowledge"  # "law" | "judgment" | "knowledge"
    source_url: Optional[str] = None  # URL do źródła (ISAP/SAOS/ELI)
    ref_id: Optional[str] = None  # Identyfikator referencji [1], [2]...


@dataclass
class SourceReference:
    """Referencja źródłowa do wyświetlenia obok odpowiedzi (jak Libra)."""

    ref_id: str  # np. "[1]", "[2]"
    label: str  # np. "Art. 62 ust. 1 u.p.n."
    source_type: str  # "law" | "judgment" | "knowledge"
    snippet: str = ""  # Krótki fragment treści
    url: Optional[str] = None  # URL do pełnego źródła


# ---------------------------------------------------------------------------
# Wynik analizy jednego modelu
# ---------------------------------------------------------------------------
@dataclass
class AnalystResult:
    """Odpowiedź jednego z analityków."""

    model_id: str
    response: str
    success: bool = True
    error: Optional[str] = None
    retries_used: int = 0
    latency_ms: float = 0.0

    @property
    def model(self):
        """Dla kompatybilności wstecznej — wiele części kodu może szukać .model zamiast .model_id."""
        return self.model_id


# ---------------------------------------------------------------------------
# Końcowy wynik pipeline'u
# ---------------------------------------------------------------------------
@dataclass
class MOAResult:
    """Pełna odpowiedź z pipeline'u Mixture of Agents."""

    final_answer: str
    judge_model: str
    analyst_results: list[AnalystResult] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    cited_sources: list[SourceReference] = field(
        default_factory=list
    )  # Inline citations jak Libra
    total_context_chars: int = 0
    retrieved_chunks_count: int = 0
    pipeline_latency_ms: float = 0.0
    success: bool = True
    error: Optional[str] = None
    eli_explanation: Optional[str] = None
    diagnostics: List[StepDiagnostic] = field(default_factory=list)
