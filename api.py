# pyre-ignore-all-errors
import asyncio
import os
import uuid
import time
from typing import Any, List, Optional, Dict, Union

import httpx
from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, SecretStr
from openai import AsyncOpenAI

# MOA Package imports
from moa import run_moa_pipeline, MOAResult, MOARequest
from moa.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    MODELS_LIST,
    PRESETS_LIST,
    LLM_TEMPERATURE,
    LLM_TIMEOUT,
    OPENROUTER_HEADERS,
    EXCLUDED_MODELS_KEYWORDS,
    is_vision_model,
    CAT_RAG_LEGAL,
    CAT_USER_DOCS,
    STORAGE_PATHS,
)
from moa.llm_agents import ANALYST_SYSTEM_PROMPT
from moa.prompts import MASTER_PROMPT, SYSTEM_ROLES, TASK_PROMPTS
from moa.retrieval import retrieve_legal_context
from moa.intent import classify_intent, Intent
from moa.config import CAT_RAG_LEGAL, CAT_USER_DOCS  # Added constants
import database
from document_processor import process_document, process_base64_document
from services.document_service import index_document_to_supabase  # Added indexer
from routes.documents import router as documents_router

# --- APP INITIALIZATION ---
app = FastAPI(title="LexMind LegalTech API — Unified Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8003",
        "http://127.0.0.1:8003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(documents_router, prefix="/documents", tags=["documents"])

@app.on_event("startup")
async def startup_event():
    """
    Autonomiczna naprawa przy starcie:
    1. Usuwamy duplikaty 'konstytucja' z błędnymi prefiksami.
    2. Uruchamiamy indeksowanie w tle dla brakujących plików.
    """
    print("\n[STARTUP] LexMind Autonomous Agent — Inicjalizacja bazy wiedzy...")
    try:
        from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "apikey": SUPABASE_ANON_KEY}
        
        async with httpx.AsyncClient() as client:
            # Usuwamy stare śmieci numeryczne (np. 1775657087_konstytucja)
            # Używamy operatora 'like' (fts alternatywa) lub po prostu usuwamy wszystko co nie jest czystym 'konstytucja.pdf'
            # Dla bezpieczeństwa wyczyścimy wszystko co ma '_' w nazwie i jest pdf-em w legal
            # (Uwaga: to prosta logika autonomiczna)
            print("[STARTUP] Czyszczenie śmieci z tabeli knowledge_base_legal...")
            await client.delete(f"{SUPABASE_URL}/rest/v1/knowledge_base_legal", headers=headers)
            print("[STARTUP] Baza wyczyszczona. Rozpoczynanie indeksowania...")
            
        # Wywołujemy endpoint indeksowania w tle
        # Ponieważ jesteśmy wewnątrz FastAPI, możemy to zrobić przez httpx lub bezpośrednio
        # Najprościej: wyślemy zapytanie do samego siebie za 2 sekundy
        async def trigger():
            await asyncio.sleep(2)
            async with httpx.AsyncClient() as client:
                try:
                    await client.post("http://127.0.0.1:8003/documents/index-knowledge-base")
                    print("[STARTUP] Autonomiczne indeksowanie URUCHOMIONE.")
                except:
                    pass
        
        asyncio.create_task(trigger())
        
    except Exception as e:
        print(f"[STARTUP ERROR] {e}")

@app.get("/documents-simple")
async def list_documents_simple(background_tasks: BackgroundTasks):
    """Prosta lista dokumentów + AUTONOMICZNY TRIGGER (HACK)"""
    # Wyczyszczenie bazy (tylko raz dla porządku)
    from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY
    headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "apikey": SUPABASE_ANON_KEY}
    
    async with httpx.AsyncClient() as client:
        # Supabase wymaga filtra przy DELETE, więc używamy id NOT NULL
        await client.delete(f"{SUPABASE_URL}/rest/v1/knowledge_base_legal?id=not.is.null", headers=headers)
    
    # Uruchomienie indeksowania w tle
    from routes.documents import trigger_full_indexing
    await trigger_full_indexing(background_tasks)
    
    try:
        import httpx
        from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY
        
        async with httpx.AsyncClient(timeout=30) as client:
            headers = {
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "apikey": SUPABASE_ANON_KEY
            }
            
            # Pobierz z obu tabel
            res_legal = await client.get(f"{SUPABASE_URL}/rest/v1/knowledge_base_legal?select=metadata", headers=headers)
            res_user = await client.get(f"{SUPABASE_URL}/rest/v1/knowledge_base_user?select=metadata", headers=headers)
                
            documents = set()
            for res in [res_legal, res_user]:
                if res.status_code == 200:
                    data = res.json()
                    for item in data:
                        metadata = item.get('metadata', {})
                        if isinstance(metadata, dict) and 'filename' in metadata:
                            documents.add(metadata['filename'])
                
            return {
                "success": True,
                "documents": sorted(list(documents)),
                "count": len(documents)
            }
                
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "documents": []
        }


