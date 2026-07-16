from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio
from application.chat.types import ChatStreamInput
from application.chat.use_case import chat_stream_use_case
from schemas.chat_legacy_adapter import LegacyPayloadAdapter
from schemas.chat_request import ChatRequest
from schemas.chat_stream import (
    StreamChunkEvent,
    StreamErrorEvent,
    StreamFinalMetadataEvent,
    StreamMetadataEvent,
    build_final_metadata_event,
    encode_sse_done,
    encode_sse_event,
)

router = APIRouter()


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Główny endpoint czatu — strumieniowanie SSE."""
    payload_v2 = LegacyPayloadAdapter.from_pydantic_model(request)
    resolved = LegacyPayloadAdapter.to_orchestrator_kwargs(payload_v2)
    session_id = resolved.session_id or str(uuid.uuid4())
    msg_raw = (resolved.message or "").strip()
    fallback_msg = LegacyPayloadAdapter._extract_last_user_message_text(resolved.chat_history)
    effective_message = msg_raw or fallback_msg
    used_fallback = bool((not msg_raw) and fallback_msg)
    if not effective_message.strip():
        effective_message = "Odpowiedz na ostatnie pytanie użytkownika."

    # Bardzo widoczne logowanie wybranego trybu zadania AI na konsoli backendu
    print("\n" + "=" * 60)
    print(f"[NOWE ZAPYTANIE CZATU] Dane żądania:")
    print(f"  Sesja (session_id):    {session_id}")
    print(f"  Zadanie AI (task):     {resolved.current_task or 'general'}")
    print(f"  Tryb czatu (mode):     {resolved.chat_mode or 'single'}")
    print(f"  Strona procesu (side):  {resolved.side or 'defense'}")
    print(f"  Tryb odpowiedzi:       {resolved.response_mode or 'strategic'}")
    print(f"  Model główny:          {resolved.selected_model}")
    print("=" * 60 + "\n")

    from services.observability import log_stage_event
    log_stage_event(
        "request_message",
        session_id=session_id,
        extra={
            "message_chars": len(effective_message),
            "used_fallback_from_history": used_fallback,
            "history_count": len(resolved.chat_history or []),
            "attachments_count": len(resolved.attachments or []),
            "current_task": resolved.current_task or "general",
            "chat_mode": resolved.chat_mode or "single",
            "process_side": resolved.side or "defense",
            "response_mode": resolved.response_mode or "strategic",
        },
    )

    async def event_generator():
        try:
            message_id = str(uuid.uuid4())
            yield encode_sse_event(
                StreamMetadataEvent(id=message_id, sessionId=session_id)
            )
            await asyncio.sleep(0.01)

            final_answer = ""
            analysis = []
            sources = []
            eli_explanation = ""
            pipeline_latency = 0
            urgency_alerts = []
            timeline = []
            gaps = []
            inconsistencies = []
            coi_conflicts = []
            p_sukces = None
            confidence_score = 95.0
            hitl_escalated = False
            synthesis_blocked = False
            hallucinated_cites: list = []
            saos_count = 0
            eli_count = 0
            claim_scores: list = []
            investigation_summary = None
            cited_sources: list = []

            params = ChatStreamInput(
                user_query=effective_message,
                attachments=resolved.attachments,
                selected_model=resolved.selected_model,
                selected_models=resolved.selected_models,
                aggregator_model=resolved.aggregator_model,
                use_saos=resolved.use_saos,
                use_eli=resolved.use_eli,
                use_rag_legal=resolved.use_rag_legal,
                use_rag_user=resolved.use_rag_user,
                act_terms=resolved.act_terms,
                architect_prompt=resolved.architect_prompt,
                system_role_prompt=resolved.system_role_prompt,
                expert_roles=resolved.expert_roles,
                expert_role_prompts=resolved.expert_role_prompts,
                role_catalog=resolved.role_catalog,
                current_task=resolved.current_task,
                task_prompt=resolved.task_prompt,
                chat_mode=resolved.chat_mode,
                response_mode=resolved.response_mode,
                process_side=resolved.side,
                judge_system_prompt=resolved.judge_system_prompt,
                model_latencies=resolved.model_latencies,
                document_text=resolved.document_text,
                chat_history=resolved.chat_history,
                session_id=session_id,
            )

            async for chunk in chat_stream_use_case.execute(params):
                chunk_type = chunk.get("type")

                if chunk_type == "chunk":
                    final_answer += chunk.get("text", "")
                    yield encode_sse_event(
                        StreamChunkEvent(text=str(chunk.get("text", "")))
                    )
                elif chunk_type == "metadata":
                    if "expert_analyses" in chunk:
                        analysis = chunk["expert_analyses"]
                    yield encode_sse_event(StreamMetadataEvent.model_validate(chunk))
                elif chunk_type == "final_metadata":
                    sources = chunk.get("sources", [])
                    analysis = chunk.get("expert_analyses", analysis)
                    eli_explanation = chunk.get("eli_explanation", "")
                    pipeline_latency = chunk.get("pipeline_latency_ms", 0)
                    urgency_alerts = chunk.get("urgency_alerts", [])
                    timeline = chunk.get("timeline", [])
                    gaps = chunk.get("gaps", [])
                    inconsistencies = chunk.get("inconsistencies", [])
                    coi_conflicts = chunk.get("coi_conflicts", [])
                    p_sukces = chunk.get("p_sukces")
                    if not isinstance(p_sukces, (int, float)):
                        p_sukces = None
                    confidence_score = chunk.get("confidence_score", 95.0)
                    hitl_escalated = chunk.get("hitl_escalated", False)
                    synthesis_blocked = chunk.get("synthesis_blocked", synthesis_blocked)
                    val_hall = chunk.get("hallucinated_cites")
                    if isinstance(val_hall, list):
                        hallucinated_cites = val_hall
                    saos_count = chunk.get("saos_count", saos_count)
                    eli_count = chunk.get("eli_count", eli_count)
                    cs = chunk.get("claim_scores")
                    if isinstance(cs, list):
                        claim_scores = cs
                    invs = chunk.get("investigation_summary")
                    if isinstance(invs, dict):
                        investigation_summary = invs
                    cs_src = chunk.get("cited_sources")
                    if isinstance(cs_src, list):
                        cited_sources = cs_src

            if final_answer:
                t = final_answer.strip()
                if len(t) >= 800 and len(t) % 2 == 0:
                    half = len(t) // 2
                    if t[:half] == t[half:]:
                        final_answer = t[:half]

            try:
                from utils.helpers import save_chat_messages
                save_chat_messages(
                    sid=session_id,
                    user_content=effective_message,
                    assistant_content=final_answer,
                    message_type="moa_consensus" if analysis else "standard",
                    reasoning=json.dumps(analysis) if analysis else None,
                    eli_explanation=eli_explanation,
                    sources=sources,
                    ai_task=resolved.current_task,
                    cited_sources=cited_sources if cited_sources else None,
                )
            except Exception as db_err:
                print(f"[DB PERSISTENCE ERR] Błąd zapisu konwersacji w Supabase: {db_err}")

            final_metadata = build_final_metadata_event(
                message_id=message_id,
                session_id=session_id,
                final_answer=final_answer,
                analysis=analysis,
                raw_chunk={
                    "sources": sources,
                    "expert_analyses": analysis,
                    "eli_explanation": eli_explanation,
                    "pipeline_latency_ms": pipeline_latency,
                    "urgency_alerts": urgency_alerts,
                    "timeline": timeline,
                    "gaps": gaps,
                    "inconsistencies": inconsistencies,
                    "coi_conflicts": coi_conflicts,
                    "p_sukces": p_sukces,
                    "confidence_score": confidence_score,
                    "hitl_escalated": hitl_escalated,
                    "synthesis_blocked": synthesis_blocked,
                    "hallucinated_cites": hallucinated_cites,
                    "saos_count": saos_count,
                    "eli_count": eli_count,
                    "claim_scores": claim_scores,
                    "investigation_summary": investigation_summary,
                    "cited_sources": cited_sources,
                },
            )
            yield encode_sse_event(final_metadata)
            await asyncio.sleep(0.01)
            yield encode_sse_done()

        except Exception as err:
            print(f"[STREAM ERR] Błąd krytyczny strumienia SSE: {err}")
            yield encode_sse_event(StreamErrorEvent(text=str(err)))
            yield encode_sse_done()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
