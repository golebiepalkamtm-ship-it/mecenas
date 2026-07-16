from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class ChatStreamInput:
    user_query: str
    attachments: Any = None
    selected_model: Optional[str] = None
    selected_models: Any = None
    aggregator_model: Optional[str] = None
    use_saos: bool = True
    use_eli: bool = True
    use_rag_legal: bool = True
    use_rag_user: Optional[bool] = None
    act_terms: Any = None
    architect_prompt: Optional[str] = None
    system_role_prompt: Optional[str] = None
    expert_roles: Any = None
    expert_role_prompts: Any = None
    role_catalog: Any = None
    current_task: Optional[str] = None
    task_prompt: Optional[str] = None
    chat_mode: Optional[str] = None
    response_mode: Optional[str] = None
    process_side: Optional[str] = None
    judge_system_prompt: Optional[str] = None
    model_latencies: Any = None
    document_text: Optional[str] = None
    chat_history: Any = None
    session_id: str = ""

