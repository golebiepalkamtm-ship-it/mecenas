from __future__ import annotations

import logging
from typing import Any, Optional, Set

from services.llm_gateway import call_with_fallback

logger = logging.getLogger(__name__)


async def synthesis_repair_pass(
    *,
    client: Any,
    model_id: str,
    final_answer: str,
    bad_cites: Set[str],
    allowed_corpus: str,
    status_callback: Optional[Any] = None,
) -> str:
    if not bad_cites or not (final_answer or "").strip():
        return final_answer
    cite_list = ", ".join(sorted(bad_cites)[:8])
    prompt = (
        "Popraw WYŁĄCZNIE fragmenty odnoszące się do niezweryfikowanych przepisów. "
        "Usuń lub zastąp je przepisami z ALLOWED_CORPUS. Nie zmieniaj reszty.\n"
        f"NIEZWERYFIKOWANE: {cite_list}\n\n"
        f"ALLOWED_CORPUS:\n{allowed_corpus[:6000]}\n\n"
        f"TEKST:\n{final_answer[:8000]}"
    )
    try:
        repaired, _ = await call_with_fallback(
            model_id,
            [{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.1,
            timeout=55.0,
            status_callback=status_callback,
            log_context="ETAP 11 repair",
        )
        if (repaired or "").strip():
            return repaired.strip()
    except Exception as e:
        logger.error("[STAGE 11 repair] %s", e)
    return final_answer
