# ===========================================================================
# MOA LLM Agents — Równoległa analiza przez wielu ekspertów z retry
# ===========================================================================
"""
Odpowiada za:
  1. Wywołanie N modeli analitycznych RÓWNOLEGLE (asyncio.gather)
  2. Connection Pooling (dzielenie sesji HTTP między próbami)
  3. Exponential backoff z jitter dla 429/5xx
  4. Globalny Timeout dla całego konsylium
"""

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


from moa.prompts import TASK_PROMPTS, MASTER_PROMPT, SYSTEM_ROLES


# ---------------------------------------------------------------------------
# System Prompt — RYGORYSTYCZNY, zero-hallucynacji
# ---------------------------------------------------------------------------
ANALYST_SYSTEM_PROMPT = """## ZASADY ANALIZY I LEGAL REASONING:

1. **BAZUJ NA DOSTARCZONYCH ŹRÓDŁACH** — Twoje źródła prawdy to:
   - `<user_document>` — dokument użytkownika (stan faktyczny i treść klauzul). Może on składać się z wielu stron/zdjęć (np. kilka zdjęć jednej umowy) połączonych w jeden ciągły tekst. Analizuj go jako spójną całość — np. podpis ze strony 10 odnosi się do warunków ze strony 1.
   - `<legal_context>` — kontekst prawny, w którego skład wchodzi baza kodeksów i ustaw RAG oraz orzecznictwo sądowe i wyroki pobrane z API SAOS.
   NIE korzystaj z wiedzy domniemanej, pracuj ZAWSZE na tym wejściu.

2. **SZUKAJ STRATEGII I ROZWIĄZAŃ (Legal Reasoning)** — 
   - Twoim głównym zadaniem jest nie tylko "recenzować", ale znaleźć konkretne wyjścia z kłopotu i opracować strategię! 
   - Np.: "Jak przedawnić roszczenie?", "Jak uznać zapis za klauzulę abuzywną?". Używaj wyroków z SAOS jako twardej broni i kierunkowskazu. Jeśli dostarczone są starsze wyroki w podobnych sprawach, wskaż, by klient skorzystał z podobnej argumentacji w sądzie.

3. **ZAKAZ KONFABULACJI** — NIE wymyślaj artykułów, NIE wymyślaj sygnatur ani treści wyroków. Posługuj się jedynie tym, co widzisz w kontekście.

4. **ANALIZA DOKUMENTU** — Gdy dostarczony jest `<user_document>`:
   - Zbadaj pod lupą poszczególne akapity pod kątem nadużyć.

5. **STRUKTURA ODPOWIEDZI**:
   - Od razu uderzaj do setki: gdzie jest błąd / wada? Jak tę lukę w aktach wykorzystać lub obronić?
   - Wskaż na konkretne artykuły ustaw czy sygnatury z SAOS, aby Sędzia Agregacji wiedział z czego to wyciągnąłeś.
"""


def _build_analyst_user_prompt(
    context: str,
    query: str,
    has_legal_context: bool = True,
    document_text: str | None = None,
) -> str:
    """Buduje prompt użytkownika dla analityka z kontekstem, dokumentem i pytaniem."""

    # Gdy użytkownik dostarczył dokument — jest on źródłem głównym
    doc_section = ""
    if document_text and document_text.strip():
        doc_section = f"""<user_document>
{document_text}
</user_document>

---

"""

    if has_legal_context and context.strip():
        return f"""{doc_section}<legal_context>
{context}
</legal_context>

---

## PYTANIE UŻYTKOWNIKA:
{query}

---

## TWOJA ANALIZA PRAWNA (Context Enrichment):
{("Oto powyżej dokument użytkownika oraz przywołane przepisy prawne z bazy kodeksów i ustaw RAG, a także historyczne wyroki pobrane z API SAOS. \nZadanie: Zidentyfikuj niewygodne dla klienta interpretacje w dokumencie i bazując na prawie ugruntowanym oraz wyrokach, zaproponuj na tej bazie konkretne rozwiązania obronne (strategię).") if (document_text and document_text.strip()) else "Opierając się w 100% o dostarczone przepisy z bazy kodeksów i ustaw RAG oraz na orzecznictwie z SAOS API, zaproponuj strategię wyjścia krok po kroku i wskaż najlepszą opcję obrony dla klienta."}"""
    else:
        if document_text and document_text.strip():
            return f"""<user_document>
{document_text}
</user_document>

---

## PYTANIE UŻYTKOWNIKA:
{query}

---

## TWOJA ANALIZA PRAWNA (analizuj dokument użytkownika — brak dodatkowego kontekstu prawnego):"""
        else:
            return f"""## PYTANIE UŻYTKOWNIKA:
{query}

---

## TWOJA ANALIZA (Brak kontekstu prawnego - odpowiadaj jako ogólny asystent AI):"""


# ---------------------------------------------------------------------------
# Retry z Connection Pooling
# ---------------------------------------------------------------------------
async def _call_with_retry(
    client: AsyncOpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
) -> tuple[str, int]:
    """Wywołuje model LLM wykorzystując przekazany, współdzielony klient."""
    last_error: Optional[Exception] = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=LLM_TEMPERATURE,
            )
            return response.choices[0].message.content or "", attempt

        except APIStatusError as e:
            last_error = e
            status = e.status_code
            if status in RETRYABLE_STATUS_CODES and attempt < MAX_RETRIES:
                delay = min(
                    RETRY_BASE_DELAY * (2**attempt) + random.uniform(0, 1),
                    RETRY_MAX_DELAY,
                )
                print(
                    f"⚡ {model}: HTTP {status}, retry {attempt + 1}/{MAX_RETRIES} za {delay:.1f}s"
                )
                await asyncio.sleep(delay)
                continue
            raise

        except (APIConnectionError, APITimeoutError) as e:
            last_error = e
            if attempt < MAX_RETRIES:
                delay = min(
                    RETRY_BASE_DELAY * (2**attempt) + random.uniform(0, 1),
                    RETRY_MAX_DELAY,
                )
                print(
                    f"⚡ {model}: Błąd/Timeout ({type(e).__name__}), retry {attempt + 1}/{MAX_RETRIES} za {delay:.1f}s"
                )
                await asyncio.sleep(delay)
                continue
            raise

    if last_error is not None:
        raise last_error
    raise Exception(f"{model}: Wyczerpano próby")


