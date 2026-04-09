import uuid
import json
import logging
import traceback
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from models.request_models import ChatRequest, DraftRequest, DocumentAnalysisRequest
from services.chat_service import (
    perform_rag_if_needed,
    chat_consensus_moa,
    generate_chat_stream,
)
from moa.intent import classify_intent, Intent
from moa.http_client import get_shared_openai_client
from moa.config import LLM_TEMPERATURE

from moa.prompt_builder import IdentityMode, PromptConfig, build_system_prompt
from utils.helpers import (
    process_attachments,
    format_history_for_openai,
    save_chat_messages,
)

router = APIRouter()
logger = logging.getLogger("LexMindChatRoutes")


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        sid = request.sessionId or str(uuid.uuid4())
        intent = await classify_intent(request.message, model_override=request.model)

        combined_doc_text = request.document_text or ""
        extracted_att_content, extracted_texts = await process_attachments(
            request.attachments or []
        )
        if extracted_texts:
            combined_doc_text += "\n" + "\n".join(extracted_texts)

        _chunks, context_text = await perform_rag_if_needed(
            intent,
            request.use_rag,
            request.message,
            request.history or [],
            combined_doc_text,
            model_override=request.model,
        )

        builder_config = PromptConfig(
            mode=IdentityMode(request.mode) if request.mode else IdentityMode.ADVOCATE,
            task=request.task or "general",
            role=request.task or "navigator",
            has_legal_context=bool(context_text),
            has_document=bool(combined_doc_text),
        )

        system_prompt = build_system_prompt(builder_config)
        if context_text:
            system_prompt += f"\n\n## KONTEKST PRAWNY (RAG):\n{context_text}"

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(format_history_for_openai(request.history or []))

        user_msg_content = [{"type": "text", "text": request.message}]
        user_msg_content.extend(
            [c for c in extracted_att_content if c["type"] == "image_url"]
        )

        # DODAJEMY: Treść z załączników do promptu użytkownika (KRYTYCZNE DLA KONTEKSTU)
        if combined_doc_text:
            print(
                f"   [PROMPT INFUSION] Dodawanie {len(combined_doc_text)} znaków z dokumentów do promptu."
            )
            user_msg_content.append(
                {
                    "type": "text",
                    "text": f"\n\n### TREŚĆ ZAŁĄCZONYCH DOKUMENTÓW / KONTEKST:\n{combined_doc_text}",
                }
            )

        user_msg = {
            "role": "user",
            "content": user_msg_content,
        }
        messages.append(user_msg)

        if request.stream:
            return StreamingResponse(
                generate_chat_stream(
                    request, sid, messages, context_text, extracted_texts
                ),
                media_type="text/event-stream",
            )

        client = get_shared_openai_client()
        response = await client.chat.completions.create(
            model=request.model,
            messages=messages,
            temperature=LLM_TEMPERATURE,
            max_tokens=2500,
        )
        answer = response.choices[0].message.content or "Brak odpowiedzi."

        # Zapisz pełną wiadomość użytkownika z załącznikami, a nie tylko sam tekst
        db_user = user_msg_content
        save_chat_messages(
            sid, json.dumps(db_user), answer, message_type="final_answer"
        )

        return {
            "id": str(uuid.uuid4()),
            "content": answer,
            "model": request.model,
            "role": "assistant",
            "sessionId": sid,
            "rag_used": bool(context_text),
        }
    except Exception as e:
        logger.error(f"❌ Chat Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat-consensus")
