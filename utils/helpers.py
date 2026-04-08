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
        if isinstance(content, list):
            text_content = ""
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_content += part.get("text", "")
            content = text_content
        
        if content:
            formatted.append({"role": role, "content": str(content)})
            
    return formatted

async def process_attachments(attachments: list) -> tuple[list[dict[str, Any]], list[str]]:
    """Przetwarza listę załączników, ekstrahując tekst i obrazy."""
    user_content = []
    extracted_texts = []
    for att in attachments:
        print(f"   [ATTACHMENT] Przetwarzanie: {att.name} ({att.type})...")
        
        # 1. Zawsze dodaj obraz do vision jeśli to obraz
        if att.type.startswith("image/"):
            img_data = att.content if att.content.startswith("data:") else f"data:{att.type};base64,{att.content}"
            user_content.append({"type": "image_url", "image_url": {"url": img_data}})
            
            # 2. DODATKOWO: Wykonaj OCR na obrazie dla MOA/RAG (które są tekstowe)
            try:
                pure_base64 = att.content.split(",")[1] if att.content.startswith("data:") else att.content
                file_bytes = base64.b64decode(pure_base64)
                text, err = await asyncio.to_thread(process_document, file_bytes, att.name, att.type)
                if text:
                    print(f"   [OCR SUCCESS] Wyekstrahowano tekst z obrazu {att.name} ({len(text)} znaków)")
                    extracted_texts.append(f"--- ZAŁĄCZNIK (OBRAZ/OCR): {att.name} ---\n{text}")
                    user_content.append({"type": "text", "text": f"\n[Treść z obrazu {att.name}]:\n{text}\n"})
                elif err:
                    print(f"   [OCR WARN] Błąd OCR dla obrazu {att.name}: {err}")
            except Exception as e:
                print(f"   [OCR ERR] Wyjątek podczas OCR obrazu {att.name}: {e}")
        else:
            # 3. Dokumenty (PDF, DOCX, TXT)
            try:
                pure_base64 = att.content.split(",")[1] if att.content.startswith("data:") else att.content
                file_bytes = base64.b64decode(pure_base64)
                text, err = await asyncio.to_thread(process_document, file_bytes, att.name, att.type)
                if text:
                    print(f"   [ATTACH SUCCESS] Wyekstrahowano tekst z {att.name} ({len(text)} znaków)")
                    extracted_texts.append(f"--- ZAŁĄCZNIK: {att.name} ---\n{text}")
                    user_content.append({"type": "text", "text": f"\n[Treść dokumentu {att.name}]:\n{text}\n"})
                elif err:
                    print(f"   [ATTACH WARN] Błąd przetwarzania {att.name}: {err}")
                    user_content.append({"type": "text", "text": f"\n[Błąd dokumentu {att.name}]: {err}\n"})
            except Exception as e:
                print(f"   [ATTACH ERR] Wyjątek podczas przetwarzania {att.name}: {e}")
                logger.error(f"❌ Error processing attachment {att.name}: {e}")
    
    if extracted_texts:
        print(f"✅ Łącznie przetworzono {len(extracted_texts)} załączników tekstowych.")
    return user_content, extracted_texts

def save_chat_messages(sid: str, user_content: str, assistant_content: str, message_type: str = "standard", reasoning: str = None):
    """Zapisuje parę wiadomości do bazy danych."""
    database.save_message(str(uuid.uuid4()), sid, "user", user_content)
    database.save_message(str(uuid.uuid4()), sid, "assistant", assistant_content, message_type=message_type, reasoning=reasoning)

def sanitize_filename(filename: str) -> str:
    """Sanitizuje nazwę pliku, usuwając niebezpieczne znaki."""
    import re
    # Usuwamy ścieżki i niebezpieczne znaki
    name = os.path.basename(filename)
    name = re.sub(r'[^\w\-_\.]', '_', name)
    return name
