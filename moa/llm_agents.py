# ===========================================================================
# MOA LLM Agents — Równoległa analiza przez wielu ekspertów z retry
# ===========================================================================

import asyncio
import random
import time
from typing import Optional, cast
from openai import AsyncOpenAI, APIStatusError, APIConnectionError, APITimeoutError

from moa.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    DEFAULT_ANALYST_MODELS,
    MAX_RETRIES,
    RETRY_BASE_DELAY,
    RETRY_MAX_DELAY,
    RETRYABLE_STATUS_CODES,
    LLM_TEMPERATURE,
    LLM_TIMEOUT,
    GLOBAL_MOA_TIMEOUT,
)
from moa.models import AnalystResult
from moa.prompt_builder import (
    build_moa_prompts,
    PromptConfig,
    IdentityMode,
    DEFENSE_UNIVERSE,
    PROSECUTION_UNIVERSE,
)

ANALYST_SYSTEM_PROMPT = """[ROLE: LEGAL_EXPERT_ANALYST]
Jesteś wybitnym ekspertem prawnym powołanym do rygorystycznej analizy stanu faktycznego i prawnego.
TWOJE ZADANIA:
1. Przeanalizuj dostarczony <legal_context> oraz <user_document> pod kątem zapytania.
2. Zidentyfikuj konkretne podstawy prawne (artykuły, paragrafy) mające zastosowanie.
3. Wskaż ryzyka i szanse procesowe wynikające z Twojej specjalizacji.
4. Przedstaw logiczne wnioskowanie, które doprowadziło Cię do konkluzji.

WYMOGI FORMALNE:
- Pisz w sposób profesjonalny, surowy i precyzyjny.
- Każde twierdzenie prawne musi mieć zakotwiczenie w dostarczonym kontekście.
- Jeśli Twoja analiza koliduje z poprzednimi ustaleniami (patrz: expert_memory_cache), wyjaśnij dlaczego nowa interpretacja jest właściwsza.
"""

def _build_analyst_user_prompt(
    context: str,
    query: str,
    has_legal_context: bool = True,
    document_text: str | None = None,
    history_summary: str | None = None,
    history: list[dict[str, str]] | None = None,
    expert_memory: str | None = None,
) -> str:
    """Buduje prompt użytkownika dla analityka z kontekstem, dokumentem, historią i pamięcią."""
    
    memory_section = ""
    if expert_memory:
        memory_section = f"<expert_memory_cache>\n## TWOJE POPRZEDNIE USTALENIA Z TEJ SESJI:\n{expert_memory}\n</expert_memory_cache>\n\n"

    doc_section = ""
    if document_text and document_text.strip():
        doc_section = f"<user_document>\n{document_text}\n</user_document>\n\n"

    history_section = ""
    if history_summary:
        history_section += f"<conversation_summary>\n{history_summary}\n</conversation_summary>\n\n"

    if history:
        history_section += "## OSTATNIE WIADOMOŚCI:\n"
        for msg in history:
            role = "Klient" if msg.get("role") == "user" else "Twoja poprzednia odpowiedź"
            history_section += f"- {role}: {msg.get('content', '')}\n"
        history_section += "\n"

    rag_section = ""
    if has_legal_context and context.strip():
        rag_section = f"<legal_context>\n{context}\n</legal_context>\n\n"
        instruction = "Zaproponuj konkretną strategię w oparciu o dostarczony RAG i fakty."
    else:
        instruction = "Odpowiedz merytorycznie na podstawie dostępnych informacji."

    return f"{memory_section}{doc_section}{rag_section}{history_section}## PYTANIE UŻYTKOWNIKA:\n{query}\n\n--- ZADANIE: {instruction} ---"

async def _call_with_retry(
    client: AsyncOpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
    history: list[dict[str, str]] | None = None,
    max_tokens: int = 2500,
) -> tuple[str, int]:
    """Retry z obsługą historii i eliminacją podwójnych wiadomości użytkownika."""
    messages = [{"role": "system", "content": system_prompt}]
    
    if history:
        hist_subset = history[-10:]
        if hist_subset and hist_subset[-1].get("role") == "user":
             hist_subset = hist_subset[:-1]
        messages.extend(hist_subset)
    
    messages.append({"role": "user", "content": user_prompt})

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=LLM_TEMPERATURE,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content or "", attempt
        except Exception as e:
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BASE_DELAY * (2**attempt))
                continue
            raise e
    raise Exception(f"{model}: Wyczerpano próby")

async def _analyze_single(
    client: AsyncOpenAI,
    model: str,
    context: str,
    query: str,
    system_prompt: str,
    has_legal_context: bool = True,
    document_text: str | None = None,
    history_summary: str | None = None,
    history: list[dict[str, str]] | None = None,
    expert_memory: str | None = None,
) -> AnalystResult:
    start = time.perf_counter()
    user_prompt = _build_analyst_user_prompt(
        context, query, has_legal_context, document_text, history_summary, history=None, expert_memory=expert_memory
    )
    try:
        response, retries = await _call_with_retry(client, model, system_prompt, user_prompt, history=history)
        return AnalystResult(model_id=model, response=response, success=True, latency_ms=(time.perf_counter()-start)*1000, retries_used=retries)
    except Exception as e:
        return AnalystResult(model_id=model, response="", success=False, error=str(e), latency_ms=(time.perf_counter()-start)*1000)

async def run_parallel_analysis(
    context: str,
    query: str,
    models: list[str] | None = None,
    task: Optional[str] = "general",
    custom_task_prompt: Optional[str] = None,
    architect_prompt: Optional[str] = None,
    system_role_prompt: Optional[str] = None,
    expert_roles: list[str] | None = None,
    expert_role_prompts: dict[str, str] | None = None,
    client: Optional[AsyncOpenAI] = None,
    has_legal_context: bool = True,
    document_text: Optional[str] = None,
    history_summary: Optional[str] = None,
    history: list[dict[str, str]] | None = None,
    expert_memory: str | None = None,
    mode: IdentityMode = IdentityMode.ADVOCATE,
) -> list[AnalystResult]:
    models = models or DEFAULT_ANALYST_MODELS
    pb_config = PromptConfig(mode=mode, task=task or "general", has_legal_context=has_legal_context, has_document=bool(document_text))
    model_prompts = build_moa_prompts(models, pb_config)
    
    start = time.perf_counter()
    async def _execute_with_client(shared_client: AsyncOpenAI):
        tasks = [asyncio.create_task(_analyze_single(shared_client, model, context, query, model_prompts.get(model, ""), has_legal_context, document_text, history_summary, history, expert_memory)) for model in models]
        done, _ = await asyncio.wait(tasks, timeout=GLOBAL_MOA_TIMEOUT)
        return [t.result() if t in done else AnalystResult(model_id=models[i], response="", success=False, error="Timeout") for i, t in enumerate(tasks)]

    if client:
        return await _execute_with_client(client)
    async with AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL) as new_client:
        return await _execute_with_client(new_client)