# ---------------------------------------------------------------------------
# Analiza jednym modelem
# ---------------------------------------------------------------------------
async def _analyze_single(
    client: AsyncOpenAI,
    model: str,
    context: str,
    query: str,
    system_prompt: str,
    has_legal_context: bool = True,
    document_text: str | None = None,
) -> AnalystResult:
    """Kontener na pojedyncze wywołanie modelu."""
    start = time.perf_counter()
    user_prompt = _build_analyst_user_prompt(
        context, query, has_legal_context, document_text
    )

    try:
        response, retries = await _call_with_retry(
            client, model, system_prompt, user_prompt
        )
        latency = (time.perf_counter() - start) * 1000
        print(f"✅ {model}: OK ({latency:.0f}ms, retries: {retries})")
        return AnalystResult(
            model_id=model,
            response=response,
            success=True,
            latency_ms=latency,
            retries_used=retries,
        )

    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        error_msg = f"{type(e).__name__}: {str(e)[:300]}"
        print(f"❌ {model}: FAILED ({latency:.0f}ms) — {error_msg}")
        return AnalystResult(
            model_id=model,
            response="",
            success=False,
            error=error_msg,
            latency_ms=latency,
        )


# ---------------------------------------------------------------------------
# GŁÓWNA FUNKCJA: Równoległa analiza
# ---------------------------------------------------------------------------
async def run_parallel_analysis(
    context: str,
    query: str,
    models: list[str] | None = None,
    task: Optional[str] = "general",
    custom_task_prompt: Optional[str] = None,
    architect_prompt: Optional[str] = None,
    system_role_prompt: Optional[str] = None,
    client: Optional[AsyncOpenAI] = None,
    has_legal_context: bool = True,
    document_text: Optional[str] = None,
) -> list[AnalystResult]:
    """Wysyła zapytanie do N modeli RÓWNOLEGLE z współdzieloną sesją HTTP (Connection Pooling)."""
    models = models or DEFAULT_ANALYST_MODELS
    task = task or "general"

    # Budowa promptu
    base_architect = architect_prompt or MASTER_PROMPT
    base_role = system_role_prompt or SYSTEM_ROLES.get(
        task, SYSTEM_ROLES.get("navigator", "")
    )
    base_task = custom_task_prompt or TASK_PROMPTS.get(
        task, TASK_PROMPTS.get("general", "")
    )

    # Dostosuj system prompt gdy nie ma kontekstu prawnego
    if has_legal_context:
        final_system_prompt = (
            f"{base_architect}\n\n{base_role}\n\n{base_task}\n\n{ANALYST_SYSTEM_PROMPT}"
        )
    else:
        # Uproszczony prompt dla trybu ogólnego LLM
        final_system_prompt = f"{base_architect}\n\n{base_role}\n\n{base_task}\n\nJesteś pomocnym asystentem AI. Odpowiedz na pytanie użytkownika w sposób zwięzły i merytoryczny."

    print(f"\n🔬 MOA: {len(models)} modeli równolegle (Task: {task})")
    start = time.perf_counter()

    async def _execute_with_client(shared_client: AsyncOpenAI):
        # Create concrete tasks to track them clearly
        tasks = [
            asyncio.create_task(
                _analyze_single(
                    shared_client,
                    model,
                    context,
                    query,
                    final_system_prompt,
                    has_legal_context,
                    document_text,
                )
            )
            for model in models
        ]

        # Wait with total timeout, allowing partial results to be collected
        done, pending = await asyncio.wait(tasks, timeout=GLOBAL_MOA_TIMEOUT)

        results = []
        for i, task in enumerate(tasks):
            model_name = models[i]
            if task in done:
                try:
                    results.append(task.result())
                except Exception as e:
                    results.append(
                        AnalystResult(
                            model_id=model_name,
                            response="",
                            success=False,
                            error=str(e),
                        )
                    )
            else:
                # Non-finished tasks are cancelled and reported as timeout
                print(
                    f"⚠️ {model_name}: GLOBAL TIMEOUT ({GLOBAL_MOA_TIMEOUT}s) przekroczony. Przerywam zadanie."
                )
                task.cancel()
                results.append(
                    AnalystResult(
                        model_id=model_name,
                        response="[Błąd: Timeout globalny konsylium]",
                        success=False,
                        error=f"Timeout globalny > {GLOBAL_MOA_TIMEOUT}s",
                    )
                )

        return results

    if client:
        results = await _execute_with_client(client)
    else:
        # Tworzymy lokalny klient tylko jeśli nie przekazano globalnego (np. w API dla Single Model)
        async with AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=LLM_TIMEOUT,
            default_headers={
                "HTTP-Referer": "http://127.0.0.1:8003",
                "X-Title": "LexMind AI",
            },
        ) as new_client:
            results = await _execute_with_client(new_client)

    total = (time.perf_counter() - start) * 1000
    print(f"📊 MOA zakończone po {total:.0f}ms")
    return results