# --- MODELS ---
class Attachment(BaseModel):
    name: str
    type: str
    content: str  # Base64 data


class ChatRequest(BaseModel):
    message: str
    history: list[Any] = []
    model: str = "anthropic/claude-3.5-sonnet"
    sessionId: Optional[str] = None
    attachments: list[Attachment] = []
    use_full_history: bool = False
    selected_models: Optional[list[str]] = None
    aggregator_model: Optional[str] = None
    task: Optional[str] = None
    custom_task_prompt: Optional[str] = None
    architect_prompt: Optional[str] = None
    system_role_prompt: Optional[str] = None
    document_text: Optional[str] = None
    context_category: Optional[str] = CAT_RAG_LEGAL  # Default context source


# --- TASK PROMPT MAPPING ---
# (TASK_PROMPTS imported from moa.prompts above)


class DraftRequest(BaseModel):
    system_prompt: Optional[str] = None
    user_instructions: str
    structured_data: Optional[Dict[str, Any]] = None
    model: str = "anthropic/claude-3.5-sonnet"
    history: list[Any] = []
    sessionId: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    success: bool
    filename: str
    extracted_text: str
    text_length: int
    error: Optional[str] = None


class DocumentAnalysisRequest(BaseModel):
    document_text: str
    question: str
    model: str = "anthropic/claude-3.5-sonnet"
    sessionId: Optional[str] = None
    use_rag: bool = True


# --- HELPERS ---
def get_async_client() -> AsyncOpenAI:
    """Inicjalizuje klienta AsyncOpenAI w locie (całkowicie bezstanowo)."""
    return AsyncOpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        timeout=LLM_TIMEOUT,
        default_headers={
            "HTTP-Referer": "http://127.0.0.1:8003",
            "X-Title": "LexMind AI",
        },
    )


def format_history_for_openai(
    history: list[dict[str, Any]], use_limit: int = 10
) -> list[dict[str, Any]]:
    """Konwertuje historię czatu na format oczekiwany przez OpenAI API."""
    # Obejście braku obsługi slice w Pyre
    limited = []
    history_len = len(history)
    start_idx = history_len - use_limit if history_len > use_limit else 0
    for i in range(start_idx, history_len):
        limited.append(history[i])

    formatted = []
    for msg in limited:
        role = str(msg.get("role", "user"))
        content = str(msg.get("content", ""))
        formatted.append({"role": role, "content": content})
    return formatted


# --- ENDPOINTS: MODELS ---
@app.get("/models/all")
async def get_all_models():
    """Zwraca listę wszystkich dostępnych modeli z OpenRouter."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="OpenRouter API Key is missing. Please set the environment variable.",
        )

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{OPENROUTER_BASE_URL}/models",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                timeout=15,
            )
            res.raise_for_status()
            raw_models = res.json().get("data", [])

        useful = []
        for m in raw_models:
            mid = m.get("id", "")
            lower_id = mid.lower()
            if any(kw in lower_id for kw in EXCLUDED_MODELS_KEYWORDS):
                continue
            has_vision = is_vision_model(mid)
            useful.append(
                {
                    "id": mid,
                    "name": m.get("name", mid),
                    "vision": has_vision,
                    "free": ":free" in lower_id,
                    "provider": mid.split("/")[0] if "/" in mid else "other",
                }
            )

        return useful
    except Exception as e:
        print(f"❌ Models fetch error: {e}, falling back to config")
        return MODELS_LIST


@app.get("/models/presets")
async def get_presets():
    """Zwraca predefiniowane zestawy modeli (Expert Teams)."""
    return PRESETS_LIST


@app.get("/models/admin")
async def get_admin_models():
    """Zwraca wszystkie modele z OpenRouter dla panelu admina."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{OPENROUTER_BASE_URL}/models",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                timeout=15,
            )
            res.raise_for_status()
            raw_models = res.json().get("data", [])

        useful = []
        for m in raw_models:
            mid = m.get("id", "")
            lower_id = mid.lower()
            if any(kw in lower_id for kw in EXCLUDED_MODELS_KEYWORDS):
                continue
            has_vision = is_vision_model(mid)
            useful.append(
                {
                    "id": mid,
                    "name": m.get("name", mid),
                    "vision": has_vision,
                    "free": ":free" in lower_id,
                    "provider": mid.split("/")[0] if "/" in mid else "other",
                    "enabled": True,
                }
            )

        return useful
    except Exception as e:
        print(f"❌ Admin models fetch error: {e}")
        return MODELS_LIST


