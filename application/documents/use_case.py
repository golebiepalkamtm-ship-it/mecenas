from __future__ import annotations

import os
import time
from typing import Optional

from config import settings
from fastapi import HTTPException
from fastapi import BackgroundTasks, UploadFile
from models.request_models import DocumentAnalysisRequest, DraftRequest
from moa.config import get_async_client
from moa.http_client import get_shared_openai_client
from schemas.chat_contract import LegalSourceType

from application.retrieval.use_case import legal_retrieval_use_case
from services import document_service as document_service_module
from services.document_text_extractor import extract_text_from_bytes, save_local_document
from services.draft_document_catalog import get_document_type_hint
from utils.helpers import sanitize_filename


class AnalyzeDocumentUseCase:
    async def execute(self, request: DocumentAnalysisRequest) -> dict:
        try:
            document_text = request.document_text or ""
            question = request.question or ""
            use_rag = request.use_rag

            if not question.strip():
                return {
                    "success": False,
                    "answer": "Brak pytania do analizy.",
                    "sources": [],
                    "document_length": len(document_text),
                    "context_length": 0,
                    "rag_used": False,
                    "error": "Pytanie nie może być puste.",
                }

            from services.patron_security import analyze_input_security
            sec_scan = analyze_input_security(f"{document_text}\n{question}")
            if sec_scan.action == "blocked":
                return {
                    "success": False,
                    "answer": "Dokument lub zapytanie zostało zablokowane ze względów bezpieczeństwa (wykryto próbę nadpisania instrukcji / prompt injection).",
                    "sources": [],
                    "document_length": len(document_text),
                    "context_length": 0,
                    "rag_used": False,
                    "error": "Wykryto zagrożenie bezpieczeństwa tekstu wejściowego (Patron Input Security).",
                }

            rag_context = ""
            sources: list[str] = []

            if use_rag:
                try:
                    legal_chunks = await legal_retrieval_use_case.search_legal(
                        query=question,
                        match_count=5,
                    )
                    for chunk in legal_chunks:
                        content = chunk.get("content") or ""
                        meta = chunk.get("metadata") or {}
                        filename = meta.get("filename") or "Baza prawna"

                        rag_context += f"\n--- Źródło: {filename} ---\n{content}\n"
                        sources.append(filename)
                except Exception as e:
                    print(f"[RAG LEGAL ERR] Błąd pobierania bazy legal: {e}")

            system_prompt = (
                "Jesteś profesjonalnym polskim asystentem prawnym (LexMind). "
                "Twoim zadaniem jest merytoryczna, wyczerpująca i profesjonalna analiza dostarczonego dokumentu prawnego "
                "w kontekście pytania użytkownika oraz załączonej dodatkowej wiedzy prawnej."
            )

            user_content = f"""
ZADANIE: Analizuj poniższy dokument w kontekście pytania użytkownika.

PYTANIE UŻYTKOWNIKA:
{question}

TEKST DOKUMENTU:
{document_text}
"""

            if rag_context:
                user_content += f"""

DODATKOWA WIEDZA PRAWNA (RAG):
{rag_context}
"""

            user_content += "\n\nZwróć profesjonalną i merytoryczną odpowiedź w języku polskim."

            client = get_async_client()
            models_to_try = list(settings.vision_ocr_models)

            answer = None
            error_msg = None

            for model in models_to_try:
                try:
                    print(f"[ANALYZE] Próba generowania odpowiedzi modelem {model}...")
                    completion = await client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content},
                        ],
                        temperature=0.2,
                    )
                    answer = completion.choices[0].message.content
                    print(
                        f"[ANALYZE OK] Odpowiedź wygenerowana pomyślnie przy użyciu modelu {model}."
                    )
                    break
                except Exception as e:
                    error_msg = str(e)
                    print(f"[ANALYZE ERR] Błąd modelu {model}: {e}")
                    continue

            if not answer:
                raise Exception(f"Wszystkie modele LLM zwróciły błąd: {error_msg}")

            return {
                "success": True,
                "answer": answer,
                "sources": list(set(sources)),
                "document_length": len(document_text),
                "context_length": len(rag_context),
                "rag_used": len(rag_context) > 0,
            }

        except Exception as e:
            print(f"[ANALYZE FATAL] Błąd krytyczny endpointu analyze-document: {e}")
            return {
                "success": False,
                "answer": "Wystąpił błąd krytyczny podczas analizy dokumentu.",
                "sources": [],
                "document_length": len(request.document_text) if request else 0,
                "context_length": 0,
                "rag_used": False,
                "error": str(e),
            }


