# ===========================================================================
# MOA Synthesizer — Sędzia-Agregator (Finalny Konsensus)
# ===========================================================================

import time
import asyncio
from typing import Optional, Any
from openai import AsyncOpenAI

from moa.config import (
    DEFAULT_JUDGE_MODEL,
    LLM_TEMPERATURE,
    LLM_TIMEOUT,
)
from moa.models import AnalystResult, MOAResult
from moa.prompt_builder import IdentityMode

def _build_judge_prompt(
    query: str,
    analyst_results: list[AnalystResult],
    raw_context: str,
    document_text: str | None = None,
    history_summary: str | None = None,
    expert_memory: str | None = None,
) -> str:
    """Buduje bogaty prompt dla sędziego-agregatora z wynikami ekspertów."""
    doc_section = f"## DOKUMENT KONTEKSTOWY:\n{document_text}\n\n" if document_text else ""
    hist_section = f"## PODSUMOWANIE HISTORII:\n{history_summary}\n\n" if history_summary else ""
    memory_section = f"<expert_memory_cache>\n{expert_memory}\n</expert_memory_cache>\n\n" if expert_memory else ""

    parts = [
        "## LATEST USER QUERY:", query, "",
        memory_section,
        doc_section,
        hist_section,
        "## BAZA WIEDZY (RAG):", raw_context, "",
        "## RAPORTY SPECJALISTYCZNE (EKSPERCI):",
    ]

    for r in analyst_results:
        parts.append(f"### EKSPERT: {r.model_id}\n{r.response}\n")

    parts.append("\nWYMÓG KRYTYCZNY: Zsyntetyzuj WSZYSTKIE powyższe raporty w jedną spójną i profesjonalną odpowiedź prawną.")
    return "\n".join(parts)

async def synthesize_judgment(
    client: AsyncOpenAI,
    query: str,
    analyst_results: list[AnalystResult],
    raw_context: str,
    judge_model: str,
    has_legal_context: bool = True,
    document_text: str | None = None,
    history: list[dict[str, str]] | None = None,
    history_summary: str | None = None,
    expert_memory: str | None = None,
    judge_system_prompt: Optional[str] = None,
    mode: IdentityMode = IdentityMode.ADVOCATE,
) -> str:
    """Finalna synteza odpowiedzi przez model sędziego."""
    user_prompt = _build_judge_prompt(query, analyst_results, raw_context, document_text, history_summary, expert_memory)
    
    messages = [{"role": "system", "content": judge_system_prompt or "Jesteś sędzią-agregatorem. Stwórz konsensus."}]
    if history:
        messages.extend(history[-10:])

    messages.append({"role": "user", "content": user_prompt})

    try:
        response = await client.chat.completions.create(
            model=judge_model,
            messages=messages,
            temperature=LLM_TEMPERATURE,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"[Synthesizer Error] {str(e)}"
