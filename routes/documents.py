import os
import asyncio
import time
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from models.request_models import (
    DocumentUploadResponse,
    DocumentAnalysisRequest,
    DraftRequest,
)
from services.document_service import index_document_to_supabase
from services.document_text_extractor import extract_text_from_bytes, save_local_document
from application.documents.use_case import (
    analyze_document_use_case,
    draft_document_use_case,
    index_saved_file_use_case,
    save_draft_use_case,
    upload_document_use_case,
)
from utils.helpers import sanitize_filename
from schemas.chat_contract import LegalSourceType
from schemas.response_models import JobStatusResponse, JobCreationResponse
import uuid

from fastapi import BackgroundTasks

router = APIRouter()

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB — zgodne z limitem frontendu

# In-memory job tracking
_INDEXING_JOBS = {}


@router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    category: str = Form("rag_user"),
    source_type: Optional[LegalSourceType] = Form(None),
    session_id: Optional[str] = Form(None),
):
    result = await upload_document_use_case.execute(
        background_tasks=background_tasks,
        file=file,
        category=category,
        source_type=source_type,
        session_id=session_id,
    )
    return DocumentUploadResponse(**result)

@router.post("/upload")
@router.post("/index-document")
async def index_document_to_rag(
    file: UploadFile = File(...), 
    category: str = Form("rag_legal"),
    source_type: Optional[LegalSourceType] = Form(None),
):
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Plik zbyt duży (maksymalnie 10MB)")
    
    filename = sanitize_filename(file.filename or "unknown")
    save_local_document(file_content, filename)

    return await index_document_to_supabase(
        file_content,
        filename,
        file.content_type or "",
        category=category,
        source_type=(source_type.value if source_type else None),
    )

@router.post("/index-saved-file/{filename}")
async def index_saved_file(filename: str):
    return await index_saved_file_use_case.execute(filename)

@router.post("/export-docx")
async def export_docx(request: DocumentAnalysisRequest):
    """Eksport wygenerowanego pisma (Markdown) do pliku Word (.docx).

    Bramka Export Gate waliduje cytowania art./§ w piśmie przed eksportem.
    Tryb konfigurowalny: settings.export_gate_mode ('off' / 'warn' / 'strict').
    """
    if not request.document_text:
        raise HTTPException(status_code=400, detail="Brak treści pisma")

    from config import settings
    from services.docx_export import markdown_to_docx_bytes
    from services.docx_template_export import render_draft_docx_bytes
    from services.export_validation import validate_export

    # --- Export Gate: walidacja cytowań ---
    gate_mode = getattr(settings, "export_gate_mode", "warn")
    gate_result = validate_export(
        request.document_text,
        mode=gate_mode,
    )

    if gate_result.action == "block":
        unverified_str = ", ".join(gate_result.unverified_citations[:20])
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    f"Eksport zablokowany — {gate_result.unverified_count} "
                    f"niezweryfikowanych powołań prawnych: {unverified_str}. "
                    f"Sprawdź cytaty w ISAP/ELI przed eksportem."
                ),
                "export_validation": gate_result.to_dict(),
            },
        )

    # Audit trail: loguj decyzję bramki eksportowej
    try:
        from services.audit_trail import append_audit_event

        session_id = getattr(request, "session_id", None) or ""
        if session_id:
            append_audit_event(
                session_id,
                "EXPORT_GATE",
                {
                    "action": gate_result.action,
                    "total_citations": gate_result.total_citations,
                    "verified": gate_result.verified_count,
                    "unverified": gate_result.unverified_count,
                    "unverified_citations": gate_result.unverified_citations[:20],
                },
            )
    except Exception:
        pass  # audit trail jest opcjonalny, nie blokuje eksportu

    # Jeśli warn: dodaj nagłówek ostrzegawczy do pisma
    document_text = request.document_text
    if gate_result.action == "warn" and gate_result.unverified_citations:
        unverified_str = ", ".join(gate_result.unverified_citations[:10])
        warn_header = (
            f"> ⚠️ **Uwaga — zweryfikuj przed użyciem**: "
            f"Następujące powołania nie zostały potwierdzone w bazach ISAP/ELI/SAOS: "
            f"{unverified_str}\n\n---\n\n"
        )
        document_text = warn_header + document_text

    base_name = sanitize_filename(request.question or "pismo")
    if base_name.lower().endswith(".md"):
        base_name = base_name[:-3]
    if base_name.lower().endswith(".docx"):
        base_name = base_name[:-5]
    filename = f"{base_name}.docx"

    try:
        docx_bytes = render_draft_docx_bytes(
            title=request.question,
            body_markdown=document_text,
            structured_data=request.structured_data,
        )
    except Exception as template_err:
        print(f"   [DOCX TEMPLATE] fallback to markdown exporter: {template_err}")
        docx_bytes = markdown_to_docx_bytes(document_text)

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/draft-document")
async def draft_document(request: DraftRequest):
    """Generator pism delegowany do warstwy application."""
    return await draft_document_use_case.execute(request)