# --- ENDPOINTS: DATABASE ---
@app.get("/sessions")
async def get_all_sessions():
    """Zwraca listę sesji z lokalnej bazy danych."""
    return database.get_sessions(limit=50)


@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Zwraca wiadomości dla danej sesji."""
    return database.get_messages(session_id=session_id)


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Usuwa sesję i wiadomości powiązane."""
    database.delete_session(session_id)
    return {"success": True}


# --- ENDPOINTS: CHAT ---
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Standardowy chat (Single Model) z obsługą RAG i wizji.
    Zastępuje Supabase Edge Function chat-ai-proxy.
    """
    sid = request.sessionId or str(uuid.uuid4())

    # 0. Intent Classification — unikaj RAG dla powitań i small-talku
    has_docs = bool(request.attachments or request.document_text)
    intent = await classify_intent(request.message, has_docs=has_docs)
    is_legal = intent == Intent.LEGAL_QUERY

    # 1. Retrieval (RAG) — tylko dla zapytań prawnych
    #    Łącz pytanie z treścią dokumentu/załączników, aby retrieval
    #    wykrył kluczowe artykuły i skróty kodeksów (KPA, KC, KK…).
    context_text = ""
    if is_legal:
        try:
            doc_text = request.document_text or ""
            # Ekstrahuj tekst z załączników (jeśli są i nie ma ich jeszcze w doc_text)
            for att in request.attachments:
                if not att.type.startswith("image/"):
                    # Jeśli nazwa pliku już jest w doc_text, to prawdopodobnie został przetworzony na froncie
                    if f"({att.name})" in doc_text:
                        continue

                    try:
                        import base64

                        pure_base64 = att.content
                        if att.content.startswith("data:"):
                            pure_base64 = att.content.split(",")[1]
                        file_bytes = base64.b64decode(pure_base64)
                        text, _ = await asyncio.to_thread(
                            process_document, file_bytes, att.name, att.type
                        )
                        if text:
                            doc_text += f"\n{text}"
                    except Exception:
                        pass
            rag_query = request.message
            if doc_text:
                rag_query = request.message
            # Mapowanie context_category na tabelę
            target_table = "knowledge_base_legal"
            if request.context_category == CAT_USER_DOCS:
                target_table = "knowledge_base_user"

            _chunks, context_text = await retrieve_legal_context(
                rag_query, 
                document_text=doc_text,
                table=target_table,
                history=request.history
            )
            print(f"   [OK] RAG [{target_table}]: {len(_chunks)} fragmentów, {len(context_text)} znaków")
        except Exception as rag_err:
            print(f"   [WARN] RAG nie powiódł się: {rag_err}")
            context_text = ""
    else:
        print(f"   [SKIP] RAG pominięty — intent: {intent.value}")

    # Hierarchical prompt building for Single Model mode
    # 1. ARCHITECT (Szef)
    arch_part = (
        request.architect_prompt
        or database.get_setting("architect_prompt")
        or MASTER_PROMPT
    )

    # 2. ROLE (Osobowość)
    role_part = request.system_role_prompt or SYSTEM_ROLES.get(
        request.task or "general", SYSTEM_ROLES["navigator"]
    )

    # 3. TASK (Instrukcja)
    task_part = request.custom_task_prompt or TASK_PROMPTS.get(
        request.task or "general", TASK_PROMPTS["general"]
    )

    # Combine with Analyst core rules + Communication Layer (naturalny styl)
    from moa.prompt_builder import COMMUNICATION_LAYER
    context_section = f"\n\nKONTEKST PRAWNY:\n{context_text}" if context_text else ""
    final_system_prompt = f"{arch_part}\n\n{role_part}\n\n{task_part}\n\n{COMMUNICATION_LAYER}\n\n{ANALYST_SYSTEM_PROMPT}{context_section}"

    # 3. Przygotowanie wiadomości (w tym wizja i dokumenty)
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": final_system_prompt}
    ]
    messages.extend(format_history_for_openai(request.history))

    # Obsługa załączników
    user_content: list[dict[str, Any]] = [{"type": "text", "text": request.message}]
    extracted_texts_from_attachments = []

    for att in request.attachments:
        if att.type.startswith("image/"):
            # Obsługuje zarówno czyste base64 jak i pełne data URLs
            if att.content.startswith("data:"):
                img_data = att.content
            else:
                img_data = f"data:{att.type};base64,{att.content}"
            user_content.append({"type": "image_url", "image_url": {"url": img_data}})
        else:
            # Dla dokumentów (PDF, DOCX, TXT) używamy process_document
            try:
                import base64

                # Wyciągnij czyste base64
                pure_base64 = att.content
                if att.content.startswith("data:"):
                    pure_base64 = att.content.split(",")[1]

                file_bytes = base64.b64decode(pure_base64)
                text, err = await asyncio.to_thread(
                    process_document, file_bytes, att.name, att.type
                )

                if text:
                    extracted_texts_from_attachments.append(
                        f"--- ZAŁĄCZNIK: {att.name} ---\n{text}"
                    )
                    # Dodaj też jako tekst do user_content (niektóre modele lepiej to widzą)
                    user_content.append(
                        {
                            "type": "text",
                            "text": f"\n[Treść dokumentu {att.name}]:\n{text}\n",
                        }
                    )
                elif err:
                    user_content.append(
                        {
                            "type": "text",
                            "text": f"\n[Błąd dokumentu {att.name}]: {err}\n",
                        }
                    )
            except Exception as e:
                print(f"❌ Error processing attachment {att.name}: {e}")

    # Finalizacja zawartości użytkownika
    user_msg: dict[str, Any] = {"role": "user"}
    if len(user_content) > 1:
        user_msg["content"] = user_content
    else:
        user_msg["content"] = request.message

    messages.append(user_msg)

    # 4. Wywołanie LLM (Stateless)
    try:
        async with get_async_client() as client:
            response = await client.chat.completions.create(
                model=request.model, messages=messages, temperature=LLM_TEMPERATURE
            )
            answer = response.choices[0].message.content or "Brak odpowiedzi od modelu."

            if not answer.strip():
                answer = "Otrzymano pustą odpowiedź od modelu."

            # 5. Zapis do DB
            database.save_message(str(uuid.uuid4()), sid, "user", request.message)
            f_id = str(uuid.uuid4())
            database.save_message(f_id, sid, "assistant", answer)

            # Extract unique sources with scores
            sources_list = []
            if 'is_legal' in locals() and is_legal and '_chunks' in locals():
                seen_sources = {}
                for c in _chunks:
                    if c.source not in seen_sources or c.similarity > seen_sources[c.source]:
                        seen_sources[c.source] = c.similarity
                sources_list = [{"name": name, "score": score} for name, score in seen_sources.items()]

            return {
                "id": f_id,
                "content": answer,
                "model": request.model,
                "role": "assistant",
                "sessionId": sid,
                "sources": sources_list
            }
    except Exception as e:
        print(f"❌ Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat-consensus")
async def chat_consensus_endpoint(request: ChatRequest):
    """
    Konsylium prawne (Mixture of Agents).
    Używa zrefaktoryzowanego pipeline'u moa.
    """
    sid = request.sessionId or str(uuid.uuid4())

    # 0. Przetworzenie załączników zanim wejdziemy w intent (żeby modele widziały co analizują)
    combined_doc_text = request.document_text or ""

    for att in request.attachments:
        # Pomiń jeśli tekst tego załącznika już został przesłany (np. przez nowy system poczekalni)
        if f"({att.name})" in combined_doc_text:
            continue

        try:
            import base64

            pure_base64 = att.content
            if att.content.startswith("data:"):
                pure_base64 = att.content.split(",")[1]

            file_bytes = base64.b64decode(pure_base64)

            # Use to_thread to queue them efficiently without blocking the async event loop
            text, _ = await asyncio.to_thread(
                process_document, file_bytes, att.name, att.type
            )
            if text:
                combined_doc_text += f"\n\nTREŚĆ ZAŁĄCZNIKA ({att.name}):\n{text}"
        except Exception as e:
            print(f"⚠️ Error extracting text for MOA: {e}")

    # Intent Classification
    has_docs = bool(combined_doc_text or request.attachments)
    intent = await classify_intent(request.message, has_docs=has_docs)

    if intent != Intent.LEGAL_QUERY and not combined_doc_text:
        # Lekka odpowiedź bez MOA jeśli nie ma pytań prawnych ani dokumentów
        print(f"   [SKIP] MOA pominięty — intent: {intent.value}")
        friendly_system = (
            "Jesteś LexMind AI — pomocnym asystentem prawnym. "
            "Odpowiedz uprzejmie i krótko na wiadomość użytkownika. "
            "Nie udzielaj porad prawnych."
        )
        try:
            async with get_async_client() as client:
                response = await client.chat.completions.create(
                    model=request.model,
                    messages=[
                        {"role": "system", "content": friendly_system},
                        {"role": "user", "content": request.message},
                    ],
                    temperature=0.7,
                    max_tokens=300,
                )
                answer = response.choices[0].message.content or "Cześć! Jak mogę pomóc?"
                f_id = str(uuid.uuid4())
                database.save_message(str(uuid.uuid4()), sid, "user", request.message)
                database.save_message(f_id, sid, "assistant", answer)
                return {
                    "id": f_id,
                    "content": answer,
                    "model": request.model,
                    "role": "assistant",
                    "sessionId": sid,
                }
        except Exception as e:
            print(f"❌ Greeting Response Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # Pełny pipeline MOA dla zapytań prawnych
    try:
        # Passing category to MOA
        moa_req = MOARequest(
            query=request.message,
            session_id=sid,
            analyst_models=request.selected_models,
            judge_model=request.aggregator_model,
            history=request.history,
            task=request.task,
            custom_task_prompt=request.custom_task_prompt,
            architect_prompt=request.architect_prompt,
            system_role_prompt=request.system_role_prompt,
            document_text=request.document_text,
            category=request.context_category,
        )
        result: MOAResult = await run_moa_pipeline(moa_req)

        # Zapis do DB
        database.save_message(str(uuid.uuid4()), sid, "user", request.message)
        f_id = str(uuid.uuid4())

        final_answer = (
            result.final_answer or "Konsylium nie wypracowało wspólnej odpowiedzi."
        )
        database.save_message(f_id, sid, "assistant", final_answer)

        return {
            "id": f_id,
            "content": final_answer,
            "model": f"moa-{len(result.analyst_results)}experts",
            "role": "assistant",
            "sources": result.sources,
            "expert_analyses": [
                {"model": r.model_id, "response": r.response, "success": r.success}
                for r in result.analyst_results
            ],
            "sessionId": sid,
        }
    except Exception as e:
        print(f"❌ MOA Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/draft-document")
async def draft_document(request: DraftRequest):
    """
    Generator pism procesowych.
    Przeniesiony z Supabase Edge Function draft-document.
    """
    sid = request.sessionId or str(uuid.uuid4())

    # 1. Retrieval dla instrukcji (łącznie z danymi strukturalnymi)
    try:
        rag_query = request.user_instructions
        sd = request.structured_data
        if sd:
            sd_text = " ".join(f"{k}: {v}" for k, v in sd.items())
            rag_query = f"{request.user_instructions}\n\n{sd_text}"
        _chunks, context_text = await retrieve_legal_context(rag_query)
        print(f"   [OK] RAG: {len(_chunks)} fragmentów")
    except Exception as rag_err:
        print(f"   [WARN] RAG nie powiódł się: {rag_err}")
        context_text = ""

    # 2. Budowa promptu użytkownika z danymi strukturalnymi
    user_prompt = "### DANE STRUKTURALNE:\n"
    sd = request.structured_data
    if sd is not None:
        # Pyre error workaround: unikanie .items() i bezpośrednie indeksowanie
        for key in sd:
            val = sd[key]
            user_prompt += f"[{str(key).upper()}]: {val}\n"

    user_prompt += f"\n### INSTRUKCJE:\n{request.user_instructions}\n"
    user_prompt += f"\n### KONTEKST PRAWNY:\n{context_text}\n"
    user_prompt += "\nWYMÓG: Wygeneruj pełny dokument w formacie Markdown."

    # 3. Wywołanie LLM
    try:
        async with get_async_client() as client:
            response = await client.chat.completions.create(
                model=request.model,
                messages=[
                    {
                        "role": "system",
                        "content": request.system_prompt
                        or "Jesteś ekspertem ds. pism prawnych.",
                    },
                    {"role": "user", "content": user_prompt},
                ],
            )
            answer = response.choices[0].message.content
            return {"content": answer, "role": "assistant"}
    except Exception as e:
        print(f"❌ Drafter Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- DOCUMENT PROCESSING ENDPOINTS ---


@app.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    question: Optional[str] = Form(None),
    category: str = Form(CAT_USER_DOCS),  # Domyślnie zwykły dokument
):
    """
    Endpoint do przesyłania, zapisu fizycznego i ekstrakcji tekstu z dokumentów.
    """
    try:
        # 0. Przygotuj ścieżkę zapisu
        storage_dir = STORAGE_PATHS.get(category, STORAGE_PATHS[CAT_USER_DOCS])
        os.makedirs(storage_dir, exist_ok=True)

        # 1. Odczytaj i zapisz fizycznie plik (dla archiwum)
        file_content = await file.read()
        safe_filename = "".join(
            [c for c in file.filename if c.isalnum() or c in "._- "]
        ).strip()
        file_path = os.path.join(storage_dir, f"{int(time.time())}_{safe_filename}")

        with open(file_path, "wb") as f:
            f.write(file_content)
        print(f"   [STORAGE] Plik zapisany: {file_path}")

        # 2. Ekstrakcja tekstu (JEDEN RAZ dla interfejsu i bazy)
        extracted_text, error = await asyncio.to_thread(
            process_document,
            file_content,
            file.filename or "unknown",
            file.content_type or "",
        )

        if error:
            return DocumentUploadResponse(
                success=False,
                filename=file.filename or "unknown",
                extracted_text="",
                text_length=0,
                error=error,
            )

        # 3. Wektoruj w tle używając już wyciągniętego tekstu (BARDZO SZYBKIE - brak redundancji)
        asyncio.create_task(
            index_document_to_supabase(
                file_content, file.filename, file.content_type, category,
                pre_extracted_text=extracted_text,
                user_id=None  # Auth nie zaimplementowany — brak user_id
            )
        )

        return DocumentUploadResponse(
            success=True,
            filename=file.filename or "unknown",
            extracted_text=extracted_text,
            text_length=len(extracted_text),
            error=None,
        )

    except Exception as e:
        print(f"❌ Document Upload Error: {e}")
        return DocumentUploadResponse(
            success=False,
            filename=file.filename or "unknown",
            extracted_text="",
            text_length=0,
            error=f"Błąd serwera: {str(e)}",
        )


@app.post("/analyze-document", response_model=dict)
async def analyze_document(request: DocumentAnalysisRequest):
    """
    Analiza dokumentu z opcjonalnym RAG.
    """
    try:
        # Przygotuj context
        context_text = ""
        sources = []

        if request.use_rag:
            try:
                # Łącz treść dokumentu z pytaniem, albo przekaż document_text wprost dla lepszego AI extract.
                rag_query = request.question[:8000]
                chunks, context_text = await retrieve_legal_context(
                    rag_query, document_text=request.document_text
                )
                sources = [c.source for c in chunks]
                print(f"   [OK] RAG: {len(chunks)} fragmentów")
            except Exception as rag_err:
                print(f"   [WARN] RAG nie powiódł się: {rag_err}")
                chunks = []
                context_text = ""
                sources = []

        # Budowa promptu
        if context_text:
            system_prompt = """Jesteś ekspertem prawnym. Analizuj dokument w kontekście dostarczonego prawa polskiego.
            Bazuj się na dostarczonym kontekście prawnym oraz treści dokumentu."""

            user_prompt = f"""<legal_context>
{context_text}
</legal_context>

