import os
import asyncio
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.request_models import DocumentUploadResponse, DocumentAnalysisRequest
from services.document_service import index_document_to_supabase
# Lazy imports
# from document_processor import process_document (Moved to functions)
from utils.helpers import sanitize_filename

router = APIRouter()

MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB - zgodne z limitem frontendu

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks

@router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        filename = sanitize_filename(file.filename or "unknown")
        print(f"\n   [UPLOAD] Otrzymano plik: {filename} ({file.content_type})")
        file_content = await file.read()
        print(f"   [UPLOAD] Rozmiar: {len(file_content)} bajtów. Rozpoczynanie ekstrakcji...")
        if len(file_content) > MAX_FILE_SIZE:
             print(f"   [UPLOAD ERROR] Plik zbyt duży ({len(file_content)} > {MAX_FILE_SIZE})")
             raise HTTPException(status_code=413, detail="Plik zbyt duży (maksymalnie 10MB)")
        
        os.makedirs("pdfs", exist_ok=True)
        with open(f"pdfs/{filename}", "wb") as f:
            f.write(file_content)
        
        print(f"   [UPLOAD] Plik zapisany lokalnie: {filename}. Wywoływanie procesora tekstu...")
        from document_processor import process_document
        extracted_text, error = await process_document(
            file_content, filename, file.content_type or ""
        )

        success = not bool(error)
        
        # Automatycznie zapisz załącznik w bazie, by zachować wyniki OCR i umożliwić dostęp z Biblioteki
        if success and extracted_text:
            from services.document_service import index_document_to_supabase
            
            async def background_indexing():
                try:
                    await index_document_to_supabase(
                        file_content=file_content,
                        filename=filename,
                        content_type=file.content_type or "",
                        category="rag_user",
                        pre_extracted_text=extracted_text
                    )
                    print(f"   [BACKGROUND] Zapisano dokument {filename} w bazie (knowledge_base_user).")
                except Exception as e:
                    print(f"   [BACKGROUND ERROR] Błąd podczas indeksowania {filename}: {e}")

            background_tasks.add_task(background_indexing)

        return DocumentUploadResponse(
            success=success, filename=filename, 
            extracted_text=extracted_text if success else "", 
            text_length=len(extracted_text) if success else 0,
            error=error
        )
    except Exception as e:
        return DocumentUploadResponse(success=False, filename="unknown", extracted_text="", text_length=0, error=str(e))

@router.post("/upload")
@router.post("/index-document")
async def index_document_to_rag(
    file: UploadFile = File(...), 
    category: str = Form("rag_legal")
):
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Plik zbyt duży (maksymalnie 10MB)")
    
    os.makedirs("pdfs", exist_ok=True)
    filename = sanitize_filename(file.filename or "unknown")
    with open(f"pdfs/{filename}", "wb") as f:
        f.write(file_content)

    return await index_document_to_supabase(
        file_content, filename, file.content_type or "", category=category
    )

@router.post("/index-saved-file/{filename}")
async def index_saved_file(filename: str):
    filename = sanitize_filename(filename)
    file_path = f"pdfs/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Plik nie istnieje na serwerze")
        
    with open(file_path, "rb") as f:
        file_content = f.read()

    return await index_document_to_supabase(file_content, filename, "")

@router.post("/save-draft")
async def save_draft(request: DocumentAnalysisRequest):
    """
    Zapisuje wygenerowane pismo do bazy użytkownika (RAG Ready).
    Wykorzystujemy DocumentAnalysisRequest bo ma pola 'name' (jako title) i 'content'.
    """
    if not request.document_text:
        raise HTTPException(status_code=400, detail="Brak treści pisma")
    
    filename = sanitize_filename(request.question or f"Pismo_{int(time.time())}.md")
    if not filename.endswith('.md'):
        filename += '.md'
        
    return await index_document_to_supabase(
        file_content=request.document_text.encode('utf-8'),
        filename=filename,
        content_type='text/markdown',
        category='rag_user'
    )

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
            with open(found_path, "rb") as f:
                file_content = f.read()
            
            print(f"   [CONTENT] Znaleziono plik: {found_path}")
            
            # Próba ekstrakcji tekstu
            from document_processor import process_document
            extracted_text, error = await process_document(
                file_content, safe_filename, ""
            )
            
            if not error and extracted_text:
                return {
                    "success": True,
                    "filename": os.path.basename(found_path),
                    "content": extracted_text,
                    "size": len(file_content),
                    "path": found_path
                }
            elif error:
                 return {
                    "success": False,
                    "error": f"Błąd ekstrakcji: {error}",
                    "filename": filename
                }
        
        # --- FALLBACK: Search in Supabase ---
        print(f"   [CONTENT] Nie znaleziono lokalnie. Szukanie w Supabase dla: {safe_filename}")
        try:
            from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY
            import httpx
            
            async with httpx.AsyncClient(timeout=30) as client:
                headers = {
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "apikey": SUPABASE_ANON_KEY
                }
                
                # Check both tables
                content_found = ""
                for table in ["knowledge_base_legal", "knowledge_base_user"]:
                    # Get all chunks for this filename, ordered by id or created_at
                    # (Note: we use url encoding for the query)
                    url = f"{SUPABASE_URL}/rest/v1/{table}?metadata->>filename=eq.{safe_filename}&select=content"
                    res = await client.get(url, headers=headers)
                    
                    if res.status_code == 200:
                        data = res.json()
                        if data:
                            # Concatenate all fragments
                            content_found = " ".join([item.get('content', '') for item in data])
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

from fastapi import BackgroundTasks

@router.post("/index-knowledge-base")
async def trigger_full_indexing(background_tasks: BackgroundTasks):
    """
    Uruchamia pełne indeksowanie plików PDF z katalogu local_storage/knowledge_base w tle.
    """
    from moa.config import PROJECT_DIR
    folder = os.path.join(PROJECT_DIR, 'local_storage', 'knowledge_base')
    
    if not os.path.isdir(folder):
        return {"success": False, "error": f"Katalog nie istnieje: {folder}"}
        
    pdf_files = [f for f in os.listdir(folder) if f.lower().endswith('.pdf')]
    if not pdf_files:
        return {"success": False, "error": "Brak plików PDF do zindeksowania."}
        
    async def run_indexing():
        print(f"[START] [BG] Rozpoczynanie indeksowania {len(pdf_files)} plików...")
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
                else:
                    print(f"[ERROR] [BG] Błąd {filename}: {result.get('error')}")
                    
            except Exception as e:
                print(f"[FATAL] [BG] Krytyczny błąd pliku {filename}: {e}")
        
        print("[FINISHED] [BG] Indeksowanie zakończone.")

    background_tasks.add_task(run_indexing)
    
    return {
        "success": True, 
        "message": f"Uruchomiono indeksowanie {len(pdf_files)} plików w tle. Sprawdź logi serwera API, aby śledzić postęp.",
        "files_count": len(pdf_files),
        "folder": folder
    }
