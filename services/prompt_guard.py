"""Sanityzacja prompt_overrides z payloadu — limit długości, strip injection markers."""
from __future__ import annotations

import re
from typing import Dict, Optional

MAX_PROMPT_CHARS = 32_000
MAX_ROLE_CATALOG_ENTRIES = 24

_INJECTION_PATTERNS = (
    re.compile(r"<\s*/?\s*system\s*>", re.I),
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.I),
)


def _clip_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.replace("\x00", "").strip()
    if not cleaned:
        return None
    for pat in _INJECTION_PATTERNS:
        cleaned = pat.sub("", cleaned)
    if len(cleaned) > MAX_PROMPT_CHARS:
        cleaned = cleaned[:MAX_PROMPT_CHARS]
    return cleaned


def sanitize_prompt_overrides(
    *,
    architect_prompt: Optional[str] = None,
    system_role_prompt: Optional[str] = None,
    judge_system_prompt: Optional[str] = None,
    task_prompt: Optional[str] = None,
    role_catalog: Optional[Dict[str, str]] = None,
    expert_role_prompts: Optional[Dict[str, str]] = None,
) -> dict:
    """Zwraca oczyszczone pola — backend ma ostatnie słowo nad długością i oczywistymi injection."""
    catalog_out: Optional[Dict[str, str]] = None
    if role_catalog:
        catalog_out = {}
        for i, (k, v) in enumerate(role_catalog.items()):
            if i >= MAX_ROLE_CATALOG_ENTRIES:
                break
            key = str(k).strip()[:128]
            val = _clip_text(str(v))
            if key and val:
                catalog_out[key] = val

    expert_out: Optional[Dict[str, str]] = None
    if expert_role_prompts:
        expert_out = {}
        for i, (k, v) in enumerate(expert_role_prompts.items()):
            if i >= MAX_ROLE_CATALOG_ENTRIES:
                break
            key = str(k).strip()[:256]
            val = _clip_text(str(v))
            if key and val:
                expert_out[key] = val

    return {
        "architect_prompt": _clip_text(architect_prompt),
        "system_role_prompt": _clip_text(system_role_prompt),
        "judge_system_prompt": _clip_text(judge_system_prompt),
        "task_prompt": _clip_text(task_prompt),
        "role_catalog": catalog_out,
        "expert_role_prompts": expert_out,
    }
