"""Jawny kontrakt eventów SSE dla czatu."""
from __future__ import annotations

import json
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class StreamMetadataEvent(BaseModel):
    type: str = "metadata"
    id: Optional[str] = None
    sessionId: Optional[str] = None
    message: Optional[str] = None
    expert_analyses: Optional[List[Any]] = None
    urgency_alerts: Optional[List[Any]] = None


class StreamChunkEvent(BaseModel):
    type: str = "chunk"
    text: str = ""


class StreamFinalMetadataEvent(BaseModel):
    type: str = "final_metadata"
    id: Optional[str] = None
    sessionId: Optional[str] = None
    final_answer: Optional[str] = None
    sources: List[Any] = Field(default_factory=list)
    expert_analyses: List[Any] = Field(default_factory=list)
    eli_explanation: str = ""
    diagnostics: List[Any] = Field(default_factory=list)
    pipeline_latency_ms: int = 0
    urgency_alerts: List[Any] = Field(default_factory=list)
    timeline: List[Any] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    inconsistencies: List[str] = Field(default_factory=list)
    coi_conflicts: List[str] = Field(default_factory=list)
    p_sukces: Optional[float] = None
    confidence_score: float = 95.0
    hitl_escalated: bool = False
    synthesis_blocked: bool = False
    hallucinated_cites: List[Any] = Field(default_factory=list)
    saos_count: int = 0
    eli_count: int = 0
    claim_scores: List[Any] = Field(default_factory=list)
    investigation_summary: Optional[dict[str, Any]] = None
    cited_sources: List[Any] = Field(default_factory=list)


class StreamErrorEvent(BaseModel):
    type: str = "error"
    text: str


def build_final_metadata_event(
    *,
    message_id: str,
    session_id: str,
    final_answer: str,
    analysis: list[Any],
    raw_chunk: dict[str, Any],
) -> StreamFinalMetadataEvent:
    p_sukces = raw_chunk.get("p_sukces")
    if not isinstance(p_sukces, (int, float)):
        p_sukces = None

    claim_scores = raw_chunk.get("claim_scores")
    if not isinstance(claim_scores, list):
        claim_scores = []

    investigation_summary = raw_chunk.get("investigation_summary")
    if not isinstance(investigation_summary, dict):
        investigation_summary = None

    cited_sources = raw_chunk.get("cited_sources")
    if not isinstance(cited_sources, list):
        cited_sources = []

    hallucinated_cites = raw_chunk.get("hallucinated_cites")
    if not isinstance(hallucinated_cites, list):
        hallucinated_cites = []

    return StreamFinalMetadataEvent(
        id=message_id,
        sessionId=session_id,
        final_answer=final_answer or None,
        sources=raw_chunk.get("sources", []),
        expert_analyses=raw_chunk.get("expert_analyses", analysis),
        eli_explanation=raw_chunk.get("eli_explanation", ""),
        pipeline_latency_ms=raw_chunk.get("pipeline_latency_ms", 0),
        urgency_alerts=raw_chunk.get("urgency_alerts", []),
        timeline=raw_chunk.get("timeline", []),
        gaps=raw_chunk.get("gaps", []),
        inconsistencies=raw_chunk.get("inconsistencies", []),
        coi_conflicts=raw_chunk.get("coi_conflicts", []),
        p_sukces=p_sukces,
        confidence_score=raw_chunk.get("confidence_score", 95.0),
        hitl_escalated=raw_chunk.get("hitl_escalated", False),
        synthesis_blocked=raw_chunk.get("synthesis_blocked", False),
        hallucinated_cites=hallucinated_cites,
        saos_count=raw_chunk.get("saos_count", 0),
        eli_count=raw_chunk.get("eli_count", 0),
        claim_scores=claim_scores,
        investigation_summary=investigation_summary,
        cited_sources=cited_sources,
    )


def encode_sse_event(event: BaseModel | dict[str, Any]) -> str:
    payload = event.model_dump(exclude_none=True) if isinstance(event, BaseModel) else event
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def encode_sse_done() -> str:
    return "data: [DONE]\n\n"
