import logging
import uuid
import json
import asyncio
from typing import List, Dict, Any, Tuple
from fastapi.responses import StreamingResponse
from moa.pipeline import run_moa_pipeline, MOARequest
from moa.retrieval import retrieve_legal_context
from moa.intent import classify_intent, Intent
from moa.http_client import get_shared_openai_client
from moa.config import LLM_TEMPERATURE

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
            logger.info(f"   [RAG SERVICE] Pobieranie kontekstu dla: {message[:50]}... (include_user_db={include_user_db})")
            chunks, context_text = await retrieve_legal_context(
                message, document_text=document_text, model_override=model_override, include_user_db=include_user_db
            )
            return chunks, context_text
        except Exception as e:
            logger.warning(f"   [WARN] RAG Service nie powiódł się: {e}")
            return [], ""
    return [], ""


async def chat_consensus_moa(
    request: Any, sid: str, combined_doc_text: str, context_text: str, extracted_att_content: List[Any] = [],
    include_user_db: bool = False
):
    """Logika MOA / Konsylium prawne."""
    print(f"\n   [MOA START] Uruchamianie konsylium dla sesji: {sid} (include_user_db={include_user_db})")
    
    # NIE prepandujemy już context_text do combined_doc_text, 
    # ponieważ MOA pipeline i tak sam wykonuje retrieval i przekazuje to jako oddzielną sekcję.
    # Zapobiega to duplikacji kontekstu i dezorientacji modeli.

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
        attachments=extracted_att_content or [], # Przekazujemy załączniki (obrazy) do ekspertów
        include_user_db=include_user_db,
        context_text=context_text
    )

    result = await run_moa_pipeline(moa_req)
    return result


async def generate_moa_stream(
    request: Any, sid: str, combined_doc_text: str, context_text: str, extracted_att_content: List[Any] = [],
    include_user_db: bool = False
):
    """Strumieniowanie statusów i finalnej odpowiedzi MOA."""
    f_id = str(uuid.uuid4())
    print(f"   [STREAM] Inicjalizacja strumienia MOA dla {sid}")
    
    # 1. Wyślij metadane
    yield f"data: {json.dumps({'type': 'metadata', 'id': f_id, 'sessionId': sid, 'rag_used': bool(context_text), 'execution_mode': 'moa'})}\n\n"
    
    # 2. Wyślij informację o rozpoczęciu analizy (status)
    yield f"data: {json.dumps({'type': 'chunk', 'text': '🚀 *Inicjalizacja zespołu ekspertów i analiza dokumentów...*\n'})}\n\n"
    
    # 3. Uruchom MOA (blokująco w tym asynchronicznym generatorze, ale yielding przedtem pozwala UI zareagować)
    # 3. Uruchom MOA
    try:
        # Poinformuj o rozpoczęciu retrievalu
        yield f"data: {json.dumps({'type': 'chunk', 'text': '🔍 *Przeszukiwanie bazy prawnej i dokumentów użytkownika...*\n'})}\n\n"
        
        # Przekazujemy callback do pipeline (jeśli go zaraz dodamy) lub symulujemy postęp
        result = await chat_consensus_moa(request, sid, combined_doc_text, context_text, extracted_att_content, include_user_db=include_user_db)
        
        if not result.success:
            err_msg = f"❌ Błąd MOA: {result.error}"
            yield f"data: {json.dumps({'type': 'chunk', 'text': err_msg})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Status po analizie ekspertów
        expert_count = len(result.analyst_results or [])
        success_count = sum(1 for r in (result.analyst_results or []) if r.success)
        yield f"data: {json.dumps({'type': 'chunk', 'text': f'🧪 *Eksperci ({success_count}/{expert_count}) zakończyli analizę. Synteza sędziego...*\n\n'})}\n\n"

        # 4. Wyślij finalną odpowiedź strumieniowo
        final_text = result.final_answer
        chunk_size = 128 # Więcej na raz dla płynności
        for i in range(0, len(final_text), chunk_size):
            part = final_text[i:i+chunk_size]
            yield f"data: {json.dumps({'type': 'chunk', 'text': part})}\n\n"
            await asyncio.sleep(0.005) 
        
        # 5. Zapisz w bazie
        db_user = request.message
        if combined_doc_text and "KONTEKST PRAWNY" not in combined_doc_text:
             db_user += f"\n\n[DOKUMENTY]:\n{combined_doc_text[:2000]}"
        
        save_chat_messages(
            sid, 
            db_user, 
            result.final_answer, 
            message_type="moa_consensus",
            reasoning=json.dumps([{"m": r.model_id, "s": r.success} for r in (result.analyst_results or [])]),
            eli_explanation=result.eli_explanation
        )
        
    except Exception as e:
        print(f"   [STREAM ERR] MOA Stream Error: {e}")
        yield f"data: {json.dumps({'type': 'chunk', 'text': f'❌ Wystąpił błąd podczas pracy ekspertów: {str(e)}'})}\n\n"

    yield "data: [DONE]\n\n"


async def generate_chat_stream(
    request: Any,
    sid: str,
    messages: List[Dict[str, Any]],
    context_text: str,
    extracted_texts: List[str],
):
    """Generator strumieniowego czatu."""
    f_id = str(uuid.uuid4())
    yield f"data: {json.dumps({'type': 'metadata', 'id': f_id, 'sessionId': sid, 'rag_used': bool(context_text)})}\n\n"

    client = get_shared_openai_client()
    response = await client.chat.completions.create(
        model=request.model,
        messages=messages,
        temperature=LLM_TEMPERATURE,
        max_tokens=2500,
        stream=True,
        extra_headers={"Authorization": f"Bearer {request.api_keys.get('openrouter')}"} if request.api_keys and request.api_keys.get('openrouter') else None
    )

    full_answer = ""
    async for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            full_answer += content
            yield f"data: {json.dumps({'type': 'chunk', 'text': content})}\n\n"

    db_user = request.message
    if extracted_texts:
        db_user += "\n\n[DOKUMENTY]:\n" + "\n".join(extracted_texts)
    save_chat_messages(
        sid, db_user, full_answer or "Brak odpowiedzi.", message_type="final_answer"
    )
    yield "data: [DONE]\n\n"
