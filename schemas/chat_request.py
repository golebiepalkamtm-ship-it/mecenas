"""Kanoniczny model requestu `/chat` z polem na przejściową kompatybilność legacy."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import AliasChoices, BaseModel, Field

from schemas.chat_contract import (
    ChatAttachment,
    ChatHistoryMessage,
    ChatMode,
    MoaOptions,
    ProcessSide,
    PromptOverrides,
    ResponseMode,
)


class ChatRequest(BaseModel):
    message: str = ""
    attachments: Optional[List[ChatAttachment]] = None
    model: Optional[str] = None
    sid: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("sid", "sessionId"),
    )

    use_saos: Optional[bool] = True
    use_eli: Optional[bool] = True
    use_rag_legal: Optional[bool] = True
    use_rag_user: Optional[bool] = None
    act_terms: Optional[List[str]] = None

    chat_mode: Optional[ChatMode] = None
    response_mode: Optional[ResponseMode] = None
    side: Optional[ProcessSide] = None
    active_system_role_id: Optional[str] = None
    current_task: Optional[str] = None
    prompt_overrides: Optional[PromptOverrides] = None
    moa_options: Optional[MoaOptions] = None
    model_latencies: Optional[Dict[str, float]] = None
    assigned_models: Optional[Dict[str, str]] = None
    document_text: Optional[str] = None
    history: Optional[List[ChatHistoryMessage]] = None

    model_config = {"extra": "allow", "populate_by_name": True}
