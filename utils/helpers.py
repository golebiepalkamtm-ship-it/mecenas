import asyncio
import base64
import uuid
import json
import logging
import os
from typing import Any, List, Optional, Dict
from document_processor import process_document
from moa.http_client import get_shared_openai_client
import database

logger = logging.getLogger("LexMindUtils")


def format_history_for_openai(
    history: list[dict[str, Any]], use_limit: int = 10
) -> list[dict[str, Any]]:
    """Konwertuje historię czatu na format oczekiwany przez OpenAI API."""
    # Sliding window
    history_len = len(history)
    start_idx = history_len - use_limit if history_len > use_limit else 0
    limited = history[start_idx:]

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

        if content:
            formatted.append({"role": role, "content": content})

    return formatted


async def process_attachments(
    attachments: list,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Przetwarza listę załączników, ekstrahując tekst i obrazy."""
    user_content = []
    extracted_texts = []
    for att in attachments:
        print(f"   [ATTACHMENT] Przetwarzanie: {att.name} ({att.type})...")

        # 1. Zawsze dodaj obraz do vision jeśli to obraz
        if att.type.startswith("image/"):
            img_data = (
                att.content
                if att.content.startswith("data:")
                else f"data:{att.type};base64,{att.content}"
            )
            user_content.append({"type": "image_url", "image_url": {"url": img_data}})

            # 2. DODATKOWO: Wykonaj OCR na obrazie dla MOA/RAG (które są tekstowe)
            try:
                pure_base64 = (
                    att.content.split(",")[1]
                    if att.content.startswith("data:")
                    else att.content
                )
                file_bytes = base64.b64decode(pure_base64)
                text, err = await asyncio.to_thread(
                    process_document, file_bytes, att.name, att.type
                )
                if text:
                    print(
                        f"   [OCR SUCCESS] Wyekstrahowano tekst z obrazu {att.name} ({len(text)} znaków)"
                    )
                    extracted_texts.append(
                        f"--- ZAŁĄCZNIK (OBRAZ/OCR): {att.name} ---\n{text}"
                    )
                    user_content.append(
                        {
                            "type": "text",
                            "text": f"\n[Treść z obrazu {att.name}]:\n{text}\n",
                        }
                    )
                elif err:
                    print(f"   [OCR WARN] Błąd OCR dla obrazu {att.name}: {err}")
            except Exception as e:
                print(f"   [OCR ERR] Wyjątek podczas OCR obrazu {att.name}: {e}")
        else:
            # 3. Dokumenty (PDF, DOCX, TXT)
            try:
                pure_base64 = (
                    att.content.split(",")[1]
                    if att.content.startswith("data:")
                    else att.content
                )
                file_bytes = base64.b64decode(pure_base64)
                text, err = await asyncio.to_thread(
                    process_document, file_bytes, att.name, att.type
                )
                if text:
                    print(
                        f"   [ATTACH SUCCESS] Wyekstrahowano tekst z {att.name} ({len(text)} znaków)"
                    )
                    extracted_texts.append(f"--- ZAŁĄCZNIK: {att.name} ---\n{text}")
                    user_content.append(
                        {
                            "type": "text",
                            "text": f"\n[Treść dokumentu {att.name}]:\n{text}\n",
                        }
                    )
                elif err:
                    print(f"   [ATTACH WARN] Błąd przetwarzania {att.name}: {err}")
                    user_content.append(
                        {
                            "type": "text",
                            "text": f"\n[Błąd dokumentu {att.name}]: {err}\n",
                        }
                    )
            except Exception as e:
                print(f"   [ATTACH ERR] Wyjątek podczas przetwarzania {att.name}: {e}")
                logger.error(f"[ERROR] Error processing attachment {att.name}: {e}")

    if extracted_texts:
        print(f"[SUCCESS] Łącznie przetworzono {len(extracted_texts)} załączników tekstowych.")
    return user_content, extracted_texts


def save_chat_messages(
    sid: str,
    user_content: str,
    assistant_content: str,
    message_type: str = "standard",
    reasoning: str = None,
    eli_explanation: str = None,
):
    """Zapisuje parę wiadomości do bazy danych."""
    database.save_message(str(uuid.uuid4()), sid, "user", user_content)
    database.save_message(
        str(uuid.uuid4()),
        sid,
        "assistant",
        assistant_content,
        message_type=message_type,
        reasoning=reasoning,
        eli_explanation=eli_explanation,
    )


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