def _build_draft_user_prompt(request: DraftRequest, rag_context: str = "") -> str:
    parts: list[str] = []

    document_hint = get_document_type_hint(request.document_type)
    if document_hint:
        parts.append(f"### TYP PISMA:\n{document_hint}\n\n")

    structured = request.structured_data or {}
    if structured:
        parts.append("### DANE STRUKTURALNE DO DOKUMENTU:\n")
        parts.append(
            f"[MIEJSCE I DATA]: {structured.get('placeDate') or '...................., dnia ....................'}\n\n"
        )
        parts.append(f"[NADAWCA]:\n{structured.get('sender') or '....................'}\n\n")
        parts.append(f"[ADRESAT]:\n{structured.get('recipient') or '....................'}\n\n")
        parts.append("---\n\n")
    parts.append(
        f"### INSTRUKCJE DO TREŚCI:\n{request.user_instructions or 'Sporządź odpowiednie pismo procesowe/urzędowe na podstawie danych powyżej.'}\n\n"
    )
    if rag_context:
        parts.append(f"### KONTEKST Z BAZY WIEDZY RAG:\n{rag_context}\n\n")
    parts.append(
        "[WYMAGANIE]: Wygeneruj profesjonalny dokument prawny/urzędowy w formacie Markdown. "
        "Zachowaj poprawną strukturę procesową (miejsce na podpis, załączniki, petitum, uzasadnienie)."
    )
    return "".join(parts)


async def _fetch_draft_rag_context(query: str) -> str:
    try:
        import httpx
        from moa.config import OPENROUTER_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

        if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY]):
            return ""

        async with httpx.AsyncClient(timeout=60) as client:
            emb_res = await client.post(
                "https://openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/text-embedding-3-small",
                    "input": query or "draft document",
                },
            )
            if emb_res.status_code != 200:
                return ""
            emb_data = emb_res.json()
            embedding = (emb_data.get("data") or [{}])[0].get("embedding")
            if not embedding:
                return ""

            rpc_res = await client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/match_knowledge",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "query_embedding": embedding,
                    "match_threshold": 0.35,
                    "match_count": 5,
                },
            )
            if rpc_res.status_code != 200:
                return ""
            matches = rpc_res.json()
            if not isinstance(matches, list) or not matches:
                return ""
            return "\n---\n".join(
                (m.get("content") or "") for m in matches if isinstance(m, dict)
            )
    except Exception as exc:
        print(f"   [DRAFT] RAG context skipped: {exc}")
        return ""


class DraftDocumentUseCase:
    async def execute(self, request: DraftRequest) -> dict:
        rag_context = await _fetch_draft_rag_context(request.user_instructions)
        final_user_prompt = _build_draft_user_prompt(request, rag_context)

        history_messages = []
        for item in request.history or []:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = item.get("content")
            if role in ("user", "assistant", "system") and content:
                history_messages.append({"role": role, "content": str(content)})

        client = get_shared_openai_client()
        response = await client.chat.completions.create(
            model=request.model,
            messages=[
                {
                    "role": "system",
                    "content": request.system_prompt
                    or "Jesteś ekspertem ds. pism prawnych i urzędowych w Polsce.",
                },
                *history_messages,
                {"role": "user", "content": final_user_prompt},
            ],
        )
        content = response.choices[0].message.content or ""
        if not content.strip():
            raise HTTPException(status_code=502, detail="Model nie zwrócił treści pisma.")
        return {"content": content}


