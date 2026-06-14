"""Trwały skrót stanu śledztwa per sesja (SQLite)."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from services.investigation.types import CaseInvestigationState

logger = logging.getLogger(__name__)


def state_to_public_memory_dict(state: CaseInvestigationState) -> Dict[str, Any]:
    return {
        "successful_arguments": [
            h.label for h in state.hypotheses if h.priority >= 4
        ],
        "failed_arguments": state.open_questions[:20],
        "hypothesis_labels": [h.label for h in state.hypotheses],
        "research_rounds": len(state.research_rounds),
        "evidence_count": len(state.evidence),
        "procedural_had_report": bool(state.procedural_report_text),
        "problem_tags": list(state.problem_tags),
    }


def load_case_state_for_session(session_id: Optional[str]) -> Optional[CaseInvestigationState]:
    if not session_id:
        return None
    try:
        import database

        raw = database.get_session_investigation_state(session_id)
        if not raw:
            return None
        data = json.loads(raw)
        return CaseInvestigationState.from_dict(data)
    except Exception as e:
        logger.debug("[INV] load case state: %s", e)
        return None


def save_case_state_for_session(session_id: Optional[str], state: CaseInvestigationState) -> None:
    if not session_id:
        return
    payload = json.dumps(state.to_dict(), ensure_ascii=False)
    try:
        import database

        database.save_session_investigation_state(session_id, payload)
    except Exception as e:
        logger.warning("[INV] save case state SQLite: %s", e)

    try:
        from services.case_memory_store import upsert_case_memory_supabase

        upsert_case_memory_supabase(session_id, state.to_dict())
    except Exception as e:
        logger.debug("[INV] save case state Supabase: %s", e)
