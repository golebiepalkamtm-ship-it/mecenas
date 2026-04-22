# ===========================================================================
# MOA Context Synthesizer — Węzeł 3: Filtracja i Kompresja Kontekstu
# ===========================================================================
"""
Usuwa szum informacyjny z wyników SAOS/ELI/Supabase przed główną analizą.
Zostawia tylko fragmenty bezpośrednio odnoszące się do stanu faktycznego.
"""

import logging
from typing import Optional, Dict, Any, List
from moa.config import get_async_client, get_safe_max_tokens
from moa.prompts import NODE3_SYSTEM_PROMPT

logger = logging.getLogger("LexMindContextSynthesizer")

FILTER_MODEL = "google/gemini-1.5-flash" # Szybki model do filtracji (duże okno kontekstowe)

FILTER_SYSTEM_PROMPT = """[ROLA: EKSPERT SELEKCJI DANYCH PRAWNYCH]
Twoim zadaniem jest drastyczne ograniczenie szumu informacyjnego w dostarczonym kontekście prawnym. 
Otrzymasz zapytanie użytkownika oraz surowe dane z wielu źródeł (SAOS, ELI, Supabase).

ZADANIE:
1. Przeanalizuj zapytanie użytkownika.
2. Odfiltruj fragmenty ustaw, orzeczeń i komentarzy, które NIE odnoszą się bezpośrednio do problemu.
3. Zachowaj kluczowe sygnatury, numery artykułów i treść przepisów.
4. Skondensuj tekst do formy czytelnego Markdown.

OUTPUT:
Skondensowany tekst zawierający wyłącznie zwalidowane fragmenty aktów prawnych i orzeczeń z przypisanymi identyfikatorami (np. sygnatura, ID artykułu).
ZAKAZ: Komentarzy, wyjaśnień, powitań. Tylko twardy kontekst prawny.
"""

async def filter_and_compress_context(
    query: str,
    raw_context: str,
    api_keys: Optional[Dict[str, str]] = None
) -> str:
    """Filtruje surowy kontekst prawny zostawiając tylko esencję."""
    if not raw_context.strip():
        return ""

    prompt = f"""## ZAPYTANIE UŻYTKOWNIKA:
{query}

## SUROWY KONTEKST (DO FILTRACJI):
{raw_context}

---
Wygeneruj skondensowany kontekst prawny (Markdown).
"""

    try:
        client = get_async_client()
        response = await client.chat.completions.create(
            model=FILTER_MODEL,
            messages=[
                {"role": "system", "content": NODE3_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=get_safe_max_tokens(FILTER_MODEL, 4000)
        )
        
        filtered_text = response.choices[0].message.content or ""
        logger.info(f"[CONTEXT_FILTER] Zredukowano kontekst z {len(raw_context)} do {len(filtered_text)} znaków.")
        return filtered_text

    except Exception as e:
        logger.warning(f"[CONTEXT_FILTER] Błąd filtracji: {e}. Zwracam surowy kontekst.")
        return raw_context
