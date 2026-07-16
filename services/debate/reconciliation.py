from __future__ import annotations

import logging
from datetime import date

from services.llm_gateway import call_with_fallback

logger = logging.getLogger(__name__)


async def reconcile_expert_debate(
    *,
    model_id: str,
    analysis_1: dict,
    analysis_2: dict,
    analysis_3: dict,
    user_query: str,
    conversation_snippet: str = "",
    status_callback=None,
) -> str:
    hist_block = ""
    if (conversation_snippet or "").strip():
        hist_block = (
            "\n\n[HISTORIA ROZMOWY — kontekst dla pojednania]\n"
            f"{conversation_snippet[:2500]}\n"
        )
    reconcile_prompt = (
        f"Data analizy (bieżąca): {date.today().strftime('%d.%m.%Y')}.\n"
        "Masz trzy NIEZALEŻNE opinie ekspertów prawnych w tej samej sprawie.\n"
        "Stwórz PROTOKÓŁ Pojednania Debaty (bez nowych przepisów ani faktów spoza opinii):\n"
        "1) Przepisy w TEJ sprawie (max 6 — art. | w sprawie klienta | zastosowanie | czynność)\n"
        "2) Furtki z RAG/ELI (max 5 — indywidualne zastosowanie, nie definicje)\n"
        "3) Właściwa dziedzina, etap i czynności TERAZ\n"
        "4) Sprzeczności — rozstrzygnięcie na korzyść klienta\n"
        "5) Koła ratunkowe — wszystkie ścieżki wyjścia + najbezpieczniejsza opcja\n\n"
        f"PYTANIE KLIENTA: {user_query}"
        f"{hist_block}\n\n"
        f"--- EKSPERT 1 ---\n{analysis_1.get('response', '')[:3500]}\n\n"
        f"--- EKSPERT 2 ---\n{analysis_2.get('response', '')[:3500]}\n\n"
        f"--- EKSPERT 3 ---\n{analysis_3.get('response', '')[:3500]}"
    )
    try:
        text, _ = await call_with_fallback(
            model_id,
            [{"role": "user", "content": reconcile_prompt}],
            max_tokens=1600,
            temperature=0.15,
            timeout=45.0,
            status_callback=status_callback,
            log_context="ETAP 8b Pojednanie debaty",
        )
        return (text or "").strip()
    except Exception as e:
        logger.error("   [STAGE 8b ERR] Pojednanie debaty: %s", e)
        return ""
