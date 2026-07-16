"""Mapowanie płaskiego JSON (legacy) → ChatPayloadV2."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import json

from schemas.chat_contract import (
    ChatMode,
    ChatPayloadV2,
    MoaOptions,
    ProcessSide,
    PromptOverrides,
    ResponseMode,
)
from services.prompt_guard import sanitize_prompt_overrides


@dataclass(frozen=True)
class ResolvedChatRequest:
    """Płaski widok dla orchestratora (kompatybilność wsteczna)."""

    message: str
    chat_mode: str
    response_mode: str
    side: str
    selected_model: Optional[str]
    selected_models: Optional[List[str]]
    aggregator_model: Optional[str]
    architect_prompt: Optional[str]
    system_role_prompt: Optional[str]
    judge_system_prompt: Optional[str]
    expert_roles: Optional[Dict[str, str]]
    expert_role_prompts: Optional[Dict[str, str]]
    role_catalog: Optional[Dict[str, str]]
    current_task: Optional[str]
    task_prompt: Optional[str]
    attachments: Optional[list]
    document_text: Optional[str]
    chat_history: Optional[list]
    session_id: Optional[str]
    use_saos: bool
    use_eli: bool
    use_rag_legal: bool
    use_rag_user: Optional[bool]
    act_terms: Optional[list]
    model_latencies: Optional[dict]
    active_system_role_id: Optional[str]


def _pick_side(data: Dict[str, Any], overrides: PromptOverrides) -> ProcessSide:
    if data.get("side"):
        return ProcessSide.normalize(str(data["side"]))
    preset = data.get("active_prompt_preset_id") or data.get("activePromptPresetId")
    if preset == "prosecution":
        return ProcessSide.PROSECUTION
    return ProcessSide.DEFENSE


def _build_overrides(data: Dict[str, Any]) -> PromptOverrides:
    nested = data.get("prompt_overrides")
    if isinstance(nested, dict):
        base = PromptOverrides.model_validate(nested)
    else:
        base = PromptOverrides()

    return PromptOverrides(
        architect_prompt=data.get("architect_prompt") or base.architect_prompt,
        system_role_prompt=data.get("system_role_prompt") or base.system_role_prompt,
        judge_system_prompt=data.get("judge_system_prompt") or base.judge_system_prompt,
        task_prompt=data.get("task_prompt") or base.task_prompt,
        role_catalog=data.get("role_catalog") or base.role_catalog,
        expert_role_prompts=data.get("expert_role_prompts") or base.expert_role_prompts,
    )


class LegacyPayloadAdapter:
    @staticmethod
    def _extract_last_user_message_text(history: Any) -> str:
        if not isinstance(history, list) or not history:
            return ""
        for m in reversed(history):
            if not isinstance(m, dict):
                continue
            role_val = m.get("role") or ""
            role = str(role_val).strip().lower()
            if role != "user":
                continue
            content_val = m.get("content") or m.get("text") or ""
            if isinstance(content_val, list):
                parts: List[str] = []
                for item in content_val:
                    if isinstance(item, dict) and item.get("type") == "text":
                        parts.append(str(item.get("text") or ""))
                    elif isinstance(item, str):
                        parts.append(item)
                return "\n".join(p for p in parts if p.strip()).strip()
            if isinstance(content_val, dict):
                return str(content_val.get("text") or "").strip()
            content = str(content_val or "").strip()
            if content.startswith("["):
                try:
                    parsed = json.loads(content)
                    if isinstance(parsed, list):
                        parts = []
                        for item in parsed:
                            if isinstance(item, dict) and item.get("type") == "text":
                                parts.append(str(item.get("text") or ""))
                            elif isinstance(item, str):
                                parts.append(item)
                        return "\n".join(p for p in parts if p.strip()).strip()
                except Exception:
                    pass
            return content
        return ""

    @staticmethod
    def from_mapping(data: Dict[str, Any]) -> ChatPayloadV2:
        overrides = _build_overrides(data)
        chat_mode = ChatMode.normalize(data.get("chat_mode"))
        side = _pick_side(data, overrides)

        moa: Optional[MoaOptions] = None
        moa_raw = data.get("moa_options")
        if isinstance(moa_raw, dict):
            moa = MoaOptions.model_validate(moa_raw)
        elif chat_mode.is_moa:
            selected = data.get("selected_models") or []
            agg = data.get("aggregator_model") or ""
            roles = data.get("expert_roles") or data.get("expert_roles_map") or {}
            if selected or agg:
                moa = MoaOptions(
                    selected_models=list(selected),
                    aggregator_model=str(agg),
                    expert_roles_map=dict(roles) if roles else {},
                )

        msg = str(data.get("message") or "")
        if not msg.strip():
            msg = LegacyPayloadAdapter._extract_last_user_message_text(data.get("history"))
        if not msg.strip():
            if data.get("attachments") or data.get("document_text"):
                msg = "Przeanalizuj załączone materiały."
        return ChatPayloadV2(
            message=msg,
            chat_mode=chat_mode,
            response_mode=ResponseMode.normalize(data.get("response_mode")),
            side=side,
            active_system_role_id=data.get("active_system_role_id")
            or data.get("currentSystemRoleId"),
            current_task=data.get("current_task") or data.get("task"),
            prompt_overrides=overrides,
            moa_options=moa,
            model=data.get("model"),
            session_id=data.get("session_id")
            or data.get("sessionId")
            or data.get("sid"),
            attachments=data.get("attachments") or [],
            document_text=data.get("document_text"),
            history=data.get("history") or [],
            act_terms=data.get("act_terms"),
            use_saos=bool(data.get("use_saos", True)),
            use_eli=bool(data.get("use_eli", True)),
            use_rag_legal=bool(data.get("use_rag_legal", True)),
            use_rag_user=data.get("use_rag_user"),
            model_latencies=data.get("model_latencies"),
        )

    @staticmethod
    def from_pydantic_model(model: Any) -> ChatPayloadV2:
        if isinstance(model, ChatPayloadV2):
            return model
        data = model.model_dump(by_alias=True, exclude_none=False)
        extras = getattr(model, "__pydantic_extra__", None) or {}
        if isinstance(extras, dict):
            data.update(extras)
        return LegacyPayloadAdapter.from_mapping(data)

    @staticmethod
    def to_orchestrator_kwargs(payload: ChatPayloadV2) -> ResolvedChatRequest:
        po = payload.prompt_overrides
        sanitized = sanitize_prompt_overrides(
            architect_prompt=po.architect_prompt,
            system_role_prompt=po.system_role_prompt,
            judge_system_prompt=po.judge_system_prompt,
            task_prompt=po.task_prompt,
            role_catalog=po.role_catalog,
            expert_role_prompts=po.expert_role_prompts,
        )
        is_single = not payload.chat_mode.is_moa

        system_role = sanitized.get("system_role_prompt")
        if not is_single:
            system_role = None

        selected_models = None
        aggregator = None
        expert_roles = None
        if payload.moa_options:
            selected_models = payload.moa_options.selected_models or None
            aggregator = payload.moa_options.aggregator_model or None
            expert_roles = payload.moa_options.expert_roles_map or None

        return ResolvedChatRequest(
            message=payload.message,
            chat_mode=payload.chat_mode.value,
            response_mode=payload.response_mode.value,
            side=payload.side.value,
            selected_model=payload.model,
            selected_models=selected_models,
            aggregator_model=aggregator,
            architect_prompt=sanitized.get("architect_prompt"),
            system_role_prompt=system_role,
            judge_system_prompt=sanitized.get("judge_system_prompt"),
            expert_roles=expert_roles,
            expert_role_prompts=sanitized.get("expert_role_prompts"),
            role_catalog=sanitized.get("role_catalog"),
            current_task=payload.current_task,
            task_prompt=sanitized.get("task_prompt"),
            attachments=payload.attachments,
            document_text=payload.document_text,
            chat_history=payload.history,
            session_id=payload.session_id,
            use_saos=payload.use_saos,
            use_eli=payload.use_eli,
            use_rag_legal=payload.use_rag_legal,
            use_rag_user=payload.use_rag_user,
            act_terms=payload.act_terms,
            model_latencies=payload.model_latencies,
            active_system_role_id=payload.active_system_role_id,
        )