@router.post("/save-draft")
async def save_draft(request: DocumentAnalysisRequest):
    """Zapisuje draft przez use-case warstwy application."""
    return await save_draft_use_case.execute(request)

@router.get("/list")
async def list_documents():
    """
    Pobiera list wszystkich dokumentów z Supabase z metadanych
    """
    try:
        import httpx
        from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY
        
        async with httpx.AsyncClient(timeout=30) as client:
            headers = {
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "apikey": SUPABASE_ANON_KEY
            }
            
            # Pobierz z obu tabel (knowledge_base_legal i knowledge_base_user)
            res_legal = await client.get(
                f"{SUPABASE_URL}/rest/v1/knowledge_base_legal?select=metadata",
                headers=headers
            )
            res_user = await client.get(
                f"{SUPABASE_URL}/rest/v1/knowledge_base_user?select=metadata",
                headers=headers
            )
                
            documents = set()
            for response in [res_legal, res_user]:
                if response.status_code == 200:
                    data = response.json()
                    for item in data:
                        if isinstance(item, dict) and 'metadata' in item:
                            metadata = item['metadata']
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

@router.get("/content/{filename}")
async def get_document_content(filename: str):
    """
    Pobiera zawartość dokumentu z lokalnego storage (obsługuje prefixy timestamp).
    """
    try:
        import glob
        safe_filename = sanitize_filename(filename)
        
        # Potencjalne lokalizacje i wzorce (w tym z prefixem timestamp)
        search_patterns = [
            f"local_storage/chat_attachments/*_{safe_filename}",
            f"local_storage/chat_attachments/{safe_filename}",
            f"local_storage/knowledge_base/*_{safe_filename}",
            f"local_storage/knowledge_base/{safe_filename}",
            f"local_storage/knowledge_base_legal/*_{safe_filename}",
            f"local_storage/knowledge_base_legal/{safe_filename}",
            f"pdfs/*_{safe_filename}",
            f"pdfs/{safe_filename}"
        ]
        
        found_path = None
        for pattern in search_patterns:
            matches = glob.glob(pattern)
            if matches:
                # Weź najnowszy (ostatni alfabetycznie przy timestampach)
                found_path = sorted(matches)[-1]
                break
        
        if found_path and os.path.exists(found_path):
            # Safe absolute path containment check to prevent Path Traversal
            abs_found = os.path.abspath(found_path)
            allowed_dirs = [
                os.path.abspath("local_storage"),
                os.path.abspath("pdfs")
            ]
            is_contained = False
            for d in allowed_dirs:
                if abs_found.startswith(d + os.sep) or abs_found == d:
                    is_contained = True
                    break
            if not is_contained:
                raise HTTPException(status_code=403, detail="Dostęp zabroniony (Wykryto Path Traversal)")

            with open(found_path, "rb") as f:
                file_content = f.read()
                print(f"   [CONTENT] Znaleziono plik: {found_path}")

                extracted_text = ""
                error = None
                path_lower = found_path.lower()
                is_raster_image = path_lower.endswith(
                    (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".tiff", ".tif")
                )

                try:
                    if is_raster_image:
                        print(
                            "   [CONTENT] Obraz rastrowy — pomijam dekodowanie UTF-8; szukam tekstu OCR w Supabase (user → legal)."
                        )
                        error = None
                    elif path_lower.endswith(".pdf"):
                        extraction = await extract_text_from_bytes(
                            file_content=file_content,
                            filename=os.path.basename(found_path),
                            content_type="application/pdf",
                            binary_placeholder=False,
                        )
                        extracted_text = extraction.text
                        error = extraction.error
                    elif found_path.lower().endswith(".docx"):
                        extraction = await extract_text_from_bytes(
                            file_content=file_content,
                            filename=os.path.basename(found_path),
                            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            binary_placeholder=False,
                        )
                        extracted_text = extraction.text
                        error = extraction.error
                    else:
                        extraction = await extract_text_from_bytes(
                            file_content=file_content,
                            filename=os.path.basename(found_path),
                            content_type="text/plain",
                            binary_placeholder=False,
                        )
                        extracted_text = extraction.text
                        error = extraction.error
                except Exception as e:
                    extracted_text = ""
                    error = f"Błąd odczytu lokalnego pliku: {str(e)}"
                    print(f"   [CONTENT] {error}. Przejście do Supabase fallback...")
                
                pre_embedding = None
            
            if not error and extracted_text:
                return {
                    "success": True,
                    "filename": os.path.basename(found_path),
                    "content": extracted_text,
                    "size": len(file_content),
                    "path": found_path
                }
            # Remove the early return so it falls back to Supabase if local extraction fails
        
        # --- Supabase: tekst zindeksowany (OCR / PDF) — preferuj dokumenty użytkownika ---
        print(f"   [CONTENT] Szukanie treści w Supabase (filename={safe_filename})…")
        try:
            from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY
            import httpx
            from urllib.parse import quote

            fn_eq = quote(safe_filename, safe="")
            
            async with httpx.AsyncClient(timeout=30) as client:
                headers = {
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "apikey": SUPABASE_ANON_KEY
                }
                
                content_found = ""
                for table in ["knowledge_base_user", "knowledge_base_legal"]:
                    url = (
                        f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"
                        f"?metadata->>filename=eq.{fn_eq}&select=content"
                    )
                    res = await client.get(url, headers=headers)
                    
                    if res.status_code == 200:
                        data = res.json()
                        if data:
                            # Concatenate all fragments
                            content_found = " ".join(
                                str(item.get("content") or "") for item in data
                            )
                            break
                
                if content_found:
                    return {
                        "success": True,
                        "filename": safe_filename,
                        "content": content_found,
                        "size": len(content_found),
                        "path": "supabase_record"
                    }
        except Exception as se:
            print(f"   [CONTENT ERROR] Supabase fallback failed: {se}")

        return {
            "success": False,
            "error": f"Dokument '{filename}' nie został znaleziony ani na dysku, ani w bazie danych",
            "filename": filename
        }

        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "filename": filename
        }

