import logging
import datetime
import hashlib
import json
import os
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from moa.config import GOOGLE_API_KEY

logger = logging.getLogger("GeminiCacheManager")

# Inicjalizacja klienta SDK (nowy google-genai)
_gemini_client = None
if GOOGLE_API_KEY:
    _gemini_client = genai.Client(api_key=GOOGLE_API_KEY)

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
    ) -> Optional[Any]:
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
            if not _gemini_client:
                return None
                
            # 1. Sprawdź czy cache o tej nazwie już istnieje
            for c in _gemini_client.caching.list():
                if c.display_name == display_name:
                    logger.info(f"   [CACHE] Znaleziono istniejący Gemini Context Cache: {display_name}")
                    return c

            # 2. Jeśli nie ma, stwórz nowy
            logger.info(f"   [CACHE] Tworzenie NOWEGO Gemini Context Cache ({total_chars} znaków)...")
            
            # Przygotuj zawartość do cache
            content_parts = []
            for c in contents:
                content_parts.append(types.Content(
                    role="user",
                    parts=[types.Part(text=c)]
                ))
            
            cache = _gemini_client.caching.create(
                model=model_name,
                config=types.CachedContentConfig(
                    display_name=display_name,
                    system_instruction=system_instruction,
                    contents=content_parts,
                    ttl=f"{ttl_minutes}m",
                )
            )
            return cache
        except Exception as e:
            logger.error(f"   [CACHE ERR] Nie udało się zarządzać cache Gemini: {e}")
            return None

async def call_gemini_direct(
    model_id: str,
    system_prompt: str,
    user_prompt: str,
    history: Optional[List[Dict[str, str]]] = None,
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
        if not _gemini_client:
            raise ValueError("Klient Gemini nie jest zainicjalizowany.")
            
        if cache:
            # Użycie cache - wysyłamy tylko krótkie zapytanie
            response = await _gemini_client.models.generate_content_async(
                model=clean_model_id,
                contents="Proszę o odpowiedź na podstawie załadowanego kontekstu.",
                config=types.GenerateContentConfig(
                    cached_content=cache.name,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )
        else:
            # Normalne wywołanie bez cache
            # Konwersja historii na format Gemini
            gemini_contents = []
            
            # Dodaj system prompt jako pierwszy message
            if system_prompt:
                gemini_contents.append(
                    types.Content(role="model", parts=[types.Part(text=f"System: {system_prompt}")])
                )
            
            if history:
                for msg in history:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_contents.append(
                        types.Content(role=role, parts=[types.Part(text=msg["content"])])
                    )
            
            # Dodaj aktualne zapytanie
            gemini_contents.append(
                types.Content(role="user", parts=[types.Part(text=user_prompt)])
            )
            
            response = await _gemini_client.models.generate_content_async(
                model=clean_model_id,
                contents=gemini_contents,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )
        
        return response.text if response.text else ""
    except Exception as e:
        logger.error(f"   [GEMINI ERR] Błąd podczas wywołania direct: {e}")
        raise e
