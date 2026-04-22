import uuid
import json
import logging
import traceback
from dataclasses import asdict
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
from moa.config import LLM_TEMPERATURE, get_safe_max_tokens, is_vision_model

from moa.prompt_builder import IdentityMode, PromptConfig, build_system_prompt
from utils.helpers import (
    process_attachments,
    format_history_for_openai,
    save_chat_messages,
    scrape_urls_from_text,
)
from utils.token_counter import count_tokens, truncate_to_tokens

router = APIRouter()
logger = logging.getLogger("LexMindChatRoutes")


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        sid = request.sessionId or getattr(request, "session_id", None) or str(uuid.uuid4())
        has_docs = bool(request.attachments or request.document_text)
        intent, include_user_db = await classify_intent(request.message, model_override=request.model, has_docs=has_docs)

        combined_doc_text = request.document_text or ""
        extracted_att_content, extracted_texts = await process_attachments(
            request.attachments or []
        )
        if extracted_texts:
            combined_doc_text += "\n" + "\n".join(extracted_texts)

        # NOWOŚĆ: Ściąganie linków z wiadomości
        web_texts = await scrape_urls_from_text(request.message)
        if web_texts:
             combined_doc_text += "\n" + "\n".join(web_texts)

        _chunks, context_text = await perform_rag_if_needed(
            intent,
            request.use_rag,
            request.message,
            request.history or [],
            combined_doc_text,
            model_override=request.model,
            include_user_db=include_user_db,
        )

        builder_config = PromptConfig(
            mode=IdentityMode.from_str(request.mode) if request.mode else IdentityMode.ADVOCATE,
            task=request.task or "general",
            role=request.task or "navigator",
            has_legal_context=bool(context_text),
            has_document=bool(combined_doc_text),
        )

        system_prompt = build_system_prompt(
            builder_config, 
            custom_role_prompt=request.system_role_prompt,
            custom_task_prompt=request.custom_task_prompt
        )
        if context_text:
            system_prompt += f"\n\n## KONTEKST PRAWNY (RAG):\n{context_text}"

        messages = [{"role": "system", "content": system_prompt}]
        
        # PROFESJONALNE ZARZĄDZANIE KONTEKSTEM (TOKEN-AWARE)
        max_prompt_tokens = 40000 # Bezpieczny limit dla większości modeli
        
        history_msgs = format_history_for_openai(request.history or [], model_id=request.model)
        
        # 1. Dodaj historię (od najnowszych, dopóki starczy miejsca)
        allowed_history = []
        current_tokens = count_tokens(system_prompt, request.model)
        for msg in reversed(history_msgs):
            msg_tokens = count_tokens(json.dumps(msg, ensure_ascii=False), request.model)
            if current_tokens + msg_tokens < max_prompt_tokens * 0.4: # 40% na historię
                allowed_history.insert(0, msg)
                current_tokens += msg_tokens
            else:
                break
        messages.extend(allowed_history)

        user_msg_text = request.message
        if combined_doc_text:
             user_msg_text += f"\n\n### KONTEKST DOKUMENTÓW:\n{combined_doc_text}"
        
        # Przytnij tekst użytkownika jeśli za długi
        user_msg_text = truncate_to_tokens(user_msg_text, 10000, request.model)
        
        user_msg_content = [{"type": "text", "text": user_msg_text}]
        # Tylko modele z vision mogą przyjmować image_url — reszta crashuje z 404
        if is_vision_model(request.model):
            user_msg_content.extend([c for c in extracted_att_content if c["type"] == "image_url"])
        elif any(c["type"] == "image_url" for c in extracted_att_content):
            logger.info(f"   [VISION] Model {request.model} nie obsługuje obrazów — tekst z OCR zostanie użyty.")

        messages.append({"role": "user", "content": user_msg_content})

        is_moa = request.mode in ("moa", "consensus") or (request.selected_models and len(request.selected_models) > 0)

        if is_moa:
            if request.stream:
                from services.chat_service import generate_moa_stream
                return StreamingResponse(
                    generate_moa_stream(request, sid, combined_doc_text, context_text, extracted_att_content, include_user_db=include_user_db),
                    media_type="text/event-stream",
                )
            
            # Non-streaming MOA
            result = await chat_consensus_moa(request, sid, combined_doc_text, context_text, extracted_att_content, include_user_db=include_user_db)
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
                "user_db_used": include_user_db,
                "pipeline_latency_ms": result.pipeline_latency_ms,
                "eli_explanation": result.eli_explanation,
                "cited_sources": [asdict(cs) for cs in result.cited_sources] if result.cited_sources else [],
            }

        # ORIGINAL SINGLE MODEL LOGIC
        if request.stream:
            return StreamingResponse(
                generate_chat_stream(request, sid, messages, context_text, extracted_texts),
                media_type="text/event-stream",
            )

        client = get_shared_openai_client()
        try:
            response = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=0.1,
                max_tokens=get_safe_max_tokens(request.model),
            )
        except Exception as e:
            if hasattr(e, 'status_code') and e.status_code == 402:
                from moa.config import FREE_FALLBACK_MODELS
                logger.warning("   [REPAIR] 402 in /chat. Cycling through FREE models...")
                for fallback_model in FREE_FALLBACK_MODELS:
                    try:
                        response = await client.chat.completions.create(
                            model=fallback_model,
                            messages=messages,
                            temperature=0.1,
                            max_tokens=get_safe_max_tokens(fallback_model),
                        )
                        break
                    except: continue
                else: raise e
            else:
                raise e
        answer = response.choices[0].message.content or "Brak odpowiedzi."

        save_chat_messages(
            sid, json.dumps(user_msg_content, ensure_ascii=False), answer, message_type="final_answer"
        )

        return {
            "id": str(uuid.uuid4()),
            "content": answer,
            "model": request.model,
            "role": "assistant",
            "sessionId": sid,
            "rag_used": bool(context_text),
            "user_db_used": include_user_db,
        }
    except Exception as e:
        logger.error(f"❌ Chat Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat-consensus")
