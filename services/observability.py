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
    """Strukturalny log JSON per etap (observability MVP)."""
    import json

    event: Dict[str, Any] = {"stage": stage, "event": "pipeline_stage"}
    if session_id:
        event["session_id"] = session_id
    if duration_ms is not None:
        event["duration_ms"] = duration_ms
    if extra:
        event.update(extra)
    logger.info("[PIPELINE_STAGE] %s", json.dumps(event, ensure_ascii=False))
