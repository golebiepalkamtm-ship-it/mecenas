import logging
import uuid
import json
import asyncio
import traceback
from dataclasses import asdict
from typing import List, Dict, Any, Tuple
from fastapi.responses import StreamingResponse
from moa.pipeline import run_moa_pipeline, MOARequest
from moa.retrieval import retrieve_legal_context
from moa.intent import classify_intent, Intent
from moa.query_parser import parse_user_query
from moa.http_client import get_shared_openai_client
from moa.config import LLM_TEMPERATURE, get_safe_max_tokens

from moa.prompt_builder import IdentityMode, PromptConfig, build_system_prompt
from utils.helpers import format_history_for_openai, save_chat_messages

logger = logging.getLogger("LexMindChatService")


async def perform_rag_if_needed(
    intent: Intent,
    use_rag: bool,
    message: str,
    history: List[Any],
    document_text: str = "",
    model_override: str = None,
    include_user_db: bool = False,
) -> Tuple[List[Any], str]:
    """Wykonuje RAG jeśli zapytanie jest prawne i RAG jest włączony."""
    is_legal = intent == Intent.LEGAL_QUERY
    rag_enabled = use_rag or bool(document_text.strip()) or is_legal

    if rag_enabled:
        try:
            logger.info(
                f"   [RAG SERVICE] Inteligentne parsowanie zapytania (Node 1) dla: {message[:50]}..."
            )
            parsed_params = None
            try:
                # Opcjonalnie przekazujemy klucze API jeśli są dostępne w kontekście wywołania
                # Tu dla uproszczenia bierzemy domyślne, chyba że przekazano parametry
                parsed_params = await parse_user_query(message)
            except Exception as e:
                logger.warning(f"   [WARN] Node 1 Parser failed, using fallback: {e}")

            logger.info(
                f"   [RAG SERVICE] Pobieranie kontekstu... (include_user_db={include_user_db})"
            )
            chunks, context_text = await retrieve_legal_context(
                message,
                document_text=document_text,
                model_override=model_override,
                include_user_db=include_user_db,
                parsed_params=parsed_params,
            )
            return chunks, context_text
        except Exception as e:
            logger.warning(f"   [WARN] RAG Service nie powiódł się: {e}")
            return [], ""
    return [], ""


async def chat_consensus_moa(
    request: Any,
    sid: str,
    combined_doc_text: str,
    context_text: str,
    extracted_att_content: List[Any] = [],
    include_user_db: bool = False,
):
    """Logika MOA / Konsylium prawne."""
    print(
        f"\n   [MOA START] Uruchamianie konsylium dla sesji: {sid} (include_user_db={include_user_db})"
    )

    moa_req = MOARequest(
        query=request.message,
        session_id=sid,
        analyst_models=request.selected_models,
        judge_model=request.aggregator_model,
        task=request.task,
        document_text=combined_doc_text,
        history=format_history_for_openai(request.history or []),
        mode=request.mode,
        expert_roles=request.expert_roles,
        expert_role_prompts=request.expert_role_prompts,
        custom_task_prompt=request.custom_task_prompt,
        architect_prompt=request.architect_prompt,
        system_role_prompt=request.system_role_prompt,
        judge_system_prompt=request.judge_system_prompt,
        api_keys=request.api_keys,
        attachments=extracted_att_content or [],
        include_user_db=include_user_db,
        context_text=context_text,
        user_id=getattr(request, "user_id", "default"),
    )

    result = await run_moa_pipeline(moa_req)
    return result


