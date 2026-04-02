import asyncio
import os
import fitz
import httpx
from pathlib import Path
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = "openai/text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
PDF_DIR = Path("pdfs")
EDGE_FUNC_URL = "https://dhyvxspgsktpbjonejek.supabase.co/functions/v1/import-knowledge"

SB_KEY = "sb_publishable_8HlO3_J1CxhWN27Vmoq2FA_HzZE0Jac"


async def get_batch_embeddings(
    texts: list[str], client: httpx.AsyncClient
) -> list[list[float]]:
    """Fetches embeddings for a batch of texts from OpenRouter."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "LexMind AI",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "input": texts,
        "dimensions": EMBEDDING_DIMENSIONS,
    }

    for attempt in range(5):
        try:
            res = await client.post(
                "https://openrouter.ai/api/v1/embeddings",
                json=payload,
                headers=headers,
                timeout=60,
            )
            data = res.json()
            if "data" in data:
                return [
                    item["embedding"]
                    for item in sorted(data["data"], key=lambda x: x["index"])
                ]

            error_code = data.get("error", {}).get("code")
            if error_code in [429, 503]:
                await asyncio.sleep((attempt + 1) * 2)
                continue

            print(f"❌ Embedding Error: {data}")
            break
        except Exception as e:
            print(f"⚠️ Request failed: {e}. Retry {attempt + 1}")
            await asyncio.sleep(2)
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
        doc = fitz.open(str(pdf_path))
        text = "".join([page.get_text() for page in doc])
        doc.close()

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
