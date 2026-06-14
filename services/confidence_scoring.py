"""Confidence scoring v2 — kalibrowana heurystyka zamiast stałej 96."""
from __future__ import annotations

from typing import Any, Dict, List, Optional


def compute_confidence_score(
    *,
    legal_results: List[Dict[str, Any]],
    user_results: List[Dict[str, Any]],
    saos_results: List[Dict[str, Any]],
    eli_results: List[Dict[str, Any]],
    all_cites_count: int,
    unverified_count: int,
    coi_conflicts: List[Any],
    timeline_inconsistencies: List[Any],
    empty_agents: int,
    expert_success_agreement: Optional[float] = None,
) -> float:
    retrieval_coverage = 0.0
    if legal_results:
        retrieval_coverage += 0.35
    if user_results:
        retrieval_coverage += 0.25
    if saos_results:
        retrieval_coverage += 0.2
    if eli_results:
        retrieval_coverage += 0.2
    retrieval_coverage = min(1.0, retrieval_coverage)

    if all_cites_count > 0:
        citation_ratio = 1.0 - (unverified_count / all_cites_count)
    else:
        citation_ratio = 1.0

    expert_agreement = 0.7
    if expert_success_agreement is not None:
        expert_agreement = min(1.0, expert_success_agreement / 100.0)

    score = (
        0.35 * retrieval_coverage
        + 0.25 * citation_ratio
        + 0.20 * expert_agreement
        + 0.10 * (1.0 if saos_results or eli_results else 0.5)
        + 0.10 * (1.0 if legal_results else 0.3)
    ) * 100.0

    if coi_conflicts:
        score -= 15.0
    if timeline_inconsistencies:
        score -= 5.0
    if empty_agents:
        score -= 8.0 * empty_agents
    if unverified_count:
        score -= min(25.0, 6.0 * unverified_count)

    return max(40.0, min(99.0, score))
