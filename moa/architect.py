# ===========================================================================
# MOA Architect — Inteligentna analiza dokumentu i dystrybucja zadań
# ===========================================================================
"""
Etap "0" pipeline'u MOA: szybki model analizuje dokument/zapytanie
i generuje plan pracy dla zespołu ekspertów (jakie zagadnienia zbadać,
kto czym się zajmuje).
"""

import json
import time
import logging
from dataclasses import dataclass, field
from typing import Optional

from moa.config import (
    LLM_TEMPERATURE,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    GOOGLE_API_KEY,
    classify_model,
)
from moa.gemini_client import call_gemini_direct

logger = logging.getLogger("LexMindArchitect")

# Szybki, tani model do planowania — nie potrzebujemy tu top-tier
ARCHITECT_MODEL = "google/gemini-2.0-flash-001"  # Szybki i tani model planujący


@dataclass
class ArchitectPlan:
    """Plan pracy wygenerowany przez Architekta."""
    case_type: str = ""           # Typ dokumentu (zawiadomienie, decyzja, wyrok, etc.)
    case_summary: str = ""        # 2-3 zdania streszczenia
    key_issues: list[str] = field(default_factory=list)  # Zidentyfikowane problemy prawne
    expert_tasks: dict[str, str] = field(default_factory=dict)  # model_id -> konkretne zadanie
    recommended_task: str = "general"  # Sugerowany typ zadania (general, criminal_defense, document_attack, etc.)
    urgency: str = "normal"       # normal / urgent / critical
    success: bool = True
    raw_response: str = ""


ARCHITECT_SYSTEM_PROMPT = """[ROLA: ARCHITEKT SPRAWY — SZYBKI ANALITYK WSTĘPNY]
Jesteś doświadczonym prawnikiem-planistą. Twoim zadaniem jest SZYBKA analiza dokumentu/zapytania klienta
i wydzielenie konkretnych zadań dla zespołu ekspertów prawnych.

ZASADY:
1. Odpowiadaj WYŁĄCZNIE w formacie JSON (bez markdown, bez komentarzy)
2. Bądź zwięzły — to etap planowania, nie etap analizy
3. Zidentyfikuj typ dokumentu, kluczowe problemy prawne i przydziel zadania
4. Każdy ekspert powinien dostać INNE, konkretne zadanie — nie ogólniki

FORMAT ODPOWIEDZI (surowy JSON, BEZ bloków ```json):
{
  "case_type": "typ dokumentu np. zawiadomienie_o_wszczęciu, decyzja_administracyjna, wyrok, akt_oskarżenia, umowa, pismo_procesowe, zapytanie_ogolne",
  "case_summary": "2-3 zdania streszczenia sytuacji klienta",
  "key_issues": ["problem prawny 1", "problem prawny 2", "problem prawny 3"],
  "recommended_task": "general|criminal_defense|rights_defense|document_attack|emergency_relief",
  "urgency": "normal|urgent|critical",
  "expert_assignments": [
    {"role": "konkretna rola", "task": "PRECYZYJNE zadanie do wykonania — co dokładnie ma zbadać ten ekspert"},
    {"role": "konkretna rola", "task": "PRECYZYJNE zadanie"},
    {"role": "konkretna rola", "task": "PRECYZYJNE zadanie"},
    {"role": "konkretna rola", "task": "PRECYZYJNE zadanie"}
  ]
}
"""


def _build_architect_prompt(
    query: str,
    document_text: str = "",
    context_snippet: str = "",
    expert_count: int = 4,
) -> str:
    """Buduje prompt dla Architekta."""
    parts = [f"## ZAPYTANIE KLIENTA:\n{query}"]

    if document_text:
        # Skrócona wersja dokumentu — Architekt potrzebuje tylko esencji
        doc_preview = document_text[:5000]
        if len(document_text) > 5000:
            doc_preview += "\n... [dokument skrócony dla analizy wstępnej]"
        parts.append(f"\n## TREŚĆ DOKUMENTU/ZAŁĄCZNIKA:\n{doc_preview}")

    if context_snippet:
        ctx_preview = context_snippet[:3000]
        parts.append(f"\n## PRZEPISY Z BAZY RAG (skrót):\n{ctx_preview}")

    parts.append(f"\n## INSTRUKCJA:\nPrzeanalizuj powyższe i wygeneruj plan pracy dla {expert_count} ekspertów.")
    parts.append("Każdy ekspert MUSI dostać INNE, konkretne zadanie. Odpowiedz WYŁĄCZNIE w formacie JSON.")

    return "\n".join(parts)


