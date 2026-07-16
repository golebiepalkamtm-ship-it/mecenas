from __future__ import annotations

from typing import Optional

from config import DEFAULT_MODELS, DEPRECATED_MODEL_ALIASES


def resolve_model_id(model_id: Optional[str]) -> str:
    if not model_id:
        from database import get_setting
        return get_setting("assigned_model_judge", "").strip() or DEFAULT_MODELS[0]
    return DEPRECATED_MODEL_ALIASES.get(model_id.strip(), model_id.strip())
