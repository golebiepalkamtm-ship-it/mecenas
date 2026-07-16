"""Żelazny kontrakt żądania czatu (API v2)."""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import AliasChoices, BaseModel, Field, field_validator


class ChatMode(str, Enum):
    SINGLE = "single"
    MOA = "moa"
    CONSENSUS = "consensus"

    @classmethod
    def normalize(cls, value: Optional[str]) -> "ChatMode":
        raw = (value or "single").strip().lower()
        if raw in ("moa", "consensus"):
            return cls.MOA
        return cls.SINGLE

    @property
    def is_moa(self) -> bool:
        return self in (ChatMode.MOA, ChatMode.CONSENSUS)


class ResponseMode(str, Enum):
    CITIZEN = "citizen"
    STRATEGIC = "strategic"
    DRAFT = "draft"

    @classmethod
    def normalize(cls, value: Optional[str]) -> "ResponseMode":
        raw = (value or "strategic").strip().lower()
        if raw in ("default", "advisor"):
            return cls.STRATEGIC
        if raw == "citizen":
            return cls.CITIZEN
        if raw == "draft":
            return cls.DRAFT
        return cls.STRATEGIC


class ProcessSide(str, Enum):
    DEFENSE = "defense"
    PROSECUTION = "prosecution"

    @classmethod
    def normalize(cls, value: Optional[str]) -> "ProcessSide":
        raw = (value or "defense").strip().lower()
        if raw == "prosecution":
            return cls.PROSECUTION
        return cls.DEFENSE


class LegalSourceType(str, Enum):
    CONSTITUTION = "constitution"
    STATUTE = "statute"
    REGULATION = "regulation"
    CASE_LAW = "case_law"
    USER_DOC = "user_doc"


class PromptOverrides(BaseModel):
    architect_prompt: Optional[str] = None
    system_role_prompt: Optional[str] = None
    judge_system_prompt: Optional[str] = None
    task_prompt: Optional[str] = None
    role_catalog: Optional[Dict[str, str]] = None
    expert_role_prompts: Optional[Dict[str, str]] = None

    model_config = {"extra": "ignore"}


class MoaOptions(BaseModel):
    selected_models: List[str] = Field(default_factory=list)
    aggregator_model: str = ""
    expert_roles_map: Dict[str, str] = Field(default_factory=dict)

    model_config = {"extra": "ignore"}


class ChatAttachment(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    mime_type: Optional[str] = None
    content_type: Optional[str] = None
    url: Optional[str] = None
    text: Optional[str] = None
    size: Optional[int] = None
    content: Optional[Any] = None

    model_config = {"extra": "allow"}


class ChatHistoryMessage(BaseModel):
    role: str
    content: Any

    model_config = {"extra": "allow"}


class ChatPayloadV2(BaseModel):
    message: str = ""
    chat_mode: ChatMode = ChatMode.SINGLE
    response_mode: ResponseMode = ResponseMode.STRATEGIC
    side: ProcessSide = ProcessSide.DEFENSE
    active_system_role_id: Optional[str] = None
    current_task: Optional[str] = None
    prompt_overrides: PromptOverrides = Field(default_factory=PromptOverrides)
    moa_options: Optional[MoaOptions] = None

    model: Optional[str] = None
    session_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("session_id", "sessionId", "sid"),
    )
    attachments: List[ChatAttachment] = Field(default_factory=list)
    document_text: Optional[str] = None
    history: List[ChatHistoryMessage] = Field(default_factory=list)
    act_terms: Optional[List[str]] = None

    use_saos: bool = True
    use_eli: bool = True
    use_rag_legal: bool = True
    use_rag_user: Optional[bool] = None
    model_latencies: Optional[Dict[str, float]] = None

    model_config = {"extra": "ignore", "populate_by_name": True}

    @field_validator("message")
    @classmethod
    def message_not_empty_for_chat(cls, v: str) -> str:
        return v or ""
