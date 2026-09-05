from __future__ import annotations

from typing import Optional

from config import DEFAULT_MODELS, DEPRECATED_MODEL_ALIASES


def resolve_model_id(model_id: Optional[str]) -> str:
    from config import settings
    return settings.resolve_model_id(model_id)
