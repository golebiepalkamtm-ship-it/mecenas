"""Legal Investigation — hipotezy, rekurencyjny retrieval, procedural graph, agenci."""
from __future__ import annotations

from services.investigation.types import (
    CaseInvestigationState,
    EvidenceItem,
    Hypothesis,
    ResearchRound,
)
from services.investigation.hypothesis_engine import generate_hypotheses
from services.investigation.hypothesis_rag import gather_evidence_for_hypotheses, merge_evidence_into_legal_list
from services.investigation.recursive_research import RecursiveResearchLoop
from services.investigation.procedural_engine import ProceduralAttackEngine
from services.investigation.agent_router import route_agent_specs
from services.investigation.adversarial_loop import run_iterative_adversarial
from services.investigation.graph_store import extract_and_persist_edges
from services.investigation.case_memory import (
    load_case_state_for_session,
    save_case_state_for_session,
    state_to_public_memory_dict,
)

__all__ = [
    "CaseInvestigationState",
    "EvidenceItem",
    "Hypothesis",
    "ResearchRound",
    "generate_hypotheses",
    "gather_evidence_for_hypotheses",
    "merge_evidence_into_legal_list",
    "RecursiveResearchLoop",
    "ProceduralAttackEngine",
    "route_agent_specs",
    "run_iterative_adversarial",
    "extract_and_persist_edges",
    "load_case_state_for_session",
    "save_case_state_for_session",
    "state_to_public_memory_dict",
]
