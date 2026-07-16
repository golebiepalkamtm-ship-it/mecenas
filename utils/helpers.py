import asyncio
import base64
import uuid
import json
import logging
import os
from typing import Any, List, Optional, Dict
import database

logger = logging.getLogger(__name__)


def save_chat_messages(
    sid: str,
    user_content: str,
    assistant_content: str,
    message_type: str = "standard",
    reasoning: Optional[str] = None,
    eli_explanation: Optional[str] = None,
    sources: Optional[List[str]] = None,
    ai_task: Optional[str] = None,
    cited_sources: Optional[List[Dict[str, Any]]] = None,
) -> bool:
    """
    Zapisuje parę wiadomości (użytkownika i asystenta) do bazy danych SQLite.
    
    Returns:
        bool: True jeśli zapis się powiódł, False w przeciwnym razie
    """
    try:
        sources_str = None
        if sources:
            str_sources = []
            for s in sources:
                if isinstance(s, str):
                    str_sources.append(s)
                elif isinstance(s, dict):
                    ref_id = s.get("ref_id") or s.get("label") or str(s)
                    str_sources.append(ref_id)
                else:
                    str_sources.append(str(s))
            sources_str = ",".join(str_sources)
        cited_json = json.dumps(cited_sources, ensure_ascii=False) if cited_sources else None
        database.save_message(str(uuid.uuid4()), sid, "user", user_content, ai_task=ai_task)
        database.save_message(
            str(uuid.uuid4()),
            sid,
            "assistant",
            assistant_content,
            sources=sources_str,
            message_type=message_type,
            reasoning=reasoning,
            eli_explanation=eli_explanation,
            ai_task=ai_task,
            cited_sources=cited_json,
        )
        return True
    except Exception as e:
        logger.error(f"[DB ERROR] Nie udało się zapisać wiadomości: {e}")
        return False



async def scrape_urls_from_text(text: str) -> list[str]:
    """Wykrywa URL-e w tekście i pobiera ich zawartość (tekstową)."""
    import re
    import httpx
    import logging
    from typing import List

    # Bardziej precyzyjny regex do URL-i
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[/\w\.-]*?(?:\?\S*)?'
    urls = list(set(re.findall(url_pattern, text)))
    
    if not urls:
        return []

    print(f"   [WEB SCRAPER] Wykryto {len(urls)} linków. Pobieranie treści...")
    scraped_contents = []

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for url in urls:
            try:
                print(f"   [WEB] Pobieranie: {url}")
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    # Bardzo proste czyszczenie HTML z tagów (bez BS4 dla szybkości)
                    html = res.text
                    # Usuwamy skrypty i style
                    html = re.sub(r'<(script|style).*?>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
                    # Usuwamy inne tagi
                    clean_text = re.sub(r'<.*?>', ' ', html)
                    # Normalizujemy spacje
                    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
                    
                    if len(clean_text) > 100:
                        scraped_contents.append(f"--- TREŚĆ ZE STRONY ({url}) ---\n{clean_text[:15000]}")
                        print(f"   [WEB SUCCESS] Pobrano {len(clean_text)} znaków z {url}")
                    else:
                        print(f"   [WEB WARN] Zbyt mało treści na {url}")
            except Exception as e:
                print(f"   [WEB ERR] Błąd pobierania {url}: {e}")

    return scraped_contents


def sanitize_filename(filename: str) -> str:
    """Sanitizuje nazwę pliku, usuwając niebezpieczne znaki."""
    import re

    # Usuwamy ścieżki i niebezpieczne znaki
    name = os.path.basename(filename)
    name = re.sub(r"[^\w\-_\.]", "_", name)
    return name