_INDEXING_JOBS = {}

@router.post("/index-knowledge-base", response_model=JobCreationResponse)
async def trigger_full_indexing(background_tasks: BackgroundTasks):
    """
    Uruchamia pełne indeksowanie plików PDF z katalogu local_storage/knowledge_base w tle.
    """
    from moa.config import PROJECT_DIR
    folder = os.path.join(PROJECT_DIR, 'local_storage', 'knowledge_base')
    
    if not os.path.isdir(folder):
        raise HTTPException(status_code=400, detail=f"Katalog nie istnieje: {folder}")
        
    pdf_files = [f for f in os.listdir(folder) if f.lower().endswith('.pdf')]
    if not pdf_files:
        raise HTTPException(status_code=400, detail="Brak plików PDF do zindeksowania.")
        
    job_id = str(uuid.uuid4())
    _INDEXING_JOBS[job_id] = {
        "job_id": job_id,
        "status": "in_progress",
        "created_at": time.time(),
        "total_files": len(pdf_files),
        "processed_files": 0,
        "errors": 0,
        "message": "Indeksowanie rozpoczęte",
        "completed_at": None
    }
        
    async def run_indexing(jid: str):
        print(f"[START] [BG] Rozpoczynanie indeksowania {len(pdf_files)} plików (Job: {jid})...")
        for filename in sorted(pdf_files):
            try:
                path = os.path.join(folder, filename)
                if not os.path.exists(path): continue
                
                with open(path, 'rb') as f:
                    content = f.read()
                
                print(f"[INDEX] [BG] Indeksowanie: {filename}")
                result = await index_document_to_supabase(
                    file_content=content,
                    filename=filename,
                    content_type='application/pdf',
                    category='rag_legal'
                )
                
                if result.get('success'):
                    print(f"[OK] [BG] OK: {filename} ({result.get('fragments')} fragm.)")
                    _INDEXING_JOBS[jid]["processed_files"] += 1
                else:
                    print(f"[ERROR] [BG] Błąd {filename}: {result.get('error')}")
                    _INDEXING_JOBS[jid]["errors"] += 1
                    
            except Exception as e:
                print(f"[FATAL] [BG] Krytyczny błąd pliku {filename}: {e}")
                _INDEXING_JOBS[jid]["errors"] += 1
        
        print(f"[FINISHED] [BG] Indeksowanie zakończone (Job: {jid}).")
        _INDEXING_JOBS[jid]["status"] = "completed"
        _INDEXING_JOBS[jid]["completed_at"] = time.time()
        _INDEXING_JOBS[jid]["message"] = "Indeksowanie zakończone"

    background_tasks.add_task(run_indexing, job_id)
    
    return {
        "success": True, 
        "message": f"Uruchomiono indeksowanie {len(pdf_files)} plików w tle.",
        "job_id": job_id,
        "files_count": len(pdf_files),
        "folder": folder
    }

@router.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Sprawdza status zadania indeksowania w tle."""
    if job_id not in _INDEXING_JOBS:
        raise HTTPException(status_code=404, detail="Nie znaleziono zadania o podanym ID")
    return _INDEXING_JOBS[job_id]


@router.post("/analyze-document")
async def analyze_document_endpoint(request: DocumentAnalysisRequest):
    """Analizuje dokument przez use-case warstwy application."""
    return await analyze_document_use_case.execute(request)
