import logging
import datetime
import hashlib
import json
import os
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from google.generativeai import caching

from moa.config import GOOGLE_API_KEY

logger = logging.getLogger("GeminiCacheManager")

# Inicjalizacja SDK
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class GeminiCacheManager:
    """
    Zarządza Context Caching dla Gemini.
    Umożliwia oszczędność tokenów poprzez reużycie dużego kontekstu (RAG + Dokumenty).
    """
    
    @staticmethod
    def _generate_cache_key(system_instruction: str, contents: List[str]) -> str:
        """Generuje unikalny klucz dla zestawu instrukcji i treści."""
        combined = system_instruction + "".join(contents)
        return hashlib.sha256(combined.encode()).hexdigest()

    @staticmethod
    async def get_or_create_cache(
        model_name: str,
        system_instruction: str,
        contents: List[str],
        ttl_minutes: int = 60
    ) -> Optional[caching.CachedContent]:
        """
        Pobiera istniejący cache lub tworzy nowy jeśli treść jest wystarczająco duża.
        Minimalny rozmiar dla cache to zazwyczaj ok. 32k tokenów.
        """
        if not GOOGLE_API_KEY:
            return None

        # Szacunkowa liczba tokenów (uproszczona: 1 token ~= 4 znaki)
        total_chars = len(system_instruction) + sum(len(c) for c in contents)
        if total_chars < 130000: # ~32.5k tokenów - minimalny próg dla Gemini Context Caching
            return None

        cache_key = GeminiCacheManager._generate_cache_key(system_instruction, contents)
        display_name = f"lexmind_cache_{cache_key[:10]}"

        try:
            # 1. Sprawdź czy cache o tej nazwie już istnieje (uproszczone: szukamy w istniejących)
            for c in caching.CachedContent.list():
                if c.display_name == display_name:
                    logger.info(f"   [CACHE] Znaleziono istniejący Gemini Context Cache: {display_name}")
                    return c

            # 2. Jeśli nie ma, stwórz nowy
            logger.info(f"   [CACHE] Tworzenie NOWEGO Gemini Context Cache ({total_chars} znaków)...")
            cache = caching.CachedContent.create(
                model=model_name,
                display_name=display_name,
                system_instruction=system_instruction,
                contents=contents,
                ttl=datetime.timedelta(minutes=ttl_minutes),
            )
            return cache
        except Exception as e:
            logger.error(f"   [CACHE ERR] Nie udało się zarządzać cache Gemini: {e}")
            return None

async def call_gemini_direct(
    model_id: str,
    system_prompt: str,
    user_prompt: str,
    history: List[Dict[str, str]] = None,
    temperature: float = 0.1,
    max_tokens: int = 4000,
) -> str:
    """
    Bezpośrednie wywołanie Gemini via Google SDK z obsługą Context Caching.
    model_id powinien być w formacie 'models/gemini-1.5-pro' lub podobnym.
    """
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY nie jest ustawiony.")

    # Normalizacja nazwy modelu (usuwamy 'google/' jeśli pochodzi z OpenRouter format)
    clean_model_id = model_id.split("/")[-1]
    if not clean_model_id.startswith("models/"):
        clean_model_id = f"models/{clean_model_id}"

    # Próba uzyskania cache dla dużych treści
    # W LexMind duże treści to RAG i Dokumenty, które są wstrzykiwane do user_prompt lub system_prompt.
    # Dla MOA najlepiej cache'ować System Prompt + Dokumenty.
    
    # Decydujemy co cache'ować:
    # Jeśli user_prompt jest bardzo duży, to on jest kandydatem.
    cache = await GeminiCacheManager.get_or_create_cache(
        model_name=clean_model_id,
        system_instruction=system_prompt,
        contents=[user_prompt] if len(user_prompt) > 64000 else []
    )

    try:
        if cache:
            model = genai.GenerativeModel.from_cached_content(cached_content=cache)
            # Przy użyciu cache, system_instruction i duża część user_prompt są już w cache.
            # Musimy wysłać tylko to, co się zmienia (zapytanie).
            # Jeśli cały user_prompt został wrzucony do cache, tutaj wysyłamy pusty/minimalny prompt?
            # Zwykle do cache wrzuca się statyczną część, a dynamiczną (pytanie) wysyła się teraz.
            response = await model.generate_content_async(
                "Proszę o odpowiedź na podstawie załadowanego kontekstu.",
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )
        else:
            model = genai.GenerativeModel(
                model_name=clean_model_id,
                system_instruction=system_prompt
            )
            
            # Konwersja historii na format Gemini
            gemini_history = []
            if history:
                for msg in history:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_history.append({"role": role, "parts": [msg["content"]]})
            
            chat = model.start_chat(history=gemini_history)
            response = await chat.send_message_async(
                user_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )
        
        return response.text
    except Exception as e:
        logger.error(f"   [GEMINI ERR] Błąd podczas wywołania direct: {e}")
        raise e
