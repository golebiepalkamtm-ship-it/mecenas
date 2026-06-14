import asyncio
import httpx
import logging
import os
import sys
from bs4 import BeautifulSoup

from dotenv import load_dotenv
from typing import Any, Dict, List
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL") or ""
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""

def strip_html(text: str) -> str:
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    return soup.get_text(separator=" ", strip=True)

class ISAPUnavailableError(Exception):
    """Wyjątek podnoszony gdy ISAP API zwraca 503 lub inny błąd serwera."""
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=4, max=30),
    retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException, ISAPUnavailableError)),
    reraise=True
)
async def _fetch_isap_with_retry(limit: int) -> List[Dict[str, Any]]:
    url = "https://api.sejm.gov.pl/eli/acts"
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.get(url, params={"limit": limit})
        if res.status_code == 503:
            logger.warning("ISAP API zwróciło 503 Service Unavailable, ponawianie...")
            raise ISAPUnavailableError("ISAP API 503")
        elif res.status_code != 200:
            logger.error(f"Błąd ISAP API: {res.status_code}")
            return []
        
        return res.json().get("items", [])

async def fetch_isap_acts(limit: int = 100) -> List[Dict[str, Any]]:
    """
    Pobiera najnowsze akty prawne z API Sejmowego.
    Wspiera automatyczne ponawianie w przypadku błędu 503.
    """
    logger.info(f"Pobieranie {limit} najnowszych aktów z ISAP API...")
    try:
        return await _fetch_isap_with_retry(limit)
    except Exception as e:
        logger.error(f"Ostateczny błąd podczas pobierania ISAP API po ponowieniach: {e}")
        return []

async def process_and_sync_acts():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("Brak konfiguracji Supabase (SUPABASE_URL, SUPABASE_SERVICE_KEY).")
        sys.exit(1)
        
    from services.indexing_service import indexing_service
    acts = await fetch_isap_acts(limit=50) # Pobieramy 50 najnowszych na potrzeby synchronizacji cron
    
    if not acts:
        logger.warning("Brak aktów do synchronizacji.")
        return
        
    logger.info(f"Pobrano {len(acts)} aktów. Przetwarzanie i wektoryzacja...")
    
    # Inicjalizacja klienta Supabase
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json"
    }
    
    table_name = "isap_vectors"
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for act in acts:
            eli = act.get("ELI", "")
            if not eli:
                continue
                
            title = act.get("title", "")
            text_html = act.get("textHTML", "")
            
            # Pobierz z pierwszego z dostępnych tekstów, jeśli text_html puste
            if not text_html and isinstance(act.get("texts"), list) and act["texts"]:
                text_html = act["texts"][0]
                
            body = strip_html(text_html)
            if not body:
                body = f"Tytuł: {title}. Brak pełnego tekstu."
                
            # Chunkowanie - dzielimy długie ustawy na mniejsze fragmenty (np. co 3000 znaków)
            chunk_size = 3000
            chunks = [body[i:i + chunk_size] for i in range(0, len(body), chunk_size)]
            
            for idx, chunk in enumerate(chunks):
                chunk_id = f"{eli}_chunk_{idx}"
                logger.info(f"Wektoryzacja: {eli} (chunk {idx + 1}/{len(chunks)})")
                
                # Generowanie embeddingu za pomocą istniejącego indexing_service
                embedding = await indexing_service.get_embedding(f"{title}\n\n{chunk}")
                
                payload = {
                    "id": chunk_id,
                    "eli": eli,
                    "title": title,
                    "content": chunk,
                    "embedding": embedding
                }
                
                # Upsert do Supabase
                res = await client.post(
                    url, 
                    headers={**headers, "Prefer": "resolution=merge-duplicates"},
                    json=payload
                )
                
                if res.status_code not in (200, 201):
                    logger.error(f"Błąd zapisu do Supabase dla {chunk_id}: {res.text}")
                    
    logger.info("Synchronizacja ISAP do pgvector zakończona sukcesem.")

if __name__ == "__main__":
    asyncio.run(process_and_sync_acts())
