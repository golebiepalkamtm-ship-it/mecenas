# ===========================================================================
# Intent Classifier — Bramka logiczna przed RAG
# ===========================================================================
"""
Klasyfikuje zapytania użytkownika, aby uniknąć niepotrzebnego przeszukiwania
bazy wektorowej dla powitań i small-talku.

Strategia dwustopniowa:
  1. Reguły (zero koszt, zero opóźnienia) — łapie oczywiste powitania
  2. LLM (tani model, ~200ms) — klasyfikuje niejednoznaczne zapytania
"""

import re
from enum import Enum
from typing import Optional

from openai import AsyncOpenAI
from moa.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
)


class Intent(str, Enum):
    GREETING = "greeting"
    SMALL_TALK = "small_talk"
    LEGAL_QUERY = "legal_query"


# ---------------------------------------------------------------------------
# Klasa 1: Reguły (deterministyczne, zero koszt)
# ---------------------------------------------------------------------------

# Wzorce powitań (PL + EN)
_GREETING_PATTERNS = [
    # Polskie powitania
    r"^(cześć|czesc|hej|hejka|siema|siemka|elo|witam|witaj|witajcie)\b",
    r"^(dzie[nń]\s*dobry|dzie[nń]\s*dobr[aey]|dobry\s*dzie[nń])\b",
    r"^(dobry\s*wieczór|dobranoc|dobry\s*ranek)\b",
    r"^(dzie[nń]\s*dobry\s*panie|dzie[nń]\s*dobry\s*pani)\b",
    # Angielskie powitania
    r"^(hello|hi|hey|howdy|good\s*morning|good\s*evening|good\s*afternoon|yo)\b",
]

# Wzorce small-talku (pytania nie-dotyczące prawa)
_SMALLTALK_PATTERNS = [
    r"^(jak\s*si[ęe]\s*maj[aą]|co\s*s[łl]ychać|co\s*u\s*ciebie|how\s*are\s*you)\b",
    r"^(dzi[ęe]kuj[eę]|dzieki|thx|thanks|thank\s*you|super|świetnie|fajnie)\b",
    r"^(pa|do\s*zobaczenia|na\s*razie|do\s*widzenia|bye|goodbye|see\s*you)\b",
    r"^(okej|ok|okk|ro(z|ż)umiem|jasne|no\s*jasne|sure|alright)\b",
    r"^(test|ping|halo|hallo)\s*$",
    r"^.{0,5}$",  # Bardzo krótkie wiadomości (1-5 znaków) — prawdopodobnie test
]

_COMPILED_GREETING = [re.compile(p, re.IGNORECASE) for p in _GREETING_PATTERNS]
_COMPILED_SMALLTALK = [re.compile(p, re.IGNORECASE) for p in _SMALLTALK_PATTERNS]


def classify_by_rules(message: str) -> Optional[Intent]:
    """Szybka klasyfikacja regułowa — zero koszt API."""
    stripped = message.strip()

    for pattern in _COMPILED_GREETING:
        if pattern.search(stripped):
            return Intent.GREETING

    for pattern in _COMPILED_SMALLTALK:
        if pattern.search(stripped):
            return Intent.SMALL_TALK

    return None  # Niejednoznaczne — wymaga LLM


# ---------------------------------------------------------------------------
# Klasa 2: LLM (tani model dla niejednoznacznych przypadków)
# ---------------------------------------------------------------------------

_CLASSIFIER_MODEL = "openai/gpt-4o-mini"  # Najtańszy rozsądny model

_CLASSIFIER_PROMPT = """Jesteś klasyfikatorem intencji w aplikacji prawnej AI.
Odpowiedz JEDNYM słowem (bez kropki, bez wyjaśnień):

- GREETING — jeśli to powitanie, pożegnanie lub podziękowanie
- SMALL_TALK — jeśli to luźna rozmowa, test lub pytanie nie-dotyczące prawa
- LEGAL — jeśli zapytanie dotyczy prawa, przepisów, kodeksów, sądów, umów, praw konsumenta, kar, obowiązków prawnych, analizy prawnej lub doradztwa prawnego

Przykłady:
"Dzień dobry" → GREETING
"Jak się masz?" → SMALL_TALK
"Co to jest art. 212 kk?" → LEGAL
"Ile wynosi okres wypowiedzenia?" → LEGAL
"Jakie są prawa konsumenta?" → LEGAL
"Super, dzięki!" → SMALL_TALK
"Czy mogę zadać pytanie?" → SMALL_TALK"""


async def classify_by_llm(message: str) -> Intent:
    """Klasyfikacja LLM — tani model, ~200ms."""
    try:
        client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=10,  # Krótki timeout — klasyfikacja powinna być szybka
            default_headers={
                "HTTP-Referer": "http://127.0.0.1:8003",
                "X-Title": "LexMind AI",
            },
        )
        response = await client.chat.completions.create(
            model=_CLASSIFIER_MODEL,
            messages=[
                {"role": "system", "content": _CLASSIFIER_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0.0,
            max_tokens=10,
        )
        raw = (response.choices[0].message.content or "").strip().upper()

        if "GREET" in raw:
            return Intent.GREETING
        elif "SMALL" in raw or "CHAT" in raw:
            return Intent.SMALL_TALK
        else:
            return Intent.LEGAL_QUERY

    except Exception as e:
        print(f"   [WARN] Intent classifier LLM error: {e}")
        # W razie błędu — zakładaj zapytanie prawne (bezpieczny fallback)
        return Intent.LEGAL_QUERY


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def classify_intent(message: str) -> Intent:
    """
    Główna funkcja klasyfikacji.
    1. Najpierw sprawdza reguły (zero koszt)
    2. Jeśli niejednoznaczne — pyta tani model LLM
    """
    # Krok 1: Reguły
    rule_result = classify_by_rules(message)
    if rule_result is not None:
        print(f"   [INTENT] Reguły: {rule_result.value} dla: '{message[:50]}...'")
        return rule_result

    # Krok 2: LLM (tylko jeśli reguły nie dały odpowiedzi)
    print(f"   [INTENT] LLM klasyfikacja dla: '{message[:50]}...'")
    llm_result = await classify_by_llm(message)
    print(f"   [INTENT] LLM: {llm_result.value}")
    return llm_result
