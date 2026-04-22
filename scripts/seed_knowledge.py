import asyncio
import os
import fitz
import httpx
from pathlib import Path
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SB_KEY = os.getenv("SUPABASE_ANON_KEY")
PDF_DIR = Path("pdfs")
EDGE_FUNC_URL = "https://dhyvxspgsktpbjonejek.supabase.co/functions/v1/import-knowledge"
EMBEDDING_DIMENSIONS = 1024 # DOPASOWANE DO TWOJEJ TABELI KNOWLEDGE_BASE (ZWERYFIKOWANE SQL)

if not SB_KEY:
    raise ValueError("SUPABASE_ANON_KEY not set")

# --- Local Embedding Setup (The Reliability Shield - SOTA VERSION) ---
_local_embedding_model = None

def get_local_model():
    global _local_embedding_model
    if _local_embedding_model is None:
        from sentence_transformers import SentenceTransformer
        print(f"🚀 Inicjalizacja LOKALNEGO modelu SOTA (intfloat/multilingual-e5-large)...")
        # To jest absolutny top dla języka polskiego i dopasowuje się do Twoich 1024 wymiarów w Supabase
        _local_embedding_model = SentenceTransformer("intfloat/multilingual-e5-large")
    return _local_embedding_model

async def get_batch_embeddings(
    texts: list[str], client: httpx.AsyncClient = None
) -> list[list[float]]:
    """Fetches embeddings LOCALLY with 1024 dimensions. Matches your DB 1:1."""
    try:
        model = await asyncio.to_thread(get_local_model)
        
        # E5 model wymaga prefiksów dla lepszej precyzji: 'passage: ' dla dokumentów do bazy
        prefixed_texts = [f"passage: {text}" for text in texts]
        
        # Generowanie wektorów (na Twoim komputerze)
        embeddings = await asyncio.to_thread(model.encode, prefixed_texts, normalize_embeddings=True)
        
        result_list = embeddings.tolist()
        
        # Rozmiar 1024 pasuje już bez paddingu (Verified via SQL: atttypmod=1024)
        return result_list
    except Exception as e:
        print(f"❌ Błąd lokalnych embeddingów: {e}")
        return []


def process_file_sync(filename: str):
    """Wrapper for background tasks that need synchronous entry."""
    asyncio.run(process_file(filename))


async def process_file(filename: str):
    """Full RAG ingestion pipeline for a single file."""
    if not OPENROUTER_API_KEY:
        print("❌ ERR: Missing OPENROUTER_API_KEY")
        return

    pdf_path = PDF_DIR / filename
    if not pdf_path.exists():
        print(f"❌ File not found: {pdf_path}")
        return

    print(f"📄 Indeksowanie: {filename}...")
    try:
        # 1. Extract Text
        from document_processor import process_document
        
        file_bytes = pdf_path.read_bytes()
        # Automatyczne rozpoznanie formatu na podstawie rozszerzenia
        content_type = "application/pdf" if filename.lower().endswith(".pdf") else "image/png"
        
        text, error = await process_document(file_bytes, filename, content_type)
        
        if error or not text:
            print(f"❌ Extraction failed: {error}")
            return
            
        print(f"   [OK] Wyekstrahowano {len(text)} znaków (silnik: Mindee/OCR)")

        # 2. Split into Chunks
        splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=300)
        chunks = splitter.create_documents([text], metadatas=[{"filename": filename}])
        print(f"   - {len(chunks)} fragmentów wygenerowanych.")

        async with httpx.AsyncClient(timeout=120) as client:
            sb_headers = {"Authorization": f"Bearer {SB_KEY}"}
            # 3. Cleanup existing records for this file
            await client.post(
                EDGE_FUNC_URL,
                headers=sb_headers,
                json={"action": "delete", "filename": filename},
            )

            # 4. Batch Embedding & Insertion
            batch_size = 20
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i : i + batch_size]
                batch_texts = [c.page_content for c in batch_chunks]

                embeddings = await get_batch_embeddings(batch_texts, client)
                if not embeddings:
                    print(f"   ❌ Batch {i} failed.")
                    continue

                records = [
                    {"content": c.page_content, "metadata": c.metadata, "embedding": e}
                    for c, e in zip(batch_chunks, embeddings)
                ]

                # Insert to Supabase
                res = await client.post(
                    EDGE_FUNC_URL,
                    headers=sb_headers,
                    json={"action": "insert", "records": records},
                )
                res.raise_for_status()

            print(f"✅ Indeksowanie zakończone: {filename}")

    except Exception as e:
        print(f"❌ Pipeline Failure for {filename}: {e}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        process_file_sync(sys.argv[1])
    else:
        print("Usage: python seed_knowledge.py <filename>")
