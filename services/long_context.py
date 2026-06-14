"""Long-context path — single-pass gdy dokument mieści się w oknie modelu."""
from __future__ import annotations

from config import settings


def should_use_long_context_path(document_text: str) -> bool:
    if not settings.feature_long_context_path:
        return False
    n = len((document_text or "").strip())
    return 0 < n <= settings.long_context_max_chars


def long_context_model_id() -> str:
    return settings.long_context_model.strip() or "google/gemini-2.5-pro"


def long_context_expert_chunk_note() -> str:
    return (
        "\n[LONG CONTEXT] Pełny dokument w jednym przebiegu — "
        "eksperci mogą analizować całość bez podziału na 4 fragmenty.\n"
    )
