"""Kontrakty danych dla potoku Legal Investigation."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


def _new_evid_id() -> str:
    return f"ev_{uuid.uuid4().hex[:12]}"


@dataclass
class Hypothesis:
    id: str
    label: str
    description: str
    priority: int = 0
    rag_keywords: str = ""
    act_terms: List[str] = field(default_factory=list)
    eli_queries: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "Hypothesis":
        return Hypothesis(
            id=str(d.get("id") or ""),
            label=str(d.get("label") or ""),
            description=str(d.get("description") or ""),
            priority=int(d.get("priority") or 0),
            rag_keywords=str(d.get("rag_keywords") or ""),
            act_terms=list(d.get("act_terms") or []),
            eli_queries=list(d.get("eli_queries") or []),
        )


@dataclass
class EvidenceItem:
    id: str
    source: str  # legal | saos | eli | doc
    hypothesis_id: Optional[str]
    round_index: int
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    usefulness_score: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "EvidenceItem":
        return EvidenceItem(
            id=str(d.get("id") or _new_evid_id()),
            source=str(d.get("source") or "legal"),
            hypothesis_id=d.get("hypothesis_id"),
            round_index=int(d.get("round_index") or 0),
            content=str(d.get("content") or ""),
            metadata=dict(d.get("metadata") or {}),
            usefulness_score=d.get("usefulness_score"),
        )


@dataclass
class ResearchRound:
    round_index: int
    new_clues: List[str] = field(default_factory=list)
    new_evidence_ids: List[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ClaimScore:
    hypothesis_id: str
    label: str
    legal_strength: float
    procedural_strength: float
    precedent_support: float
    contradiction_risk: float
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CaseInvestigationState:
    facts_summary: str = ""
    hypotheses: List[Hypothesis] = field(default_factory=list)
    open_questions: List[str] = field(default_factory=list)
    research_rounds: List[ResearchRound] = field(default_factory=list)
    evidence: List[EvidenceItem] = field(default_factory=list)
    procedural_report_text: str = ""
    budget_llm_calls: int = 0
    budget_retrieval_calls: int = 0
    case_memory_overlay: Dict[str, Any] = field(default_factory=dict)
    problem_tags: List[str] = field(default_factory=list)
    adversarial_addendum: str = ""
    claim_scores: List[ClaimScore] = field(default_factory=list)
    multistage_headers_used: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "facts_summary": self.facts_summary,
            "hypotheses": [h.to_dict() for h in self.hypotheses],
            "open_questions": list(self.open_questions),
            "research_rounds": [r.to_dict() for r in self.research_rounds],
            "evidence": [e.to_dict() for e in self.evidence],
            "procedural_report_text": self.procedural_report_text,
            "budget_llm_calls": self.budget_llm_calls,
            "budget_retrieval_calls": self.budget_retrieval_calls,
            "case_memory_overlay": dict(self.case_memory_overlay),
            "problem_tags": list(self.problem_tags),
            "adversarial_addendum": self.adversarial_addendum,
            "claim_scores": [c.to_dict() for c in self.claim_scores],
            "multistage_headers_used": self.multistage_headers_used,
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "CaseInvestigationState":
        hyps = [Hypothesis.from_dict(x) for x in (d.get("hypotheses") or [])]
        ev = [EvidenceItem.from_dict(x) for x in (d.get("evidence") or [])]
        rnds = [
            ResearchRound(
                round_index=int(x.get("round_index", 0)),
                new_clues=list(x.get("new_clues") or []),
                new_evidence_ids=list(x.get("new_evidence_ids") or []),
                summary=str(x.get("summary") or ""),
            )
            for x in (d.get("research_rounds") or [])
        ]
        claims = [
            ClaimScore(
                hypothesis_id=str(x.get("hypothesis_id") or ""),
                label=str(x.get("label") or ""),
                legal_strength=float(x.get("legal_strength") or 0),
                procedural_strength=float(x.get("procedural_strength") or 0),
                precedent_support=float(x.get("precedent_support") or 0),
                contradiction_risk=float(x.get("contradiction_risk") or 0),
                notes=str(x.get("notes") or ""),
            )
            for x in (d.get("claim_scores") or [])
        ]
        return CaseInvestigationState(
            facts_summary=str(d.get("facts_summary") or ""),
            hypotheses=hyps,
            open_questions=list(d.get("open_questions") or []),
            research_rounds=rnds,
            evidence=ev,
            procedural_report_text=str(d.get("procedural_report_text") or ""),
            budget_llm_calls=int(d.get("budget_llm_calls") or 0),
            budget_retrieval_calls=int(d.get("budget_retrieval_calls") or 0),
            case_memory_overlay=dict(d.get("case_memory_overlay") or {}),
            problem_tags=list(d.get("problem_tags") or []),
            adversarial_addendum=str(d.get("adversarial_addendum") or ""),
            claim_scores=claims,
            multistage_headers_used=bool(d.get("multistage_headers_used")),
        )
