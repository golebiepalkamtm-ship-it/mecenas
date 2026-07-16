import hashlib
import httpx
import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

class IndexingService:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        from database import get_setting
        emb_model = get_setting("assigned_model_embedding", "openai/text-embedding-3-small")
        print(f"[INDEXING] Inicjalizacja usługi embeddingów OpenRouter ({emb_model})...")

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding przez OpenRouter (do N tekstów w jednym request)."""
        if not texts:
            return []
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not openrouter_api_key:
            raise Exception("OPENROUTER_API_KEY nie ustawiony")

        inputs = [(t or "")[:8000] for t in texts]
        headers = {
            "Authorization": f"Bearer {openrouter_api_key}",
            "HTTP-Referer": "http://127.0.0.1:8003",
            "X-Title": "LexMind AI",
            "Content-Type": "application/json",
        }
        from database import get_setting
        emb_model = get_setting("assigned_model_embedding", "openai/text-embedding-3-small")
        payload = {
            "model": emb_model,
            "input": inputs,
        }
        url = "https://openrouter.ai/api/v1/embeddings"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Błąd OpenRouter batch {response.status_code}: {response.text}")
        data = response.json()
        rows = data.get("data") or []
        rows.sort(key=lambda x: x.get("index", 0))
        return [r["embedding"] for r in rows if r.get("embedding")]

    async def get_embedding(self, text: str) -> List[float]:
        """Generuje natywny 1536-wymiarowy embedding bez dopełniania zerami."""
        if not text:
            return []
            
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        headers = {
            "Authorization": f"Bearer {openrouter_api_key}",
            "HTTP-Referer": "http://127.0.0.1:8003",
            "X-Title": "LexMind AI",
            "Content-Type": "application/json",
        }
        
        from database import get_setting
        emb_model = get_setting("assigned_model_embedding", "openai/text-embedding-3-small")
        payload = {
            "model": emb_model,
            "input": [text[:8000]],
        }
        
        url = "https://openrouter.ai/api/v1/embeddings"
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "data" in data and data["data"]:
                        # Zwracamy czysty, natywny wektor 1536d bez żadnych zer!
                        return data["data"][0]["embedding"]
                    else:
                        raise Exception(f"Błąd formatu odpowiedzi OpenRouter: {data}")
                else:
                    raise Exception(f"Błąd OpenRouter {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[INDEXING ERR] Błąd generowania embeddingu: {e}")
            raise

    def _content_hash(self, text: str) -> str:
        normalized = (text or "").strip().replace("\u0000", "").replace("\x00", "")
        return hashlib.sha256(normalized.encode("utf-8", errors="replace")).hexdigest()

    async def _row_exists_content_hash(self, table_name: str, content_hash: str) -> bool:
        if not SUPABASE_URL or not content_hash:
            return False
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}"
        params = {
            "select": "id",
            "limit": "1",
            "metadata->>content_hash": f"eq.{content_hash}",
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.get(url, headers=self.headers, params=params)
                if res.status_code != 200:
                    return False
                data = res.json()
                return isinstance(data, list) and len(data) > 0
        except Exception as e:
            print(f"[INDEXING] Sprawdzenie duplikatu: {e}")
            return False

    async def index_text(
        self,
        text: str,
        filename: str,
        table_name: str = "knowledge_base_user",
        source_file_hash: Optional[str] = None,
    ) -> bool:
        """Indeksuje tekst w Supabase (pgvector)."""
        if not text:
            return False

        if source_file_hash:
            from services.user_kb_cache import row_exists_source_file_hash

            if await row_exists_source_file_hash(source_file_hash):
                print(
                    f"[INDEXING SKIP] Ten plik już w {table_name} (source_file_hash={source_file_hash[:12]}…)."
                )
                return True
            
        # Oczyszczanie tekstu z bajtów zerowych (\u0000 / \x00), których PostgreSQL nie potrafi zapisać
        text = text.replace('\u0000', '').replace('\x00', '')
        
        if not text.strip():
            return False

        content_hash = self._content_hash(text)
        if await self._row_exists_content_hash(table_name, content_hash):
            print(f"[INDEXING SKIP] Ten sam fragment już w {table_name} (content_hash={content_hash[:12]}…).")
            return True

        try:
            embedding = await self.get_embedding(text[:2000])
            
            payload = {
                "content": text,
                "metadata": {
                    "filename": filename,
                    "source": "dynamic_chat_extraction",
                    "created_at": datetime.now().isoformat(),
                    "content_hash": content_hash,
                    **(
                        {"source_file_hash": source_file_hash, "storage_role": "chat_extraction"}
                        if source_file_hash
                        else {}
                    ),
                },
                "embedding": embedding
            }
            
            url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload, headers=self.headers)
                if res.status_code not in [200, 201]:
                    print(f"[INDEXING ERR] Supabase Error {res.status_code}: {res.text}")
                    return False
                
                print(f"[INDEXING OK] Zaindeksowano fragment z {filename} (natywny 1536d)")
                return True
        except Exception as e:
            print(f"[INDEXING ERR] Błąd indeksowania: {e}")
            return False

# Singleton
indexing_service = IndexingService()