async def generate_moa_stream(
    request: Any,
    sid: str,
    combined_doc_text: str,
    context_text: str,
    extracted_att_content: List[Any] = [],
    include_user_db: bool = False,
):
    """Strumieniowanie statusów i finalnej odpowiedzi MOA."""
    f_id = str(uuid.uuid4())
    logger.info(f"   [STREAM] Inicjalizacja strumienia MOA dla {sid}")

    # 1. Wyślij wstępne metadane
    yield f"data: {json.dumps({'type': 'metadata', 'id': f_id, 'sessionId': sid, 'rag_used': bool(context_text), 'execution_mode': 'moa', 'consensus_used': True}, ensure_ascii=False)}\n\n"

    # 2. Statusy początkowe
    yield f"data: {json.dumps({'type': 'chunk', 'text': '🚀 *Uruchamianie zespołu ekspertów...*\n'}, ensure_ascii=False)}\n\n"

    try:
        if not context_text:
            yield f"data: {json.dumps({'type': 'chunk', 'text': '🔍 *Wykonuję głęboki retrieval przepisów i orzecznictwa...*\n'}, ensure_ascii=False)}\n\n"

        # URUCHOMIENIE PIPELINE MOA
        result = await chat_consensus_moa(
            request,
            sid,
            combined_doc_text,
            context_text,
            extracted_att_content,
            include_user_db=include_user_db,
        )

        if not result.success:
            err_msg = f"❌ Błąd MOA: {result.error}"
            yield f"data: {json.dumps({'type': 'chunk', 'text': err_msg}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Poinformuj o sukcesie ekspertów
        expert_count = len(result.analyst_results or [])
        success_count = sum(1 for r in (result.analyst_results or []) if r.success)
        yield f"data: {json.dumps({'type': 'chunk', 'text': f'🧪 *Zespół ({success_count}/{expert_count}) dostarczył analizy. Główny Mecenas syntetyzuje opinię...*\n\n'}, ensure_ascii=False)}\n\n"

        # 3. STRUMIENIOWANIE KOŃCOWEJ ODPOWIEDZI
        final_text = result.final_answer or "Brak odpowiedzi od Mecenasa."
        # Wysyłamy w większych kawałkach dla płynności
        chunk_size = 256
        for i in range(0, len(final_text), chunk_size):
            part = final_text[i : i + chunk_size]
            yield f"data: {json.dumps({'type': 'chunk', 'text': part}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.01)  # Delikatny delay dla efektu pisania

        # 4. ZAPIS DO BAZY (Tylko czysta wiadomość użytkownika, OCR zostaje w metadanych)
        db_user_msg = request.message

        save_chat_messages(
            sid,
            db_user_msg,
            final_text,
            message_type="moa_consensus",
            reasoning=json.dumps(
                [
                    {"m": r.model_id, "s": r.success}
                    for r in (result.analyst_results or [])
                ],
                ensure_ascii=False,
            ),
            eli_explanation=result.eli_explanation,
        )

        # 5. FINALNE METADANE (Eksperci, Certyfikat ELI)
        expert_data = [
            {
                "model": r.model_id,
                "response": r.response,
                "success": r.success,
                "latency_ms": r.latency_ms,
            }
            for r in (result.analyst_results or [])
        ]

        yield f"data: {
            json.dumps(
                {
                    'type': 'final_metadata',
                    'expert_analyses': expert_data,
                    'eli_explanation': result.eli_explanation,
                    'consensus_used': True,
                    'cited_sources': [asdict(cs) for cs in result.cited_sources]
                    if result.cited_sources
                    else [],
                    'diagnostics': [asdict(d) for d in result.diagnostics]
                    if result.diagnostics
                    else [],
                    'pipeline_latency_ms': result.pipeline_latency_ms,
                },
                ensure_ascii=False,
            )
        }\n\n"

    except Exception as e:
        logger.error(f"   [STREAM ERR] MOA Stream Error: {e}")
        traceback.print_exc()
        yield f"data: {json.dumps({'type': 'chunk', 'text': f'❌ Błąd krytyczny strumienia: {str(e)}'}, ensure_ascii=False)}\n\n"

    yield "data: [DONE]\n\n"