class UploadDocumentUseCase:
    max_file_size = 15 * 1024 * 1024

    async def execute(
        self,
        *,
        background_tasks: BackgroundTasks,
        file: UploadFile,
        category: str = "rag_user",
        source_type: Optional[LegalSourceType] = None,
        session_id: Optional[str] = None,
    ) -> dict:
        try:
            filename = sanitize_filename(file.filename or "unknown")
            print(f"\n   [UPLOAD] Otrzymano plik: {filename} ({file.content_type})")
            file_content = await file.read()
            print(
                f"   [UPLOAD] Rozmiar: {len(file_content)} bajtów. Rozpoczynanie ekstrakcji..."
            )
            if len(file_content) > self.max_file_size:
                print(
                    f"   [UPLOAD ERROR] Plik zbyt duży ({len(file_content)} > {self.max_file_size})"
                )
                raise HTTPException(
                    status_code=413, detail="Plik zbyt duży (maksymalnie 10MB)"
                )

            save_local_document(file_content, filename)

            print(f"   [UPLOAD] Plik zapisany lokalnie: {filename}. Przetwarzanie V2...")

            extracted_text = ""
            error = None
            pre_embedding = None

            extraction = await extract_text_from_bytes(
                file_content=file_content,
                filename=filename,
                content_type=file.content_type or "",
                binary_placeholder=True,
            )
            extracted_text = extraction.text
            error = extraction.error

            success = not bool(error)

            if success and extracted_text:

                if category == "rag_user":
                    try:
                        await document_service_module.index_document_to_supabase(
                            file_content=file_content,
                            filename=filename,
                            content_type=file.content_type or "",
                            category=category,
                            pre_extracted_text=extracted_text,
                            pre_embedding=pre_embedding,
                            source_type=(source_type.value if source_type else None),
                            session_id=session_id,
                        )
                        print(
                            f"   [SYNC] Zapisano dokument {filename} w bazie (knowledge_base_user)."
                        )
                    except Exception as e:
                        print(
                            f"   [SYNC ERROR] Błąd podczas indeksowania {filename}: {e}"
                        )
                else:
                    async def background_indexing():
                        try:
                            await document_service_module.index_document_to_supabase(
                                file_content=file_content,
                                filename=filename,
                                content_type=file.content_type or "",
                                category=category,
                                pre_extracted_text=extracted_text,
                                pre_embedding=pre_embedding,
                                source_type=(source_type.value if source_type else None),
                                session_id=session_id,
                            )
                            table_name = (
                                "knowledge_base_legal"
                                if category == "rag_legal"
                                else "knowledge_base_user"
                            )
                            print(
                                f"   [BACKGROUND] Zapisano dokument {filename} w bazie ({table_name})."
                            )
                        except Exception as e:
                            print(
                                f"   [BACKGROUND ERROR] Błąd podczas indeksowania {filename}: {e}"
                            )

                    background_tasks.add_task(background_indexing)

            return {
                "success": success,
                "filename": filename,
                "extracted_text": extracted_text if success else "",
                "text_length": len(extracted_text) if success else 0,
                "error": error,
            }
        except Exception as e:
            return {
                "success": False,
                "filename": "unknown",
                "extracted_text": "",
                "text_length": 0,
                "error": str(e),
            }


class SaveDraftUseCase:
    async def execute(self, request: DocumentAnalysisRequest):
        if not request.document_text:
            raise HTTPException(status_code=400, detail="Brak treści pisma")

        filename = sanitize_filename(request.question or f"Pismo_{int(time.time())}.md")
        if not filename.endswith(".md"):
            filename += ".md"

        return await document_service_module.index_document_to_supabase(
            file_content=request.document_text.encode("utf-8"),
            filename=filename,
            content_type="text/markdown",
            category="rag_user",
        )


class IndexSavedFileUseCase:
    async def execute(self, filename: str):
        safe_filename = sanitize_filename(filename)
        file_path = f"pdfs/{safe_filename}"
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Plik nie istnieje na serwerze")

        with open(file_path, "rb") as f:
            file_content = f.read()

        return await document_service_module.index_document_to_supabase(
            file_content, safe_filename, ""
        )


analyze_document_use_case = AnalyzeDocumentUseCase()
draft_document_use_case = DraftDocumentUseCase()
upload_document_use_case = UploadDocumentUseCase()
save_draft_use_case = SaveDraftUseCase()
index_saved_file_use_case = IndexSavedFileUseCase()
