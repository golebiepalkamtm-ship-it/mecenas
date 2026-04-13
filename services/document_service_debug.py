import asyncio
import os
import httpx
import time
from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from document_processor import process_document
from moa.config import (
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
    EMBEDDING_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_EMBEDDINGS_URL
)

async def get_batch_embeddings(texts: list[str], client: httpx.AsyncClient) -> list[list[float]]:
    """Pobiera embeddingi z OpenRouter Cloud (OpenAI Model)."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": EMBEDDING_MODEL,
        "input": texts
    }

    for attempt in range(3):
        try:
            res = await client.post(
                OPENROUTER_EMBEDDINGS_URL,
                headers=headers,
                json=payload,
                timeout=60
            )
            if res.status_code == 200:
                data = res.json()
                if "data" in data:
                    return [item["embedding"] for item in data["data"]]
            
            print(f"      [OpenRouter ERROR] Status {res.status_code}: {res.text}")
            await asyncio.sleep(1)
        except Exception as e:
            print(f"      [OpenRouter attempt {attempt+1} error]: {e}")
            await asyncio.sleep(1)
    return []

async def index_document_to_supabase(file_content: bytes, filename: str, content_type: str, category: str = "rag_legal") -> Dict[str, Any]:
    """WERSJA CLOUD (OpenRouter) INDEKSOWANIA."""
    table_name = "knowledge_base_legal" if category == "rag_legal" else "knowledge_base_user"
    
    try:
        # 1. Ekstrakcja
        extracted_text, error = await asyncio.to_thread(
            process_document, file_content, filename, content_type
        )
        if error or not extracted_text:
            return {"success": False, "error": error or "Pusty dokument."}

        # 2. Chunking
        splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=200)
        chunks = splitter.create_documents([extracted_text], metadatas=[{"filename": filename, "category": category}])
        print(f"   [Cloud-Index] {filename}: {len(chunks)} fragmentów.")

        # 3. Przetwarzanie
        async with httpx.AsyncClient(timeout=120) as client:
            headers = {
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            
            # W chmurze możemy wysyłać duże batche i robić to równolegle!
            batch_size = 100 
            semaphore = asyncio.Semaphore(5) 

            async def process_single_batch(i, batch):
                async with semaphore:
                    try:
                        batch_texts = [c.page_content for c in batch]
                        embeddings = await get_batch_embeddings(batch_texts, client)
                        
                        if not embeddings: return 0
                        
                        records = [
                            {"content": c.page_content, "metadata": c.metadata, "embedding": e}
                            for c, e in zip(batch, embeddings)
                        ]
                        
                        r = await client.post(f"{SUPABASE_URL}/rest/v1/{table_name}", headers=headers, json=records)
                        r.raise_for_status()
                        print(f"      ✅ Batch {i+1}/{ (len(chunks)//batch_size)+1 } zapisany (Cloud).")
                        return len(records)
                    except Exception as e:
                        print(f"      [!] Błąd Batch {i+1}: {e}")
                        return 0

            tasks = []
            for i, start_idx in enumerate(range(0, len(chunks), batch_size)):
                tasks.append(process_single_batch(i, chunks[start_idx : start_idx + batch_size]))
            
            results = await asyncio.gather(*tasks)
            total_indexed = sum(results)

            return {
                "success": True, 
                "filename": filename, 
                "fragments": total_indexed,
                "total_chunks": len(chunks)
            }

    except Exception as e:
        print(f"CLOUD ERROR: {e}")
        return {"success": False, "error": str(e)}