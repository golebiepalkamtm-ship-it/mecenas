"""Dynamiczny routing potoku — kiedy pominąć debatę MOA (koszt / latency)."""
from __future__ import annotations

from typing import Optional

from config import settings
from services.orchestrator_types import OrchestratorInputParams
from services.pipeline.fast_path import is_fast_statutory_query
from services.query_planner import QueryPlan


def resolve_skip_debate(
    params: OrchestratorInputParams,
    *,
    query_plan: Optional[QueryPlan] = None,
    use_fast_path: bool = False,
) -> tuple[bool, str]:
    """
    Zwraca (skip_debate, reason) — True = synteza bez równoległej debaty ekspertów.
    """
    mode = (params.chat_mode or "auto").strip().lower()

    if mode == "single" and not settings.debate_on_single:
        return True, "chat_mode=single"

    if mode in ("moa", "consensus"):
        return False, ""

    if use_fast_path:
        return True, "fast_statutory_path"

    if query_plan is not None:
        intent = (query_plan.intent or "").lower()
        if query_plan.skip_debate or intent == "article_explain":
            return True, f"query_planner:{intent or 'skip_debate'}"
        if (
            query_plan.estimated_complexity == "low"
            and not params.attachments
            and not (params.document_text or "").strip()
            and mode in ("moa", "consensus", "auto")
        ):
            return True, "query_planner:low_complexity"

    # Heurystyka: krótkie pytanie definicyjne bez akt
    if (
        settings.feature_fast_statutory_path
        and is_fast_statutory_query(
            params.user_query,
            document_text=params.document_text or "",
            attachments=params.attachments,
        )
        and mode == "auto" # Only skip if mode is auto. If they chose MOA, run MOA.
    ):
        return True, "heuristic:fast_statutory"

    return False, ""
