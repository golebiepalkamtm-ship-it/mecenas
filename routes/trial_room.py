"""API Salii rozprawy — osobny moduł (nie /chat)."""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from config import settings
from services.trial_room_service import trial_room_service

router = APIRouter(prefix="/trial", tags=["trial-room"])


class TrialPositionRequest(BaseModel):
    side: str = Field(..., pattern="^(defense|prosecution)$")
    question: str = Field(default="", max_length=8000)
    chat_context: str = Field(default="", max_length=50000)
    elaboration_mode: str = Field(default="standard", pattern="^(skrot|standard|pelna)$")
    selected_models: Optional[List[str]] = None
    aggregator_model: Optional[str] = None
    architect_prompt: Optional[str] = None
    expert_roles: Optional[Dict[str, str]] = None
    role_catalog: Optional[Dict[str, str]] = None
    chat_mode: Optional[str] = "moa"
    use_saos: bool = True
    use_eli: bool = True
    use_rag_legal: bool = True


class TrialHearingRequest(BaseModel):
    question: str = Field(default="", max_length=8000)
    chat_context: str = Field(default="", max_length=50000)
    elaboration_mode: str = Field(default="standard", pattern="^(skrot|standard|pelna)$")
    defense_brief: str = Field(..., min_length=20)
    prosecution_brief: str = Field(..., min_length=20)
    rounds: int = Field(default=4, ge=1, le=6)
    prosecution_model: str
    defense_model: str


class TrialVerdictRequest(BaseModel):
    question: str = Field(default="")
    chat_context: str = Field(default="", max_length=50000)
    defense_brief: str
    prosecution_brief: str
    hearing_protocol: str = ""
    judge_model: str


def _validate_trial_material(question: str, chat_context: str) -> None:
    q = question.strip()
    c = chat_context.strip()
    if len(c) >= 40:
        return
    if len(q) >= 10:
        return
    raise HTTPException(
        status_code=400,
        detail="Brak materiału sprawy — wróć do czatu i użyj „Przenieś na salę rozprawy” lub uzupełnij opis.",
    )


def _sse_generator(coro_iterator):
    async def event_generator():
        message_id = str(uuid.uuid4())
        try:
            yield f"data: {json.dumps({'type': 'metadata', 'id': message_id, 'module': 'trial_room'})}\n\n"
            await asyncio.sleep(0.01)

            final_text = ""
            hearing_rounds: List[Dict[str, Any]] = []

            async for chunk in coro_iterator:
                ctype = chunk.get("type")
                if ctype == "chunk":
                    final_text += chunk.get("text", "")
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif ctype == "trial_round":
                    hearing_rounds.append(chunk)
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif ctype == "metadata":
                    yield f"data: {json.dumps(chunk)}\n\n"

            yield f"data: {json.dumps({
                'type': 'final_metadata',
                'id': message_id,
                'final_answer': final_text,
                'hearing_rounds': hearing_rounds,
                'module': 'trial_room',
            })}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'type': 'error', 'text': str(err)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _check_trial_enabled() -> None:
    if not settings.trial_enabled:
        raise HTTPException(status_code=503, detail="Sala rozprawy jest wyłączona.")


def _cap_brief(text: str) -> str:
    return text[: settings.trial_max_brief_chars]


@router.post("/position")
async def trial_position(request: TrialPositionRequest):
    _check_trial_enabled()
    _validate_trial_material(request.question, request.chat_context)
    stream = trial_room_service.stream_position(
        side=request.side,
        question=request.question.strip(),
        selected_models=request.selected_models,
        aggregator_model=request.aggregator_model,
        architect_prompt=request.architect_prompt,
        expert_roles=request.expert_roles,
        role_catalog=request.role_catalog,
        chat_mode=request.chat_mode or "moa",
        use_saos=request.use_saos,
        use_eli=request.use_eli,
        use_rag_legal=request.use_rag_legal,
        chat_context=request.chat_context,
        elaboration_mode=request.elaboration_mode,
    )
    return _sse_generator(stream)


@router.post("/hearing")
async def trial_hearing(request: TrialHearingRequest):
    _check_trial_enabled()
    _validate_trial_material(request.question, request.chat_context)
    stream = trial_room_service.stream_hearing(
        question=request.question.strip(),
        defense_brief=_cap_brief(request.defense_brief),
        prosecution_brief=_cap_brief(request.prosecution_brief),
        rounds=request.rounds,
        prosecution_model=request.prosecution_model,
        defense_model=request.defense_model,
        chat_context=request.chat_context,
        elaboration_mode=request.elaboration_mode,
    )
    return _sse_generator(stream)


@router.post("/verdict")
async def trial_verdict(request: TrialVerdictRequest):
    _check_trial_enabled()
    _validate_trial_material(request.question, request.chat_context)
    stream = trial_room_service.stream_verdict(
        question=request.question.strip(),
        defense_brief=_cap_brief(request.defense_brief),
        prosecution_brief=_cap_brief(request.prosecution_brief),
        hearing_protocol=request.hearing_protocol,
        judge_model=request.judge_model,
        chat_context=request.chat_context,
    )
    return _sse_generator(stream)