async def chat_consensus_endpoint(request: ChatRequest):
    try:
        sid = request.sessionId or str(uuid.uuid4())
        combined_doc_text = request.document_text or ""
        extracted_att_content, extracted_texts = await process_attachments(request.attachments or [])
        if extracted_texts:
            combined_doc_text += "\n" + "\n".join(extracted_texts)

        intent = await classify_intent(request.message, model_override=request.model)
        _chunks, context_text = await perform_rag_if_needed(
            intent,
            request.use_rag,
            request.message,
            request.history or [],
            combined_doc_text,
            model_override=request.model,
        )

        if intent != Intent.LEGAL_QUERY and not combined_doc_text:
            client = get_shared_openai_client()
            res = await client.chat.completions.create(
                model=request.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Jesteś LexMind AI. Odpowiedz uprzejmie.",
                    },
                    {"role": "user", "content": request.message},
                ],
                max_tokens=300,
            )
            answer = res.choices[0].message.content or "Cześć!"
            save_chat_messages(sid, request.message, answer)
            return {"content": answer, "role": "assistant", "sessionId": sid}

        if request.stream:
            from services.chat_service import generate_moa_stream

            return StreamingResponse(
                generate_moa_stream(request, sid, combined_doc_text, context_text),
                media_type="text/event-stream",
            )

        result = await chat_consensus_moa(request, sid, combined_doc_text, context_text)

        # Zapisz pełną wiadomość użytkownika z załącznikami
        moa_user_content = [{"type": "text", "text": request.message}]
        moa_user_content.extend(
            [c for c in extracted_att_content if c["type"] == "image_url"]
        )
        if combined_doc_text:
            moa_user_content.append(
                {
                    "type": "text",
                    "text": f"\n\n### TREŚĆ ZAŁĄCZONYCH DOKUMENTÓW / KONTEKST:\n{combined_doc_text}",
                }
            )

        save_chat_messages(
            sid,
            json.dumps(moa_user_content),
            result.final_answer,
            message_type="moa_consensus",
            reasoning=str(result.analyst_results),
        )

        return {
            "id": str(uuid.uuid4()),
            "content": result.final_answer,
            "model": f"moa-{len(result.analyst_results or [])}experts",
            "role": "assistant",
            "sessionId": sid,
            "consensus_used": True,
            "expert_analyses": [
                {"model": r.model_id, "response": r.response, "success": r.success}
                for r in (result.analyst_results or [])
            ],
            "rag_used": bool(context_text),
            "pipeline_latency_ms": result.pipeline_latency_ms,
        }
    except Exception as e:
        logger.error(f"❌ MOA Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/draft-document")
async def draft_document(request: DraftRequest):
    try:
        sid = request.sessionId or str(uuid.uuid4())
        rag_query = request.user_instructions
        if not rag_query.strip() and request.history:
            last_msg = request.history[-1]
            rag_query = (
                str(last_msg.get("content", ""))
                if isinstance(last_msg, dict)
                else str(last_msg)
            )

        sd = request.structured_data
        if sd:
            sd_text = " ".join(f"{k}: {v}" for k, v in sd.items() if v)
            if sd_text:
                rag_query = f"{rag_query}\n\n{sd_text}"

        from moa.retrieval import retrieve_legal_context

        _chunks, context_text = await retrieve_legal_context(
            rag_query
        )

        user_prompt = ""
        if sd:
            sd_section = "### DANE STRUKTURALNE:\n"
            has_sd = False
            for k, v in sd.items():
                if v:
                    sd_section += f"[{str(k).upper()}]: {v}\n"
                    has_sd = True
            if has_sd:
                user_prompt += sd_section + "\n"

        if request.user_instructions.strip():
            user_prompt += f"### INSTRUKCJE UŻYTKOWNIKA:\n{request.user_instructions}\n"
        if context_text:
            user_prompt += f"\n### KONTEKST PRAWNY (RAG):\n{context_text}\n"

        client = get_shared_openai_client()
        messages = []
        system_msg = request.system_prompt or "Jesteś ekspertem ds. pism prawnych."
        system_msg += "\n\nWYMÓG KRYTYCZNY: Zapewnij najwyższą poprawność merytoryczną i językową."
        messages.append({"role": "system", "content": system_msg})
        messages.extend(format_history_for_openai(request.history or [], use_limit=20))
        messages.append(
            {
                "role": "user",
                "content": user_prompt
                + "\nWYMÓG: Wygeneruj pełny dokument w Markdown.",
            }
        )

        response = await client.chat.completions.create(
            model=request.model, messages=messages, max_tokens=4000
        )
        return {"content": response.choices[0].message.content, "role": "assistant"}
    except Exception as e:
        logger.error(f"❌ Drafting Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-document")
async def analyze_document(request: DocumentAnalysisRequest):
    try:
        context_text = ""
        sources = []
        if request.use_rag:
            from moa.retrieval import retrieve_legal_context

            chunks, context_text = await retrieve_legal_context(
                request.question[:8000], document_text=request.document_text
            )
            sources = [c.source for c in chunks]

        system_prompt = "Jesteś ekspertem prawnym. Analizuj dokument."
        user_prompt = f"## TREŚĆ DOKUMENTU:\n{request.document_text}\n\n## PYTANIE:\n{request.question}"
        if context_text:
            user_prompt = f"## KONTEKST PRAWNY:\n{context_text}\n\n" + user_prompt

        client = get_shared_openai_client()
        response = await client.chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )
        return {
            "success": True,
            "answer": response.choices[0].message.content,
            "sources": sources,
            "rag_used": request.use_rag,
        }
    except Exception as e:
        logger.error(f"❌ Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
