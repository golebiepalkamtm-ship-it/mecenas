"""Observability — timing etapów pipeline (MVP bez OpenTelemetry)."""
from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, Generator, Optional

logger = logging.getLogger(__name__)


class PipelineTimer:
    def __init__(self) -> None:
        self._spans: Dict[str, float] = {}
        self._start = time.perf_counter()

    @contextmanager
    def span(self, name: str) -> Generator[None, None, None]:
        t0 = time.perf_counter()
        try:
            yield
        finally:
            self._spans[name] = round((time.perf_counter() - t0) * 1000, 1)

    def total_ms(self) -> float:
        return round((time.perf_counter() - self._start) * 1000, 1)

    def record_elapsed(self, name: str, started_at: float) -> None:
        """Zapisuje czas od started_at (perf_counter) — dla bloków z yield w generatorze."""
        self._spans[name] = round((time.perf_counter() - started_at) * 1000, 1)

    def as_dict(self) -> Dict[str, Any]:
        return {"stages_ms": dict(self._spans), "total_ms": self.total_ms()}


def log_pipeline_timing(timer: Optional[PipelineTimer], session_id: Optional[str] = None) -> None:
    if not timer:
        return
    payload = timer.as_dict()
    if session_id:
        payload["session_id"] = session_id
    logger.info("[PIPELINE_TIMING] %s", payload)


def log_stage_event(
    stage: str,
    *,
    session_id: Optional[str] = None,
    duration_ms: Optional[float] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """Strukturalny log JSON per etap (observability MVP).

    Automatycznie persystuje zdarzenia prawnie istotne do audit trail
    (hash-chain SHA-256) jeśli session_id jest podany.
    """
    import json

    event: Dict[str, Any] = {"stage": stage, "event": "pipeline_stage"}
    if session_id:
        event["session_id"] = session_id
    if duration_ms is not None:
        event["duration_ms"] = duration_ms
    if extra:
        event.update(extra)
    logger.info("[PIPELINE_STAGE] %s", json.dumps(event, ensure_ascii=False))

    # Audit trail — persystuj zdarzenia prawnie istotne
    _AUDIT_STAGES = {
        "citation_audit",
        "sidecar",
        "retrieval_external",
        "pipeline_complete",
        "private_context",
        "timeline",
    }
    if session_id and stage in _AUDIT_STAGES:
        try:
            from services.audit_trail import append_audit_event

            audit_payload = dict(extra or {})
            if duration_ms is not None:
                audit_payload["duration_ms"] = duration_ms
            append_audit_event(
                session_id,
                event_type=stage.upper(),
                payload=audit_payload,
            )
        except Exception as exc:
            logger.debug("[AUDIT_TRAIL] Zapis pominięty: %s", exc)

def log_quality_metrics(
    session_id: str,
    metrics: Dict[str, Any]
) -> None:
    """Loguje metryki jakości (Quality Metrics) wygenerowane na końcu pipeline'u V3.0."""
    import json
    from config import settings
    
    if not getattr(settings, "feature_quality_metrics", False):
        return
        
    payload = {
        "event": "quality_metrics",
        "session_id": session_id,
        "metrics": metrics
    }
    logger.info("[QUALITY_METRICS] %s", json.dumps(payload, ensure_ascii=False))
