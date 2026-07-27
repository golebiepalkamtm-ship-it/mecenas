"""Long-context path — single-pass gdy dokument mieści się w oknie modelu."""
from __future__ import annotations

from config import settings


def should_use_long_context_path(document_text: str) -> bool:
    if not settings.feature_long_context_path:
        return False
    n = len((document_text or "").strip())
    return 0 < n <= settings.long_context_max_chars


def long_context_model_id() -> str:
    from database import get_setting
    assigned = get_setting("assigned_model_long_context", "").strip()
    if assigned:
        return assigned
    return settings.long_context_model.strip() or "deepseek/deepseek-v4-flash"


def long_context_expert_chunk_note() -> str:
    return (
        "\n[LONG CONTEXT] Pełny dokument w jednym przebiegu — "
        "eksperci mogą analizować całość bez podziału na 4 fragmenty.\n"
    )
