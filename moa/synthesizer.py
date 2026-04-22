# ===========================================================================
# MOA Synthesizer — Główny Mecenas-Agregator (Finalna Opinia Prawna)
# ===========================================================================

import time
import asyncio
import logging
from typing import Optional, Any
from openai import AsyncOpenAI

from moa.config import (
    DEFAULT_JUDGE_MODEL,
    LLM_TEMPERATURE,
    LLM_TIMEOUT,
    get_safe_max_tokens,
)
from moa.models import AnalystResult, MOAResult
from moa.prompt_builder import IdentityMode
from moa.gemini_client import call_gemini_direct
from moa.config import GOOGLE_API_KEY, classify_model

logger = logging.getLogger("LexMindSynthesizer")

# Modele zapasowe na wypadek awarii głównego sędziego
FALLBACK_JUDGE_MODELS = [
    "openai/gpt-5.4",
    "google/gemini-2.5-pro-preview",
    "anthropic/claude-sonnet-4.6",
    "google/gemini-3-flash-preview",
]


def _build_judge_prompt(
    query: str,
    analyst_results: list[AnalystResult],
    raw_context: str,
    document_text: str | None = None,
    history_summary: str | None = None,
    expert_memory: str | None = None,
) -> str:
    """Buduje bogaty prompt dla głównego stratega-agregatora z wynikami ekspertów."""
    if document_text and len(document_text) > 30_000:
        document_text = document_text[:30_000] + "\n... [TREŚĆ DOKUMENTU OBCIĘTA] ..."

    doc_section = (
        f"<user_document>\n{document_text}\n</user_document>\n\n"
        if document_text
        else ""
    )
    hist_section = (
        f"## PODSUMOWANIE HISTORII:\n{history_summary}\n\n" if history_summary else ""
    )
    memory_section = (
        f"<expert_memory_cache>\n{expert_memory}\n</expert_memory_cache>\n\n"
        if expert_memory
        else ""
    )

    rag_section = ""
    if raw_context and raw_context.strip():
        rag_section = f"<legal_context>\n{raw_context}\n</legal_context>\n\n"

    parts = [
        "## PYTANIE KLIENTA:",
        query,
        "",
        memory_section,
        doc_section,
        hist_section,
        rag_section,
        "## ANALIZY ZESPOŁU EKSPERTÓW (RÓŻNE PERSPEKTYWY):",
    ]

    for r in analyst_results:
        status = "[SUKCES]" if r.success else "[BŁĄD/BRAK DANYCH]"
        parts.append(f"### EKSPERT ({status}): {r.model_id}\n{r.response}\n")

    has_case = bool(document_text and document_text.strip())

    if has_case:
        parts.append("""\n## TWOJE ZADANIE JAKO GŁÓWNY MECENAS (klient ma konkretną sprawę):
Napisz SPÓJNĄ I WYCZERPUJĄCĄ OPINIĘ PRAWNĄ w formie płynnej prozy (akapity). BEZWZGLĘDNY ZAKAZ: tabel markdown, surowego tekstu z dokumentów/OCR, metadanych technicznych, list "Przepis | Konsekwencje".

STRUKTURA OPINII:
- Stan faktyczny (2-3 zdania streszczenia sytuacji)
- Podstawa prawna (analiza przepisów z powołaniem na artykuły i referencjami [1], [2])
- Zidentyfikowane naruszenia i argumentacja do wykorzystania
- Rekomendowane działania (szczegółowe kroki z terminami)
- Projekt/Szkic wniosku lub pisma procesowego

Jesteś adwokatem klienta — bądź stronniczy, szukaj błędów organu. Wyłuskaj z <legal_context> przepisy, których mogli nie zauważyć eksperci.
JĘZYK: ZAWSZE po polsku. Ton: formalny, profesjonalny.""")
    else:
        parts.append("""\n## TWOJE ZADANIE JAKO GŁÓWNY MECENAS (pytanie informacyjne):
Napisz SPÓJNĄ ODPOWIEDŹ PRAWNĄ w formie płynnej prozy. BEZWZGLĘDNY ZAKAZ: tabel markdown.

STRUKTURA:
- Wyjaśnienie przepisów (art. + referencje [1], [2])
- Interpretacja praktyczna
- Rekomendacje dla użytkownika

JĘZYK: ZAWSZE po polsku.""")

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
    """Finalna synteza odpowiedzi przez model sędziego z systemem Fallback."""
    user_prompt = _build_judge_prompt(
        query,
        analyst_results,
        raw_context,
        document_text,
        history_summary,
        expert_memory,
    )
    system_prompt = (
        judge_system_prompt
        or "Jesteś Głównym Mecenasem. Stworzysz spójną opinię prawną dla klienta. Pisz płynną prozą, bez tabel. Używaj poprawnej polszczyzny i diakrytyki."
    )

    models_to_try = [judge_model] + [
        m for m in FALLBACK_JUDGE_MODELS if m != judge_model
    ]

    for current_model in models_to_try:
        try:
            print(f"   [>] Próba syntezy końcowej ({current_model})...")

            model_info = classify_model({"id": current_model})
            provider = model_info.get("provider", "other")
            effective_api_key = (api_keys or {}).get(provider) or (
                GOOGLE_API_KEY if provider == "google" else None
            )

            content = ""
            # A. Google Direct Path
            if provider == "google" and effective_api_key:
                content = await call_gemini_direct(
                    model_id=current_model,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    history=history,
                    temperature=LLM_TEMPERATURE,
                    max_tokens=8000,
                    use_google_search=True, # Final fact check with Google Search
                    api_key=effective_api_key,
                )

            # B. OpenRouter / OpenAI Path
            else:
                active_client = client
                custom_or_key = (api_keys or {}).get("openrouter")
                if custom_or_key:
                    from openai import AsyncOpenAI as AsyncOpenAIClient

                    active_client = AsyncOpenAIClient(
                        api_key=custom_or_key,
                        base_url="https://openrouter.ai/api/v1",
                        timeout=LLM_TIMEOUT,
                    )

                try:
                    response = await active_client.chat.completions.create(
                        model=current_model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        temperature=LLM_TEMPERATURE,
                        max_tokens=get_safe_max_tokens(current_model),
                    )
                except Exception as e:
                    if hasattr(e, "status_code") and e.status_code == 402:
                        from moa.config import FREE_FALLBACK_MODELS

                        print(
                            f"   [!] Judge 402. Cycling through FREE fallback models..."
                        )
                        content = ""
                        for fallback_model in FREE_FALLBACK_MODELS:
                            try:
                                response = await active_client.chat.completions.create(
                                    model=fallback_model,
                                    messages=[
                                        {"role": "system", "content": system_prompt},
                                        {"role": "user", "content": user_prompt},
                                    ],
                                    temperature=LLM_TEMPERATURE,
                                    max_tokens=get_safe_max_tokens(fallback_model),
                                )
                                content = response.choices[0].message.content or ""
                                if content:
                                    break
                            except:
                                continue
                        if not content:
                            raise e
                    else:
                        raise e
                if response and response.choices:
                    content = response.choices[0].message.content or ""

            # Walidacja jakości odpowiedzi
            if content and len(content.strip()) > 100:
                print(f"   [OK] Opinia Mecenasa gotowa ({len(content)} znaków).")
                return content
            else:
                print(
                    f"   [WARN] Model {current_model} zwrócił pustą lub zbyt krótką odpowiedź. Próba fallback..."
                )

        except Exception as e:
            print(f"   [ERROR] Błąd modelu {current_model}: {e}. Próba fallback...")
            await asyncio.sleep(1)  # Krótki odpoczynek przed retry

    return "❌ [KRYTYCZNY BŁĄD MECENASA] Wszystkie modele syntezy zawiodły. Spróbuj wybrać inny model bazowy w ustawieniach."
