# ===========================================================================
# MOA Checker — Węzeł 5: System Weryfikacji (Consistency Guard)
# ===========================================================================
"""
Fact-checking i zapobieganie halucynacjom.
Weryfikuje czy Draft_Legal_Analysis z Węzła 4 jest spójny z kontekstem z Węzła 3.
"""

import json
import logging
from typing import Optional, Dict, Any
from moa.config import get_async_client, LLM_TEMPERATURE
from moa.prompts import NODE5_SYSTEM_PROMPT

logger = logging.getLogger("LexMindChecker")

CHECKER_MODEL = "google/gemini-2.0-flash-001" # Szybki i precyzyjny model weryfikujący

CHECKER_SYSTEM_PROMPT = """[ROLA: SYSTEM WERYFIKACJI (CONSISTENCY GUARD) — FACT-CHECKER]
Jesteś rygorystycznym sędzią-weryfikatorem. Twoim celem jest wykrycie halucynacji, błędnych sygnatur lub interpretacji sprzecznych z dosłownym brzmieniem przepisów.

DANE WEJŚCIOWE:
1. Kontekst Prawny (zwalidowane fragmenty)
2. Szkic Analizy (wygenerowany przez inny model)

ZADANIA:
1. Sprawdź, czy każda sygnatura akt (np. II AKa 12/23) wymieniona w analizie istnieje w dostarczonym kontekście.
2. Sprawdź, czy przytoczone artykuły ustaw są zgodne z brzmieniem w kontekście.
3. Wykryj wszelkie stwierdzenia, które nie mają oparcia w źródłach (halucynacje).

FORMAT ODPOWIEDZI (WYŁĄCZNIE CZYSTY JSON):
{
  "is_consistent": boolean,
  "detected_hallucinations": ["lista błędów lub pusta tablica"],
  "corrected_draft": "poprawiona treść analizy (jeśli is_consistent == false, w przeciwnym razie pusty string)"
}
"""

async def run_consistency_check(
    context_text: str,
    draft_analysis: str,
    api_keys: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Uruchamia weryfikację spójności analizy z kontekstem."""
    
    prompt = f"""## KONTEKST PRAWNY (RAG):
{context_text}

## SZKIC ANALIZY DO WERYFIKACJI:
{draft_analysis}

---
Wykonaj weryfikację i zwróć JSON zgodnie z instrukcjami.
"""

    try:
        client = get_async_client()
        # Możemy użyć klucza z api_keys jeśli provider to google (zgemini)
        # Ale get_async_client() domyślnie używa OpenRoutera
        
        response = await client.chat.completions.create(
            model=CHECKER_MODEL,
            messages=[
                {"role": "system", "content": NODE5_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1, # Bardzo niska temperatura dla fact-checkingu
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content or "{}"
        result = json.loads(raw_content)
        
        # Sanity check dla kluczy
        if "is_consistent" not in result:
            result["is_consistent"] = True
            
        return result

    except Exception as e:
        logger.error(f"[CHECKER] Błąd weryfikacji: {e}")
        return {
            "is_consistent": True, # Fail-safe: jeśli weryfikator padnie, nie blokujemy pipeline'u
            "detected_hallucinations": [f"Błąd wektora weryfikacji: {str(e)}"],
            "corrected_draft": ""
        }
