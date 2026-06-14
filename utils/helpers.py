import asyncio
import base64
import uuid
import json
import logging
import os
from typing import Any, List, Optional, Dict
import database

logger = logging.getLogger("LexMindUtils")


def format_history_for_openai(
    history: list[dict[str, Any]], use_limit: int = 10, model_id: str | None = None
) -> list[dict[str, Any]]:
    """
    Konwertuje historię czatu na format oczekiwany przez OpenAI API.
    
    Args:
        history: Lista wiadomości z historii
        use_limit: Limit wiadomości do użycia (sliding window)
        model_id: ID modelu do sprawdzenia obsługi vision
    
    Returns:
        Sformatowana lista wiadomości
    """
    from moa.config import is_vision_model

    # Sliding window
    history_len = len(history)
    start_idx = history_len - use_limit if history_len > use_limit else 0
    limited = history[start_idx:]

    vision_ok = is_vision_model(model_id) if model_id else True

    formatted = []
    for msg in limited:
        role = str(msg.get("role", "user"))
        if role in ["assistant", "model", "bot"]:
            role = "assistant"

        content = msg.get("content", "")

        # Obsługa wiadomości zapisanych jako JSON z załącznikami
        if isinstance(content, str):
            try:
                parsed = json.loads(content)
                if isinstance(parsed, list):
                    content = parsed
            except json.JSONDecodeError:
                pass

        # Filtruj image_url z historii jeśli model nie wspiera vision
        if not vision_ok and isinstance(content, list):
            # Zachowaj tylko tekstowe elementy
            text_content = [c for c in content if c.get("type") == "text"]
            if text_content:
                # Jeśli został tylko 1 element tekstowy, spłaszcz do stringa
                if len(text_content) == 1:
                    content = text_content[0]["text"]
                else:
                    # Połącz wiele elementów tekstowych
                    content = "\n".join(c["text"] for c in text_content)
            else:
                # Jeśli brak elementów tekstowych, pomiń tę wiadomość
                continue

        if content:
            formatted.append({"role": role, "content": content})

    return formatted


async def process_attachments(
    attachments: list,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Przetwarza listę załączników równolegle, ekstrahując tekst i obrazy."""
    if not attachments:
        return [], []

    async def process_single(att):
        user_content_local = []
        extracted_texts_local = []
        print(f"   [ATTACHMENT] Przetwarzanie: {att.name} ({att.type})...")

        # 1. Zawsze dodaj obraz do vision jeśli to obraz (wstępnie przetworzony)
        if att.type.startswith("image/"):
            from utils.image_preprocessor import preprocess_base64_image
            raw_img_data = (
                att.content
                if att.content.startswith("data:")
                else f"data:{att.type};base64,{att.content}"
            )
            # Zoptymalizuj pod kątem kontrastu, ostrości i rotacji przed wysłaniem do LLM
            img_data = preprocess_base64_image(raw_img_data)
            user_content_local.append({"type": "image_url", "image_url": {"url": img_data}})
            # OCR for images is removed as per user request to rely on native vision
        else:
            # 2. Dokumenty (PDF, DOCX, TXT)
            try:
                pure_base64 = (
                    att.content.split(",")[1]
                    if att.content.startswith("data:")
                    else att.content
                )
                file_bytes = base64.b64decode(pure_base64)
                text, err, _ = await process_document(
                    file_bytes,
                    att.name,
                    att.type,
                    generate_embedding=False,
                )
                if text:
                    print(f"   [ATTACH SUCCESS] Wyekstrahowano tekst z {att.name}")
                    extracted_texts_local.append(f"--- ZAŁĄCZNIK: {att.name} ---\n{text}")
                    user_content_local.append({"type": "text", "text": f"\n[Treść dokumentu {att.name}]:\n{text}\n"})
                elif err:
                    print(f"   [ATTACH WARN] Błąd przetwarzania {att.name}: {err}")
                    user_content_local.append({"type": "text", "text": f"\n[Błąd dokumentu {att.name}]: {err}\n"})
            except Exception as e:
                print(f"   [ATTACH ERR] Wyjątek podczas przetwarzania {att.name}: {e}")
        
        return user_content_local, extracted_texts_local

    # Uruchom równolegle
    results = await asyncio.gather(*[process_single(att) for att in attachments])
    
    # Połącz wyniki
    user_content = []
    extracted_texts = []
    for u_local, e_local in results:
        user_content.extend(u_local)
        extracted_texts.extend(e_local)

    if extracted_texts:
        print(f"[SUCCESS] Łącznie przetworzono {len(extracted_texts)} załączników tekstowych.")
    return user_content, extracted_texts


def save_chat_messages(
    sid: str,
    user_content: str,
    assistant_content: str,
    message_type: str = "standard",
    reasoning: Optional[str] = None,
    eli_explanation: Optional[str] = None,
    sources: Optional[List[str]] = None,
) -> bool:
    """
    Zapisuje parę wiadomości (użytkownika i asystenta) do bazy danych SQLite.
    
    Returns:
        bool: True jeśli zapis się powiódł, False w przeciwnym razie
    """
    try:
        sources_str = ",".join(sources) if sources else None
        database.save_message(str(uuid.uuid4()), sid, "user", user_content)
        database.save_message(
            str(uuid.uuid4()),
            sid,
            "assistant",
            assistant_content,
            sources=sources_str,
            message_type=message_type,
            reasoning=reasoning,
            eli_explanation=eli_explanation,
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
