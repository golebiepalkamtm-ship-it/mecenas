# ===========================================================================
# MOA Query Parser — Węzeł 1: Inżynieria Zapytań (Query Parser & Router)
# ===========================================================================
"""
Ekstrakcja kluczowych parametrów z naturalnego zapytania użytkownika.
Zapytanie NLP -> struktura danych (strict JSON).
Konfiguracja: Niska temperatura (T=0.1), priorytet szybkości.
"""

import json
import logging
from typing import Optional, Dict, Any
from moa.config import get_async_client
from moa.prompts import NODE1_SYSTEM_PROMPT

logger = logging.getLogger("LexMindQueryParser")

PARSER_MODEL = "openai/gpt-5.4-mini"  # Najtańszy, najszybszy model do parsowania


async def parse_user_query(
    user_query: str, api_keys: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Węzeł 1: Rozbija zapytanie użytkownika na parametry dla ELI, SAOS i Supabase.

    Returns:
        {
            "eli_params": {"nazwa_ustawy": str, "rok": int|None, "slowa_kluczowe": [str]},
            "saos_params": {"dziedzina_prawa": str, "slowa_kluczowe_uzasadnienie": [str], "hasla_tematyczne": [str]},
            "supabase_vector_query": str,
            "is_legal_query": bool
        }
    """
    try:
        client = get_async_client()
        response = await client.chat.completions.create(
            model=PARSER_MODEL,
            messages=[
                {"role": "system", "content": NODE1_SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
            ],
            temperature=0.1,
            max_tokens=300,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)

        # Walidacja kluczowych pól
        result = {
            "eli_params": parsed.get("eli_params", {}),
            "saos_params": parsed.get("saos_params", {}),
            "supabase_vector_query": parsed.get("supabase_vector_query", user_query),
            "is_legal_query": parsed.get("is_legal_query", True),
        }

        logger.info(
            f"[NODE1] Sparsowano zapytanie: is_legal={result['is_legal_query']}"
        )
        logger.info(f"[NODE1] ELI: {result['eli_params']}")
        logger.info(f"[NODE1] SAOS: {result['saos_params']}")
        logger.info(f"[NODE1] Vector: {result['supabase_vector_query'][:80]}...")

        return result

    except Exception as e:
        logger.warning(f"[NODE1] Błąd parsowania: {e} — fallback na surowe zapytanie")
        return {
            "eli_params": {
                "nazwa_ustawy": None,
                "rok": None,
                "slowa_kluczowe": user_query.split()[:5],
            },
            "saos_params": {
                "dziedzina_prawa": None,
                "slowa_kluczowe_uzasadnienie": user_query.split()[:5],
                "hasla_tematyczne": [],
            },
            "supabase_vector_query": user_query,
            "is_legal_query": True,
        }
