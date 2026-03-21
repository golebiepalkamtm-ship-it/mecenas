import fitz
import os
import json
import requests
import time
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = "openai/text-embedding-3-large"
PDF_DIR = Path("pdfs")
SQL_OUTPUT = Path("seed_data.sql")
PROCESS_ONLY = [] # Empty list = process ALL PDFs
BATCH_SIZE = 25
# ---------------------

def get_batch_embeddings(texts, retries=5):
    """Fetches embeddings for a batch of texts from OpenRouter."""
    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-OpenRouter-Title": "LexMind AI",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "input": texts
    }

    for i in range(retries):
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=60)
            data = res.json()
            
            if "error" in data:
                error_msg = data.get("error", {})
                if isinstance(error_msg, dict) and error_msg.get("code") in [429, 503, 502]:
                    wait_time = (i + 1) * 3
                    print(f"      API Busy... retrying {len(texts)} chunks in {wait_time}s")
                    time.sleep(wait_time)
                    continue
                print(f"Error getting batch embeddings: {data}")
                return None

            if "data" in data:
                # Return embeddings list in original order
                return [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
            
            print(f"Unknown Response format: {data}")
            return None
            
        except Exception as e:
            print(f"      Request failed for batch: {e}")
            time.sleep(2)
            
    return None

def main():
    if not OPENROUTER_API_KEY:
        print("Błąd: Brak OPENROUTER_API_KEY w pliku .env")
        return

    pdf_files = list(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        print("No PDFs found in pdfs/")
        return

    splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=300)
    EDGE_FUNC_URL = "https://dhyvxspgsktpbjonejek.supabase.co/functions/v1/import-knowledge"

    print(f"🚀 SEEDING BEZPOŚREDNIO DO SUPABASE ({OPENROUTER_MODEL}) | Batch: {BATCH_SIZE}")

    for pdf_path in pdf_files:
        if PROCESS_ONLY and pdf_path.name not in PROCESS_ONLY:
            continue
            
        print(f"📄 Processing {pdf_path.name}...")
        try:
            doc = fitz.open(str(pdf_path))
            text = "".join([page.get_text() for page in doc])
            doc.close()
            
            chunks = splitter.create_documents([text], metadatas=[{"filename": pdf_path.name}])
            print(f"   Extracted {len(chunks)} chunks.")

            # Per-file Cleanup directly via Edge Function
            try:
                res = requests.post(EDGE_FUNC_URL, json={"action": "delete", "filename": pdf_path.name}, timeout=30)
                res.raise_for_status()
            except Exception as e:
                print(f"   ❌ FAILED to delete old records for {pdf_path.name}: {e}")
                continue

            # Batch Processing
            for i in range(0, len(chunks), BATCH_SIZE):
                batch_chunks = chunks[i : i + BATCH_SIZE]
                print(f"    ⭐ Embedding & Uploading batch {i//BATCH_SIZE + 1}/{(len(chunks)-1)//BATCH_SIZE + 1} ({len(batch_chunks)} chunks)...")
                
                batch_texts = [c.page_content for c in batch_chunks]
                embeddings = get_batch_embeddings(batch_texts)
                
                if not embeddings:
                    print(f"      ❌ FAILED BATCH {i}. Skipping.")
                    continue
                
                # Write results to Supabase via Edge function
                records = []
                for chunk, embedding in zip(batch_chunks, embeddings):
                    records.append({
                        "content": chunk.page_content,
                        "metadata": chunk.metadata,
                        "embedding": embedding
                    })
                
                for retry in range(3):
                    try:
                        res = requests.post(EDGE_FUNC_URL, json={"action": "insert", "records": records}, timeout=60)
                        res.raise_for_status()
                        break
                    except Exception as e:
                        print(f"      Upload error: {e}. Retrying ({retry+1}/3)...")
                        time.sleep(2)
                
                # Tiny pause just to be nice to the pipe
                time.sleep(0.1)

            print(f"   ✅ Fully uploaded: {pdf_path.name}")
                    
        except Exception as e:
            print(f"   ❌ Error {pdf_path.name}: {e}")

    print("\n🏁 Wszystkie wybrane dokumenty zostały przetworzone i wysłane bezbłędnie na serwer Supabase!")

if __name__ == "__main__":
    main()
