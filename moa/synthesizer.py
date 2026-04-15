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
from moa.gemini_client import call_gemini_direct
from moa.config import GOOGLE_API_KEY, classify_model

def _build_judge_prompt(
    query: str,
    analyst_results: list[AnalystResult],
    raw_context: str,
    document_text: str | None = None,
    history_summary: str | None = None,
    expert_memory: str | None = None,
) -> str:
    """Buduje bogaty prompt dla sędziego-agregatora z wynikami ekspertów."""
    # Truncate document if too long
    if document_text and len(document_text) > 30_000:
        document_text = document_text[:30_000] + "\n... [TREŚĆ DOKUMENTU OBCIĘTA] ..."
        
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

    parts.append("\nWYMÓN KRYTYCZNY: Zsyntetyzuj WSZYSTKIE powyższe raporty w jedną spójną i ostateczną odpowiedź prawną.")
    parts.append("DYREKTYWA KOMUNIKACYJNA: Jesteś frontem dla klienta. Masz bezwzględny obowiązek tłumaczyć zawiły język prawniczy i suche paragrafy na zrozumiały, jasny i ludzki język.")
    parts.append("Jeżeli eksperci powołują się na art. / ust. / k.c. / k.p.k. - wyjaśniaj od razu co one w praktyce oznaczają dla klienta. Odpowiedź ma być profesjonalna, ale wysoce empatyczna (ELI5 - tłumacz tak, by laik zrozumiał).")
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
    api_keys: Optional[dict[str, str]] = None,
) -> str:
    """Finalna synteza odpowiedzi przez model sędziego."""
    user_prompt = _build_judge_prompt(query, analyst_results, raw_context, document_text, history_summary, expert_memory)
    
    messages = [{"role": "system", "content": judge_system_prompt or "Jesteś sędzią-agregatorem. Stwórz konsensus."}]
    if history:
        messages.extend(history[-10:])

    messages.append({"role": "user", "content": user_prompt})

    print(f"   [>] Synteza końcowa ({judge_model})...")
    
    # Rozpoznanie dostawcy
    model_info = classify_model({"id": judge_model})
    provider = model_info.get("provider", "other")
    
    # Użyj klucza z api_keys jeśli dostępny
    effective_api_key = (api_keys or {}).get(provider) or (GOOGLE_API_KEY if provider == "google" else None)

    try:
        # A. Google Direct
        if provider == "google" and effective_api_key:
            content = await call_gemini_direct(
                model_id=judge_model,
                system_prompt=judge_system_prompt or "Jesteś sędzią-agregatorem.",
                user_prompt=user_prompt,
                history=history,
                temperature=LLM_TEMPERATURE,
                max_tokens=4000,
                api_key=effective_api_key
            )
            print(f"   [OK] Synteza gotowa (Google Direct)")
            return content

        # B. Default (OpenRouter / OpenAI)
        active_client = client
        custom_or_key = (api_keys or {}).get("openrouter")
        if custom_or_key:
            active_client = AsyncOpenAI(
                api_key=custom_or_key,
                base_url="https://openrouter.ai/api/v1",
                timeout=client.timeout
            )
            
        response = await active_client.chat.completions.create(
            model=judge_model,
            messages=messages,
            temperature=LLM_TEMPERATURE,
            max_tokens=4000, 
        )
        if not response or not response.choices:
             raise Exception(f"Sędzia {judge_model} nie zwrócił żadnej odpowiedzi.")
             
        content = response.choices[0].message.content or ""
        print(f"   [OK] Synteza gotowa ({len(content)} znaków)")
        return content
    except Exception as e:
        print(f"   [ERROR] Synthesizer Error: {e}")
        return f"[Synthesizer Error] {str(e)}"