async def generate_chat_stream(
    request: Any,
    sid: str,
    messages: List[Dict[str, Any]],
    context_text: str,
    extracted_texts: List[str],
):
    """Generator strumieniowego czatu z obsługą błędów providera."""
    f_id = str(uuid.uuid4())
    logger.info(f"   [STREAM] Inicjalizacja strumienia MOA dla {sid}")

    # 1. Wyślij wstępne metadane
    yield f"data: {json.dumps({'type': 'metadata', 'id': f_id, 'sessionId': sid, 'rag_used': bool(context_text)}, ensure_ascii=False)}\n\n"

    async def _emit_text_chunks(text: str):
        chunk_size = 256
        for i in range(0, len(text), chunk_size):
            part = text[i : i + chunk_size]
            yield f"data: {json.dumps({'type': 'chunk', 'text': part}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.01)

    async def _run_free_fallbacks() -> tuple[str, str]:
        from moa.config import FREE_FALLBACK_MODELS

        for idx, fallback_model in enumerate(FREE_FALLBACK_MODELS, 1):
            try:
                fallback_max_tokens = get_safe_max_tokens(fallback_model)
                logger.warning(
                    f"   [FALLBACK {idx}/{len(FREE_FALLBACK_MODELS)}] Próba: {fallback_model} (max_tokens={fallback_max_tokens})..."
                )
                completion = await client.chat.completions.create(
                    model=fallback_model,
                    messages=messages,
                    temperature=LLM_TEMPERATURE,
                    max_tokens=fallback_max_tokens,
                )
                fallback_text = completion.choices[0].message.content or ""
                if fallback_text:
                    logger.info(
                        f"   [REPAIR SUCCESS] Odzyskano sesję za pomocą {fallback_model}!"
                    )
                    return fallback_model, fallback_text
            except Exception as fallback_err:
                fb_status = getattr(fallback_err, "status_code", None)
                logger.warning(
                    f"   [FALLBACK FAIL {idx}/{len(FREE_FALLBACK_MODELS)}] {fallback_model} (status {fb_status}): {str(fallback_err)[:150]}"
                )
                continue

        return "", ""

    try:
        client = get_shared_openai_client()
        try:
            response = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=LLM_TEMPERATURE,
                max_tokens=get_safe_max_tokens(request.model),
                stream=True,
                extra_headers={
                    "Authorization": f"Bearer {request.api_keys.get('openrouter')}"
                }
                if request.api_keys and request.api_keys.get("openrouter")
                else None,
            )
        except Exception as e:
            # AUTO-REPAIR: Pętla darmowych modeli dla strumieniowania
            error_status = getattr(e, "status_code", None)
            logger.warning(
                f"   [STREAM ERR] Błąd strumieniowania. Status: {error_status}, Error: {str(e)[:100]}"
            )

            if error_status == 402 or error_status == 429 or error_status is None:
                logger.warning(
                    "   [REPAIR] Brak środków/rate limit. Przeszukiwanie darmowych modeli dla streamu..."
                )
                fallback_model, fallback_text = await _run_free_fallbacks()
                if fallback_text:
                    async for emitted in _emit_text_chunks(fallback_text):
                        yield emitted
                    db_user = request.message
                    save_chat_messages(
                        sid,
                        db_user,
                        fallback_text,
                        message_type="final_answer",
                    )
                    yield "data: [DONE]\n\n"
                    return

                logger.error(
                    "   [REPAIR FAIL] Wszystkie modele fallback nieudane. Rzucam oryginalny błąd."
                )
                raise e
            else:
                logger.error(
                    "   [STREAM ERR] Błąd nie jest 402/429, nie uruchamiam fallback. Rzucam błąd."
                )
                raise e

        full_answer = ""
        try:
            async for chunk in response:
                if not chunk.choices:
                    continue
                content = chunk.choices[0].delta.content
                if content:
                    full_answer += content
                    yield f"data: {json.dumps({'type': 'chunk', 'text': content}, ensure_ascii=False)}\n\n"
        except Exception as stream_err:
            logger.warning(
                f"   [STREAM ERR] Provider returned error podczas iteracji strumienia: {stream_err}"
            )
            traceback.print_exc()

            if not full_answer.strip():
                logger.warning(
                    "   [REPAIR] Strumień padł przed pierwszym chunkiem. Próbuję pełnej odpowiedzi bez streamu..."
                )
                fallback_model, fallback_text = await _run_free_fallbacks()
                if fallback_text:
                    async for emitted in _emit_text_chunks(fallback_text):
                        yield emitted
                    db_user = request.message
                    save_chat_messages(
                        sid,
                        db_user,
                        fallback_text,
                        message_type="final_answer",
                    )
                    yield "data: [DONE]\n\n"
                    return

            raise

        db_user = request.message
        if full_answer:
            save_chat_messages(sid, db_user, full_answer, message_type="final_answer")
    except Exception as e:
        logger.error(f"   [STREAM ERR] Chat Stream Error: {e}")
        err_type = type(e).__name__
        yield f"data: {json.dumps({'type': 'chunk', 'text': f'\\n\\n❌ **Błąd Połączenia ({err_type})**\\n\\nSerwer dostawcy zwrócił błąd. Prawdopodobne przyczyny:\\n- Przeciążenie modelu lub chwilowa awaria dostawcy.\\n- Przekroczenie limitu kontekstu dla tego modelu.\\n- Brak środków na koncie API.\\n\\nSpróbuj ponownie za chwilę lub wybierz inny model w panelu bocznym.'}, ensure_ascii=False)}\n\n"

    yield "data: [DONE]\n\n"
