import os
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.request_models import DocumentUploadResponse, DocumentAnalysisRequest
from services.document_service import index_document_to_supabase
from document_processor import process_document
from utils.helpers import sanitize_filename

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB

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