async def chat_consensus_endpoint(request: ChatRequest):
    try:
        sid = request.sessionId or getattr(request, "session_id", None) or str(uuid.uuid4())
        combined_doc_text = request.document_text or ""
        extracted_att_content, extracted_texts = await process_attachments(request.attachments or [])
        if extracted_texts:
            combined_doc_text += "\n" + "\n".join(extracted_texts)

        # NOWOŚĆ: Ściąganie linków z wiadomości
        web_texts = await scrape_urls_from_text(request.message)
        if web_texts:
             combined_doc_text += "\n" + "\n".join(web_texts)

        has_docs = bool(request.attachments or request.document_text)
        intent, include_user_db = await classify_intent(request.message, model_override=request.model, has_docs=has_docs)
        _chunks, context_text = await perform_rag_if_needed(
            intent,
            request.use_rag,
            request.message,
            request.history or [],
            combined_doc_text,
            model_override=request.model,
            include_user_db=include_user_db,
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
                generate_moa_stream(request, sid, combined_doc_text, context_text, extracted_att_content, include_user_db=include_user_db),
                media_type="text/event-stream",
            )

        result = await chat_consensus_moa(request, sid, combined_doc_text, context_text, extracted_att_content, include_user_db=include_user_db)

        # Zapisz pełną wiadomość użytkownika z załącznikami
        moa_user_content = [{"type": "text", "text": request.message}]
        # Obrazy w historii zapisujemy tylko jeśli model agregujący wspiera vision
        if is_vision_model(request.aggregator_model or request.model):
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
            json.dumps(moa_user_content, ensure_ascii=False),
            result.final_answer,
            message_type="moa_consensus",
            reasoning=json.dumps([asdict(r) for r in (result.analyst_results or [])], ensure_ascii=False),
            eli_explanation=result.eli_explanation,
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
            "user_db_used": include_user_db,
            "pipeline_latency_ms": result.pipeline_latency_ms,
            "eli_explanation": result.eli_explanation,
            "cited_sources": [asdict(cs) for cs in result.cited_sources] if result.cited_sources else [],
        }
    except Exception as e:
        print(f"\n❌ [CRITICAL ERROR] chat_consensus_moa failed:")
        traceback.print_exc()
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
            rag_query,
            include_user_db=False  # BEZPIECZEŃSTWO: draft-document domyślnie tylko legal
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
            model=request.model, messages=messages, max_tokens=get_safe_max_tokens(request.model, 4000)
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
                request.question[:8000], document_text=request.document_text,
                include_user_db=False  # BEZPIECZEŃSTWO: analyze-document domyślnie tylko legal
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
