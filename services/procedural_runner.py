"""Procedural engine always-on — poza blokiem investigation."""
from __future__ import annotations

import json
import logging
from typing import Any, Callable, Dict, Optional

from config import settings
from services.deadline_engine import build_procedural_brief
from services.investigation.procedural_engine import ProceduralAttackEngine
from services.investigation.types import CaseInvestigationState

logger = logging.getLogger(__name__)


async def build_procedural_context_block(
    *,
    text: str,
    call_llm: Optional[Callable[..., Any]] = None,
    model_id: str = "",
    response_mode: str = "strategic",
    use_llm: bool = True,
) -> str:
    """Deterministic brief + opcjonalnie LLM attacks (gdy strategic / długi akt)."""
    if not settings.feature_procedural_always_on or not text.strip():
        return ""

    brief = build_procedural_brief(text)
    lines = list(brief.get("summary_lines") or [])
    block = "[PROCEDURA — skan]\n" + "\n".join(lines)

    want_llm = (
        use_llm
        and call_llm
        and model_id
        and (
            (response_mode or "").lower() in ("strategic", "advisor", "draft")
            or len(text) > 8000
        )
    )
    if not want_llm:
        return block[:4000]

    state = CaseInvestigationState()
    try:
        report = await ProceduralAttackEngine(state).build_report(
            text=text,
            call_llm=call_llm,
            model_id=model_id,
        )
        if report.strip():
            return (block + "\n\n" + report.strip())[:4000]
    except Exception as e:
        logger.warning("[ProceduralRunner] %s", e)
    return block[:4000]


def build_deadline_alerts(text: str) -> list[Dict[str, Any]]:
    """MVP alerty z dat doręczenia — 14 dni domyślnie."""
    from datetime import datetime, timedelta

    from services.deadline_engine import (
        build_alerts_from_items,
        calculate_legal_deadline,
        extract_delivery_dates,
    )

    if not settings.feature_deadline_alerts:
        return []

    deliveries = extract_delivery_dates(text)
    if not deliveries:
        return []

    items = []
    for d in deliveries[:3]:
        items.append({
            "description": "Termin na odwołanie / czynność po doręczeniu",
            "term_days": 14,
            "delivery_date": d.get("delivery_date"),
        })
    ref = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    alerts = build_alerts_from_items(items, reference_date=ref)
    return alerts[:5]
