"""Typy potoku orchestratora — wsparcie IDE i mniej błędów runtime."""
from __future__ import annotations

from typing import Any, Dict, List, NotRequired, TypedDict


class ExpertResult(TypedDict):
    model: str
    requested_model: str
    response: str
    success: bool
    latency_ms: int


class PipelineContext(TypedDict):
    user_query: str
    masked_query: str
    masked_document: str
    raw_chat_history: str
    masked_chat_history: str
    query_for_retrieval: str
    combined_context: str
    keywords: str
    coi_conflicts: List[str]
    legal_results: List[Dict[str, Any]]
    saos_results: List[Dict[str, Any]]
    eli_results: List[Dict[str, Any]]
    urgency_alerts: NotRequired[List[Dict[str, Any]]]
    timeline_data: NotRequired[Dict[str, Any]]

from dataclasses import dataclass, field

@dataclass
class OrchestratorInputParams:
    user_query: str
    attachments: List[Any] = field(default_factory=list)
    selected_model: str = ""
    selected_models: List[str] = field(default_factory=list)
    aggregator_model: str = ""
    use_saos: bool = False
    use_eli: bool = False
    use_rag_legal: bool = False
    use_rag_user: bool = False
    use_lexminde_mcp: bool = False
    act_terms: List[str] = field(default_factory=list)
    architect_prompt: str = ""
    system_role_prompt: str = ""
    expert_roles: Dict[str, Any] = field(default_factory=dict)
    expert_role_prompts: Dict[str, str] = field(default_factory=dict)
    role_catalog: Any = None
    current_task: str = ""
    task_prompt: str = ""
    chat_mode: str = "auto"
    response_mode: str = "standard"
    process_side: str = "neutral"
    judge_system_prompt: str = ""
    model_latencies: Dict[str, Any] = field(default_factory=dict)
    document_text: str = ""
    chat_history: List[Dict[str, Any]] = field(default_factory=list)
    session_id: str = ""