def _parse_architect_response(raw: str) -> ArchitectPlan:
    """Parsuje odpowiedź Architekta (JSON) do ArchitectPlan."""
    plan = ArchitectPlan(raw_response=raw)

    try:
        # Wyczyść odpowiedź z ewentualnych bloków markdown
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            # Usuń bloki ```json ... ```
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)

        data = json.loads(cleaned)

        plan.case_type = data.get("case_type", "nieokreślony")
        plan.case_summary = data.get("case_summary", "")
        plan.key_issues = data.get("key_issues", [])
        plan.recommended_task = data.get("recommended_task", "general")
        plan.urgency = data.get("urgency", "normal")

        # Mapuj zadania ekspertów
        assignments = data.get("expert_assignments", [])
        for i, assignment in enumerate(assignments):
            role = assignment.get("role", f"ekspert_{i}")
            task = assignment.get("task", "")
            plan.expert_tasks[f"expert_{i}"] = f"[{role.upper()}] {task}"

        plan.success = True

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning(f"[ARCHITECT] Nie udało się sparsować JSON: {e}")
        plan.success = False
        plan.case_summary = "Nie udało się przeanalizować dokumentu automatycznie."

    return plan


async def run_architect_analysis(
    query: str,
    document_text: str = "",
    context_text: str = "",
    expert_count: int = 4,
    api_keys: Optional[dict[str, str]] = None,
    architect_model: str = ARCHITECT_MODEL,
) -> ArchitectPlan:
    """
    Uruchamia Architekta — szybką analizę dokumentu i generowanie planu zadań.
    Używa taniego, szybkiego modelu.
    """
    start = time.perf_counter()
    print(f"\n   [ARCHITECT] Analiza wstępna dokumentu ({architect_model})...")

    user_prompt = _build_architect_prompt(query, document_text, context_text, expert_count)

    try:
        # Próbuj Google Direct (szybciej i taniej)
        model_info = classify_model({"id": architect_model})
        provider = model_info.get("provider", "other")
        effective_key = (api_keys or {}).get(provider) or (GOOGLE_API_KEY if provider == "google" else None)

        if provider == "google" and effective_key:
            raw = await call_gemini_direct(
                model_id=architect_model,
                system_prompt=ARCHITECT_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.1,  # Niska temp dla precyzji planowania
                max_tokens=1500,
                api_key=effective_key,
            )
        else:
            # Fallback na OpenRouter
            from openai import AsyncOpenAI
            async with AsyncOpenAI(
                api_key=(api_keys or {}).get("openrouter") or OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL,
                timeout=30.0,
            ) as client:
                response = await client.chat.completions.create(
                    model=architect_model,
                    messages=[
                        {"role": "system", "content": ARCHITECT_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    max_tokens=1500,
                )
                raw = response.choices[0].message.content or ""

        plan = _parse_architect_response(raw)
        elapsed = (time.perf_counter() - start) * 1000

        if plan.success:
            print(f"   [ARCHITECT][OK] Typ: {plan.case_type} | Pilność: {plan.urgency} | "
                  f"Problemy: {len(plan.key_issues)} | Zadania: {len(plan.expert_tasks)} | {elapsed:.0f}ms")
            print(f"   [ARCHITECT] Streszczenie: {plan.case_summary[:120]}...")
            for idx, (key, task) in enumerate(plan.expert_tasks.items()):
                print(f"   [ARCHITECT] Ekspert {idx+1}: {task[:100]}...")
        else:
            print(f"   [ARCHITECT][WARN] Plan nie sparsowany ({elapsed:.0f}ms) — fallback na domyślne role.")

        return plan

    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        logger.warning(f"[ARCHITECT] Błąd: {e} ({elapsed:.0f}ms)")
        print(f"   [ARCHITECT][ERR] {e} — fallback na domyślne role.")
        return ArchitectPlan(success=False)
