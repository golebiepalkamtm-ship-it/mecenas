import asyncio
import os
import httpx
from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from document_processor import process_document
from moa.config import (
    SUPABASE_IMPORT_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_EMBEDDINGS_URL,
    OPENROUTER_HEADERS
)

async def get_batch_embeddings(texts: list[str], client: httpx.AsyncClient) -> list[list[float]]:
    """Fetches embeddings for a batch of texts using OpenRouter (Cloud)."""
    payload = {
        "model": EMBEDDING_MODEL,
        "input": texts,
    }

    for attempt in range(5):
        try:
            print(f"      [Cloud-Embed] Batch {len(texts)} fragmentów...")
            res = await client.post(
                OPENROUTER_EMBEDDINGS_URL,
                json=payload,
                headers=OPENROUTER_HEADERS,
                timeout=60, 
            )
            
            if res.status_code == 429:
                wait = 2 ** attempt
                print(f"      [!] Rate limited. Waiting {wait}s...")
                await asyncio.sleep(wait)
                continue
                
            if res.status_code != 200:
                print(f"      [!] HTTP {res.status_code}: {res.text[:100]}")
                await asyncio.sleep(1)
                continue

            data = res.json()
            if "data" in data:
                # OpenRouter/OpenAI format: [{"embedding": [...]}, ...]
                return [item["embedding"] for item in data["data"]]
            elif "embeddings" in data:
                return data["embeddings"]

            await asyncio.sleep(1)
        except Exception as e:
            print(f"      [!] Błąd połączenia z biurem embeddingów: {e}")
            await asyncio.sleep(1)
    return []

async def index_document_to_supabase(
    file_content: bytes, 
    filename: str, 
    content_type: str, 
    category: str = "rag_legal",
    pre_extracted_text: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    WERSJA TURBO CLOUD: Indeksowanie dokumentu przy użyciu OpenRouter i Supabase.
    """
    table_name = "knowledge_base_legal" if category == "rag_legal" else "knowledge_base_user"
    
    try:
        # 1. Ekstrakcja tekstu (używamy gotowca jeśli jest)
        if pre_extracted_text:
            extracted_text = pre_extracted_text
            error = None
            print(f"   [Cloud-Engine] {filename} -> Używam przekazanego tekstu (skip OCR)")
        else:
            extracted_text, error = await asyncio.to_thread(
                process_document, file_content, filename, content_type
            )

        if error or not extracted_text:
            return {"success": False, "error": error or "Brak tekstu."}

        # 2. Chunking
        splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=300)
        metadata = {"filename": filename, "category": category}
        chunks = splitter.create_documents([extracted_text], metadatas=[metadata])
        
        print(f"   [Cloud-Engine] {filename} -> {len(chunks)} fragmentów (Cloud/1536d)")

        # 3. Embeddinga i wysyłka do Supabase
        async with httpx.AsyncClient(timeout=180) as client:
            supabase_headers = {
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
            
            # Czyścimy stare wpisy pod tym samym filename
            await client.delete(f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}?metadata->>filename=eq.{filename}", headers=supabase_headers)

            # 4. PRZETWARZANIE BATCHOWE
            batch_size = 50 # OpenRouter udźwignie bez problemu
            semaphore = asyncio.Semaphore(3) # Zwiększono współbieżność dla chmury

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
                        
                        print(f"      [CLOUD] Batch {i+1} | Wysyłanie {len(records)} do Supabase...")
                        r = await client.post(f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}", headers=supabase_headers, json=records)
                        r.raise_for_status()
                        return len(records)
                    except Exception as e:
                        print(f"      [!] Błąd Batch {i+1}: {e}")
                        return 0

            tasks = []
            for i, start_idx in enumerate(range(0, len(chunks), batch_size)):
                tasks.append(process_single_batch(i, chunks[start_idx : start_idx + batch_size]))
            
            results = await asyncio.gather(*tasks)
            total = sum(results)

            # 5. DODANIE WPISU DO TABELI 'documents' (Biblioteka Dokumentów)
            # Dzięki temu plik pojawi się w UI w zakładce Dokumenty
            try:
                doc_record = {
                    "title": filename,
                    "content": extracted_text,
                    "type": content_type or (filename.split('.')[-1] if '.' in filename else "Unknown"),
                    "user_id": user_id
                }
                print(f"      [STORAGE] Dodawanie do Archiwum Dokumentów: {filename}")
                await client.post(f"{SUPABASE_URL.rstrip('/')}/rest/v1/documents", headers=supabase_headers, json=doc_record)
            except Exception as e:
                print(f"      [!] Błąd zapisu w bibliotece dokumentów: {e}")

            return {
                "success": True, 
                "filename": filename, 
                "fragments": total,
                "table": table_name,
                "extracted_text": extracted_text,
                "message": f"Indeksowanie zakończone! {filename} (%d fragm.)" % total
            }

    except Exception as e:
        print(f"Krytyczny błąd Cloud-Engine: {e}")
        return {"success": False, "error": str(e)}
