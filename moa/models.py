# ===========================================================================
# MOA Models — Precyzyjne typowanie danych wejściowych/wyjściowych
# ===========================================================================
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


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


# ---------------------------------------------------------------------------
# Fragment z bazy wiedzy (Supabase pgvector)
# ---------------------------------------------------------------------------
@dataclass
class RetrievedChunk:
    """Pojedynczy fragment dokumentu pobrany z bazy wektorowej."""

    content: str
    source: str  # Nazwa pliku / kodeksu
    similarity: float = 0.0


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
    total_context_chars: int = 0
    retrieved_chunks_count: int = 0
    pipeline_latency_ms: float = 0.0
    success: bool = True
    error: Optional[str] = None
