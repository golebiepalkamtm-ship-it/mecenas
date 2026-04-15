# ===========================================================================
# MOA LLM Agents — Równoległa analiza przez wielu ekspertów z retry
# ===========================================================================

import asyncio
import random
import time
from typing import Optional, cast, Dict, List
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
from moa.gemini_client import call_gemini_direct
from moa.config import GOOGLE_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY

ANALYST_SYSTEM_PROMPT = """[ROLE: LEGAL_EXPERT_ANALYST]
Jesteś najwyższej klasy analitykiem prawnym. Twoim zadaniem jest rygorystyczne oddzielenie stanu faktycznego od podstawy prawnej.

ZASADY ANALIZY (KRYTYCZNE):
1. WIEDZA PRAWNA (USTAWY, WYROKI): Czerp ją WYŁĄCZNIE z sekcji <legal_context>. Nie szukaj przepisów w dokumentach użytkownika i nie zmyślaj paragrafów. Jeśli czegoś nie ma w RAG, przyznaj to.
2. STAN FAKTYCZNY (FAKTY SPRAWY): Czerp go z sekcji <user_document>, historii rozmowy oraz aktualnej wiadomości. To tutaj znajdują się daty, nazwiska i opisy zdarzeń Twojego klienta.
3. LOGIKA: Nałóż prawo z <legal_context> na fakty z <user_document>.
4. DOKŁADNOŚĆ: Zawsze podawaj nazwę aktu prawnego i numer artykułu, na który się powołujesz, ale TYLKO jeśli znajduje się on w <legal_context>.
5. ADVERSARIAL THINKING: Szukaj słabych punktów w oskarżeniu/decyzji na podstawie faktów klienta, stosując twarde prawo z bazy wiedzy.
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
        # Truncate if too long to save tokens (40k chars is ~10k tokens)
        display_text = document_text
        if len(display_text) > 40_000:
            display_text = display_text[:40_000] + "\n... [TREŚĆ OBCIĘTA ZE WZGLĘDU NA LIMIT KONTEKSTU] ..."
        doc_section = f"<user_document>\n{display_text}\n</user_document>\n\n"

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
    api_keys: Optional[Dict[str, str]] = None,
    attachments: list[dict] | None = None,
) -> tuple[str, int]:
    """Retry z obsługą wielu dostawców i Multi-modality."""
    
    # 1. Rozpoznanie dostawcy
    from moa.config import classify_model
    model_info = classify_model({"id": model})
    provider = model_info.get("provider", "other")
    
    # Użyj klucza z api_keys jeśli dostępny
    effective_api_key = (api_keys or {}).get(provider) or (GOOGLE_API_KEY if provider == "google" else OPENAI_API_KEY)

    for attempt in range(MAX_RETRIES + 1):
        print(f"   [>] Ekspert {model} ({provider}) (próba {attempt+1})...")
        try:
            # Przygotowanie contentu (text + images)
            user_content = [{"type": "text", "text": user_prompt}]
            if attachments:
                # Dodaj tylko obrazy, bo teksty są już w user_prompt
                images = [a for a in attachments if a.get("type") == "image_url"]
                user_content.extend(images)

            # A. GOOGLE DIRECT
            if provider == "google" and effective_api_key:
                # Uwaga: call_gemini_direct musi wspierać listę w user_prompt
                content = await call_gemini_direct(
                    model_id=model,
                    system_prompt=system_prompt,
                    user_prompt=user_content if attachments else user_prompt,
                    history=history,
                    temperature=LLM_TEMPERATURE,
                    max_tokens=max_tokens
                )
                print(f"   [OK] Ekspert {model} (Google Direct) ukończył analizę.")
                return content, attempt

            # C. OPENROUTER / DEFAULT (AsyncOpenAI)
            messages = [{"role": "system", "content": system_prompt}]
            if history:
                hist_subset = history[-10:]
                if hist_subset and hist_subset[-1].get("role") == "user":
                     hist_subset = hist_subset[:-1]
                messages.extend(hist_subset)
            
            messages.append({"role": "user", "content": user_content})

            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=LLM_TEMPERATURE,
                max_tokens=max_tokens,
            )
            
            if not response or not response.choices:
                 raise Exception(f"Model {model} zwrócił pustą odpowiedź.")
            
            content = response.choices[0].message.content or ""
            print(f"   [OK] Ekspert {model} ({provider}) ukończył analizę.")
            return content, attempt

        except Exception as e:
            if attempt < MAX_RETRIES:
                wait = RETRY_BASE_DELAY * (2**attempt)
                print(f"   [!] Błąd {model}: {str(e)[:100]}... Ponawiam za {wait}s")
                await asyncio.sleep(wait)
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
    api_keys: Optional[Dict[str, str]] = None,
    attachments: list[dict] | None = None,
) -> AnalystResult:
    start = time.perf_counter()
    user_prompt = _build_analyst_user_prompt(
        context, query, has_legal_context, document_text, history_summary, history=None, expert_memory=expert_memory
    )
    try:
        response, retries = await _call_with_retry(
            client, model, system_prompt, user_prompt, history=history, api_keys=api_keys, attachments=attachments
        )
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
    expert_roles: Optional[Dict[str, str]] = None,
    expert_role_prompts: Optional[Dict[str, str]] = None,
    client: Optional[AsyncOpenAI] = None,
    has_legal_context: bool = True,
    document_text: Optional[str] = None,
    history_summary: Optional[str] = None,
    history: list[dict[str, str]] | None = None,
    expert_memory: str | None = None,
    mode: IdentityMode = IdentityMode.ADVOCATE,
    api_keys: Optional[Dict[str, str]] = None,
    attachments: list[dict] | None = None,
) -> List[AnalystResult]:
    models = models or DEFAULT_ANALYST_MODELS
    pb_config = PromptConfig(mode=mode, task=task or "general", has_legal_context=has_legal_context, has_document=bool(document_text))
    model_prompts = build_moa_prompts(models, pb_config)
    
    if expert_roles and expert_role_prompts:
        from moa.prompt_builder import DEFENSE_UNIVERSE, PROSECUTION_UNIVERSE, COMMUNICATION_LAYER
        universe = DEFENSE_UNIVERSE if mode == IdentityMode.ADVOCATE else PROSECUTION_UNIVERSE
        identity = universe["identity"]
        task_prompt = universe["tasks"].get(task or "general", "")
        epistemic = "## WARUNKI BRZEGOWE (EPISTEMIC LAYER):\n1. Każdy fakt MUSI pochodzić z dokumentów lub RAG.\n2. Nie twórz fałszywych przepisów."
        
        for mid in models:
            role_key = expert_roles.get(mid)
            if role_key and role_key in expert_role_prompts:
                custom_role = expert_role_prompts[role_key]
                model_prompts[mid] = f"{identity}\n\n{epistemic}\n\n{COMMUNICATION_LAYER}\n\n{custom_role}\n\n{task_prompt}".strip()
                print(f"   [PROMPT Override] Zastosowano rolę '{role_key}' dla {mid}")
    
    start = time.perf_counter()
    async def _execute_with_client(shared_client: AsyncOpenAI):
        tasks = [asyncio.create_task(_analyze_single(shared_client, model, context, query, model_prompts.get(model, ""), has_legal_context, document_text, history_summary, history, expert_memory, api_keys=api_keys, attachments=attachments)) for model in models]
        done, _ = await asyncio.wait(tasks, timeout=GLOBAL_MOA_TIMEOUT)
        return [t.result() if t in done else AnalystResult(model_id=models[i], response="", success=False, error="Timeout") for i, t in enumerate(tasks)]

    if client:
        return await _execute_with_client(client)
    async with AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL) as new_client:
        return await _execute_with_client(new_client)
