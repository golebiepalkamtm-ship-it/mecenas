import os
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.request_models import DocumentUploadResponse, DocumentAnalysisRequest
from services.document_service import index_document_to_supabase
from document_processor import process_document
from utils.helpers import sanitize_filename

router = APIRouter()

MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB - zgodne z limitem frontendu

@router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
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

        extracted_text, error = await asyncio.to_thread(
            process_document, file_content, filename, file.content_type or ""
        )

        success = not bool(error)
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
async def index_document_to_rag(file: UploadFile = File(...)):
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Plik zbyt duży (maksymalnie 10MB)")
    
    os.makedirs("pdfs", exist_ok=True)
    filename = sanitize_filename(file.filename or "unknown")
    with open(f"pdfs/{filename}", "wb") as f:
        f.write(file_content)

    return await index_document_to_supabase(file_content, filename, file.content_type or "")

@router.post("/index-saved-file/{filename}")
async def index_saved_file(filename: str):
    filename = sanitize_filename(filename)
    file_path = f"pdfs/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Plik nie istnieje na serwerze")
        
    with open(file_path, "rb") as f:
        file_content = f.read()

    return await index_document_to_supabase(file_content, filename, "")

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
    Pobiera zawarto dokumentu z lokalnego storage
    """
    try:
        safe_filename = sanitize_filename(filename)
        
        # Sprawd w kilku lokalizacjach
        locations = [
            f"local_storage/chat_attachments/{safe_filename}",
            f"local_storage/knowledge_base_legal/{safe_filename}",
            f"pdfs/{safe_filename}"
        ]
        
        for file_path in locations:
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    file_content = f.read()
                
                # Próba ekstrakcji tekstu
                from document_processor import process_document
                extracted_text, error = await asyncio.to_thread(
                    process_document, file_content, safe_filename, ""
                )
                
                if not error and extracted_text:
                    return {
                        "success": True,
                        "filename": safe_filename,
                        "content": extracted_text,
                        "size": len(file_content),
                        "path": file_path
                    }
        
        return {
            "success": False,
            "error": f"Dokument '{filename}' nie zosta znaleziony",
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