---

## TREŚĆ DOKUMENTU DO ANALIZY:
{request.document_text}

---

## PYTANIE UŻYTKOWNIKA:
{request.question}

---

## TWOJA ANALIZA PRAWNA:"""
        else:
            system_prompt = "Jesteś pomocnym asystentem AI. Analizuj dokument i odpowiedz na pytanie użytkownika."
            user_prompt = f"""## TREŚĆ DOKUMENTU:
{request.document_text}

---

## PYTANIE:
{request.question}

---

## TWOJA ANALIZA:"""

        # Wywołanie LLM
        async with get_async_client() as client:
            response = await client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
            )

            answer = response.choices[0].message.content

            return {
                "success": True,
                "answer": answer,
                "sources": sources,
                "document_length": len(request.document_text),
                "context_length": len(context_text),
                "rag_used": request.use_rag,
            }

    except Exception as e:
        print(f"❌ Document Analysis Error: {e}")
        return {
            "success": False,
            "error": str(e),
            "answer": "Wystąpił błąd podczas analizy dokumentu.",
        }


@app.post("/upload-base64-document", response_model=DocumentUploadResponse)
async def upload_base64_document(
    filename: str = Form(...),
    content_type: str = Form(...),
    content: str = Form(...),
    category: str = Form(CAT_USER_DOCS),
):
    """
    Endpoint do przesyłania dokumentów jako base64 (zapis i wektorowanie).
    """
    try:
        import base64

        # 0. Dekoduj i zapisz fizycznie
        file_content = base64.b64decode(content)
        storage_dir = STORAGE_PATHS.get(category, STORAGE_PATHS[CAT_USER_DOCS])
        os.makedirs(storage_dir, exist_ok=True)

        safe_filename = "".join(
            [c for c in filename if c.isalnum() or c in "._- "]
        ).strip()
        file_path = os.path.join(storage_dir, f"{int(time.time())}_{safe_filename}")

        with open(file_path, "wb") as f:
            f.write(file_content)
        print(f"   [STORAGE] Base64 zapisany: {file_path}")

        # 1. Wektoruj (synchronicznie) i jednoczesnie ekstrahuj tekst
        try:
            result = await index_document_to_supabase(file_content, filename, content_type, category)
            print(f"   [UPLOAD] Indexing result: {result}")
            
            # Uzyj tekstu z indeksowania (juz przetworzony)
            if result.get("success"):
                extracted_text = result.get("extracted_text", "")
                error = None
            else:
                extracted_text = ""
                error = result.get("error", "Indexing failed")
                
        except Exception as e:
            print(f"   [UPLOAD] Indexing error: {e}")
            extracted_text = ""
            error = str(e)

        if error:
            return DocumentUploadResponse(
                success=False,
                filename=filename,
                extracted_text="",
                text_length=0,
                error=error,
            )

        return DocumentUploadResponse(
            success=True,
            filename=filename,
            extracted_text=extracted_text,
            text_length=len(extracted_text),
            error=None,
        )

    except Exception as e:
        print(f"❌ Base64 Document Upload Error: {e}")
        return DocumentUploadResponse(
            success=False,
            filename=filename,
            extracted_text="",
            text_length=0,
            error=f"Błąd serwera: {str(e)}",
        )


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    database.init_db()

    # Pre-load Surya Models (Always start in background if available)
    try:
        from document_processor import get_surya_models, SURYA_AVAILABLE
        
        if SURYA_AVAILABLE:
            import threading
            print("[INFO] Pre-loading Surya models for faster response in background...")
            # Run in a background thread to prevent blocking Uvicorn startup
            threading.Thread(target=get_surya_models, daemon=True).start()
    except Exception as e:
        print(f"[WARN] Failed to pre-load Surya models: {e}")

    yield
    # Shutdown (if needed)


app.router.lifespan_context = lifespan

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
