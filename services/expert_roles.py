from __future__ import annotations

from typing import Any, Optional

from moa.prompt_builder import get_role_prompt


def resolve_expert_role_block(
    *,
    model_id: str,
    default_role: str,
    expert_roles: Optional[dict] = None,
    expert_role_prompts: Optional[dict] = None,
    role_catalog: Optional[dict] = None,
    side: str = "defense",
) -> str:
    if expert_role_prompts and model_id in expert_role_prompts:
        custom = (expert_role_prompts[model_id] or "").strip()
        if custom:
            return custom
    catalog = role_catalog or {}
    prompt_side: str = side if side in ("defense", "prosecution") else "defense"
    if expert_roles and model_id in expert_roles:
        role_id = expert_roles[model_id]
        if role_id in catalog:
            return str(catalog[role_id] or "")
        preset = get_role_prompt(role_id, side=prompt_side)  # type: ignore[arg-type]
        if preset:
            return preset
    return default_role
