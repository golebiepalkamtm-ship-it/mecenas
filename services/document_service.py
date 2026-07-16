import asyncio
import hashlib
import httpx
import io
import os
from typing import List, Dict, Any, Optional
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
from moa.retrieval import get_text_embeddings
from services.user_kb_cache import STORAGE_CHUNK, STORAGE_FULL_BODY
from services.legal_rank import classify_legal_rank

async def get_batch_embeddings(texts: list[str]) -> list[list[float]]:
    return await get_text_embeddings(texts, input_type="search_document")

async def index_document_to_supabase(
    file_content: bytes, 
    filename: str, 
    content_type: str, 
    category: str = "rag_legal",
    pre_extracted_text: Optional[str] = None,
    user_id: Optional[str] = None,
    pre_embedding: Optional[list[float]] = None,
    source_type: Optional[str] = None,
    act_terms: Optional[list[str]] = None,
    force_reindex: bool = False,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Indeksowanie dokumentu do Supabase (V2)."""
    table_name = "knowledge_base_legal" if category == "rag_legal" else "knowledge_base_user"
    
    try:
        # 1. Ekstrakcja tekstu
        if pre_extracted_text:
            extracted_text = pre_extracted_text
        else:
            name_lower = (filename or "").lower()
            ctype_lower = (content_type or "").lower()
            try:
                if ctype_lower == "application/pdf" or name_lower.endswith(".pdf"):
                    import pypdf

                    pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
                    page_parts: list[str] = []
                    for i, page in enumerate(pdf_reader.pages, start=1):
                        page_text = page.extract_text()
                        if page_text is None:
                            page_text = ""
                        page_parts.append(f"--- STRONA {i} ---\n{page_text}")
                    extracted_text = "\n\n".join(page_parts).strip()
                else:
                    extracted_text = file_content.decode("utf-8")
            except Exception as extract_err:
                return {
                    "success": False,
                    "error": f"Nie udało się wyekstrahować tekstu (OCR wyłączony): {extract_err}",
                }

        # Oczyszczanie tekstu z bajtów zerowych (\u0000 / \x00), których PostgreSQL nie potrafi zapisać
        extracted_text = extracted_text.replace('\u0000', '').replace('\x00', '')

        if not extracted_text:
            return {"success": False, "error": "Brak tekstu."}

        source_file_hash = hashlib.sha256(file_content).hexdigest()
        resolved_source_type = (source_type or ("statute" if category == "rag_legal" else "user_doc")).strip()
        resolved_act_terms = act_terms if category == "rag_legal" else None
        legal_rank, legal_rank_label = classify_legal_rank(
            source_type=resolved_source_type,
            filename=filename,
            title=filename,
            content=extracted_text[:4000],
        )

        # 2. Chunking
        from services.document_chunking import chunk_document
        base_metadata = {
            "filename": filename,
            "category": category,
            "source_file_hash": source_file_hash,
            "storage_role": STORAGE_CHUNK,
            "legal_rank": legal_rank,
            "legal_rank_label": legal_rank_label,
            "source_type": resolved_source_type,
            "act_terms": resolved_act_terms,
        }
        if session_id:
            base_metadata["session_id"] = session_id
        raw_chunks = chunk_document(
            extracted_text,
            chunk_size=1500,
            overlap=300,
            max_chunks=120,
        )
        chunks: list[dict] = []
        for i, ch in enumerate(raw_chunks):
            chunks.append(
                {
                    "page_content": str(ch.get("text") or ""),
                    "metadata": {**base_metadata, "chunk_index": i},
                }
            )

        # 3. Embeddinga i wysyłka
        async with httpx.AsyncClient(timeout=180) as client:
            write_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
            supabase_headers = {
                "Authorization": f"Bearer {write_key}",
                "apikey": write_key,
                "Content-Type": "application/json"
            }

            if force_reindex:
                del_params = {
                    "metadata->>source_file_hash": f"eq.{source_file_hash}",
                }
                if category == "rag_user" and session_id:
                    del_params["metadata->>session_id"] = f"eq.{session_id}"
                del_res = await client.delete(
                    f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}",
                    headers=supabase_headers,
                    params=del_params,
                )
                if del_res.status_code not in (200, 204):
                    return {
                        "success": False,
                        "error": f"Nie udało się usunąć poprzednich rekordów (HTTP {del_res.status_code}): {(del_res.text or '')[:300]}",
                    }

            dup_params = {
                "select": "id",
                "limit": "1",
                "metadata->>source_file_hash": f"eq.{source_file_hash}",
            }
            if category == "rag_user" and session_id:
                dup_params["metadata->>session_id"] = f"eq.{session_id}"

            dup_src = await client.get(
                f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}",
                headers=supabase_headers,
                params=dup_params,
            )
            if dup_src.status_code == 200 and dup_src.json():
                return {
                    "success": True,
                    "filename": filename,
                    "fragments": 0,
                    "message": f"Pominięto — ten sam plik już w bazie (SHA-256 bajtów): {filename}",
                }

            batch_texts = [c["page_content"] for c in chunks]
            embed_inputs = batch_texts + [extracted_text[:8000]]
            embeddings = await get_batch_embeddings(embed_inputs)

            if not embeddings or len(embeddings) != len(embed_inputs):
                return {"success": False, "error": "Błąd generowania embeddingów."}

            records = [
                {
                    "content": c["page_content"],
                    "metadata": dict(c["metadata"]),
                    "embedding": e,
                    "source_type": resolved_source_type,
                    "act_terms": resolved_act_terms,
                }
                for c, e in zip(chunks, embeddings[:-1])
            ]
            records.append(
                {
                    "content": extracted_text,
                    "metadata": {
                        "filename": filename,
                        "category": category,
                        "source_file_hash": source_file_hash,
                        "storage_role": STORAGE_FULL_BODY,
                        "chunk_count": len(chunks),
                        "legal_rank": legal_rank,
                        "legal_rank_label": legal_rank_label,
                        "source_type": resolved_source_type,
                        "act_terms": resolved_act_terms,
                        "session_id": session_id,
                    },
                    "embedding": embeddings[-1],
                    "source_type": resolved_source_type,
                    "act_terms": resolved_act_terms,
                }
            )
            
            url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}"
            try:
                batch_size = 25
                for i in range(0, len(records), batch_size):
                    batch = records[i : i + batch_size]
                    r = await client.post(url, headers=supabase_headers, json=batch)
                    r.raise_for_status()
            except httpx.HTTPStatusError as http_err:
                body = (http_err.response.text or "")[:2000]
                if "source_type" in body or "act_terms" in body:
                    stripped: list[dict] = []
                    for rec in records:
                        base = dict(rec)
                        base.pop("source_type", None)
                        base.pop("act_terms", None)
                        stripped.append(base)
                    batch_size = 25
                    for i in range(0, len(stripped), batch_size):
                        batch = stripped[i : i + batch_size]
                        r2 = await client.post(url, headers=supabase_headers, json=batch)
                        r2.raise_for_status()
                else:
                    raise
            
            return {
                "success": True, 
                "filename": filename, 
                "fragments": len(records),
                "message": f"Zaindeksowano {filename}"
            }

    except Exception as e:
        print(f"[DOC SERVICE ERR] {e}")
        return {"success": False, "error": str(e)}
