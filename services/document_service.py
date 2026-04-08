import asyncio
import os
import httpx
from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from document_processor import process_document
from moa.config import SUPABASE_IMPORT_URL, SUPABASE_ANON_KEY

async def index_document_to_supabase(file_content: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    """
    Wspólna funkcja do indeksowania dokumentu w RAG (Supabase).
    Wydzielona z api.py (duplikacja index_document_to_rag i index_saved_file).
    """
    try:
        # 1. Ekstrakcja tekstu (Mindee priority)
        extracted_text, error = await asyncio.to_thread(
            process_document, file_content, filename, content_type
        )

        if error or not extracted_text:
            return {"success": False, "error": error or "Brak tekstu do indeksowania."}

        # 2. Chunking
        splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=300)
        chunks = splitter.create_documents([extracted_text], metadatas=[{"filename": filename}])
        print(f"   [INDEX SERVICE] {filename}: {len(chunks)} fragmentów")

        # 3. Embeddinga i wysyłka do Supabase
        async with httpx.AsyncClient(timeout=120) as client:
            sb_headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
            
            # Najpierw usuń starą wersję dokumentu (jeśli była o tej samej nazwie)
            await client.post(
                SUPABASE_IMPORT_URL,
                headers=sb_headers,
                json={"action": "delete", "filename": filename},
            )

            # Pobieranie i przesyłanie batchami
            from seed_knowledge import get_batch_embeddings
            batch_size = 20
            
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i : i + batch_size]
                batch_texts = [c.page_content for c in batch_chunks]

                embeddings = await get_batch_embeddings(batch_texts, client)
                if not embeddings:
                    continue

                records = [
                    {"content": c.page_content, "metadata": c.metadata, "embedding": e}
                    for c, e in zip(batch_chunks, embeddings)
                ]

                # Prześlij do Edge Function Supabase
                res = await client.post(
                    SUPABASE_IMPORT_URL,
                    headers=sb_headers,
                    json={"action": "insert", "records": records},
                )
                res.raise_for_status()

        return {
            "success": True, 
            "filename": filename, 
            "fragments": len(chunks),
            "message": f"Dokument '{filename}' został pomyślnie zaindeksowany w RAG."
        }

    except Exception as e:
        print(f"❌ Indexing Service Error: {e}")
        return {"success": False, "error": str(e)}
