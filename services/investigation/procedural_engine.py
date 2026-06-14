"""Silnik proceduralny — reguły + krótka synteza LLM listy usterek formalnych."""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Dict, List

from config import settings
from services.deadline_engine import (
    build_procedural_brief,
    extract_delivery_dates,
    extract_document_issue_dates,
)
from services.investigation.types import CaseInvestigationState

logger = logging.getLogger(__name__)


class ProceduralAttackEngine:
    """Wykrywanie haczyków proceduralnych przed debatą ekspertów."""

    def __init__(self, state: CaseInvestigationState):
        self.state = state

    def deterministic_scan(self, text: str) -> Dict[str, Any]:
        if not text.strip():
            return {"stage": "unknown", "deliveries": [], "issues": []}
        brief = build_procedural_brief(text)
        deliveries = extract_delivery_dates(text)
        doc_dates = extract_document_issue_dates(text)
        issues: List[str] = []
        if deliveries:
            issues.append(f"Wykryto daty doręczenia/odbioru: {len(deliveries)}")
        if doc_dates:
            issues.append("Wykryto daty wydania pisma — sprawdź, czy nie mylone z doręczeniem.")
        stage = brief.get("stage") or infer_stage_fallback(text)
        return {
            "stage": stage,
            "deliveries": deliveries[:5],
            "document_issue_dates": doc_dates[:5],
            "procedural_brief": brief,
            "issues": issues,
        }

    async def build_report(
        self,
        *,
        text: str,
        call_llm: Callable[..., Any],
        model_id: str,
    ) -> str:
        det = self.deterministic_scan(text)
        if self.state.budget_llm_calls >= settings.investigation_max_llm_calls:
            return self._format_det_only(det)
        self.state.budget_llm_calls += 1
        prompt = (
            "Jesteś audytorem procedury administracyjnej/sądowej (PL). Na podstawie JSON i tekstu pisma "
            "wypisz listę potencjalnych WAD PROCEDURALNYCH (numery 1..n): terminy, doręczenie, pouczenie, "
            "podstawa prawna, kompetencja, dowód, przesłuchanie stron, kolejność czynności.\n"
            "Nie wymyślaj faktów spoza tekstu. Zwróć JSON: "
            '{"summary":"...","attacks":["...","..."]}\n\n'
            f"DETERMINISTYCZNE:\n{json.dumps(det, ensure_ascii=False)[:6000]}\n\n"
            f"TEKST (fragment):\n{text[:8000]}"
        )
        raw, _ = await call_llm(
            model_id,
            [{"role": "user", "content": prompt}],
            max_tokens=900,
            temperature=0.1,
            timeout=50.0,
        )
        txt = (raw or "").strip()
        m = re.search(r"\{[\s\S]*\}", txt)
        attacks: List[str] = []
        summary = ""
        if m:
            try:
                data = json.loads(m.group(0))
                attacks = [str(x) for x in (data.get("attacks") or [])]
                summary = str(data.get("summary") or "")
            except json.JSONDecodeError:
                pass
        if not attacks and det.get("issues"):
            attacks = list(det["issues"])
        block = self._format_block(det, summary, attacks)
        self.state.procedural_report_text = block
        return block

    def _format_det_only(self, det: Dict[str, Any]) -> str:
        return self._format_block(det, "", det.get("issues") or [])

    def _format_block(self, det: Dict[str, Any], summary: str, attacks: List[str]) -> str:
        lines = [
            "[PROCEDURAL ATTACK ENGINE — auto]",
            f"Etap (heurystyka): {det.get('stage')}",
        ]
        if summary:
            lines.append(f"Podsumowanie: {summary}")
        if attacks:
            lines.append("Potencjalne usterek formalne:")
            for a in attacks[:12]:
                lines.append(f"- {a}")
        return "\n".join(lines)


def infer_stage_fallback(text: str) -> str:
    t = text.lower()
    if "kpa" in t or "postępowanie administracyj" in t:
        return "administracyjne"
    if "kpk" in t or "postępowanie karn" in t:
        return "karne"
    if "kpc" in t or "postępowanie cywiln" in t:
        return "cywilne"
    return "nieokreślone"
