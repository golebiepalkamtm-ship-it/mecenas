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
    is_vision_model,
    get_safe_max_tokens,
    MOA_EARLY_EXIT_TIMEOUT,
    get_user_profile_models,
    get_admin_models,
    get_models_with_latency_check,
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
from utils.token_counter import count_tokens, truncate_to_tokens

ANALYST_RAG_DIRECTIVE = """[KRYTYCZNA DYREKTYWA: OBOWIĄZKOWE UŻYCIE BAZY RAG]
Jesteś analitykiem prawnym. Twoja odpowiedź MUSI opierać się na przepisach z <legal_context>.

ZASADY BEZWZGLĘDNE:
1. WIEDZA PRAWNA: Czerp ją WYŁĄCZNIE z <legal_context>. NIE zmyślaj artykułów. Jeśli czegoś nie ma w RAG — napisz to wprost.
2. CYTOWANIE INLINE: Każde stwierdzenie oparte na RAG MUSI mieć przypis źródłowy w postaci numeru np. [1], [2]. Odpowiedź BEZ cytowań uziemiających [num] jest NIEDOPUSZCZALNA.
3. JĘZYK: ZAWSZE po polsku, gdy użytkownik pisze po polsku.

ADAPTACJA TRYBU (KRYTYCZNE):
- TRYB INFORMACYJNY: Gdy użytkownik pyta "co mówi art. X?", "wyjaśnij przepis", "co to znaczy" — odpowiedz rzeczowo i klarownie: wyjaśnij treść przepisu, podaj konkretne ustępy/punkty z <legal_context>, wskaż konsekwencje prawne, podaj orzecznictwo jeśli jest dostępne. NIE generuj strategii bojowej ani pism procesowych.
- TRYB BOJOWY: Gdy użytkownik opisuje swój problem, załącza dokument, pisze o decyzji organu, zarzutach, sprawie — WÓWCZAS i TYLKO WÓWCZAS generuj agresywną strategię: punkty ataku, gotowe formuły pism, warianty awaryjne.
- Rozróżniaj to na podstawie TREŚCI pytania i obecności <user_document>.
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
        # Profesjonalne ucinanie na poziomie tokenów
        display_text = truncate_to_tokens(document_text, 15000)
        doc_section = f"<user_document>\n{display_text}\n</user_document>\n\n"

    history_section = ""
    if history_summary:
        history_section += (
            f"<conversation_summary>\n{history_summary}\n</conversation_summary>\n\n"
        )

    if history:
        history_section += "## OSTATNIE WIADOMOŚCI:\n"
        for msg in history:
            role = (
                "Klient" if msg.get("role") == "user" else "Twoja poprzednia odpowiedź"
            )
            history_section += f"- {role}: {msg.get('content', '')}\n"
        history_section += "\n"

    rag_section = ""
    if has_legal_context and context.strip():
        rag_section = f"<legal_context>\n{context}\n</legal_context>\n\n"

    # Adaptacyjna instrukcja na podstawie obecności dokumentu i typu pytania
    has_case = bool(document_text and document_text.strip())

    if has_legal_context and has_case:
        # TRYB BOJOWY: klient ma dokument/sprawę + mamy przepisy
        instruction = (
            "BEZWZGLĘDNE ZADANIE (TRYB STRATEGICZNY): Klient ma konkretną sprawę. "
            "Przeanalizuj <legal_context> i zidentyfikuj KAŻDY artykuł chroniący klienta. "
            "Wypisz punkty ataku z precyzyjnymi odwołaniami. "
            "Wygeneruj gotowy akapit do pisma procesowego. "
            "Dodaj wariant awaryjny."
        )
    elif has_legal_context:
        # TRYB INFORMACYJNY: pytanie o przepis bez konkretnej sprawy
        instruction = (
            "ZADANIE (TRYB INFORMACYJNY): Użytkownik pyta o przepisy. "
            "Wyjaśnij KONKRETNIE treść przepisów z <legal_context>: co mówią, jakie mają konsekwencje, "
            "jakie są ustępy i punkty, jakie kary/sankcje/uprawnienia przewidują. "
            "Przytocz orzecznictwo jeśli dostępne. Pisz rzeczowo i klarownie. "
            "NIE generuj strategii bojowej, punktów ataku ani pism procesowych — chyba że użytkownik wprost o to poprosi."
        )
    else:
        instruction = (
            "Odpowiedz merytorycznie. Wskaż, jakich przepisów brakuje w bazie."
        )

    return f"{memory_section}{doc_section}{rag_section}{history_section}## PYTANIE UŻYTKOWNIKA:\n{query}\n\n--- {instruction} ---"


async def _call_with_retry(
    client: AsyncOpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
    history: list[dict[str, str]] | None = None,
    max_tokens: int = 10000,
    api_keys: Optional[Dict[str, str]] = None,
    attachments: list[dict] | None = None,
    model_latencies: Optional[Dict[str, float]] = None,
) -> tuple[str, int]:
    """Retry z obsługą wielu dostawców, prędkości i inteligentnego fallbacku."""

    # 1. Rozpoznanie dostawcy
    from moa.config import classify_model

    model_info = classify_model({"id": model})
    provider = model_info.get("provider", "other")
    is_free = model_info.get("free", False)

    # Użyj klucza z api_keys jeśli dostępny
    effective_api_key = (api_keys or {}).get(provider) or (
        GOOGLE_API_KEY if provider == "google" else OPENAI_API_KEY
    )

    # Agresywny timeout dla darmowych modeli, aby nie blokować sesji
    current_timeout = 30.0 if is_free else LLM_TIMEOUT
    # Darmowe modele: max 1 retry (zamiast 3), aby nie marnować 5+ minut
    effective_retries = 1 if is_free else MAX_RETRIES

    for attempt in range(effective_retries + 1):
        print(
            f"   [>] Ekspert {model} ({provider}) (próba {attempt + 1}/{effective_retries + 1}, timeout={current_timeout}s)..."
        )
        try:
            user_content = [{"type": "text", "text": user_prompt}]
            if attachments and is_vision_model(model):
                images = [a for a in attachments if a.get("type") == "image_url"]
                user_content.extend(images)

            # A. GOOGLE DIRECT
            if provider == "google" and effective_api_key:
                content = await asyncio.wait_for(
                    call_gemini_direct(
                        model_id=model,
                        system_prompt=system_prompt,
                        user_prompt=user_content if attachments else user_prompt,
                        history=history,
                        temperature=LLM_TEMPERATURE,
                        max_tokens=max_tokens,
                        use_google_search=True, # Enable Google Search for Gemini analysis
                    ),
                    timeout=current_timeout,
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
                max_tokens=get_safe_max_tokens(model, max_tokens),
                timeout=current_timeout,
            )

            if not response or not response.choices:
                raise Exception(f"Model {model} zwrócił pustą odpowiedź.")

            content = response.choices[0].message.content or ""
            print(f"   [OK] Ekspert {model} ({provider}) ukończył analizę.")
            return content, attempt

        except Exception as e:
            if attempt < effective_retries:
                wait = min(RETRY_BASE_DELAY * (2**attempt) + random.random() * 0.3, 3.0)
                print(f"   [!] Błąd {model}: {str(e)[:100]}... Ponawiam za {wait:.1f}s")
                await asyncio.sleep(wait)
                continue

            # --- AUTO-REPAIR: SMART FALLBACK LOOP ---
            error_status = getattr(e, "status_code", None)
            print(
                f"   [LLM ERR] Błąd modelu {model}. Status: {error_status}, Error: {str(e)[:80]}"
            )

            if (
                error_status in [402, 429]
                or error_status is None
                or isinstance(e, asyncio.TimeoutError)
            ):
                from moa.config import FREE_FALLBACK_MODELS

                # KRYTYCZNE: Wyklucz model, który właśnie zawiódł!
                fallbacks = [m for m in FREE_FALLBACK_MODELS if m != model]
                if model_latencies:
                    fallbacks.sort(key=lambda m: model_latencies.get(m, 9999))

                print(
                    f"   [NAPRAWA] Szukam zamiennika (wykluczam {model.split('/')[-1]})..."
                )

                for idx, fallback_model in enumerate(fallbacks[:3], 1):
                    try:
                        print(
                            f"   [FALLBACK {idx}/3] Próba: {fallback_model} (timeout=15s)..."
                        )
                        response = await client.chat.completions.create(
                            model=fallback_model,
                            messages=messages,
                            temperature=LLM_TEMPERATURE,
                            max_tokens=get_safe_max_tokens(fallback_model, max_tokens),
                            timeout=15.0,
                        )
                        if response and response.choices:
                            content = response.choices[0].message.content or ""
                            if content:
                                print(f"   [OK] Model {fallback_model} uratował sesję!")
                                return content, attempt
                    except Exception:
                        print(f"   [FAIL {idx}/3] {fallback_model} zawiódł.")

                print(f"   [FAIL ALL] Brak działających modeli zastępczych.")
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
    model_latencies: Optional[Dict[str, float]] = None,
) -> AnalystResult:
    start = time.perf_counter()
    # KRYTYCZNE: Prepend dyrektywy RAG do system prompta — bez tego modele ignorują <legal_context>
    full_system_prompt = f"{ANALYST_RAG_DIRECTIVE}\n\n{system_prompt}"
    user_prompt = _build_analyst_user_prompt(
        context,
        query,
        has_legal_context,
        document_text,
        history_summary,
        history=None,
        expert_memory=expert_memory,
    )
    try:
        response, retries = await _call_with_retry(
            client,
            model,
            full_system_prompt,
            user_prompt,
            history=history,
            api_keys=api_keys,
            attachments=attachments,
            model_latencies=model_latencies,
        )
        return AnalystResult(
            model_id=model,
            response=response,
            success=True,
            latency_ms=(time.perf_counter() - start) * 1000,
            retries_used=retries,
        )
    except Exception as e:
        return AnalystResult(
            model_id=model,
            response="",
            success=False,
            error=str(e),
            latency_ms=(time.perf_counter() - start) * 1000,
        )


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
    architect_plan=None,
    model_latencies: Optional[Dict[str, float]] = None,
    user_id: str = "default",
) -> List[AnalystResult]:
    if models is None:
        # Use user-selected models with latency check, fallback to admin models, then defaults
        user_models = get_user_profile_models(user_id)
        if user_models:
            # Apply latency check and sorting
            user_models_dict = get_models_with_latency_check(
                user_models, model_latencies
            )
            models = [m.get("id") for m in user_models_dict if m.get("id")]
        else:
            # Fallback to admin-selected models
            admin_models = get_admin_models()
            if admin_models:
                admin_models_dict = get_models_with_latency_check(
                    admin_models, model_latencies
                )
                models = [m.get("id") for m in admin_models_dict if m.get("id")]
            else:
                # Final fallback to defaults
                models = DEFAULT_ANALYST_MODELS
    pb_config = PromptConfig(
        mode=mode,
        task=task or "general",
        has_legal_context=has_legal_context,
        has_document=bool(document_text),
    )
    model_prompts = build_moa_prompts(models, pb_config)

    # === ARCHITECT PLAN — celowane zadania z analizy wstępnej ===
    if architect_plan and architect_plan.success and architect_plan.expert_tasks:
        from moa.prompt_builder import (
            DEFENSE_UNIVERSE,
            PROSECUTION_UNIVERSE,
            COMMUNICATION_LAYER,
        )

        universe = (
            DEFENSE_UNIVERSE if mode == IdentityMode.ADVOCATE else PROSECUTION_UNIVERSE
        )
        identity = universe["identity"]
        epistemic = "## WARUNKI BRZEGOWE (EPISTEMIC LAYER):\n1. Każdy fakt MUSI pochodzić z dokumentów lub RAG.\n2. Nie twórz fałszywych przepisów."

        # Kontekst sprawy z Architekta
        case_context = ""
        if architect_plan.case_summary:
            case_context += f"\n## KONTEKST SPRAWY (analiza wstępna):\n{architect_plan.case_summary}\n"
        if architect_plan.key_issues:
            case_context += "\n## ZIDENTYFIKOWANE PROBLEMY PRAWNE:\n"
            for issue in architect_plan.key_issues:
                case_context += f"- {issue}\n"

        task_keys = list(architect_plan.expert_tasks.keys())
        for i, mid in enumerate(models):
            if i < len(task_keys):
                targeted_task = architect_plan.expert_tasks[task_keys[i]]
                model_prompts[mid] = (
                    f"{identity}\n\n{epistemic}\n\n{COMMUNICATION_LAYER}\n\n"
                    f"{case_context}\n\n"
                    f"## TWOJE KONKRETNE ZADANIE (przydzielone przez Architekta Sprawy):\n{targeted_task}\n\n"
                    f"WYMÓG FORMATU: Napisz spójną analizę w formie płynnej prozy (akapity). "
                    f"ZAKAZ tabel markdown, powtarzania surowego tekstu dokumentów, metadanych technicznych."
                ).strip()
                print(f"   [ARCHITECT->EXPERT] {mid}: {targeted_task[:80]}...")
    elif expert_roles and expert_role_prompts:
        from moa.prompt_builder import (
            DEFENSE_UNIVERSE,
            PROSECUTION_UNIVERSE,
            COMMUNICATION_LAYER,
        )

        universe = (
            DEFENSE_UNIVERSE if mode == IdentityMode.ADVOCATE else PROSECUTION_UNIVERSE
        )
        identity = universe["identity"]
        task_prompt = universe["tasks"].get(task or "general", "")
        epistemic = "## WARUNKI BRZEGOWE (EPISTEMIC LAYER):\n1. Każdy fakt MUSI pochodzić z dokumentów lub RAG.\n2. Nie twórz fałszywych przepisów."

        for mid in models:
            role_key = expert_roles.get(mid)
            if role_key and role_key in expert_role_prompts:
                custom_role = expert_role_prompts[role_key]
                model_prompts[mid] = (
                    f"{identity}\n\n{epistemic}\n\n{COMMUNICATION_LAYER}\n\n{custom_role}\n\n{task_prompt}".strip()
                )
                print(f"   [PROMPT Override] Zastosowano rolę '{role_key}' dla {mid}")

    start = time.perf_counter()

    async def _execute_with_client(shared_client: AsyncOpenAI):
        tasks = [
            asyncio.create_task(
                _analyze_single(
                    shared_client,
                    model,
                    context,
                    query,
                    model_prompts.get(model, ""),
                    has_legal_context,
                    document_text,
                    history_summary,
                    history,
                    expert_memory,
                    api_keys=api_keys,
                    attachments=attachments,
                    model_latencies=model_latencies,
                )
            )
            for model in models
        ]

        # EARLY EXIT: Czekamy max MOA_EARLY_EXIT_TIMEOUT s, ale jeśli >50% ekspertów odpowiedziało, idziemy dalej
        early_timeout = min(GLOBAL_MOA_TIMEOUT, MOA_EARLY_EXIT_TIMEOUT)
        done, pending = await asyncio.wait(
            tasks, timeout=early_timeout, return_when=asyncio.FIRST_EXCEPTION
        )

        # Jeśli mamy wystarczająco wyników, nie czekamy na resztę
        if len(done) < len(tasks) and len(done) >= max(1, len(tasks) // 2):
            print(
                f"   [EARLY EXIT] {len(done)}/{len(tasks)} ekspertów gotowych — kontynuuję bez czekania na resztę."
            )

        # KRYTYCZNE: Anuluj WSZYSTKIE pending taski, aby nie blokowały zasobów w tle
        for task in pending:
            task.cancel()
            try:
                await asyncio.wait_for(asyncio.shield(task), timeout=0.1)
            except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
                pass

        if pending:
            print(f"   [CLEANUP] Anulowano {len(pending)} niedokończonych tasków.")

        results = []
        for i, t in enumerate(tasks):
            if t in done:
                try:
                    results.append(t.result())
                except Exception as e:
                    results.append(
                        AnalystResult(
                            model_id=models[i], response="", success=False, error=str(e)
                        )
                    )
            else:
                results.append(
                    AnalystResult(
                        model_id=models[i],
                        response="",
                        success=False,
                        error="Cancelled (timeout)",
                    )
                )
        return results

    if client:
        return await _execute_with_client(client)
    async with AsyncOpenAI(
        api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL
    ) as new_client:
        return await _execute_with_client(new_client)
